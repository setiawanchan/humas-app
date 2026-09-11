export interface DokseItem {
  idsubsls: string; // Kode Sort (misal: "360201000100100")
  nama_sls: string;
  jenis?: string;
  kode_kec: string;
  nama_kec: string;
  kode_desa: string;
  nama_desa: string;
  kode_sls?: string;
  kode_subsls?: string;
  peta_desa: "Ada" | "Tidak" | "-";
  peta_subrt: "Ada" | "Tidak" | "-";
  dokumen_psls: "Ada" | "Tidak" | "-";
  peta_terisi: "Ya" | "Tidak" | "-";
  perubahan_batas: "Ada" | "Tidak" | "-";
  keterangan: string;
}

export const mockDokseData: DokseItem[] = [];
