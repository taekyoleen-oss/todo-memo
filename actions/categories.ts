'use server'

import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/types/index'

export async function createCategory(input: {
  name: string
  color: string
}): Promise<Category> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: last } = await supabase
    .from('tf_categories')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const newOrder = (last?.sort_order ?? 0) + 1000

  const { data, error } = await supabase
    .from('tf_categories')
    .insert({ ...input, user_id: user.id, sort_order: newOrder })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<Category, 'name' | 'color'>>
): Promise<Category> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('tf_categories')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tf_categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}
