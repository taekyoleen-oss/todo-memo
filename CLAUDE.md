# TaskFlow — Claude Code 프로젝트 지침

## 프로젝트 개요
- **목적**: 개인 생산성 웹앱 (To-Do + 메모 통합 관리)
- **설계서 위치**: `../taskflow-design-v1.2.md` (v1.3 기준)
- **기술 스택**: Next.js 15 App Router · TweakCN (shadcn/ui) · Supabase · TypeScript strict

## 에이전트 사용 규칙

| 작업 유형 | 사용할 에이전트 | 트리거 키워드 |
|----------|--------------|-------------|
| 컴포넌트 생성/수정, 스타일링, Tiptap 에디터, DnD UI | `ui-builder` | component, style, UI, Tiptap, DnD, DatePicker, grid |
| DB 스키마, RLS 정책, 마이그레이션, Storage 설정 | `db-architect` | schema, migration, RLS, table, policy, storage bucket |
| Server Actions, 훅, API 로직, sort_order, 이미지 업로드 | `api-designer` | action, hook, API, sort, upload, logic, Server Action |

### 에이전트 간 데이터 흐름
```
db-architect → /output/step1_schema.sql → api-designer (참조)
db-architect → /output/step2_types.ts  → ui-builder (타입 임포트)
```

## 스킬 사용 규칙

| 작업 | 스킬 |
|------|------|
| Supabase DB CRUD 쿼리 작성 | `.claude/skills/supabase-crud/SKILL.md` |
| Supabase Storage 업로드/삭제/RLS | `.claude/skills/supabase-storage/SKILL.md` |
| TweakCN/shadcn 스타일링, 컬러 토큰 | `.claude/skills/tweakcn-tokens/SKILL.md` |

> 글로벌 `supabase-sync` 스킬보다 이 프로젝트의 로컬 스킬이 우선합니다.

## 핵심 설계 결정 (v1.3)

### 아키텍처
- **API**: Server Actions 중심 (`actions/` 디렉토리). `/api/upload`만 Route Handler
- **상태**: Zustand (카테고리/필터/탭 상태) + useTodos/useMemos 훅
- **인증**: 이메일/비밀번호 + Google OAuth. 이메일 인증 없이 즉시 로그인
- **Realtime**: 멀티 디바이스 동기화. 편집 중 외부 업데이트는 Last-write-wins

### 메모 에디터
- **Tiptap JSON** (`jsonb`)으로 저장. `content_text` Generated Column으로 FTS
- Debounce **1초** 자동저장 (Google Keep 스타일)
- 인라인 편집: 카드 클릭 → CSS Grid span 확장 → Tiptap 활성화

### 메모 그리드
- **CSS Grid + ResizeObserver** (react-masonry-css 제거)
- `grid-auto-rows: 8px` + `grid-row-end: span N` (useResizeObserver로 동적 계산)

### 데이터 모델 단순화
- **태그 시스템 없음**: tf_tags, tf_todo_tags, tf_memo_tags 테이블 존재하지 않음
- 메모: 카테고리만, To-Do: 상태+우선순위+완료일만

### 모바일 대응
- `< 640px`에서 DnD 핸들 대신 **↑↓ 버튼** (`useIsMobile()` 훅으로 분기)
- D-day: 브라우저 **로컬 타임존** 기준 (date-fns `startOfDay`)

## 코딩 규칙

### TypeScript
- `strict: true` 필수
- `async/await` 사용, callback 패턴 지양
- Server Actions에는 항상 `'use server'` 지시어
- Client Components에는 `'use client'` 지시어

### 파일 컨벤션
- 컴포넌트: PascalCase (`MemoCard.tsx`)
- 훅: camelCase with `use` prefix (`useTodos.ts`)
- Server Actions: camelCase (`createTodo`, `updateMemo`)
- 유틸: camelCase (`calculateDDay`, `extractTiptapText`)

### Supabase 클라이언트 선택
- Server Components / Server Actions / Route Handlers: `lib/supabase/server.ts`
- Client Components / 훅: `lib/supabase/client.ts`
- 미들웨어: `lib/supabase/middleware.ts`
- `SUPABASE_SERVICE_ROLE_KEY`는 서버/Server Action 전용

### Server Actions 패턴
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export async function createTodo(data: CreateTodoInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: todo, error } = await supabase
    .from('tf_todos')
    .insert({ ...data, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return todo
}
```

### 낙관적 업데이트 + 롤백 패턴
```typescript
// 실패 시 자동 롤백 + 토스트
const previousState = getState()
setState(optimisticUpdate)
try {
  await serverAction()
} catch {
  setState(previousState)
  toast.error('저장에 실패했습니다')
}
```

### 환경 변수
- `.env.local` 사용, git 커밋 금지
- `NEXT_PUBLIC_` prefix: 클라이언트에서 접근 가능
- `SUPABASE_SERVICE_ROLE_KEY`: 서버 전용, 절대 클라이언트 노출 금지

## 성공 기준
- `next build` 타입 오류 0 (strict mode)
- Lighthouse Performance ≥ 85
- 반응형: 모바일(320px) ~ 데스크톱(1440px)
- RLS: 사용자별 데이터 완전 격리
