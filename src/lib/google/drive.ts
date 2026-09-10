/**
 * Google Drive REST API Client (Native Fetch - Lightweight, no bulky googleapis dependency)
 * Handles OAuth 2.0 token refreshing, multi-tier folder creation, and file uploads.
 */

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

// 1. Dapatkan Access Token baru menggunakan Refresh Token
export async function getGoogleAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Konfigurasi Google Drive belum lengkap (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, atau GOOGLE_REFRESH_TOKEN belum disetel)."
    );
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data: GoogleTokenResponse = await response.json();
  if (!response.ok || !data.access_token) {
    console.error("Gagal refresh Google access token:", data);
    throw new Error("Gagal mendapatkan access token Google Drive. Cek refresh token Anda.");
  }

  return data.access_token;
}

// 2. Cari atau Buat Folder di dalam folder parent tertentu
export async function getOrCreateFolder(
  folderName: string,
  parentFolderId?: string
): Promise<{ id: string; webViewLink?: string }> {
  const accessToken = await getGoogleAccessToken();

  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,webViewLink)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return {
        id: searchData.files[0].id,
        webViewLink: searchData.files[0].webViewLink,
      };
    }
  }

  const metadata: Record<string, unknown> = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const createRes = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    }
  );

  const newFolder: DriveFileItem = await createRes.json();
  if (!createRes.ok || !newFolder.id) {
    console.error("Gagal membuat folder di Google Drive:", newFolder);
    throw new Error(`Gagal membuat folder "${folderName}" di Google Drive.`);
  }

  return {
    id: newFolder.id,
    webViewLink: newFolder.webViewLink,
  };
}

const INDONESIAN_MONTH_PREFIXES = [
  "01.Januari",
  "02.Februari",
  "03.Maret",
  "04.April",
  "05.Mei",
  "06.Juni",
  "07.Juli",
  "08.Agustus",
  "09.September",
  "10.Oktober",
  "11.November",
  "12.Desember",
];

export function getMonthFolderName(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return INDONESIAN_MONTH_PREFIXES[now.getMonth()];
  }
  return INDONESIAN_MONTH_PREFIXES[d.getMonth()];
}

export function formatActivityFolderName(dateStr: string, title: string): string {
  let yyyymmdd = "";
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    yyyymmdd = `${y}${m}${day}`;
  } else {
    yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  }

  const cleanTitle = title
    .replace(/[\\/:*?"<>|]/g, " ")
    .trim()
    .slice(0, 60);

  return `${yyyymmdd}_${cleanTitle}`;
}

// 3. Buat Hirarki Folder: [Parent] -> [Tahun] -> [Bulan] -> [Kegiatan]
export async function createActivityFolderHierarchy(
  dateStr: string,
  title: string
): Promise<{ folderId: string; webViewLink: string }> {
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || undefined;

  let yearStr = new Date().getFullYear().toString();
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    yearStr = d.getFullYear().toString();
  }

  const monthFolderStr = getMonthFolderName(dateStr);
  const activityFolderStr = formatActivityFolderName(dateStr, title);

  // 1. Folder Tahun (misal: 2026)
  const yearFolder = await getOrCreateFolder(yearStr, parentFolderId);

  // 2. Folder Bulan (misal: 01.Januari) di dalam folder Tahun
  const monthFolder = await getOrCreateFolder(monthFolderStr, yearFolder.id);

  // 3. Folder Kegiatan (misal: 20260112_Pelatihan Calangmen) di dalam folder Bulan
  const activityFolder = await getOrCreateFolder(activityFolderStr, monthFolder.id);

  const folderUrl =
    activityFolder.webViewLink ||
    `https://drive.google.com/drive/folders/${activityFolder.id}`;

  return {
    folderId: activityFolder.id,
    webViewLink: folderUrl,
  };
}

// 4. Upload File ke dalam Folder Google Drive Tertentu (Multipart upload)
export async function uploadFileToDriveFolder(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  targetFolderId: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const accessToken = await getGoogleAccessToken();

  const metadata = {
    name: fileName,
    parents: [targetFolderId],
  };

  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelimiter = "\r\n--" + boundary + "--";

  const multipartRequestBody = Buffer.concat([
    Buffer.from(
      delimiter +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`
    ),
    fileBuffer,
    Buffer.from(closeDelimiter),
  ]);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  const data = await uploadRes.json();
  if (!uploadRes.ok || !data.id) {
    console.error("Gagal mengupload file ke Drive:", data);
    throw new Error(`Gagal mengupload file "${fileName}" ke Google Drive.`);
  }

  return data;
}

