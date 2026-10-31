import assert from 'node:assert/strict'
import test from 'node:test'
import { createProductsApi, mapProduct, productPayload } from '../src/lib/products-api.js'

const record = {
  id: '4f9c0d1c-47ad-4d9e-a1c1-99df2d493f13', user_id: 'a1a1', name: 'Soft Cleanser', brand: 'Petal', category: 'cleanser',
  expires_on: '2027-05-01', opened_on: '2026-10-01', pao_months: 12, is_favorite: true, ingredients: ['Oat'], skin_types: ['Dry'],
  created_at: '2026-10-01T00:00:00Z', currency_code: 'IDR',
}

test('produk database dipetakan ke bentuk tampilan dan tanggal produk tetap terpisah', () => {
  const product = mapProduct(record)
  assert.equal(product.category, 'Skincare')
  assert.equal(product.productType, 'cleanser')
  assert.equal(product.expiresOn, '2027-05-01')
  assert.equal(product.openedOn, '2026-10-01')
  assert.equal(product.paoMonths, 12)
  assert.equal(product.isFavorite, true)
})

test('payload create menyimpan detail produk, ingredients, kategori grup, dan tanggal tervalidasi', () => {
  const payload = productPayload({ name: ' Cleanser ', brand: '', categoryGroup: 'makeup', productType: 'Lip tint', ingredients: ['Niacinamide', ' Ceramide '], usageTime: ['morning'], purchaseDate: '2026-10-02', expiresOn: '', size: '5 ml' }, 'user-1')
  assert.equal(payload.name, 'Cleanser')
  assert.equal(payload.brand, null)
  assert.equal(payload.category, 'other')
  assert.equal(payload.category_group, 'makeup')
  assert.deepEqual(payload.ingredients, ['Niacinamide', 'Ceramide'])
  assert.deepEqual(payload.usage_time, ['morning'])
  assert.equal(payload.purchase_date, '2026-10-02')
  assert.equal(payload.size_label, '5 ml')
  assert.equal(payload.expires_on, null)
  assert.deepEqual(productPayload({ name: 'Serum', brand: 'Petal', productType: 'serum', categoryGroup: 'skincare', expiresOn: '2027-05-01', openedOn: '2026-10-01', paoMonths: '12' }, 'user-1'), {
    user_id: 'user-1', name: 'Serum', brand: 'Petal', category: 'serum', category_group: 'skincare', product_type: 'serum', description: null, usage_instructions: null, ingredients: [], purchase_date: null, size_label: null, usage_time: [], usage_frequency: null, usage_amount: null, usage_notes: null, product_status: 'in_use', image_path: null, expires_on: '2027-05-01', opened_on: '2026-10-01', pao_months: 12,
  })
  assert.throws(() => productPayload({ name: 'Bad date', brand: '', category: 'Toner', expiresOn: '2026-02-30' }, 'user-1'), /tanggal kalender yang valid/)
  assert.throws(() => productPayload({ name: 'Bad PAO', brand: '', category: 'Toner', paoMonths: '72' }, 'user-1'), /antara 1 dan 60/)
})

test('CRUD mengunci query pada user aktif dan mengembalikan row hasil database', async () => {
  const operations = []
  const client = { from(table) {
    const entry = { table, filters: [] }; operations.push(entry)
    const builder = {
      select(columns) { entry.select = columns; return builder },
      eq(column, value) { entry.filters.push([column, value]); return builder },
      order(column, options) { entry.order = [column, options]; return builder },
      insert(payload) { entry.insert = payload; return builder },
      update(payload) { entry.update = payload; return builder },
      upsert(payload, options) { entry.upsert = payload; entry.upsertOptions = options; return builder },
      delete() { entry.delete = true; return builder },
      single() { return Promise.resolve({ data: record, error: null }) },
      maybeSingle() { return Promise.resolve({ data: { image_path: null }, error: null }) },
      then(resolve) { return Promise.resolve({ data: [record], error: null }).then(resolve) },
    }
    return builder
  } }
  const api = createProductsApi(client)
  assert.equal((await api.list('user-1'))[0].id, record.id)
  await api.create('user-1', { name: 'Cleanser', brand: 'Petal', category: 'Cleanser', expiresOn: '' })
  await api.update('user-1', record.id, { isFavorite: false, categoryGroup: 'makeup', productType: 'lip tint', ingredients: ['Mica', 'Iron oxide'], description: 'Tekstur ringan' })
  await api.remove('user-1', record.id)
  assert.deepEqual(operations[0].filters, [['user_id', 'user-1']])
  assert.equal(operations[1].insert.category, 'cleanser')
  assert.equal(operations[1].insert.category_group, 'skincare')
  assert.deepEqual(operations[1].insert.ingredients, [])
  assert.deepEqual(operations[2].filters, [['user_id', 'user-1'], ['id', record.id]])
  assert.deepEqual(operations[2].update, { is_favorite: false, category_group: 'makeup', product_type: 'lip tint', description: 'Tekstur ringan', ingredients: ['Mica', 'Iron oxide'], category: 'other' })
  assert.equal(operations[3].select, 'image_path')
  assert.deepEqual(operations[3].filters, [['user_id', 'user-1'], ['id', record.id]])
  assert.deepEqual(operations[4].filters, [['user_id', 'user-1'], ['id', record.id]])
})

test('rating tunggal divalidasi 1-10 dan di-upsert pada pasangan produk/pemilik', async () => {
  let upsertPayload
  let conflictTarget
  const builder = {
    upsert(payload, options) { upsertPayload = payload; conflictTarget = options.onConflict; return this },
    select() { return this },
    single() { return Promise.resolve({ data: { id: 'review-1', rating: 9 }, error: null }) },
  }
  const api = createProductsApi({ from: () => builder })
  await api.saveReview('user-1', record.id, 9, 'Nyaman digunakan')
  assert.deepEqual(upsertPayload, { user_id: 'user-1', product_id: record.id, rating: 9, review: 'Nyaman digunakan' })
  assert.equal(conflictTarget, 'product_id,user_id')
  await assert.rejects(api.saveReview('user-1', record.id, 11, ''), /1 sampai 10/)
})

test('CRUD meneruskan error database agar halaman dapat menampilkannya', async () => {
  const query = {
    select() { return this },
    eq() { return this },
    order() { return Promise.resolve({ data: null, error: new Error('RLS rejected') }) },
  }
  const client = { from: () => query }
  await assert.rejects(createProductsApi(client).list('user-1'), /RLS rejected/)
})
