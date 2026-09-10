// mock-data.ts
// Data dummy untuk development awal (sebelum tersambung ke Supabase & Google Drive).
// Struktur field mengikuti skema di BLUEPRINT.md bagian 5.

export type Role = "pegawai" | "admin_humas" | "administrator" | "eksternal";

export interface User {
  id: string;
  email: string;
  nama: string;
  role: Role;
  is_active: boolean;
}

export const mockUsers: User[] = [
  { id: "u1", email: "budi@bps.go.id", nama: "Budi Santoso", role: "pegawai", is_active: true },
  { id: "u2", email: "siti.humas@bps.go.id", nama: "Siti Aminah", role: "admin_humas", is_active: true },
  { id: "u3", email: "admin@bps.go.id", nama: "Rudi Hartono", role: "administrator", is_active: true },
  { id: "u4", email: "dinas.a@luar.go.id", nama: "Perwakilan Dinas A", role: "eksternal", is_active: true },
  { id: "u5", email: "dinas.b@luar.go.id", nama: "Perwakilan Dinas B", role: "eksternal", is_active: true },
];

export interface Documentation {
  id: string;
  judul: string;
  deskripsi: string;
  kategori: "foto" | "video" | "dokumen" | "lainnya";
  tanggal_kegiatan: string;
  tags: string[];
  drive_url: string; // dummy link, nanti diganti link Drive asli
  uploaded_by: string; // user id
}

export const mockDocumentation: Documentation[] = [
  {
    id: "d1",
    judul: "Sensus Ekonomi 2026 - Sosialisasi",
    deskripsi: "Dokumentasi kegiatan sosialisasi Sensus Ekonomi di Kecamatan Rangkasbitung",
    kategori: "foto",
    tanggal_kegiatan: "2026-08-14",
    tags: ["sensus ekonomi", "sosialisasi"],
    drive_url: "https://drive.google.com/dummy-link-1",
    uploaded_by: "u2",
  },
  {
    id: "d2",
    judul: "Rilis Berita Resmi Statistik Agustus",
    deskripsi: "Video rilis BRS inflasi bulan Agustus",
    kategori: "video",
    tanggal_kegiatan: "2026-08-01",
    tags: ["brs", "inflasi"],
    drive_url: "https://drive.google.com/dummy-link-2",
    uploaded_by: "u2",
  },
];

export interface ContentCalendarItem {
  id: string;
  judul: string;
  platform: "instagram" | "facebook" | "tiktok" | "youtube" | "website" | "lainnya";
  tanggal: string;
  status: "draft" | "siap" | "terjadwal" | "terbit" | "selesai";
  drive_link_bahan: string;
  deskripsi: string;
  caption?: string; // Teks caption panjang untuk postingan sosmed
  pic: string; // user id
}

export const mockContentCalendar: ContentCalendarItem[] = [
  {
    id: "c1",
    judul: "Post Instagram - Hari Statistik Nasional",
    platform: "instagram",
    tanggal: "2026-09-26",
    status: "siap",
    drive_link_bahan: "https://drive.google.com/dummy-bahan-1",
    deskripsi: "Konten peringatan Hari Statistik Nasional",
    caption: `Selamat Hari Statistik Nasional 2026! 📊✨\n\nStatistik Berkualitas untuk Indonesia Maju. Mari bersama BPS Kabupaten Lebak wujudkan data yang akurat dan terpercaya demi pembangunan daerah yang berkelanjutan.\n\n#HariStatistikNasional #BPSLebak #MenujuMaju #DataBPS`,
    pic: "u2",
  },
  {
    id: "c2",
    judul: "Video Reels & Short - Liputan Rilis Inflasi",
    platform: "instagram",
    tanggal: "2026-09-20",
    status: "terjadwal",
    drive_link_bahan: "https://drive.google.com/dummy-bahan-2",
    deskripsi: "Video reels rangkuman rilis BRS inflasi bulan September",
    caption: `Simak ringkasan Perkembangan Indeks Harga Konsumen (Inflasi) Kabupaten Lebak Bulan September 2026! 📈\n\nInfo selengkapnya dapat diakses melalui website resmi bps.go.id.\n\n#BRSInflasi #BPSLebak #StatistikLebak`,
    pic: "u3",
  },
  {
    id: "c3",
    judul: "Infografis Facebook - Sensus Ekonomi 2026",
    platform: "facebook",
    tanggal: "2026-09-14",
    status: "terbit",
    drive_link_bahan: "https://drive.google.com/dummy-bahan-3",
    deskripsi: "Poster infografis mengenai persiapan Sensus Ekonomi 2026",
    caption: `Persiapan Sensus Ekonomi 2026 telah dimulai! Mari dukung pendataan potensi ekonomi di Kabupaten Lebak.\n\n#SensusEkonomi2026 #SE2026 #BPSLebak`,
    pic: "u2",
  },
  {
    id: "c4",
    judul: "Carousel TikTok - Tips Membaca Data Inflasi",
    platform: "tiktok",
    tanggal: "2026-09-22",
    status: "siap",
    drive_link_bahan: "https://drive.google.com/dummy-bahan-4",
    deskripsi: "Konten edukasi ringan seputar cara membaca angka inflasi daerah",
    caption: `Tahukah kamu bagaimana cara menghitung & membaca angka inflasi? Yuk simak postingan berikut! 💡\n\n#EdukasiStatistik #BPSLebak #MelekData`,
    pic: "u2",
  },
];

export interface QuizField {
  id: string;
  label: string;
  type: "multiple_choice";
  options: string[];
  correct_answer: string; // huruf: "A" | "B" | dst
  skor: number;
  required: boolean;
}

export interface FormTemplate {
  id: string;
  nama_form: string;
  jenis: "daftar_hadir" | "kuis" | "lainnya";
  deskripsi: string;
  fields: QuizField[] | Record<string, unknown>[];
  sumber_soal?: "manual" | "excel_import";
  tampilkan_skor?: boolean;
  slug: string;
  is_public: boolean;
}

export const mockFormTemplates: FormTemplate[] = [
  {
    id: "f1",
    nama_form: "Daftar Hadir Sosialisasi Sensus Ekonomi",
    jenis: "daftar_hadir",
    deskripsi: "Daftar hadir peserta sosialisasi",
    fields: [
      { id: "nama", label: "Nama Lengkap", type: "multiple_choice", options: [], correct_answer: "", skor: 0, required: true } as any,
    ],
    slug: "daftar-hadir-sosek-2026",
    is_public: true,
  },
  {
    id: "f2",
    nama_form: "Kuis Statistik Dasar",
    jenis: "kuis",
    deskripsi: "Kuis ringan tentang statistik dasar",
    sumber_soal: "manual",
    tampilkan_skor: true,
    fields: [
      {
        id: "q1",
        label: "Apa kepanjangan dari BPS?",
        type: "multiple_choice",
        options: ["Badan Pusat Statistik", "Badan Perencanaan Strategis", "Balai Penelitian Sosial"],
        correct_answer: "A",
        skor: 10,
        required: true,
      },
    ],
    slug: "kuis-statistik-dasar",
    is_public: true,
  },
];

export interface DashboardPage {
  id: string;
  nama_page: string;
  slug: string;
  deskripsi: string;
  requires_login: boolean;
  is_active: boolean;
}

export const mockDashboardPages: DashboardPage[] = [
  { id: "p1", nama_page: "Dashboard Utama Humas", slug: "utama", deskripsi: "Ringkasan statistik kehumasan, kalender konten, dan dokumentasi BPS Lebak", requires_login: true, is_active: true },
  { id: "p2", nama_page: "Dashboard Kunjungan Dinas A", slug: "dinas-a", deskripsi: "Monitoring data khusus dan rilis statistik untuk perwakilan Dinas A", requires_login: true, is_active: true },
  { id: "p3", nama_page: "Dashboard Sensus Ekonomi 2026", slug: "sensus-ekonomi-2026", deskripsi: "Publikasi statistik & perkembangan pelaksanaan Sensus Ekonomi 2026 Lebak", requires_login: true, is_active: true },
];

export interface DashboardPageAccess {
  id: string;
  dashboard_page_id: string;
  access_type: "role" | "user";
  role?: Role;
  user_id?: string;
}

export const mockDashboardPageAccess: DashboardPageAccess[] = [
  { id: "a1", dashboard_page_id: "p1", access_type: "role", role: "pegawai" },
  { id: "a2", dashboard_page_id: "p1", access_type: "role", role: "admin_humas" },
  { id: "a3", dashboard_page_id: "p1", access_type: "role", role: "administrator" },
  { id: "a4", dashboard_page_id: "p1", access_type: "user", user_id: "u4" },
  { id: "a5", dashboard_page_id: "p2", access_type: "user", user_id: "u4" },
  { id: "a6", dashboard_page_id: "p1", access_type: "user", user_id: "u5" },
];

export interface Arsip {
  id: string;
  judul: string;
  kategori: "sk" | "logo_aset" | "template_laporan" | "lainnya";
  deskripsi: string;
  tanggal: string; // YYYY-MM-DD
  tags: string[];
  drive_url: string;
  uploaded_by: string;
}

export const mockArsip: Arsip[] = [
  {
    id: "a1",
    judul: "SK Tim Pengelola Humas & Media Sosial BPS Lebak 2026",
    kategori: "sk",
    deskripsi: "Surat Keputusan Kepala BPS Kabupaten Lebak tentang Pembentukan Tim Pengelola Kehumasan dan Media Sosial Tahun 2026",
    tanggal: "2026-01-05",
    tags: ["sk", "humas", "tim kerja"],
    drive_url: "https://drive.google.com/dummy-arsip-sk-humas",
    uploaded_by: "u3",
  },
  {
    id: "a2",
    judul: "Logo Resmi BPS & Panduan Brand Guidelines Vector",
    kategori: "logo_aset",
    deskripsi: "Bundle file logo BPS resolusi tinggi (PNG, SVG, AI, EPS) dan buku pedoman identitas visual resmi",
    tanggal: "2026-02-10",
    tags: ["logo", "branding", "vector", "aset"],
    drive_url: "https://drive.google.com/dummy-arsip-logo-bps",
    uploaded_by: "u2",
  },
  {
    id: "a3",
    judul: "Template Standar Laporan Kegiatan Kehumasan Word & PPT",
    kategori: "template_laporan",
    deskripsi: "Format baku penyusunan laporan kegiatan, presensi, dan slide presentasi resmi BPS Kabupaten Lebak",
    tanggal: "2026-03-01",
    tags: ["template", "laporan", "docx", "pptx"],
    drive_url: "https://drive.google.com/dummy-arsip-template-laporan",
    uploaded_by: "u2",
  },
  {
    id: "a4",
    judul: "SK Penunjukan Penanggung Jawab Sensus Ekonomi 2026",
    kategori: "sk",
    deskripsi: "Surat Keputusan Penunjukan koordinator dan pelaksana lapangan Sensus Ekonomi 2026",
    tanggal: "2026-05-15",
    tags: ["sk", "sensus ekonomi", "se2026"],
    drive_url: "https://drive.google.com/dummy-arsip-sk-se2026",
    uploaded_by: "u3",
  },
];

