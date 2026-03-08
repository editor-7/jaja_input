// 제과점 빵 상품 데이터 (API 없을 때 fallback)
const BREAD_NAMES = ['깜바뉴', '바게트']
const RANDOM_PRICES = [18000, 15000]

export const staticProducts = BREAD_NAMES.map((name, i) => ({
  name,
  desc: `정성스럽게 구운 ${name}`,
  category: name === '깜바뉴' ? '클래식' : '바게트',
  size: '1개',
  unit: 'EA',
  qty: 1,
  price: RANDOM_PRICES[i],
  img: name === '깜바뉴' ? '/jpg/08.jpg' : `/jpg/${String(i + 1).padStart(2, '0')}.jpg`,
}))

const BAGUETTE_CATEGORIES = ['샌드위치, 식사', '바게', '바게 샌드위치, 식사', '바게트 샌드위치, 식사']

export function getCategory(product) {
  let raw = product.category
  if (!raw) {
    if (product.name === '깜바뉴') raw = '클래식'
    else if (product.name === '바게트') raw = '바게트'
    else raw = product.name
  }
  if (BAGUETTE_CATEGORIES.includes(raw) || raw?.includes('샌드위치') || raw?.includes('식사') || raw === '바게') {
    return '바게트'
  }
  return raw
}
