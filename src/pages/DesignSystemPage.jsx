import { motion } from 'motion/react'
import {
  Activity, ArrowDownRight, ArrowRight, Bell, BookHeart, CalendarDays,
  Check, ChevronRight, CircleHelp, Droplets, Heart, Home, Leaf, Plus,
  Search, Settings2, Sparkles, Sun, X,
} from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  Badge, BottomNavigation, Button, Card, Dropdown, Input, LoadingSkeleton,
  Modal, Sidebar, useToast,
} from '../components/index.js'
import { BrandMark } from '../components/navigation/BrandMark.jsx'

const navigation = [
  { key: 'overview', label: 'Ringkasan', icon: Home, href: '/' },
  { key: 'diary', label: 'Jurnal kulit', icon: BookHeart, href: '/diary' },
  { key: 'routine', label: 'Rutinitas', icon: Droplets, href: '/routine' },
  { key: 'insights', label: 'Perkembangan', icon: Activity, href: '/insights' },
]

const routineOptions = [
  { value: 'morning', label: 'Rutinitas pagi' },
  { value: 'evening', label: 'Rutinitas malam' },
  { value: 'weekend', label: 'Perawatan mingguan' },
]

function SectionHeading({ number, title, description, headingId }) {
  return (
    <div className="showcase-heading">
      <span className="showcase-heading__number">{number}</span>
      <div>
          <h2 id={headingId}>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  )
}

function ShowcasePage() {
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [routine, setRoutine] = useState('morning')
  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')
  const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })

  const handleNavigate = (key) => setActiveTab(key)

  return (
    <div className="app-shell">
      <Sidebar items={navigation} activeKey={activeTab} onNavigate={handleNavigate} />
      <main className="main-panel" id="main-content">
        <header className="topbar">
          <div className="topbar__crumb"><span>Workspace</span><ChevronRight size={15} aria-hidden="true" /><strong>Design system</strong></div>
          <div className="topbar__actions">
            <span className="topbar__date"><CalendarDays size={15} aria-hidden="true" />{today}</span>
            <button className="icon-button topbar__notification" type="button" aria-label="Notifikasi" onClick={() => showToast('Kamu sudah melihat semua notifikasi.', { tone: 'info' })}>
              <Bell size={18} aria-hidden="true" /><span className="notification-dot" aria-hidden="true" />
            </button>
            <span className="avatar" aria-label="Profil Adinda">A</span>
          </div>
        </header>

        <motion.div
          className="page-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <section className="welcome-banner">
            <div className="welcome-banner__copy">
              <div className="welcome-banner__eyebrow"><Sparkles size={14} aria-hidden="true" /> KOMPONEN, DENGAN PENUH PERHATIAN</div>
              <h1>Ruang kecil untuk<br className="desktop-break" /> merawat <em>dirimu.</em></h1>
              <p>Design system My Skin Diary — lembut, sederhana, dan selalu berpihak pada kenyamananmu.</p>
              <div className="welcome-banner__meta"><span className="welcome-banner__dot" /> 10 komponen siap digunakan</div>
            </div>
            <div className="welcome-banner__art" aria-hidden="true">
              <span className="art-ring art-ring--one" /><span className="art-ring art-ring--two" />
              <span className="art-leaf art-leaf--one"><Leaf size={39} strokeWidth={1.2} /></span>
              <span className="art-leaf art-leaf--two"><Leaf size={30} strokeWidth={1.2} /></span>
              <span className="art-flower"><FlowerMark /></span>
              <span className="art-sparkle art-sparkle--one"><Sparkles size={18} /></span>
              <span className="art-sparkle art-sparkle--two"><Sparkles size={12} /></span>
            </div>
          </section>

          <section className="showcase-section" aria-labelledby="palette-title">
            <SectionHeading number="01" headingId="palette-title" title="Palet warna" description="Warna yang tenang, dirancang untuk dibaca dengan nyaman." />
            <div className="palette-grid">
              {[
                { label: 'Background', value: '#FFF8F7', color: '#FFF8F7', dark: true },
                { label: 'Primary', value: '#E9A6B3', color: '#E9A6B3' },
                { label: 'Soft pink', value: '#FCE4E8', color: '#FCE4E8', dark: true },
                { label: 'Dusty rose', value: '#C98291', color: '#C98291' },
                { label: 'Cream', value: '#FFF0E6', color: '#FFF0E6', dark: true },
                { label: 'Text', value: '#49363C', color: '#49363C' },
              ].map(({ label, value, color, dark }) => (
                <div className="swatch" key={label}>
                  <div className="swatch__color" style={{ backgroundColor: color }}><span className={dark ? 'swatch__value swatch__value--dark' : 'swatch__value'}>{value}</span></div>
                  <span className="swatch__label">{label}</span>
                </div>
              ))}
            </div>
            <div className="contrast-note"><Check size={15} aria-hidden="true" /><span>Teks utama menggunakan <strong>Text #49363C</strong> untuk kontras nyaman pada latar terang.</span></div>
          </section>

          <div className="showcase-grid">
            <section className="showcase-section" aria-labelledby="buttons-title">
              <SectionHeading number="02" headingId="buttons-title" title="Button" description="Aksi yang terasa ringan, dengan hierarki visual yang jelas." />
              <Card className="demo-card">
                <div className="demo-stack">
                  <div className="demo-row demo-row--wrap">
                    <Button leadingIcon={<Plus size={16} />}>Catat hari ini</Button>
                    <Button variant="secondary" leadingIcon={<Heart size={16} />}>Simpan favorit</Button>
                  </div>
                  <div className="demo-row demo-row--wrap">
                    <Button variant="outline" trailingIcon={<ArrowRight size={16} />}>Lihat jurnal</Button>
                    <Button variant="ghost" leadingIcon={<CircleHelp size={16} />}>Pelajari lebih</Button>
                  </div>
                  <div className="demo-row demo-row--wrap demo-row--align-center">
                    <Button size="sm">Kecil</Button><Button size="lg">Lebih besar</Button>
                    <Button size="icon" variant="outline" aria-label="Tambah catatan"><Plus size={17} /></Button>
                    <Button loading>Memproses</Button>
                  </div>
                </div>
              </Card>
            </section>

            <section className="showcase-section" aria-labelledby="input-title">
              <SectionHeading number="03" headingId="input-title" title="Input" description="Label, petunjuk, dan pesan kesalahan yang terhubung ke field." />
              <Card className="demo-card">
                <div className="demo-stack">
                  <Input label="Nama produk" placeholder="Contoh: gentle cleanser" leadingIcon={<Search size={16} />} hint="Nama produk yang kamu gunakan." value={search} onChange={(event) => setSearch(event.target.value)} />
                  <Input label="Catatan hari ini" placeholder="Bagaimana kondisi kulitmu?" required />
                  <Input label="Email" type="email" value="adinda@contoh" readOnly error="Masukkan alamat email yang valid." />
                </div>
              </Card>
            </section>

            <section className="showcase-section" aria-labelledby="card-title">
              <SectionHeading number="04" headingId="card-title" title="Card" description="Permukaan bersih untuk mengelompokkan konten dan aksi." />
              <Card className="demo-card" title="Ritual pagi" description="Hari ini · 3 langkah" action={<Badge tone="cream" dot>Belum dimulai</Badge>} footer={<Button variant="ghost" size="sm" trailingIcon={<ArrowRight size={15} />}>Lihat rutinitas</Button>}>
                <div className="routine-preview">
                  <span className="routine-preview__icon"><Sun size={18} aria-hidden="true" /></span>
                  <div><strong>Mulai dengan lembut</strong><p>Pembersih · serum · tabir surya</p></div>
                </div>
              </Card>
            </section>

            <section className="showcase-section" aria-labelledby="badge-title">
              <SectionHeading number="05" headingId="badge-title" title="Badge" description="Label mungil untuk status, kategori, atau penanda." />
              <Card className="demo-card">
                <div className="demo-row demo-row--wrap">
                  <Badge dot>Terawat</Badge><Badge tone="cream" dot>Rutinitas pagi</Badge>
                  <Badge tone="neutral">Catatan baru</Badge><Badge tone="muted">Selesai</Badge>
                </div>
              </Card>
            </section>

            <section className="showcase-section" aria-labelledby="modal-title">
              <SectionHeading number="06" headingId="modal-title" title="Modal" description="Dialog fokus dengan label, deskripsi, dan aksi yang jelas." />
              <Card className="demo-card demo-card--center">
                <div className="demo-icon demo-icon--rose"><Heart size={21} aria-hidden="true" /></div>
                <p className="demo-card__copy">Buka dialog untuk melihat detail dan perilaku keyboard-nya.</p>
                <Button variant="outline" onClick={() => setModalOpen(true)}>Buka modal</Button>
              </Card>
              <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Simpan momen ini?"
                description="Catatan kecil membantumu mengenali perjalanan kulitmu dari hari ke hari."
                footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Nanti saja</Button><Button leadingIcon={<Heart size={16} />} onClick={() => { setModalOpen(false); showToast('Momen ini tersimpan di jurnalmu.') }}>Simpan momen</Button></>}
              >
                <div className="modal-note"><span className="modal-note__icon"><Sun size={17} aria-hidden="true" /></span><p><strong>Hari ini terasa baik.</strong><br />Kulitmu terasa nyaman setelah rutinitas pagi.</p></div>
              </Modal>
            </section>

            <section className="showcase-section" aria-labelledby="dropdown-title">
              <SectionHeading number="07" headingId="dropdown-title" title="Dropdown" description="Menu pilihan dengan status terpilih dan dukungan keyboard." />
              <Card className="demo-card demo-card--dropdown">
                <label className="field__label" id="routine-label">Pilih rutinitas</label>
                <Dropdown label="Pilih rutinitas" options={routineOptions} value={routine} onChange={setRoutine} />
                <p className="field__message">Pilihan saat ini: {routineOptions.find((item) => item.value === routine)?.label}</p>
              </Card>
            </section>

            <section className="showcase-section" aria-labelledby="toast-title">
              <SectionHeading number="08" headingId="toast-title" title="Toast" description="Notifikasi singkat yang bisa ditutup dan diumumkan screen reader." />
              <Card className="demo-card demo-card--toast">
                <div className="toast-example"><span className="toast-example__icon"><Check size={16} aria-hidden="true" /></span><div><strong>Tersimpan dengan baik</strong><p>Catatan harianmu sudah diperbarui.</p></div><X size={15} aria-hidden="true" className="toast-example__close" /></div>
                <div className="demo-row demo-row--wrap demo-row--center">
                  <Button size="sm" onClick={() => showToast('Catatan harianmu sudah diperbarui.')}>Tampilkan toast</Button>
                  <Button size="sm" variant="outline" onClick={() => showToast('Periksa kembali koneksi internetmu.', { tone: 'error' })}>Contoh error</Button>
                </div>
              </Card>
            </section>

            <section className="showcase-section" aria-labelledby="sidebar-title">
              <SectionHeading number="09" headingId="sidebar-title" title="Navigasi" description="Sidebar untuk desktop, bottom navigation untuk layar kecil." />
              <Card className="demo-card nav-demo-card">
                <div className="nav-mini-sidebar" aria-label="Contoh tampilan sidebar">
                  <span className="nav-mini-sidebar__brand"><span className="brand-mark brand-mark--mini"><BrandMark /></span> my skin diary</span>
                  <span className="nav-mini-sidebar__active"><Home size={15} /> Ringkasan <ArrowDownRight size={13} className="nav-mini-sidebar__arrow" /></span>
                  <span className="nav-mini-sidebar__item"><BookHeart size={15} /> Jurnal kulit</span>
                  <span className="nav-mini-sidebar__item"><Droplets size={15} /> Rutinitas</span>
                </div>
                <p className="demo-card__copy demo-card__copy--left"><strong>Desktop:</strong> sidebar tetap dengan menu dan profil.</p>
                <div className="nav-mini-bottom" aria-label="Contoh tampilan navigasi bawah">
                  <span className="nav-mini-bottom__item nav-mini-bottom__item--active"><Home size={17} />Ringkasan</span>
                  <span className="nav-mini-bottom__item"><BookHeart size={17} />Jurnal</span>
                  <span className="nav-mini-bottom__item"><Droplets size={17} />Rutinitas</span>
                  <span className="nav-mini-bottom__item"><Settings2 size={17} />Lainnya</span>
                </div>
                <p className="demo-card__copy demo-card__copy--left"><strong>Mobile:</strong> navigasi bawah menjaga menu utama tetap terjangkau.</p>
              </Card>
            </section>

            <section className="showcase-section" aria-labelledby="skeleton-title">
              <SectionHeading number="10" headingId="skeleton-title" title="Loading skeleton" description="Placeholder halus dengan status loading yang ramah aksesibilitas." />
              <Card className="demo-card">
                <div className="skeleton-demo">
                  <LoadingSkeleton variant="avatar" />
                  <div className="skeleton-demo__content"><LoadingSkeleton variant="text" rows={3} /></div>
                </div>
                <div className="skeleton-card-demo"><LoadingSkeleton variant="card" /></div>
              </Card>
            </section>
          </div>

          <footer className="page-footer"><span><Heart size={13} aria-hidden="true" /> Dibuat dengan lembut, untuk perjalananmu</span><span>My Skin Diary · Design system</span></footer>
        </motion.div>
      </main>
      <BottomNavigation items={navigation} activeKey={activeTab} onNavigate={handleNavigate} />
    </div>
  )
}

function FlowerMark() {
  return <svg width="76" height="76" viewBox="0 0 76 76" fill="none" aria-hidden="true"><path d="M38 17c5-13 18-9 15 3 12-7 20 4 10 12 13 3 11 17-2 17 5 12-7 19-15 9-5 13-19 10-17-3-12 7-20-4-10-12-13-3-11-17 2-17-5-12 7-19 15-9 5-13 19-10 17 3Z" fill="#E9A6B3"/><circle cx="38" cy="38" r="9" fill="#FFF0E6"/><circle cx="38" cy="38" r="3.5" fill="#C98291"/></svg>
}

export default function DesignSystemPage() {
  return <ShowcasePage />
}
