import type { Context } from 'hono'
import type { AuthEnv } from '../../middleware/auth'
import type { Task } from './types'

export const createHandler = async (c: Context<AuthEnv>) => {
  try {
    const { title } = c.req.valid('json' as never) as { title: string }
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
