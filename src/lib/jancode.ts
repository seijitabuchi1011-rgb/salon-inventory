export type JanProduct = {
  name: string
  brand: string
  category: string
  imageUrl: string | null
  found: boolean
}

export async function fetchJanProduct(barcode: string): Promise<JanProduct> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) throw new Error('fetch failed')

    const data = await res.json()
    if (data.status !== 1 || !data.product) {
      return notFound()
    }

    const p = data.product
    const name =
      p.product_name_ja ||
      p.product_name ||
      p.abbreviated_product_name ||
      ''

    if (!name) return notFound()

    return {
      found: true,
      name,
      brand: p.brands ?? '',
      category: p.categories_tags?.[0]?.replace('en:', '') ?? '',
      imageUrl: p.image_front_small_url ?? p.image_url ?? null,
    }
  } catch {
    return notFound()
  }
}

function notFound(): JanProduct {
  return { found: false, name: '', brand: '', category: '', imageUrl: null }
}
