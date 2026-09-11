export interface ReminderContentData {
  id: string;
  judul: string;
  platform: string;
  status: string;
  deskripsi?: string;
  drive_link_bahan?: string;
  caption?: string;
  tanggal: string;
}

export function generateReminderEmailHtml(recipientName: string, contents: ReminderContentData[]): string {
  const contentItemsHtml = contents
    .map(
      (c) => `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="background: #0284c7; color: #ffffff; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">
          ${c.platform || "Media Sosial"}
        </span>
        <span style="background: #fef08a; color: #854d0e; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px;">
          Status: ${c.status}
        </span>
      </div>
      <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #0f172a; font-weight: 700;">
        ${c.judul}
      </h3>
      ${
        c.deskripsi
          ? `<p style="margin: 0 0 10px 0; font-size: 13px; color: #475569; line-height: 1.5;">${c.deskripsi}</p>`
          : ""
      }
      ${
        c.drive_link_bahan
          ? `
        <div style="margin-top: 10px;">
          <a href="${c.drive_link_bahan}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; text-decoration: none;">
            📁 Buka Folder Bahan di Google Drive
          </a>
        </div>
      `
          : ""
      }
    </div>
  `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Pengingat Konten Hari Ini</title>
    </head>
    <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%); padding: 28px 24px; text-align: left; color: #ffffff;">
          <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #93c5fd;">
            BPS KABUPATEN LEBAK • TIM HUMAS
          </p>
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">
            📅 Pengingat Konten Hari Ini
          </h1>
        </div>

        <!-- Body -->
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
            Halo <strong>${recipientName}</strong>,
          </p>
          <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
            Hari ini Anda terdaftar sebagai salah satu <strong>PIC (Person in Charge)</strong> untuk konten berikut yang dijadwalkan dibuat atau dipublikasikan hari ini:
          </p>

          <!-- List Konten -->
          <div style="margin-bottom: 24px;">
            ${contentItemsHtml}
          </div>

          <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b; line-height: 1.6;">
            Mohon pastikan bahan konten, desain, dan caption telah siap serta dipublikasikan sesuai jadwal. Jika konten telah terbit, jangan lupa perbarui statusnya di Kalender Konten.
          </p>

          <div style="text-align: center; margin: 24px 0 12px 0;">
            <a href="https://humas-app.vercel.app/kalender-konten" target="_blank" style="display: inline-block; background: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
              Buka Kalender Konten Humas →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
          Email ini dikirim otomatis oleh Sistem Pengingat Humas BPS Kabupaten Lebak.
        </div>
      </div>
    </body>
  </html>
  `;
}

export function generateReminderEmailText(recipientName: string, contents: ReminderContentData[]): string {
  const contentListText = contents
    .map((c, idx) => {
      let itemStr = `${idx + 1}. [${c.platform || "Media Sosial"}] ${c.judul} (Status: ${c.status})`;
      if (c.deskripsi) {
        itemStr += `\n   Deskripsi: ${c.deskripsi}`;
      }
      if (c.drive_link_bahan) {
        itemStr += `\n   Bahan Drive: ${c.drive_link_bahan}`;
      }
      return itemStr;
    })
    .join("\n\n");

  return [
    `Halo ${recipientName},`,
    "",
    "Hari ini Anda terdaftar sebagai PIC untuk jadwal konten BPS Kabupaten Lebak berikut:",
    "",
    contentListText,
    "",
    "Mohon pastikan bahan konten, desain, dan caption telah siap serta dipublikasikan sesuai jadwal.",
    "Buka Kalender Konten: https://humas-app.vercel.app/kalender-konten",
    "",
    "---",
    "Email ini dikirim otomatis oleh Sistem Pengingat Humas BPS Kabupaten Lebak.",
  ].join("\n");
}
