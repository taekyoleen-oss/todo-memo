/**
 * step2_types.ts
 * TaskFlow TypeScript 타입 정의
 * 생성: db-architect 에이전트 (supabase gen types 실행 후 이 파일에 저장)
 * 참조: ui-builder (컴포넌트 props), api-designer (Server Actions)
 *
 * 실제 생성 명령:
 * supabase gen types typescript --project-id {PROJECT_ID} > output/step2_types.ts
 */

// TODO: db-architect 에이전트가 Supabase CLI로 타입을 생성합니다.
// 아래는 참조용 타입 스켈레톤입니다.

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
  due_date: string | null        // 'YYYY-MM-DD'
  is_pinned: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  color: string                  // HEX 색상코드
  sort_order: number
  created_at: string
}

export interface Memo {
  id: string
  user_id: string
  category_id: string | null
  title: string | null
  content: object | null         // Tiptap JSONContent
  content_text: string           // Generated Column (읽기 전용)
  card_color: string
  font_size: MemoFontSize
  is_pinned: boolean
  is_starred: boolean
  sort_order: number
  created_at: string
  updated_at: string
  // 관계 (select 시 포함 옵션)
  tf_categories?: Category | null
  tf_memo_images?: MemoImage[]
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
