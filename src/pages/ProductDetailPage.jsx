import { motion } from 'motion/react'
import { ArrowRight, CalendarDays, Check, Clock3, Heart, Leaf, PackageCheck, Pencil, Star, Trash2 } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Badge, Button, Card } from '../components/index.js'
import { PageHeading } from '../components/app/PageHeading.jsx'
import { ConfirmationDialog } from '../components/app/ConfirmationDialog.jsx'
import { ProductArtwork } from '../components/app/ProductArtwork.jsx'
import { ProductCard } from '../components/app/ProductCard.jsx'
import { ProductEditorModal } from '../components/app/ProductEditorModal.jsx'
import { SectionTitle } from '../components/app/SectionTitle.jsx'
import { useProducts } from '../components/app/ProductsProvider.jsx'
import { useToast } from '../components/index.js'
import { getExpiryInfo, expiryStatusLabels } from '../lib/expiration.js'
import { diaryDateLabel } from '../lib/diary-date.js'
import { routineFrequencyForProduct } from '../lib/routine-schedule.js'
import { useRoutineCalendar } from '../components/app/RoutineCalendarProvider.jsx'

export default function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { products, favorites, update, remove, loading, error, reload, getReview, saveReview, deleteReview } = useProducts()
  const { showToast } = useToast()
  const { routines, items: routineItems } = useRoutineCalendar()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [review, setReview] = useState(null)
  const [ratingDraft, setRatingDraft] = useState(8)
  const [reviewDraft, setReviewDraft] = useState('')
  const [reviewLoading, setReviewLoading] = useState(true)
  const [reviewSaving, setReviewSaving] = useState(false)
  const product = products.find((item) => item.id === productId)
  const isFavorite = favorites.includes(productId)
  const relatedProducts = products.filter((item) => item.id !== productId && item.category === product?.category).slice(0, 3)
  const scheduledFrequency = product ? routineFrequencyForProduct(product.id, routines, routineItems) : ''

  useEffect(() => {
    let active = true
    if (!productId || loading) return () => { active = false }
    setReview(null); setReviewDraft(''); setRatingDraft(8)
    setReviewLoading(true)
    getReview(productId).then((row) => {
      if (!active) return
      setReview(row); setRatingDraft(row?.rating ?? 8); setReviewDraft(row?.review ?? '')
    }).catch((failure) => { if (active) showToast(failure.message || 'Ulasan belum dapat dimuat.', { tone: 'error' }) })
      .finally(() => { if (active) setReviewLoading(false) })
    return () => { active = false }
  }, [productId, loading, getReview, showToast])

  if (loading) return <main className="page-content" role="status">Memuat detail produk…</main>
  if (error) return <main className="page-content"><Card className="empty-card"><h2>Detail produk belum dapat dimuat.</h2><p role="alert">{error}</p><Button variant="outline" onClick={() => void reload()}>Coba lagi</Button></Card></main>
  if (!product) return <Navigate to="/collection" replace />

  const expiry = getExpiryInfo(product)
  const expiryCountdown = expiry.daysRemaining == null ? 'Belum ada tanggal kedaluwarsa efektif' : expiry.daysRemaining < 0 ? `Kedaluwarsa ${Math.abs(expiry.daysRemaining)} hari lalu` : expiry.daysRemaining === 0 ? 'Kedaluwarsa hari ini' : `Kedaluwarsa dalam ${expiry.daysRemaining} hari`
  const expiryTone = expiry.status === 'expired' ? 'rose' : expiry.status === 'expiring_soon' ? 'cream' : expiry.status === 'active' ? 'muted' : 'neutral'
  const dateLabel = (date) => date ? diaryDateLabel(date, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum dicatat'

  function handleFavorite() {
    void update(productId, { isFavorite: !isFavorite }).then(() => showToast(isFavorite ? 'Produk dihapus dari favorit.' : 'Produk disimpan ke favorit.')).catch((error) => showToast(error.message || 'Favorit gagal diperbarui.', { tone: 'error' }))
  }

  async function handleSave(values) {
    try {
      await update(productId, { ...values, previousImagePath: product.imagePath })
      setEditOpen(false)
      showToast(`${values.name} berhasil diperbarui.`)
    } catch (error) { showToast(error.message || 'Produk gagal diperbarui.', { tone: 'error' }) }
  }

  async function handleSaveReview(event) {
    event.preventDefault(); setReviewSaving(true)
    try {
      const saved = await saveReview(productId, ratingDraft, reviewDraft)
      setReview(saved); showToast('Rating dan pengalamanmu tersimpan.')
    } catch (failure) { showToast(failure.message || 'Ulasan gagal disimpan.', { tone: 'error' }) }
    finally { setReviewSaving(false) }
  }

  async function handleDeleteReview() {
    setReviewSaving(true)
    try { await deleteReview(productId); setReview(null); setReviewDraft(''); setRatingDraft(8); showToast('Ulasan dihapus.') }
    catch (failure) { showToast(failure.message || 'Ulasan gagal dihapus.', { tone: 'error' }) }
    finally { setReviewSaving(false) }
  }

  async function handleDelete() {
    try { await remove(productId) } catch (error) { showToast(error.message || 'Produk gagal dihapus.', { tone: 'error' }); return }
    setConfirmDelete(false)
    showToast(`${product.name} dihapus dari koleksi.`, { tone: 'info' })
    navigate('/collection')
  }

  return (
    <main className="page-content">
      <PageHeading eyebrow={product.brand} title={product.name} description={`${product.category} · ${product.size}`} backTo="/collection" backLabel="Kembali ke koleksi" action={<div className="product-detail-actions"><Button variant="outline" size="sm" leadingIcon={<Pencil size={14} />} onClick={() => setEditOpen(true)}>Edit</Button><Button variant="outline" size="icon" aria-label="Hapus produk" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /></Button><Button variant={isFavorite ? 'secondary' : 'outline'} size="sm" leadingIcon={<Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />} aria-pressed={isFavorite} onClick={handleFavorite}>{isFavorite ? 'Favorit' : 'Simpan'}</Button></div>} />

      <div className="product-detail-layout">
        <motion.div className="product-detail-art-wrap" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .25 }}>
          <ProductArtwork product={product} className="product-art--detail" />
          <Badge tone="cream" dot>Bagian dari koleksimu</Badge>
        </motion.div>
        <div className="product-detail-info">
          <Card className="product-info-card">
            <div className="product-info-card__top"><span className="product-brand">{product.brand || 'Brand belum dicatat'}</span><span className="product-rating"><Star size={15} fill="currentColor" aria-hidden="true" /> {review ? `${review.rating}/10` : 'Belum dinilai'} <small>{review ? 'rating kamu' : ''}</small></span></div>
            <h2>{product.name}</h2><p className="product-info-card__description">{product.description}</p>
            <div className="product-detail-expiry"><Badge tone={expiryTone} dot>{expiryStatusLabels[expiry.status]}</Badge><strong>{expiryCountdown}</strong></div>
            <div className="product-detail-quickfacts"><span><PackageCheck size={16} /> {product.size}</span><span><Leaf size={16} /> {product.category} · {product.productType}</span><span><CalendarDays size={16} /> Dibeli: {dateLabel(product.purchaseDate)}</span><span><CalendarDays size={16} /> EXP kemasan: {dateLabel(product.expiresOn)}</span><span><CalendarDays size={16} /> Dibuka: {dateLabel(product.openedOn)}</span><span><Clock3 size={16} /> PAO: {product.paoMonths ? `${product.paoMonths} bulan` : 'Belum dicatat'}</span><span><CalendarDays size={16} /> Kedaluwarsa efektif: {dateLabel(expiry.effectiveExpiryDate)}{expiry.source === 'pao' ? ' (PAO)' : expiry.source === 'package' ? ' (kemasan)' : ''}</span><span><Check size={16} /> Status: {({ unused: 'Belum digunakan', in_use: 'Sedang digunakan', finished: 'Habis', expired: 'Kedaluwarsa' })[product.productStatus]}</span></div>
            <div className="product-info-card__price">{product.price}</div>
            <Button className="product-routine-button" as={Link} to="/routine" trailingIcon={<ArrowRight size={16} />}>Lihat dalam rutinitas</Button>
          </Card>
          <Card className="product-detail-section">
            <div className="product-detail-section__title"><span className="product-detail-section__icon"><SparkleIcon /></span><div><h3>Cara penggunaan</h3><p>Ritual sederhana untuk kulitmu</p></div></div>
            <p className="product-detail-section__body">{product.usage}</p>
            {product.usageTime?.length > 0 && <p className="product-detail-section__body">Waktu: {product.usageTime.includes('morning') ? 'Pagi' : ''}{product.usageTime.includes('morning') && product.usageTime.includes('evening') ? ' dan ' : ''}{product.usageTime.includes('evening') ? 'Malam' : ''}</p>}
            {product.usageAmount && <p className="product-detail-section__body">Takaran: {product.usageAmount}</p>}
            {product.usageNotes && <p className="product-detail-section__body">Catatan: {product.usageNotes}</p>}
            <div className="product-detail-frequency"><Clock3 size={15} aria-hidden="true" /> Frekuensi <strong>{scheduledFrequency || product.frequency}</strong>{scheduledFrequency && <small>Dari jadwal Daily Routine</small>}</div>
          </Card>
          <Card className="product-detail-section product-review-card">
            <div className="product-detail-section__title"><span className="product-detail-section__icon"><Star size={17} /></span><div><h3>Rating dan pengalamanmu</h3><p>Catatan pribadi untuk produk ini</p></div></div>
            {reviewLoading ? <p role="status">Memuat ulasan…</p> : <form onSubmit={handleSaveReview} className="product-review-form">
              <label htmlFor="product-rating">Rating: <strong>{ratingDraft}/10</strong></label>
              <input id="product-rating" type="range" min="1" max="10" step="1" value={ratingDraft} onChange={(event) => setRatingDraft(Number(event.target.value))} />
              <label htmlFor="product-review">Pengalaman setelah menggunakan</label>
              <textarea id="product-review" rows="4" maxLength={5000} value={reviewDraft} onChange={(event) => setReviewDraft(event.target.value)} placeholder="Apa yang terasa nyaman atau ingin kamu ingat?" />
              <div className="product-review-form__actions"><Button type="submit" loading={reviewSaving}>{review ? 'Perbarui ulasan' : 'Simpan ulasan'}</Button>{review && <Button type="button" variant="outline" disabled={reviewSaving} onClick={handleDeleteReview}>Hapus ulasan</Button>}</div>
              {review && <p className="product-review-form__saved">Tersimpan sebagai satu ulasan pribadimu.</p>}
            </form>}
          </Card>
          <Card className="product-detail-section">
            <div className="product-detail-section__title"><span className="product-detail-section__icon"><Check size={17} /></span><div><h3>Kandungan pilihan</h3><p>Informasi dari catatan produk</p></div></div>
            {product.ingredients.length ? <div className="ingredient-list">{product.ingredients.map((ingredient) => <Badge key={ingredient} tone="rose">{ingredient}</Badge>)}</div> : <p className="product-detail-section__body">Belum ada kandungan yang dicatat.</p>}
          </Card>
        </div>
      </div>

      {relatedProducts.length > 0 && <section className="dashboard-block related-products"><SectionTitle title="Produk serupa di koleksimu" description="Lihat lagi yang kamu simpan." /><div className="product-grid product-grid--dashboard">{relatedProducts.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}

      <ProductEditorModal open={editOpen} onClose={() => setEditOpen(false)} onSave={handleSave} product={product} routineFrequency={scheduledFrequency} />
      <ConfirmationDialog open={confirmDelete} onCancel={() => setConfirmDelete(false)} onConfirm={handleDelete} title="Hapus produk ini?" description={`${product.name} akan dihapus dari koleksimu.`} confirmLabel="Hapus produk" />
    </main>
  )
}

function SparkleIcon() {
  return <span aria-hidden="true">✧</span>
}
