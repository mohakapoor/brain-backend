import { Hono } from 'hono'

const app = new Hono<{Bindings: Env}>()

app.get('/', (c) => {
  return c.json({ name: 'Brain API' })
})

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})

export default app;