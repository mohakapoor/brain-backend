import { createRoute, type RouteHandler } from '@hono/zod-openapi'
import { BaseResponseSchema } from '../../schemas/base'

export const baseRoute = createRoute({
  tags: ['Base'],
  method: 'get',
  path: '/',
  summary: 'API Root Info',
  description: 'Returns the service name and confirms the API is reachable.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: BaseResponseSchema,
        },
      },
      description: 'Successful root response',
    },
  },
})

export const baseHandler: RouteHandler<typeof baseRoute, { Bindings: Env }> = (c) => {
  return c.json(
    {
      name: 'Brain API',
    },
    200
  )
}
