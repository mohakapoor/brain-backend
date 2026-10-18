import type { Context } from 'hono'
import type { AuthEnv } from '../../middleware/auth'

export const deleteHandler = async (c: Context<AuthEnv>) => {
  try {
    const user = c.get('user')
    const taskId = Number(c.req.param('id'))

    if (isNaN(taskId)) {
      return c.json({ error: 'Invalid task ID' }, 400)
    }

    // Delete task ensuring it belongs to the authenticated user
    const result = await c.env.DB.prepare(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?'
    )
      .bind(taskId, user.id)
      .run()

    if (result.meta.changes === 0) {
      return c.json({ error: 'Task not found' }, 404)
    }

    return c.json({ message: 'Task deleted successfully' })
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
