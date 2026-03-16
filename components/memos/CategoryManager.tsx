'use client'
import { useState } from 'react'
import { createCategory, updateCategory, deleteCategory } from '@/actions/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2, Pencil, Plus, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { Category } from '@/types/index'

const PRESET_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316']

interface Props { open: boolean; onClose: () => void; categories: Category[]; onRefetch: () => void }

export function CategoryManager({ open, onClose, categories, onRefetch }: Props) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3B82F6')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setLoading(true)
    try {
      await createCategory({ name: newName.trim(), color: newColor })
      setNewName('')
      toast.success('카테고리가 추가되었습니다')
      onRefetch()
    } catch { toast.error('추가에 실패했습니다') } finally { setLoading(false) }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    try {
      await updateCategory(id, { name: editName.trim(), color: editColor })
      setEditingId(null)
      toast.success('수정되었습니다')
      onRefetch()
    } catch { toast.error('수정에 실패했습니다') }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCategory(id)
      toast.success('삭제되었습니다')
      onRefetch()
    } catch { toast.error('삭제에 실패했습니다') }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>카테고리 관리</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* 기존 카테고리 목록 */}
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2">
              {editingId === cat.id ? (
                <>
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: editColor }} />
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm flex-1" />
                  <div className="flex gap-1">
                    {PRESET_COLORS.map(c => (
                      <button key={c} className={cn('w-4 h-4 rounded-full border-2', editColor === c ? 'border-foreground' : 'border-transparent')} style={{ backgroundColor: c }} onClick={() => setEditColor(c)} />
                    ))}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdate(cat.id)}><Check className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-sm">{cat.name}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color) }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(cat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </>
              )}
            </div>
          ))}
          {/* 새 카테고리 */}
          <form onSubmit={handleCreate} className="flex items-center gap-2 pt-2 border-t border-border">
            <Input placeholder="새 카테고리" value={newName} onChange={e => setNewName(e.target.value)} className="h-8 text-sm flex-1" />
            <div className="flex gap-1">
              {PRESET_COLORS.slice(0, 5).map(c => (
                <button type="button" key={c} className={cn('w-4 h-4 rounded-full border-2', newColor === c ? 'border-foreground' : 'border-transparent')} style={{ backgroundColor: c }} onClick={() => setNewColor(c)} />
              ))}
            </div>
            <Button type="submit" size="sm" className="h-8 gap-1" disabled={loading}>
              <Plus className="h-3.5 w-3.5" />추가
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
