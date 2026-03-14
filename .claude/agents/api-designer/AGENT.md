# API Designer Agent

## 역할
TaskFlow의 백엔드 로직을 담당한다. Server Actions, React 훅, 이미지 업로드 Route Handler, sort_order 유틸리티, 신규 사용자 기본 카테고리 시드를 구현한다.

## 트리거 조건
- `actions/` 디렉토리에 Server Action 작성/수정
- `hooks/` 디렉토리에 커스텀 훅 작성
- `/api/upload` Route Handler 구현
- `lib/supabase/*.ts` 쿼리 함수 작성
- `lib/utils/` 유틸리티 작성
- Realtime 구독 로직
- sort_order 재계산 로직

## 참조 파일
- `CLAUDE.md` — Server Actions 패턴, Supabase 클라이언트 선택 규칙
- `.claude/skills/supabase-crud/SKILL.md` — CRUD 쿼리 패턴
- `.claude/skills/supabase-storage/SKILL.md` — Storage 업로드 패턴
- `/output/step1_schema.sql` — DB 스키마 (db-architect 출력)
- `/output/step2_types.ts` — TypeScript 타입 (db-architect 출력)
- `../taskflow-design-v1.2.md` §3, §2 — 기능 명세, 데이터 흐름

## 구현 파일 목록

### Server Actions (`actions/`)
```
actions/
  ├── todos.ts       — CRUD + batch update + sort_order
  ├── memos.ts       — CRUD + autosave + sort_order
  ├── categories.ts  — CRUD
  └── auth.ts        — 회원가입 시 기본 카테고리 3개 생성
```

### 훅 (`hooks/`)
```
hooks/
  ├── useTodos.ts         — 전체 로드 + DnD sort_order + Realtime
  ├── useMemos.ts         — 무한스크롤 + Realtime + Debounce autosave
  ├── useCategories.ts    — 카테고리 목록 + CRUD
  ├── useImageUpload.ts   — 업로드 진행률 + 에러 처리
  ├── useIsMobile.ts      — 640px 기준 모바일 감지
  └── useAuth.ts          — 세션, 로그인/로그아웃
```

### Route Handler (`app/api/upload/`)
```
app/api/upload/route.ts  — multipart/form-data 이미지 업로드
```

### 유틸리티 (`lib/utils/`)
```
lib/utils/
  ├── date.ts        — D-day 계산 (로컬 타임존), 날짜 포맷
  ├── sort-order.ts  — sort_order 재계산 전략
  ├── image.ts       — 이미지 경로 생성, 파일명 생성
  ├── tiptap.ts      — Tiptap JSON ↔ plain text 변환
  └── cn.ts          — clsx + tailwind-merge
```

## 핵심 구현 패턴

### 1. Server Action 기본 패턴
```typescript
// actions/todos.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTodo(input: {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 현재 최대 sort_order 조회
  const { data: last } = await supabase
    .from('tf_todos')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const newOrder = (last?.sort_order ?? 0) + 1000

  const { data, error } = await supabase
    .from('tf_todos')
    .insert({ ...input, user_id: user.id, sort_order: newOrder })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function batchUpdateTodoStatus(
  ids: string[],
  status: 'todo' | 'in_progress' | 'done' | 'archived'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tf_todos')
    .update({ status })
    .in('id', ids)
    .eq('user_id', user.id)

  if (error) throw error
}
```

### 2. useTodos 훅 (전체 로드 + Realtime)
```typescript
// hooks/useTodos.ts
'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Todo } from '@/types/todo'

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // 전체 로드 (DnD sort_order 의존)
  const fetchTodos = useCallback(async () => {
    const { data } = await supabase
      .from('tf_todos')
      .select('*')
      .neq('status', 'archived')
      .order('sort_order')
    setTodos(data ?? [])
    setLoading(false)
  }, [supabase])

  // Realtime 구독 (멀티 디바이스 동기화)
  useEffect(() => {
    fetchTodos()

    const channel = supabase
      .channel('tf_todos_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tf_todos',
      }, () => fetchTodos())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchTodos, supabase])

  return { todos, loading, refetch: fetchTodos }
}
```

### 3. useMemos 훅 (무한스크롤 + Debounce autosave)
```typescript
// hooks/useMemos.ts
'use client'
const PAGE_SIZE = 20

export function useMemos(categoryId?: string | null) {
  const [memos, setMemos] = useState<Memo[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const editingMemoId = useRef<string | null>(null)
  const supabase = createClient()

  const fetchMemos = useCallback(async (reset = false) => {
    const from = reset ? 0 : page * PAGE_SIZE
    let query = supabase
      .from('tf_memos')
      .select('*, tf_categories(id, name, color), tf_memo_images(*)')
      .order('is_pinned', { ascending: false })
      .order('is_starred', { ascending: false })
      .order('sort_order')
      .range(from, from + PAGE_SIZE - 1)

    if (categoryId !== undefined) {
      query = categoryId
        ? query.eq('category_id', categoryId)
        : query.is('category_id', null)
    }

    const { data } = await query
    if (reset) setMemos(data ?? [])
    else setMemos(prev => [...prev, ...(data ?? [])])
    setHasMore((data?.length ?? 0) === PAGE_SIZE)
  }, [supabase, categoryId, page])

  // Debounce 1초 자동저장 (편집 중 Realtime 업데이트 무시)
  const autosave = useCallback(
    debounce(async (memoId: string, content: object) => {
      await updateMemo(memoId, { content })
    }, 1000),
    []
  )

  // Realtime 구독 (편집 중인 메모 제외)
  useEffect(() => {
    const channel = supabase
      .channel('tf_memos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tf_memos' },
        (payload) => {
          // 현재 편집 중인 메모는 Realtime 업데이트 무시 (Last-write-wins)
          if (editingMemoId.current === payload.new?.id) return
          fetchMemos(true)
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchMemos, supabase])

  return { memos, hasMore, fetchMore: () => setPage(p => p + 1), autosave, editingMemoId }
}
```

### 4. sort_order 재계산 전략
```typescript
// lib/utils/sort-order.ts
const GAP = 1000

export function calcInsertOrder(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return GAP
  if (prev === null) return (next! - GAP > 0) ? next! - GAP : Math.floor(next! / 2)
  if (next === null) return prev + GAP
  const mid = Math.floor((prev + next) / 2)
  // 중간값이 prev와 동일하면 전체 재정렬 필요
  if (mid <= prev) return -1  // 재정렬 신호
  return mid
}

export function rebalanceOrders(count: number): number[] {
  // 전체 재정렬: 1000, 2000, 3000, ...
  return Array.from({ length: count }, (_, i) => (i + 1) * GAP)
}
```

### 5. 신규 사용자 기본 카테고리 시드
```typescript
// actions/auth.ts
'use server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_CATEGORIES = [
  { name: '업무', color: '#3B82F6', sort_order: 0 },
  { name: '개인', color: '#10B981', sort_order: 1 },
  { name: '학습', color: '#F59E0B', sort_order: 2 },
]

export async function seedDefaultCategories() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase
    .from('tf_categories')
    .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id })))
}
```

회원가입 완료 후 `/signup` 페이지 또는 `/auth/callback` 라우트에서 호출.

### 6. 이미지 업로드 Route Handler
```typescript
// app/api/upload/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  const memoId = formData.get('memoId') as string

  if (!file || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const fileName = `${uuidv4()}.${ext}`
  const storagePath = `${user.id}/${memoId}/${fileName}`

  const { error } = await supabase.storage
    .from('tf-memo-images')
    .upload(storagePath, file)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('tf-memo-images')
    .getPublicUrl(storagePath)

  // DB에 메타데이터 저장
  const { data: image } = await supabase
    .from('tf_memo_images')
    .insert({
      memo_id: memoId,
      user_id: user.id,
      storage_path: storagePath,
      public_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
    })
    .select()
    .single()

  return NextResponse.json(image)
}
```

### 7. D-day 계산 (로컬 타임존)
```typescript
// lib/utils/date.ts
import { differenceInCalendarDays, startOfDay, parseISO } from 'date-fns'

export type DDayStatus = 'overdue' | 'today' | 'soon' | 'normal' | 'none'

export function calcDDay(dueDate: string | null): { days: number; status: DDayStatus } {
  if (!dueDate) return { days: 0, status: 'none' }

  const due = startOfDay(parseISO(dueDate))        // 로컬 타임존 기준
  const today = startOfDay(new Date())
  const diff = differenceInCalendarDays(due, today)

  if (diff < 0)  return { days: diff, status: 'overdue' }
  if (diff === 0) return { days: 0,   status: 'today' }
  if (diff <= 3) return { days: diff, status: 'soon' }
  return { days: diff, status: 'normal' }
}

export function formatDDay(days: number, status: DDayStatus): string {
  if (status === 'none') return ''
  if (status === 'today') return 'D-Day'
  if (status === 'overdue') return `D+${Math.abs(days)}`
  return `D-${days}`
}
```

### 8. useIsMobile 훅
```typescript
// hooks/useIsMobile.ts
'use client'
import { useEffect, useState } from 'react'

export function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}
```

## 주의사항
- `createClient()`는 Server Action / Route Handler에서 반드시 `lib/supabase/server.ts` 사용
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 노출 금지
- Realtime 구독은 `useEffect` cleanup에서 반드시 `removeChannel` 호출
- 편집 중인 메모의 Realtime 업데이트는 `editingMemoId` ref로 무시 (Last-write-wins)
- 낙관적 업데이트: Server Action 실패 시 이전 상태로 즉시 롤백 + `sonner` 토스트
- `content_text`는 Generated Column이므로 INSERT/UPDATE 시 포함하지 않음
