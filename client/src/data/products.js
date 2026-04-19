// 도시가스 자재 상품 데이터 (API 없을 때 fallback)
const FALLBACK_PRODUCTS = [
  { name: 'PEM 관 63A (자재)', desc: '도시가스 자재비', category: '도시가스-자재', size: 'M', unit: 'M', qty: 1, price: 3155, img: '' },
  { name: 'PEM 관 63A (인건)', desc: '도시가스 인건비', category: '도시가스-인건', size: 'M', unit: 'M', qty: 1, price: 6769, img: '' },
]

export const staticProducts = FALLBACK_PRODUCTS

const GAS_CATEGORIES = ['도시가스-자재', '도시가스-인건']

/** 큰 카테고리: 필터 탭·DB mainCategory 값 (엑셀 비고1과 동일 체계) */
export const MAIN_CATEGORIES = ['지하관PLP', '지하관PEM', '노출관', '공통']

/** 관로(대분류) 표시명 — 관리자·엑셀 체계 (DB mainCategory) */
export const MAIN_CATEGORY_LABELS = {
  지하관PLP: 'PLP (지하관)',
  지하관PEM: 'PE (지하관)',
  노출관: '노출관',
  공통: '공통',
}

/** 쇼핑몰 상단 큰 구분 (탭 키) — PLP / PE / 노출관 / 공통 */
export const SHOP_SECTIONS = ['PLP', 'PE', '노출관', '공통']

/** PE 탭 안 세부 (표시용) */
export const PE_PIPE_TABS = ['전체', 'SPPG', '배관']

/** 노출관 탭 안 세부: SPPG, 백강관, 그 외 배관류 */
export const EXPOSED_PIPE_TABS = ['전체', 'SPPG', '백강관', '배관']

export function getMainCategoryLabel(id) {
  if (!id || typeof id !== 'string') return ''
  return MAIN_CATEGORY_LABELS[id] || id
}

/** DB 대분류 → 쇼핑 상단 구간 */
export function getShopSection(product) {
  const mc = getMainCategory(product)
  if (mc === '지하관PLP') return 'PLP'
  if (mc === '지하관PEM') return 'PE'
  if (mc === '노출관') return '노출관'
  return '공통'
}

/** PE 구간만: SPPG vs 배관(PEM·PE관 등 그 외) */
export function getPePipeKind(product) {
  if (!product || getShopSection(product) !== 'PE') return ''
  const hay = `${product.name || ''} ${product.sku || ''} ${product.desc || ''} ${product.spec || ''}`
  if (/sppg/i.test(hay)) return 'SPPG'
  return '배관'
}

/** 노출관 구간만: SPPG / 백강관 / 배관(그 외) */
export function getExposedPipeKind(product) {
  if (!product || getShopSection(product) !== '노출관') return ''
  const hay = `${product.name || ''} ${product.sku || ''} ${product.desc || ''} ${product.spec || ''}`
  if (/sppg/i.test(hay)) return 'SPPG'
  if (/백강/i.test(hay)) return '백강관'
  return '배관'
}

/** 쇼핑 탭 라벨 */
export function getShopCategoryTabLabel(key) {
  if (key === '전체') return key
  if (key === '인건비만') return '인건비만'
  if (key === 'PLP') return 'PLP'
  if (key === 'PE') return 'PE'
  if (key === '노출관') return '노출관'
  if (key === '공통') return '공통'
  return getMainCategoryLabel(key) || key
}

/** 자재비/인건비 (요금 구분) — DB category 권장값 */
export const MATERIAL_KIND_OPTIONS = [
  { value: '도시가스-자재', label: '도시가스 · 자재비' },
  { value: '도시가스-인건', label: '도시가스 · 인건비' },
]

export const MATERIAL_KIND_VALUES = MATERIAL_KIND_OPTIONS.map((o) => o.value)

/** 전각 영문 → 반각으로 정규화 (ＰＬＰ → PLP) */
function normalizeForCategory(s) {
  if (typeof s !== 'string') return ''
  return s
    .replace(/[\uFF21-\uFF3A]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)) // Ａ-Ｚ
    .replace(/[\uFF41-\uFF5A]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)) // ａ-ｚ
}

/** DB·엑셀에서 온 큰 카테고리 문자열 정규화 (공백·전각 등) */
function normalizeStoredCatalogMain(s) {
  if (s == null || typeof s !== 'string') return ''
  const t = normalizeForCategory(s).trim()
  if (!t) return ''
  if (MAIN_CATEGORIES.includes(t)) return t
  const collapsed = t.replace(/\s+/g, '')
  const found = MAIN_CATEGORIES.find((m) => collapsed === m.replace(/\s+/g, ''))
  return found || ''
}

/**
 * 상품의 큰 카테고리 (지하관PLP, 지하관PEM, 노출관, 공통)
 * product.mainCategory 또는 category에 값이 있으면 사용, 없으면 이름/SKU/설명에서 추론
 */
export function getMainCategory(product) {
  if (!product) return '공통'
  const fromMain = normalizeStoredCatalogMain(product.mainCategory)
  if (fromMain) return fromMain
  const fromCat = normalizeStoredCatalogMain(product.category)
  if (fromCat) return fromCat

  const name = normalizeForCategory(product.name || '')
  const sku = normalizeForCategory(product.sku || '')
  const desc = normalizeForCategory(product.desc || '')
  const combined = `${name} ${sku} ${desc}`.toLowerCase()
  const combinedNoSpace = combined.replace(/\s/g, '') // 띄어쓰기 없이도 검사 (PL P → plp)
  const rawName = product.name || ''
  const rawSku = product.sku || ''
  const rawDesc = product.desc || ''
  const rawAll = rawName + rawSku + rawDesc

  // 노출관: 한글·외기류 힌트를 PLP/PEM/PE 휴리스틱보다 먼저 (엑셀 비고1=노출관인 품이 "PE 관"만 있는 경우 오분류 방지)
  const exposedHint =
    /노출관|노출|외노출|노출배관|노출용|외기관|외기배관/i.test(rawAll) ||
    /노출관|노출/.test(combined) ||
    combined.includes('exposed')
  if (exposedHint) return '노출관'

  if (combined.includes('plp') || combinedNoSpace.includes('plp')) return '지하관PLP'
  if (combined.includes('pem') || combinedNoSpace.includes('pem')) return '지하관PEM'
  if (/sppg/i.test(rawAll)) return '지하관PEM'

  const catStr = (product.category || '').trim()
  if (catStr.includes('plp') || catStr.includes('PLP')) return '지하관PLP'
  if (catStr.includes('pem') || catStr.includes('PEM')) return '지하관PEM'
  if (catStr.includes('노출')) return '노출관'

  // PE 관/REDUCER 등 (노출 힌트 없을 때만 지하 PEM으로 간주)
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

/** 자재/인건 필터·옵션 표시 (표준값은 한 줄 라벨, 그 외는 비고 스타일) */
export function getMaterialKindSelectLabel(value) {
  if (!value || typeof value !== 'string') return ''
  const hit = MATERIAL_KIND_OPTIONS.find((o) => o.value === value)
  if (hit) return hit.label
  return getRemarkDisplay({ category: value }) || value
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
