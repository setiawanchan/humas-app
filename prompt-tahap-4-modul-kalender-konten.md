Lanjutkan project ini. Sekarang bangun MODUL KALENDER KONTEN, mengacu ke BLUEPRINT.md bagian 4.2 dan skema `content_calendar` di bagian 5.

Kerjakan berikut secara bertahap (pakai Plan Mode dulu):

1. HALAMAN KALENDER KONTEN (/kalender-konten)
   - Tampilkan dalam bentuk kalender bulanan (grid tanggal 1-31 sesuai bulan berjalan), mirip Google Calendar sederhana.
   - Setiap item dari mockContentCalendar (lib/mock-data.ts) muncul sebagai badge/label kecil di tanggal yang sesuai, dengan warna berbeda tergantung status (draft/siap/terjadwal/terbit/selesai) - gunakan warna dari DESIGN.md (misal hijau muda untuk "selesai"/"terbit", orange untuk "draft"/"siap").
   - Tambahkan navigasi untuk pindah bulan (tombol panah kiri/kanan atau dropdown pilih bulan & tahun).
   - Sediakan juga tampilan alternatif "List View" (daftar biasa, diurutkan berdasarkan tanggal) sebagai toggle selain tampilan kalender, supaya lebih mudah dibaca di layar kecil.

2. DETAIL ITEM KONTEN
   - Klik salah satu item di kalender/list, muncul detail: judul, jenis (konten sosmed/kegiatan/lainnya), platform (kalau ada), tanggal, status, PIC, deskripsi, dan link Drive bahan posting.

3. HAK AKSES SESUAI ROLE
   - Role "pegawai": hanya bisa melihat kalender dan detail. Tidak ada tombol tambah/edit/hapus/ubah status.
   - Role "admin_humas" dan "administrator": muncul tombol "+ Tambah Item" di halaman kalender, serta tombol Edit, Hapus, dan dropdown untuk mengubah status langsung dari tampilan detail.

4. FORM TAMBAH/EDIT ITEM KONTEN (khusus admin_humas & administrator)
   - Field: Judul, Jenis (dropdown: konten_sosmed/kegiatan/lainnya), Platform (dropdown, muncul hanya kalau jenis = konten_sosmed: instagram/facebook/tiktok/lainnya), Tanggal, Status (dropdown: draft/siap/terjadwal/terbit/selesai), Link Drive Bahan (input teks untuk sementara), Deskripsi, dan PIC (dropdown pilih dari mockUsers).
   - Setelah submit, update array mockContentCalendar di state React (beri komentar di kode bahwa ini nanti diganti insert/update ke Supabase).

5. KONFIRMASI HAPUS
   - Saat klik Hapus, munculkan dialog konfirmasi dulu.

Ikuti gaya warna dan komponen yang sudah dipakai di modul Dokumentasi sebelumnya supaya konsisten. Kerjakan satu bagian sampai selesai dan bisa ditest sebelum lanjut ke bagian berikutnya.
