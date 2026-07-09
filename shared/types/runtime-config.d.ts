// Nuxt infers runtimeConfig types from the actual merged value at build
// time, which narrows `plutoLayerSchemas` to whatever layer keys happen
// to be discovered in a given project (e.g. `{ "supabase-shop": string }`)
// instead of the general `Record<string, string>` declared in
// nuxt.config.ts. This augmentation pins the intended, stable shape.
// Lives under shared/ so it's picked up by the app, server, and shared
// TS projects alike (layer-root .d.ts files are only included by the
// shared project).
declare module '@nuxt/schema' {
  interface RuntimeConfig {
    plutoRootDir: string
    plutoLayerSchemas: Record<string, string>
  }
}

export {}
