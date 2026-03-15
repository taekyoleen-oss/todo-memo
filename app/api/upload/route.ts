import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const memoId = formData.get('memoId') as string | null

  if (!file || !memoId) {
    return NextResponse.json({ error: 'file과 memoId가 필요합니다' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '지원하지 않는 파일 형식입니다' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: '파일 크기는 10MB를 초과할 수 없습니다' }, { status: 400 })
  }

  // 메모 소유권 확인
  const { data: memo } = await supabase
    .from('tf_memos')
    .select('id')
    .eq('id', memoId)
    .eq('user_id', user.id)
    .single()

  if (!memo) {
    return NextResponse.json({ error: '메모를 찾을 수 없습니다' }, { status: 404 })
  }

  // 이미지 개수 제한 (최대 5개)
  const { count } = await supabase
    .from('tf_memo_images')
    .select('id', { count: 'exact', head: true })
    .eq('memo_id', memoId)

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: '이미지는 최대 5개까지 첨부할 수 있습니다' }, { status: 400 })
  }

  // Storage 업로드
  const ext = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${uuidv4()}.${ext}`
  const storagePath = `${user.id}/${memoId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('tf-memo-images')
    .upload(storagePath, file, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

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
    // DB 저장 실패 시 Storage 파일 롤백
    await supabase.storage.from('tf-memo-images').remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(image)
}
