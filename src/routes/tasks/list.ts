import { createRoute, type RouteHandler } from '@hono/zod-openapi'
import type { AuthEnv } from '../../middleware/auth'
import { TaskListResponseSchema } from '../../schemas/tasks'
import { ErrorResponseSchema } from '../../schemas/common'
import type { Task } from './types'

export const listTasksRoute = createRoute({
  tags: ['Tasks'],
  method: 'get',
  path: '/',
  summary: 'List Tasks',
  description: 'Retrieves all tasks for the authenticated user, ordered incomplete-first, newest-first.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: TaskListResponseSchema,
        },
      },
      description: 'List of tasks belonging to authenticated user',
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

export const listHandler: RouteHandler<typeof listTasksRoute, AuthEnv> = async (c) => {
  try {
    const user = c.get('user')

    // Phase 1 rule: Incomplete tasks appear above completed tasks; newest first
    const { results } = await c.env.DB.prepare(
      `SELECT id, user_id, title, completed, created_at, updated_at, completed_at
       FROM tasks
       WHERE user_id = ?
       ORDER BY completed ASC, created_at DESC`
    )
      .bind(user.id)
      .all<Task>()

    return c.json({
      tasks: results,
    }, 200)
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
