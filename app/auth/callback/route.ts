import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { seedDefaultCategories } from '@/actions/auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const isNewUser = searchParams.get('new_user') === 'true'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 신규 사용자 → 기본 카테고리 생성
      if (isNewUser) {
        try {
          await seedDefaultCategories()
        } catch {
          // 기본 카테고리 생성 실패는 무시 (비필수)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
