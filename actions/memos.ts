'use server'

import { createClient } from '@/lib/supabase/server'
import type { Memo, MemoFontSize } from '@/types/index'

export async function createMemo(input: {
  title?: string | null
  category_id?: string | null
  card_color?: string
  font_size?: MemoFontSize
}): Promise<Memo> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: last } = await supabase
    .from('tf_memos')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const newOrder = (last?.sort_order ?? 0) + 1000

  const { data, error } = await supabase
    .from('tf_memos')
    .insert({
      title: input.title ?? null,
      category_id: input.category_id ?? null,
      card_color: input.card_color ?? '#FFFFFF',
      font_size: input.font_size ?? 'medium',
      user_id: user.id,
      sort_order: newOrder,
    })
    .select('*, tf_categories(id, name, color), tf_memo_images(*)')
    .single()

  if (error) throw error
  return data
}

export async function updateMemo(
  id: string,
  updates: Partial<Pick<Memo, 'title' | 'content' | 'category_id' | 'card_color' | 'font_size' | 'is_pinned' | 'is_starred'>>
): Promise<Memo> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('tf_memos')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, tf_categories(id, name, color), tf_memo_images(*)')
    .single()

  if (error) throw error
  return data
}

export async function autosaveMemoContent(
  id: string,
  content: object
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tf_memos')
    .update({ content })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function deleteMemo(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tf_memos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function toggleMemoPin(id: string, isPinned: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tf_memos')
    .update({ is_pinned: isPinned })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function toggleMemoStar(id: string, isStarred: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tf_memos')
    .update({ is_starred: isStarred })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function deleteMemoImage(imageId: string, storagePath: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error: dbError } = await supabase
    .from('tf_memo_images')
    .delete()
    .eq('id', imageId)
    .eq('user_id', user.id)

  if (dbError) throw dbError

  await supabase.storage.from('tf-memo-images').remove([storagePath])
}
