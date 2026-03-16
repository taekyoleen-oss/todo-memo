'use client'
import { useState, useRef, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { createMemo } from '@/actions/memos'
import { useMemos } from '@/hooks/useMemos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MemoCard } from './MemoCard'

interface Props {
  categoryId?: string | null         // undefined = 전체, null = 미분류, string = 특정 카테고리
  showStarredOnly?: boolean
  onCategoryChange?: () => void
}

export function MemoSection({ categoryId, showStarredOnly = false, onCategoryChange: _onCategoryChange }: Props) {
  const [search, setSearch] = useState('')
  const [newMemoId, setNewMemoId] = useState<string | null>(null)
  const { memos, hasMore, loading, fetchMore, refetch, autosave, editingMemoId } = useMemos(categoryId)

  // 무한 스크롤
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchMore()
    }, { threshold: 0.1 })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, fetchMore])

  // 검색 + 중요 필터 (클라이언트 사이드)
  const filtered = memos.filter(m => {
    // 제목도 없고 내용도 없으면 숨김 (새로 만든 메모는 예외)
    if (m.id !== newMemoId && !m.title?.trim() && !m.content_text?.trim()) return false
    if (showStarredOnly && !m.is_starred) return false
    if (!search.trim()) return true
    return (
      (m.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      m.content_text.toLowerCase().includes(search.toLowerCase())
    )
  })

  async function handleCreateMemo() {
    try {
      const memo = await createMemo({ category_id: categoryId ?? null })
      setNewMemoId(memo.id)
      refetch()
    } catch { toast.error('메모 생성에 실패했습니다') }
  }

  return (
    <div className="space-y-4">
      {/* 상단 툴바 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9 text-sm" placeholder="메모 검색..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" onClick={handleCreateMemo} className="gap-1.5">
          <Plus className="h-4 w-4" /> 새 메모
        </Button>
      </div>

      {/* 메모 그리드 (CSS Grid Masonry) */}
      {loading && memos.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-16">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-16">
          {search ? '검색 결과가 없습니다' : '메모가 없습니다. 새 메모를 만들어보세요!'}
        </div>
      ) : (
        <div className="memo-grid">
          {filtered.map(memo => (
            <MemoCard
              key={memo.id}
              memo={memo}
              onRefetch={refetch}
              autosave={autosave}
              editingMemoId={editingMemoId}
              autoEdit={memo.id === newMemoId}
              onEditEnd={() => setNewMemoId(null)}
            />
          ))}
        </div>
      )}

      {/* 무한 스크롤 센티넬 */}
      <div ref={sentinelRef} className="h-4" />
      {loading && memos.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">불러오는 중...</p>
      )}
    </div>
  )
}
