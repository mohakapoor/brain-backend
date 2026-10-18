import { createRoute, type RouteHandler } from '@hono/zod-openapi'
import { setCookie } from 'hono/cookie'
import { compare } from 'bcrypt-ts'
import { loginSchema, AuthResponseSchema } from '../../schemas/auth'
import { ErrorResponseSchema } from '../../schemas/common'

export const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  summary: 'User Login',
  description: 'Authenticates user credentials, enforces single-device session invalidation, and issues an active session cookie.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginSchema,
        },
      },
      description: 'Login credentials (username and password)',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
      description: 'Logged in successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error in request payload',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid username or password',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
})

export const loginHandler: RouteHandler<typeof loginRoute, { Bindings: Env }> = async (c) => {
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
    }, 200)
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
