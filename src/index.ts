import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { corsMiddleware } from './middleware/cors'
import base from './routes/base/index'
import auth from './routes/auth/index'
import tasks from './routes/tasks/index'

const app = new OpenAPIHono<{Bindings: Env}>()

app.use('*', corsMiddleware)

app.route('/api_brain', base)
app.route('/api_brain/auth', auth)
app.route('/api_brain/tasks', tasks)

app.doc('/api_brain/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Brain API',
    version: '1.0.0',
  },
})

app.get('/api_brain/docs', swaggerUI({ url: '/api_brain/openapi.json' }))

export default app


