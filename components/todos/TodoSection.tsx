'use client'
import { useState, useMemo } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core'
import { Plus, Archive, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { reorderTodos, batchUpdateTodoStatus, batchDeleteTodos, updateTodo } from '@/actions/todos'
import { useTodos } from '@/hooks/useTodos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { KanbanColumn } from './KanbanColumn'
import { TodoForm } from './TodoForm'
import { ArchivedPanel } from './ArchivedPanel'
import { arrayMove } from '@dnd-kit/sortable'
import { calcNewOrders } from '@/lib/utils/sort-order'
import type { Todo, TodoStatus } from '@/types/index'

const KANBAN_STATUSES: TodoStatus[] = ['todo', 'in_progress', 'done']

export function TodoSection() {
  const { todos, loading, refetch } = useTodos()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const filtered = useMemo(() => {
    if (!search.trim()) return todos
    const q = search.toLowerCase()
    return todos.filter(t => t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q))
  }, [todos, search])

  const byStatus = useMemo(() => {
    const map: Record<TodoStatus, Todo[]> = { todo: [], in_progress: [], done: [], archived: [] }
    for (const t of filtered) { if (t.status !== 'archived') map[t.status].push(t) }
    return map
  }, [filtered])

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTodo = todos.find(t => t.id === activeId)
    if (!activeTodo) return

    // 컬럼 간 이동 (상태 변경)
    if (KANBAN_STATUSES.includes(overId as TodoStatus)) {
      const newStatus = overId as TodoStatus
      if (activeTodo.status !== newStatus) {
        try {
          await updateTodo(activeId, { status: newStatus })
          refetch()
        } catch { toast.error('이동에 실패했습니다') }
      }
      return
    }

    // 같은 컬럼 내 정렬
    const columnTodos = byStatus[activeTodo.status]
    const fromIdx = columnTodos.findIndex(t => t.id === activeId)
    const toIdx = columnTodos.findIndex(t => t.id === overId)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return

    const reordered = arrayMove(columnTodos, fromIdx, toIdx)
    const newOrders = calcNewOrders(reordered.map(t => t.id))
    try {
      await reorderTodos(newOrders.map(o => o.id), newOrders.map(o => o.sort_order))
      refetch()
    } catch { toast.error('정렬에 실패했습니다') }
  }

  async function handleMoveItem(todoId: string, direction: 'up' | 'down') {
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return
    const columnTodos = byStatus[todo.status]
    const idx = columnTodos.findIndex(t => t.id === todoId)
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= columnTodos.length) return
    const reordered = arrayMove(columnTodos, idx, targetIdx)
    const newOrders = calcNewOrders(reordered.map(t => t.id))
    try {
      await reorderTodos(newOrders.map(o => o.id), newOrders.map(o => o.sort_order))
      refetch()
    } catch { toast.error('이동에 실패했습니다') }
  }

  async function handleBatchStatusChange(status: TodoStatus) {
    try {
      await batchUpdateTodoStatus(selectedIds, status)
      setSelectedIds([])
      toast.success(`${selectedIds.length}개 항목이 변경되었습니다`)
      refetch()
    } catch { toast.error('변경에 실패했습니다') }
  }

  async function handleBatchDelete() {
    try {
      await batchDeleteTodos(selectedIds)
      setSelectedIds([])
      toast.success(`${selectedIds.length}개 항목이 삭제되었습니다`)
      refetch()
    } catch { toast.error('삭제에 실패했습니다') }
  }

  if (loading) return <div className="text-sm text-muted-foreground text-center py-16">불러오는 중...</div>

  return (
    <div className="space-y-4">
      {/* 상단 툴바 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="할일 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> 새 할일
        </Button>
        <Button variant="outline" size="sm" onClick={() => setArchivedOpen(true)} className="gap-1.5">
          <Archive className="h-4 w-4" /> 보관함
        </Button>
      </div>

      {/* 칸반 보드 */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-4">
          {/* 할일 — 상단 전체 너비, 카드 그리드 */}
          <KanbanColumn
            status="todo"
            todos={byStatus['todo']}
            onRefetch={refetch}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onMoveItem={handleMoveItem}
            cardLayout="grid"
          />
          {/* 진행 중 & 완료 — 하단 2열 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['in_progress', 'done'] as TodoStatus[]).map(status => (
              <KanbanColumn
                key={status}
                status={status}
                todos={byStatus[status]}
                onRefetch={refetch}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onMoveItem={handleMoveItem}
              />
            ))}
          </div>
        </div>
      </DndContext>

      {/* 일괄 작업 툴바 */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-border bg-white shadow-lg px-4 py-2">
          <span className="text-sm font-medium text-foreground mr-2">{selectedIds.length}개 선택</span>
          <Select onValueChange={v => handleBatchStatusChange(v as TodoStatus)}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue placeholder="상태 변경" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">할일로</SelectItem>
              <SelectItem value="in_progress">진행 중으로</SelectItem>
              <SelectItem value="done">완료로</SelectItem>
              <SelectItem value="archived">보관</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" className="h-8 gap-1" onClick={handleBatchDelete}>
            <Trash2 className="h-3.5 w-3.5" /> 삭제
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedIds([])}>취소</Button>
        </div>
      )}

      <TodoForm open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={refetch} />
      <ArchivedPanel open={archivedOpen} onClose={() => setArchivedOpen(false)} />
    </div>
  )
}
