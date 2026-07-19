export type JanProduct = {
  name: string
  brand: string
  category: string
  imageUrl: string | null
  found: boolean
}

// Open Beauty Facts → Open Food Facts の順に検索
const APIS = [
  'https://world.openbeautyfacts.org/api/v2/product',
  'https://world.openfoodfacts.org/api/v2/product',
]

export async function fetchJanProduct(barcode: string): Promise<JanProduct> {
  for (const base of APIS) {
    try {
      const res = await fetch(`${base}/${barcode}.json`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) continue

      const data = await res.json()
      if (data.status !== 1 || !data.product) continue

      const p = data.product
      const name =
        p.product_name_ja ||
        p.product_name ||
        p.abbreviated_product_name ||
        ''
      if (!name) continue

      return {
        found: true,
        name,
        brand: p.brands ?? '',
        category: p.categories_tags?.[0]?.replace(/^[a-z]{2}:/, '') ?? '',
        imageUrl: p.image_front_small_url ?? p.image_url ?? null,
      }
    } catch {
      continue
    }
  }

  return { found: false, name: '', brand: '', category: '', imageUrl: null }
}
