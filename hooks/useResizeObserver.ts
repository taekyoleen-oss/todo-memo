'use client'

/**
 * 네이티브 ResizeObserver를 사용하는 커스텀 훅
 * CSS Grid Masonry의 카드 높이 측정에 사용
 * (use-resize-observer 패키지 대신 React 19 호환 네이티브 구현)
 */
import { useEffect, useRef, useState } from 'react'

interface Size {
  width: number
  height: number
}

export function useResizeObserver<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, ...size }
}
