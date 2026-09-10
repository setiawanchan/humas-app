Lanjutkan project ini. Sekarang bangun MODUL ARSIP, mengacu ke BLUEPRINT.md bagian 4.2 dan skema `arsip` di bagian 5.

Modul ini mirip dengan modul Dokumentasi yang sudah dibuat sebelumnya, tapi khusus untuk dokumen administratif kantor (SK, logo/aset, template laporan, dll), bukan dokumentasi kegiatan.

Kerjakan berikut secara bertahap (pakai Plan Mode dulu):

1. HALAMAN DAFTAR ARSIP (/arsip)
   - Tampilkan daftar arsip dalam bentuk tabel atau grid card (judul, kategori, tanggal, tags).
   - Data sementara ambil dari mockArsip di lib/mock-data.ts.
   - Tambahkan fitur search (cari berdasarkan judul) dan filter berdasarkan kategori (SK / Logo & Aset / Template Laporan / Lainnya) - tampilkan label kategori dalam Bahasa Indonesia meski value di data pakai snake_case (sk, logo_aset, template_laporan, lainnya).
   - Setiap item bisa diklik untuk melihat detail (judul, deskripsi, tanggal, tags, link Drive) dan ada tombol untuk membuka/download link Drive tersebut (untuk sekarang link dummy tidak apa).

2. HAK AKSES SESUAI ROLE
   - Role "pegawai": hanya bisa melihat dan membuka/download arsip. Tombol "Tambah Arsip", "Edit", dan "Hapus" TIDAK boleh muncul.
   - Role "admin_humas" dan "administrator": muncul tombol "+ Tambah Arsip" di halaman daftar, serta tombol Edit dan Hapus di setiap item.

3. FORM TAMBAH/EDIT ARSIP (khusus admin_humas & administrator)
   - Field: Judul, Kategori (dropdown: SK / Logo & Aset / Template Laporan / Lainnya), Deskripsi, Tanggal, Tags (bisa lebih dari satu), dan Link Google Drive (input teks untuk sementara, nanti diganti upload asli setelah integrasi Google Drive).
   - Setelah submit, update array mockArsip di state React (beri komentar di kode bahwa ini nanti diganti insert/update ke Supabase).

4. KONFIRMASI HAPUS
   - Saat klik Hapus, munculkan dialog konfirmasi dulu sebelum data dihapus dari state.

5. TAMBAHKAN MENU "Arsip" DI SIDEBAR
   - Posisikan menu ini setelah menu "Dokumentasi" di sidebar, dengan ikon yang berbeda (misal ikon folder/arsip) supaya jelas terpisah dari menu Dokumentasi.

Ikuti gaya warna dan komponen yang sudah dipakai di modul Dokumentasi dan Kalender Konten sebelumnya supaya konsisten. Kerjakan satu bagian sampai selesai dan bisa ditest sebelum lanjut ke bagian berikutnya.
