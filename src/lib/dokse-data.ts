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

export const mockDokseData: DokseItem[] = [
  {
    idsubsls: "360201000100100",
    kode_kec: "010",
    nama_kec: "Rangkasbitung",
    kode_desa: "001",
    nama_desa: "Muara Ciujung Barat",
    nama_sls: "RT 001 / RW 001 Kp. Pasar Keong",
    peta_desa: "Ada",
    peta_subrt: "Ada",
    dokumen_psls: "Ada",
    peta_terisi: "Ya",
    perubahan_batas: "Tidak",
    keterangan: "Dokumen lengkap dan peta terverifikasi fisik.",
  },
  {
    idsubsls: "360201000100200",
    kode_kec: "010",
    nama_kec: "Rangkasbitung",
    kode_desa: "001",
    nama_desa: "Muara Ciujung Barat",
    nama_sls: "RT 002 / RW 001 Kp. Pasar Keong",
    peta_desa: "Ada",
    peta_subrt: "Ada",
    dokumen_psls: "Ada",
    peta_terisi: "Ya",
    perubahan_batas: "Tidak",
    keterangan: "Sudah diserahkan ke tim lapangan.",
  },
  {
    idsubsls: "360201000200100",
    kode_kec: "010",
    nama_kec: "Rangkasbitung",
    kode_desa: "002",
    nama_desa: "Muara Ciujung Timur",
    nama_sls: "RT 001 / RW 002 Kp. Naruet",
    peta_desa: "Ada",
    peta_subrt: "Ada",
    dokumen_psls: "Tidak",
    peta_terisi: "Tidak",
    perubahan_batas: "Ada",
    keterangan: "Dokumen PSLS belum ditandatangani Ketua RT.",
  },
  {
    idsubsls: "360201000200200",
    kode_kec: "010",
    nama_kec: "Rangkasbitung",
    kode_desa: "002",
    nama_desa: "Muara Ciujung Timur",
    nama_sls: "RT 002 / RW 002 Kp. Naruet",
    peta_desa: "Ada",
    peta_subrt: "Tidak",
    dokumen_psls: "Ada",
    peta_terisi: "Ya",
    perubahan_batas: "Tidak",
    keterangan: "Peta Sub-RT perlu direvisi ukuran batasnya.",
  },
  {
    idsubsls: "360202000100100",
    kode_kec: "020",
    nama_kec: "Cibadak",
    kode_desa: "001",
    nama_desa: "Malangnengah",
    nama_sls: "RT 001 / RW 001 Kp. Malangnengah",
    peta_desa: "Tidak",
    peta_subrt: "-",
    dokumen_psls: "-",
    peta_terisi: "-",
    perubahan_batas: "-",
    keterangan: "Peta Desa belum dicetak dari BPS Provinsi.",
  },
  {
    idsubsls: "360202000200100",
    kode_kec: "020",
    nama_kec: "Cibadak",
    kode_desa: "002",
    nama_desa: "Pasar Keong",
    nama_sls: "RT 003 / RW 001 Kp. Dukuh",
    peta_desa: "Ada",
    peta_subrt: "Ada",
    dokumen_psls: "Ada",
    peta_terisi: "Ya",
    perubahan_batas: "Ada",
    keterangan: "Lengkap dengan perbaikan batas wilayah baru.",
  },
  {
    idsubsls: "360203000100100",
    kode_kec: "030",
    nama_kec: "Warunggunung",
    kode_desa: "001",
    nama_desa: "Elangnusa",
    nama_sls: "RT 001 / RW 001 Kp. Elang",
    peta_desa: "Ada",
    peta_subrt: "Ada",
    dokumen_psls: "Ada",
    peta_terisi: "Ya",
    perubahan_batas: "Tidak",
    keterangan: "Validasi selesai 100%.",
  },
  {
    idsubsls: "360204000100100",
    kode_kec: "040",
    nama_kec: "Bayah",
    kode_desa: "001",
    nama_desa: "Bayah Barat",
    nama_sls: "RT 001 / RW 001 Kp. Pulo",
    peta_desa: "Ada",
    peta_subrt: "Tidak",
    dokumen_psls: "Ada",
    peta_terisi: "Tidak",
    perubahan_batas: "Tidak",
    keterangan: "Menunggu konfirmasi petugas pesisir.",
  },
];
