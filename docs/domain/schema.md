# TaskFlow 도메인 스키마 문서

## ERD 관계

```
auth.users (Supabase 내장)
    │
    ├─── tf_todos (1:N)
    │
    ├─── tf_categories (1:N)
    │        │
    └─── tf_memos (1:N, category_id → tf_categories)
             └─── tf_memo_images (1:N)
                      └─── [Supabase Storage: tf-memo-images 버킷]
```

## 핵심 설계 결정

### 태그 시스템 없음
- tf_tags, tf_todo_tags, tf_memo_tags 테이블 없음
- To-Do: 상태(status) + 우선순위(priority) + 완료일(due_date)로만 분류
- Memo: 카테고리(category_id)만으로 분류

### Tiptap JSON 저장
- `tf_memos.content` 컬럼: `jsonb` 타입
- `tf_memos.content_text`: GENERATED ALWAYS AS STORED (PostgreSQL Generated Column)
  - JSON 노드 트리에서 text 필드를 추출하여 plain text로 저장
  - Full-text search (tsvector) 인덱스의 대상

### sort_order 전략
- 초기값: 1000, 2000, 3000, ... (간격 1000)
- 사이에 삽입: 중간값 (1000 + 2000) / 2 = 1500
- 충돌 발생 시: 전체 재정렬 (1000, 2000, 3000, ...)

### 카테고리 삭제 시 메모 처리
- `tf_memos.category_id` → `ON DELETE SET NULL`
- 카테고리 삭제 시 메모는 category_id = NULL (미분류) 로 변경
- 메모 자체는 삭제되지 않음

### 신규 사용자 기본 카테고리
- 가입 완료 시 Server Action(actions/auth.ts)에서 생성
- 업무(#3B82F6), 개인(#10B981), 학습(#F59E0B)
