/**
 * Native SMTP Client via Node.js net/tls socket
 * Tanpa perlu dependency eksternal tambahan (zero-dependency).
 * Mendukung autentikasi Gmail SMTP (smtp.gmail.com:465 dengan SSL).
 */

import tls from "tls";

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendGmail({ to, subject, html, text }: MailOptions): Promise<{ success: boolean; message: string }> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ""); // Bersihkan spasi app password jika ada

  if (!user || !pass) {
    console.warn("GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di environment variables.");
    return {
      success: false,
      message: "GMAIL_USER atau GMAIL_APP_PASSWORD belum disetel di .env",
    };
  }

  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) {
    return { success: false, message: "Tidak ada alamat email penerima." };
  }

  return new Promise((resolve) => {
    const socket = tls.connect(465, "smtp.gmail.com", { rejectUnauthorized: false }, () => {
      // Terhubung ke smtp.gmail.com:465
    });

    socket.setEncoding("utf-8");

    let step = 0;
    let logBuffer = "";

    const sendCmd = (cmd: string) => {
      socket.write(cmd + "\r\n");
    };

    const cleanup = (success: boolean, msg: string) => {
      try {
        socket.end();
      } catch {}
      resolve({ success, message: msg });
    };

    socket.on("error", (err) => {
      console.error("SMTP Socket Error:", err);
      cleanup(false, `Koneksi SMTP Error: ${err.message}`);
    });

    socket.on("data", (data: string) => {
      logBuffer += data;
      const code = parseInt(data.substring(0, 3), 10);

      // 1. Initial banner 220
      if (step === 0 && code === 220) {
        step = 1;
        sendCmd(`EHLO localhost`);
        return;
      }

      // 2. EHLO response 250
      if (step === 1 && code === 250) {
        // Hanya lanjut jika baris terakhir 250 (bukan 250-...)
        if (data.includes("250 ")) {
          step = 2;
          sendCmd("AUTH LOGIN");
        }
        return;
      }

      // 3. AUTH LOGIN prompt 334 (Username)
      if (step === 2 && code === 334) {
        step = 3;
        const b64User = Buffer.from(user).toString("base64");
        sendCmd(b64User);
        return;
      }

      // 4. Password prompt 334 (Password)
      if (step === 3 && code === 334) {
        step = 4;
        const b64Pass = Buffer.from(pass).toString("base64");
        sendCmd(b64Pass);
        return;
      }

      // 5. Auth Success 235
      if (step === 4 && code === 235) {
        step = 5;
        sendCmd(`MAIL FROM:<${user}>`);
        return;
      }

      // 6. MAIL FROM ok 250 -> kirim RCPT TO
      if (step === 5 && code === 250) {
        step = 6;
        // Kirim RCPT pertama
        sendCmd(`RCPT TO:<${recipients[0]}>`);
        return;
      }

      // 7. RCPT TO response 250
      if (step >= 6 && step < 6 + recipients.length && code === 250) {
        const nextIdx = step - 6 + 1;
        if (nextIdx < recipients.length) {
          step++;
          sendCmd(`RCPT TO:<${recipients[nextIdx]}>`);
        } else {
          step = 100; // Siap DATA
          sendCmd("DATA");
        }
        return;
      }

      // 8. DATA prompt 354
      if (step === 100 && code === 354) {
        step = 101;
        const boundary = "----=_Part_" + Date.now();
        const rawMessage = [
          `From: "Humas BPS Kab. Lebak" <${user}>`,
          `To: ${recipients.join(", ")}`,
          `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
          "MIME-Version: 1.0",
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          "",
          `--${boundary}`,
          "Content-Type: text/plain; charset=UTF-8",
          "Content-Transfer-Encoding: 7bit",
          "",
          text || "Pengingat Jadwal Konten BPS Kabupaten Lebak",
          "",
          `--${boundary}`,
          "Content-Type: text/html; charset=UTF-8",
          "Content-Transfer-Encoding: 7bit",
          "",
          html,
          "",
          `--${boundary}--`,
          ".",
        ].join("\r\n");

        sendCmd(rawMessage);
        return;
      }

      // 9. DATA queued 250
      if (step === 101 && code === 250) {
        step = 102;
        sendCmd("QUIT");
        cleanup(true, "Email berhasil dikirim ke " + recipients.join(", "));
        return;
      }

      // Error handling status code >= 400
      if (code >= 400) {
        console.error("SMTP Failed Step", step, "Response:", data);
        cleanup(false, `SMTP Gagal [Kode ${code}]: ${data.trim()}`);
        return;
      }
    });
  });
}
