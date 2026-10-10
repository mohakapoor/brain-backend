import { Hono } from 'hono'
import base from './routes/base'
import auth from './routes/auth'

const app = new Hono<{Bindings: Env}>()

app.route('/api_brain', base)
app.route('/api_brain/auth', auth)

export default app


