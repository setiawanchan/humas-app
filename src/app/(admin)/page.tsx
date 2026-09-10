"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  mockDocumentation,
  mockContentCalendar,
  mockArsip,
  mockUsers,
  ContentCalendarItem,
  Documentation,
} from "@/lib/mock-data";
import {
  getKalenderKontenFromSupabase,
  getDokumentasiFromSupabase,
} from "@/lib/supabase/kalender-service";
import DocumentationChart from "@/components/dashboard/DocumentationChart";
import ContentCalendarStatusChart from "@/components/dashboard/ContentCalendarStatusChart";

// Helper Format Tanggal Indonesia Ringkas
const formatIndonesianDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parts[2];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agust",
      "Sept",
      "Okt",
      "Nov",
      "Des",
    ];
    return `${day} ${months[monthIdx] || parts[1]}`;
  }
  return dateStr;
};

const getPicName = (picId: string) => {
  const user = mockUsers.find((u) => u.id === picId);
  return user ? user.nama : picId;
};

const getPlatformLabel = (platform: ContentCalendarItem["platform"]) => {
  switch (platform) {
    case "instagram":
      return "📸 Instagram";
    case "facebook":
      return "📘 Facebook";
    case "tiktok":
      return "🎵 TikTok";
    case "youtube":
      return "🔴 YouTube";
    case "website":
      return "🌐 Website";
    default:
      return "📱 " + (platform || "Media Sosial");
  }
};

export default function DashboardPage() {
  const { currentUser } = useAuth();

  const [calendarItems, setCalendarItems] = useState<ContentCalendarItem[]>([]);
  const [docItems, setDocItems] = useState<Documentation[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [kalenderData, dokData] = await Promise.all([
          getKalenderKontenFromSupabase(),
          getDokumentasiFromSupabase(),
        ]);

        if (kalenderData && kalenderData.length > 0) {
          setCalendarItems(kalenderData as ContentCalendarItem[]);
        } else {
          setCalendarItems(mockContentCalendar);
        }

        if (dokData && dokData.length > 0) {
          setDocItems(dokData as Documentation[]);
        } else {
          setDocItems(mockDocumentation);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      }
    }
    loadDashboardData();
  }, []);

  // Filter khusus 1 minggu terdekat & BELUM TERBIT (draft, siap, terjadwal)
  const upcomingContent = [...calendarItems]
    .filter((item) => item.status !== "terbit" && item.status !== "selesai")
    .sort((a, b) => (a.tanggal || "").localeCompare(b.tanggal || ""))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-500 to-orange-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">
              Selamat datang, {currentUser?.nama || "Pengguna"}!
            </h1>
          </div>
          <p className="text-orange-100 text-sm max-w-2xl">
            Sistem Humas Internal BPS Kabupaten Lebak — Mengelola dokumentasi kegiatan, kalender konten media sosial, dan arsip dokumen kantor.
          </p>
        </div>
      </div>

      {/* Widget Pengingat: Jadwal Konten 1 Minggu Terdekat (Tetap di Atas) */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/40 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">📢</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Pengingat: Jadwal Konten 1 Minggu Terdekat
            </h3>
          </div>
          <Link
            href="/kalender-konten"
            className="text-xs font-bold text-amber-700 hover:underline dark:text-amber-400 cursor-pointer flex items-center gap-1"
          >
            Buka Kalender Konten →
          </Link>
        </div>

        <div className="divide-y divide-amber-200/40 dark:divide-amber-800/30 text-xs">
          {upcomingContent.map((item) => (
            <div key={item.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 px-2.5 rounded-xl transition">
              <div className="flex items-center gap-2.5 truncate">
                <span className="font-bold text-amber-800 dark:text-amber-300 whitespace-nowrap bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded text-[11px] border border-amber-200 dark:border-amber-800">
                  📅 {formatIndonesianDate(item.tanggal)}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 whitespace-nowrap border border-sky-200 dark:border-sky-800">
                  {getPlatformLabel(item.platform)}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white truncate">
                  {item.judul}
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                <span>PIC: {getPicName(item.pic)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-brand-600 flex items-center justify-center font-bold text-xl">
            {docItems.length}
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {docItems.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Dokumentasi Kegiatan
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold text-xl">
            {calendarItems.length}
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {calendarItems.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Item Kalender Konten
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold text-xl">
            {mockArsip.length}
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {mockArsip.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Arsip Dokumen Kantor
            </div>
          </div>
        </div>
      </div>

      {/* Grafik Statistik Terpisah: Dokumentasi & Status Kalender Konten */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DocumentationChart />
        <ContentCalendarStatusChart />
      </div>
    </div>
  );
}
