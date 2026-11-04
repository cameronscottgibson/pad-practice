import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'
import type * as Config from './config'
import type * as Routes from './routes'

// Serves /api/* from the dev server. Routes and config are loaded through
// Vite's SSR module graph on every request, so edits to mock-server files
// take effect without restarting `npm run dev`.

const ROUTES_MODULE = '/mock-server/routes.ts'
const CONFIG_MODULE = '/mock-server/config.ts'

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function handle(server: ViteDevServer, req: IncomingMessage, res: ServerResponse) {
  const config = (await server.ssrLoadModule(CONFIG_MODULE)) as typeof Config
  const routes = (await server.ssrLoadModule(ROUTES_MODULE)) as typeof Routes

  const [minLatency, maxLatency] = config.LATENCY_MS
  await sleep(minLatency + Math.random() * (maxLatency - minLatency))

  if (Math.random() < config.FAIL_RATE) {
    send(res, 503, { error: 'Service temporarily unavailable. Please try again.' })
    return
  }

  let body: unknown
  const raw = await readBody(req)
  if (raw) {
    try {
      body = JSON.parse(raw)
    } catch {
      send(res, 400, { error: 'Request body must be valid JSON' })
      return
    }
  }

  const url = new URL(req.url ?? '/', 'http://localhost')
  const result = routes.handleRequest({
    method: req.method ?? 'GET',
    path: url.pathname,
    query: url.searchParams,
    body,
  })
  send(res, result.status, result.body)
}

export function mockApi(): Plugin {
  return {
    name: 'sendwell-mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        handle(server, req, res).catch((err: unknown) => {
          server.config.logger.error(`[mock-api] ${req.method} ${req.url} failed: ${String(err)}`)
          if (err instanceof Error) server.ssrFixStacktrace(err)
          send(res, 500, { error: 'Internal server error' })
        })
      })
    },
  }
}
