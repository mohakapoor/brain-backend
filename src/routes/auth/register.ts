import { createRoute, type RouteHandler } from '@hono/zod-openapi'
import { setCookie } from 'hono/cookie'
import { hash } from 'bcrypt-ts'
import { registerSchema, AuthResponseSchema } from '../../schemas/auth'
import { ErrorResponseSchema } from '../../schemas/common'

export const registerRoute = createRoute({
  tags: ['Auth'],
  method: 'post',
  path: '/register',
  summary: 'Register User',
  description: 'Creates a new user account via secret invite code and issues an active session cookie.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: registerSchema,
        },
      },
      description: 'Registration credentials with invite code',
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
      description: 'User registered and logged in successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error in request payload',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid invite code',
    },
    409: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Username already taken',
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

export const registerHandler: RouteHandler<typeof registerRoute, { Bindings: Env }> = async (c) => {
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
}
