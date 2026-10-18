import { createRoute, type RouteHandler } from '@hono/zod-openapi'
import { getCookie, deleteCookie } from 'hono/cookie'
import { MessageResponseSchema, ErrorResponseSchema } from '../../schemas/common'

export const logoutRoute = createRoute({
  tags: ['Auth'],
  method: 'post',
  path: '/logout',
  summary: 'User Logout',
  description: 'Invalidates active session in D1 and destroys the browser session cookie.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'Logged out successfully',
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

export const logoutHandler: RouteHandler<typeof logoutRoute, { Bindings: Env }> = async (c) => {
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

    return c.json({ message: 'Logged out successfully' }, 200)
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
