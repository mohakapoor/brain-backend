import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import { hash } from 'bcrypt-ts'

export const registerHandler = async (c: Context<{ Bindings: Env }>) => {
  try {
    const { username, password, inviteCode } = c.req.valid('json' as never) as {
      username: string
      password: string
      inviteCode: string
    }
    const cleanUsername = username.toLowerCase()

    // 1. Validate invite code against environment variable
    const expectedInviteCode = c.env.INVITE_CODE
    if (inviteCode !== expectedInviteCode) {
      return c.json({ error: 'Invalid invite code' }, 403)
    }

    // 2. Check if username already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    )
      .bind(cleanUsername)
      .first()

    if (existingUser) {
      return c.json({ error: 'Username already taken' }, 409)
    }

    // 3. Hash password with bcrypt-ts
    const passwordHash = await hash(password, 10)

    // 4. Insert new user into D1
    const insertResult = await c.env.DB.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id, username'
    )
      .bind(cleanUsername, passwordHash)
      .first<{ id: number; username: string }>()

    if (!insertResult) {
      return c.json({ error: 'Failed to create user' }, 500)
    }

    // 5. Create session in D1
    const sessionId = crypto.randomUUID()
    const sessionTtl = Number(c.env.SESSION_TTL_SECONDS)
    const expiresAt = Math.floor(Date.now() / 1000) + sessionTtl

    await c.env.DB.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    )
      .bind(sessionId, insertResult.id, expiresAt)
      .run()

    // 6. Set secure HttpOnly cookie
    setCookie(c, 'session_id', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: sessionTtl,
      path: '/',
    })

    return c.json(
      {
        message: 'Registered and logged in successfully',
        user: {
          id: insertResult.id,
          username: insertResult.username,
        },
      },
      201
    )
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
