export interface TriggerResponse {
  ok: boolean
  data?: any
  error?: string
}

export interface Template {
  id: string
  url: string
  file_name: string
  prompt: string
  created_at: string
  is_visible?: boolean
}
