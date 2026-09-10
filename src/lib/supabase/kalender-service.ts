import { supabase } from "./client";

export interface KalenderKontenItem {
  id?: string;
  judul: string;
  platform: string;
  tanggal: string;
  status: string;
  drive_link_bahan?: string;
  deskripsi?: string;
  caption?: string;
  pic?: string;
}

export async function getKalenderKontenFromSupabase(): Promise<KalenderKontenItem[]> {
  const { data, error } = await supabase
    .from("kalender_konten")
    .select("*")
    .order("tanggal", { ascending: true });

  if (error) {
    console.error("Error fetching kalender_konten:", error);
    return [];
  }
  return data || [];
}

export async function insertKalenderKontenToSupabase(item: Partial<KalenderKontenItem>) {
  const { data, error } = await supabase.from("kalender_konten").insert(item).select();
  if (error) {
    console.error("Error inserting kalender_konten:", error);
    return null;
  }
  return data?.[0];
}

export interface DokumentasiItem {
  id?: string;
  judul: string;
  deskripsi: string;
  kategori?: string;
  tanggal_kegiatan: string;
  tags?: string[];
  drive_url?: string;
  uploaded_by?: string;
}

export async function getDokumentasiFromSupabase(): Promise<DokumentasiItem[]> {
  try {
    const { data, error } = await supabase
      .from("documentation")
      .select("*")
      .order("tanggal_kegiatan", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as DokumentasiItem[];
    }
  } catch (err) {
    console.warn("Supabase documentation fetch error:", err);
  }

  try {
    const { data: dataAlt, error: errorAlt } = await supabase
      .from("dokumentasi")
      .select("*")
      .order("tanggal_kegiatan", { ascending: false });

    if (!errorAlt && dataAlt && dataAlt.length > 0) {
      return dataAlt as DokumentasiItem[];
    }
  } catch (err) {
    console.warn("Supabase dokumentasi fetch error:", err);
  }

  return [];
}

