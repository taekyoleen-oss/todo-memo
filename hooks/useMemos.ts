'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { autosaveMemoContent } from '@/actions/memos'
import type { Memo } from '@/types/index'

const PAGE_SIZE = 20

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export function useMemos(categoryId?: string | null) {
  const [memos, setMemos] = useState<Memo[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  // 편집 중인 메모 ID (Realtime 업데이트 무시용)
  const editingMemoId = useRef<string | null>(null)

  const fetchMemos = useCallback(async (reset = false, targetPage = page) => {
    const supabase = createClient()
    const from = reset ? 0 : targetPage * PAGE_SIZE

    let query = supabase
      .from('tf_memos')
      .select('*, tf_categories(id, name, color), tf_memo_images(*)')
      .order('is_pinned', { ascending: false })
      .order('is_starred', { ascending: false })
      .order('sort_order')
      .range(from, from + PAGE_SIZE - 1)

    if (categoryId !== undefined) {
      if (categoryId) {
        query = query.eq('category_id', categoryId)
      } else {
        query = query.is('category_id', null)
      }
    }

    const { data } = await query

    if (reset) {
      setMemos(data ?? [])
      setPage(0)
    } else {
      setMemos(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMemos = (data ?? []).filter(m => !existingIds.has(m.id))
        return [...prev, ...newMemos]
      })
    }
    setHasMore((data?.length ?? 0) === PAGE_SIZE)
    setLoading(false)
  }, [categoryId, page])

  // Debounce 1초 자동저장
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const autosave = useCallback(
    debounce((memoId: string, content: object) => {
      autosaveMemoContent(memoId, content).catch(() => {})
    }, 1000),
    []
  )

  useEffect(() => {
    setLoading(true)
    fetchMemos(true)
  // fetchMemos를 의도적으로 제외 (categoryId 변경 시만 refetch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  // Realtime 구독 (편집 중인 메모 제외)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('tf_memos_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tf_memos' },
        (payload) => {
          const changedId = (payload.new as { id?: string })?.id
            ?? (payload.old as { id?: string })?.id
          if (editingMemoId.current && editingMemoId.current === changedId) return
          fetchMemos(true)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchMore = useCallback(() => {
    if (hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchMemos(false, nextPage)
    }
  }, [hasMore, page, fetchMemos])

  return {
    memos,
    hasMore,
    loading,
    fetchMore,
    refetch: () => fetchMemos(true),
    autosave,
    editingMemoId,
  }
}
