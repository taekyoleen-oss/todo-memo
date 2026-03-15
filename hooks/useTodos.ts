'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Todo } from '@/types/index'

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTodos = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('tf_todos')
      .select('*')
      .neq('status', 'archived')
      .order('is_pinned', { ascending: false })
      .order('sort_order')

    setTodos(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTodos()

    const supabase = createClient()
    const channel = supabase
      .channel('tf_todos_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tf_todos' },
        () => fetchTodos()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchTodos])

  return { todos, loading, refetch: fetchTodos }
}

export function useArchivedTodos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tf_todos')
      .select('*')
      .eq('status', 'archived')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setTodos(data ?? [])
        setLoading(false)
      })
  }, [])

  return { todos, loading }
}
