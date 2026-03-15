-- ─────────────────────────────────────────────────────────────────────────────
-- TaskFlow Initial Schema
-- ─────────────────────────────────────────────────────────────────────────────

-- ── updated_at 자동 갱신 공용 트리거 함수 ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── tf_todos ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tf_todos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  status      text        NOT NULL DEFAULT 'todo'
                            CHECK (status IN ('todo','in_progress','done','archived')),
  priority    text        NOT NULL DEFAULT 'medium'
                            CHECK (priority IN ('low','medium','high','urgent')),
  due_date    date,
  is_pinned   boolean     NOT NULL DEFAULT false,
  sort_order  bigint      NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER tf_todos_updated_at
  BEFORE UPDATE ON tf_todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS tf_todos_user_id_idx    ON tf_todos(user_id);
CREATE INDEX IF NOT EXISTS tf_todos_status_idx     ON tf_todos(user_id, status);
CREATE INDEX IF NOT EXISTS tf_todos_sort_order_idx ON tf_todos(user_id, sort_order);

ALTER TABLE tf_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "todos_select" ON tf_todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "todos_insert" ON tf_todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "todos_update" ON tf_todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "todos_delete" ON tf_todos FOR DELETE USING (auth.uid() = user_id);

-- ── tf_categories ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tf_categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  color      text        NOT NULL DEFAULT '#6B7280',
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS tf_categories_user_id_idx ON tf_categories(user_id);

ALTER TABLE tf_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select" ON tf_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert" ON tf_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update" ON tf_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete" ON tf_categories FOR DELETE USING (auth.uid() = user_id);

-- ── tf_memos ──────────────────────────────────────────────────────────────────
-- content_text: jsonb_path_query는 서브쿼리라 Generated Column 불가
-- → BEFORE INSERT OR UPDATE 트리거로 자동 갱신
CREATE TABLE IF NOT EXISTS tf_memos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id  uuid        REFERENCES tf_categories(id) ON DELETE SET NULL,
  title        text,
  content      jsonb,
  content_text text        NOT NULL DEFAULT '',   -- 트리거로 자동 갱신
  card_color   text        NOT NULL DEFAULT '#FFFFFF',
  font_size    text        NOT NULL DEFAULT 'medium'
                             CHECK (font_size IN ('small','medium','large','xlarge')),
  is_pinned    boolean     NOT NULL DEFAULT false,
  is_starred   boolean     NOT NULL DEFAULT false,
  sort_order   bigint      NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- content_text 자동 갱신 함수 (Tiptap JSON → plain text)
CREATE OR REPLACE FUNCTION sync_memo_content_text()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content IS NULL THEN
    NEW.content_text := '';
  ELSE
    SELECT coalesce(string_agg(val::text, ' '), '')
    INTO NEW.content_text
    FROM jsonb_path_query(NEW.content, 'strict $.**.text') AS val;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tf_memos_content_text
  BEFORE INSERT OR UPDATE OF content ON tf_memos
  FOR EACH ROW EXECUTE FUNCTION sync_memo_content_text();

CREATE TRIGGER tf_memos_updated_at
  BEFORE UPDATE ON tf_memos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS tf_memos_user_id_idx     ON tf_memos(user_id);
CREATE INDEX IF NOT EXISTS tf_memos_category_id_idx ON tf_memos(category_id);
CREATE INDEX IF NOT EXISTS tf_memos_sort_order_idx  ON tf_memos(user_id, sort_order);
CREATE INDEX IF NOT EXISTS tf_memos_fts_idx ON tf_memos
  USING gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content_text,'')));

ALTER TABLE tf_memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memos_select" ON tf_memos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "memos_insert" ON tf_memos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "memos_update" ON tf_memos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "memos_delete" ON tf_memos FOR DELETE USING (auth.uid() = user_id);

-- ── tf_memo_images ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tf_memo_images (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id      uuid        NOT NULL REFERENCES tf_memos(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text        NOT NULL,
  public_url   text        NOT NULL,
  file_name    text        NOT NULL,
  file_size    integer,
  width        integer,
  height       integer,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tf_memo_images_memo_id_idx ON tf_memo_images(memo_id);

ALTER TABLE tf_memo_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "images_select" ON tf_memo_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "images_insert" ON tf_memo_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "images_delete" ON tf_memo_images FOR DELETE USING (auth.uid() = user_id);

-- ── Realtime 활성화 ───────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE tf_todos;
ALTER PUBLICATION supabase_realtime ADD TABLE tf_memos;

-- ── Storage: tf-memo-images 버킷 생성 ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('tf-memo-images', 'tf-memo-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'tf-memo-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tf-memo-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tf-memo-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
