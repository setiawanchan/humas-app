import { DokseItem } from "./dokse-data";

export interface PengolahanRecord {
  idsubsls: string;
  petugas_id: string | null;
  nama_petugas: string | null;
  status_scan: "-" | "Belum" | "Sudah";
  status_olah: "-" | "Belum" | "Sudah";
  tgl_selesai_olah: string | null;
  catatan: string | null;
  created_at?: string;
  updated_at?: string;
}

// Data gabungan Dokse + Pengolahan untuk tabel tampilan
export interface PengolahanPetaMergedItem extends DokseItem {
  petugas_id: string | null;
  nama_petugas: string | null;
  status_scan: "-" | "Belum" | "Sudah";
  status_olah: "-" | "Belum" | "Sudah";
  tgl_selesai_olah: string | null;
  catatan_pengolahan: string | null;
  isFisikLengkap: boolean;
}

// Helper periksa apakah dokumen penerimaan fisik di Dok-SE2026 sudah Lengkap
export function checkIsFisikLengkap(dok: DokseItem): boolean {
  return (
    dok.peta_desa === "Ada" &&
    dok.peta_subrt === "Ada" &&
    dok.dokumen_psls === "Ada" &&
    dok.peta_terisi === "Ya"
  );
}
