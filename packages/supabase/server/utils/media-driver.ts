import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { requireCapability } from './capability-guard'
import { supabaseRequestClient } from './content-adapter'

/** The bucket of new files. Older files can be in another bucket (`media.bucket`). */
export const MEDIA_BUCKET = 'media'

interface MediaRow {
  id: number
  created_at: string
  name: string | null
  alt: string | null
  bucket: string | null
  storage_path: string | null
  mime_type: string | null
  size: number | null
  width: number | null
  height: number | null
  preview_path: string | null
  preview_width: number | null
  preview_height: number | null
}

/** `<yyyy>/<mm>/<name>`: the object key of a file, by the month of its record. */
function monthKey(createdAt: string, fileName: string): string {
  const date = new Date(createdAt)
  return `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${fileName}`
}

/** The order of a list. The id breaks a tie, so pages stay stable. */
const ORDER: Record<PlutoMediaSort, { column: string; ascending: boolean }> = {
  newest: { column: 'created_at', ascending: false },
  oldest: { column: 'created_at', ascending: true },
  name: { column: 'name', ascending: true },
  size: { column: 'size', ascending: false },
}

function toRecord(client: SupabaseClient, row: MediaRow): PlutoMedia {
  const bucket = row.bucket || MEDIA_BUCKET
  return {
    id: String(row.id),
    url: row.storage_path
      ? client.storage.from(bucket).getPublicUrl(row.storage_path).data
          .publicUrl
      : '',
    name: row.name ?? '',
    mimeType: row.mime_type ?? 'application/octet-stream',
    size: Number(row.size ?? 0),
    width: row.width,
    height: row.height,
    alt: row.alt ?? '',
    createdAt: row.created_at,
    // A preview is always in the `media` bucket.
    preview:
      row.preview_path && row.preview_width && row.preview_height
        ? {
            url: client.storage.from(MEDIA_BUCKET).getPublicUrl(row.preview_path)
              .data.publicUrl,
            width: row.preview_width,
            height: row.preview_height,
          }
        : null,
  }
}

function failed(message: string, key: string): Error {
  console.error('[media] Supabase answered with an error:', message)
  return createPlutoError({ statusCode: 500, message: 'The media library failed.', key })
}

function notFound(): Error {
  return createPlutoError({
    statusCode: 404,
    message: 'The file does not exist.',
    key: 'pluto.media.errors.notFound',
  })
}

function numericIds(ids: string[]): number[] {
  return ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0)
}

/**
 * The media driver of the Supabase backend: the bytes in Supabase Storage,
 * the record in `public.media` (db/migrations/009_media.sql). Row Level
 * Security checks the capabilities again (`has_capability`). New files go to
 * `media/<yyyy>/<mm>/<name>-<suffix>.<ext>`, and their previews next to them
 * (`db/migrations/010_media_preview.sql`). See the media skill of
 * `@plutocms/core`.
 */
export function createSupabaseMediaDriver(): PlutoMediaDriver {
  async function readRow(client: SupabaseClient, id: string): Promise<MediaRow> {
    const [numeric] = numericIds([id])
    if (!numeric) {
      throw notFound()
    }
    const { data, error } = await client
      .from('media')
      .select('*')
      .eq('id', numeric)
      .maybeSingle()
    if (error) {
      throw failed(error.message, 'pluto.media.errors.saveFailed')
    }
    if (!data) {
      throw notFound()
    }
    return data as MediaRow
  }

  return {
    name: 'supabase',

    async authorize(event: H3Event, capability) {
      await requireCapability(event, capability)
    },

    async list(event, query) {
      const client = await supabaseRequestClient(event)
      const order = ORDER[query.sort ?? 'newest']
      let request = client
        .from('media')
        .select('*', { count: 'exact' })
        .order(order.column, { ascending: order.ascending, nullsFirst: false })
        .order('id', { ascending: order.ascending })
        .range(query.offset, query.offset + query.limit - 1)
      if (query.search) {
        // Commas and brackets have a meaning in a PostgREST `or` filter.
        const text = query.search.replace(/[,()*%\\]/g, ' ').trim()
        if (text) {
          request = request.or(`name.ilike.%${text}%,alt.ilike.%${text}%`)
        }
      }
      if (query.type === 'image') {
        request = request.like('mime_type', 'image/%')
      } else if (query.type?.endsWith('/') || query.type?.endsWith('/*')) {
        request = request.like('mime_type', `${query.type.replace(/\*$/, '')}%`)
      } else if (query.type) {
        request = request.eq('mime_type', query.type)
      }
      const { data, error, count } = await request
      if (error) {
        throw failed(error.message, 'pluto.media.loadFailed')
      }
      return {
        data: (data as MediaRow[]).map((row) => toRecord(client, row)),
        total: count ?? data.length,
      }
    },

    async get(event, ids) {
      const wanted = numericIds(ids)
      if (wanted.length === 0) {
        return []
      }
      const client = await supabaseRequestClient(event)
      const { data, error } = await client.from('media').select('*').in('id', wanted)
      if (error) {
        throw failed(error.message, 'pluto.media.loadFailed')
      }
      return (data as MediaRow[]).map((row) => toRecord(client, row))
    },

    async upload(event, input) {
      const client = await supabaseRequestClient(event)
      const path = monthKey(input.createdAt, input.fileName)
      const previewPath = input.preview
        ? monthKey(input.createdAt, input.preview.fileName)
        : null
      const storage = client.storage.from(MEDIA_BUCKET)
      const { error: uploadError } = await storage.upload(path, input.data, {
        contentType: input.mimeType,
        cacheControl: '31536000',
        upsert: false,
      })
      if (uploadError) {
        throw failed(uploadError.message, 'pluto.media.errors.saveFailed')
      }
      if (input.preview && previewPath) {
        const { error: previewError } = await storage.upload(
          previewPath,
          input.preview.data,
          { contentType: input.preview.mimeType, cacheControl: '31536000', upsert: true }
        )
        if (previewError) {
          await storage.remove([path])
          throw failed(previewError.message, 'pluto.media.errors.saveFailed')
        }
      }
      const { data, error } = await client
        .from('media')
        .insert({
          name: input.name,
          alt: input.alt || null,
          bucket: MEDIA_BUCKET,
          storage_path: path,
          mime_type: input.mimeType,
          size: input.size,
          width: input.width,
          height: input.height,
          created_at: input.createdAt,
          preview_path: previewPath,
          preview_width: input.preview?.width ?? null,
          preview_height: input.preview?.height ?? null,
        })
        .select('*')
        .single()
      if (error) {
        // No record without its file, and no file without its record.
        const { error: cleanup } = await storage.remove(
          previewPath ? [path, previewPath] : [path]
        )
        if (cleanup) {
          console.warn('[media] could not remove the file of a failed upload:', path, cleanup.message)
        }
        throw failed(error.message, 'pluto.media.errors.saveFailed')
      }
      return toRecord(client, data as MediaRow)
    },

    async update(event, id, patch) {
      const client = await supabaseRequestClient(event)
      const row = await readRow(client, id)
      const changes: Partial<MediaRow> = {}
      if (patch.name !== undefined) {
        changes.name = patch.name
      }
      if (patch.alt !== undefined) {
        changes.alt = patch.alt || null
      }
      if (patch.width !== undefined) {
        changes.width = patch.width
      }
      if (patch.height !== undefined) {
        changes.height = patch.height
      }
      const { data, error } = await client
        .from('media')
        .update(changes)
        .eq('id', row.id)
        .select('*')
        .single()
      if (error) {
        throw failed(error.message, 'pluto.media.errors.saveFailed')
      }
      return toRecord(client, data as MediaRow)
    },

    async setPreview(event, id, preview) {
      const client = await supabaseRequestClient(event)
      const row = await readRow(client, id)
      const storage = client.storage.from(MEDIA_BUCKET)
      const path = monthKey(row.created_at, preview.fileName)
      const { error: uploadError } = await storage.upload(path, preview.data, {
        contentType: preview.mimeType,
        cacheControl: '31536000',
        upsert: true,
      })
      if (uploadError) {
        throw failed(uploadError.message, 'pluto.media.errors.saveFailed')
      }
      const { data, error } = await client
        .from('media')
        .update({
          preview_path: path,
          preview_width: preview.width,
          preview_height: preview.height,
        })
        .eq('id', row.id)
        .select('*')
        .single()
      if (error) {
        throw failed(error.message, 'pluto.media.errors.saveFailed')
      }
      // An older preview with another name (another type) goes.
      if (row.preview_path && row.preview_path !== path) {
        await storage.remove([row.preview_path])
      }
      return toRecord(client, data as MediaRow)
    },

    async remove(event, id) {
      const client = await supabaseRequestClient(event)
      const row = await readRow(client, id)
      // The file first: a retry after a failed delete of the row then finds no file, which is no error.
      if (row.storage_path) {
        const { error } = await client.storage
          .from(row.bucket || MEDIA_BUCKET)
          .remove([row.storage_path])
        if (error) {
          throw failed(error.message, 'pluto.media.errors.deleteFailed')
        }
      }
      if (row.preview_path) {
        await client.storage.from(MEDIA_BUCKET).remove([row.preview_path])
      }
      const { error } = await client.from('media').delete().eq('id', row.id)
      if (error) {
        throw failed(error.message, 'pluto.media.errors.deleteFailed')
      }
    },
  }
}
