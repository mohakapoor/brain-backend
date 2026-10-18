import { OpenAPIHono } from '@hono/zod-openapi'
import { registerRoute, registerHandler } from './register'
import { loginRoute, loginHandler } from './login'
import { logoutRoute, logoutHandler } from './logout'
import { meRoute, meHandler } from './me'

const auth = new OpenAPIHono<{ Bindings: Env }>()

auth.openapi(registerRoute, registerHandler)
auth.openapi(loginRoute, loginHandler)
auth.openapi(logoutRoute, logoutHandler)
auth.openapi(meRoute, meHandler)

export default auth
