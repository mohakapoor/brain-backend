import { Hono } from 'hono'
import { requireAuth, type AuthEnv } from '../middleware/auth'

export type Task = {
  id: number
  user_id: number
  title: string
  completed: number
  created_at: number
  updated_at: number
  completed_at: number | null
}

const tasks = new Hono<AuthEnv>()

// Protect all task endpoints with authentication middleware
tasks.use('*', requireAuth)

// POST / — Create a new task
tasks.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { title } = body

    // 1. Validation: title must be a non-empty string
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return c.json({ error: 'Task title is required' }, 400)
    }

    if (title.trim().length > 500) {
      return c.json({ error: 'Task title cannot exceed 500 characters' }, 400)
    }

    // 2. Get authenticated user from middleware context
    const user = c.get('user')

    // 3. Insert task into D1
    const newTask = await c.env.DB.prepare(
      `INSERT INTO tasks (user_id, title)
       VALUES (?, ?)
       RETURNING id, user_id, title, completed, created_at, updated_at, completed_at`
    )
      .bind(user.id, title.trim())
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
})

// GET / — List tasks for authenticated user
tasks.get('/', async (c) => {
  try {
    const user = c.get('user')

    // Phase 1 rule: Incomplete tasks appear above completed tasks; newest first
    // TODO: Add pagination / limit (e.g., limit & cursor/offset) down the line for large task lists
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
})

// PATCH /:id — Update task title and/or toggle completion
tasks.patch('/:id', async (c) => {
  try {
    const user = c.get('user')
    const taskId = Number(c.req.param('id'))

    if (isNaN(taskId)) {
      return c.json({ error: 'Invalid task ID' }, 400)
    }

    const body = await c.req.json()
    const { title, completed } = body

    // 1. Validation: at least one field must be provided
    if (title === undefined && completed === undefined) {
      return c.json({ error: 'At least one field (title or completed) is required' }, 400)
    }

    if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
      return c.json({ error: 'Task title must be a non-empty string' }, 400)
    }

    if (title !== undefined && title.trim().length > 500) {
      return c.json({ error: 'Task title cannot exceed 500 characters' }, 400)
    }

    if (completed !== undefined && typeof completed !== 'boolean') {
      return c.json({ error: 'Completed must be a boolean' }, 400)
    }

    // 2. Ownership check: verify task belongs to authenticated user
    const existingTask = await c.env.DB.prepare(
      'SELECT id, title, completed, completed_at FROM tasks WHERE id = ? AND user_id = ?'
    )
      .bind(taskId, user.id)
      .first<{ id: number; title: string; completed: number; completed_at: number | null }>()

    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404)
    }

    // 3. Compute updated values
    const newTitle = title !== undefined ? title.trim() : existingTask.title
    let newCompleted = existingTask.completed
    let newCompletedAt = existingTask.completed_at

    if (typeof completed === 'boolean') {
      newCompleted = completed ? 1 : 0
      // If completed changed to true, set completed_at timestamp; if reopened, clear it
      newCompletedAt = completed ? Math.floor(Date.now() / 1000) : null
    }

    // 4. Update in D1
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
})

// DELETE /:id — Delete a task
tasks.delete('/:id', async (c) => {
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
})

export default tasks



