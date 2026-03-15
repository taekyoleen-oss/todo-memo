import type { JSONContent } from '@tiptap/react'

/**
 * Tiptap JSON에서 plain text 추출 (클라이언트 사이드 검색 미리보기용)
 * DB의 content_text Generated Column과 동일한 로직
 */
export function extractText(content: JSONContent | null | undefined): string {
  if (!content) return ''

  const texts: string[] = []

  function traverse(node: JSONContent) {
    if (node.text) texts.push(node.text)
    if (node.content) node.content.forEach(traverse)
  }

  traverse(content)
  return texts.join(' ')
}

/**
 * 빈 Tiptap 문서 여부 확인
 */
export function isTiptapEmpty(content: JSONContent | null | undefined): boolean {
  if (!content) return true
  const text = extractText(content)
  return text.trim().length === 0
}
