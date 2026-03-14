// 도시가스 자재 상품 데이터 (API 없을 때 fallback)
const FALLBACK_PRODUCTS = [
  { name: 'PEM 관 63A (자재)', desc: '도시가스 자재비', category: '도시가스-자재', size: 'M', unit: 'M', qty: 1, price: 3155, img: '' },
  { name: 'PEM 관 63A (인건)', desc: '도시가스 인건비', category: '도시가스-인건', size: 'M', unit: 'M', qty: 1, price: 6769, img: '' },
]

export const staticProducts = FALLBACK_PRODUCTS

const GAS_CATEGORIES = ['도시가스-자재', '도시가스-인건']

/** 큰 카테고리: 필터 탭용 */
export const MAIN_CATEGORIES = ['지하관PLP', '지하관PEM', '노출관', '공통']

/** 전각 영문 → 반각으로 정규화 (ＰＬＰ → PLP) */
function normalizeForCategory(s) {
  if (typeof s !== 'string') return ''
  return s
    .replace(/[\uFF21-\uFF3A]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)) // Ａ-Ｚ
    .replace(/[\uFF41-\uFF5A]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)) // ａ-ｚ
}

/**
 * 상품의 큰 카테고리 (지하관PLP, 지하관PEM, 노출관, 공통)
 * product.mainCategory 또는 category에 값이 있으면 사용, 없으면 이름/SKU/설명에서 추론
 */
export function getMainCategory(product) {
  if (!product) return '공통'
  const mainRaw = (product.mainCategory || '').trim()
  if (MAIN_CATEGORIES.includes(mainRaw)) return mainRaw
  const catRaw = (product.category || '').trim()
  if (MAIN_CATEGORIES.includes(catRaw)) return catRaw
  const name = normalizeForCategory(product.name || '')
  const sku = normalizeForCategory(product.sku || '')
  const desc = normalizeForCategory(product.desc || '')
  const combined = `${name} ${sku} ${desc}`.toLowerCase()
  const combinedNoSpace = combined.replace(/\s/g, '') // 띄어쓰기 없이도 검사 (PL P → plp)
  // 노출관: 한글은 toLowerCase 영향 없음 → 원문에서 먼저 검사 (name/sku/desc)
  const rawName = product.name || ''
  const rawSku = product.sku || ''
  const rawDesc = product.desc || ''
  if (/노출관|노출|외노출|노출배관/.test(rawName + rawSku + rawDesc)) return '노출관'
  if (combined.includes('exposed')) return '노출관'
  if (combined.includes('plp') || combinedNoSpace.includes('plp')) return '지하관PLP'
  if (combined.includes('pem') || combinedNoSpace.includes('pem')) return '지하관PEM'
  if (/노출관|노출/.test(combined)) return '노출관'
  // category 필드에 포함된 경우 (예: "도시가스-자재" 제외하고 "지하PLP" 등)
  const catStr = (product.category || '').trim()
  if (catStr.includes('plp') || catStr.includes('PLP')) return '지하관PLP'
  if (catStr.includes('pem') || catStr.includes('PEM')) return '지하관PEM'
  if (catStr.includes('노출')) return '노출관'
  // PE 관/REDUCER 등 품명에 PEM이 없지만 도시가스 PEM 자재로 쓰이는 경우
  if (/\bPE\s+REDUCER|PE\s*관|PE관\b|PE\s+배관/i.test(rawName) || /\bPE\s+REDUCER|PE\s*관|PE관/i.test(rawDesc)) return '지하관PEM'
  return '공통'
}

/**
 * 자재비/인건비 구분 (카탈로그 기준)
 * - GAS-J-xxx → 자재비 (도시가스-자재)
 * - GAS-I-xxx, GAS-IN-xxx → 인건비 (도시가스-인건)
 * - category/이름에 자재·인건 있으면 우선 사용
 */
export function getCategory(product) {
  if (!product) return ''
  const raw = (product.category || '').trim()
  if (GAS_CATEGORIES.includes(raw)) return raw
  if (raw?.includes('자재') || raw?.includes('재료')) return '도시가스-자재'
  if (raw?.includes('인건') || raw?.includes('노무')) return '도시가스-인건'
  const sku = (product.sku || '').trim().toUpperCase()
  if (/^GAS-J-/.test(sku)) return '도시가스-자재'
  if (/^GAS-I-/.test(sku) || /^GAS-IN-/.test(sku)) return '도시가스-인건'
  return raw || product.name || ''
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

/**
 * 자재 상품에 대응하는 인건 상품 찾기 (같은 품목·규격)
 * 카탈로그: GAS-J- = 자재, GAS-I- / GAS-IN- = 인건
 */
export function findLaborPair(materialProduct, productList) {
  if (!materialProduct || !Array.isArray(productList)) return null
  if (getCategory(materialProduct) !== '도시가스-자재') return null
  const sku = (materialProduct.sku || '').trim()
  const spec = getSpecFromProduct(materialProduct)
  const displayName = getDisplayItemName(materialProduct)
  // SKU 매칭: GAS-J-0001 → GAS-IN-0001 또는 GAS-I-0001
  if (sku && /^GAS-J-/i.test(sku)) {
    const laborSku1 = sku.replace(/^GAS-J-/i, 'GAS-IN-')
    const laborSku2 = sku.replace(/^GAS-J-/i, 'GAS-I-')
    const bySku = productList.find((p) => {
      const ps = (p.sku || '').trim()
      return ps === laborSku1 || ps === laborSku2
    })
    if (bySku) return bySku
  }
  // 품목명·규격으로 매칭
  return productList.find(
    (p) =>
      getCategory(p) === '도시가스-인건' &&
      getSpecFromProduct(p) === spec &&
      getDisplayItemName(p) === displayName
  ) || null
}

/**
 * 인건 상품에 대응하는 자재 상품 찾기 (같은 품목·규격)
 * 없으면 null → 해당 인건은 "인건만" 품목
 */
export function findMaterialPair(laborProduct, productList) {
  if (!laborProduct || !Array.isArray(productList)) return null
  if (getCategory(laborProduct) !== '도시가스-인건') return null
  const sku = (laborProduct.sku || '').trim()
  const spec = getSpecFromProduct(laborProduct)
  const displayName = getDisplayItemName(laborProduct)
  if (sku && /^GAS-(I|IN)-/i.test(sku)) {
    const materialSku = sku.replace(/^GAS-IN-/i, 'GAS-J-').replace(/^GAS-I-/i, 'GAS-J-')
    const bySku = productList.find((p) => (p.sku || '').trim() === materialSku)
    if (bySku) return bySku
  }
  return productList.find(
    (p) =>
      getCategory(p) === '도시가스-자재' &&
      getSpecFromProduct(p) === spec &&
      getDisplayItemName(p) === displayName
  ) || null
}
