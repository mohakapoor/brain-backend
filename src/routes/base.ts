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
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})

export default app;