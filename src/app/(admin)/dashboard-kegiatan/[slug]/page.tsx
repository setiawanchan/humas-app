"use client";

import React, { use } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  mockDashboardPages,
  mockDashboardPageAccess,
  mockContentCalendar,
  mockDocumentation,
  ContentCalendarItem,
} from "@/lib/mock-data";
import Link from "next/link";

// Helper Format Tanggal Indonesia
const formatIndonesianDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parts[2];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agust", "Sept", "Okt", "Nov", "Des"];
    return `${day} ${months[monthIdx] || parts[1]}`;
  }
  return dateStr;
};

export default function DynamicDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { currentUser } = useAuth();

  // 1. Cari data Halaman Dashboard berdasarkan slug
  const pageData = mockDashboardPages.find((p) => p.slug === slug);

  // 2. Jika Halaman tidak ditemukan
  if (!pageData) {
    return (
      <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center space-y-3">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          404 - Halaman Dashboard Tidak Ditemukan
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Halaman dashboard kegiatan dengan slug <code className="font-mono text-brand-600 dark:text-brand-400">/dashboard-kegiatan/{slug}</code> tidak terdaftar di sistem.
        </p>
        <Link
          href="/"
          className="inline-block mt-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow transition"
        >
          ← Kembali ke Dashboard Utama
        </Link>
      </div>
    );
  }

  // 3. Cek Status Aktif Halaman
  if (!pageData.is_active) {
    return (
      <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center space-y-3">
        <h2 className="text-xl font-bold text-amber-700 dark:text-amber-400">
          Halaman Sedang Nonaktif
        </h2>
        <p className="text-sm text-amber-600 dark:text-amber-300">
          Halaman <strong className="font-semibold">{pageData.nama_page}</strong> saat ini sedang dinonaktifkan oleh Administrator.
        </p>
        <Link
          href="/"
          className="inline-block mt-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow transition"
        >
          ← Kembali ke Dashboard Utama
        </Link>
      </div>
    );
  }

  // 4. Validasi Hak Akses Granular (Role Match OR User ID Match)
  const pageAccessRules = mockDashboardPageAccess.filter(
    (a) => a.dashboard_page_id === pageData.id
  );

  const hasRoleAccess = pageAccessRules.some(
    (a) => a.access_type === "role" && a.role === currentUser?.role
  );

  const hasUserAccess = pageAccessRules.some(
    (a) => a.access_type === "user" && a.user_id === currentUser?.id
  );

  const isAllowed = hasRoleAccess || hasUserAccess;

  if (!isAllowed) {
    return (
      <div className="p-8 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center space-y-3">
        <h2 className="text-xl font-bold text-red-700 dark:text-red-400">
          Akses Ditolak
        </h2>
        <p className="text-sm text-red-600 dark:text-red-300">
          Akun Anda (<strong className="font-semibold">{currentUser?.nama}</strong> - <span className="font-mono">{currentUser?.role}</span>) tidak memiliki hak akses untuk membuka halaman <strong className="font-semibold">{pageData.nama_page}</strong>.
        </p>
        <p className="text-xs text-gray-500">
          Silakan hubungi Administrator jika Anda memerlukan akses ke halaman ini.
        </p>
        <Link
          href="/"
          className="inline-block mt-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow transition"
        >
          ← Kembali ke Dashboard Utama
        </Link>
      </div>
    );
  }

  // Filter Data Terkait Halaman
  const relatedContent = mockContentCalendar.slice(0, 3);
  const relatedDocs = mockDocumentation.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Banner Top */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-brand-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-white/20 backdrop-blur-sm border border-white/30">
              /dashboard-kegiatan/{slug}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
              ● Live Access Granted
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {pageData.nama_page}
          </h1>
          <p className="text-sky-100 text-sm max-w-2xl">
            {pageData.deskripsi || "Publikasi statistik & perkembangan pelaksanaan kegiatan BPS Kabupaten Lebak."}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-sky-100 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center font-bold text-xl">
            📊
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              100%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Progress Pendataan
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-brand-100 dark:bg-brand-950/40 text-brand-600 flex items-center justify-center font-bold text-xl">
            📸
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {relatedDocs.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Dokumentasi Terkait
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold text-xl">
            📢
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {relatedContent.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Konten Sosmed Terbit
            </div>
          </div>
        </div>
      </div>

      {/* Content Breakdown Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Widget 1: Dokumentasi Terkait */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-3">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              📁 Arsip Dokumentasi Terkait
            </h3>
            <Link href="/dokumentasi" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Lihat Semua →
            </Link>
          </div>
          <div className="space-y-2.5">
            {relatedDocs.map((doc) => (
              <div key={doc.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white line-clamp-1">{doc.judul}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">📅 {formatIndonesianDate(doc.tanggal_kegiatan)}</div>
                </div>
                <a
                  href={doc.drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 font-semibold whitespace-nowrap"
                >
                  File Drive
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 2: Rilis Konten Sosmed */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-3">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              📢 Publikasi Media Sosial
            </h3>
            <Link href="/kalender-konten" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Buka Kalender →
            </Link>
          </div>
          <div className="space-y-2.5">
            {relatedContent.map((c) => (
              <div key={c.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white line-clamp-1">{c.judul}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">📱 {c.platform.toUpperCase()} • 📅 {formatIndonesianDate(c.tanggal)}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[10px] uppercase whitespace-nowrap">
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
