/**
 * Matches a dollar-quote delimiter: bare (`$$`) or tagged (`$tag$`).
 * The `y` (sticky) flag anchors the match to `lastIndex`, so it only
 * matches when the delimiter starts at the exact position checked —
 * it never matches later in the string.
 */
const dollarTagPattern = /\$(?:[a-z_]\w*)?\$/iy

/**
 * Returns the dollar-quote delimiter starting at `sql[i]`, or `null` when
 * there is none. Used both for a bare `$$` and a named `$tag$` delimiter.
 * Also correctly rejects a positional parameter like `$1`, since a tag
 * name can't start with a digit.
 */
function matchDollarTag(sql: string, i: number): string | null {
  if (sql[i] !== '$') {
    return null
  }
  dollarTagPattern.lastIndex = i
  const match = dollarTagPattern.exec(sql)
  return match ? match[0] : null
}

/**
 * Splits a SQL string into individual statements.
 *
 * Recognizes the SQL syntax that can hide a statement-terminating `;`:
 * - Dollar-quoted strings, both bare (`$$...$$`) and tagged (`$tag$...$tag$`).
 * - Single-quoted string literals, with `''` as an escaped quote.
 * - Double-quoted identifiers, with `""` as an escaped quote.
 * - Line comments (`-- ...`).
 * - Block comments (`/* ... *\/`), including nested block comments.
 */
export function splitStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let i = 0

  while (i < sql.length) {
    // Dollar-quoted strings: bare `$$` or a named `$tag$`.
    const tag = matchDollarTag(sql, i)
    if (tag) {
      current += tag
      i += tag.length
      const end = sql.indexOf(tag, i)
      if (end === -1) {
        // Unterminated dollar quote — take the rest of the string as-is.
        current += sql.slice(i)
        i = sql.length
        continue
      }
      current += sql.slice(i, end + tag.length)
      i = end + tag.length
      continue
    }

    // Double-quoted identifiers (handle "" escapes).
    if (sql[i] === '"') {
      current += sql[i]
      i++
      while (i < sql.length) {
        if (sql[i] === '"' && sql[i + 1] === '"') {
          current += '""'
          i += 2
          continue
        }
        if (sql[i] === '"') {
          current += sql[i]
          i++
          break
        }
        current += sql[i]
        i++
      }
      continue
    }

    // Single-quoted strings (handle '' escapes).
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

    // Block comments, including nested block comments (Postgres allows
    // `/* outer /* inner */ still outer */`).
    if (sql[i] === '/' && sql[i + 1] === '*') {
      current += '/*'
      i += 2
      let depth = 1
      while (i < sql.length && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') {
          current += '/*'
          i += 2
          depth++
          continue
        }
        if (sql[i] === '*' && sql[i + 1] === '/') {
          current += '*/'
          i += 2
          depth--
          continue
        }
        current += sql[i]
        i++
      }
      continue
    }

    // Single-line comments
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
