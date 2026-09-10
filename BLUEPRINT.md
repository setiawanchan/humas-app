# Blueprint — Sistem Humas Internal BPS Kabupaten Lebak

## 1. Tujuan
Sistem internal untuk mengelola dokumentasi kegiatan, arsip dokumen kantor, perencanaan konten media sosial, serta dashboard beberapa kegiatan — menggantikan website humas lama.

## 2. Tech Stack
| Bagian | Teknologi |
|---|---|
| Framework | Next.js (App Router) |
| UI Template | TailAdmin (Free Next.js + Tailwind Admin Dashboard) |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth) |
| Penyimpanan file | Google Drive (OAuth akun admin, folder induk tunggal) |
| Hosting | Vercel |
| Version control | GitHub |
| Build tool | Google Antigravity (agentic IDE) |

## 3. Role & Hak Akses

| Role | Deskripsi |
|---|---|
| **pegawai** | Pegawai BPS biasa. Hanya bisa **melihat** (dokumentasi, arsip, kalender konten, dashboard) — tidak bisa upload/edit/hapus. |
| **admin_humas** | Tim humas. Bisa mengelola (create/read/update/delete) semua konten operasional: dokumentasi, arsip, kalender konten. |
| **administrator** | Akses penuh ke semua menu & fitur, termasuk pengaturan sistem: manajemen user, manajemen halaman dashboard (siapa yang boleh akses, perlu login atau tidak). |
| **eksternal** | Pengguna di luar pegawai BPS (misal tamu/instansi lain). Tetap wajib login (akun dibuatkan administrator), tapi hanya bisa akses halaman dashboard yang secara eksplisit diberikan ke akunnya (lihat bagian 6). |

### Matriks Akses per Modul
| Modul | Pegawai | Admin Humas | Administrator | Eksternal |
|---|---|---|---|---|
| Lihat Dokumentasi | ✅ | ✅ | ✅ | ❌ (kecuali diberi akses halaman terkait) |
| Kelola Dokumentasi (upload/edit/hapus) | ❌ | ✅ | ✅ | ❌ |
| Lihat Arsip | ✅ | ✅ | ✅ | ❌ |
| Kelola Arsip (upload/edit/hapus) | ❌ | ✅ | ✅ | ❌ |
| Lihat Kalender Konten | ✅ | ✅ | ✅ | ❌ |
| Kelola Kalender Konten | ❌ | ✅ | ✅ | ❌ |
| Lihat Dashboard Kegiatan | ✅ | ✅ | ✅ | Tergantung setting halaman |
| Atur Akses Halaman Dashboard | ❌ | ❌ | ✅ | ❌ |
| Manajemen User | ❌ | ❌ | ✅ | ❌ |

## 4. Modul / Fitur Utama

### 4.1 Manajemen Dokumentasi
- Upload dokumentasi kegiatan (foto/video/dokumen) — file fisik disimpan di Google Drive, **metadata/baris data tetap di database** (bukan file-nya)
- Field: judul, deskripsi, kategori, tanggal kegiatan, tag/label, link Drive, thumbnail (jika ada)
- Pegawai: hanya lihat & cari/filter
- Admin Humas & Administrator: upload, edit, hapus

### 4.2 Arsip
- Penyimpanan dokumen administratif kantor: **SK (Surat Keputusan), aset logo, template laporan**, dan dokumen lainnya
- Sama seperti Dokumentasi, file fisik di Google Drive, metadata di database
- Field: judul, kategori (SK / Logo & Aset / Template Laporan / Lainnya), deskripsi, tanggal (terbit/upload), link Drive, tags
- Ada fitur search & filter berdasarkan kategori
- Pegawai: hanya lihat & download
- Admin Humas & Administrator: upload, edit, hapus

### 4.3 Kalender Konten
- Kalender untuk manajemen konten media sosial & kegiatan (tampilan bulanan/mingguan)
- Field per item: judul, jenis (konten sosmed / kegiatan / lainnya), platform (Instagram/Facebook/TikTok/dll — kalau jenis konten sosmed), tanggal, status (draft/siap/terjadwal/terbit/selesai), link Drive bahan posting, PIC/penanggung jawab
- Pegawai: hanya lihat kalender
- Admin Humas & Administrator: tambah/edit/hapus item, ubah status

### 4.4 Dashboard Kegiatan
- Bisa ada beberapa halaman dashboard berbeda (per kegiatan/program), masing-masing menampilkan data/statistik terkait
- **Konten dashboard tahap awal**: jumlah kegiatan (total/per periode), rekap konten media sosial bulanan & tahunan (dari data `content_calendar`)
- **Tampilan berbeda per role**: widget/statistik yang muncul di dashboard bisa disetel berbeda tergantung role yang login
- Administrator mengatur **per halaman dashboard**: wajib login atau tidak, dan siapa yang boleh akses — **bisa per role atau per user spesifik** (misal 2 akun eksternal beda halaman yang bisa diakses)

### 4.5 Manajemen Halaman & Akses (khusus Administrator)
- Daftar semua halaman dashboard yang ada
- Toggle "wajib login" per halaman
- Atur akses granular: berdasarkan **role** dan/atau **user tertentu**, bisa dikombinasikan dalam satu halaman
- Atur widget mana saja yang tampil untuk role tertentu di halaman yang sama

### 4.6 Manajemen User (khusus Administrator)
- Tambah/edit/nonaktifkan akun pegawai
- Assign role (pegawai/admin_humas/administrator/eksternal)

### 4.7 [DITUNDA] Form Builder
> Modul ini untuk sementara **tidak dikerjakan dulu**, akan ditambahkan kembali di tahap lanjutan setelah modul inti selesai. Rencana awal: pembuatan form daftar hadir & kuis (dengan import soal dari Excel, skor custom, sinkron ke Google Sheets) — detail rencana lama tetap disimpan sebagai referensi di bagian Riwayat bawah dokumen ini kalau sewaktu-waktu dilanjutkan.

## 5. Skema Database (Draft)

```sql
-- Akun pengguna
users
  id uuid pk
  email text
  nama text
  role text  -- 'pegawai' | 'admin_humas' | 'administrator' | 'eksternal'
  is_active boolean default true
  created_at timestamptz

-- Dokumentasi kegiatan
documentation
  id uuid pk
  judul text
  deskripsi text
  kategori text            -- 'foto' | 'video' | 'dokumen' | 'lainnya'
  tanggal_kegiatan date
  tags text[]
  drive_file_id text
  drive_url text
  thumbnail_url text       -- opsional
  uploaded_by uuid fk -> users.id
  created_at timestamptz

-- Arsip dokumen kantor (SK, logo/aset, template laporan, dll)
arsip
  id uuid pk
  judul text
  kategori text            -- 'sk' | 'logo_aset' | 'template_laporan' | 'lainnya'
  deskripsi text
  tanggal date             -- tanggal terbit/upload dokumen
  tags text[]
  drive_file_id text
  drive_url text
  uploaded_by uuid fk -> users.id
  created_at timestamptz

-- Kalender konten
content_calendar
  id uuid pk
  judul text
  jenis text               -- 'konten_sosmed' | 'kegiatan' | 'lainnya'
  platform text            -- nullable, 'instagram' | 'facebook' | 'tiktok' | dst
  tanggal date
  status text              -- 'draft' | 'siap' | 'terjadwal' | 'terbit' | 'selesai'
  drive_link_bahan text
  deskripsi text
  pic uuid fk -> users.id
  created_by uuid fk -> users.id
  created_at timestamptz

-- Halaman dashboard kegiatan
dashboard_pages
  id uuid pk
  nama_page text
  slug text unique
  deskripsi text
  requires_login boolean default true
  is_active boolean default true
  created_by uuid fk -> users.id
  created_at timestamptz

-- Akses per halaman: granular, bisa per role DAN/ATAU per user spesifik
dashboard_page_access
  id uuid pk
  dashboard_page_id uuid fk -> dashboard_pages.id
  access_type text          -- 'role' | 'user'
  role text                 -- diisi kalau access_type = 'role', mis. 'pegawai'
  user_id uuid fk -> users.id   -- diisi kalau access_type = 'user' (akses spesifik per akun)
  created_at timestamptz

-- Widget/isi per halaman dashboard, bisa beda tampilan tiap role
dashboard_widgets
  id uuid pk
  dashboard_page_id uuid fk -> dashboard_pages.id
  tipe_widget text          -- 'chart' | 'table' | 'link' | 'stat'
  konfigurasi jsonb
  visible_to_roles jsonb    -- contoh: ["pegawai","admin_humas"], null = tampil untuk semua yang punya akses ke halaman ini
  urutan int
```

> Catatan RLS (Row Level Security) di Supabase:
> - `documentation`, `arsip`, `content_calendar`: SELECT boleh semua role login (pegawai ke atas); INSERT/UPDATE/DELETE hanya `admin_humas` dan `administrator`.
> - `dashboard_pages`, `dashboard_page_access`, `users`: hanya `administrator` yang bisa INSERT/UPDATE/DELETE.
> - Akses ke sebuah `dashboard_pages` divalidasi dengan mengecek `dashboard_page_access`: user boleh masuk kalau role-nya match salah satu baris `access_type='role'`, ATAU user_id-nya match baris `access_type='user'` untuk halaman tersebut.
> - Role **eksternal** tetap wajib login, tapi hanya diberi akses ke halaman dashboard yang secara eksplisit di-assign lewat `dashboard_page_access` (access_type='user').

## 6. Integrasi Google Drive
- **Metode**: OAuth sekali oleh akun admin (bukan Service Account — kuota terbatas)
- Refresh token disimpan di environment variable/tabel server-only
- **Dokumentasi & Arsip**: file diupload ke folder induk Drive (bisa dipisah sub-folder: satu untuk Dokumentasi, satu untuk Arsip), hanya `drive_file_id` & `drive_url` yang disimpan di tabel masing-masing

## 7. Struktur Folder Project (mengikuti base TailAdmin)
```
/app
  /login
  /dashboard                 -- dashboard utama (role pegawai ke atas)
  /dokumentasi
  /arsip
  /kalender-konten
  /dashboard-kegiatan
    /[slug]                  -- dashboard kegiatan dinamis sesuai dashboard_pages
  /admin
    /users
    /halaman-akses
  /api
    /upload
    /auth/google/callback
/components
/lib
  mock-data.ts              -- data dummy tahap awal (sebelum tersambung Supabase)
  supabase.ts               -- ditambahkan nanti saat integrasi database
  google-drive.ts           -- ditambahkan nanti saat integrasi Drive
```

## 8. Alur Deployment
1. Development di localhost dulu pakai data dummy (mock-data.ts) — tanpa Supabase/Google Drive dulu
2. Setelah semua modul inti siap secara UI & alur, baru sambungkan ke Supabase (development project) dan Google Drive
3. Push ke branch fitur → GitHub → Preview Deployment otomatis di Vercel
4. Test di preview → merge ke `main` → auto-deploy production
5. Environment variable production di-set terpisah di Vercel

## 9. Belum Diputuskan / To-Do
- [ ] Struktur sub-folder Drive (per kategori? per tahun? per kegiatan?)
- [ ] Daftar dashboard kegiatan yang sudah pasti dibutuhkan di tahap awal (nama masing-masing dashboard)
- [ ] Apakah perlu notifikasi (email/lainnya) untuk kalender konten yang mendekati deadline?
- [ ] Form Builder (daftar hadir & kuis) — akan dirancang ulang setelah modul inti selesai

## 10. Riwayat Perubahan
- Form Builder (daftar hadir & kuis dengan import Excel, skor custom, sinkron Google Sheets) ditunda dari rancangan awal, digantikan sementara oleh modul **Arsip** untuk kebutuhan penyimpanan dokumen kantor (SK, logo/aset, template laporan, dll). Rencana form builder bisa diaktifkan lagi di tahap lanjutan.