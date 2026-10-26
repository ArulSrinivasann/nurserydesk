import type { Plugin } from 'vite'
import { app } from './app.ts'
import { pipeHonoToNode } from './http-node.ts'

export function neonApiPlugin(): Plugin {
  return {
    name: 'neon-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api')) {
          next()
          return
        }
        void pipeHonoToNode(app, req, res).catch(next)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api')) {
          next()
          return
        }
        void pipeHonoToNode(app, req, res).catch(next)
      })
    },
  }
}
