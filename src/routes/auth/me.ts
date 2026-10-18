import type { Context } from 'hono'
import { getCookie } from 'hono/cookie'

export const meHandler = async (c: Context<{ Bindings: Env }>) => {
  try {
    const sessionId = getCookie(c, 'session_id')

    if (!sessionId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Lookup user via active session in D1
    const user = await c.env.DB.prepare(
      `SELECT u.id, u.username, u.created_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ? AND s.expires_at > unixepoch()`
    )
      .bind(sessionId)
      .first<{ id: number; username: string; created_at: number }>()

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    return c.json({
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.created_at,
      },
    })
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
