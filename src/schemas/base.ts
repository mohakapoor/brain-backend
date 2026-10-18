import { z } from '@hono/zod-openapi'

export const BaseResponseSchema = z.object({
  name: z.string().openapi({
    example: 'Brain API',
    description: 'The name of the API service',
  }),
})

export const HealthResponseSchema = z.object({
  status: z.string().openapi({
    example: 'ok',
    description: 'Service health status',
  }),
  timestamp: z.string().openapi({
    example: '2026-10-18T15:30:00.000Z',
    description: 'Current ISO 8601 server timestamp',
  }),
})

export type BaseResponse = z.infer<typeof BaseResponseSchema>
export type HealthResponse = z.infer<typeof HealthResponseSchema>
