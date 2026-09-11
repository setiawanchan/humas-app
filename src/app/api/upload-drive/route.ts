import { NextResponse } from "next/server";
import {
  createActivityFolderHierarchy,
  uploadFileToDriveFolder,
} from "@/lib/google/drive";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const judul = formData.get("judul") as string;
    const tanggal = (formData.get("tanggal_kegiatan") || formData.get("tanggal")) as string;
    const moduleType = ((formData.get("module") as string) || "dokumentasi") as "dokumentasi" | "arsip" | "kalender";
    const files = formData.getAll("files") as File[];

    if (!judul || !tanggal) {
      return NextResponse.json(
        { error: "Judul dan tanggal wajib diisi." },
        { status: 400 }
      );
    }

    // Cek apakah Google Drive Refresh Token sudah terkonfigurasi
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!refreshToken) {
      // Fallback: Jika belum setup Google Drive, generate URL link simulasi
      const slug = judul
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const simulatedDriveUrl = `https://drive.google.com/drive/u/0/folders/bps-lebak-${moduleType}-${slug || Date.now()}`;

      return NextResponse.json({
        success: true,
        drive_url: simulatedDriveUrl,
        is_simulated: true,
        message:
          "Google Drive belum terhubung via OAuth. Link Google Drive disimulasikan.",
      });
    }

    const existingFolderId = (formData.get("folder_id") as string) || "";
    const existingDriveUrl = (formData.get("drive_url") as string) || "";

    // 1. Dapatkan folder Google Drive tujuan:
    // Jika sudah ada folderId atau driveUrl, gunakan folder tersebut agar file baru ter-append ke folder lama
    let folderId = existingFolderId;
    let webViewLink = existingDriveUrl;

    if (!folderId && existingDriveUrl) {
      const match = existingDriveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        folderId = match[1];
      }
    }

    if (!folderId) {
      // Buat struktur folder hirarkis di Google Drive jika belum ada:
      // Dokumentasi: [Parent] -> Dokumentasi -> [Tahun] -> [Bulan] -> [Kegiatan]
      // Arsip:       [Parent] -> Arsip -> [Tahun] -> [Bulan] -> [Kegiatan]
      const hierarchy = await createActivityFolderHierarchy(
        tanggal,
        judul,
        moduleType
      );
      folderId = hierarchy.folderId;
      webViewLink = hierarchy.webViewLink;
    }

    // 2. Upload setiap file ke dalam folder kegiatan
    const uploadResults = [];
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.size > 0 && file.name) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const uploaded = await uploadFileToDriveFolder(
            buffer,
            file.name,
            file.type || "application/octet-stream",
            folderId
          );
          uploadResults.push(uploaded);
        }
      }
    }

    return NextResponse.json({
      success: true,
      folder_id: folderId,
      drive_url: webViewLink,
      uploaded_files_count: uploadResults.length,
      files: uploadResults,
    });
  } catch (error: any) {
    console.error("Error in /api/upload-drive:", error);
    return NextResponse.json(
      {
        error: "Gagal memproses upload ke Google Drive.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

