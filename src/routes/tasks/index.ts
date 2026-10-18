import { OpenAPIHono } from '@hono/zod-openapi'
import { requireAuth, type AuthEnv } from '../../middleware/auth'
import { createTaskRoute, createHandler } from './create'
import { listTasksRoute, listHandler } from './list'
import { updateTaskRoute, updateHandler } from './update'
import { deleteTaskRoute, deleteHandler } from './delete'

export * from './types'

const tasks = new OpenAPIHono<AuthEnv>()

// Protect all task endpoints with authentication middleware
tasks.use('*', requireAuth)

tasks.openapi(createTaskRoute, createHandler)
tasks.openapi(listTasksRoute, listHandler)
tasks.openapi(updateTaskRoute, updateHandler)
tasks.openapi(deleteTaskRoute, deleteHandler)

export default tasks
