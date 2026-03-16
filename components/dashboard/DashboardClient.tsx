'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { CheckSquare, FileText, LogOut } from 'lucide-react'
import { signOut } from '@/actions/auth'
import { TodoSection } from '@/components/todos/TodoSection'
import { MemoSection } from '@/components/memos/MemoSection'
import { CategoryManager } from '@/components/memos/CategoryManager'
import { useCategories } from '@/hooks/useCategories'
import { cn } from '@/lib/utils/cn'

type TopView = 'todo' | 'memo'

interface Props {
  user: User
}

export function DashboardClient({ user }: Props) {
  const [view, setView] = useState<TopView>('todo')
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)

  const { categories, refetch: refetchCategories } = useCategories()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 상단 헤더 네비게이션 */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 lg:px-6 h-12">
          {/* 로고 */}
          <span className="text-base font-bold text-primary shrink-0">TaskFlow</span>

          <div className="w-px h-5 bg-border shrink-0" />

          {/* 주 탭 */}
          <nav className="flex items-center gap-0.5">
            <button
              onClick={() => setView('todo')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                view === 'todo'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <CheckSquare className="h-4 w-4" />
              To-Do
            </button>
            <button
              onClick={() => setView('memo')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                view === 'memo'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <FileText className="h-4 w-4" />
              메모
            </button>
          </nav>

          {/* 오른쪽: 사용자 + 로그아웃 */}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[180px]">
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                title="로그아웃"
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 px-4 py-6 lg:px-6 overflow-auto">
        {view === 'todo' ? (
          <TodoSection />
        ) : (
          <MemoSection
            categories={categories}
            onOpenCategoryManager={() => setCategoryManagerOpen(true)}
            onCategoryChange={refetchCategories}
          />
        )}
      </main>

      <CategoryManager
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        categories={categories}
        onRefetch={refetchCategories}
      />
    </div>
  )
}
