import postgres from 'postgres'

interface Payload {
  baseUrl: string
  connectionString: string
}

/**
 * Splits a SQL string into individual statements, correctly handling
 * $$ dollar-quoted blocks, single-quoted strings, and -- comments.
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let i = 0

  while (i < sql.length) {
    // Check for dollar-quoting ($$)
    if (sql[i] === '$' && sql[i + 1] === '$') {
      current += '$$'
      i += 2
      // Read until closing $$
      while (i < sql.length) {
        if (sql[i] === '$' && sql[i + 1] === '$') {
          current += '$$'
          i += 2
          break
        }
        current += sql[i]
        i++
      }
      continue
    }

    // Check for single-quoted strings (handle '' escapes)
    if (sql[i] === `'`) {
      current += sql[i]
      i++
      while (i < sql.length) {
        if (sql[i] === `'` && sql[i + 1] === `'`) {
          // Escaped quote
          current += `''`
          i += 2
          continue
        }
        if (sql[i] === `'`) {
          current += sql[i]
          i++
          break
        }
        current += sql[i]
        i++
      }
      continue
    }

    // Check for single-line comments
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') {
        current += sql[i]
        i++
      }
      continue
    }

    // Statement terminator
    if (sql[i] === ';') {
      current += ';'
      const trimmed = current.trim()
      if (trimmed && trimmed !== ';') {
        statements.push(trimmed)
      }
      current = ''
      i++
      continue
    }

    current += sql[i]
    i++
  }

  const trimmed = current.trim()
  if (trimmed && trimmed !== ';') {
    statements.push(trimmed)
  }

  return statements
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
