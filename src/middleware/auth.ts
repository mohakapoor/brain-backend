import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'

export type AuthUser = {
  id: number
  username: string
}

export type AuthEnv = {
  Bindings: Env
  Variables: {
    user: AuthUser
  }
}

/**
 * Authentication Middleware
 * 
 * Verifies the incoming session_id cookie against active D1 sessions.
 * If valid, attaches the user to the context via `c.set('user', user)`.
 * If missing or expired, responds immediately with 401 Unauthorized.
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const sessionId = getCookie(c, 'session_id')

  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const user = await c.env.DB.prepare(
    `SELECT u.id, u.username
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > unixepoch()`
  )
    .bind(sessionId)
    .first<AuthUser>()

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Attach user to context for downstream route handlers
  c.set('user', user)

  await next()
})
