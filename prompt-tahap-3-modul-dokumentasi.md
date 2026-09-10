Lanjutkan project ini. Sekarang bangun MODUL MANAJEMEN DOKUMENTASI, mengacu ke BLUEPRINT.md bagian 4.1 dan skema `documentation` di bagian 5.

Kerjakan berikut secara bertahap (pakai Plan Mode dulu):

1. HALAMAN DAFTAR DOKUMENTASI (/dokumentasi)
   - Tampilkan daftar dokumentasi dalam bentuk grid card (ada thumbnail/ikon sesuai kategori, judul, tanggal kegiatan, tags).
   - Data sementara ambil dari mockDocumentation di lib/mock-data.ts.
   - Tambahkan fitur search (cari berdasarkan judul) dan filter berdasarkan kategori (foto/video/dokumen/lainnya).
   - Setiap card bisa diklik untuk melihat detail (judul, deskripsi, tanggal, tags, dan link Drive - untuk sementara link dummy juga tidak apa).

2. HAK AKSES SESUAI ROLE
   - Role "pegawai": hanya bisa melihat daftar dan detail dokumentasi. Tombol "Tambah Dokumentasi", "Edit", dan "Hapus" TIDAK boleh muncul sama sekali untuk role ini.
   - Role "admin_humas" dan "administrator": muncul tombol "+ Tambah Dokumentasi" di halaman daftar, serta tombol Edit dan Hapus di setiap card/detail.

3. FORM TAMBAH/EDIT DOKUMENTASI (khusus admin_humas & administrator)
   - Field: Judul, Deskripsi, Kategori (dropdown: foto/video/dokumen/lainnya), Tanggal Kegiatan, Tags (bisa lebih dari satu, pisahkan pakai koma atau tag input), dan Link Google Drive (untuk sementara input teks biasa, nanti diganti upload asli setelah integrasi Google Drive di tahap selanjutnya).
   - Setelah submit, untuk sekarang cukup update array mockDocumentation di state React (belum tersimpan permanen karena belum ada database) - beri catatan/komentar di kode bahwa ini nanti diganti dengan insert ke Supabase.

4. KONFIRMASI HAPUS
   - Saat klik Hapus, munculkan dialog konfirmasi sebelum data benar-benar dihapus dari state.

Ikuti gaya warna dan komponen yang sudah disesuaikan di tahap sebelumnya (orange/biru muda/hijau muda, mengikuti DESIGN.md). Kerjakan satu bagian sampai selesai dan bisa ditest sebelum lanjut ke bagian berikutnya.
