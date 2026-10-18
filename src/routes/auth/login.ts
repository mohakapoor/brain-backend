import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import { compare } from 'bcrypt-ts'

export const loginHandler = async (c: Context<{ Bindings: Env }>) => {
  try {
    const { username, password } = c.req.valid('json' as never) as {
      username: string
      password: string
    }
    const cleanUsername = username.toLowerCase()

    // 1. Fetch user from D1
    const user = await c.env.DB.prepare(
      'SELECT id, username, password_hash FROM users WHERE username = ?'
    )
      .bind(cleanUsername)
      .first<{ id: number; username: string; password_hash: string }>()

    if (!user) {
      return c.json({ error: 'Invalid username or password' }, 401)
    }

    // 2. Verify password with bcrypt-ts
    const isPasswordValid = await compare(password, user.password_hash)
    if (!isPasswordValid) {
      return c.json({ error: 'Invalid username or password' }, 401)
    }

    // 3. Single-device policy: Invalidate previous sessions for this user
    await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?')
      .bind(user.id)
      .run()

    // 4. Housekeeping: Clean up expired sessions globally
    await c.env.DB.prepare('DELETE FROM sessions WHERE expires_at < unixepoch()')
      .run()

    // 5. Create new session
    const sessionId = crypto.randomUUID()
    const sessionTtl = Number(c.env.SESSION_TTL_SECONDS)
    const expiresAt = Math.floor(Date.now() / 1000) + sessionTtl

    await c.env.DB.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    )
      .bind(sessionId, user.id, expiresAt)
      .run()

    // 6. Set secure HttpOnly cookie
    setCookie(c, 'session_id', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: sessionTtl,
      path: '/',
    })

    return c.json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        username: user.username,
      },
    })
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
