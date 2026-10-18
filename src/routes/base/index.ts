import { OpenAPIHono } from '@hono/zod-openapi'
import { baseRoute, baseHandler } from './root'
import { healthRoute, healthHandler } from './health'

const app = new OpenAPIHono<{ Bindings: Env }>()

app.openapi(baseRoute, baseHandler)
app.openapi(healthRoute, healthHandler)

export default app
