Baca dulu file BLUEPRINT.md dan DESIGN.md di root project ini untuk memahami konteks project (sistem humas internal BPS Kabupaten Lebak).

Tolong kerjakan hal berikut secara bertahap:

1. SESUAIKAN WARNA & BRANDING
   - Ganti warna primary/accent di konfigurasi Tailwind template ini sesuai DESIGN.md bagian 2: Primary = Orange (#F97316), Secondary = Biru muda (#38BDF8), Tertiary/Aksen = Hijau muda (#4ADE80).
   - Pakai Primary (orange) untuk tombol utama dan elemen header/navigasi penting.
   - Pakai Secondary (biru muda) untuk link, info banner, dan elemen pendukung.
   - Pakai Tertiary (hijau muda) untuk badge status "sukses"/"selesai" dan highlight ringan.
   - Ganti nama/judul aplikasi di layout dan title tag jadi "Sistem Humas BPS Kabupaten Lebak".

2. BERSIHKAN MENU SIDEBAR
   - Hapus menu/halaman contoh bawaan template yang tidak relevan (misalnya contoh e-commerce, chat, invoice, kalau ada).
   - Ganti struktur menu sidebar jadi:
     - Dashboard
     - Dokumentasi
     - Kalender Konten
     - Form Builder
     - Admin (Manajemen User, Manajemen Halaman & Akses) -- menu ini nanti hanya tampil untuk role administrator

3. BUAT SIMULASI LOGIN BERBASIS ROLE (BELUM REAL AUTH)
   - Gunakan data dari lib/mock-data.ts (mockUsers).
   - Buat halaman login sederhana berupa dropdown untuk memilih salah satu user dari mockUsers (tanpa perlu password sungguhan).
   - Setelah "login", simpan user yang dipilih ke React Context atau state global, supaya bisa diakses di seluruh halaman.
   - Sidebar dan halaman yang tampil harus menyesuaikan role user yang sedang "login" sesuai matriks akses di BLUEPRINT.md bagian 3 (contoh: menu Admin hanya muncul untuk role administrator, tombol upload/edit hanya muncul untuk admin_humas dan administrator).
   - Tambahkan tombol Logout yang mengembalikan ke halaman login.

Kerjakan satu bagian dulu sampai selesai dan bisa ditest sebelum lanjut ke bagian berikutnya. Gunakan Plan Mode untuk membuat rencana dulu sebelum eksekusi.
