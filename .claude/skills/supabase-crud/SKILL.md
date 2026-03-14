# Skill: supabase-crud

## 목적
TaskFlow 프로젝트의 Supabase RLS CRUD 패턴을 제공한다.
DB 쿼리 함수 작성 시 이 스킬을 참조한다.

## 클라이언트 선택 규칙

| 컨텍스트 | 사용할 클라이언트 |
|---------|----------------|
| Server Actions (`'use server'`) | `import { createClient } from '@/lib/supabase/server'` |
| Route Handlers (`route.ts`) | `import { createClient } from '@/lib/supabase/server'` |
| Server Components | `import { createClient } from '@/lib/supabase/server'` |
| Client Components / 훅 | `import { createClient } from '@/lib/supabase/client'` |
| 미들웨어 | `import { createMiddlewareClient } from '@/lib/supabase/middleware'` |

## 기본 CRUD 패턴

### SELECT (목록 조회)
```typescript
const { data, error } = await supabase
  .from('tf_todos')
  .select('*')
  .eq('user_id', user.id)           // RLS가 있더라도 명시적 필터 권장
  .neq('status', 'archived')
  .order('sort_order', { ascending: true })

if (error) throw error
```

### SELECT (단건 조회)
```typescript
const { data, error } = await supabase
  .from('tf_todos')
  .select('*')
  .eq('id', id)
  .single()                          // 결과가 없으면 error 발생

if (error) throw error
```

### SELECT (관계 포함)
```typescript
// tf_memos + tf_categories + tf_memo_images
const { data, error } = await supabase
  .from('tf_memos')
  .select(`
    *,
    tf_categories (id, name, color),
    tf_memo_images (id, public_url, sort_order)
  `)
  .order('sort_order')
```

### INSERT
```typescript
const { data, error } = await supabase
  .from('tf_todos')
  .insert({
    user_id: user.id,   // 반드시 포함 (RLS INSERT WITH CHECK)
    title: '할 일 제목',
    status: 'todo',
    sort_order: 5000,
  })
  .select()             // 삽입 결과 반환
  .single()

if (error) throw error
```

### UPDATE
```typescript
const { error } = await supabase
  .from('tf_todos')
  .update({ status: 'done', updated_at: new Date().toISOString() })
  .eq('id', todoId)
  // RLS UPDATE USING이 있으므로 user_id 필터 생략 가능하지만 명시 권장
  .eq('user_id', user.id)

if (error) throw error
```

### UPSERT (sort_order 배치 업데이트)
```typescript
const updates = todos.map((todo, idx) => ({
  id: todo.id,
  user_id: user.id,
  sort_order: (idx + 1) * 1000,
}))

const { error } = await supabase
  .from('tf_todos')
  .upsert(updates, { onConflict: 'id' })

if (error) throw error
```

### DELETE
```typescript
const { error } = await supabase
  .from('tf_todos')
  .delete()
  .eq('id', todoId)
  .eq('user_id', user.id)  // 명시적 필터

if (error) throw error
```

### DELETE (배치)
```typescript
const { error } = await supabase
  .from('tf_todos')
  .delete()
  .in('id', selectedIds)
  .eq('user_id', user.id)
```

## 무한 스크롤 페이지네이션
```typescript
const PAGE_SIZE = 20

async function fetchMemosPage(page: number, categoryId?: string | null) {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('tf_memos')
    .select('*, tf_categories(id,name,color), tf_memo_images(*)')
    .order('is_pinned', { ascending: false })
    .order('is_starred', { ascending: false })
    .order('sort_order')
    .range(from, to)

  if (categoryId !== undefined) {
    query = categoryId
      ? query.eq('category_id', categoryId)
      : query.is('category_id', null)           // 미분류
  }

  const { data, error } = await query
  if (error) throw error
  return {
    data: data ?? [],
    hasMore: data.length === PAGE_SIZE,
  }
}
```

## Full-Text Search (메모 검색)
```typescript
// content_text Generated Column을 FTS 인덱스로 검색
async function searchMemos(query: string) {
  const { data, error } = await supabase
    .from('tf_memos')
    .select('*')
    .textSearch(
      'content_text',       // 또는 title + content_text 복합
      query,
      { type: 'websearch', config: 'simple' }
    )
    .limit(50)
}
```

## Realtime 구독 패턴
```typescript
// 컴포넌트 마운트 시 구독, 언마운트 시 해제
useEffect(() => {
  const channel = supabase
    .channel('tf_todos_realtime')
    .on('postgres_changes', {
      event: '*',           // INSERT | UPDATE | DELETE | *
      schema: 'public',
      table: 'tf_todos',
    }, (payload) => {
      // payload.eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      // payload.new: 새 데이터, payload.old: 이전 데이터
      handleRealtimeChange(payload)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [supabase])
```

## 에러 처리 패턴
```typescript
try {
  const { data, error } = await supabase.from('tf_todos').select('*')
  if (error) throw error
  return data
} catch (err) {
  // Supabase 에러 구분
  if (err instanceof Error) {
    if (err.message.includes('JWT')) {
      // 인증 만료 → 로그인 페이지로
      redirect('/login')
    }
    throw err
  }
}
```

## content_text Generated Column 주의사항
```typescript
// ❌ 잘못된 방법: content_text를 직접 삽입/업데이트하지 말 것
await supabase.from('tf_memos').insert({ content_text: '...' })  // ERROR

// ✅ 올바른 방법: content(jsonb)만 저장, content_text는 DB가 자동 생성
await supabase.from('tf_memos').insert({
  content: tiptapJSON,  // jsonb
  // content_text: 자동 생성됨
})
```
