import { createRoute, type RouteHandler } from '@hono/zod-openapi'
import { getSessionCookie, clearSessionCookie } from '../../utils/cookie'
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
    const sessionId = getSessionCookie(c)

    if (sessionId) {
      // 1. Invalidate session in D1
      await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?')
        .bind(sessionId)
        .run()
    }

    // 2. Clear cookie from browser
    clearSessionCookie(c)

    return c.json({ message: 'Logged out successfully' }, 200)
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
