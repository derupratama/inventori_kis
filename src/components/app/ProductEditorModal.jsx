import { useEffect, useState } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Input, Modal } from '../index.js'

const emptyForm = { name: '', brand: '', categoryGroup: 'skincare', productType: '', description: '', usage: '', usageTime: [], frequency: '', usageAmount: '', usageNotes: '', ingredients: [], purchaseDate: '', openedOn: '', expiresOn: '', paoMonths: '', size: '', productStatus: 'in_use' }

export function ProductEditorModal({ open, onClose, onSave, product, routineFrequency = '' }) {
  const [form, setForm] = useState(emptyForm)
  const [ingredientDraft, setIngredientDraft] = useState('')
  const [photo, setPhoto] = useState(null)
  const [validation, setValidation] = useState('')
  const editing = Boolean(product)
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!open) return
    setForm({ ...emptyForm, ...product, categoryGroup: product?.categoryGroup ?? 'skincare', usageTime: product?.usageTime ?? [], ingredients: product?.ingredients ?? [] })
    setPhoto(null); setIngredientDraft(''); setValidation('')
  }, [open, product])

  function addIngredient() {
    const value = ingredientDraft.trim()
    if (!value) return
    if (form.ingredients.some((item) => item.toLowerCase() === value.toLowerCase())) { setValidation('Kandungan tersebut sudah ada.'); return }
    set('ingredients', [...form.ingredients, value]); setIngredientDraft(''); setValidation('')
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) { setValidation('Nama produk wajib diisi.'); return }
    if (photo && !photo.type.startsWith('image/')) { setValidation('Pilih file gambar yang valid.'); return }
    if (photo && photo.size > 5 * 1024 * 1024) { setValidation('Ukuran foto maksimal 5 MB.'); return }
    setValidation('')
    await onSave({ ...form, photo, paoMonths: form.paoMonths || '' })
  }

  return <Modal open={open} onClose={onClose} title={editing ? 'Edit produk' : 'Tambah produk'} description="Catat detail produk agar koleksi dan rutinitasmu mudah dikelola." className="product-editor-modal"
    footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="product-editor-form" leadingIcon={editing ? <Save size={15} /> : <Plus size={15} />}>{editing ? 'Simpan perubahan' : 'Tambah ke koleksi'}</Button></>}>
    <form id="product-editor-form" className="product-form" onSubmit={submit}>
      <h3>Informasi produk</h3>
      <Input label="Nama produk" placeholder="Contoh: Gentle Cream Cleanser" value={form.name} onChange={(e) => set('name', e.target.value)} required autoFocus />
      <Input label="Brand atau merek" placeholder="Nama brand (opsional)" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
      <div className="product-form__row"><label className="field"><span className="field__label">Kategori</span><select value={form.categoryGroup} onChange={(e) => set('categoryGroup', e.target.value)}><option value="skincare">Skincare</option><option value="makeup">Make Up</option></select></label><Input label="Jenis produk" placeholder="Serum, lip tint, foundation..." value={form.productType} onChange={(e) => set('productType', e.target.value)} /></div>
      <Input label="Foto produk" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} hint={product?.imagePath ? 'Pilih foto baru jika ingin mengganti foto saat ini.' : 'Opsional, PNG/JPG/WebP/GIF maksimal 5 MB.'} />
      <label className="field"><span className="field__label">Deskripsi</span><textarea rows="3" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Catatan singkat tentang produk" /></label>

      <h3>Informasi penggunaan</h3>
      <label className="field"><span className="field__label">Petunjuk penggunaan</span><textarea rows="3" value={form.usage} onChange={(e) => set('usage', e.target.value)} placeholder="Bagaimana dan kapan produk digunakan" /></label>
      <fieldset className="product-form__times"><legend>Waktu penggunaan</legend>{[['morning', 'Pagi'], ['evening', 'Malam']].map(([key, label]) => <label key={key}><input type="checkbox" checked={form.usageTime.includes(key)} onChange={(e) => set('usageTime', e.target.checked ? [...form.usageTime, key] : form.usageTime.filter((value) => value !== key))} />{label}</label>)}</fieldset>
      <div className="product-form__row">{routineFrequency ? <div className="product-frequency-sync"><span>Frekuensi dari Daily Routine</span><strong>{routineFrequency}</strong><Link to="/routine" onClick={onClose}>Atur hari di Daily Routine</Link></div> : <Input label="Frekuensi penggunaan" placeholder="Contoh: setiap hari, 2–3 kali seminggu" value={form.frequency} onChange={(e) => set('frequency', e.target.value)} />}<Input label="Jumlah/takaran" placeholder="2-3 tetes, secukupnya" value={form.usageAmount} onChange={(e) => set('usageAmount', e.target.value)} /></div>
      <Input label="Catatan penggunaan" placeholder="Catatan khusus" value={form.usageNotes} onChange={(e) => set('usageNotes', e.target.value)} />

      <h3>Kandungan</h3>
      <div className="ingredient-editor"><div className="ingredient-editor__input"><Input aria-label="Kandungan baru" placeholder="Contoh: Niacinamide" value={ingredientDraft} onChange={(e) => setIngredientDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient() } }} /><Button type="button" variant="outline" size="sm" onClick={addIngredient} leadingIcon={<Plus size={14} />}>Tambah</Button></div>
        <div className="ingredient-editor__items">{form.ingredients.map((item, index) => <span className="ingredient-editor__item" key={`${item}-${index}`}><input aria-label={`Edit kandungan ${item}`} value={item} onChange={(e) => set('ingredients', form.ingredients.map((value, itemIndex) => itemIndex === index ? e.target.value : value))} /><button type="button" aria-label={`Hapus kandungan ${item}`} onClick={() => set('ingredients', form.ingredients.filter((_, itemIndex) => itemIndex !== index))}><X size={13} /></button></span>)}</div></div>

      <h3>Masa berlaku dan status</h3>
      <div className="product-form__row"><Input label="Tanggal pembelian" type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} /><Input label="Tanggal mulai digunakan" type="date" value={form.openedOn} onChange={(e) => set('openedOn', e.target.value)} /></div>
      <div className="product-form__row"><Input label="Tanggal kedaluwarsa kemasan" type="date" value={form.expiresOn} onChange={(e) => set('expiresOn', e.target.value)} /><Input label="PAO (bulan)" type="number" min="1" max="60" value={form.paoMonths} onChange={(e) => set('paoMonths', e.target.value)} hint="Masa pakai setelah dibuka, jika tercantum." /></div>
      <div className="product-form__row"><Input label="Ukuran atau volume" placeholder="30 ml, 15 g" value={form.size === 'Ukuran belum dicatat' ? '' : form.size} onChange={(e) => set('size', e.target.value)} /><label className="field"><span className="field__label">Status produk</span><select value={form.productStatus} onChange={(e) => set('productStatus', e.target.value)}><option value="unused">Belum digunakan</option><option value="in_use">Sedang digunakan</option><option value="finished">Habis</option><option value="expired">Kedaluwarsa</option></select></label></div>
      {validation && <p className="form-error" role="alert">{validation}</p>}
    </form>
  </Modal>
}
