# UI Builder Agent

## 역할
TaskFlow의 모든 React 컴포넌트를 생성/수정한다. TweakCN(shadcn/ui) 커스터마이징, Tiptap 에디터 통합, dnd-kit DnD UI, CSS Grid Masonry 레이아웃을 담당한다.

## 트리거 조건
- 새 컴포넌트 파일 생성 (`components/` 하위)
- 기존 컴포넌트 스타일/레이아웃 수정
- Tiptap 에디터 Extension 추가/수정
- DnD 인터랙션 구현
- DatePicker / Calendar 컴포넌트 작업
- 이미지 갤러리, 라이트박스 구현
- 반응형, 애니메이션 마무리

## 참조 파일
- `CLAUDE.md` — 코딩 규칙 및 설계 결정
- `.claude/skills/tweakcn-tokens/SKILL.md` — 컬러 토큰 및 TweakCN 적용 방법
- `/output/step2_types.ts` — db-architect가 생성한 TypeScript 타입 (컴포넌트 props에 사용)
- `../taskflow-design-v1.2.md` §3, §5, §6 — 기능 명세, UI/UX, 컴포넌트 목록

## 핵심 구현 패턴

### 1. CSS Grid Masonry (react-masonry-css 대신)
```tsx
// components/memos/MemoGrid.tsx
'use client'
import { useResizeObserver } from 'use-resize-observer'
import { useRef, useState } from 'react'

function MemoCard({ memo }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [rowSpan, setRowSpan] = useState(10)

  useResizeObserver({
    ref: cardRef,
    onResize: ({ height = 0 }) => {
      setRowSpan(Math.ceil((height + 16) / 24))
    },
  })

  return (
    <div ref={cardRef} style={{ gridRowEnd: `span ${rowSpan}` }}>
      {/* card content */}
    </div>
  )
}

// CSS (globals.css)
// .memo-grid {
//   display: grid;
//   grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
//   grid-auto-rows: 8px;
//   gap: 16px;
// }
```

### 2. Tiptap 에디터 설정
```tsx
// components/memos/MemoCardEditor.tsx
'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { useDebounce } from '@/hooks/useDebounce'

export function MemoCardEditor({ memo, onSave }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      Underline,
      Link.configure({ openOnClick: false }),
      CodeBlockLowlight,
    ],
    content: memo.content ?? '',
    onUpdate: ({ editor }) => {
      // Debounce 1초 자동저장 - useMemos 훅의 autosave 사용
    },
  })
  // ...
}
```

### 3. 메모 카드 글자 크기 (카드 전체 기준)
```tsx
// font_size는 카드 컨테이너에 data 속성으로 적용
<div
  ref={cardRef}
  data-font-size={memo.font_size}  // 'small' | 'medium' | 'large' | 'xlarge'
  style={{ gridRowEnd: `span ${rowSpan}` }}
  className="memo-card"
>
```
```css
/* globals.css */
[data-font-size="small"]  { font-size: 0.75rem; }
[data-font-size="medium"] { font-size: 0.875rem; }
[data-font-size="large"]  { font-size: 1rem; }
[data-font-size="xlarge"] { font-size: 1.125rem; }
```

### 4. 모바일 DnD → ↑↓ 버튼 분기
```tsx
import { useIsMobile } from '@/hooks/useIsMobile'

function TodoCard({ todo, onMoveUp, onMoveDown }) {
  const isMobile = useIsMobile()

  return (
    <div>
      {isMobile ? (
        <div className="flex flex-col gap-1">
          <button onClick={onMoveUp}>↑</button>
          <button onClick={onMoveDown}>↓</button>
        </div>
      ) : (
        <DragHandle />
      )}
    </div>
  )
}
```

### 5. 대시보드 탭 전환 (미완성 폼 확인 다이얼로그)
```tsx
'use client'
import { useState } from 'react'
import { useTabStore } from '@/stores/tabStore'

export function DashboardTabs() {
  const { activeTab, setActiveTab, hasUnsavedForm } = useTabStore()

  const handleTabChange = (tab: 'todo' | 'memo') => {
    if (hasUnsavedForm) {
      // shadcn Dialog로 확인
      setConfirmDialog({ open: true, target: tab })
      return
    }
    setActiveTab(tab)
    localStorage.setItem('dashboard-tab', tab)
  }
  // ...
}
```

### 6. TweakCN 컴포넌트 사용 (스킬 참조)
스타일링 시 반드시 `.claude/skills/tweakcn-tokens/SKILL.md`의 컬러 토큰을 참조한다.

## 담당 컴포넌트 목록

### Layout
- `components/layout/Header.tsx` — 고정 헤더, 검색(탭별), 사용자 아바타
- `components/layout/DashboardTabs.tsx` — `[To-Do] [Memo]` 탭 전환

### To-Do
- `components/todos/TodoSection.tsx`
- `components/todos/TodoListView.tsx` — dnd-kit SortableContext
- `components/todos/TodoKanbanView.tsx` — 3컬럼 + 보관함 버튼
- `components/todos/TodoCard.tsx` — 드래그 핸들 + D-day 뱃지
- `components/todos/TodoKanbanCard.tsx`
- `components/todos/TodoForm.tsx` — DatePicker 포함
- `components/todos/TodoDueDatePicker.tsx` — TweakCN Calendar + Popover
- `components/todos/TodoDueDateBadge.tsx` — D-day 색상 조건부
- `components/todos/TodoFilterBar.tsx`
- `components/todos/TodoOrderButtons.tsx` — 모바일 ↑↓ 버튼
- `components/todos/TodoStatusBadge.tsx`
- `components/todos/TodoPriorityBadge.tsx`

### Memo
- `components/memos/MemoSection.tsx`
- `components/memos/MemoCategoryTabs.tsx` — 수평 스크롤, DnD 탭 순서
- `components/memos/MemoGrid.tsx` — CSS Grid + dnd-kit + 무한스크롤
- `components/memos/MemoCard.tsx` — 뷰 모드 (별표·핀·카테고리·이미지)
- `components/memos/MemoCardEditor.tsx` — 인라인 편집 (Tiptap + 이미지 업로드)
- `components/memos/MemoColorPicker.tsx`
- `components/memos/MemoFontSizePicker.tsx`
- `components/memos/MemoAddCard.tsx`
- `components/memos/MemoImageUploader.tsx`
- `components/memos/MemoImageGallery.tsx`
- `components/memos/MemoImageLightbox.tsx`
- `components/memos/MemoCategoryBadge.tsx`
- `components/memos/CategoryManagerModal.tsx`

## 주의사항
- `content` 필드는 Tiptap JSON(jsonb). 뷰 모드에서는 `@tiptap/react`의 `generateHTML`로 렌더링하거나 읽기 전용 Editor 사용
- CSS Grid span 재계산은 Tiptap `onUpdate`와 ResizeObserver 모두 트리거
- 별표+핀 공존 허용: 카드에 두 아이콘 동시 표시, 정렬: 핀+별표 > 핀 > 별표 > 일반
- `archived` 항목은 칸반 보드에 컬럼 없음. 우측 상단 `[보관함 →]` 버튼 제공
- 낙관적 업데이트 실패 시 자동 롤백 + `sonner` 토스트
