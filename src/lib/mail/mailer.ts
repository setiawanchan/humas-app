import nodemailer from "nodemailer";

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendGmail({
  to,
  subject,
  html,
  text,
}: MailOptions): Promise<{ success: boolean; message: string }> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

  if (!user || !pass) {
    console.warn("GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di environment variables.");
    return {
      success: false,
      message: "GMAIL_USER atau GMAIL_APP_PASSWORD belum disetel di .env",
    };
  }

  const recipients = Array.isArray(to) ? to.join(", ") : to;
  if (!recipients) {
    return { success: false, message: "Tidak ada alamat email penerima." };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user,
        pass: pass,
      },
    });

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const senderDomain = user.includes("@") ? user.split("@")[1] : "gmail.com";
    const messageId = `<${timestamp}.${randomId}@${senderDomain}>`;

    const info = await transporter.sendMail({
      from: `"Humas BPS Kab. Lebak" <${user}>`,
      to: recipients,
      replyTo: `"Humas BPS Kab. Lebak" <${user}>`,
      subject: subject,
      text: text || "Pengingat Jadwal Konten BPS Kabupaten Lebak",
      html: html,
      headers: {
        "Message-ID": messageId,
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "All",
        "X-Entity-RefID": messageId,
        "X-Mailer": "Humas-App-Lebak-Mailer",
      },
    });

    return {
      success: true,
      message: `Email berhasil dikirim ke ${recipients} (ID: ${info.messageId})`,
    };
  } catch (error: any) {
    console.error("Nodemailer Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal mengirim email via Gmail SMTP.",
    };
  }
}
