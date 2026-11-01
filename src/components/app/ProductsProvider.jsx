import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { createProductsApi, mapProduct, productPayload } from '../../lib/products-api.js'
import { supabase } from '../../lib/supabaseClient.js'
import { withTimeout } from '../../lib/async.js'
import { enqueueOfflineChange, pendingOfflineChanges, readSnapshot, removeOfflineChange, writeSnapshot } from '../../lib/offline-store.js'

const ProductsContext = createContext(null)
const productsApi = supabase ? createProductsApi(supabase) : null

export function ProductsProvider({ children }) {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(Boolean(user))
  const [error, setError] = useState(null)
  const requestVersion = useRef(0)
  const loadedUserId = useRef(null)

  const reload = useCallback(async () => {
    const version = ++requestVersion.current
    if (loadedUserId.current !== (user?.id ?? null)) {
      loadedUserId.current = user?.id ?? null
      setProducts([]); setError(null)
    }
    if (!user) { setProducts([]); setLoading(false); setError(null); return }
    if (!productsApi) { setError('Supabase belum dikonfigurasi.'); setLoading(false); return }
    let hasSnapshot = false
    try {
      const cached = await readSnapshot(user.id, 'products')
      if (version !== requestVersion.current) return
      if (cached) { setProducts(cached); hasSnapshot = true }
    } catch { /* Cache is an enhancement; continue with the server request. */ }
    if (!navigator.onLine) { setLoading(false); setError(hasSnapshot ? '' : 'Belum ada data tersimpan di perangkat. Buka aplikasi saat online untuk menyiapkan data offline.'); return }
    setLoading(!hasSnapshot)
    setError(null)
    try {
      const result = await withTimeout(productsApi.list(user.id), 'Koleksi memerlukan waktu terlalu lama untuk dimuat. Periksa koneksi lalu coba lagi.')
      if (version === requestVersion.current) { setProducts(result); void writeSnapshot(user.id, 'products', result) }
    } catch (loadError) {
      if (version === requestVersion.current) setError(loadError.message || 'Koleksi gagal dimuat.')
    } finally { if (version === requestVersion.current) setLoading(false) }
  }, [user])

  useEffect(() => { void reload(); return () => { requestVersion.current += 1 } }, [reload])

  const syncPending = useCallback(async () => {
    if (!user || !productsApi || !navigator.onLine) return
    const queue = await pendingOfflineChanges(user.id)
    for (const entry of queue) {
      if (entry.type === 'product:create') await productsApi.create(user.id, entry.payload.values, entry.payload.id)
      else if (entry.type === 'product:update') await productsApi.update(user.id, entry.payload.id, entry.payload.values)
      else if (entry.type === 'product:remove') await productsApi.remove(user.id, entry.payload.id)
      else if (entry.type === 'product:review') await productsApi.saveReview(user.id, entry.payload.productId, entry.payload.rating, entry.payload.review)
      else if (entry.type === 'product:review-remove') await productsApi.deleteReview(user.id, entry.payload.productId)
      else continue
      await removeOfflineChange(entry.id)
    }
    if (queue.length) { window.dispatchEvent(new Event('diary:offline-queue-changed')); await reload() }
  }, [user, reload])
  useEffect(() => {
    const sync = () => { void syncPending().catch((syncError) => console.warn('Offline product sync paused', syncError)) }
    window.addEventListener('online', sync); window.addEventListener('diary:sync-offline', sync)
    sync()
    return () => { window.removeEventListener('online', sync); window.removeEventListener('diary:sync-offline', sync) }
  }, [syncPending])

  const create = useCallback(async (values) => {
    if (!user || !productsApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    let product
    try { product = await withTimeout(productsApi.create(user.id, values), 'Penyimpanan produk terlalu lama. Periksa koneksi lalu coba lagi.') }
    catch (error) {
      if (navigator.onLine) throw error
      const id = crypto.randomUUID()
      product = mapProduct({ id, ...productPayload(values, user.id), created_at: new Date().toISOString(), is_favorite: false })
      await enqueueOfflineChange(user.id, 'product:create', { id, values })
      window.dispatchEvent(new Event('diary:offline-queue-changed'))
    }
    if (loadedUserId.current === user.id) setProducts((current) => { const next = [product, ...current]; void writeSnapshot(user.id, 'products', next); return next })
    return product
  }, [user])
  const update = useCallback(async (productId, values) => {
    if (!user || !productsApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    let product
    try { product = await withTimeout(productsApi.update(user.id, productId, values), 'Pembaruan produk terlalu lama. Periksa koneksi lalu coba lagi.') }
    catch (error) {
      if (navigator.onLine) throw error
      const current = products.find((item) => item.id === productId)
      if (!current) throw error
      const fields = { name: 'name', brand: 'brand', productType: 'productType', categoryGroup: 'categoryGroup', usage: 'usage', description: 'description', ingredients: 'ingredients', usageTime: 'usageTime', usageFrequency: 'frequency', usageAmount: 'usageAmount', usageNotes: 'usageNotes', productStatus: 'productStatus', expiresOn: 'expiresOn', openedOn: 'openedOn', paoMonths: 'paoMonths', isFavorite: 'isFavorite' }
      product = { ...current, ...Object.fromEntries(Object.entries(values).map(([key, value]) => [fields[key] || key, value])) }
      await enqueueOfflineChange(user.id, 'product:update', { id: productId, values })
      window.dispatchEvent(new Event('diary:offline-queue-changed'))
    }
    if (loadedUserId.current === user.id) setProducts((current) => { const next = current.map((item) => item.id === productId ? product : item); void writeSnapshot(user.id, 'products', next); return next })
    return product
  }, [user])
  const remove = useCallback(async (productId) => {
    if (!user || !productsApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    try { await withTimeout(productsApi.remove(user.id, productId), 'Penghapusan produk terlalu lama. Periksa koneksi lalu coba lagi.') }
    catch (error) {
      if (navigator.onLine) throw error
      await enqueueOfflineChange(user.id, 'product:remove', { id: productId })
      window.dispatchEvent(new Event('diary:offline-queue-changed'))
    }
    if (loadedUserId.current === user.id) {
      setProducts((current) => { const next = current.filter((item) => item.id !== productId); void writeSnapshot(user.id, 'products', next); return next })
      window.dispatchEvent(new Event('diary:products-changed'))
    }
  }, [user])
  const getReview = useCallback(async (productId) => {
    if (!user || !productsApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    return productsApi.getReview(user.id, productId)
  }, [user])
  const saveReview = useCallback(async (productId, rating, review) => {
    if (!user || !productsApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    try { return await withTimeout(productsApi.saveReview(user.id, productId, rating, review), 'Penyimpanan ulasan terlalu lama. Periksa koneksi lalu coba lagi.') }
    catch (error) {
      if (navigator.onLine) throw error
      const row = { user_id: user.id, product_id: productId, rating: Number(rating), review: review?.trim() || null }
      await enqueueOfflineChange(user.id, 'product:review', { productId, rating: row.rating, review: row.review })
      window.dispatchEvent(new Event('diary:offline-queue-changed'))
      return row
    }
  }, [user])
  const deleteReview = useCallback(async (productId) => {
    if (!user || !productsApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    try { return await withTimeout(productsApi.deleteReview(user.id, productId), 'Penghapusan ulasan terlalu lama. Periksa koneksi lalu coba lagi.') }
    catch (error) {
      if (navigator.onLine) throw error
      await enqueueOfflineChange(user.id, 'product:review-remove', { productId })
      window.dispatchEvent(new Event('diary:offline-queue-changed'))
    }
  }, [user])

  const value = useMemo(() => ({ products, favorites: products.filter((item) => item.isFavorite).map((item) => item.id), loading, error, reload, create, update, remove, getReview, saveReview, deleteReview }), [products, loading, error, reload, create, update, remove, getReview, saveReview, deleteReview])
  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

export function useProducts() {
  const value = useContext(ProductsContext)
  if (!value) throw new Error('useProducts harus digunakan di dalam ProductsProvider.')
  return value
}
