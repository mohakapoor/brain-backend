import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { hash, compare } from 'bcrypt-ts'


const auth = new Hono<{ Bindings: Env }>()

// POST /register
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { username, password, inviteCode } = body

    // 1. Validate input presence
    if (!username || !password || !inviteCode) {
      return c.json(
        { error: 'Username, password, and invite code are required' },
        400
      )
    }

    // 2. Validate invite code against environment variable
    const expectedInviteCode = c.env.INVITE_CODE
    if (inviteCode !== expectedInviteCode) {
      return c.json({ error: 'Invalid invite code' }, 403)
    }

    // Basic length sanity checks
    if (username.length < 3) {
      return c.json({ error: 'Username must be at least 3 characters' }, 400)
    }
    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400)
    }

    // 3. Check if username already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    )
      .bind(username.trim().toLowerCase())
      .first()

    if (existingUser) {
      return c.json({ error: 'Username already taken' }, 409)
    }

    // 4. Hash password with bcrypt-ts
    const passwordHash = await hash(password, 10)

    // 5. Insert new user into D1
    const cleanUsername = username.trim().toLowerCase()
    const insertResult = await c.env.DB.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id, username'
    )
      .bind(cleanUsername, passwordHash)
      .first<{ id: number; username: string }>()

    if (!insertResult) {
      return c.json({ error: 'Failed to create user' }, 500)
    }

    // 6. Create session in D1
    const sessionId = crypto.randomUUID()
    const sessionTtl = Number(c.env.SESSION_TTL_SECONDS)
    const expiresAt = Math.floor(Date.now() / 1000) + sessionTtl

    await c.env.DB.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    )
      .bind(sessionId, insertResult.id, expiresAt)
      .run()

    // 7. Set secure HttpOnly cookie
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
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { username, password } = body

    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400)
    }

    const cleanUsername = username.trim().toLowerCase()

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

export default auth

