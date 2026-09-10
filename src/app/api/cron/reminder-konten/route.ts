import { NextResponse } from "next/server";
import { getKalenderKontenFromSupabase } from "@/lib/supabase/kalender-service";
import { mockContentCalendar, mockUsers, ContentCalendarItem } from "@/lib/mock-data";
import { sendGmail } from "@/lib/mail/mailer";
import { generateReminderEmailHtml, ReminderContentData } from "@/lib/mail/template";

// Helper konversi tanggal hari ini WIB (UTC+7) ke format YYYY-MM-DD
function getTodayWIB(): string {
  const now = new Date();
  // UTC offset +7 jam (420 menit)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);
  return wib.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  return handleReminder(request);
}

export async function POST(request: Request) {
  return handleReminder(request);
}

async function handleReminder(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const testDate = searchParams.get("date"); // Opsional: untuk testing manual tanggal tertentu

    // Proteksi CRON_SECRET jika disetel di environment variables
    // Mendukung header Authorization dari Vercel Cron (`Bearer <CRON_SECRET>`) dan query parameter `?secret=...`
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret) {
      const authHeader = request.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
      const isAuthorized = secret === expectedSecret || bearerToken === expectedSecret;

      if (!isAuthorized) {
        return NextResponse.json(
          { error: "Unauthorized: Invalid or missing secret key" },
          { status: 401 }
        );
      }
    }

    const targetDate = testDate || getTodayWIB();

    // 1. Ambil data dari Supabase atau mock data
    let items: ContentCalendarItem[] = [];
    try {
      const dbItems = await getKalenderKontenFromSupabase();
      if (dbItems && dbItems.length > 0) {
        items = dbItems as any;
      }
    } catch (e) {
      console.warn("Gagal load dari Supabase, menggunakan mock fallback:", e);
    }

    if (items.length === 0) {
      items = mockContentCalendar;
    }

    // 2. Filter item konten yang jatuh tempo hari target dan belum selesai/terbit
    // Kriteria: tanggal == targetDate, status in ['draft', 'siap', 'terjadwal']
    const eligibleStatuses = ["draft", "siap", "terjadwal"];
    const targetItems = items.filter(
      (item) => item.tanggal === targetDate && eligibleStatuses.includes(item.status)
    );

    if (targetItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Tidak ada konten yang perlu diingatkan untuk tanggal ${targetDate}.`,
        targetDate,
        totalItems: 0,
        emailsSent: 0,
      });
    }

    // 3. Kelompokkan konten berdasarkan user PIC (bisa multiple PIC per item)
    // Map: userId -> ReminderContentData[]
    const picContentsMap = new Map<string, ReminderContentData[]>();

    for (const item of targetItems) {
      const pics: string[] = Array.isArray(item.pic)
        ? item.pic
        : typeof item.pic === "string"
        ? [item.pic]
        : [];

      for (const picId of pics) {
        if (!picId) continue;
        const currentList = picContentsMap.get(picId) || [];
        currentList.push({
          id: item.id,
          judul: item.judul,
          platform: item.platform,
          status: item.status,
          deskripsi: item.deskripsi,
          drive_link_bahan: item.drive_link_bahan,
          caption: item.caption,
          tanggal: item.tanggal,
        });
        picContentsMap.set(picId, currentList);
      }
    }

    // 4. Kirim email untuk setiap PIC
    const sendResults: {
      userId: string;
      email: string;
      nama: string;
      success: boolean;
      contentsCount: number;
      message: string;
    }[] = [];

    for (const [userId, userContents] of picContentsMap.entries()) {
      const user = mockUsers.find((u) => u.id === userId);
      if (!user || !user.email) {
        sendResults.push({
          userId,
          email: "-",
          nama: user ? user.nama : `User #${userId}`,
          success: false,
          contentsCount: userContents.length,
          message: "Email user tidak ditemukan.",
        });
        continue;
      }

      const emailHtml = generateReminderEmailHtml(user.nama, userContents);
      const subject = `[Pengingat Konten Hari Ini] ${userContents.length} Jadwal Konten BPS Lebak (${targetDate})`;

      const result = await sendGmail({
        to: user.email,
        subject,
        html: emailHtml,
      });

      sendResults.push({
        userId,
        email: user.email,
        nama: user.nama,
        success: result.success,
        contentsCount: userContents.length,
        message: result.message,
      });
    }

    const successfulEmails = sendResults.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      targetDate,
      totalContentsFound: targetItems.length,
      totalPicsInvolved: picContentsMap.size,
      emailsSent: successfulEmails,
      details: sendResults,
    });
  } catch (error: any) {
    console.error("Error in reminder route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
