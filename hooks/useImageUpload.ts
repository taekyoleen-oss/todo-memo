'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { MemoImage } from '@/types/index'

interface UploadState {
  uploading: boolean
  progress: number
}

export function useImageUpload(memoId: string, onSuccess: (image: MemoImage) => void) {
  const [state, setState] = useState<UploadState>({ uploading: false, progress: 0 })

  async function upload(file: File) {
    if (state.uploading) return

    setState({ uploading: true, progress: 0 })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('memoId', memoId)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? '업로드에 실패했습니다')
      }

      const image: MemoImage = await res.json()
      onSuccess(image)
      setState({ uploading: false, progress: 100 })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드에 실패했습니다')
      setState({ uploading: false, progress: 0 })
    }
  }

  return { ...state, upload }
}
