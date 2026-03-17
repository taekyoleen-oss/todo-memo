'use client'
import Image from 'next/image'
import { X, Upload, ClipboardPaste } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { deleteMemoImage } from '@/actions/memos'
import { useImageUpload } from '@/hooks/useImageUpload'
import { toast } from 'sonner'
import type { MemoImage } from '@/types/index'

interface Props {
  memoId: string
  images: MemoImage[]
  editable?: boolean
  onUpdate: (images: MemoImage[]) => void
}

export function MemoImageGallery({ memoId, images, editable = false, onUpdate }: Props) {
  const { uploading, upload } = useImageUpload(memoId, (newImage) => {
    onUpdate([...images, newImage])
  })
  const [pasteHighlight, setPasteHighlight] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editable) return

    function handlePaste(e: ClipboardEvent) {
      if (images.length >= 5) return
      const items = Array.from(e.clipboardData?.items ?? [])
      const imageItem = items.find(item => item.type.startsWith('image/'))
      if (!imageItem) return

      const file = imageItem.getAsFile()
      if (!file) return

      setPasteHighlight(true)
      setTimeout(() => setPasteHighlight(false), 600)
      upload(file)
    }

    const container = containerRef.current
    container?.addEventListener('paste', handlePaste)
    window.addEventListener('paste', handlePaste)
    return () => {
      container?.removeEventListener('paste', handlePaste)
      window.removeEventListener('paste', handlePaste)
    }
  }, [editable, images.length, upload])

  async function handleDelete(image: MemoImage) {
    try {
      await deleteMemoImage(image.id, image.storage_path)
      onUpdate(images.filter(img => img.id !== image.id))
    } catch { toast.error('이미지 삭제에 실패했습니다') }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload(file)
    e.target.value = ''
  }

  if (images.length === 0 && !editable) return null

  return (
    <div ref={containerRef} className="mt-2 border-t border-border pt-2">
      {editable && (
        <p className={`text-xs mb-1.5 flex items-center gap-1 transition-colors ${pasteHighlight ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          <ClipboardPaste className="h-3 w-3" />
          Ctrl+V로 스크린샷을 바로 붙여넣을 수 있습니다
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {images.map(img => (
          <div key={img.id} className="relative group">
            <Image
              src={img.public_url}
              alt={img.file_name}
              width={72}
              height={72}
              className="rounded-md object-cover w-[72px] h-[72px] border border-border"
            />
            {editable && (
              <button
                onClick={() => handleDelete(img)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {editable && images.length < 5 && (
          <label className={`flex items-center justify-center w-[72px] h-[72px] rounded-md border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="h-4 w-4 text-muted-foreground" />
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        )}
      </div>
    </div>
  )
}
