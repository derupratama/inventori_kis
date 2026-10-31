import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { createProductsApi } from '../../lib/products-api.js'
import { supabase } from '../../lib/supabaseClient.js'
import { withTimeout } from '../../lib/async.js'

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
    setLoading(true)
    setError(null)
    try {
      const result = await withTimeout(productsApi.list(user.id), 'Koleksi memerlukan waktu terlalu lama untuk dimuat. Periksa koneksi lalu coba lagi.')
      if (version === requestVersion.current) setProducts(result)
    } catch (loadError) {
      if (version === requestVersion.current) setError(loadError.message || 'Koleksi gagal dimuat.')
    } finally { if (version === requestVersion.current) setLoading(false) }
  }, [user])

  useEffect(() => { void reload(); return () => { requestVersion.current += 1 } }, [reload])

  const create = useCallback(async (values) => {
    if (!user || !productsApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    const product = await withTimeout(productsApi.create(user.id, values), 'Penyimpanan produk terlalu lama. Periksa koneksi lalu coba lagi.')
    if (loadedUserId.current === user.id) setProducts((current) => [product, ...current])
    return product
  }, [user])
  const update = useCallback(async (productId, values) => {
    if (!user || !productsApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    const product = await withTimeout(productsApi.update(user.id, productId, values), 'Pembaruan produk terlalu lama. Periksa koneksi lalu coba lagi.')
    if (loadedUserId.current === user.id) setProducts((current) => current.map((item) => item.id === productId ? product : item))
    return product
  }, [user])
  const remove = useCallback(async (productId) => {
    if (!user || !productsApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    await withTimeout(productsApi.remove(user.id, productId), 'Penghapusan produk terlalu lama. Periksa koneksi lalu coba lagi.')
    if (loadedUserId.current === user.id) {
      setProducts((current) => current.filter((item) => item.id !== productId))
      window.dispatchEvent(new Event('diary:products-changed'))
    }
  }, [user])
  const getReview = useCallback(async (productId) => {
    if (!user || !productsApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    return productsApi.getReview(user.id, productId)
  }, [user])
  const saveReview = useCallback(async (productId, rating, review) => {
    if (!user || !productsApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    return withTimeout(productsApi.saveReview(user.id, productId, rating, review), 'Penyimpanan ulasan terlalu lama. Periksa koneksi lalu coba lagi.')
  }, [user])
  const deleteReview = useCallback(async (productId) => {
    if (!user || !productsApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    return withTimeout(productsApi.deleteReview(user.id, productId), 'Penghapusan ulasan terlalu lama. Periksa koneksi lalu coba lagi.')
  }, [user])

  const value = useMemo(() => ({ products, favorites: products.filter((item) => item.isFavorite).map((item) => item.id), loading, error, reload, create, update, remove, getReview, saveReview, deleteReview }), [products, loading, error, reload, create, update, remove, getReview, saveReview, deleteReview])
  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

export function useProducts() {
  const value = useContext(ProductsContext)
  if (!value) throw new Error('useProducts harus digunakan di dalam ProductsProvider.')
  return value
}
