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

export const mockDocumentation: Documentation[] = [];

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

export const mockContentCalendar: ContentCalendarItem[] = [];

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

export const mockFormTemplates: FormTemplate[] = [];

export interface DashboardPage {
  id: string;
  nama_page: string;
  slug: string;
  deskripsi: string;
  requires_login: boolean;
  is_active: boolean;
}

export const mockDashboardPages: DashboardPage[] = [];

export interface DashboardPageAccess {
  id: string;
  dashboard_page_id: string;
  access_type: "role" | "user";
  role?: Role;
  user_id?: string;
}

export const mockDashboardPageAccess: DashboardPageAccess[] = [];

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

export const mockArsip: Arsip[] = [];
