/**
 * Splits a SQL string into individual statements, correctly handling
 * $$ dollar-quoted blocks, single-quoted strings, and -- comments.
 */
export function splitStatements(sql: string): string[] {
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
