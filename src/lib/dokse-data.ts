export interface DokseItem {
  idsubsls: string; // Kode Sort (misal: "360201000100100")
  kode_kec: string;
  nama_kec: string;
  kode_desa: string;
  nama_desa: string;
  nama_sls: string;
  peta_desa: "Ada" | "Tidak" | "-";
  peta_subrt: "Ada" | "Tidak" | "-";
  dokumen_psls: "Ada" | "Tidak" | "-";
  peta_terisi: "Ya" | "Tidak" | "-";
  perubahan_batas: "Ada" | "Tidak" | "-";
  keterangan: string;
}

export const mockDokseData: DokseItem[] = [];
