import postgres from 'postgres'
import { splitStatements } from '../../utils/sql'

interface Payload {
  baseUrl: string
  connectionString: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Payload>(event)

  let schema = await $fetch<string | Blob>('/schema.sql', {
    baseURL: body.baseUrl,
  })

  if (typeof schema !== 'string') {
    schema = await schema.text()
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase URL or Key is not defined in environment variables.'
    )
  }

  const connectionString = body.connectionString

  const sql = postgres(connectionString)

  try {
    const statements = splitStatements(schema)

    for (const statement of statements) {
      await sql.unsafe(statement)
    }

    // Mark first_setup as complete
    await sql.unsafe(
      `UPDATE public.healthcheck SET config_value = 'false' WHERE config_name = 'first_setup'`
    )

    return {
      success: true,
      message: 'Database setup completed successfully.',
    }
  } catch (error: any) {
    console.error('Error setting up database:', error)

    return {
      success: false,
      error: error.message,
    }
  } finally {
    sql.end()
  }
})
