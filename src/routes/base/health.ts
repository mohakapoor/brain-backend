import { createRoute, type RouteHandler } from '@hono/zod-openapi'
import { HealthResponseSchema } from '../../schemas/base'

export const healthRoute = createRoute({
  tags: ['Base'],
  method: 'get',
  path: '/health',
  summary: 'Health Check',
  description: 'Health probe returning current system status and timestamp.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
      description: 'Service is healthy',
    },
  },
})

export const healthHandler: RouteHandler<typeof healthRoute, { Bindings: Env }> = (c) => {
  return c.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    200
  )
}
