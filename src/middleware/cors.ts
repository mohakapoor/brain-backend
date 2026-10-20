import { cors } from 'hono/cors'

const ALLOWED_ORIGINS = [
  'https://brain.mohakapoor.in',
  'https://www.brain.mohakapoor.in',
  'https://dev.brain.mohakapoor.in',
  'https://www.dev.brain.mohakapoor.in',
  'https://dev.mohakapoor.in',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
]

/**
 * CORS Middleware
 *
 * Enforces strict origin whitelist (brain.mohakapoor.in, dev.mohakapoor.in, local dev),
 * enables credentials for session cookies, and caches preflight OPTIONS for 24 hours.
 */
export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return null
    return ALLOWED_ORIGINS.includes(origin) ? origin : null
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Set-Cookie'],
  maxAge: 86400,
})
