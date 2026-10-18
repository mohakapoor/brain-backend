import { createRoute, type RouteHandler } from '@hono/zod-openapi'
import type { AuthEnv } from '../../middleware/auth'
import { createTaskSchema, TaskResponseSchema } from '../../schemas/tasks'
import { ErrorResponseSchema } from '../../schemas/common'
import type { Task } from './types'

export const createTaskRoute = createRoute({
  tags: ['Tasks'],
  method: 'post',
  path: '/',
  summary: 'Create Task',
  description: 'Creates a new todo/execution task for the authenticated user.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createTaskSchema,
        },
      },
      description: 'Task creation payload',
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: TaskResponseSchema,
        },
      },
      description: 'Task created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error in request payload',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized; missing or invalid session',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
})

export const createHandler: RouteHandler<typeof createTaskRoute, AuthEnv> = async (c) => {
  try {
    const { title } = c.req.valid('json')
    const user = c.get('user')

    // Insert task into D1
    const newTask = await c.env.DB.prepare(
      `INSERT INTO tasks (user_id, title)
       VALUES (?, ?)
       RETURNING id, user_id, title, completed, created_at, updated_at, completed_at`
    )
      .bind(user.id, title)
      .first<Task>()

    if (!newTask) {
      return c.json({ error: 'Failed to create task' }, 500)
    }

    return c.json(
      {
        message: 'Task created successfully',
        task: newTask,
      },
      201
    )
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
