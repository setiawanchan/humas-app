import { supabase } from "./client";
import { DokseItem } from "../dokse-data";

// 1. Fetch seluruh data dokse_2026 dari Supabase (dengan pagination loop agar tidak terpotong 1.000 baris)
export async function getDokseDataFromSupabase(): Promise<DokseItem[]> {
  const allData: DokseItem[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      const { data, error } = await supabase
        .from("dokse_2026")
        .select("*")
        .order("idsubsls", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Error fetching dokse_2026 from Supabase:", error);
        break;
      }

      if (data && data.length > 0) {
        allData.push(...(data as DokseItem[]));
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }
  } catch (err) {
    console.error("Unexpected error in getDokseDataFromSupabase:", err);
  }

  return allData;
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

// 3. Bulk insert / import batch data dokse_2026 (dengan batch chunk 500 per request agar stabil)
export async function bulkInsertDokseDataToSupabase(items: DokseItem[]): Promise<boolean> {
  const chunkSize = 500;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("dokse_2026")
      .upsert(chunk, { onConflict: "idsubsls" });

    if (error) {
      console.error(`Error bulk inserting dokse_2026 items chunk ${i} - ${i + chunk.length}:`, error);
      return false;
    }
  }

  return true;
}
