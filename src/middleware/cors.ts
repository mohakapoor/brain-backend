import { cors } from 'hono/cors'

const ALLOWED_ORIGINS = [
  'https://mohakapoor.in',
  'https://www.mohakapoor.in',
  'https://brain.mohakapoor.in',
  'https://dev.mohakapoor.in',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
]

/**
 * CORS Middleware
 *
 * Permits cross-origin requests from mohakapoor.in, brain.mohakapoor.in,
 * all *.mohakapoor.in subdomains, and local dev ports with HttpOnly cookie support.
 */
export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return null
    if (
      ALLOWED_ORIGINS.includes(origin) ||
      origin.endsWith('.mohakapoor.in')
    ) {
      return origin
    }
    return null
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Set-Cookie'],
  maxAge: 86400,
})
