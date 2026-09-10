import { supabase } from "./client";
import { DokseItem } from "../dokse-data";

// 1. Fetch seluruh data dokse_2026 dari Supabase
export async function getDokseDataFromSupabase(): Promise<DokseItem[]> {
  const { data, error } = await supabase
    .from("dokse_2026")
    .select("*")
    .order("idsubsls", { ascending: true });

  if (error) {
    console.error("Error fetching dokse_2026 from Supabase:", error);
    return [];
  }

  return (data as DokseItem[]) || [];
}

// 2. Upsert / Update baris data dokse_2026 ke Supabase
export async function updateDokseItemInSupabase(item: DokseItem): Promise<boolean> {
  const { error } = await supabase
    .from("dokse_2026")
    .upsert(item, { onConflict: "idsubsls" });

  if (error) {
    console.error("Error updating dokse_2026 item in Supabase:", error);
    return false;
  }

  return true;
}

// 3. Bulk insert / import batch data dokse_2026
export async function bulkInsertDokseDataToSupabase(items: DokseItem[]): Promise<boolean> {
  const { error } = await supabase
    .from("dokse_2026")
    .upsert(items, { onConflict: "idsubsls" });

  if (error) {
    console.error("Error bulk inserting dokse_2026 items in Supabase:", error);
    return false;
  }

  return true;
}
