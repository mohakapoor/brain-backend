import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { hash, compare } from 'bcrypt-ts'
import { zValidator } from '@hono/zod-validator'
import { registerSchema, loginSchema } from '../schemas/auth'


const auth = new Hono<{ Bindings: Env }>()

// POST /register
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const { username, password, inviteCode } = c.req.valid('json')
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
})

// POST /login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { username, password } = c.req.valid('json')
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
})

// POST /logout
auth.post('/logout', async (c) => {
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
})

// GET /me
auth.get('/me', async (c) => {
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
})

export default auth


