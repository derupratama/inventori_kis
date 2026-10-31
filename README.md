# My Skin Diary

Frontend aplikasi jurnal perawatan kulit menggunakan React, Vite, JavaScript, dan Tailwind CSS. Semua data pada fase ini bersifat mock dan disimpan di memori aplikasi.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Vite menampilkan alamat lokal di terminal (biasanya `http://localhost:5173`). Untuk build produksi, jalankan `npm run build`. Uji smoke dan helper interaksi dapat dijalankan dengan `npm test`.

## Halaman

- `/` — dashboard dan ringkasan jurnal
- `/calendar` — kalender interaktif dan catatan harian
- `/collection` — koleksi produk dengan pencarian, filter, favorit, sorting kedaluwarsa, dan modal tambah produk
- `/collection/:productId` — detail produk dengan modal edit, favorit, dan konfirmasi hapus
- `/routine` — rutinitas pagi/malam dengan checklist dan progress animasi
- `/settings` — profil, pengingat, dan ekspor mock data

## Struktur folder

```text
src/
  assets/       Aset statis
  components/
    app/        Shell aplikasi, kartu produk, dan komponen halaman bersama
    navigation/ Sidebar dan bottom navigation
    ui/         Design system reusable
  data/         Mock data produk, jurnal, rutinitas, dan navigasi
  hooks/        Custom React hooks
  lib/          Helper kalender, filter koleksi, dan state rutinitas
  pages/        Komponen halaman berdasarkan route
  styles/       Token warna, design system, dan layout responsif
  App.jsx       Konfigurasi React Router
  main.jsx      Entry point React
tests/          Uji route, helper data, kalender, koleksi, dan state checklist
```

## Dependency utama

- `react` dan `react-dom`: UI dan rendering React.
- `react-router-dom`: routing halaman.
- `tailwindcss` dan `@tailwindcss/vite`: styling dengan plugin Vite resmi Tailwind.
- `lucide-react`: ikon.
- `motion`: animasi transisi.
- `date-fns`: format tanggal dan kalkulasi kalender.
- `vite` dan `@vitejs/plugin-react`: dev server dan build.
