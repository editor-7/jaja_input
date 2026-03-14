import * as XLSX from 'xlsx-js-style'
import { getExcelItemSortIndex } from '@/data/excelItemOrder'

const CENTER = { horizontal: 'center', vertical: 'center' }
const LEFT = { horizontal: 'left', vertical: 'center' }
const STYLE_CENTER = { alignment: CENTER }
const STYLE_CENTER_NUM = { alignment: CENTER, numFmt: '#,##0' }
const STYLE_LEFT = { alignment: LEFT }

function paymentLabel(method) {
  if (method === 'card') return '카드결제'
  if (method === 'transfer') return '계좌이체'
  if (method === 'deposit') return '무통장입금'
  return method || ''
}

// 03.xlsx 전체물량 시트와 동일한 컬럼 순서: 품목, 규격, 수량, 단위, 자재비단가, 자재비금액, 인건비단가, 인건비금액, 합계, 비고1, 비고2
const ITEM_HEADERS = ['품목', '규격', '수량', '단위', '자재비단가', '자재비금액', '인건비단가', '인건비금액', '합계', '비고1', '비고2']

/**
 * 구매 내역(orderList)을 엑셀 파일로 다운로드
 * 03.xlsx와 동일한 컬럼 순서: 주문 메타 뒤에 품목~비고2
 */
export function downloadOrderListAsExcel(orderList) {
  if (!orderList || orderList.length === 0) return

  const headers = ['주문일시', '주문번호', '상태', '결제수단', '수령인', '연락처', '주소', ...ITEM_HEADERS]
  const rows = [headers]

  for (const order of orderList) {
    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('ko-KR') : ''
    const orderId = order.id != null ? `ORD-${String(order.id).slice(-8)}` : ''
    const status = order.status || ''
    const payment = paymentLabel(order.paymentMethod)
    const delivery = order.delivery || {}
    const name = delivery.name || ''
    const phone = delivery.phone || ''
    const address = delivery.address || ''

    const items = order.items || []
    if (items.length === 0) {
      rows.push([dateStr, orderId, status, payment, name, phone, address, '', '', '', '', 0, 0, 0, 0, order.totalPrice ?? 0, '', ''])
    } else {
      const itemSortKey = (g) => {
        const n = (g.name || '').replace(/\s*\(자재\)\s*$/, '').replace(/\s*\(인건\)\s*$/, '').trim()
        const specMatch = n.match(/([\d\s]*\d+A)\s*$/i)
        const spec = specMatch ? specMatch[1].replace(/\s/g, '') : (g.spec != null ? String(g.spec) : '')
        const 품목 = specMatch ? n.slice(0, specMatch.index).trim() : n
        return getExcelItemSortIndex(품목, spec)
      }
      const sortedItems = [...items].sort((a, b) => itemSortKey(a) - itemSortKey(b))
      sortedItems.forEach((g) => {
        const qty = g.count ?? 0
        const price = g.price ?? 0
        const amount = qty * price
        const itemName = g.name ?? ''
        rows.push([dateStr, orderId, status, payment, name, phone, address, itemName, '', qty, '', price, amount, 0, 0, amount, '', ''])
      })
    }
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 24 },
    { wch: 24 },
    { wch: 10 },
    { wch: 12 },
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
    const numCols = [9, 11, 12, 13, 14, 15]
    const leftAlignCols = [7]
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.encode_cell({ r: R, c: C })
        if (!ws[addr]) continue
        if (leftAlignCols.includes(C)) {
          ws[addr].s = { ...STYLE_LEFT }
        } else {
          ws[addr].s = numCols.includes(C) ? { ...STYLE_CENTER_NUM } : { ...STYLE_CENTER }
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, '구매내역')
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `구매내역_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
