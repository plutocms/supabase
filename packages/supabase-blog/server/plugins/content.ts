import { postToPublic } from '../utils/post-public'

/**
 * Registers the `post` content type with core's generic content routes and with the public API,
 * at Nitro startup. The `toPublic` hook is attached here, server side only, so
 * `shared/utils/content-post.ts` stays free of server code.
 */
export default defineNitroPlugin(() => {
  registerContentType({
    ...postType,
    hooks: { ...postType.hooks, toPublic: postToPublic },
  })
  // The terms of the post: the post fields `categories` and `tags` point to them.
  for (const type of blogTermTypes) {
    registerContentType(type)
  }
  // The authors of the post: the post field `authors` points to them.
  registerContentType(blogAuthorType)
})
