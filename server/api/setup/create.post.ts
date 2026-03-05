import postgres from 'postgres'

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
    await sql.unsafe(schema)

    // Set the first_setup flag in the healthcheck table to false
    await sql`
      UPDATE healthcheck
      SET check_value = 'false'
      WHERE check_name = 'first_setup';
    `

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
