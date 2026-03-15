'use server'

import { createClient } from '@/lib/supabase/server'
import type { TodoStatus, TodoPriority, Todo } from '@/types/index'

export async function createTodo(input: {
  title: string
  description?: string | null
  priority?: TodoPriority
  due_date?: string | null
}): Promise<Todo> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: last } = await supabase
    .from('tf_todos')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const newOrder = (last?.sort_order ?? 0) + 1000

  const { data, error } = await supabase
    .from('tf_todos')
    .insert({
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 'medium',
      due_date: input.due_date ?? null,
      user_id: user.id,
      sort_order: newOrder,
      status: 'todo',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTodo(
  id: string,
  updates: Partial<Pick<Todo, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'is_pinned'>>
): Promise<Todo> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('tf_todos')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTodo(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tf_todos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function reorderTodos(
  orderedIds: string[],
  newOrders: number[]
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const updates = orderedIds.map((id, i) => ({
    id,
    sort_order: newOrders[i],
    user_id: user.id,
  }))

  const { error } = await supabase
    .from('tf_todos')
    .upsert(updates, { onConflict: 'id' })

  if (error) throw error
}

export async function batchUpdateTodoStatus(
  ids: string[],
  status: TodoStatus
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tf_todos')
    .update({ status })
    .in('id', ids)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function batchDeleteTodos(ids: string[]): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tf_todos')
    .delete()
    .in('id', ids)
    .eq('user_id', user.id)

  if (error) throw error
}
