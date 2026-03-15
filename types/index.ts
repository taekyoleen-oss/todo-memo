export type TodoStatus = 'todo' | 'in_progress' | 'done' | 'archived'
export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent'
export type MemoFontSize = 'small' | 'medium' | 'large' | 'xlarge'

export interface Todo {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TodoStatus
  priority: TodoPriority
  due_date: string | null       // 'YYYY-MM-DD'
  is_pinned: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
}

export interface MemoImage {
  id: string
  memo_id: string
  user_id: string
  storage_path: string
  public_url: string
  file_name: string
  file_size: number | null
  width: number | null
  height: number | null
  sort_order: number
  created_at: string
}

export interface Memo {
  id: string
  user_id: string
  category_id: string | null
  title: string | null
  content: object | null        // Tiptap JSONContent
  content_text: string          // 트리거 자동 갱신 (읽기 전용, INSERT/UPDATE 금지)
  card_color: string
  font_size: MemoFontSize
  is_pinned: boolean
  is_starred: boolean
  sort_order: number
  created_at: string
  updated_at: string
  tf_categories?: Category | null
  tf_memo_images?: MemoImage[]
}
