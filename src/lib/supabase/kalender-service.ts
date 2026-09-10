import { supabase } from "./client";

export interface KalenderKontenItem {
  id?: string;
  judul: string;
  platform: string;
  tanggal: string;
  status: string;
  drive_link_bahan?: string;
  deskripsi?: string;
  pic?: string | string[];
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
  tanggal_kegiatan: string;
  deskripsi: string;
  drive_url?: string;
  uploaded_by?: string;
  created_at?: string;
}

export async function getDokumentasiFromSupabase(): Promise<DokumentasiItem[]> {
  try {
    const { data, error } = await supabase
      .from("dokumentasi")
      .select("*")
      .order("tanggal_kegiatan", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as DokumentasiItem[];
    }
  } catch (err) {
    console.warn("Supabase dokumentasi fetch error:", err);
  }

  // Fallback cek nama tabel documentation jika ada
  try {
    const { data: dataAlt, error: errorAlt } = await supabase
      .from("documentation")
      .select("*")
      .order("tanggal_kegiatan", { ascending: false });

    if (!errorAlt && dataAlt && dataAlt.length > 0) {
      return dataAlt as DokumentasiItem[];
    }
  } catch (err) {
    console.warn("Supabase documentation fallback error:", err);
  }

  return [];
}

export async function insertDokumentasiToSupabase(item: Omit<DokumentasiItem, "id">): Promise<DokumentasiItem | null> {
  const { data, error } = await supabase
    .from("dokumentasi")
    .insert(item)
    .select();

  if (error) {
    console.error("Error inserting dokumentasi:", error);
    return null;
  }
  return data?.[0] as DokumentasiItem;
}

export async function updateDokumentasiInSupabase(id: string, updatedData: Partial<DokumentasiItem>): Promise<boolean> {
  const { error } = await supabase
    .from("dokumentasi")
    .update(updatedData)
    .eq("id", id);

  if (error) {
    console.error("Error updating dokumentasi:", error);
    return false;
  }
  return true;
}

export async function deleteDokumentasiFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("dokumentasi")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting dokumentasi:", error);
    return false;
  }
  return true;
}

// ======================= CRUD ARSIP DOKUMEN KANTOR =======================
export interface ArsipItem {
  id?: string;
  judul: string;
  kategori: "sk" | "logo_aset" | "template_laporan" | "lainnya";
  deskripsi?: string;
  tanggal: string;
  tags?: string[];
  drive_url?: string;
  uploaded_by?: string;
  created_at?: string;
}

export async function getArsipFromSupabase(): Promise<ArsipItem[]> {
  try {
    const { data, error } = await supabase
      .from("arsip")
      .select("*")
      .order("tanggal", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as ArsipItem[];
    }
  } catch (err) {
    console.warn("Supabase arsip fetch error:", err);
  }
  return [];
}

export async function insertArsipToSupabase(item: Omit<ArsipItem, "id">): Promise<ArsipItem | null> {
  const { data, error } = await supabase
    .from("arsip")
    .insert(item)
    .select();

  if (error) {
    console.error("Error inserting arsip:", error);
    return null;
  }
  return data?.[0] as ArsipItem;
}

export async function updateArsipInSupabase(id: string, updatedData: Partial<ArsipItem>): Promise<boolean> {
  const { error } = await supabase
    .from("arsip")
    .update(updatedData)
    .eq("id", id);

  if (error) {
    console.error("Error updating arsip:", error);
    return false;
  }
  return true;
}

export async function deleteArsipFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("arsip")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting arsip:", error);
    return false;
  }
  return true;
}



