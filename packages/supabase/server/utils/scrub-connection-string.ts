/**
 * Removes a connection string, and its password segment, from an error
 * message before it is logged or returned to a client.
 *
 * A `postgres` error can embed the full connection string (host, user,
 * password) in its message. Call this on every error message that might
 * have touched a connection string, before it is logged or sent in a
 * response.
 */
export function scrubConnectionString(
  message: string,
  connStr: string
): string {
  if (!message || !connStr) {
    return message
  }

  let scrubbed = message.split(connStr).join('[redacted]')

  const passwordMatch = connStr.match(/:\/\/[^:@/]+:([^@]+)@/)
  const password = passwordMatch?.[1]

  if (password) {
    scrubbed = scrubbed.split(password).join('[redacted]')

    try {
      const decodedPassword = decodeURIComponent(password)
      if (decodedPassword !== password) {
        scrubbed = scrubbed.split(decodedPassword).join('[redacted]')
      }
    } catch {
      // Password wasn't URI-encoded — nothing more to decode.
    }
  }

  return scrubbed
}
