import { Hono } from 'hono'
import base from './routes/base'
import auth from './routes/auth'

const app = new Hono<{Bindings: Env}>()

app.route('/', base)
app.route('/api/auth', auth)

export default app


