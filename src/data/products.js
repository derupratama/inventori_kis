export const products = [
  {
    id: 'cloud-cleanser', name: 'Cloud Cleanser', brand: 'Dear, Dew', category: 'Cleanser', size: '150 ml', price: 'Rp 189.000',
    description: 'Pembersih lembut bertekstur gel yang mengangkat kotoran tanpa membuat kulit terasa tertarik.',
    usage: 'Pijat lembut pada kulit yang sudah dibasahi selama 30–60 detik, lalu bilas hingga bersih.',
    ingredients: ['Oat extract', 'Ceramide NP', 'Panthenol'], skinType: 'Semua jenis kulit', accent: '#F3D8D8', bottle: 'tall',
    rating: '4.9', reviews: 128, added: '12 Oktober 2026', frequency: 'Setiap hari', expiresOn: '2027-08-30',
  },
  {
    id: 'milky-toner', name: 'Milky Hydrating Toner', brand: 'Lune Atelier', category: 'Toner', size: '120 ml', price: 'Rp 245.000',
    description: 'Toner hidrasi ringan dengan hasil akhir lembap dan nyaman, cocok untuk rutinitas pagi maupun malam.',
    usage: 'Tuangkan ke telapak tangan atau kapas, tepuk lembut ke wajah setelah membersihkan kulit.',
    ingredients: ['Rice ferment', 'Hyaluronic acid', 'Allantoin'], skinType: 'Normal hingga kering', accent: '#F2E6CB', bottle: 'wide',
    rating: '4.8', reviews: 86, added: '18 Oktober 2026', frequency: 'Setiap hari', expiresOn: '2027-04-18',
  },
  {
    id: 'calm-serum', name: 'Calm & Collect Serum', brand: 'Petal Theory', category: 'Serum', size: '30 ml', price: 'Rp 329.000',
    description: 'Serum ringan untuk membantu menenangkan tampilan kemerahan dan menjaga kelembapan kulit.',
    usage: 'Aplikasikan 2–3 tetes pada wajah setelah toner. Gunakan pagi atau malam.',
    ingredients: ['Centella asiatica', 'Beta-glucan', 'Madecassoside'], skinType: 'Sensitif', accent: '#E6E4D5', bottle: 'dropper',
    rating: '4.9', reviews: 204, added: '21 Oktober 2026', frequency: 'Pagi & malam', expiresOn: '2027-02-21',
  },
  {
    id: 'daily-veil', name: 'Daily Veil SPF 50', brand: 'Sunday Skin', category: 'Sunscreen', size: '50 ml', price: 'Rp 279.000',
    description: 'Tabir surya bertekstur ringan dengan perlindungan broad spectrum untuk menemani aktivitas harian.',
    usage: 'Gunakan sebagai langkah terakhir di pagi hari. Aplikasikan ulang setiap 2–3 jam saat beraktivitas di luar.',
    ingredients: ['Zinc oxide', 'Vitamin E', 'Squalane'], skinType: 'Semua jenis kulit', accent: '#F1D5D5', bottle: 'tube',
    rating: '4.7', reviews: 172, added: '25 Oktober 2026', frequency: 'Setiap pagi', expiresOn: '2027-06-01',
  },
  {
    id: 'sleeping-mask', name: 'Petal Sleep Mask', brand: 'Dear, Dew', category: 'Moisturizer', size: '45 g', price: 'Rp 295.000',
    description: 'Masker malam dengan tekstur gel-cream yang membantu menjaga hidrasi sepanjang malam.',
    usage: 'Gunakan sebagai langkah terakhir pada malam hari, 2–3 kali seminggu.',
    ingredients: ['Peptide complex', 'Ceramide NP', 'Rose water'], skinType: 'Normal hingga kering', accent: '#E6D8E8', bottle: 'jar',
    rating: '4.8', reviews: 96, added: '28 Oktober 2026', frequency: '2–3 kali seminggu', expiresOn: '2027-03-15',
  },
  {
    id: 'soft-balm', name: 'Soft Reset Cleansing Balm', brand: 'Lune Atelier', category: 'Cleanser', size: '80 g', price: 'Rp 265.000',
    description: 'Balm pembersih yang meleleh menjadi minyak untuk membantu meluruhkan sunscreen dan makeup.',
    usage: 'Ambil secukupnya, pijatkan pada kulit kering, tambahkan air hingga menjadi emulsi lalu bilas.',
    ingredients: ['Sunflower seed oil', 'Shea butter', 'Vitamin E'], skinType: 'Semua jenis kulit', accent: '#EEDFCB', bottle: 'jar',
    rating: '4.8', reviews: 73, added: '30 Oktober 2026', frequency: 'Malam hari', expiresOn: '2027-10-02',
  },
]

export const productCategories = ['Semua produk', 'Skincare', 'Make Up']

export const initialFavoriteIds = ['calm-serum']

export function createMockProduct({ name, brand, category, index = 0, expiresOn = '' }) {
  const accents = ['#F3D8D8', '#F2E6CB', '#E6E4D5', '#E6D8E8', '#EEDFCB']
  const bottles = { Cleanser: 'tall', Toner: 'wide', Serum: 'dropper', Moisturizer: 'jar', Sunscreen: 'tube' }
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`
  return {
    id,
    name,
    brand,
    category,
    size: 'Ukuran belum dicatat',
    price: 'Belum dicatat',
    description: 'Produk yang baru ditambahkan ke koleksimu.',
    usage: 'Tambahkan informasi cara penggunaan sesuai petunjuk produk.',
    ingredients: [],
    skinType: 'Belum dicatat',
    accent: accents[index % accents.length],
    bottle: bottles[category] ?? 'jar',
    rating: '—',
    reviews: 0,
    added: 'Hari ini',
    frequency: 'Belum diatur',
    expiresOn,
  }
}
