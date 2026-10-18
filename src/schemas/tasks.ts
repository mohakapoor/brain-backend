import { z } from '@hono/zod-openapi'

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Task title is required')
    .max(500, 'Task title cannot exceed 500 characters')
    .openapi({
      example: 'Complete system architecture spec',
      description: 'The task title or action item',
    }),
})

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Task title must be a non-empty string')
      .max(500, 'Task title cannot exceed 500 characters')
      .optional()
      .openapi({
        example: 'Updated task title',
        description: 'New title for the task',
      }),
    completed: z
      .boolean()
      .optional()
      .openapi({
        example: true,
        description: 'Toggle completion state',
      }),
  })
  .openapi({
    description: 'Update task payload (requires at least title or completed)',
  })

export const TaskIdParamSchema = z.object({
  id: z.coerce.number().int().positive().openapi({
    param: {
      name: 'id',
      in: 'path',
    },
    example: 1,
    description: 'Unique numeric identifier of the task',
  }),
})

export const TaskSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  user_id: z.number().openapi({ example: 1 }),
  title: z.string().openapi({ example: 'Complete system architecture spec' }),
  completed: z.number().openapi({ example: 0, description: '0 = active, 1 = completed' }),
  created_at: z.number().openapi({ example: 1729267200 }),
  updated_at: z.number().openapi({ example: 1729267200 }),
  completed_at: z.number().nullable().openapi({ example: null }),
})

export const TaskResponseSchema = z.object({
  message: z.string().openapi({ example: 'Task operation successful' }),
  task: TaskSchema,
})

export const TaskListResponseSchema = z.object({
  tasks: z.array(TaskSchema),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type Task = z.infer<typeof TaskSchema>
export type TaskResponse = z.infer<typeof TaskResponseSchema>
export type TaskListResponse = z.infer<typeof TaskListResponseSchema>
