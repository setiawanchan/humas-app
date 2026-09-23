export interface FasihRejectItem {
  id: string;
  kecamatan: string | null;
  desa: string | null;
  sls: string | null;
  idsls: string | null;
  nama_usaha: string | null;
  link: string;
  assignment_id: string | null;
  status: "pending" | "rejected" | "failed";
  rejected_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function extractAssignmentId(url: string): string {
  try {
    const cleaned = url.trim().replace(/\/+$/, "");
    const parts = cleaned.split("/");
    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
}
