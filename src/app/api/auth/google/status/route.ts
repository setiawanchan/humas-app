import { NextResponse } from "next/server";
import {
  getGoogleAccessToken,
  DEFAULT_GOOGLE_DRIVE_PARENT_FOLDER_ID,
} from "@/lib/google/drive";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const parentFolderId =
    process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ||
    DEFAULT_GOOGLE_DRIVE_PARENT_FOLDER_ID;

  const envStatus = {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    hasRefreshToken: !!refreshToken,
    hasParentFolderId: !!parentFolderId,
  };

  // Jika konfigurasi dasar belum lengkap
  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({
      connected: false,
      message: "Environment variables Google Drive belum lengkap.",
      envStatus,
    });
  }

  try {
    // 1. Tes perolehan Access Token
    const accessToken = await getGoogleAccessToken();

    // 2. Tes panggil endpoint About / User Info dari Google Drive API v3
    const aboutRes = await fetch(
      "https://www.googleapis.com/drive/v3/about?fields=user,storageQuota",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!aboutRes.ok) {
      const errData = await aboutRes.json();
      return NextResponse.json({
        connected: false,
        message: "Gagal mengakses Google Drive API dengan token yang diberikan.",
        error: errData,
        envStatus,
      });
    }

    const aboutData = await aboutRes.json();

    // 3. Jika parentFolderId diisi, cek apakah folder tersebut ada dan bisa diakses
    let parentFolderInfo = null;
    if (parentFolderId) {
      const folderRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${parentFolderId}?fields=id,name,mimeType,webViewLink`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (folderRes.ok) {
        parentFolderInfo = await folderRes.json();
      } else {
        parentFolderInfo = {
          warning: "Folder ID di GOOGLE_DRIVE_PARENT_FOLDER_ID tidak ditemukan atau tidak memiliki izin akses.",
        };
      }
    }

    return NextResponse.json({
      connected: true,
      message: "Berhasil terhubung ke Google Drive!",
      user: aboutData.user,
      storageQuota: aboutData.storageQuota,
      parentFolderInfo,
      envStatus,
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      message: err.message || "Terjadi kesalahan saat memeriksa koneksi ke Google Drive.",
      envStatus,
    });
  }
}
