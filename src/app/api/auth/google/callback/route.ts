import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new Response(
      `<html><body><h2>Autentikasi Google Drive Ditolak</h2><p>${error}</p></body></html>`,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
        status: 400,
      }
    );
  }

  if (!code) {
    return new Response(
      `<html><body><h2>Parameter 'code' tidak ditemukan</h2></body></html>`,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
        status: 400,
      }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.refresh_token) {
      return new Response(
        `<html>
          <body style="font-family: sans-serif; padding: 40px; line-height: 1.6;">
            <h2 style="color: #dc2626;">Gagal Mendapatkan Refresh Token</h2>
            <p>Google tidak mengembalikan Refresh Token. Kemungkinan akun ini sudah pernah diotorisasi sebelumnya tanpa prompt=consent.</p>
            <p><strong>Coba cabut izin aplikasi di <a href="https://myaccount.google.com/permissions" target="_blank">Google Account Permissions</a> lalu klik <a href="/api/auth/google">Otorisasi Ulang</a>.</strong></p>
            <pre style="background: #f1f5f9; padding: 15px; border-radius: 8px;">${JSON.stringify(
              tokenData,
              null,
              2
            )}</pre>
          </body>
        </html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const refreshToken = tokenData.refresh_token;

    // Tampilkan instruksi dan Refresh Token yang berhasil didapat
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Google Drive Refresh Token Berhasil Didapatkan</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px 20px; background: #f8fafc; color: #1e293b; max-width: 680px; margin: 0 auto; line-height: 1.6; }
            .card { background: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
            .badge { display: inline-block; padding: 4px 12px; background: #ecfdf5; color: #047857; font-weight: 600; font-size: 12px; border-radius: 9999px; margin-bottom: 12px; }
            h1 { font-size: 22px; margin: 0 0 10px 0; color: #0f172a; }
            p { font-size: 14px; color: #64748b; margin: 0 0 20px 0; }
            .token-box { background: #0f172a; color: #38bdf8; padding: 14px 18px; border-radius: 10px; font-family: monospace; font-size: 13px; word-break: break-all; margin-bottom: 20px; user-select: all; border: 1px solid #334155; }
            .steps { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; font-size: 13px; color: #334155; margin-bottom: 25px; }
            .steps ol { margin: 0; padding-left: 20px; }
            .steps li { margin-bottom: 6px; }
            .btn { display: inline-block; background: #ea580c; color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 13px; transition: background 0.2s; }
            .btn:hover { background: #c2410c; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">✓ Otorisasi Berhasil</span>
            <h1>Refresh Token Google Drive Berhasil Diperoleh!</h1>
            <p>Salin kode token di bawah ini dan pasang ke konfigurasi <strong>Environment Variables</strong> di Vercel.</p>

            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">GOOGLE_REFRESH_TOKEN:</label>
            <div class="token-box">${refreshToken}</div>

            <div class="steps">
              <strong>Langkah Selanjutnya:</strong>
              <ol>
                <li>Buka dashboard proyek Anda di <strong>Vercel</strong> -> <strong>Settings</strong> -> <strong>Environment Variables</strong>.</li>
                <li>Tambahkan variabel baru dengan nama <code>GOOGLE_REFRESH_TOKEN</code> dan isi nilainya dengan token di atas.</li>
                <li>Tambahkan juga <code>GOOGLE_DRIVE_PARENT_FOLDER_ID</code> (ID folder induk Google Drive BPS Lebak).</li>
                <li>Lakukan <strong>Redeploy</strong> agar aplikasi langsung siap mengunggah otomatis.</li>
              </ol>
            </div>

            <a href="/dokumentasi" class="btn">Kembali ke Halaman Dokumentasi →</a>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Error exchanging OAuth code", message: err.message },
      { status: 500 }
    );
  }
}

