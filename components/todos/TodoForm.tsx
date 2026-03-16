'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createTodo, updateTodo } from '@/actions/todos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { TodoDueDatePicker } from './TodoDueDatePicker'
import type { Todo, TodoPriority } from '@/types/index'

interface Props {
  open: boolean
  onClose: () => void
  todo?: Todo
  onSuccess: () => void
}

export function TodoForm({ open, onClose, todo, onSuccess }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TodoPriority>('medium')
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (todo) {
      setTitle(todo.title)
      setDescription(todo.description ?? '')
      setPriority(todo.priority)
      setDueDate(todo.due_date)
    } else {
      setTitle(''); setDescription(''); setPriority('medium'); setDueDate(null)
    }
  }, [todo, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      if (todo) {
        await updateTodo(todo.id, { title: title.trim(), description: description || null, priority, due_date: dueDate })
      } else {
        await createTodo({ title: title.trim(), description: description || null, priority, due_date: dueDate })
      }
      toast.success(todo ? '할일이 수정되었습니다' : '할일이 추가되었습니다')
      onSuccess()
      onClose()
    } catch {
      toast.error('저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{todo ? '할일 수정' : '새 할일'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="할일 제목" value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[80px]"
            placeholder="설명 (선택)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <Select value={priority} onValueChange={v => setPriority(v as TodoPriority)}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">긴급</SelectItem>
                <SelectItem value="high">높음</SelectItem>
                <SelectItem value="medium">보통</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
              </SelectContent>
            </Select>
            <TodoDueDatePicker value={dueDate} onChange={setDueDate} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>취소</Button>
            <Button type="submit" disabled={loading}>{loading ? '저장 중...' : '저장'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
