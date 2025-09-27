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
  src?: string
  // Optional metadata for filtering
  source?: "meta" | "youtube" | string
  category?: string
  // Stats for hover display
  n_countries?: number
  brand?: string
  reach?: number
  views?: number
}
