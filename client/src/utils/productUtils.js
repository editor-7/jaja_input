function parseSkuParts(sku) {
  const raw = String(sku || '').trim()
  if (!raw) return { prefix: '', num: Number.POSITIVE_INFINITY, raw: '' }
  const m = raw.match(/^(.*?)-(\d+)\s*$/)
  if (!m) return { prefix: raw.toUpperCase(), num: Number.POSITIVE_INFINITY, raw }
  return {
    prefix: String(m[1] || '').toUpperCase(),
    num: Number(m[2]),
    raw,
  }
}

function compareSkuCore(a, b) {
  const skuA = parseSkuParts(a?.sku)
  const skuB = parseSkuParts(b?.sku)
  if (skuA.raw && skuB.raw) {
    const prefixDiff = skuA.prefix.localeCompare(skuB.prefix)
    if (prefixDiff !== 0) return prefixDiff
    if (Number.isFinite(skuA.num) && Number.isFinite(skuB.num) && skuA.num !== skuB.num) {
      return skuA.num - skuB.num
    }
    const rawDiff = skuA.raw.localeCompare(skuB.raw, undefined, { numeric: true, sensitivity: 'base' })
    if (rawDiff !== 0) return rawDiff
  } else if (skuA.raw) {
    return -1
  } else if (skuB.raw) {
    return 1
  }
  return String(a?._id || '').localeCompare(String(b?._id || ''))
}

export const skuSort = (a, b) => compareSkuCore(a, b)
