export const skuSort = (a, b) => {
  const skuA = (a.sku || '').trim()
  const skuB = (b.sku || '').trim()
  if (skuA && skuB) return skuA.localeCompare(skuB)
  if (skuA) return -1
  if (skuB) return 1
  return String(a._id || '').localeCompare(String(b._id || ''))
}
