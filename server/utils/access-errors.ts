/**
 * Maps the errors of the access functions (migration 008) to Pluto errors.
 *
 * A rule error from the database is `P0001` with the message
 * `pluto:<code>`. A missing right is `42501` with `pluto:forbidden`.
 * `createPlutoError` is a Nitro auto-import.
 */

interface AccessErrorDefinition {
  statusCode: number
  /** English text. It becomes the `statusMessage`. */
  message: string
  /** The translation key of the same message. */
  key: string
}

/** The known rule codes, with the HTTP status and the English text. */
export const ACCESS_ERRORS = {
  forbidden: {
    statusCode: 403,
    message: 'Only an admin can do this.',
    key: 'supabase.access.errors.forbidden',
  },
  last_admin: {
    statusCode: 409,
    message: 'This is the last admin. Make another user an admin first.',
    key: 'supabase.access.errors.lastAdmin',
  },
  role_exists: {
    statusCode: 409,
    message: 'A role with this key already exists.',
    key: 'supabase.access.errors.roleExists',
  },
  builtin_role: {
    statusCode: 400,
    message: 'A built-in role cannot be changed or deleted.',
    key: 'supabase.access.errors.builtinRole',
  },
  wildcard: {
    statusCode: 400,
    message: 'A new role cannot hold the wildcard permission.',
    key: 'supabase.access.errors.wildcard',
  },
  empty_role: {
    statusCode: 400,
    message: 'A role needs at least one permission.',
    key: 'supabase.access.errors.emptyRole',
  },
  unknown_role: {
    statusCode: 400,
    message: 'One of the roles does not exist.',
    key: 'supabase.access.errors.unknownRole',
  },
  invalid_key: {
    statusCode: 400,
    message: 'The role key can use only a-z, 0-9 and an underscore.',
    key: 'supabase.access.errors.invalidKey',
  },
  invalid_label: {
    statusCode: 400,
    message: 'The role needs a name.',
    key: 'supabase.access.errors.invalidLabel',
  },
  invalid_capability: {
    statusCode: 400,
    message: 'One of the permissions is not valid.',
    key: 'supabase.access.errors.invalidCapability',
  },
  user_not_found: {
    statusCode: 404,
    message: 'This user does not exist.',
    key: 'supabase.access.errors.userNotFound',
  },
  role_not_found: {
    statusCode: 404,
    message: 'This role does not exist.',
    key: 'supabase.access.errors.roleNotFound',
  },
} as const satisfies Record<string, AccessErrorDefinition>

export type AccessErrorCode = keyof typeof ACCESS_ERRORS

interface PgErrorLike {
  code?: string
  message?: string
}

/**
 * Reads the rule code of a database error. It returns undefined when the
 * error is not a rule error of the access functions.
 */
export function parseAccessCode(
  error: PgErrorLike | null | undefined
): AccessErrorCode | undefined {
  const code = error?.message?.match(/^pluto:([a-z_]+)$/)?.[1]

  if (code && code in ACCESS_ERRORS) {
    return code as AccessErrorCode
  }

  // Postgres refuses the call by itself, for example a missing grant.
  if (error?.code === '42501') {
    return 'forbidden'
  }

  return undefined
}

/** True when the database has no access function yet (008 is pending). */
export function isMissingAccessFunction(error: PgErrorLike | null | undefined) {
  return (
    error?.code === 'PGRST202' ||
    error?.code === '42883' ||
    /could not find the function/i.test(error?.message ?? '')
  )
}

/**
 * Builds the error to throw for a failed access call. A known rule code gets
 * its status and its `supabase.access.errors.<code>` key. A pending 008
 * migration gets 409. Any other error is a plain 500.
 */
export function mapAccessError(error: PgErrorLike) {
  const code = parseAccessCode(error)

  if (code) {
    const { statusCode, message, key } = ACCESS_ERRORS[code]

    return createPlutoError({
      statusCode,
      message,
      key,
    })
  }

  if (isMissingAccessFunction(error)) {
    return createPlutoError({
      statusCode: 409,
      message:
        'Apply the pending database migrations to manage users and roles.',
      key: 'supabase.access.errors.migrationPending',
    })
  }

  return createError({
    statusCode: 500,
    statusMessage: error.message || 'Unknown error.',
  })
}
