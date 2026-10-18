export type Task = {
  id: number
  user_id: number
  title: string
  completed: number
  created_at: number
  updated_at: number
  completed_at: number | null
}
