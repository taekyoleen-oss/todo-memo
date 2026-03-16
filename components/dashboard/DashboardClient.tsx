'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { CheckSquare, FileText, Star, Folder, Plus, Settings2, Menu, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { signOut } from '@/actions/auth'
import { TodoSection } from '@/components/todos/TodoSection'
import { MemoSection } from '@/components/memos/MemoSection'
import { CategoryManager } from '@/components/memos/CategoryManager'
import { useCategories } from '@/hooks/useCategories'
import { useMemos } from '@/hooks/useMemos'
import { cn } from '@/lib/utils/cn'

type ActiveView =
  | { type: 'todo' }
  | { type: 'memo-all' }
  | { type: 'memo-starred' }
  | { type: 'memo-category'; categoryId: string | null }

interface Props {
  user: User
}

export function DashboardClient({ user }: Props) {
  const [activeView, setActiveView] = useState<ActiveView>({ type: 'todo' })
  const [collapsed, setCollapsed] = useState(true)   // 기본값: 닫힘
  const [mobileOpen, setMobileOpen] = useState(false)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)

  const { categories, refetch: refetchCategories } = useCategories()
  const { memos: allMemos } = useMemos(undefined)

  function isActive(view: ActiveView) {
    if (view.type !== activeView.type) return false
    if (view.type === 'memo-category' && activeView.type === 'memo-category') {
      return view.categoryId === activeView.categoryId
    }
    return true
  }

  function handleNav(view: ActiveView) {
    setActiveView(view)
    setMobileOpen(false)
  }

  const selectedCategoryId =
    activeView.type === 'memo-category' ? activeView.categoryId : undefined

  // 아이콘 전용 버튼 (접힌 상태)
  const iconBtn = (active: boolean, onClick: () => void, icon: React.ReactNode, label: string) => (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'flex items-center justify-center w-10 h-10 rounded-lg transition-colors mx-auto',
        active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
      )}
    >
      {icon}
    </button>
  )

  // 텍스트 포함 버튼 (펼친 상태)
  const fullBtn = (active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: React.ReactNode) => (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors',
        active ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-muted'
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      {badge && <span className="ml-auto text-xs text-muted-foreground">{badge}</span>}
    </button>
  )

  /* ── 사이드바 내용 (데스크톱 full / collapsed 분기) ── */
  const SidebarDesktop = () => (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className={cn('flex items-center border-b border-border', collapsed ? 'justify-center py-4' : 'justify-between px-4 py-4')}>
        {!collapsed && <span className="text-base font-bold text-primary">TaskFlow</span>}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={collapsed ? '사이드바 열기' : '사이드바 닫기'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* 내비게이션 */}
      <nav className={cn('flex-1 overflow-y-auto py-3 space-y-0.5', collapsed ? 'px-1' : 'px-3')}>
        {collapsed ? (
          <>
            {iconBtn(isActive({ type: 'todo' }), () => handleNav({ type: 'todo' }),
              <CheckSquare className="h-5 w-5 text-primary" />, 'To-Do')}
            <div className="my-2 border-t border-border" />
            {iconBtn(isActive({ type: 'memo-all' }), () => handleNav({ type: 'memo-all' }),
              <FileText className="h-5 w-5" />, '전체 메모')}
            {iconBtn(isActive({ type: 'memo-starred' }), () => handleNav({ type: 'memo-starred' }),
              <Star className="h-5 w-5 text-yellow-400" />, '중요')}
            <div className="my-2 border-t border-border" />
            {iconBtn(activeView.type === 'memo-category' && activeView.categoryId === null,
              () => handleNav({ type: 'memo-category', categoryId: null }),
              <Folder className="h-5 w-5" />, '내 메모')}
            {categories.map(cat => (
              iconBtn(
                activeView.type === 'memo-category' && activeView.categoryId === cat.id,
                () => handleNav({ type: 'memo-category', categoryId: cat.id }),
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: cat.color }} />,
                cat.name
              )
            ))}
            <div className="my-2 border-t border-border" />
            {iconBtn(false, () => setCategoryManagerOpen(true),
              <Settings2 className="h-5 w-5" />, '카테고리 관리')}
          </>
        ) : (
          <>
            {fullBtn(isActive({ type: 'todo' }), () => handleNav({ type: 'todo' }),
              <CheckSquare className="h-4 w-4 shrink-0 text-primary" />, 'To-Do')}

            <div className="my-2 border-t border-border" />

            <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">메모</p>

            {fullBtn(isActive({ type: 'memo-all' }), () => handleNav({ type: 'memo-all' }),
              <FileText className="h-4 w-4 shrink-0" />, '전체', allMemos.length)}
            {fullBtn(isActive({ type: 'memo-starred' }), () => handleNav({ type: 'memo-starred' }),
              <Star className="h-4 w-4 shrink-0 text-yellow-400" />, '중요',
              allMemos.filter(m => m.is_starred).length)}

            <div className="flex items-center justify-between px-3 py-1 mt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">폴더</p>
              <button
                onClick={() => setCategoryManagerOpen(true)}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="카테고리 관리"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {fullBtn(
              activeView.type === 'memo-category' && activeView.categoryId === null,
              () => handleNav({ type: 'memo-category', categoryId: null }),
              <Folder className="h-4 w-4 shrink-0" />, '내 메모')}

            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleNav({ type: 'memo-category', categoryId: cat.id })}
                className={cn(
                  'flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors',
                  activeView.type === 'memo-category' && activeView.categoryId === cat.id
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="truncate">{cat.name}</span>
              </button>
            ))}

            <button
              onClick={() => setCategoryManagerOpen(true)}
              className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>카테고리 추가</span>
            </button>
          </>
        )}
      </nav>

      {/* 하단 */}
      {collapsed ? (
        <div className="border-t border-border py-3 flex flex-col items-center gap-2">
          <a
            href="https://vibe-coding-lab.chi.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            title="바브이코딩랩"
            className="text-lg"
          >
            🧪
          </a>
          <form action={signOut}>
            <button type="submit" title="로그아웃" className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="px-4 py-3 border-t border-border bg-primary/5">
            <a
              href="https://vibe-coding-lab.chi.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline font-medium mb-1"
            >
              <span className="text-base">🧪</span>
              바브이코딩랩
            </a>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Claude Code로 만든 생산성 앱<br />제작: 바브이코딩랩
            </p>
          </div>
          <div className="px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground truncate mb-1">{user.email}</p>
            <form action={signOut}>
              <button type="submit" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                로그아웃
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )

  /* ── 모바일 드로어 내용 ── */
  const SidebarMobile = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <span className="text-base font-bold text-primary">TaskFlow</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {fullBtn(isActive({ type: 'todo' }), () => handleNav({ type: 'todo' }),
          <CheckSquare className="h-4 w-4 shrink-0 text-primary" />, 'To-Do')}
        <div className="my-2 border-t border-border" />
        <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">메모</p>
        {fullBtn(isActive({ type: 'memo-all' }), () => handleNav({ type: 'memo-all' }),
          <FileText className="h-4 w-4 shrink-0" />, '전체', allMemos.length)}
        {fullBtn(isActive({ type: 'memo-starred' }), () => handleNav({ type: 'memo-starred' }),
          <Star className="h-4 w-4 shrink-0 text-yellow-400" />, '중요',
          allMemos.filter(m => m.is_starred).length)}
        <div className="flex items-center justify-between px-3 py-1 mt-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">폴더</p>
        </div>
        {fullBtn(
          activeView.type === 'memo-category' && activeView.categoryId === null,
          () => handleNav({ type: 'memo-category', categoryId: null }),
          <Folder className="h-4 w-4 shrink-0" />, '내 메모')}
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleNav({ type: 'memo-category', categoryId: cat.id })}
            className={cn(
              'flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors',
              activeView.type === 'memo-category' && activeView.categoryId === cat.id
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-foreground hover:bg-muted'
            )}
          >
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
            <span className="truncate">{cat.name}</span>
          </button>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground truncate mb-1">{user.email}</p>
        <form action={signOut}>
          <button type="submit" className="text-xs text-muted-foreground hover:text-foreground transition-colors">로그아웃</button>
        </form>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-background">
      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* 데스크톱 사이드바 */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-card flex-shrink-0 transition-all duration-200',
          collapsed ? 'w-14' : 'w-56'
        )}
      >
        <SidebarDesktop />
      </aside>

      {/* 모바일 드로어 */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-56 border-r border-border bg-card flex flex-col lg:hidden transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarMobile />
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 모바일 헤더 */}
        <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-sm px-4 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md hover:bg-muted">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-primary">TaskFlow</span>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-6 overflow-auto">
          {activeView.type === 'todo' ? (
            <TodoSection />
          ) : (
            <MemoSection
              categoryId={selectedCategoryId}
              showStarredOnly={activeView.type === 'memo-starred'}
              onCategoryChange={refetchCategories}
            />
          )}
        </main>
      </div>

      <CategoryManager
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        categories={categories}
        onRefetch={refetchCategories}
      />
    </div>
  )
}
