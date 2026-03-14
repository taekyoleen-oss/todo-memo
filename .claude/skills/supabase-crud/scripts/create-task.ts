/**
 * create-task.ts
 * To-Do 생성 Server Action 레퍼런스 스크립트
 * 실제 사용: actions/todos.ts 에서 패턴 참조
 */
'use server'

import { createClient } from '@/lib/supabase/server'

interface CreateTodoInput {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string | null  // ISO date string 'YYYY-MM-DD'
}

/**
 * To-Do 생성 Server Action
 * sort_order: 현재 최대값 + 1000 (하단에 추가)
 */
export async function createTodo(input: CreateTodoInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 현재 마지막 sort_order 조회
  const { data: last } = await supabase
    .from('tf_todos')
    .select('sort_order')
    .eq('user_id', user.id)
    .neq('status', 'archived')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const newSortOrder = (last?.sort_order ?? 0) + 1000

  const { data, error } = await supabase
    .from('tf_todos')
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 'medium',
      due_date: input.due_date ?? null,
      status: 'todo',
      sort_order: newSortOrder,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * sort_order 배치 업데이트 (드래그 앤 드롭 후 호출)
 */
export async function reorderTodos(
  orderedIds: string[]  // 새 순서대로 정렬된 ID 배열
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const updates = orderedIds.map((id, index) => ({
    id,
    user_id: user.id,
    sort_order: (index + 1) * 1000,
  }))

  const { error } = await supabase
    .from('tf_todos')
    .upsert(updates, { onConflict: 'id' })

  if (error) throw error
}
