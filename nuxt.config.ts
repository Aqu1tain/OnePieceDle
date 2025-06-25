import tailwindcss from "@tailwindcss/vite";
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: false },
  nitro: {
    experimental: {
      wasm: true
    }
  },
  css: ['~/assets/css/main.css'],
  vite: {    plugins: [      tailwindcss(),    ],  },
  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  }
})