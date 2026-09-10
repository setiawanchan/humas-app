# Design.md — UI/UX Website Humas Internal

## 0. Base Template
- Template yang dipakai: **TailAdmin (Free Next.js + Tailwind Admin Dashboard)**
- Sumber: https://nextjstemplates.com/templates/tailadmin-nextjs-admin-dashboard
- Pendekatan: gunakan struktur layout, komponen (sidebar, tabel, form, kalender, chart) dari template ini sebagai dasar, lalu sesuaikan warna & branding sesuai identitas instansi (lihat bagian 2).
- Halaman/komponen bawaan TailAdmin yang relevan dipakai: Sidebar navigasi, halaman Form Elements, Tabel data, Profile page, Calendar (jika dibutuhkan untuk jadwal humas).
- Halaman yang perlu dibuat custom di luar template: form-form spesifik humas (lihat BLUEPRINT.md bagian 4), alur upload ke Google Drive.

## 1. Prinsip Desain
- Simpel dan cepat dipahami — pengguna adalah pegawai internal, bukan publik, jadi prioritaskan efisiensi kerja dibanding estetika berlebihan
- Konsisten di semua halaman (form, dashboard, admin)
- Mobile-friendly (banyak pegawai kemungkinan akses lewat HP)

## 2. Palet Warna
| Peran | Warna | Hex |
|---|---|---|
| Primary (aksen utama, tombol, header) | Orange | #F97316 |
| Secondary (link, info, elemen pendukung) | Biru muda | #38BDF8 |
| Tertiary/Aksen (highlight, badge kategori) | Hijau muda | #4ADE80 |
| Background | Putih / abu sangat muda | #FAFAFA |
| Teks utama | Abu gelap / hitam lembut | #1A1A1A |
| Sukses | Hijau muda (sama dengan Tertiary) | #4ADE80 |
| Error/Warning | Merah | #DC2626 |

> Kombinasi orange + biru muda + hijau muda dipakai sebagai identitas warna khas, bukan warna resmi logo instansi (BPS) — sesuaikan lagi kalau ternyata harus mengikuti pedoman warna resmi logo BPS.

## 3. Tipografi
- Font utama: *(misal Inter, atau font resmi instansi jika ada)*
- Heading: bold, ukuran bertingkat (H1–H3)
- Body text: reguler, ukuran nyaman dibaca (min 14–16px)

## 4. Layout Umum
- **Navbar/Sidebar**: menu utama (Dashboard, Form, Riwayat, Profil, Logout)
- **Halaman Login**: form sederhana, logo instansi, tanpa elemen dekoratif berlebihan
- **Dashboard Pegawai**: ringkasan pengajuan terakhir, tombol cepat ke form yang sering dipakai
- **Halaman Form**: satu form per halaman, validasi jelas, indikator upload file (progress/berhasil/gagal)
- **Dashboard Admin** *(jika ada)*: tabel daftar pengajuan, filter status, aksi approve/reject

## 5. Komponen UI yang Dibutuhkan
- [ ] Navbar / Sidebar
- [ ] Card (ringkasan, riwayat)
- [ ] Form input (text, select, date, file upload)
- [ ] Button (primary, secondary, danger)
- [ ] Badge status (pending, approved, rejected)
- [ ] Modal/dialog konfirmasi
- [ ] Toast/notifikasi (sukses, error)
- [ ] Tabel dengan pagination (untuk admin)

## 6. Alur Pengalaman Pengguna (per fitur)
### Login
1. Pegawai buka halaman login
2. Masukkan email & password (atau klik magic link dari email)
3. Diarahkan ke Dashboard

### Isi Form
1. Pegawai pilih jenis form dari Dashboard
2. Isi field, upload file jika diperlukan
3. Klik submit → tampil status loading saat upload ke Drive berjalan
4. Notifikasi sukses/gagal, lalu diarahkan ke halaman riwayat

### Cek Riwayat
1. Pegawai buka menu Riwayat
2. Lihat daftar pengajuan sendiri beserta status

## 7. Referensi Visual
> Tempelkan di sini kalau ada contoh desain (screenshot Figma, website lain yang jadi inspirasi, atau warna/logo resmi instansi) supaya lebih terarah.

## 8. Catatan Belum Diputuskan
- [ ] Apakah perlu dark mode?
- [ ] Apakah logo/identitas visual resmi sudah tersedia dalam format digital (SVG/PNG)?
- [ ] Bahasa antarmuka: Indonesia saja atau bilingual?
