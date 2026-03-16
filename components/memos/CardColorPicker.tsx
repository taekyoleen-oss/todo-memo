'use client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Palette } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const COLORS = [
  { value: '#FFFFFF', label: '흰색', key: 'white' },
  { value: '#FFF9C4', label: '노랑', key: 'yellow' },
  { value: '#DCFCE7', label: '초록', key: 'green' },
  { value: '#DBEAFE', label: '파랑', key: 'blue' },
  { value: '#EDE9FE', label: '보라', key: 'purple' },
  { value: '#FCE7F3', label: '분홍', key: 'pink' },
  { value: '#FFEDD5', label: '주황', key: 'orange' },
  { value: '#CCFBF1', label: '민트', key: 'mint' },
  { value: '#F3F4F6', label: '회색', key: 'gray' },
]

interface Props { value: string; onChange: (color: string) => void }

export function CardColorPicker({ value, onChange }: Props) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
        <Palette className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2">
        <div className="grid grid-cols-3 gap-1.5">
          {COLORS.map(c => (
            <button
              key={c.key}
              title={c.label}
              className={cn(
                'h-8 w-full rounded-md border-2 transition-transform hover:scale-110',
                value === c.value ? 'border-primary' : 'border-transparent'
              )}
              style={{ backgroundColor: c.value }}
              onClick={() => onChange(c.value)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const colorToKey = (color: string): string => {
  return COLORS.find(c => c.value === color)?.key ?? 'white'
}
