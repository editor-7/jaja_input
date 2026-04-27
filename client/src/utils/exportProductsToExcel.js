import * as XLSX from 'xlsx-js-style'
import { getDisplayItemName, getSpecFromProduct, getCategory, getMainCategory, toCatalogMainDisplay } from '@/data/products'

const CENTER = { horizontal: 'center', vertical: 'center' }
const LEFT = { horizontal: 'left', vertical: 'center' }
const STYLE_CENTER = { alignment: CENTER }
// 0 값은 셀에 표시하지 않음
const STYLE_CENTER_NUM = { alignment: CENTER, numFmt: '#,##0;-#,##0;;@' }
const STYLE_LEFT = { alignment: LEFT }
const STYLE_LEFT_WRAP = { alignment: { horizontal: 'left', vertical: 'top', wrapText: true } }
const COL_품목 = 1
const NUM_COLUMNS = [5, 6, 7, 8, 9]
const MAIN_CATEGORY_ORDER = ['지하관PLP', '지하관PEM', '노출관', 'GAS METER', '공통']

function getMainCategoryRank(v) {
  const idx = MAIN_CATEGORY_ORDER.indexOf(v)
  return idx === -1 ? MAIN_CATEGORY_ORDER.length : idx
}

/**
 * 전체 상품 목록을 엑셀 파일로 다운로드 (관리자용)
 * 품목·규격별 한 행에 자재비/인건비 단가, 수량·금액은 0, 마지막에 계 행
 */
export function downloadProductsAsExcel(products, fileLabel = '전체물량') {
  if (!products || products.length === 0) {
    return
  }
  const headers = ['SKU', '품목', '규격', '수량', '단위', '자재비단가', '자재비금액', '인건비단가', '인건비금액', '합계', '비고1', '비고2']
  const keyToRow = new Map()
  for (const p of products) {
    const displayName = getDisplayItemName(p)
    const spec = getSpecFromProduct(p) || ''
    const key = `${displayName}\t${spec}`
    if (!keyToRow.has(key)) {
      keyToRow.set(key, {
        SKU: String(p.sku || '').trim(),
        품목: displayName,
        규격: spec,
        수량: 0,
        단위: p.unit || p.size || '',
        자재비단가: 0,
        자재비금액: 0,
        인건비단가: 0,
        인건비금액: 0,
        mainCategory: getMainCategory(p),
      })
    }
    const row = keyToRow.get(key)
    const cat = getCategory(p)
    const price = p.price != null ? p.price : 0
    if (cat === '도시가스-자재') {
      if (String(p.sku || '').trim()) row.SKU = String(p.sku || '').trim()
      row.자재비단가 = price
    }
    if (cat === '도시가스-인건') {
      row.인건비단가 = price
    }
  }
  const dataRows = Array.from(keyToRow.values())
    .sort((a, b) => {
      const rankDiff = getMainCategoryRank(a.mainCategory) - getMainCategoryRank(b.mainCategory)
      if (rankDiff !== 0) return rankDiff
      const nameDiff = String(a.품목 || '').localeCompare(String(b.품목 || ''), 'ko')
      if (nameDiff !== 0) return nameDiff
      return String(a.규격 || '').localeCompare(String(b.규격 || ''), 'ko')
    })
    .map((r) => {
    const has자재 = r.자재비단가 > 0
    const has인건 = r.인건비단가 > 0
    const 비고1 = toCatalogMainDisplay(r.mainCategory) || '공통'
    const 비고2 = has자재 && has인건 ? '자재·인건' : has자재 ? '자재' : has인건 ? '인건' : ''
    // 수량은 사용자가 입력, 금액/합계는 엑셀 수식으로 자동 계산
    return [r.SKU || '', r.품목, r.규격, '', r.단위, r.자재비단가, 0, r.인건비단가, 0, 0, 비고1, 비고2]
  })
  const 계행 = ['', '계', '', '', '', '', 0, '', 0, 0, '', '']
  const rows = [headers, ...dataRows, 계행]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  if (dataRows.length > 0) {
    const first = 2
    const last = dataRows.length + 1
    for (let row = first; row <= last; row++) {
      ws[`G${row}`] = { t: 'n', f: `IFERROR(D${row}*F${row},0)` }
      ws[`I${row}`] = { t: 'n', f: `IFERROR(D${row}*H${row},0)` }
      ws[`J${row}`] = { t: 'n', f: `G${row}+I${row}` }
    }
    const sumRow = dataRows.length + 2
    ws[`G${sumRow}`] = { t: 'n', f: `SUM(G${first}:G${last})` }
    ws[`I${sumRow}`] = { t: 'n', f: `SUM(I${first}:I${last})` }
    ws[`J${sumRow}`] = { t: 'n', f: `SUM(J${first}:J${last})` }
  }
  ws['!cols'] = [
    { wch: 14 },
    { wch: 44 },
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
          ws[addr].s = { ...STYLE_LEFT_WRAP }
        } else {
          const isNumCol = NUM_COLUMNS.includes(C)
          ws[addr].s = isNumCol ? { ...STYLE_CENTER_NUM } : { ...STYLE_CENTER }
        }
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, '전체물량')
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeLabel = String(fileLabel || '전체물량').replace(/[\\/:*?"<>|]/g, '_').trim() || '전체물량'
  a.href = url
  a.download = `${safeLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
