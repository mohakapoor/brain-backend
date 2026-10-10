import { z } from 'zod'

export const registerSchema = z.object({
  username: z
    .string('Username is required')
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters'),
  password: z
    .string('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  inviteCode: z
    .string('Invite code is required')
    .min(1, 'Invite code is required'),
})

export const loginSchema = z.object({
  username: z
    .string('Username is required')
    .trim()
    .min(1, 'Username is required'),
  password: z
    .string('Password is required')
    .min(1, 'Password is required'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
