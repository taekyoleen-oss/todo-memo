'use client'
import { cn } from '@/lib/utils/cn'
import type { TodoPriority } from '@/types/index'

const config: Record<TodoPriority, { label: string; className: string }> = {
  urgent: { label: '긴급', className: 'bg-red-100 text-red-700 border border-red-200' },
  high:   { label: '높음', className: 'bg-orange-100 text-orange-700 border border-orange-200' },
  medium: { label: '보통', className: 'bg-blue-100 text-blue-700 border border-blue-200' },
  low:    { label: '낮음', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
}

export function TodoPriorityBadge({ priority }: { priority: TodoPriority }) {
  const { label, className } = config[priority]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  )
}
