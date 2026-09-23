/**
 * FASIH DIRECT API BULK REJECTOR (AUTO-GENERATED DARI daftar_reject.txt)
 * Jalankan script ini langsung di Console DevTools (F12) tab FASIH Anda yang sudah login!
 * Total antrean: 21 penugasan
 */

(async function startBulkReject() {
    const assignmentUrls = [
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/0e11feb6-f933-45d4-b0c6-7d15fc0a1104",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/0e11feb6-f933-45d4-b0c6-7d15fc0a1104",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/147cb6a4-cac2-40ae-8a92-ecd4c377587c",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/147cb6a4-cac2-40ae-8a92-ecd4c377587c",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/1dbc5ba5-10c3-4623-86ee-41dc06c31a11",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/2c9561b4-6701-4652-9b85-ba2984ba5f54",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/4231ebd8-fdbf-4186-94c4-4917ab5ee710",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/5b261e84-c067-415a-b039-82a8e4c3df48",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/8ec584d7-8f23-4085-aa59-a4f3f0901b4a",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/94197bba-5027-4127-b33a-42fba6d28c7b",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/ad08cdb9-9eb0-46bd-9a7a-340874d52890",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/b0973731-4cd7-4bc5-8555-f439840075e8",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/b4763f86-5277-4855-9d2e-2e5e062793f7",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/b6aebd67-0667-4476-a7ea-d84ce888cf75",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/b8af1120-c315-495b-919e-11a320b867c6",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/b8af1120-c315-495b-919e-11a320b867c6",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/b8af1120-c315-495b-919e-11a320b867c6",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/c9cdc0de-ba57-42de-a2d1-acecac4732a5",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/ccd872e8-b361-42ee-85e3-1b533cd74330",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/f0d74cd9-8520-4d27-8def-2f22f21425bb",
        "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/f60719bb-48b0-409f-92f3-0e11cfd35704"
    ];

    const ENDPOINT = "https://fasih-sm.bps.go.id/app/api/assignment-approval/api/v2/approval";

    function extractAssignmentId(url) {
        const parts = url.trim().split('/');
        return parts[parts.length - 1];
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        return null;
    }

    function getCsrfToken() {
        // Cari di cookies standar Laravel / Spring / FASIH
        const cookieNames = ['XSRF-TOKEN', 'csrf_token', '_csrf', 'CSRF-TOKEN'];
        for (const name of cookieNames) {
            const val = getCookie(name);
            if (val) return val;
        }

        // Cari di meta tags
        const meta = document.querySelector('meta[name="csrf-token"], meta[name="_csrf"]');
        if (meta) return meta.getAttribute('content');

        // Cari di local / session storage
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.toLowerCase().includes('csrf')) return localStorage.getItem(k);
        }

        return "";
    }

    console.clear();
    console.log("%c==================================================", "color: #38bdf8; font-weight: bold;");
    console.log(`%c🚀 MEMULAI DIRECT API BULK REJECT (Total: ${assignmentUrls.length} penugasan)`, "color: #4ade80; font-size: 14px; font-weight: bold;");
    console.log("%c==================================================", "color: #38bdf8; font-weight: bold;");

    const csrfToken = getCsrfToken();
    console.log("%c[INFO] CSRF Token terdeteksi:", "color: #f59e0b; font-weight: bold;", csrfToken ? "ADA" : "TIDAK DITEMUKAN SECARA OTOMATIS");

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < assignmentUrls.length; i++) {
        const rawUrl = assignmentUrls[i];
        const assignmentId = extractAssignmentId(rawUrl);

        console.log(`%c[${i + 1}/${assignmentUrls.length}] Memproses ID: ${assignmentId}...`, "color: #94a3b8;");

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
            const response = await fetch(ENDPOINT, {
                method: "POST",
                headers: headers,
                credentials: "include",
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                console.log(`%c  [+] SUKSES: ID ${assignmentId} berhasil di-reject! (Status: ${response.status})`, "color: #22c55e; font-weight: bold;");
                successCount++;
            } else {
                const errText = await response.text();
                console.warn(`  [-] GAGAL: ID ${assignmentId} merespon status ${response.status}:`, errText);
                failedCount++;
            }
        } catch (err) {
            console.error(`  [-] ERROR JARINGAN pada ID ${assignmentId}:`, err);
            failedCount++;
        }

        // Delay 1 detik antar request
        await sleep(1000);
    }

    console.log("%c==================================================", "color: #38bdf8; font-weight: bold;");
    console.log(`%c🎉 SELESAI! Sukses: ${successCount} | Gagal: ${failedCount}`, "color: #38bdf8; font-size: 14px; font-weight: bold;");
    console.log("%c==================================================", "color: #38bdf8; font-weight: bold;");
    alert(`Proses Bulk Reject Selesai!\nSukses: ${successCount}\nGagal: ${failedCount}`);
})();
