import assert from 'node:assert/strict'
import test from 'node:test'
import { addCalendarMonths, getExpiryInfo, validateProductDates } from '../src/lib/expiration.js'
import { filterProducts } from '../src/lib/collection.js'

test('PAO menambah bulan kalender dan menjepit hari di akhir bulan', () => {
  assert.equal(addCalendarMonths('2024-01-31', 1), '2024-02-29')
  assert.equal(addCalendarMonths('2023-01-31', 1), '2023-02-28')
  assert.equal(addCalendarMonths('2024-03-31', 1), '2024-04-30')
  assert.equal(addCalendarMonths('2024-02-29', 12), '2025-02-28')
  assert.equal(addCalendarMonths('2000-02-29', 12), '2001-02-28')
  assert.throws(() => addCalendarMonths('9999-12-31', 1), /batas tahun/)
})

test('tanggal efektif menggunakan batas paling awal dari EXP kemasan dan PAO', () => {
  const paoFirst = getExpiryInfo({ expiresOn: '2026-03-10', openedOn: '2026-01-31', paoMonths: 1 }, '2026-02-01')
  assert.equal(paoFirst.effectiveExpiryDate, '2026-02-28')
  assert.equal(paoFirst.source, 'pao')

  const packageFirst = getExpiryInfo({ expiresOn: '2026-02-15', openedOn: '2026-01-31', paoMonths: 1 }, '2026-02-01')
  assert.equal(packageFirst.effectiveExpiryDate, '2026-02-15')
  assert.equal(packageFirst.source, 'package')
})

test('PAO tidak dimulai sebelum produk dibuka dan tanggal kosong menghasilkan status tanpa tanggal', () => {
  const unopened = getExpiryInfo({ openedOn: '', paoMonths: 6 }, '2026-11-01')
  assert.equal(unopened.effectiveExpiryDate, null)
  assert.equal(unopened.paoExpiryDate, null)
  assert.equal(unopened.status, 'no_expiry')

  const unopenedWithPackageDate = getExpiryInfo({ expiresOn: '2027-01-01', openedOn: '', paoMonths: 6 }, '2026-11-01')
  assert.equal(unopenedWithPackageDate.effectiveExpiryDate, '2027-01-01')
  assert.equal(unopenedWithPackageDate.paoExpiryDate, null)
})

test('countdown DATE tetap berdasarkan hari Asia/Jakarta di sekitar pergantian UTC', () => {
  const product = { expiresOn: '2026-11-02' }
  const beforeJakartaMidnight = getExpiryInfo(product, new Date('2026-11-01T16:59:59.999Z'))
  const atJakartaMidnight = getExpiryInfo(product, new Date('2026-11-01T17:00:00.000Z'))
  assert.equal(beforeJakartaMidnight.daysRemaining, 1)
  assert.equal(beforeJakartaMidnight.status, 'expiring_soon')
  assert.equal(atJakartaMidnight.daysRemaining, 0)
  assert.equal(atJakartaMidnight.status, 'expiring_soon')
})

test('status membedakan tanggal lewat, mendekat, aman, dan kosong', () => {
  assert.equal(getExpiryInfo({ expiresOn: '2026-10-31' }, '2026-11-01').status, 'expired')
  assert.equal(getExpiryInfo({ expiresOn: '2026-12-01' }, '2026-11-01').status, 'expiring_soon')
  assert.equal(getExpiryInfo({ expiresOn: '2027-01-01' }, '2026-11-01').status, 'active')
  assert.equal(getExpiryInfo({}, '2026-11-01').status, 'no_expiry')
})

test('koleksi dapat difilter berdasarkan status masa berlaku', () => {
  const products = [
    { id: 'expired', name: 'Expired', expiresOn: '2026-10-31' },
    { id: 'soon', name: 'Soon', expiresOn: '2026-11-10' },
    { id: 'active', name: 'Active', expiresOn: '2027-01-01' },
    { id: 'none', name: 'No date' },
  ]
  assert.deepEqual(filterProducts(products, { status: 'expired', today: '2026-11-01' }).map(({ id }) => id), ['expired'])
  assert.deepEqual(filterProducts(products, { status: 'expiring_soon', today: '2026-11-01' }).map(({ id }) => id), ['soon'])
  assert.deepEqual(filterProducts(products, { status: 'active', today: '2026-11-01' }).map(({ id }) => id), ['active'])
  assert.deepEqual(filterProducts(products, { status: 'no_expiry', today: '2026-11-01' }).map(({ id }) => id), ['none'])
})

test('koleksi dapat difilter berdasarkan status penggunaan dan kategori grup', () => {
  const products = [
    { id: 'unused', name: 'Unused', category: 'Skincare', categoryGroup: 'skincare', productStatus: 'unused' },
    { id: 'active', name: 'Active', category: 'Make Up', categoryGroup: 'makeup', productStatus: 'in_use' },
    { id: 'finished', name: 'Finished', category: 'Skincare', categoryGroup: 'skincare', productStatus: 'finished' },
  ]
  assert.deepEqual(filterProducts(products, { productStatus: 'in_use' }).map(({ id }) => id), ['active'])
  assert.deepEqual(filterProducts(products, { category: 'Skincare', productStatus: 'finished' }).map(({ id }) => id), ['finished'])
})

test('validasi tanggal dan PAO menolak tanggal kalender yang salah serta rentang bulan yang tidak sah', () => {
  assert.deepEqual(validateProductDates({ expiresOn: '2024-02-29', openedOn: '', paoMonths: '12' }), {
    expiresOn: '2024-02-29', openedOn: null, paoMonths: 12,
  })
  assert.throws(() => validateProductDates({ openedOn: '2023-02-29' }), /tanggal kalender yang valid/)
  assert.throws(() => validateProductDates({ openedOn: '1900-02-29' }), /tanggal kalender yang valid/)
  assert.throws(() => validateProductDates({ expiresOn: '2026-13-01' }), /tanggal kalender yang valid/)
  assert.throws(() => validateProductDates({ paoMonths: '0' }), /antara 1 dan 60/)
  assert.throws(() => validateProductDates({ paoMonths: '6.5' }), /bilangan bulat/)
})
