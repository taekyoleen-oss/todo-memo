import { differenceInCalendarDays, startOfDay, parseISO } from 'date-fns'

export type DDayStatus = 'overdue' | 'today' | 'soon' | 'normal' | 'none'

export function calcDDay(dueDate: string | null): { days: number; status: DDayStatus } {
  if (!dueDate) return { days: 0, status: 'none' }

  const due = startOfDay(parseISO(dueDate))   // 로컬 타임존 기준
  const today = startOfDay(new Date())
  const diff = differenceInCalendarDays(due, today)

  if (diff < 0)   return { days: diff, status: 'overdue' }
  if (diff === 0) return { days: 0,    status: 'today' }
  if (diff <= 3)  return { days: diff, status: 'soon' }
  return { days: diff, status: 'normal' }
}

export function formatDDay(days: number, status: DDayStatus): string {
  if (status === 'none')    return ''
  if (status === 'today')   return 'D-Day'
  if (status === 'overdue') return `D+${Math.abs(days)}`
  return `D-${days}`
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = parseISO(dateStr)
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}
