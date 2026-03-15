const GAP = 1000

/**
 * 두 항목 사이에 삽입할 sort_order 계산
 * @returns -1이면 전체 재정렬 필요
 */
export function calcInsertOrder(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return GAP
  if (prev === null) return next! > GAP ? next! - GAP : Math.floor(next! / 2)
  if (next === null) return prev + GAP
  const mid = Math.floor((prev + next) / 2)
  if (mid <= prev) return -1  // 재정렬 신호
  return mid
}

/**
 * 전체 재정렬: [1000, 2000, 3000, ...]
 */
export function rebalanceOrders(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * GAP)
}

/**
 * 드래그 완료 후 새 sort_order 배열 계산
 * @param ids 새 순서로 정렬된 ID 배열
 */
export function calcNewOrders(ids: string[]): { id: string; sort_order: number }[] {
  return ids.map((id, i) => ({ id, sort_order: (i + 1) * GAP }))
}
