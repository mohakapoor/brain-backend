import { Hono } from 'hono'

const app = new Hono<{Bindings: Env}>()

app.get('/api/health', (c)=>{
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})

export default app;