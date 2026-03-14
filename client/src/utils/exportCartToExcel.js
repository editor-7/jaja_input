import * as XLSX from 'xlsx-js-style'
import { getDisplayItemName, getSpecFromProduct, getCategory, getMainCategory } from '@/data/products'
import { getExcelItemSortIndex } from '@/data/excelItemOrder'

const CENTER = { horizontal: 'center', vertical: 'center' }
const LEFT = { horizontal: 'left', vertical: 'center' }
const STYLE_CENTER = { alignment: CENTER }
const STYLE_CENTER_NUM = { alignment: CENTER, numFmt: '#,##0' }
const STYLE_LEFT = { alignment: LEFT }
const COL_품목 = 0
// 컬럼: 품목(0), 규격(1), 수량(2), 단위(3), 자재비단가(4), 자재비금액(5), 인건비단가(6), 인건비금액(7), 합계(8), 비고1(9), 비고2(10)
const NUM_COLUMNS = [4, 5, 6, 7, 8]

/**
 * 장바구니(groupedCart)를 엑셀 파일로 다운로드
 * 템플릿: 품목·규격별 한 행에 자재비/인건비 나란히, 마지막에 계 행
 * 셀 중앙 정렬, 금액 컬럼 천 단위 콤마
 */
export function downloadCartAsExcel(groupedCart, totalPrice = 0) {
  if (!groupedCart || groupedCart.length === 0) {
    return
  }
  const headers = ['품목', '규격', '수량', '단위', '자재비단가', '자재비금액', '인건비단가', '인건비금액', '합계', '비고1', '비고2']
  const keyToRow = new Map()
  for (const g of groupedCart) {
    const displayName = getDisplayItemName(g)
    const spec = getSpecFromProduct(g) || ''
    const key = `${displayName}\t${spec}`
    if (!keyToRow.has(key)) {
      keyToRow.set(key, {
        품목: displayName,
        규격: spec,
        수량: 0,
        단위: g.unit || g.size || '',
        자재비단가: 0,
        자재비금액: 0,
        인건비단가: 0,
        인건비금액: 0,
        mainCategory: getMainCategory(g),
      })
    }
    const row = keyToRow.get(key)
    const cat = getCategory(g)
    const qty = g.count || 0
    const amount = (g.price != null ? g.price : 0) * qty
    row.수량 = qty
    if (cat === '도시가스-자재') {
      row.자재비단가 = g.price != null ? g.price : 0
      row.자재비금액 = amount
    }
    if (cat === '도시가스-인건') {
      row.인건비단가 = g.price != null ? g.price : 0
      row.인건비금액 = amount
    }
  }
  let dataRows = Array.from(keyToRow.values()).map((r) => {
    const 합계 = r.자재비금액 + r.인건비금액
    const has자재 = r.자재비단가 > 0 || r.자재비금액 > 0
    const has인건 = r.인건비단가 > 0 || r.인건비금액 > 0
    const 비고1 = r.mainCategory || '공통'
    const 비고2 = has자재 && has인건 ? '자재·인건' : has자재 ? '자재' : has인건 ? '인건' : ''
    return [r.품목, r.규격, r.수량, r.단위, r.자재비단가, r.자재비금액, r.인건비단가, r.인건비금액, 합계, 비고1, 비고2]
  })
  dataRows = dataRows.sort((a, b) => getExcelItemSortIndex(a[0], a[1]) - getExcelItemSortIndex(b[0], b[1]))
  let sum자재비금액 = 0
  let sum인건비금액 = 0
  let sum합계 = 0
  dataRows.forEach((row) => {
    sum자재비금액 += row[5]
    sum인건비금액 += row[7]
    sum합계 += row[8]
  })
  const 계행 = ['계', '', '', '', '', sum자재비금액, '', sum인건비금액, sum합계, '', '']
  const rows = [headers, ...dataRows, 계행]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 24 },
    { wch: 10 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
  ]
  const ref = ws['!ref']
  if (ref) {
    const range = XLSX.utils.decode_range(ref)
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C })
        if (!ws[addr]) continue
        if (C === COL_품목) {
          ws[addr].s = { ...STYLE_LEFT }
        } else {
          const isNumCol = NUM_COLUMNS.includes(C)
          ws[addr].s = isNumCol ? { ...STYLE_CENTER_NUM } : { ...STYLE_CENTER }
        }
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, '장바구니')
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `장바구니_내보내기_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
