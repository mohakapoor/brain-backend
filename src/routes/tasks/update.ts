import type { Context } from 'hono'
import type { AuthEnv } from '../../middleware/auth'
import type { Task } from './types'

export const updateHandler = async (c: Context<AuthEnv>) => {
  try {
    const user = c.get('user')
    const taskId = Number(c.req.param('id'))

    if (isNaN(taskId)) {
      return c.json({ error: 'Invalid task ID' }, 400)
    }

    const { title, completed } = c.req.valid('json' as never) as {
      title?: string
      completed?: boolean
    }

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
      task: updatedTask,
    })
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
