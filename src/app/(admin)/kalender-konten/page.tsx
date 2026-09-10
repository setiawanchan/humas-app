"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { useAuth } from "@/context/AuthContext";
import {
  mockContentCalendar,
  ContentCalendarItem,
  mockUsers,
} from "@/lib/mock-data";
import { Modal } from "@/components/ui/modal";

// List Pilihan Platform Media Sosial
const PLATFORM_OPTIONS: { id: ContentCalendarItem["platform"]; label: string; icon: string }[] = [
  { id: "instagram", label: "Instagram", icon: "📸" },
  { id: "facebook", label: "Facebook", icon: "📘" },
  { id: "tiktok", label: "TikTok", icon: "🎵" },
  { id: "youtube", label: "YouTube", icon: "🔴" },
  { id: "website", label: "Website", icon: "🌐" },
  { id: "lainnya", label: "Platform Lainnya", icon: "📱" },
];

// Helper Format Tanggal Indonesia Lengkap (contoh: 26 September 2026)
const formatIndonesianDate = (dateStr: string) => {
  if (!dateStr) return "-";
  let year: number, monthIdx: number, day: number;

  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      monthIdx = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      monthIdx = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
  } else {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    year = d.getFullYear();
    monthIdx = d.getMonth();
    day = d.getDate();
  }

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  if (isNaN(day) || isNaN(monthIdx) || isNaN(year) || !months[monthIdx]) {
    return dateStr;
  }

  return `${day} ${months[monthIdx]} ${year}`;
};

// Helper Format ke DD-MM-YYYY
const formatToDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

// Helper Format ke ISO YYYY-MM-DD
const formatToISO = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

// Helper Nama PIC (Support single string atau array of IDs)
const getPicNames = (pic: string | string[] | undefined): string[] => {
  if (!pic) return ["-"];
  const ids = Array.isArray(pic) ? pic : [pic];
  return ids.map((id) => {
    const user = mockUsers.find((u) => u.id === id);
    return user ? user.nama : id;
  });
};

const getPicName = (pic: string | string[] | undefined): string => {
  const names = getPicNames(pic);
  return names.join(", ");
};

// Helper Styling Badge Status
const getStatusBadgeStyle = (status: ContentCalendarItem["status"]) => {
  switch (status) {
    case "draft":
    case "siap":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900";
    case "terjadwal":
      return "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900";
    case "terbit":
    case "selesai":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300";
  }
};

const getStatusLabel = (status: ContentCalendarItem["status"]) => {
  switch (status) {
    case "draft":
      return "Draft";
    case "siap":
      return "Siap";
    case "terjadwal":
      return "Terjadwal";
    case "terbit":
      return "Terbit";
    case "selesai":
      return "Selesai";
    default:
      return status;
  }
};

// Helper Label Platform
import {
  getKalenderKontenFromSupabase,
  insertKalenderKontenToSupabase,
} from "@/lib/supabase/kalender-service";

const getPlatformLabel = (platform: ContentCalendarItem["platform"]) => {
  const item = PLATFORM_OPTIONS.find((p) => p.id === platform);
  return item ? `${item.icon} ${item.label}` : `📱 ${platform || "Media Sosial"}`;
};

export default function KalenderKontenPage() {
  const { currentUser } = useAuth();

  // Role Pengelola: administrator & admin_humas
  const canManage =
    currentUser?.role === "administrator" || currentUser?.role === "admin_humas";

  // State Utama Data Items
  const [items, setItems] = useState<ContentCalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchKalender() {
      setIsLoading(true);
      const remote = await getKalenderKontenFromSupabase();
      if (remote && remote.length > 0) {
        setItems(remote as any);
      } else {
        setItems(mockContentCalendar);
      }
      setIsLoading(false);
    }
    fetchKalender();
  }, []);

  // State Tampilan Mode: "calendar" | "list"
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // State Tanggal yang sedang dilihat untuk Kalender Bulanan (Default Sept 2026 atau tanggal saat ini)
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date(2026, 8, 1); // 8 = September (0-indexed)
  });

  // State Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>("all");

  // State Modal Detail Item
  const [selectedItem, setSelectedItem] = useState<ContentCalendarItem | null>(null);

  // State Modal Form (Tambah / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentCalendarItem | null>(null);
  
  // State Copy Caption Feedback
  const [isCopied, setIsCopied] = useState(false);

  // State Form Input (Support Multiple PIC)
  const [formData, setFormData] = useState({
    judul: "",
    selectedPlatforms: ["instagram"] as ContentCalendarItem["platform"][], // Multi-select untuk Create mode
    platform: "instagram" as ContentCalendarItem["platform"], // Single platform untuk Edit mode
    tanggal: new Date().toISOString().split("T")[0],
    status: "draft" as ContentCalendarItem["status"],
    drive_link_bahan: "",
    deskripsi: "",
    caption: "",
    pic: [currentUser?.id || "u2"] as string[], // Multi-select array user IDs
  });

  // State Modal Konfirmasi Hapus
  const [deletingItem, setDeletingItem] = useState<ContentCalendarItem | null>(null);

  // State Notifikasi Pengingat Hari Ini
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState<any>(null);

  // Ref Flatpickr Date Picker
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFormOpen && dateInputRef.current) {
      const initialDate = formData.tanggal
        ? formatToDDMMYYYY(formData.tanggal)
        : formatToDDMMYYYY(new Date().toISOString().split("T")[0]);

      const fp = flatpickr(dateInputRef.current, {
        dateFormat: "d-m-Y",
        defaultDate: initialDate,
        allowInput: true,
        onChange: (_selectedDates, dateStr) => {
          if (dateStr) {
            setFormData((prev) => ({
              ...prev,
              tanggal: formatToISO(dateStr),
            }));
          }
        },
      });

      return () => {
        fp.destroy();
      };
    }
  }, [isFormOpen, formData.tanggal]);

  // Handler Pindah Bulan Kalender
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = parseInt(e.target.value, 10);
    setCurrentDate(new Date(currentDate.getFullYear(), month, 1));
  };

  const handleYearSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value, 10);
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
  };

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  // Komputasi Hari untuk Grid Kalender (Senin = Indeks 0 ... Minggu = Indeks 6)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const jsDay = new Date(year, month, 1).getDay(); // 0 = Minggu, 1 = Senin, ... 6 = Sabtu
    const firstDayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0 = Senin, 5 = Sabtu, 6 = Minggu
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, dateStr: null, isWeekend: false });
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const monthStr = (month + 1).toString().padStart(2, "0");
      const dayStr = d.toString().padStart(2, "0");
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const dayOfWeek = new Date(year, month, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      days.push({ dayNumber: d, dateStr, isWeekend });
    }

    return days;
  }, [currentDate]);

  // Data Terfilter
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matches =
          item.judul.toLowerCase().includes(q) ||
          item.deskripsi.toLowerCase().includes(q) ||
          getPicName(item.pic).toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Filter Status
      if (selectedStatusFilter !== "all" && item.status !== selectedStatusFilter) {
        return false;
      }

      // Filter Platform
      if (selectedPlatformFilter !== "all" && item.platform !== selectedPlatformFilter) {
        return false;
      }

      return true;
    });
  }, [items, searchQuery, selectedStatusFilter, selectedPlatformFilter]);

  // Map Item per Tanggal
  const itemsByDate = useMemo(() => {
    const map: Record<string, ContentCalendarItem[]> = {};
    filteredItems.forEach((item) => {
      if (!map[item.tanggal]) {
        map[item.tanggal] = [];
      }
      map[item.tanggal].push(item);
    });
    return map;
  }, [filteredItems]);

  // Toggle Selection Checkbox Platform saat Tambah Konten Baru
  const handlePlatformCheckboxToggle = (platId: ContentCalendarItem["platform"]) => {
    setFormData((prev) => {
      const exists = prev.selectedPlatforms.includes(platId);
      if (exists) {
        // Cegah uncheck jika hanya sisa 1 platform
        if (prev.selectedPlatforms.length === 1) return prev;
        return {
          ...prev,
          selectedPlatforms: prev.selectedPlatforms.filter((p) => p !== platId),
        };
      } else {
        return {
          ...prev,
          selectedPlatforms: [...prev.selectedPlatforms, platId],
        };
      }
    });
  };

  // Toggle Checkbox PIC
  const handlePicCheckboxToggle = (userId: string) => {
    setFormData((prev) => {
      const exists = prev.pic.includes(userId);
      if (exists) {
        if (prev.pic.length === 1) return prev; // Minimal 1 PIC terpilih
        return {
          ...prev,
          pic: prev.pic.filter((id) => id !== userId),
        };
      } else {
        return {
          ...prev,
          pic: [...prev.pic, userId],
        };
      }
    });
  };

  // Open Form Modal (Tambah Baru)
  const handleOpenCreateForm = (initialDateStr?: string) => {
    setEditingItem(null);
    setFormData({
      judul: "",
      selectedPlatforms: ["instagram"],
      platform: "instagram",
      tanggal: initialDateStr || new Date().toISOString().split("T")[0],
      status: "draft",
      drive_link_bahan: "",
      deskripsi: "",
      caption: "",
      pic: [currentUser?.id || "u2"],
    });
    setIsFormOpen(true);
  };

  // Open Form Modal (Edit)
  const handleOpenEditForm = (item: ContentCalendarItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingItem(item);
    const picArray = Array.isArray(item.pic) ? item.pic : [item.pic || currentUser?.id || "u2"];
    setFormData({
      judul: item.judul,
      selectedPlatforms: [item.platform],
      platform: item.platform,
      tanggal: item.tanggal,
      status: item.status,
      drive_link_bahan: item.drive_link_bahan || "",
      deskripsi: item.deskripsi,
      caption: item.caption || "",
      pic: picArray,
    });
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  // Quick Change Status dari Detail Modal
  const handleQuickStatusChange = (newStatus: ContentCalendarItem["status"]) => {
    if (!selectedItem) return;
    // TODO: Replace with Supabase update query
    setItems((prev) =>
      prev.map((i) => (i.id === selectedItem.id ? { ...i, status: newStatus } : i))
    );
    setSelectedItem((prev) => (prev ? { ...prev, status: newStatus } : null));
  };

  // Handler Trigger Manual Pengingat Hari Ini ke Gmail PIC
  const handleSendTodayReminders = async () => {
    setIsSendingReminder(true);
    setReminderResult(null);
    try {
      const res = await fetch("/api/cron/reminder-konten", {
        method: "POST",
      });
      const data = await res.json();
      setReminderResult(data);
    } catch (err: any) {
      setReminderResult({
        success: false,
        error: err?.message || "Gagal menghubungi server pengingat.",
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Submit Form Tambah / Edit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingItem) {
      // Mode Edit: Mengubah 1 baris item yang spesifik
      // TODO: Replace with Supabase update query
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? {
                ...i,
                judul: formData.judul,
                platform: formData.platform,
                tanggal: formData.tanggal,
                status: formData.status,
                drive_link_bahan: formData.drive_link_bahan,
                deskripsi: formData.deskripsi,
                caption: formData.caption,
                pic: formData.pic,
              }
            : i
        )
      );
    } else {
      // Mode Create: Auto-generate URL Google Drive Folder Bahan untuk setiap platform yang dipilih
      // TODO: Replace with Google Drive API call (googleDrive.createFolder(`Bahan - ${formData.judul}`))
      const slug = formData.judul
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const newItems: ContentCalendarItem[] = formData.selectedPlatforms.map(
        (plat, index) => ({
          id: `c_${Date.now()}_${index}`,
          judul: formData.judul,
          platform: plat,
          tanggal: formData.tanggal,
          status: formData.status,
          drive_link_bahan: `https://drive.google.com/drive/u/0/folders/bps-lebak-bahan-${slug || Date.now()}-${plat}`,
          deskripsi: formData.deskripsi,
          caption: formData.caption,
          pic: formData.pic,
        })
      );

      setItems((prev) => [...newItems, ...prev]);
    }

    setIsFormOpen(false);
  };

  // Trigger Hapus
  const handleOpenDeleteConfirm = (item: ContentCalendarItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingItem(item);
    setSelectedItem(null);
  };

  // Confirm Hapus
  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    // TODO: Replace with Supabase delete query
    setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
    setDeletingItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Kalender Konten Media Sosial
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Jadwal publikasi dan perancangan konten media sosial BPS Kabupaten Lebak
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle View Mode */}
          <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-1">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Grid Kalender
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Daftar List
            </button>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendTodayReminders}
                disabled={isSendingReminder}
                title="Kirim notifikasi email pengingat otomatis ke Gmail masing-masing PIC yang punya jadwal konten hari ini"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/80 text-sky-700 dark:text-sky-300 px-3.5 py-2.5 font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isSendingReminder ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <span>✉️</span>
                    <span>Kirim Pengingat Hari Ini</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleOpenCreateForm()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 font-semibold text-sm shadow-md transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                + Tambah Konten
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alert Feedback Hasil Kirim Pengingat Hari Ini */}
      {reminderResult && (
        <div
          className={`rounded-xl p-4 border text-xs transition relative flex items-start justify-between gap-3 ${
            reminderResult.success
              ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200"
              : "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200"
          }`}
        >
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>{reminderResult.success ? "✅" : "⚠️"}</span>
              <span>{reminderResult.success ? "Pengiriman Pengingat Selesai" : "Pengiriman Gagal"}</span>
            </div>
            <p className="opacity-90">
              {reminderResult.message ||
                `Berhasil mengirim ${reminderResult.emailsSent || 0} email dari ${
                  reminderResult.totalPicsInvolved || 0
                } PIC untuk ${reminderResult.totalContentsFound || 0} konten jadwal hari ini (${
                  reminderResult.targetDate || "-"
                }).`}
            </p>
            {reminderResult.details && reminderResult.details.length > 0 && (
              <div className="mt-2 space-y-1">
                {reminderResult.details.map((d: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px]">
                    <span className={d.success ? "text-emerald-700 font-bold dark:text-emerald-400" : "text-rose-600 font-bold dark:text-rose-400"}>
                      {d.success ? "✓" : "✗"}
                    </span>
                    <span className="font-semibold">{d.nama}</span>
                    <span className="opacity-75">({d.email})</span>:
                    <span className="italic">{d.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setReminderResult(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Highlight Banner Ringkas Pengingat Konten 1 Minggu Terdekat */}
      {items.length > 0 && (
        <div className="rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/70 dark:bg-sky-950/30 p-3.5 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-sky-100 dark:border-sky-900/60 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-base">📢</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                Pengingat Konten 1 Minggu Terdekat
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
              {items.filter((i) => i.status === "siap" || i.status === "terjadwal").length} Konten Menunggu
            </span>
          </div>

          <div className="divide-y divide-sky-100 dark:divide-sky-900/40 text-xs">
            {[...items]
              .filter((item) => item.status !== "terbit" && item.status !== "selesai")
              .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
              .slice(0, 3)
              .map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="py-1.5 flex items-center justify-between gap-3 hover:bg-sky-100/50 dark:hover:bg-sky-900/30 px-2 rounded-lg transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-[11px]">
                      📅 {formatIndonesianDate(item.tanggal)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white dark:bg-gray-800 text-sky-700 dark:text-sky-300 whitespace-nowrap">
                      {getPlatformLabel(item.platform)}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {item.judul}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-sky-600 dark:text-sky-400 font-semibold whitespace-nowrap shrink-0">
                    <span>Detail →</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Toolbar Filter & Navigation */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Navigasi Bulan & Tahun */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <select
                value={currentDate.getMonth()}
                onChange={handleMonthSelect}
                className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {monthNames.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={currentDate.getFullYear()}
                onChange={handleYearSelect}
                className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {Array.from({ length: 5 }, (_, i) => 2024 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition cursor-pointer"
              title="Bulan Berikutnya"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Search & Select Filter Status & Platform */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full md:w-auto">
            <input
              type="text"
              placeholder="Cari judul / PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">📌 Semua Status</option>
              <option value="draft">Draft</option>
              <option value="siap">Siap</option>
              <option value="terjadwal">Terjadwal</option>
              <option value="terbit">Terbit</option>
              <option value="selesai">Selesai</option>
            </select>

            <select
              value={selectedPlatformFilter}
              onChange={(e) => setSelectedPlatformFilter(e.target.value)}
              className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">📱 Semua Platform</option>
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ===================== VIEW MODE 1: GRID KALENDER BULANAN ===================== */}
      {viewMode === "calendar" && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          {/* Header Hari (Senin - Minggu) */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/50 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-3 uppercase tracking-wider">
            <div>Sen</div>
            <div>Sel</div>
            <div>Rab</div>
            <div>Kam</div>
            <div>Jum</div>
            <div className="text-rose-500 dark:text-rose-400 font-bold">Sab</div>
            <div className="text-rose-500 dark:text-rose-400 font-bold">Min</div>
          </div>

          {/* Grid Cells Tanggal */}
          <div className="grid grid-cols-7 auto-rows-fr border-b border-r border-gray-200 dark:border-gray-700 min-h-[500px]">
            {calendarDays.map((cell, idx) => {
              if (!cell.dayNumber) {
                return (
                  <div
                    key={`blank_${idx}`}
                    className="border-t border-l border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 min-h-[90px] p-1.5"
                  />
                );
              }

              const dateItems = cell.dateStr ? itemsByDate[cell.dateStr] || [] : [];
              const isToday =
                cell.dateStr === new Date().toISOString().split("T")[0];

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => {
                    if (canManage && cell.dateStr) {
                      handleOpenCreateForm(cell.dateStr);
                    }
                  }}
                  className={`border-t border-l border-gray-200 dark:border-gray-700 min-h-[100px] p-2 flex flex-col justify-between transition hover:bg-brand-50/20 dark:hover:bg-gray-700/50 group relative ${
                    canManage ? "cursor-pointer" : ""
                  } ${isToday ? "bg-brand-50/40 dark:bg-brand-950/20" : "bg-white dark:bg-gray-800"}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                          isToday
                            ? "bg-brand-500 text-white shadow-xs"
                            : cell.isWeekend
                            ? "text-rose-500 dark:text-rose-400 font-extrabold"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {canManage && cell.dateStr && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreateForm(cell.dateStr!);
                          }}
                          title="Tambah konten di tanggal ini"
                          className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md bg-brand-500 text-white flex items-center justify-center font-extrabold text-xs shadow-xs hover:bg-brand-600 transition cursor-pointer"
                        >
                          +
                        </button>
                      )}
                    </div>

                    {/* List Item Badges */}
                    <div className="space-y-1 mt-1">
                      {dateItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                          className={`p-1.5 rounded-lg border text-xs font-medium cursor-pointer transition shadow-2xs hover:scale-[1.02] ${getStatusBadgeStyle(
                            item.status
                          )}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate font-semibold">{item.judul}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[10px] opacity-85 mt-0.5">
                            <span>{getPlatformLabel(item.platform)}</span>
                            <span className="font-bold uppercase text-[9px] px-1 rounded bg-black/10 dark:bg-white/10">
                              {getStatusLabel(item.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== VIEW MODE 2: LIST VIEW ===================== */}
      {viewMode === "list" && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4 w-40">Tanggal</th>
                  <th className="py-3.5 px-4">Judul & Deskripsi</th>
                  <th className="py-3.5 px-4 w-36">Platform</th>
                  <th className="py-3.5 px-4 w-32">PIC</th>
                  <th className="py-3.5 px-4 w-28 text-center">Status</th>
                  <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400 text-xs">
                      Tidak ada data konten yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 text-center font-medium text-gray-400 text-xs">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatIndonesianDate(item.tanggal)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {item.judul}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                          {item.deskripsi}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                          {getPlatformLabel(item.platform)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex flex-wrap gap-1">
                          {getPicNames(item.pic).map((picName, pIdx) => (
                            <span
                              key={pIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-[11px] font-medium"
                            >
                              👤 {picName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeStyle(
                            item.status
                          )}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 text-xs font-semibold transition"
                          >
                            Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== MODAL DETAIL ITEM ===================== */}
      {selectedItem && (
        <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} showCloseButton={false} className="max-w-lg p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 mb-1">
                  {getPlatformLabel(selectedItem.platform)}
                </span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedItem.judul}
                </h2>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${getStatusBadgeStyle(
                  selectedItem.status
                )}`}
              >
                {getStatusLabel(selectedItem.status)}
              </span>
            </div>

            {/* Quick Status Change Dropdown untuk Pengelola */}
            {canManage && (
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Ubah Status Cepat ({getPlatformLabel(selectedItem.platform)}):
                </span>
                <select
                  value={selectedItem.status}
                  onChange={(e) =>
                    handleQuickStatusChange(e.target.value as ContentCalendarItem["status"])
                  }
                  className="py-1.5 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="draft">Draft</option>
                  <option value="siap">Siap</option>
                  <option value="terjadwal">Terjadwal</option>
                  <option value="terbit">Terbit</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Tanggal Publikasi</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatIndonesianDate(selectedItem.tanggal)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium mb-1">Penanggung Jawab (PIC)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {getPicNames(selectedItem.pic).map((picName, pIdx) => (
                      <span
                        key={pIdx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold text-xs border border-gray-200 dark:border-gray-600"
                      >
                        👤 {picName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-400 block font-medium mb-1">
                  Deskripsi / Catatan Posting
                </span>
                <p className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 whitespace-pre-line">
                  {selectedItem.deskripsi || "Tidak ada deskripsi."}
                </p>
              </div>

              {/* Section Caption Konten dengan Tombol Salin */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400 font-medium">Caption Konten</span>
                  {selectedItem.caption && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedItem.caption) {
                          navigator.clipboard.writeText(selectedItem.caption);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        }
                      }}
                      className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isCopied ? "✓ Tersalin ke Clipboard!" : "📋 Salin Caption"}
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800 whitespace-pre-line font-mono max-h-48 overflow-y-auto">
                  {selectedItem.caption || "Belum ada caption."}
                </div>
              </div>

              {selectedItem.drive_link_bahan && (
                <div>
                  <span className="text-xs text-gray-400 block font-medium mb-1">
                    Link Drive Bahan Posting
                  </span>
                  <a
                    href={selectedItem.drive_link_bahan}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 text-xs font-semibold transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Buka Bahan Drive
                  </a>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
              {canManage ? (
                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleOpenEditForm(selectedItem, e)}
                    className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Edit Item
                  </button>
                  <button
                    onClick={(e) => handleOpenDeleteConfirm(selectedItem, e)}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold transition cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <div />
              )}

              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================== MODAL FORM (TAMBAH / EDIT) ===================== */}
      {isFormOpen && (
        <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} showCloseButton={false} className="max-w-lg p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingItem ? "Edit Konten Media Sosial" : "Tambah Konten Media Sosial Baru"}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Judul Konten *
                </label>
                <input
                  type="text"
                  required
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  placeholder="Contoh: Infografis Inflasi September 2026"
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Pemilihan Platform: Multi-Select Checkboxes untuk Tambah, Dropdown untuk Edit */}
              {!editingItem ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Platform Media Sosial Target * (Bisa pilih lebih dari satu)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    {PLATFORM_OPTIONS.map((p) => {
                      const isChecked = formData.selectedPlatforms.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition ${
                            isChecked
                              ? "bg-brand-50 border-brand-300 text-brand-800 dark:bg-brand-950/40 dark:border-brand-800 dark:text-brand-300 shadow-2xs"
                              : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlePlatformCheckboxToggle(p.id)}
                            className="rounded text-brand-500 focus:ring-brand-500/20"
                          />
                          <span>
                            {p.icon} {p.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    * Memilih 2 platform atau lebih akan otomatis membuat baris terpisah untuk masing-masing platform agar status pelacakan dapat diubah secara independen.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Platform Media Sosial *
                  </label>
                  <select
                    value={formData.platform}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        platform: e.target.value as ContentCalendarItem["platform"],
                      })
                    }
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 font-semibold"
                  >
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Tanggal Publikasi *
                  </label>
                  <div className="relative">
                    <input
                      ref={dateInputRef}
                      type="text"
                      required
                      placeholder="DD-MM-YYYY"
                      value={formatToDDMMYYYY(formData.tanggal)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, tanggal: formatToISO(val) });
                      }}
                      className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 font-semibold cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as ContentCalendarItem["status"],
                      })
                    }
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 font-semibold"
                  >
                    <option value="draft">Draft</option>
                    <option value="siap">Siap</option>
                    <option value="terjadwal">Terjadwal</option>
                    <option value="terbit">Terbit</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Penanggung Jawab (PIC) * (Bisa pilih lebih dari 1 orang)
                  </label>
                  <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                    {formData.pic.length} PIC Terpilih
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 max-h-48 overflow-y-auto">
                  {mockUsers.map((u) => {
                    const isChecked = formData.pic.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked
                            ? "bg-brand-50 border-brand-300 text-brand-900 dark:bg-brand-950/40 dark:border-brand-800 dark:text-brand-200 font-semibold shadow-2xs"
                            : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handlePicCheckboxToggle(u.id)}
                          className="rounded text-brand-500 focus:ring-brand-500/20"
                        />
                        <div className="truncate">
                          <div className="truncate">{u.nama}</div>
                          <div className="text-[10px] opacity-70 truncate font-normal">
                            {u.role} • {u.email}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  * Email notifikasi pengingat otomatis akan dikirim ke seluruh PIC yang terpilih pada hari-H jadwal konten.
                </p>
              </div>

              {/* Note Informasi Pembuatan Folder Drive Bahan Otomatis */}
              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 text-xs text-sky-700 dark:text-sky-300 flex items-start gap-2">
                <span className="text-base leading-none">📁</span>
                <div>
                  <strong className="font-semibold block">Link Drive Bahan Posting</strong>
                  Folder Google Drive untuk bahan posting akan otomatis dibuat oleh sistem saat item disimpan.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Deskripsi / Catatan Posting
                </label>
                <textarea
                  rows={2}
                  value={formData.deskripsi}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi: e.target.value })
                  }
                  placeholder="Penjelasan detail atau arahan posting..."
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Caption Konten Media Sosial
                </label>
                <textarea
                  rows={4}
                  value={formData.caption}
                  onChange={(e) =>
                    setFormData({ ...formData, caption: e.target.value })
                  }
                  placeholder="Ketik atau tempel teks caption postingan di sini (termasuk hashtag & emoji)..."
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 font-mono text-xs"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow transition cursor-pointer"
                >
                  {editingItem ? "Simpan Perubahan" : "Tambah Konten"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ===================== MODAL KONFIRMASI HAPUS ===================== */}
      {deletingItem && (
        <Modal isOpen={!!deletingItem} onClose={() => setDeletingItem(null)} showCloseButton={false} className="max-w-md p-6">
          <div className="text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Konfirmasi Hapus
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Apakah Anda yakin ingin menghapus konten <strong className="text-gray-900 dark:text-white">"{deletingItem.judul}" ({getPlatformLabel(deletingItem.platform)})</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow transition cursor-pointer"
              >
                Ya, Hapus Konten
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
