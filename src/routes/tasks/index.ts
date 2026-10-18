import { OpenAPIHono } from '@hono/zod-openapi'
import { zValidator } from '@hono/zod-validator'
import { requireAuth, type AuthEnv } from '../../middleware/auth'
import { createTaskSchema, updateTaskSchema } from '../../schemas/tasks'
import { createHandler } from './create'
import { listHandler } from './list'
import { updateHandler } from './update'
import { deleteHandler } from './delete'

export * from './types'

const tasks = new OpenAPIHono<AuthEnv>()

// Protect all task endpoints with authentication middleware
tasks.use('*', requireAuth)

tasks.post('/', zValidator('json', createTaskSchema), createHandler)
tasks.get('/', listHandler)
tasks.patch('/:id', zValidator('json', updateTaskSchema), updateHandler)
tasks.delete('/:id', deleteHandler)

export default tasks
