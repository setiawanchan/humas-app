import { supabase } from "./client";
import { PengolahanRecord } from "../pengolahan-data";

// 1. Fetch seluruh data pengolahan_peta_2026 (dengan paginasi batch jika > 1000)
export async function getPengolahanPetaFromSupabase(): Promise<PengolahanRecord[]> {
  const allRecords: PengolahanRecord[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      const { data, error } = await supabase
        .from("pengolahan_peta_2026")
        .select("*")
        .order("idsubsls", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        // Jika tabel belum dibuat, tangkap pesan agar tidak crash
        console.warn("Info / Warning saat mengambil pengolahan_peta_2026:", error.message);
        break;
      }

      if (data && data.length > 0) {
        allRecords.push(...(data as PengolahanRecord[]));
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
    console.error("Error tidak terduga pada getPengolahanPetaFromSupabase:", err);
  }

  return allRecords;
}

// 2. Upsert single record pengolahan peta (status scan, olah, alokasi petugas, catatan)
export async function updatePengolahanRecordInSupabase(
  record: Partial<PengolahanRecord> & { idsubsls: string }
): Promise<boolean> {
  try {
    const payload = {
      ...record,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("pengolahan_peta_2026")
      .upsert(payload, { onConflict: "idsubsls" });

    if (error) {
      console.error("Error upserting pengolahan_peta_2026:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Unexpected error updating pengolahan record:", err);
    return false;
  }
}

// 3. Bulk upsert data pengolahan (misal dari hasil import excel mapping alokasi)
export async function bulkUpsertPengolahanRecordsInSupabase(
  records: Array<Partial<PengolahanRecord> & { idsubsls: string }>
): Promise<boolean> {
  const chunkSize = 500;
  try {
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize).map((item) => ({
        ...item,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("pengolahan_peta_2026")
        .upsert(chunk, { onConflict: "idsubsls" });

      if (error) {
        console.error("Error bulk upserting pengolahan chunk:", error);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error("Unexpected error in bulkUpsertPengolahanRecordsInSupabase:", err);
    return false;
  }
}
