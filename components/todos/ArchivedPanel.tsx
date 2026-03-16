'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateTodo, deleteTodo } from '@/actions/todos'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TodoPriorityBadge } from './TodoPriorityBadge'
import { toast } from 'sonner'
import { Trash2, RotateCcw } from 'lucide-react'
import type { Todo } from '@/types/index'

interface Props { open: boolean; onClose: () => void }

export function ArchivedPanel({ open, onClose }: Props) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const supabase = createClient()
    supabase.from('tf_todos').select('*').eq('status', 'archived').order('updated_at', { ascending: false })
      .then(({ data }) => { setTodos(data ?? []); setLoading(false) })
  }, [open])

  async function handleRestore(todo: Todo) {
    try {
      await updateTodo(todo.id, { status: 'todo' })
      setTodos(prev => prev.filter(t => t.id !== todo.id))
      toast.success('복구되었습니다')
    } catch { toast.error('복구에 실패했습니다') }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTodo(id)
      setTodos(prev => prev.filter(t => t.id !== id))
      toast.success('삭제되었습니다')
    } catch { toast.error('삭제에 실패했습니다') }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>보관함</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading && <p className="text-sm text-muted-foreground text-center py-8">불러오는 중...</p>}
          {!loading && todos.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">보관된 항목이 없습니다</p>}
          {todos.map(todo => (
            <div key={todo.id} className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{todo.title}</p>
                <TodoPriorityBadge priority={todo.priority} />
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleRestore(todo)}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(todo.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
