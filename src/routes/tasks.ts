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

export default tasks

