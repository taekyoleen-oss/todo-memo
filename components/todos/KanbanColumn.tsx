'use client'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils/cn'
import { TodoCard } from './TodoCard'
import type { Todo, TodoStatus } from '@/types/index'

const columnConfig: Record<TodoStatus, { label: string; color: string }> = {
  todo:        { label: '할일', color: 'bg-gray-50 border-gray-200' },
  in_progress: { label: '진행 중', color: 'bg-blue-50 border-blue-200' },
  done:        { label: '완료', color: 'bg-green-50 border-green-200' },
  archived:    { label: '보관', color: 'bg-gray-50 border-gray-200' },
}

interface Props {
  status: TodoStatus
  todos: Todo[]
  onRefetch: () => void
  selectedIds: string[]
  onSelect: (id: string, checked: boolean) => void
  onMoveItem?: (todoId: string, direction: 'up' | 'down') => void
  cardLayout?: 'list' | 'grid'
}

export function KanbanColumn({ status, todos, onRefetch, selectedIds, onSelect, onMoveItem, cardLayout = 'list' }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const { label, color } = columnConfig[status]

  return (
    <div className={cn('flex flex-col rounded-xl border p-3 min-h-[200px] transition-colors', color, isOver && 'ring-2 ring-primary ring-offset-1')}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="text-xs text-muted-foreground bg-white rounded-full px-2 py-0.5 border border-border">{todos.length}</span>
      </div>
      <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1',
            cardLayout === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 content-start'
              : 'flex flex-col gap-2'
          )}
        >
          {todos.map((todo, idx) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              onRefetch={onRefetch}
              selected={selectedIds.includes(todo.id)}
              onSelect={onSelect}
              isFirst={idx === 0}
              isLast={idx === todos.length - 1}
              onMoveUp={() => onMoveItem?.(todo.id, 'up')}
              onMoveDown={() => onMoveItem?.(todo.id, 'down')}
            />
          ))}
          {todos.length === 0 && (
            <div className={cn('flex items-center justify-center text-xs text-muted-foreground py-8', cardLayout === 'grid' ? 'col-span-full' : 'flex-1')}>
              비어 있음
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
