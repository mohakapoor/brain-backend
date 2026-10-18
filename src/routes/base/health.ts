import { createRoute, z, type RouteHandler } from '@hono/zod-openapi'

export const HealthResponseSchema = z.object({
  status: z.string().openapi({
    example: 'ok',
    description: 'Service health status',
  }),
  timestamp: z.string().openapi({
    example: '2026-10-18T15:30:00.000Z',
    description: 'Current ISO 8601 server timestamp',
  }),
})

export const healthRoute = createRoute({
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
