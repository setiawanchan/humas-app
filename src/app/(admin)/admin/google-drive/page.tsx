"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function GoogleDriveAdminPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "administrator";

  const [copiedVar, setCopiedVar] = useState<string | null>(null);

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

      {/* Action Card: Connect Button */}
      <div className="rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-950/20 dark:to-amber-950/10 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 text-xs font-semibold">
              <span>⚡</span> OAuth 2.0 Admin Setup
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Hubungkan / Otorisasi Akun Google Drive
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 max-w-xl">
              Klik tombol di samping untuk masuk dengan akun Google Drive kantor BPS Lebak. Sistem akan menghasilkan <strong>Refresh Token</strong> yang digunakan aplikasi untuk membuat folder dan mengunggah berkas.
            </p>
          </div>

          <a
            href="/api/auth/google"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 font-semibold text-sm shadow-md hover:shadow-lg transition duration-200 cursor-pointer shrink-0"
          >
            <span>🔑</span>
            <span>Mulai Otorisasi Akun Google</span>
          </a>
        </div>
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
            Tersimpan langsung di dalam folder tahunan di root drive BPS:
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 font-mono text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700/60 leading-relaxed">
            📁 [Parent Folder]<br />
            &nbsp;&nbsp;└── 📁 2026<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 01.Januari<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 20260112_Sosialisasi SE2026<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📄 Foto1.jpg<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📄 Notulen.pdf
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
            Tersimpan rapi di dalam sub-folder khusus <strong>Arsip</strong>:
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 font-mono text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700/60 leading-relaxed">
            📁 [Parent Folder]<br />
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

