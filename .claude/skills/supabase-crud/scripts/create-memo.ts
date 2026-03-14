/**
 * create-memo.ts
 * 메모 생성/자동저장 Server Action 레퍼런스 스크립트
 * 실제 사용: actions/memos.ts 에서 패턴 참조
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import type { JSONContent } from '@tiptap/react'

interface CreateMemoInput {
  title?: string
  content?: JSONContent       // Tiptap JSON
  card_color?: string
  font_size?: 'small' | 'medium' | 'large' | 'xlarge'
  category_id?: string | null
}

/**
 * 메모 생성 Server Action
 * 신규 사용자 최초 메모 생성 시 기본 카테고리가 있는지 확인 후 진행
 */
export async function createMemo(input: CreateMemoInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 현재 마지막 sort_order 조회
  const { data: last } = await supabase
    .from('tf_memos')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const newSortOrder = (last?.sort_order ?? 0) + 1000

  const { data, error } = await supabase
    .from('tf_memos')
    .insert({
      user_id: user.id,
      title: input.title ?? null,
      content: input.content ?? null,   // Tiptap JSON (jsonb)
      // content_text: Generated Column, 자동 생성됨 — 삽입 시 포함하지 말 것
      card_color: input.card_color ?? '#FFFFFF',
      font_size: input.font_size ?? 'medium',
      category_id: input.category_id ?? null,
      is_pinned: false,
      is_starred: false,
      sort_order: newSortOrder,
    })
    .select(`
      *,
      tf_categories (id, name, color),
      tf_memo_images (id, public_url, sort_order)
    `)
    .single()

  if (error) throw error
  return data
}

/**
 * 메모 자동저장 (Debounce 1초 후 호출)
 * Tiptap onChange → debounce → 이 함수 호출
 */
export async function autosaveMemoContent(
  memoId: string,
  content: JSONContent,
  title?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const updateData: Record<string, unknown> = { content }
  if (title !== undefined) updateData.title = title

  const { error } = await supabase
    .from('tf_memos')
    .update(updateData)
    .eq('id', memoId)
    .eq('user_id', user.id)  // RLS 추가 검증

  if (error) throw error
}

/**
 * 별표/핀 토글 (낙관적 업데이트와 함께 사용)
 */
export async function toggleMemoStar(memoId: string, isStarred: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tf_memos')
    .update({ is_starred: isStarred })
    .eq('id', memoId)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function toggleMemoPin(memoId: string, isPinned: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tf_memos')
    .update({ is_pinned: isPinned })
    .eq('id', memoId)
    .eq('user_id', user.id)

  if (error) throw error
}
