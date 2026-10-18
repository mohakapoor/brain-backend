import type { Context } from 'hono'
import { getCookie, deleteCookie } from 'hono/cookie'

export const logoutHandler = async (c: Context<{ Bindings: Env }>) => {
  try {
    const sessionId = getCookie(c, 'session_id')

    if (sessionId) {
      // 1. Invalidate session in D1
      await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?')
        .bind(sessionId)
        .run()
    }

    // 2. Clear cookie from browser
    deleteCookie(c, 'session_id', {
      path: '/',
      secure: true,
      sameSite: 'Lax',
    })

    return c.json({ message: 'Logged out successfully' })
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
