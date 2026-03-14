# Skill: tweakcn-tokens

## 목적
TaskFlow의 TweakCN/shadcn 컬러 토큰과 커스터마이징 방법을 제공한다.
UI 스타일링 시 이 스킬을 참조한다.

## TweakCN 적용 방식
1. tweakcn.com에서 디자인 커스터마이징 후 CSS 변수 복사
2. `app/globals.css`에 붙여넣기
3. shadcn 컴포넌트는 `npx shadcn@latest add {component}` 로 개별 설치

## 컬러 토큰 (globals.css에 적용)

```css
@layer base {
  :root {
    /* TaskFlow 커스텀 토큰 */
    --background:      249 249 251;   /* #F9F9FB */
    --surface:         255 255 255;   /* #FFFFFF */
    --primary:         91 108 249;    /* #5B6CF9 인디고 */
    --primary-hover:   74 90 232;     /* #4A5AE8 */
    --accent:          244 244 246;   /* #F4F4F6 */
    --border:          229 231 235;   /* #E5E7EB */
    --text-primary:    17 24 39;      /* #111827 */
    --text-secondary:  107 114 128;   /* #6B7280 */
    --text-muted:      156 163 175;   /* #9CA3AF */

    /* shadcn/ui 토큰 매핑 */
    --foreground:      var(--text-primary);
    --card:            var(--surface);
    --card-foreground: var(--text-primary);
    --popover:         var(--surface);
    --popover-foreground: var(--text-primary);
    --secondary:       var(--accent);
    --secondary-foreground: var(--text-secondary);
    --muted:           var(--accent);
    --muted-foreground: var(--text-muted);
    --input:           var(--border);
    --ring:            var(--primary);
    --radius: 0.5rem;
  }
}
```

## 메모 카드 색상 (9가지 프리셋)

```css
/* globals.css */
[data-card-color="white"]  { --memo-bg: #FFFFFF; }
[data-card-color="yellow"] { --memo-bg: #FFF9C4; }
[data-card-color="green"]  { --memo-bg: #DCFCE7; }
[data-card-color="blue"]   { --memo-bg: #DBEAFE; }
[data-card-color="purple"] { --memo-bg: #EDE9FE; }
[data-card-color="pink"]   { --memo-bg: #FCE7F3; }
[data-card-color="orange"] { --memo-bg: #FFEDD5; }
[data-card-color="mint"]   { --memo-bg: #CCFBF1; }
[data-card-color="gray"]   { --memo-bg: #F3F4F6; }

.memo-card {
  background-color: var(--memo-bg, #FFFFFF);
}
```

```tsx
// 컴포넌트에서 사용
const colorMap: Record<string, string> = {
  '#FFFFFF': 'white', '#FFF9C4': 'yellow', '#DCFCE7': 'green',
  '#DBEAFE': 'blue',  '#EDE9FE': 'purple', '#FCE7F3': 'pink',
  '#FFEDD5': 'orange','#CCFBF1': 'mint',   '#F3F4F6': 'gray',
}

<div
  className="memo-card"
  data-card-color={colorMap[memo.card_color] ?? 'white'}
>
```

## 우선순위 색상 (To-Do 뱃지)

```tsx
// components/todos/TodoPriorityBadge.tsx
const priorityConfig = {
  urgent: { label: '긴급', className: 'bg-red-100 text-red-700 border-red-200' },
  high:   { label: '높음', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: '보통', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  low:    { label: '낮음', className: 'bg-gray-100 text-gray-600 border-gray-200' },
}
```

## D-day 뱃지 색상

```tsx
// components/todos/TodoDueDateBadge.tsx
const ddayConfig = {
  overdue: 'text-red-600 bg-red-50',
  today:   'text-indigo-600 bg-indigo-50',
  soon:    'text-orange-600 bg-orange-50',  // 1~3일
  normal:  'text-gray-500 bg-gray-50',
}
```

## 별표·핀 강조

```tsx
// 별표 메모 카드
<div
  className={cn(
    'memo-card rounded-xl border shadow-sm transition-all',
    memo.is_starred && 'border-2 border-amber-300',
  )}
>
  {/* ... */}
</div>
```

```css
/* 별표 강조 색상 */
.star-badge { color: #F59E0B; }         /* --star-gold */
.star-card-border { border-color: #FCD34D; }  /* --star-border */
```

## 글자 크기 CSS (카드 전체 기준)

```css
/* globals.css */
[data-font-size="small"]  .memo-card-content { font-size: 0.75rem; line-height: 1.5; }
[data-font-size="medium"] .memo-card-content { font-size: 0.875rem; line-height: 1.6; }
[data-font-size="large"]  .memo-card-content { font-size: 1rem; line-height: 1.6; }
[data-font-size="xlarge"] .memo-card-content { font-size: 1.125rem; line-height: 1.7; }
```

## TweakCN/shadcn 컴포넌트 커스터마이징

### Button (primary: 인디고)
```tsx
// shadcn Button variant 사용
<Button variant="default">   // 인디고 배경
<Button variant="outline">   // 테두리
<Button variant="ghost">     // 투명
```

```css
/* shadcn/ui 기본 primary를 인디고로 오버라이드 */
:root {
  --primary: 91 108 249;        /* #5B6CF9 */
  --primary-foreground: 255 255 255;
}
```

### Card (메모 카드)
```tsx
// shadcn Card 대신 커스텀 div 사용 권장 (CSS Grid span 동적 설정 필요)
<div
  className={cn(
    'rounded-xl border bg-white shadow-sm',
    'hover:-translate-y-0.5 hover:shadow-md transition-all duration-150',
    memo.is_starred && 'border-2 border-amber-300',
  )}
  style={{ gridRowEnd: `span ${rowSpan}` }}
>
```

### Input (검색)
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    className="pl-9 focus-visible:ring-primary"
    placeholder="검색..."
  />
</div>
```

### Badge (상태/우선순위)
```tsx
// shadcn Badge 또는 커스텀 span
<span className={cn(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
  priorityConfig[priority].className
)}>
  {priorityConfig[priority].label}
</span>
```

### Tabs (대시보드 + 카테고리)
```tsx
// shadcn Tabs 커스터마이징
<Tabs defaultValue="todo">
  <TabsList className="bg-accent">
    <TabsTrigger
      value="todo"
      className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
    >
      To-Do
    </TabsTrigger>
    <TabsTrigger value="memo">Memo</TabsTrigger>
  </TabsList>
</Tabs>
```

### Calendar + Popover (DatePicker)
```tsx
// components/todos/TodoDueDatePicker.tsx
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

// 달력 하단 "오늘" / "날짜 지우기" 버튼 추가
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  footer={
    <div className="flex gap-2 p-2 border-t">
      <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>
        오늘
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setDate(undefined)}>
        날짜 지우기
      </Button>
    </div>
  }
/>
```

## CSS Grid Masonry 스타일

```css
/* globals.css */
.memo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  grid-auto-rows: 8px;
  gap: 16px;
  align-items: start;
}

/* 반응형 */
@media (max-width: 639px) {
  .memo-grid {
    grid-template-columns: 1fr;
  }
}
@media (min-width: 640px) and (max-width: 1023px) {
  .memo-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

## 애니메이션 클래스

```css
/* globals.css */
@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

.memo-card-enter {
  animation: fadeInScale 200ms ease forwards;
}

@keyframes bounceIn {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.3); }
}

.star-bounce {
  animation: bounceIn 300ms ease;
}
```

## 설치해야 할 shadcn 컴포넌트

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add badge
npx shadcn@latest add dialog
npx shadcn@latest add popover
npx shadcn@latest add calendar
npx shadcn@latest add tabs
npx shadcn@latest add dropdown-menu
npx shadcn@latest add checkbox
npx shadcn@latest add select
npx shadcn@latest add separator
npx shadcn@latest add avatar
npx shadcn@latest add tooltip
npx shadcn@latest add toast    # sonner 사용 시 불필요
```
