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
