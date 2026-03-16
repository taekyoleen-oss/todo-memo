'use client'
import { useState, useRef, useEffect } from 'react'
import { Plus, Search, Star, Layers, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { createMemo } from '@/actions/memos'
import { useMemos } from '@/hooks/useMemos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MemoCard } from './MemoCard'
import { cn } from '@/lib/utils/cn'
import type { Category } from '@/types/index'

type ActiveTab = 'all' | 'starred' | string  // string = categoryId

interface Props {
  categories: Category[]
  onOpenCategoryManager: () => void
  onCategoryChange?: () => void
}

export function MemoSection({ categories, onOpenCategoryManager, onCategoryChange: _onCategoryChange }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('all')
  const [search, setSearch] = useState('')
  const [newMemoId, setNewMemoId] = useState<string | null>(null)

  // activeTab에서 useMemos에 넘길 categoryId 계산
  const categoryId: string | null | undefined =
    activeTab === 'all' || activeTab === 'starred'
      ? undefined
      : activeTab

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

  // 필터: 검색 + 중요 탭
  const filtered = memos.filter(m => {
    if (m.id !== newMemoId && !m.title?.trim() && !m.content_text?.trim()) return false
    if (activeTab === 'starred' && !m.is_starred) return false
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
      {/* 카테고리 탭 */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-0 scrollbar-none">
        {/* 전체 */}
        <TabButton
          active={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          icon={<Layers className="h-3.5 w-3.5" />}
          label="전체"
          count={undefined}
        />

        {/* 중요 */}
        <TabButton
          active={activeTab === 'starred'}
          onClick={() => setActiveTab('starred')}
          icon={<Star className="h-3.5 w-3.5 text-yellow-400" />}
          label="중요"
          count={undefined}
        />

        {/* DB 카테고리들 */}
        {categories.map(cat => (
          <TabButton
            key={cat.id}
            active={activeTab === cat.id}
            onClick={() => setActiveTab(cat.id)}
            icon={<span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
            label={cat.name}
            count={undefined}
          />
        ))}

        {/* 카테고리 관리 */}
        <button
          onClick={onOpenCategoryManager}
          title="카테고리 관리"
          className="flex items-center gap-1 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-t-md transition-colors shrink-0 ml-1"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">관리</span>
        </button>
      </div>

      {/* 검색 + 새 메모 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="메모 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={handleCreateMemo} className="gap-1.5">
          <Plus className="h-4 w-4" /> 새 메모
        </Button>
      </div>

      {/* 메모 그리드 */}
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

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number | undefined
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 whitespace-nowrap',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  )
}
