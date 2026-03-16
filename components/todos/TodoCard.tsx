'use client'
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pin, Trash2, ChevronUp, ChevronDown, MoreHorizontal, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { updateTodo, deleteTodo } from '@/actions/todos'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { TodoPriorityBadge } from './TodoPriorityBadge'
import { TodoDueDateBadge } from './TodoDueDateBadge'
import { TodoForm } from './TodoForm'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils/cn'
import type { Todo } from '@/types/index'

interface Props {
  todo: Todo
  onRefetch: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst?: boolean
  isLast?: boolean
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
}

export function TodoCard({ todo, onRefetch, onMoveUp, onMoveDown, isFirst, isLast, selected, onSelect }: Props) {
  const isMobile = useIsMobile()
  const [editOpen, setEditOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id })

  const style = { transform: CSS.Transform.toString(transform), transition }

  async function handleStatusToggle() {
    const newStatus = todo.status === 'done' ? 'todo' : 'done'
    try {
      await updateTodo(todo.id, { status: newStatus })
      onRefetch()
    } catch { toast.error('상태 변경에 실패했습니다') }
  }

  async function handlePin() {
    try {
      await updateTodo(todo.id, { is_pinned: !todo.is_pinned })
      onRefetch()
    } catch { toast.error('핀 설정에 실패했습니다') }
  }

  async function handleDelete() {
    try {
      await deleteTodo(todo.id)
      toast.success('삭제되었습니다')
      onRefetch()
    } catch { toast.error('삭제에 실패했습니다') }
  }

  async function handleStatusChange(status: Todo['status']) {
    try {
      await updateTodo(todo.id, { status })
      onRefetch()
    } catch { toast.error('상태 변경에 실패했습니다') }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group flex items-start gap-2 rounded-lg border border-border bg-white p-4 shadow-sm transition-all',
          isDragging && 'opacity-50 shadow-lg',
          todo.status === 'done' && 'opacity-60',
          todo.is_pinned && 'border-l-4 border-l-primary'
        )}
      >
        {/* 선택 체크박스 */}
        <Checkbox
          checked={selected}
          onCheckedChange={checked => onSelect(todo.id, !!checked)}
          className="mt-0.5 shrink-0"
        />

        {/* 드래그 핸들 (데스크톱) or ↑↓ 버튼 (모바일) */}
        {isMobile ? (
          <div className="flex flex-col gap-0.5">
            <button onClick={onMoveUp} disabled={isFirst} className="p-0.5 text-muted-foreground disabled:opacity-30 hover:text-foreground">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button onClick={onMoveDown} disabled={isLast} className="p-0.5 text-muted-foreground disabled:opacity-30 hover:text-foreground">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button {...attributes} {...listeners} className="mt-0.5 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity active:cursor-grabbing">
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        {/* 완료 체크 */}
        <Checkbox
          checked={todo.status === 'done'}
          onCheckedChange={handleStatusToggle}
          className="mt-0.5 shrink-0"
        />

        {/* 본문 */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-base font-medium truncate', todo.status === 'done' && 'line-through text-muted-foreground')}>
            {todo.title}
          </p>
          {todo.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{todo.description}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5">
            <TodoPriorityBadge priority={todo.priority} />
            <TodoDueDateBadge dueDate={todo.due_date} status={todo.status} />
          </div>
        </div>

        {/* 액션 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" /> 수정
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePin}>
              <Pin className="h-4 w-4 mr-2" /> {todo.is_pinned ? '핀 해제' : '핀 고정'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleStatusChange('todo')}>할일로</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>진행 중으로</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('done')}>완료로</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('archived')}>보관</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TodoForm open={editOpen} onClose={() => setEditOpen(false)} todo={todo} onSuccess={onRefetch} />
    </>
  )
}
