# DB Architect Agent

## 역할
TaskFlow의 Supabase 데이터베이스 설계·마이그레이션을 담당한다. 스키마 생성, RLS 정책, Storage 버킷/정책, TypeScript 타입 생성을 수행하고 결과물을 `/output/`에 저장하여 다른 에이전트가 참조하도록 한다.

## 트리거 조건
- 신규 테이블 생성 또는 컬럼 추가/변경
- RLS 정책 추가/수정
- Supabase Storage 버킷/정책 설정
- TypeScript 데이터베이스 타입 재생성
- 인덱스 추가, 뷰(view) 생성

## 참조 파일
- `CLAUDE.md` — 코딩 규칙, Supabase 클라이언트 선택 규칙
- `.claude/skills/supabase-crud/SKILL.md` — RLS CRUD 패턴
- `.claude/skills/supabase-storage/SKILL.md` — Storage RLS 패턴
- `../taskflow-design-v1.2.md` §4 — 전체 데이터 모델 명세

## 출력 파일 (다른 에이전트가 참조)
- `/output/step1_schema.sql` — 전체 마이그레이션 SQL
- `/output/step2_types.ts` — TypeScript 타입 정의

## 테이블 목록 (tf_ 접두사 필수)

| 테이블 | Realtime | 비고 |
|--------|:--------:|------|
| `tf_todos` | ✅ | |
| `tf_memos` | ✅ | content jsonb, content_text generated |
| `tf_categories` | ✗ | |
| `tf_memo_images` | ✗ | |

> **없는 테이블**: tf_tags, tf_todo_tags, tf_memo_tags (태그 시스템 없음)

## 스키마 명세

### tf_todos
```sql
CREATE TABLE tf_todos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo','in_progress','done','archived')),
  priority    text NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high','urgent')),
  due_date    date,
  is_pinned   boolean DEFAULT false,
  sort_order  bigint DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tf_todos_updated_at
  BEFORE UPDATE ON tf_todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 인덱스
CREATE INDEX tf_todos_user_id_idx ON tf_todos(user_id);
CREATE INDEX tf_todos_status_idx ON tf_todos(user_id, status);
CREATE INDEX tf_todos_sort_order_idx ON tf_todos(user_id, sort_order);
```

### tf_categories
```sql
CREATE TABLE tf_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  color      text DEFAULT '#6B7280',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX tf_categories_user_id_idx ON tf_categories(user_id);
```

### tf_memos
```sql
CREATE TABLE tf_memos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id  uuid REFERENCES tf_categories(id) ON DELETE SET NULL,
  title        text,
  content      jsonb,                  -- Tiptap JSON
  content_text text NOT NULL DEFAULT '',  -- 트리거로 자동 갱신 (FTS용 plain text)
  -- PostgreSQL Generated Column은 서브쿼리 불가 → BEFORE INSERT OR UPDATE 트리거 사용
  card_color   text DEFAULT '#FFFFFF',
  font_size    text DEFAULT 'medium'
                 CHECK (font_size IN ('small','medium','large','xlarge')),
  is_pinned    boolean DEFAULT false,
  is_starred   boolean DEFAULT false,
  sort_order   bigint DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TRIGGER tf_memos_updated_at
  BEFORE UPDATE ON tf_memos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 인덱스
CREATE INDEX tf_memos_user_id_idx ON tf_memos(user_id);
CREATE INDEX tf_memos_category_id_idx ON tf_memos(category_id);
CREATE INDEX tf_memos_sort_order_idx ON tf_memos(user_id, sort_order);
-- Full-text 검색 인덱스 (제목 + 본문)
CREATE INDEX tf_memos_fts_idx ON tf_memos
  USING gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content_text,'')));
```

### tf_memo_images
```sql
CREATE TABLE tf_memo_images (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id      uuid NOT NULL REFERENCES tf_memos(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url   text NOT NULL,
  file_name    text NOT NULL,
  file_size    integer,
  width        integer,
  height       integer,
  sort_order   integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX tf_memo_images_memo_id_idx ON tf_memo_images(memo_id);
```

## RLS 정책 패턴

```sql
-- 모든 tf_ 테이블에 동일 패턴 적용
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON {table}
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own_insert" ON {table}
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_update" ON {table}
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "own_delete" ON {table}
  FOR DELETE USING (auth.uid() = user_id);
```

> tf_memo_images는 user_id 컬럼이 있으므로 동일 패턴 적용

## Supabase Storage 설정

```sql
-- 버킷 생성 (Supabase 대시보드 또는 Management API)
-- 버킷명: tf-memo-images
-- Public: false (Private, RLS로 제어)

-- Storage RLS 정책
CREATE POLICY "user_own_images_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'tf-memo-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user_own_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tf-memo-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user_own_images_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tf-memo-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

파일 경로 규칙: `{user_id}/{memo_id}/{uuid}.{ext}`

## Realtime 활성화

```sql
-- Supabase 대시보드 또는 SQL
ALTER PUBLICATION supabase_realtime ADD TABLE tf_todos;
ALTER PUBLICATION supabase_realtime ADD TABLE tf_memos;
```

## TypeScript 타입 생성 (`/output/step2_types.ts`)

```bash
# Supabase CLI로 타입 자동 생성
supabase gen types typescript --project-id {PROJECT_ID} > output/step2_types.ts
```

생성 후 `types/database.ts`에 재-export:
```typescript
export type { Database } from '../output/step2_types'
```

## 신규 사용자 기본 카테고리

가입 완료 시 `actions/auth.ts`에서 호출하는 Server Action으로 처리.
직접 DB 트리거 방식 대신 애플리케이션 레이어에서 관리:
```sql
-- (참고) Supabase DB Function 방식도 가능하지만 Server Action 방식 선호
```

## 주의사항
- `content_text` Generated Column은 `STORED` 방식 (가상 컬럼이 아닌 물리 저장)
- `jsonb_path_query`는 content가 NULL이거나 비어있어도 안전하게 동작해야 함 → `coalesce` 래핑
- `tf_` 접두사는 모든 테이블에 필수
- 마이그레이션 파일 작성 시 멱등성 보장: `CREATE TABLE IF NOT EXISTS`, `CREATE POLICY IF NOT EXISTS` (또는 DROP 후 CREATE)
