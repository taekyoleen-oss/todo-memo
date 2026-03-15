'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useTabStore } from '@/stores/tabStore'
import { signOut } from '@/actions/auth'

interface Props {
  user: User
}

export function DashboardClient({ user }: Props) {
  const { activeTab, setActiveTab } = useTabStore()
  const [pendingTab, setPendingTab] = useState<string | null>(null)

  function handleTabChange(value: string) {
    // TODO: 미완성 폼이 있을 경우 확인 다이얼로그 표시 (추후 구현)
    setActiveTab(value as 'todo' | 'memo')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <span className="text-lg font-bold text-primary">TaskFlow</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Dashboard Tabs */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-accent mb-6">
            <TabsTrigger
              value="todo"
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              To-Do
            </TabsTrigger>
            <TabsTrigger
              value="memo"
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Memo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todo">
            {/* TODO: TodoSection 컴포넌트 */}
            <div className="text-muted-foreground text-sm">To-Do 섹션 (구현 예정)</div>
          </TabsContent>

          <TabsContent value="memo">
            {/* TODO: MemoSection 컴포넌트 */}
            <div className="text-muted-foreground text-sm">Memo 섹션 (구현 예정)</div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
