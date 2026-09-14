import type { H3Event } from 'h3'
import type { ZodSchema } from 'zod'

/**
 * One field-level validation error.
 *
 * Matches `ContentValidationError` from `@plutocms/pluto`'s
 * `shared/utils/content-validate.ts`, so a zod failure and a content-model
 * failure look the same to a caller.
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * Reads a request body and checks it against a zod schema.
 *
 * On success, returns the parsed, typed body. On failure, throws the same
 * 400 shape `@plutocms/pluto`'s generic content routes throw for a content
 * validation failure: `{ statusCode: 400, statusMessage: 'Validation
 * failed.', data: { errors } }`, with `errors` as `{ field, message }[]`.
 * Every route in this workspace should call this helper instead of
 * hand-rolling its own zod error handling, so a malformed request fails
 * the same way everywhere.
 *
 * A nested field path (for example `address.zip`) is joined with `.` to
 * build `field`.
 */
export async function parseBody<T>(event: H3Event, schema: ZodSchema<T>): Promise<T> {
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    const errors: ValidationError[] = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))

    throw createError({ statusCode: 400, statusMessage: 'Validation failed.', data: { errors } })
  }

  return result.data
}
