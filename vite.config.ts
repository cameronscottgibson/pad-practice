import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { ServerOptions } from 'vite'
import { mockApi } from './mock-server/plugin'

// Hosted dev environments set PROJECTS_BASE_HOST and WEBSOCKET_PORT. Locally
// neither is set and Vite's defaults apply.
function hostedServer(): ServerOptions | undefined {
  const baseHost = process.env.PROJECTS_BASE_HOST
  if (!baseHost) return undefined

  const websocketPort = Number.parseInt(process.env.WEBSOCKET_PORT ?? '', 10)
  return {
    host: '0.0.0.0',
    port: 3000,
    hmr: Number.isNaN(websocketPort) ? undefined : { clientPort: websocketPort },
    allowedHosts: [`.${baseHost}`],
  }
}

export default defineConfig({
  plugins: [react(), mockApi()],
  server: hostedServer(),
})
