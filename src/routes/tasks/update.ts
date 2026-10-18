import { createRoute, type RouteHandler } from '@hono/zod-openapi'
import type { AuthEnv } from '../../middleware/auth'
import { TaskIdParamSchema, updateTaskSchema, TaskResponseSchema } from '../../schemas/tasks'
import { ErrorResponseSchema } from '../../schemas/common'
import type { Task } from './types'

export const updateTaskRoute = createRoute({
  tags: ['Tasks'],
  method: 'patch',
  path: '/:id',
  summary: 'Update / Toggle Task',
  description: 'Updates task title and/or toggles completed status for the authenticated user.',
  request: {
    params: TaskIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: updateTaskSchema,
        },
      },
      description: 'Fields to update (title, completed)',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: TaskResponseSchema,
        },
      },
      description: 'Task updated successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error in request payload or param',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized; missing or invalid session',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Task not found or belongs to another user',
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

export const updateHandler: RouteHandler<typeof updateTaskRoute, AuthEnv> = async (c) => {
  try {
    const user = c.get('user')
    const { id: taskId } = c.req.valid('param')
    const { title, completed } = c.req.valid('json')

    // Ownership check: verify task belongs to authenticated user
    const existingTask = await c.env.DB.prepare(
      'SELECT id, title, completed, completed_at FROM tasks WHERE id = ? AND user_id = ?'
    )
      .bind(taskId, user.id)
      .first<{ id: number; title: string; completed: number; completed_at: number | null }>()

    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404)
    }

    // Compute updated values
    const newTitle = title !== undefined ? title.trim() : existingTask.title
    let newCompleted = existingTask.completed
    let newCompletedAt = existingTask.completed_at

    if (typeof completed === 'boolean') {
      newCompleted = completed ? 1 : 0
      // If completed changed to true, set completed_at timestamp; if reopened, clear it
      newCompletedAt = completed ? Math.floor(Date.now() / 1000) : null
    }

    // Update in D1
    const updatedTask = await c.env.DB.prepare(
      `UPDATE tasks
       SET title = ?, completed = ?, completed_at = ?, updated_at = unixepoch()
       WHERE id = ? AND user_id = ?
       RETURNING id, user_id, title, completed, created_at, updated_at, completed_at`
    )
      .bind(newTitle, newCompleted, newCompletedAt, taskId, user.id)
      .first<Task>()

    return c.json({
      message: 'Task updated successfully',
      task: updatedTask!,
    }, 200)
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
