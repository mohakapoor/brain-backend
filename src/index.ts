import { Hono } from 'hono'
import base from './routes/base'

const app = new Hono<{Bindings: Env}>()

app.route('/', base);

export default app;

