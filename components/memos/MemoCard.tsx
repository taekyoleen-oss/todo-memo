'use client'
import { useState, useEffect, useRef } from 'react'
import { Pin, Star, Trash2, MoreHorizontal, X, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { updateMemo, deleteMemo, toggleMemoPin, toggleMemoStar } from '@/actions/memos'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TiptapEditor } from './TiptapEditor'
import { CardColorPicker, colorToKey } from './CardColorPicker'
import { MemoImageGallery } from './MemoImageGallery'
import { useResizeObserver } from '@/hooks/useResizeObserver'
import { cn } from '@/lib/utils/cn'
import type { Memo, MemoFontSize, MemoImage } from '@/types/index'
import type { JSONContent } from '@tiptap/react'

const ROW_HEIGHT = 8
const GAP = 16

interface Props {
  memo: Memo
  onRefetch: () => void
  autosave: (id: string, content: object) => void
  editingMemoId: React.MutableRefObject<string | null>
  autoEdit?: boolean
  onEditEnd?: () => void
}

export function MemoCard({ memo, onRefetch, autosave, editingMemoId, autoEdit = false, onEditEnd }: Props) {
  const [isEditing, setIsEditing] = useState(autoEdit)
  const [title, setTitle] = useState(memo.title ?? '')
  const [images, setImages] = useState<MemoImage[]>(memo.tf_memo_images ?? [])

  // autoEdit이면 editingMemoId 초기 설정
  useEffect(() => {
    if (autoEdit) editingMemoId.current = memo.id
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [rowSpan, setRowSpan] = useState(10)
  const { ref: cardRef, height } = useResizeObserver<HTMLDivElement>()

  // CSS Grid row span 계산
  useEffect(() => {
    if (height > 0) {
      const spans = Math.ceil((height + GAP) / (ROW_HEIGHT + 0))
      setRowSpan(Math.max(spans, 5))
    }
  }, [height, isEditing])

  function handleStartEdit() {
    setIsEditing(true)
    editingMemoId.current = memo.id
  }

  async function handleEndEdit() {
    setIsEditing(false)
    editingMemoId.current = null
    onEditEnd?.()
    // 제목 저장
    if (title !== (memo.title ?? '')) {
      try {
        await updateMemo(memo.id, { title: title || null })
      } catch { toast.error('저장에 실패했습니다') }
    }
    onRefetch()
  }

  // Esc 키로 편집 종료
  useEffect(() => {
    if (!isEditing) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleEndEdit()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, title])

  // 외부 클릭으로 편집 종료
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isEditing) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleEndEdit()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing, title])

  function handleContentChange(content: JSONContent) {
    autosave(memo.id, content)
  }

  async function handleColorChange(color: string) {
    try {
      await updateMemo(memo.id, { card_color: color })
      onRefetch()
    } catch { toast.error('색상 변경에 실패했습니다') }
  }

  async function handleFontSizeChange(size: MemoFontSize) {
    try {
      await updateMemo(memo.id, { font_size: size })
      onRefetch()
    } catch { toast.error('글자 크기 변경에 실패했습니다') }
  }

  async function handlePin() {
    try {
      await toggleMemoPin(memo.id, !memo.is_pinned)
      onRefetch()
    } catch { toast.error('핀 설정에 실패했습니다') }
  }

  async function handleStar() {
    try {
      await toggleMemoStar(memo.id, !memo.is_starred)
      onRefetch()
    } catch { toast.error('별표 설정에 실패했습니다') }
  }

  async function handleDelete() {
    try {
      await deleteMemo(memo.id)
      toast.success('삭제되었습니다')
      onRefetch()
    } catch { toast.error('삭제에 실패했습니다') }
  }

  return (
    <div
      style={{ gridRowEnd: `span ${rowSpan}` }}
      className="memo-card-enter"
    >
      <div
        ref={containerRef}
        data-card-color={colorToKey(memo.card_color)}
        data-font-size={memo.font_size}
        onClick={(e) => {
          if (!isEditing) return
          const target = e.target as HTMLElement
          if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) return
          setTimeout(() => {
            const pm = containerRef.current?.querySelector('.ProseMirror') as HTMLElement
            if (pm && document.activeElement !== pm) {
              pm.focus()
            }
          }, 0)
        }}
        className={cn(
          'memo-card group rounded-xl border border-border shadow-sm transition-all duration-150',
          'hover:-translate-y-0.5 hover:shadow-md',
          memo.is_starred && 'border-2 border-amber-300',
          memo.is_pinned && 'ring-1 ring-primary',
          isEditing && 'shadow-lg ring-2 ring-primary'
        )}
      >
        <div ref={cardRef} className="p-4">
          {/* 카드 헤더 */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            {isEditing ? (
              <input
                className="flex-1 min-w-0 text-base font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground"
                placeholder="제목 (선택)"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            ) : (
              memo.title && (
                <p className="flex-1 min-w-0 text-base font-semibold truncate">{memo.title}</p>
              )
            )}
            {/* 아이콘 버튼 (호버 시 표시) */}
            <div 
              className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={handleStar} className={cn('p-1 rounded hover:bg-black/5 transition-colors', memo.is_starred && 'star-badge')}>
                <Star className={cn('h-3.5 w-3.5', memo.is_starred ? 'fill-current text-amber-400' : 'text-muted-foreground')} />
              </button>
              <button onClick={handlePin} className="p-1 rounded hover:bg-black/5 transition-colors">
                <Pin className={cn('h-3.5 w-3.5', memo.is_pinned ? 'text-primary fill-current' : 'text-muted-foreground')} />
              </button>
              {isEditing ? (
                <button onClick={handleEndEdit} className="p-1 rounded hover:bg-black/5 transition-colors">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ) : (
                <>
                  <button onClick={handleStartEdit} title="편집" className="p-1 rounded hover:bg-black/5 transition-colors">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<button className="p-1 rounded hover:bg-black/5 transition-colors" />}>
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleStartEdit}>편집</DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePin}>{memo.is_pinned ? '핀 해제' : '핀 고정'}</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleStar}>{memo.is_starred ? '별표 해제' : '별표'}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> 삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </>
              )}
            </div>
          </div>

          {/* 편집 도구 모음 (편집 중일 때만, 제목 아래 별도 행) */}
          {isEditing && (
            <div className="flex items-center gap-1 mb-2">
              <CardColorPicker value={memo.card_color} onChange={handleColorChange} />
              <Select value={memo.font_size} onValueChange={v => handleFontSizeChange(v as MemoFontSize)}>
                <SelectTrigger className="h-7 w-16 text-xs border border-border bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">소</SelectItem>
                  <SelectItem value="medium">중</SelectItem>
                  <SelectItem value="large">대</SelectItem>
                  <SelectItem value="xlarge">특대</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 카테고리 뱃지 */}
          {memo.tf_categories && (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mb-1.5"
              style={{ backgroundColor: memo.tf_categories.color + '33', color: memo.tf_categories.color }}
            >
              {memo.tf_categories.name}
            </span>
          )}

          {/* 에디터 / 본문 */}
          <div>
            <TiptapEditor
              content={memo.content as JSONContent | null}
              onChange={handleContentChange}
              editable={isEditing}
            />
          </div>

          {/* 이미지 갤러리 */}
          <MemoImageGallery
            memoId={memo.id}
            images={images}
            editable={isEditing}
            onUpdate={setImages}
          />
        </div>
      </div>
    </div>
  )
}
