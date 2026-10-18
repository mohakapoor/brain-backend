import { z } from '@hono/zod-openapi'

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .openapi({ example: 'mohak', description: 'Unique user handle' }),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password cannot exceed 100 characters')
    .openapi({ example: 'secret123', description: 'Plain text password' }),
  inviteCode: z
    .string()
    .min(1, 'Invite code is required')
    .openapi({ example: 'invite-secret-code', description: 'Secret registration code' }),
})

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Username is required')
    .openapi({ example: 'mohak', description: 'Registered username' }),
  password: z
    .string()
    .min(1, 'Password is required')
    .openapi({ example: 'secret123', description: 'Account password' }),
})

export const AuthUserSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  username: z.string().openapi({ example: 'mohak' }),
  createdAt: z.number().optional().openapi({ example: 1729267200 }),
})

export const AuthResponseSchema = z.object({
  message: z.string().openapi({ example: 'Logged in successfully' }),
  user: AuthUserSchema,
})

export const MeResponseSchema = z.object({
  user: AuthUserSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type AuthUser = z.infer<typeof AuthUserSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
export type MeResponse = z.infer<typeof MeResponseSchema>
