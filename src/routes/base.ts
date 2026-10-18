import { createRoute, OpenAPIHono,z } from '@hono/zod-openapi'

const app = new OpenAPIHono<{Bindings: Env}>()

const BaseResponseSchema = z.object({
  name: z.string().openapi({
    example: 'Brain Api',
    description: 'The name of the API service',
  }),
})

const baseRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'API Root Info',
  description: 'Returns the service name and confirms the API is reachaable',
  responses: {
    200: {
      content :{
        'application/json' :{
          schema: BaseResponseSchema
        }
      },
      description: 'Successful root'
    }
  }
})


app.openapi(baseRoute,(c) =>{
  return c.json({
    name: 'Brain API'
  },
  200
  )
})
const HealthResponseSchema = z.object({
  status: z.string().openapi({
    example: 'ok',
    description: 'Service health status',
  }),
  timestamp: z.string().openapi({
    example: '2026-10-18T15:30:00.000Z',
    description: 'Current ISO 8601 server timestamp',
  }),
})

const healthRoute = createRoute({
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

app.openapi(healthRoute, (c) => {
  return c.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    200
  )
})

export default app;