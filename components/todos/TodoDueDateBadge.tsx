'use client'
import { cn } from '@/lib/utils/cn'
import { calcDDay, formatDDay } from '@/lib/utils/date'
import type { TodoStatus } from '@/types/index'

const statusClass: Record<string, string> = {
  overdue: 'text-red-600 bg-red-50 border border-red-200',
  today:   'text-indigo-600 bg-indigo-50 border border-indigo-200',
  soon:    'text-orange-600 bg-orange-50 border border-orange-200',
  normal:  'text-gray-500 bg-gray-50 border border-gray-200',
}

export function TodoDueDateBadge({ dueDate, status }: { dueDate: string | null; status: TodoStatus }) {
  if (!dueDate || status === 'done') return null
  const { days, status: ddayStatus } = calcDDay(dueDate)
  if (ddayStatus === 'none') return null
  const text = formatDDay(days, ddayStatus)
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', statusClass[ddayStatus])}>
      {text}
    </span>
  )
}
