import { parseDateKey, validateProductDates } from './expiration.js'

const legacyCategory = (type = '', group = 'skincare') => {
  const normalized = type.toLowerCase()
  const allowed = ['cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'treatment', 'other']
  if (allowed.includes(normalized)) return normalized
  return group === 'makeup' ? 'other' : 'other'
}
const bottleFor = (type = '', group = 'skincare') => {
  const value = type.toLowerCase()
  if (group === 'makeup') return /powder|compact|blush|palette/.test(value) ? 'jar' : /lipstick|lip tint|mascara/.test(value) ? 'tube' : 'tall'
  return /cleanser|sunscreen|wash/.test(value) ? 'tube' : /toner/.test(value) ? 'wide' : /serum|essence/.test(value) ? 'dropper' : /cream|moisturizer|mask/.test(value) ? 'jar' : 'tall'
}

export function mapProduct(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    brand: row.brand ?? '',
    categoryGroup: row.category_group ?? 'skincare',
    category: row.category_group === 'makeup' ? 'Make Up' : 'Skincare',
    productType: row.product_type ?? row.category ?? 'other',
    size: row.size_label ?? 'Ukuran belum dicatat',
    price: row.price_amount == null ? 'Belum dicatat' : `${row.currency_code} ${Number(row.price_amount).toLocaleString('id-ID')}`,
    description: row.description ?? 'Belum ada deskripsi produk.',
    usage: row.usage_instructions ?? 'Belum ada cara penggunaan yang dicatat.',
    ingredients: row.ingredients ?? [],
    purchaseDate: row.purchase_date ?? '',
    usageTime: row.usage_time ?? [],
    frequency: row.usage_frequency ?? 'Belum diatur',
    usageAmount: row.usage_amount ?? '',
    usageNotes: row.usage_notes ?? '',
    productStatus: row.product_status ?? 'in_use',
    imagePath: row.image_path ?? '',
    skinType: row.skin_types?.join(', ') || 'Belum dicatat',
    accent: '#F3D8D8',
    bottle: bottleFor(row.product_type ?? row.category ?? '', row.category_group ?? 'skincare'),
    rating: '—',
    reviews: 0,
    added: row.created_at,
    expiresOn: row.expires_on ?? '',
    openedOn: row.opened_on ?? '',
    paoMonths: row.pao_months,
    isFavorite: row.is_favorite,
  }
}

export function productPayload(values, userId) {
  if (typeof values.name !== 'string' || !values.name.trim()) throw new Error('Nama produk wajib diisi.')
  if (!['skincare', 'makeup'].includes(values.categoryGroup ?? (values.category === 'Make Up' ? 'makeup' : 'skincare'))) throw new Error('Pilih kategori Skincare atau Make Up.')
  const dates = validateProductDates(values)
  if (values.purchaseDate) parseDateKey(values.purchaseDate, 'Tanggal pembelian')
  if (values.ingredients && (!Array.isArray(values.ingredients) || values.ingredients.some((item) => typeof item !== 'string'))) throw new Error('Kandungan produk harus berupa daftar teks.')
  if (values.usageTime && (!Array.isArray(values.usageTime) || values.usageTime.some((time) => !['morning', 'evening'].includes(time)))) throw new Error('Waktu penggunaan harus pagi atau malam.')
  return {
    user_id: userId,
    name: values.name.trim(),
    brand: values.brand?.trim() || null,
    category: legacyCategory(values.productType ?? values.category, values.categoryGroup ?? (values.category === 'Make Up' ? 'makeup' : 'skincare')),
    category_group: values.categoryGroup ?? (values.category === 'Make Up' ? 'makeup' : 'skincare'),
    product_type: values.productType || null,
    description: values.description?.trim() || null,
    usage_instructions: values.usage?.trim() || null,
    ingredients: (values.ingredients ?? []).map((item) => item.trim()).filter(Boolean),
    purchase_date: values.purchaseDate || null,
    size_label: values.size?.trim() || null,
    usage_time: values.usageTime ?? [],
    usage_frequency: values.frequency?.trim() || null,
    usage_amount: values.usageAmount?.trim() || null,
    usage_notes: values.usageNotes?.trim() || null,
    product_status: values.productStatus ?? 'in_use',
    image_path: values.imagePath || null,
    expires_on: dates.expiresOn,
    opened_on: dates.openedOn,
    pao_months: dates.paoMonths,
  }
}

function updatePayload(values) {
  const payload = {}
  if ('name' in values) payload.name = values.name.trim()
  if ('brand' in values) payload.brand = values.brand.trim() || null
  if ('category' in values) payload.category_group = values.category === 'Make Up' ? 'makeup' : 'skincare'
  const fullFields = {
    categoryGroup: 'category_group', productType: 'product_type', description: 'description', usage: 'usage_instructions',
    ingredients: 'ingredients', purchaseDate: 'purchase_date', size: 'size_label', usageTime: 'usage_time',
    frequency: 'usage_frequency', usageAmount: 'usage_amount', usageNotes: 'usage_notes',
    productStatus: 'product_status', imagePath: 'image_path',
  }
  for (const [field, column] of Object.entries(fullFields)) {
    if (!(field in values)) continue
    const value = values[field]
    payload[column] = Array.isArray(value) ? value.map((item) => item.trim()).filter(Boolean) : typeof value === 'string' ? value.trim() || null : value
  }
  if ('categoryGroup' in values) payload.category = legacyCategory(values.productType ?? values.category, values.categoryGroup)
  if ('productType' in values && !('categoryGroup' in values)) payload.category = legacyCategory(values.productType)
  if (['expiresOn', 'openedOn', 'paoMonths'].some((field) => field in values)) {
    const dates = validateProductDates(values)
    if ('expiresOn' in values) payload.expires_on = dates.expiresOn
    if ('openedOn' in values) payload.opened_on = dates.openedOn
    if ('paoMonths' in values) payload.pao_months = dates.paoMonths
  }
  if ('isFavorite' in values) payload.is_favorite = values.isFavorite
  return payload
}

export function createProductsApi(client) {
  async function unwrap(query) {
    const { data, error } = await query
    if (error) {
      if (/category_group/i.test(error.message ?? '') && /schema cache|column/i.test(error.message ?? '')) {
        throw new Error('Database Supabase belum memiliki kolom kategori produk baru. Migration 20261104000000_product_details_reviews.sql perlu diterapkan sebelum menyimpan detail produk.')
      }
      throw error
    }
    return data
  }
  async function uploadPhoto(userId, photo) {
    if (!photo) return null
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(photo.type) || photo.size > 5 * 1024 * 1024) throw new Error('Foto harus berupa JPG, PNG, WebP, atau GIF dengan ukuran maksimal 5 MB.')
    const path = `${userId}/${globalThis.crypto.randomUUID()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await client.storage.from('product-images').upload(path, photo, { contentType: photo.type, upsert: false })
    if (error) throw error
    return path
  }
  function removePhoto(path) {
    if (!path) return
    void client.storage.from('product-images').remove([path])
      .then(({ error }) => { if (error) console.warn('Unable to remove a product image object', error) })
      .catch((error) => console.warn('Unable to remove a product image object', error))
  }

  return {
    async list(userId) {
      const rows = await unwrap(client.from('products').select('*').eq('user_id', userId).order('expires_on', { ascending: true, nullsFirst: false }))
      return rows.map(mapProduct)
    },
    async create(userId, values, id = globalThis.crypto.randomUUID()) {
      const imagePath = await uploadPhoto(userId, values.photo)
      let row
      try { row = await unwrap(client.from('products').insert({ id, ...productPayload(values, userId), image_path: imagePath }).select('*').single()) }
      catch (error) { removePhoto(imagePath); throw error }
      return mapProduct(row)
    },
    async update(userId, productId, values) {
      if ('purchaseDate' in values && values.purchaseDate) parseDateKey(values.purchaseDate, 'Tanggal pembelian')
      if ('productStatus' in values && values.productStatus != null && !['unused', 'in_use', 'finished', 'expired'].includes(values.productStatus)) throw new Error('Status produk tidak valid.')
      if ('usageTime' in values && (!Array.isArray(values.usageTime) || values.usageTime.some((time) => !['morning', 'evening'].includes(time)))) throw new Error('Waktu penggunaan harus pagi atau malam.')
      const imagePath = values.photo ? await uploadPhoto(userId, values.photo) : undefined
      const payload = updatePayload(values)
      if (imagePath) payload.image_path = imagePath
      let row
      try { row = await unwrap(client.from('products').update(payload).eq('user_id', userId).eq('id', productId).select('*').single()) }
      catch (error) { removePhoto(imagePath); throw error }
      if (imagePath && values.previousImagePath) removePhoto(values.previousImagePath)
      return mapProduct(row)
    },
    async remove(userId, productId) {
      const existing = await unwrap(client.from('products').select('image_path').eq('user_id', userId).eq('id', productId).maybeSingle())
      await unwrap(client.from('products').delete().eq('user_id', userId).eq('id', productId))
      if (existing?.image_path) removePhoto(existing.image_path)
    },
    async getReview(userId, productId) {
      return unwrap(client.from('product_reviews').select('*').eq('user_id', userId).eq('product_id', productId).maybeSingle())
    },
    async saveReview(userId, productId, rating, review) {
      const value = Number(rating)
      if (!Number.isInteger(value) || value < 1 || value > 10) throw new Error('Rating harus berupa angka 1 sampai 10.')
      return unwrap(client.from('product_reviews').upsert({ user_id: userId, product_id: productId, rating: value, review: review?.trim() || null }, { onConflict: 'product_id,user_id' }).select('*').single())
    },
    async deleteReview(userId, productId) {
      await unwrap(client.from('product_reviews').delete().eq('user_id', userId).eq('product_id', productId))
    },
  }
}
