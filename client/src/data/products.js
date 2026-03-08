// 도시가스 자재 상품 데이터 (API 없을 때 fallback)
const FALLBACK_PRODUCTS = [
  { name: 'PEM 관 63A (자재)', desc: '도시가스 자재비', category: '도시가스-자재', size: 'M', unit: 'M', qty: 1, price: 3155, img: '' },
  { name: 'PEM 관 63A (인건)', desc: '도시가스 인건비', category: '도시가스-인건', size: 'M', unit: 'M', qty: 1, price: 6769, img: '' },
]

export const staticProducts = FALLBACK_PRODUCTS

const GAS_CATEGORIES = ['도시가스-자재', '도시가스-인건']

export function getCategory(product) {
  const raw = product.category || ''
  if (GAS_CATEGORIES.includes(raw)) return raw
  if (raw?.includes('자재') || raw?.includes('재료')) return '도시가스-자재'
  if (raw?.includes('인건') || raw?.includes('노무')) return '도시가스-인건'
  return raw || product.name
}

/** 규격 글자만 (DB spec 우선, 없으면 이름 끝에서 숫자+A 패턴 추출) */
export function getSpecFromProduct(product) {
  const s = (product.spec || '').trim()
  if (s) return s
  const name = (product.name || '').replace(/\s*\(자재\)\s*$/, '').replace(/\s*\(인건\)\s*$/, '').trim()
  const m = name.match(/([\d\s]*\d+A)\s*$/i)
  return m ? m[1].replace(/\s/g, '') : ''
}

/** 품목란에 쓸 품명만 (예: "PEM 관 63A (자재)" → "PEM 관") */
export function getDisplayItemName(product) {
  const name = product.name || ''
  const base = name.replace(/\s*\(자재\)\s*$/, '').replace(/\s*\(인건\)\s*$/, '').trim()
  const spec = getSpecFromProduct(product)
  if (!spec) return base
  const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return base.replace(new RegExp('\\s*' + escaped + '\\s*$'), '').trim() || base
}

/** 비고란에 쓸 텍스트 (도시가스 제외, "자재" / "인건"만) */
export function getRemarkDisplay(product) {
  const cat = getCategory(product)
  if (cat === '도시가스-자재') return '자재'
  if (cat === '도시가스-인건') return '인건'
  if (cat && cat !== product.name) return cat.replace(/^도시가스-/, '')
  return '—'
}
