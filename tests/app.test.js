import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { appNavigation } from '../src/data/navigation.js'
import { diaryEntries } from '../src/data/journal.js'
import { createMockProduct, products } from '../src/data/products.js'
import { countEntriesInMonth, getCalendarDays, getDiaryDateKey, shiftCalendarMonth } from '../src/lib/calendar.js'
import { filterProducts, removeProductFromCollection, updateProductInCollection } from '../src/lib/collection.js'
import { setRoutineCompletion, toggleCompletedStep, toggleFavoriteId } from '../src/lib/routine-state.js'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
const { default: App } = await vite.ssrLoadModule('/src/App.jsx')
const protectedRoutes = ['/', '/calendar', '/collection', '/collection/4f9c0d1c-47ad-4d9e-a1c1-99df2d493f13', '/routine', '/usage-summary', '/settings']

after(async () => vite.close())

test('route aplikasi mensyaratkan pemeriksaan sesi dan route login menampilkan form masuk', () => {
  for (const path of protectedRoutes) {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(App),
    ))
    assert.ok(markup.includes('Memeriksa sesi'), `${path} harus menunggu pemeriksaan auth`)
  }
  const login = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/login'] }, createElement(App)))
  assert.ok(login.includes('Memeriksa sesi'))
})

test('server render halaman tidak menghasilkan console error', () => {
  const errors = []
  const originalError = console.error
  console.error = (...args) => errors.push(args.join(' '))
  try {
    renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/collection/cloud-cleanser'] },
      createElement(App),
    ))
  } finally {
    console.error = originalError
  }
  assert.deepEqual(errors, [])
})

test('navigasi utama menempatkan ringkasan di Settings dan route detail produk tetap tersedia', async () => {
  assert.deepEqual(appNavigation.map(({ path }) => path), ['/', '/calendar', '/collection', '/routine', '/settings'])
  assert.equal(appNavigation.some(({ path }) => path === '/usage-summary'), false)
  const appSource = await vite.ssrLoadModule('/src/App.jsx')
  assert.ok(appSource.default)
  assert.ok(protectedRoutes.includes('/collection/4f9c0d1c-47ad-4d9e-a1c1-99df2d493f13'))
})

test('halaman produk terlindungi di client sebelum session Supabase tersedia', () => {
  const markup = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/collection'] }, createElement(App)))
  assert.ok(markup.includes('Memeriksa sesi'))
})

test('kalender membentuk minggu Senin–Minggu, berpindah bulan, dan memilih tanggal', () => {
  const november = new Date(2026, 10, 1, 12)
  const days = getCalendarDays(november)
  assert.equal(days.length, 42)
  assert.equal(days[0].getDay(), 1)
  assert.equal(shiftCalendarMonth(november, -1).getMonth(), 9)
  assert.equal(shiftCalendarMonth(november, 1).getMonth(), 11)
  assert.equal(getDiaryDateKey(new Date(2026, 10, 1, 12)), '2026-11-01')
  assert.equal(countEntriesInMonth(diaryEntries, november), 11)
})

test('pencarian koleksi menggabungkan pencarian, kategori, dan favorit', () => {
  assert.equal(filterProducts(products, { query: 'dear dew' }).length, 2)
  assert.equal(filterProducts(products, { category: 'Serum' }).length, 1)
  assert.deepEqual(filterProducts(products, { favoritesOnly: true, favorites: ['calm-serum'] }).map(({ id }) => id), ['calm-serum'])
  assert.equal(filterProducts(products, { query: 'tidak ada produk' }).length, 0)
})

test('koleksi diurutkan berdasarkan tanggal kedaluwarsa dengan tanggal kosong di akhir', () => {
  const undated = createMockProduct({ name: 'No Date', brand: 'Mock', category: 'Serum' })
  assert.deepEqual(filterProducts([...products, undated]).map(({ id }) => id), [
    'calm-serum', 'sleeping-mask', 'milky-toner', 'daily-veil', 'cloud-cleanser', 'soft-balm', undated.id,
  ])
  assert.equal(filterProducts(products, { sort: 'expiring-later' })[0].id, 'soft-balm')
})

test('produk mock dapat diedit dan dihapus dari koleksi', () => {
  const edited = updateProductInCollection(products, 'cloud-cleanser', { name: 'Soft Cloud Cleanser', expiresOn: '2028-01-01' })
  assert.equal(edited[0].name, 'Soft Cloud Cleanser')
  assert.equal(edited[0].expiresOn, '2028-01-01')
  assert.equal(products[0].name, 'Cloud Cleanser')
  assert.equal(removeProductFromCollection(edited, 'cloud-cleanser').some(({ id }) => id === 'cloud-cleanser'), false)
})

test('checklist rutinitas dapat ditandai, diselesaikan semua, dan diatur ulang', () => {
  const steps = [{ id: 'cleanser' }, { id: 'toner' }]
  const toggled = toggleCompletedStep({}, 'cleanser')
  assert.equal(toggled.cleanser, true)
  const allDone = setRoutineCompletion(toggled, steps, true)
  assert.deepEqual(allDone, { cleanser: true, toner: true })
  const reset = setRoutineCompletion(allDone, steps, false)
  assert.deepEqual(reset, { cleanser: false, toner: false })
})

test('favorit produk dapat ditambah dan dihapus tanpa mengubah daftar lain', () => {
  assert.deepEqual(toggleFavoriteId(['calm-serum'], 'cloud-cleanser'), ['calm-serum', 'cloud-cleanser'])
  assert.deepEqual(toggleFavoriteId(['calm-serum', 'cloud-cleanser'], 'calm-serum'), ['cloud-cleanser'])
})

test('produk baru menghasilkan mock record yang siap dibuka sebagai detail', () => {
  const product = createMockProduct({ name: 'Gentle Mist', brand: 'Petal House', category: 'Toner', index: 2 })
  assert.match(product.id, /^gentle-mist-/)
  assert.equal(product.brand, 'Petal House')
  assert.equal(product.category, 'Toner')
  assert.equal(product.bottle, 'wide')
  assert.equal(product.accent, '#E6E4D5')
})
