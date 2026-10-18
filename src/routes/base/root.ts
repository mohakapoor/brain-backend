import { createRoute, z, type RouteHandler } from '@hono/zod-openapi'

export const BaseResponseSchema = z.object({
  name: z.string().openapi({
    example: 'Brain API',
    description: 'The name of the API service',
  }),
})

export const baseRoute = createRoute({
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
