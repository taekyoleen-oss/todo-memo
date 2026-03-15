'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const DEFAULT_CATEGORIES = [
  { name: '업무', color: '#3B82F6', sort_order: 1000 },
  { name: '개인', color: '#10B981', sort_order: 2000 },
  { name: '학습', color: '#F59E0B', sort_order: 3000 },
]

export async function seedDefaultCategories() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 이미 카테고리가 있으면 건너뜀 (중복 방지)
  const { count } = await supabase
    .from('tf_categories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) > 0) return

  await supabase
    .from('tf_categories')
    .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id })))
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
