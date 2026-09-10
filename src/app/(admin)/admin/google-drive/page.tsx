"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function GoogleDriveAdminPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "administrator";

  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const checkDriveStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch("/api/auth/google/status");
      const data = await res.json();
      setDriveStatus(data);
    } catch (err) {
      setDriveStatus({
        connected: false,
        message: "Gagal menghubungi server untuk cek status.",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  // Cek status secara otomatis saat pertama kali dibuka
  React.useEffect(() => {
    if (isAdmin) {
      checkDriveStatus();
    }
  }, [isAdmin]);

  const copyToClipboard = (text: string, varName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Akses Terbatas</h2>
        <p className="text-sm text-gray-500 mt-2">Hanya Administrator yang dapat mengakses halaman pengaturan ini.</p>
        <Link href="/" className="mt-4 inline-block px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-semibold">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span>📁</span> Integrasi Google Drive
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pusat otorisasi akun Google Drive untuk penyimpanan otomatis file Dokumentasi Kegiatan dan Arsip Dokumen Kantor BPS Kabupaten Lebak.
        </p>
      </div>

      {/* Action Card: Connect Button & Live Status */}
      <div className="rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-950/20 dark:to-amber-950/10 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 text-xs font-semibold">
                ⚡ OAuth 2.0 Admin Setup
              </span>
              {checkingStatus ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium">
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memeriksa koneksi...
                </span>
              ) : driveStatus?.connected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Terhubung ({driveStatus.user?.emailAddress || "Google Drive"})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  Belum Terhubung
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Hubungkan / Otorisasi Akun Google Drive
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 max-w-xl">
              Klik tombol di samping untuk masuk dengan akun Google Drive kantor BPS Lebak. Sistem akan menghasilkan <strong>Refresh Token</strong> yang digunakan aplikasi untuk membuat folder dan mengunggah berkas.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={checkDriveStatus}
              disabled={checkingStatus}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 px-4 py-3 font-semibold text-xs text-gray-700 dark:text-gray-200 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              🔄 Cek Status
            </button>
            <a
              href="/api/auth/google"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-5 py-3 font-semibold text-xs shadow-md hover:shadow-lg transition duration-200 cursor-pointer"
            >
              <span>🔑</span>
              <span>Mulai Otorisasi</span>
            </a>
          </div>
        </div>

        {/* Info detail hasil tes koneksi */}
        {driveStatus && (
          <div className={`p-4 rounded-xl text-xs border ${
            driveStatus.connected
              ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200"
              : "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <span>{driveStatus.connected ? "✅" : "⚠️"}</span>
                  <span>{driveStatus.message}</span>
                </div>
                {driveStatus.user && (
                  <p className="text-[11px] opacity-80">
                    Akun: <strong>{driveStatus.user.displayName}</strong> ({driveStatus.user.emailAddress})
                  </p>
                )}
                {driveStatus.parentFolderInfo && (
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Parent Folder: {driveStatus.parentFolderInfo.name ? (
                      <strong className="font-mono">{driveStatus.parentFolderInfo.name}</strong>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400">{driveStatus.parentFolderInfo.warning}</span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 shrink-0 text-[10px]">
                <span className={`px-2 py-0.5 rounded font-mono ${driveStatus.envStatus?.hasClientId ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"}`}>
                  CLIENT_ID: {driveStatus.envStatus?.hasClientId ? "✓" : "✗"}
                </span>
                <span className={`px-2 py-0.5 rounded font-mono ${driveStatus.envStatus?.hasClientSecret ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"}`}>
                  CLIENT_SECRET: {driveStatus.envStatus?.hasClientSecret ? "✓" : "✗"}
                </span>
                <span className={`px-2 py-0.5 rounded font-mono ${driveStatus.envStatus?.hasRefreshToken ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"}`}>
                  REFRESH_TOKEN: {driveStatus.envStatus?.hasRefreshToken ? "✓" : "✗"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Structure Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Struktur Dokumentasi */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📸</span>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Struktur Folder Dokumentasi Kegiatan
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tersimpan di dalam sub-folder <strong>Dokumentasi</strong>:
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 font-mono text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700/60 leading-relaxed">
            📁 Induk (13TsWALJI38xE55YxY1QOT9RsTpowq5y-)<br />
            &nbsp;&nbsp;└── 📁 Dokumentasi<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 2026<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 01.Januari<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 20260112_Sosialisasi SE2026<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📄 Foto1.jpg<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📄 Notulen.pdf
          </div>
        </div>

        {/* Struktur Arsip */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📂</span>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Struktur Folder Arsip Dokumen Kantor
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tersimpan di dalam sub-folder <strong>Arsip</strong>:
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 font-mono text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700/60 leading-relaxed">
            📁 Induk (13TsWALJI38xE55YxY1QOT9RsTpowq5y-)<br />
            &nbsp;&nbsp;└── 📁 Arsip<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 2026<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 01.Januari<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 20260115_SK Tim Humas 2026<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📄 SK_Humas.pdf
          </div>
        </div>
      </div>

      {/* Panduan Environment Variables */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span>⚙️</span> Daftar Environment Variables yang Diperlukan di Vercel
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tambahkan kunci-kunci berikut di <strong>Vercel Project Settings ➔ Environment Variables</strong>:
        </p>

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <span className="font-mono font-bold text-brand-600 dark:text-brand-400">GOOGLE_CLIENT_ID</span>
              <p className="text-[11px] text-gray-500">Diambil dari OAuth Credentials di Google Cloud Console</p>
            </div>
            <button
              onClick={() => copyToClipboard("GOOGLE_CLIENT_ID", "id")}
              className="px-2.5 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition"
            >
              {copiedVar === "id" ? "Disalin!" : "Salin Nama"}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <span className="font-mono font-bold text-brand-600 dark:text-brand-400">GOOGLE_CLIENT_SECRET</span>
              <p className="text-[11px] text-gray-500">Kunci rahasia dari Google Cloud Console</p>
            </div>
            <button
              onClick={() => copyToClipboard("GOOGLE_CLIENT_SECRET", "secret")}
              className="px-2.5 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition"
            >
              {copiedVar === "secret" ? "Disalin!" : "Salin Nama"}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <span className="font-mono font-bold text-brand-600 dark:text-brand-400">GOOGLE_REFRESH_TOKEN</span>
              <p className="text-[11px] text-gray-500">Didapatkan otomatis setelah Anda klik tombol "Mulai Otorisasi Akun Google" di atas</p>
            </div>
            <button
              onClick={() => copyToClipboard("GOOGLE_REFRESH_TOKEN", "token")}
              className="px-2.5 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition"
            >
              {copiedVar === "token" ? "Disalin!" : "Salin Nama"}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <span className="font-mono font-bold text-brand-600 dark:text-brand-400">GOOGLE_DRIVE_PARENT_FOLDER_ID</span>
              <p className="text-[11px] text-gray-500">ID folder induk Google Drive tempat semua file BPS disimpan (tertera pada URL browser Google Drive)</p>
            </div>
            <button
              onClick={() => copyToClipboard("GOOGLE_DRIVE_PARENT_FOLDER_ID", "parent")}
              className="px-2.5 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition"
            >
              {copiedVar === "parent" ? "Disalin!" : "Salin Nama"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

