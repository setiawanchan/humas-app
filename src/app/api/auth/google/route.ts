import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${new URL(request.url).origin}/api/auth/google/callback`;

  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_CLIENT_ID belum disetel di environment variables. Tambahkan ke .env.local atau dashboard Vercel.",
      },
      { status: 500 }
    );
  }

  // Scope akses file Google Drive
  const scopes = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent"); // Wajib agar Google memberikan Refresh Token

  return NextResponse.redirect(authUrl.toString());
}

