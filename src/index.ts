import { Hono } from 'hono'
import { corsMiddleware } from './middleware/cors'
import base from './routes/base'
import auth from './routes/auth'
import tasks from './routes/tasks'

const app = new Hono<{Bindings: Env}>()

app.use('*', corsMiddleware)

app.route('/api_brain', base)
app.route('/api_brain/auth', auth)
app.route('/api_brain/tasks', tasks)

export default app


