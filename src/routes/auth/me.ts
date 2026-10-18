import { createRoute, type RouteHandler } from '@hono/zod-openapi'
import { getCookie } from 'hono/cookie'
import { MeResponseSchema } from '../../schemas/auth'
import { ErrorResponseSchema } from '../../schemas/common'

export const meRoute = createRoute({
  method: 'get',
  path: '/me',
  summary: 'Active Session Profile',
  description: 'Validates active session cookie in D1 and retrieves authenticated user profile.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MeResponseSchema,
        },
      },
      description: 'Active session is valid; returns user profile',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized; session cookie missing or expired',
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

export const meHandler: RouteHandler<typeof meRoute, { Bindings: Env }> = async (c) => {
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
    }, 200)
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
