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
