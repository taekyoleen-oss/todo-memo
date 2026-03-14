# Skill: supabase-storage

## 목적
TaskFlow의 Supabase Storage 업로드/삭제/RLS 패턴을 제공한다.
이미지 업로드 구현 시 이 스킬을 참조한다.

## 버킷 정보
| 항목 | 값 |
|------|-----|
| 버킷명 | `tf-memo-images` |
| 공개 여부 | Private (RLS로 제어) |
| 파일 경로 | `{user_id}/{memo_id}/{uuid}.{ext}` |
| 최대 파일 크기 | 10MB (업로드 전 클라이언트 검증) |
| 지원 형식 | jpg, jpeg, png, gif, webp |

## 클라이언트 사이드 이미지 압축 (업로드 전)

```typescript
// hooks/useImageUpload.ts
import imageCompression from 'browser-image-compression'

async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 5,           // 압축 목표 크기
    maxWidthOrHeight: 1920, // 최대 해상도
    useWebWorker: true,
    fileType: 'image/webp', // WebP로 변환 (용량 절감)
  }
  return imageCompression(file, options)
}
```

## 업로드 패턴 (Route Handler 경유)

```typescript
// hooks/useImageUpload.ts
'use client'
import { useState } from 'react'

export function useImageUpload(memoId: string) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function upload(file: File) {
    // 1. 클라이언트 사이드 검증
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('파일 크기는 10MB 이하여야 합니다')
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('지원하지 않는 파일 형식입니다')
    }

    setUploading(true)
    setProgress(0)

    try {
      // 2. 클라이언트 압축
      const compressed = await compressImage(file)
      setProgress(30)

      // 3. Route Handler로 전송
      const formData = new FormData()
      formData.append('file', compressed)
      formData.append('memoId', memoId)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      setProgress(80)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '업로드 실패')
      }

      const image = await res.json()
      setProgress(100)
      return image
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, progress }
}
```

## 업로드 Route Handler (서버 사이드)

```typescript
// app/api/upload/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const memoId = formData.get('memoId') as string | null

  if (!file || !memoId) {
    return NextResponse.json({ error: 'Missing file or memoId' }, { status: 400 })
  }

  // 서버 사이드 크기 재검증
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const fileName = `${uuidv4()}.${ext}`
  const storagePath = `${user.id}/${memoId}/${fileName}`

  // Supabase Storage 업로드
  const { error: uploadError } = await supabase.storage
    .from('tf-memo-images')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // 공개 URL 획득 (Storage Policy에 따라 signed URL 또는 public URL)
  const { data: { publicUrl } } = supabase.storage
    .from('tf-memo-images')
    .getPublicUrl(storagePath)

  // DB 메타데이터 저장
  const { data: image, error: dbError } = await supabase
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

  if (dbError) {
    // Storage에 업로드된 파일 롤백
    await supabase.storage.from('tf-memo-images').remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(image)
}
```

## 이미지 삭제 패턴

```typescript
// actions/memos.ts 또는 lib/supabase/storage.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function deleteMemoImage(imageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. DB에서 storage_path 조회
  const { data: image, error: fetchError } = await supabase
    .from('tf_memo_images')
    .select('storage_path')
    .eq('id', imageId)
    .eq('user_id', user.id)  // RLS 추가 검증
    .single()

  if (fetchError || !image) throw new Error('Image not found')

  // 2. Storage에서 파일 삭제
  const { error: storageError } = await supabase.storage
    .from('tf-memo-images')
    .remove([image.storage_path])

  if (storageError) throw storageError

  // 3. DB 레코드 삭제
  const { error: dbError } = await supabase
    .from('tf_memo_images')
    .delete()
    .eq('id', imageId)

  if (dbError) throw dbError
}
```

## 드래그 앤 드롭 업로드 UI 패턴

```typescript
// components/memos/MemoImageUploader.tsx
'use client'
import { useCallback, useState } from 'react'

export function MemoImageUploader({ memoId, onUpload }) {
  const [isDragging, setIsDragging] = useState(false)
  const { upload, uploading, progress } = useImageUpload(memoId)

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('image/')
    )
    for (const file of files) {
      const image = await upload(file)
      onUpload(image)
    }
  }, [upload, onUpload])

  // 클립보드 붙여넣기 (Ctrl+V)
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (imageItem) {
      const file = imageItem.getAsFile()
      if (file) {
        const image = await upload(file)
        onUpload(image)
      }
    }
  }, [upload, onUpload])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onPaste={handlePaste}
      className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      }`}
    >
      {uploading ? (
        <div>업로드 중... {progress}%</div>
      ) : (
        <div>이미지를 드래그하거나 클릭하여 업로드</div>
      )}
    </div>
  )
}
```

## Storage RLS 정책 (db-architect 참조용)

```sql
-- 버킷: tf-memo-images (Private)
-- 파일 경로 첫 번째 폴더가 user_id와 일치하는지 확인

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

## 주의사항
- Storage 업로드는 반드시 Route Handler(`/api/upload`)를 경유. Server Action에서 직접 업로드 가능하지만 multipart form 처리에 Route Handler가 더 적합
- Storage 삭제 실패 시에도 DB 레코드는 삭제 진행 (또는 rollback 전략 선택)
- `getPublicUrl()`은 버킷이 Public이 아니면 외부에서 접근 불가 → signed URL 필요
- 현재 설계는 Private 버킷이지만 `getPublicUrl()` 사용 → 버킷 설정에서 Public URL 허용하거나 signed URL로 변경 필요 (db-architect와 협의)
