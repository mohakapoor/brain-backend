import { OpenAPIHono } from '@hono/zod-openapi'
import { zValidator } from '@hono/zod-validator'
import { registerSchema, loginSchema } from '../../schemas/auth'
import { registerHandler } from './register'
import { loginHandler } from './login'
import { logoutHandler } from './logout'
import { meHandler } from './me'

const auth = new OpenAPIHono<{ Bindings: Env }>()

auth.post('/register', zValidator('json', registerSchema), registerHandler)
auth.post('/login', zValidator('json', loginSchema), loginHandler)
auth.post('/logout', logoutHandler)
auth.get('/me', meHandler)

export default auth
