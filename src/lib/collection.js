import { diaryDateKey } from './diary-date.js'
import { getExpiryInfo } from './expiration.js'

export function filterProducts(products, { query = '', category = 'Semua produk', favoritesOnly = false, favorites = [], status = 'all', productStatus = 'all', rating = 'all', sort = 'expiring-soon', today = diaryDateKey() } = {}) {
  const queryWords = query.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean)
  const filtered = products.filter((product) => {
    const searchableText = `${product.name} ${product.brand} ${product.category}`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')
    const matchesQuery = queryWords.every((word) => searchableText.includes(word))
    const matchesCategory = category === 'Semua produk' || product.category === category
    const matchesFavorite = !favoritesOnly || favorites.includes(product.id)
    const matchesStatus = status === 'all' || getExpiryInfo(product, today).status === status
    const matchesProductStatus = productStatus === 'all' || product.productStatus === productStatus
    const matchesRating = rating === 'all' || (rating === 'unrated' ? product.ratingValue == null : product.ratingValue != null && product.ratingValue >= Number(rating))
    return matchesQuery && matchesCategory && matchesFavorite && matchesStatus && matchesProductStatus && matchesRating
  })
  const direction = sort === 'expiring-later' ? -1 : 1
  return filtered.sort((a, b) => {
    const leftDate = getExpiryInfo(a, today).effectiveExpiryDate
    const rightDate = getExpiryInfo(b, today).effectiveExpiryDate
    if (!leftDate && !rightDate) return a.name.localeCompare(b.name)
    if (!leftDate) return 1
    if (!rightDate) return -1
    return leftDate.localeCompare(rightDate) * direction
  })
}

export function updateProductInCollection(products, productId, changes) {
  return products.map((product) => product.id === productId ? { ...product, ...changes } : product)
}

export function removeProductFromCollection(products, productId) {
  return products.filter((product) => product.id !== productId)
}
