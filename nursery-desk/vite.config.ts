import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { neonApiPlugin } from './server/vite-plugin.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'NEON_BRANCH', 'SESSION_SECRET']) {
    if (env[key]) {
      process.env[key] = env[key]
    }
  }

  return {
    plugins: [react(), tailwindcss(), neonApiPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
