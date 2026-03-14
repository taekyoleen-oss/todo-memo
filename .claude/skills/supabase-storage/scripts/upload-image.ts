/**
 * upload-image.ts
 * 이미지 업로드 Route Handler 레퍼런스 스크립트
 * 실제 사용: app/api/upload/route.ts 에서 패턴 참조
 *
 * 흐름:
 *   클라이언트 (browser-image-compression)
 *     → POST /api/upload (multipart/form-data)
 *     → Supabase Storage (tf-memo-images 버킷)
 *     → tf_memo_images 테이블 메타데이터 저장
 *     → { id, public_url, ... } 반환
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB
const BUCKET_NAME = 'tf-memo-images'

export async function POST(request: NextRequest) {
  // 1. 인증 확인
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. 폼 데이터 파싱
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const memoId = formData.get('memoId') as string | null

  if (!file || !memoId) {
    return NextResponse.json({ error: 'Missing file or memoId' }, { status: 400 })
  }

  // 3. 서버 사이드 검증
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '지원하지 않는 파일 형식입니다' }, { status: 400 })
  }

  // 4. 메모 소유권 확인
  const { error: memoError } = await supabase
    .from('tf_memos')
    .select('id')
    .eq('id', memoId)
    .eq('user_id', user.id)
    .single()

  if (memoError) {
    return NextResponse.json({ error: 'Memo not found' }, { status: 404 })
  }

  // 5. 기존 이미지 수 확인 (최대 5장)
  const { count } = await supabase
    .from('tf_memo_images')
    .select('id', { count: 'exact', head: true })
    .eq('memo_id', memoId)

  const maxImages = parseInt(process.env.NEXT_PUBLIC_MAX_IMAGES_PER_MEMO ?? '5')
  if ((count ?? 0) >= maxImages) {
    return NextResponse.json(
      { error: `메모당 최대 ${maxImages}장까지 첨부할 수 있습니다` },
      { status: 400 }
    )
  }

  // 6. Storage 경로 생성
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const fileName = `${uuidv4()}.${ext}`
  const storagePath = `${user.id}/${memoId}/${fileName}`  // {user_id}/{memo_id}/{uuid}.{ext}

  // 7. Storage 업로드
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // 8. Public URL 획득
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath)

  // 9. 현재 sort_order (마지막 이미지 다음에 추가)
  const { data: lastImage } = await supabase
    .from('tf_memo_images')
    .select('sort_order')
    .eq('memo_id', memoId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const newSortOrder = (lastImage?.sort_order ?? -1) + 1

  // 10. DB 메타데이터 저장
  const { data: image, error: dbError } = await supabase
    .from('tf_memo_images')
    .insert({
      memo_id: memoId,
      user_id: user.id,
      storage_path: storagePath,
      public_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      sort_order: newSortOrder,
    })
    .select()
    .single()

  if (dbError) {
    // Storage 파일 롤백
    await supabase.storage.from(BUCKET_NAME).remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(image, { status: 201 })
}
