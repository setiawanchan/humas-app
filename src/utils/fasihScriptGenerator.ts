import { FasihRejectItem } from "@/types/fasih-reject";

/**
 * Generate script browser console FASIH yang siap di-paste.
 * Script ini mengeksekusi direct approval reject ke endpoint FASIH
 * dan otomatis mengupdate status di Supabase setelah berhasil/gagal.
 */
export function generateBulkRejectScript(
  items: FasihRejectItem[],
  supabaseUrl: string,
  supabaseAnonKey: string
): string {
  const itemsJson = JSON.stringify(
    items.map((it) => ({
      id: it.id,
      link: it.link,
      assignmentId: it.assignment_id || it.link.trim().split("/").pop(),
      kecamatan: it.kecamatan || "",
      desa: it.desa || "",
      sls: it.sls || "",
      idsls: it.idsls || "",
      namaUsaha: it.nama_usaha || "",
    })),
    null,
    2
  );

  return `/**
 * FASIH DIRECT API BULK REJECTOR (AUTO-SYNC DENGAN HUMAS-APP)
 * Dibuat secara otomatis untuk ${items.length} penugasan terpilih.
 * Cara pakai: Buka Console DevTools (F12) pada tab FASIH yang sudah LOGIN, lalu paste script ini dan tekan Enter!
 */
(async function startBulkReject() {
  const SUPABASE_URL = "${supabaseUrl}";
  const SUPABASE_ANON_KEY = "${supabaseAnonKey}";
  const ENDPOINT_FASIH = "https://fasih-sm.bps.go.id/app/api/assignment-approval/api/v2/approval";

  const targetList = ${itemsJson};

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getCookie(name) {
    const value = '; ' + document.cookie;
    const parts = value.split('; ' + name + '=');
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
  }

  function getCsrfToken() {
    const cookieNames = ['XSRF-TOKEN', 'csrf_token', '_csrf', 'CSRF-TOKEN'];
    for (const name of cookieNames) {
      const val = getCookie(name);
      if (val) return val;
    }
    const meta = document.querySelector('meta[name="csrf-token"], meta[name="_csrf"]');
    if (meta) return meta.getAttribute('content');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.toLowerCase().includes('csrf')) return localStorage.getItem(k);
    }
    return "";
  }

  async function updateSupabaseStatus(itemId, status, notes = "") {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    try {
      const url = SUPABASE_URL.replace(/\\/+$/, '') + '/rest/v1/fasih_reject_items?id=eq.' + itemId;
      const body = {
        status: status,
        notes: notes,
        updated_at: new Date().toISOString()
      };
      if (status === 'rejected') {
        body.rejected_at = new Date().toISOString();
      }
      await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.warn('[Sync-Supabase] Gagal update status ID ' + itemId, e);
    }
  }

  console.clear();
  console.log("%c==================================================", "color: #38bdf8; font-weight: bold;");
  console.log("%c🚀 MEMULAI DIRECT API BULK REJECT (Total: " + targetList.length + " penugasan)", "color: #4ade80; font-size: 14px; font-weight: bold;");
  console.log("%c==================================================", "color: #38bdf8; font-weight: bold;");

  const csrfToken = getCsrfToken();
  console.log("%c[INFO] CSRF Token terdeteksi:", "color: #f59e0b; font-weight: bold;", csrfToken ? "ADA" : "TIDAK DITEMUKAN SECARA OTOMATIS");

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < targetList.length; i++) {
    const item = targetList[i];
    const assignmentId = item.assignmentId;
    const label = item.namaUsaha
      ? (item.namaUsaha + ' - ' + item.kecamatan + '/' + item.desa)
      : (item.kecamatan ? (item.kecamatan + ' - ' + item.desa + ' (' + item.idsls + ')') : assignmentId);

    console.log("%c[" + (i + 1) + "/" + targetList.length + "] Memproses: " + label + "...", "color: #94a3b8;");

    const payload = {
      assignmentId: assignmentId,
      statusApproval: "false",
      comment: JSON.stringify({ dataKey: "", notes: [] })
    };

    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/plain, */*"
    };

    if (csrfToken) {
      headers["X-CSRF-TOKEN"] = csrfToken;
      headers["X-XSRF-TOKEN"] = csrfToken;
      headers["X-CSRF-Token"] = csrfToken;
    }

    try {
      const response = await fetch(ENDPOINT_FASIH, {
        method: "POST",
        headers: headers,
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log("%c  [+] SUKSES: ID " + assignmentId + " berhasil di-reject! (Status: " + response.status + ")", "color: #22c55e; font-weight: bold;");
        successCount++;
        // Update realtime ke database Supabase
        await updateSupabaseStatus(item.id, 'rejected', 'Berhasil via console FASIH');
      } else {
        const errText = await response.text();
        console.warn("  [-] GAGAL: ID " + assignmentId + " merespon status " + response.status + ":", errText);
        failedCount++;
        await updateSupabaseStatus(item.id, 'failed', 'HTTP ' + response.status + ': ' + errText.substring(0, 100));
      }
    } catch (err) {
      console.error("  [-] ERROR JARINGAN pada ID " + assignmentId + ":", err);
      failedCount++;
      await updateSupabaseStatus(item.id, 'failed', 'Error Jaringan: ' + err.message);
    }

    // Delay 1 detik antar request agar tidak membebani server
    await sleep(1000);
  }

  console.log("%c==================================================", "color: #38bdf8; font-weight: bold;");
  console.log("%c🎉 SELESAI! Sukses: " + successCount + " | Gagal: " + failedCount, "color: #38bdf8; font-size: 14px; font-weight: bold;");
  console.log("%cStatus di web humas-app telah diperbarui secara otomatis!", "color: #4ade80;");
  console.log("%c==================================================", "color: #38bdf8; font-weight: bold;");

  alert("Proses Bulk Reject Selesai!\\nSukses: " + successCount + "\\nGagal: " + failedCount + "\\nData di web otomatis terupdate!");
})();`;
}
