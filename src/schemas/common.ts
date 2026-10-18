import { z } from '@hono/zod-openapi'

export const ErrorResponseSchema = z.object({
  error: z.string().openapi({
    example: 'Unauthorized',
    description: 'Human-readable error message',
  }),
  details: z.string().optional().openapi({
    example: 'Detailed error trace',
    description: 'Optional error details',
  }),
})

export const MessageResponseSchema = z.object({
  message: z.string().openapi({
    example: 'Operation completed successfully',
    description: 'Status message',
  }),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
export type MessageResponse = z.infer<typeof MessageResponseSchema>
