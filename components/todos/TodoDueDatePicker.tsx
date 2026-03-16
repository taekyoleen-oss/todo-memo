'use client'
import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Props {
  value: string | null
  onChange: (date: string | null) => void
}

export function TodoDueDatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseISO(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" />}>
        <CalendarIcon className="h-3.5 w-3.5" />
        {value ? format(parseISO(value), 'M월 d일', { locale: ko }) : '날짜'}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : null)
            setOpen(false)
          }}
        />
        <div className="flex gap-2 p-2 border-t border-border">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { onChange(format(new Date(), 'yyyy-MM-dd')); setOpen(false) }}>오늘</Button>
          <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => { onChange(null); setOpen(false) }}>지우기</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
