import { createRoute, type RouteHandler } from '@hono/zod-openapi'
import type { AuthEnv } from '../../middleware/auth'
import { TaskIdParamSchema } from '../../schemas/tasks'
import { ErrorResponseSchema, MessageResponseSchema } from '../../schemas/common'

export const deleteTaskRoute = createRoute({
  tags: ['Tasks'],
  method: 'delete',
  path: '/:id',
  summary: 'Delete Task',
  description: 'Deletes a task belonging to the authenticated user.',
  request: {
    params: TaskIdParamSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'Task deleted successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error in request param',
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

export const deleteHandler: RouteHandler<typeof deleteTaskRoute, AuthEnv> = async (c) => {
  try {
    const user = c.get('user')
    const { id: taskId } = c.req.valid('param')

    // Delete task ensuring it belongs to the authenticated user
    const result = await c.env.DB.prepare(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?'
    )
      .bind(taskId, user.id)
      .run()

    if (result.meta.changes === 0) {
      return c.json({ error: 'Task not found' }, 404)
    }

    return c.json({ message: 'Task deleted successfully' }, 200)
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
