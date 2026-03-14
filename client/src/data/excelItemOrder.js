/**
 * 03.xlsx 전체물량 시트의 품목·규격 순서 (품목\t규격)
 * 장바구니/구매내역 엑셀 내보내기 시 이 순서로 정렬
 */
import excelItemOrder from './excelItemOrder.json'

function normalizeKey(s) {
  if (typeof s !== 'string') return ''
  return s.replace(/\s+/g, ' ').trim().replace(/\s+/g, '')
}

const orderMap = new Map()
excelItemOrder.forEach((key, index) => {
  const norm = normalizeKey(key)
  if (norm && !orderMap.has(norm)) orderMap.set(norm, index)
})

/**
 * 품목·규격이 03.xlsx에서 몇 번째 순서인지 반환 (없으면 Infinity → 맨 뒤로 정렬)
 */
export function getExcelItemSortIndex(품목, 규격) {
  const key = `${품목 || ''}\t${규격 || ''}`
  const norm = normalizeKey(key)
  return orderMap.has(norm) ? orderMap.get(norm) : Infinity
}

export { excelItemOrder }
