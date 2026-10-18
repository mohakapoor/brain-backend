import type { Context } from 'hono'
import type { AuthEnv } from '../../middleware/auth'
import type { Task } from './types'

export const listHandler = async (c: Context<AuthEnv>) => {
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
    })
  } catch (err: any) {
    return c.json({ error: 'Internal server error', details: err.message }, 500)
  }
}
