import { motion } from 'motion/react'
import { Heart, PackageOpen, Plus, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Card, Input, LoadingSkeleton, useToast } from '../components/index.js'
import { PageHeading } from '../components/app/PageHeading.jsx'
import { ProductCard } from '../components/app/ProductCard.jsx'
import { ProductEditorModal } from '../components/app/ProductEditorModal.jsx'
import { useProducts } from '../components/app/ProductsProvider.jsx'
import { productCategories } from '../data/products.js'
import { filterProducts } from '../lib/collection.js'
import { useSearchParams } from 'react-router-dom'

const sortLabels = [
  { value: 'expiring-soon', label: 'Kedaluwarsa terdekat' },
  { value: 'expiring-later', label: 'Kedaluwarsa terjauh' },
]
const statusLabels = [
  { value: 'all', label: 'Semua status' },
  { value: 'expired', label: 'Kedaluwarsa' },
  { value: 'expiring_soon', label: 'Segera kedaluwarsa' },
  { value: 'active', label: 'Masih aman' },
  { value: 'no_expiry', label: 'Tanggal belum dicatat' },
]
const productStatusLabels = [{ value: 'all', label: 'Semua status produk' }, { value: 'unused', label: 'Belum digunakan' }, { value: 'in_use', label: 'Sedang digunakan' }, { value: 'finished', label: 'Habis' }, { value: 'expired', label: 'Kedaluwarsa' }]

export default function CollectionPage() {
  const { products, favorites, loading, error, create, reload } = useProducts()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [searchParams] = useSearchParams()
  const [category, setCategory] = useState(searchParams.get('category') || 'Semua produk')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [status, setStatus] = useState('all')
  const [productStatus, setProductStatus] = useState(searchParams.get('productStatus') || 'all')
  const [sort, setSort] = useState('expiring-soon')
  const [editorOpen, setEditorOpen] = useState(false)
  const [isFiltering, setIsFiltering] = useState(false)
  const [saveError, setSaveError] = useState('')
  const loadingTimer = useRef(null)

  useEffect(() => () => window.clearTimeout(loadingTimer.current), [])

  const visibleProducts = useMemo(() => filterProducts(products, { query, category, favoritesOnly, favorites, status, productStatus, sort }), [products, query, category, favoritesOnly, favorites, status, productStatus, sort])

  function showFilterLoading() {
    setIsFiltering(true)
    window.clearTimeout(loadingTimer.current)
    loadingTimer.current = window.setTimeout(() => setIsFiltering(false), 220)
  }

  async function saveProduct(values) {
    setSaveError('')
    try {
      const product = await create(values)
      setCategory('Semua produk')
      setFavoritesOnly(false)
      setQuery('')
      setEditorOpen(false)
      showToast(`${product.name} sudah ditambahkan ke koleksimu.`)
    } catch (saveFailure) {
      setSaveError(saveFailure.message || 'Produk gagal disimpan.')
      showToast(saveFailure.message || 'Produk gagal disimpan.', { tone: 'error' })
    }
  }

  return (
    <main className="page-content">
      <PageHeading eyebrow="Ruang produk kesayangan" title="My Collection" description="Semua yang menemani ritual kecilmu, tersimpan di satu tempat." action={<Button leadingIcon={<Plus size={16} />} onClick={() => setEditorOpen(true)}>Tambah produk</Button>} />

      <Card className="collection-summary">
        <span className="collection-summary__icon"><PackageOpen size={20} aria-hidden="true" /></span>
        <div className="collection-summary__copy"><strong>{products.length} produk dalam koleksi</strong><span>Kenali apa yang paling nyaman untuk kulitmu.</span></div>
        <Badge tone="cream" dot>{favorites.length} favorit</Badge>
        <span className="collection-summary__flower" aria-hidden="true">✿</span>
      </Card>

      <section className="collection-controls" aria-label="Filter koleksi">
        <div className="collection-controls__search"><Input label="Cari produk" aria-label="Cari produk" placeholder="Nama produk atau brand..." leadingIcon={<Search size={16} />} value={query} onChange={(event) => { setQuery(event.target.value); showFilterLoading() }} /></div>
        <Button variant={favoritesOnly ? 'secondary' : 'outline'} leadingIcon={<Heart size={15} fill={favoritesOnly ? 'currentColor' : 'none'} />} onClick={() => { setFavoritesOnly((current) => !current); showFilterLoading() }} aria-pressed={favoritesOnly}>Favorit</Button>
      </section>

      <div className="category-tabs" role="group" aria-label="Filter kategori produk">
        {productCategories.map((item) => <button key={item} type="button" className={`category-tab ${category === item ? 'category-tab--active' : ''}`} onClick={() => { setCategory(item); showFilterLoading() }} aria-pressed={category === item}>{item}</button>)}
      </div>

      <div className="collection-results">
        <span>{isFiltering ? 'Memperbarui koleksi…' : `${visibleProducts.length} produk`}</span>
        <div className="collection-filters-extra">
          <label className="collection-sort"><span>Status produk</span><select aria-label="Filter status produk" value={productStatus} onChange={(event) => setProductStatus(event.target.value)}>{productStatusLabels.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="collection-sort"><span>Status</span><select aria-label="Filter status kedaluwarsa" value={status} onChange={(event) => setStatus(event.target.value)}>{statusLabels.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="collection-sort"><SlidersHorizontal size={14} aria-hidden="true" /><span>Urutkan</span><select aria-label="Urutkan produk berdasarkan tanggal kedaluwarsa efektif" value={sort} onChange={(event) => setSort(event.target.value)}>{sortLabels.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
      </div>

      {loading ? (
        <div className="product-grid product-grid--loading" aria-label="Produk sedang dimuat" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <LoadingSkeleton variant="card" key={index} />)}</div>
      ) : error ? (
        <Card className="empty-card collection-empty"><h2>Koleksi belum dapat dimuat.</h2><p role="alert">{error}</p><Button variant="outline" onClick={() => void reload()}>Coba lagi</Button></Card>
      ) : visibleProducts.length ? (
        <motion.div layout className="product-grid">
          {visibleProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </motion.div>
      ) : (
        <Card className="empty-card collection-empty"><span className="empty-card__icon"><Sparkles size={21} /></span><h2>Belum ada yang cocok.</h2><p>Coba kata kunci atau kategori lain, atau mulai koleksi baru.</p><Button variant="outline" onClick={() => { setQuery(''); setCategory('Semua produk'); setFavoritesOnly(false); setStatus('all'); setProductStatus('all'); showFilterLoading() }}>Hapus filter</Button></Card>
      )}

      {saveError && <p className="auth-message auth-message--error" role="alert">{saveError}</p>}
      <ProductEditorModal open={editorOpen} onClose={() => { setEditorOpen(false); setSaveError('') }} onSave={saveProduct} />
    </main>
  )
}
