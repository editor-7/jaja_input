import { getDisplayItemName } from '@/data/products'

/** 참조단가NNN 배치 번호 (ASCII·전각 숫자·공백·BOM 허용) */
export function parseReferenceBatchNumber(category) {
  const s = String(category || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .normalize('NFC')
  let m = /^참조단가\s*(\d+)$/i.exec(s)
  if (m) return Number(m[1])
  m = /^참조단가\s*([０-９]+)$/.exec(s)
  if (m) {
    const latin = m[1].replace(/[０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    return Number(latin)
  }
  return NaN
}

/** 참조단가003+ 호표형: 시리즈별 동일 그룹색(005·006 포함) */
export function isReferenceHopyoStyleBatch(category) {
  const raw = String(category || '').replace(/^\uFEFF/, '').trim()
  if (/^참조단가\s*005$/i.test(raw)) return true
  const n = parseReferenceBatchNumber(raw)
  return Number.isFinite(n) && n >= 3
}

function stripHopyoTrailingSpecs(s0) {
  let s = String(s0 || '').trim().replace(/\s+/g, ' ')
  for (let loop = 0; loop < 12; loop += 1) {
    const before = s
    s = s
      .replace(/\s*[ØøΦＯ]\s*\d+(\.\d+)?\s*(㎜|mm|MM)?\s*(×\s*[ØøΦＯ]?\s*\d+(\.\d+)?\s*(㎜|mm|MM)?)?\s*m?$/i, '')
      .trim()
    s = s.replace(/\s*\d+(\.\d+)?\s*(㎜|mm|MM)\s*(×\s*\d+(\.\d+)?\s*(㎜|mm|MM)?)?\s*m?$/i, '').trim()
    s = s.replace(/\s*DN\s*\d+(\.\d+)?$/i, '').trim()
    s = s.replace(/\s*\d+(\.\d+)?\s*A\s*m?$/i, '').trim()
    s = s.replace(/\s+m$/i, '').trim()
    if (s === before) break
  }
  return s
}

const REFERENCE_HOPYO_SERIES = [
  { re: /^강관\s*용접식\s*부설\s*[\(（]\s*인력\s*시공\s*[\)）]/i, key: '강관용접식부설인력' },
  { re: /^강관\s*용접접합\s*[\(（]\s*아크\s*용접\s*[\)）]/i, key: '강관용접접합아크' },
  { re: /^강관\s*용접접합\s*[\(（]\s*(?:알곤|아르곤)\s*용접\s*[\)）]/i, key: '강관용접접합알곤' },
  { re: /^강관\s*용접접합/i, key: '강관용접접합기타' },
  { re: /^강관\s*용접식/i, key: '강관용접식기타' },
  { re: /^강관\s*나사식\s*접합/i, key: '강관나사식접합' },
  { re: /^강관\s*나사식접합/i, key: '강관나사식접합' },
  { re: /^PE관\s*이중벽\s*버트\s*융착식/i, key: 'PE이중벽버트융착' },
  { re: /^PE관\s*버트\s*융착식/i, key: 'PE버트융착' },
  { re: /^PE관\s*전기\s*융착식/i, key: 'PE전기융착' },
  { re: /^PE관\s*전기융착/i, key: 'PE전기융착' },
  { re: /^PE관/i, key: 'PE관' },
  { re: /^가스설비\s*분기\s*공/i, key: '가스설비분기공' },
  { re: /^가스설비\s*밸브\s*설치/i, key: '가스설비밸브설치' },
  { re: /^가스설비/i, key: '가스설비' },
  { re: /^백강관/i, key: '백강관' },
]

function referenceHopyoSeriesKeyAfterStrip(sRaw) {
  const s = String(sRaw || '').trim().replace(/\s+/g, ' ')
  for (const { re, key } of REFERENCE_HOPYO_SERIES) {
    if (re.test(s)) return `series:${key}`
  }
  let t = s.replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  t = stripHopyoTrailingSpecs(t)
  const parts = t.split(/\s+/).filter(Boolean)
  const out = []
  for (const p of parts) {
    if (/^[ØøΦＯ]/i.test(p)) break
    if (/^\d+(\.\d+)?(㎜|mm|MM)$/i.test(p)) break
    out.push(p)
    if (out.length >= 6) break
  }
  const fallback = out.join(' ').trim()
  return fallback ? `head:${fallback}` : `raw:${s}`
}

function referenceHopyoBoxGroupKey(displayName) {
  let s = String(displayName || '').trim().replace(/\s+/g, ' ')
  s = s.replace(/^제\s*\d+\s*호표\s*/i, '').trim()
  s = s.replace(/PE\s*관/gi, 'PE관')
  s = stripHopyoTrailingSpecs(s)
  return referenceHopyoSeriesKeyAfterStrip(s)
}

function hashReferenceHopyoBoxGroup(key) {
  const k = String(key || '')
  let h = 0
  for (let i = 0; i < k.length; i += 1) {
    h = (Math.imul(31, h) + k.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * 목록·카드 그룹색 0..4
 * - 참조단가005: 표시 품목명 전체(공백 정규화) 기준 — 같은 아이템명은 항상 같은 색
 * - 그 외 호표(003+·006…): 공정 시리즈 키 해시(기존)
 */
export function getShopListGroupColorIndex(product, categoryFilter) {
  const batch = parseReferenceBatchNumber(categoryFilter)
  if (batch === 5) {
    const label = getDisplayItemName(product).trim().replace(/\s+/g, ' ').normalize('NFC')
    return hashReferenceHopyoBoxGroup(`item:${label}`) % 5
  }
  if (isReferenceHopyoStyleBatch(categoryFilter)) {
    return hashReferenceHopyoBoxGroup(referenceHopyoBoxGroupKey(getDisplayItemName(product))) % 5
  }
  return 0
}
