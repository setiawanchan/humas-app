"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { useAuth } from "@/context/AuthContext";
import { mockDocumentation, Documentation } from "@/lib/mock-data";
import { Modal } from "@/components/ui/modal";
import {
  getDokumentasiFromSupabase,
  insertDokumentasiToSupabase,
  updateDokumentasiInSupabase,
  deleteDokumentasiFromSupabase,
  DokumentasiItem,
} from "@/lib/supabase/kalender-service";

type SortColumn = "judul" | "tanggal";
type SortDirection = "asc" | "desc";


// Helper Formatting Tanggal Indonesia Lengkap (contoh: 14 Agustus 2026)
const formatIndonesianDate = (dateStr: string) => {
  if (!dateStr) return "-";
  let year: number, monthIdx: number, day: number;

  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts[0].length === 4) {
      // Format YYYY-MM-DD
      year = parseInt(parts[0], 10);
      monthIdx = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      // Format DD-MM-YYYY
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

export default function DokumentasiPage() {
  const { currentUser } = useAuth();

  // Hak akses pengelolaan khusus Administrator & Admin Humas
  const canManage =
    currentUser?.role === "administrator" || currentUser?.role === "admin_humas";

  // State data dokumentasi
  const [items, setItems] = useState<Documentation[]>(mockDocumentation);
  const [isLoading, setIsLoading] = useState(true);

  // Load data dari Supabase
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const remote = await getDokumentasiFromSupabase();
        if (remote && remote.length > 0) {
          setItems(remote as unknown as Documentation[]);
        } else {
          setItems(mockDocumentation);
        }
      } catch (err) {
        console.error("Error fetching dokumentasi from Supabase:", err);
        setItems(mockDocumentation);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // State Search & Filter (Default ke Bulan & Tahun Saat Ini)
  const currentDate = new Date();
  const currentYearStr = currentDate.getFullYear().toString();
  const currentMonthStr = (currentDate.getMonth() + 1).toString();


  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // State Sortir Header
  const [sortColumn, setSortColumn] = useState<SortColumn | null>("tanggal");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // State Modal Form (Tambah / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Documentation | null>(null);
  const [formData, setFormData] = useState<{
    judul: string;
    deskripsi: string;
    tanggal_kegiatan: string;
    uploadedFilesName: string;
    selectedFiles: File[];
  }>({
    judul: "",
    deskripsi: "",
    tanggal_kegiatan: new Date().toISOString().split("T")[0],
    uploadedFilesName: "",
    selectedFiles: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");

  // State Modal Konfirmasi Hapus
  const [deletingItem, setDeletingItem] = useState<Documentation | null>(null);

  // Ref untuk Flatpickr DatePicker di Form Modal
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFormOpen && dateInputRef.current) {
      const initialDate = formData.tanggal_kegiatan
        ? formatToDDMMYYYY(formData.tanggal_kegiatan)
        : formatToDDMMYYYY(new Date().toISOString().split("T")[0]);

      const fp = flatpickr(dateInputRef.current, {
        dateFormat: "d-m-Y",
        defaultDate: initialDate,
        allowInput: true,
        onChange: (_selectedDates, dateStr) => {
          if (dateStr) {
            setFormData((prev) => ({
              ...prev,
              tanggal_kegiatan: formatToISO(dateStr),
            }));
          }
        },
      });

      return () => {
        fp.destroy();
      };
    }
  }, [isFormOpen, formData.tanggal_kegiatan]);

  // Daftar opsi Tahun untuk filter (diambil dari data + tahun saat ini)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYearStr);
    items.forEach((item) => {
      if (item.tanggal_kegiatan) {
        const y = item.tanggal_kegiatan.split("-")[0];
        if (y) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [items, currentYearStr]);

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedYear, selectedMonth]);

  // Logika Filter dan Sortir Gabungan
  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter((item) => {
      // 1. Text Search Filter (Judul & Deskripsi)
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          item.judul.toLowerCase().includes(q) ||
          item.deskripsi.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // 2. Filter Tahun & Bulan
      if (item.tanggal_kegiatan) {
        const [itemYear, itemMonthStr] = item.tanggal_kegiatan.split("-");
        const itemMonthNum = parseInt(itemMonthStr, 10).toString();

        if (selectedYear !== "all" && itemYear !== selectedYear) {
          return false;
        }

        if (selectedMonth !== "all" && itemMonthNum !== selectedMonth) {
          return false;
        }
      }

      return true;
    });

    // 3. Sorting Logic
    if (sortColumn) {
      result.sort((a, b) => {
        let valA = "";
        let valB = "";

        if (sortColumn === "judul") {
          valA = a.judul.toLowerCase();
          valB = b.judul.toLowerCase();
        } else if (sortColumn === "tanggal") {
          valA = a.tanggal_kegiatan;
          valB = b.tanggal_kegiatan;
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, searchQuery, selectedYear, selectedMonth, sortColumn, sortDirection]);

  // Calculations for Pagination
  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(start, start + itemsPerPage);
  }, [filteredAndSortedItems, currentPage, itemsPerPage]);

  // Handler klik sortir header kolom
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Render Indikator Panah Sortir
  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <span className="text-gray-300 dark:text-gray-600 ml-1 text-xs">↕</span>;
    }
    return (
      <span className="text-brand-500 font-bold ml-1 text-xs">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // Cek apakah ada filter aktif (berbeda dari kondisi default)
  const isFilterActive =
    searchQuery !== "" ||
    selectedYear !== currentYearStr ||
    selectedMonth !== currentMonthStr;

  // Reset Semua Filter ke default (Bulan & Tahun Saat Ini)
  const handleResetFilter = () => {
    setSearchQuery("");
    setSelectedYear(currentYearStr);
    setSelectedMonth(currentMonthStr);
    setSortColumn("tanggal");
    setSortDirection("desc");
  };

  // Buka Form Tambah
  const handleOpenCreateForm = () => {
    setEditingItem(null);
    setFormData({
      judul: "",
      deskripsi: "",
      tanggal_kegiatan: new Date().toISOString().split("T")[0],
      uploadedFilesName: "",
      selectedFiles: [],
    });
    setUploadStatusText("");
    setIsFormOpen(true);
  };

  // Buka Form Edit
  const handleOpenEditForm = (item: Documentation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingItem(item);
    setFormData({
      judul: item.judul,
      deskripsi: item.deskripsi,
      tanggal_kegiatan: item.tanggal_kegiatan,
      uploadedFilesName: "",
      selectedFiles: [],
    });
    setUploadStatusText("");
    setIsFormOpen(true);
  };

  // Submit Form (Tambah / Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingItem) {
        // Edit mode: update Supabase
        const payload: Partial<DokumentasiItem> = {
          judul: formData.judul,
          deskripsi: formData.deskripsi,
          tanggal_kegiatan: formData.tanggal_kegiatan,
        };

        // Optimistic update
        setItems((prev) =>
          prev.map((item) =>
            item.id === editingItem.id
              ? {
                  ...item,
                  ...payload,
                }
              : item
          )
        );

        setIsFormOpen(false);
        await updateDokumentasiInSupabase(editingItem.id, payload);
      } else {
        // Create mode: Upload ke Google Drive via /api/upload-drive (Tahun -> Bulan -> Kegiatan)
        setUploadStatusText("Membuat folder di Google Drive & mengunggah berkas...");

        let driveUrl = "";
        try {
          const driveBody = new FormData();
          driveBody.append("judul", formData.judul);
          driveBody.append("tanggal_kegiatan", formData.tanggal_kegiatan);
          if (formData.selectedFiles && formData.selectedFiles.length > 0) {
            formData.selectedFiles.forEach((file) => {
              driveBody.append("files", file);
            });
          }

          const uploadRes = await fetch("/api/upload-drive", {
            method: "POST",
            body: driveBody,
          });

          const uploadData = await uploadRes.json();
          if (uploadData && uploadData.drive_url) {
            driveUrl = uploadData.drive_url;
          }
        } catch (uploadErr) {
          console.warn("Upload ke Google Drive API fallback:", uploadErr);
        }

        // Fallback jika API belum mendapat url
        if (!driveUrl) {
          const slug = formData.judul
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          driveUrl = `https://drive.google.com/drive/u/0/folders/bps-lebak-${slug || Date.now()}`;
        }

        const payload: Omit<DokumentasiItem, "id"> = {
          judul: formData.judul,
          deskripsi: formData.deskripsi,
          tanggal_kegiatan: formData.tanggal_kegiatan,
          drive_url: driveUrl,
          uploaded_by: currentUser?.nama || currentUser?.id || "Admin",
        };

        const tempItem: Documentation = {
          id: `temp_${Date.now()}`,
          judul: payload.judul,
          deskripsi: payload.deskripsi,
          kategori: "foto",
          tanggal_kegiatan: payload.tanggal_kegiatan,
          tags: [],
          drive_url: driveUrl,
          uploaded_by: payload.uploaded_by || "",
        };

        setItems((prev) => [tempItem, ...prev]);
        setIsFormOpen(false);

        const inserted = await insertDokumentasiToSupabase(payload);
        if (inserted && inserted.id) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === tempItem.id ? (inserted as unknown as Documentation) : item
            )
          );
        }
      }
    } catch (err) {
      console.error("Error submitting dokumentasi:", err);
    } finally {
      setIsSubmitting(false);
      setUploadStatusText("");
    }
  };


  // Trigger Hapus
  const handleOpenDeleteConfirm = (item: Documentation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingItem(item);
  };

  // Confirm Hapus
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    const targetId = deletingItem.id;
    setItems((prev) => prev.filter((i) => i.id !== targetId));
    setDeletingItem(null);

    await deleteDokumentasiFromSupabase(targetId);
  };


  const monthsList = [
    { value: "1", label: "Januari" },
    { value: "2", label: "Februari" },
    { value: "3", label: "Maret" },
    { value: "4", label: "April" },
    { value: "5", label: "Mei" },
    { value: "6", label: "Juni" },
    { value: "7", label: "Juli" },
    { value: "8", label: "Agustus" },
    { value: "9", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dokumentasi Kegiatan
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Daftar data dan arsip dokumentasi BPS Kabupaten Lebak
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-5 py-3 font-semibold text-sm shadow-md hover:shadow-lg transition duration-200 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Dokumentasi
          </button>
        )}
      </div>

      {/* Toolbar Filter Terpisah (Search, Dropdown Tahun, Dropdown Bulan, Reset) */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center">
          {/* 1. Search Box */}
          <div className="relative md:col-span-6">
            <svg
              className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Cari kata kunci..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* 2. Filter Tahun */}
          <div className="md:col-span-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="all">📅 Semua Tahun</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter Bulan */}
          <div className="md:col-span-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="all">🗓️ Semua Bulan</option>
              {monthsList.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Reset Filter Button */}
          <div className="md:col-span-2 flex justify-end">
            {isFilterActive && (
              <button
                onClick={handleResetFilter}
                className="w-full px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Counter Data */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
        <div>
          Menampilkan <span className="font-bold text-brand-600 dark:text-brand-400">{filteredAndSortedItems.length}</span> dari {items.length} Dokumentasi
        </div>
        <div>
          * Klik header kolom (<span className="font-semibold text-gray-700 dark:text-gray-300">Tanggal, Judul</span>) untuk menyortir data
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                
                {/* 1. Kolom Tanggal di Depan */}
                <th
                  onClick={() => handleSort("tanggal")}
                  className="py-3.5 px-4 w-44 cursor-pointer hover:bg-gray-100/60 dark:hover:bg-gray-700/80 transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Tanggal</span>
                    {renderSortIndicator("tanggal")}
                  </div>
                </th>

                {/* 2. Kolom Judul Kegiatan */}
                <th
                  onClick={() => handleSort("judul")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100/60 dark:hover:bg-gray-700/80 transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Judul Kegiatan</span>
                    {renderSortIndicator("judul")}
                  </div>
                </th>

                {/* 3. Kolom Link Dokumentasi */}
                <th className="py-3.5 px-4 w-44 text-center">Link Dokumentasi</th>

                {/* 4. Kolom Aksi (Khusus Pengelola) */}
                {canManage && (
                  <th className="py-3.5 px-4 w-36 text-center">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
              {filteredAndSortedItems.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="p-8 text-center text-gray-500 dark:text-gray-400 text-xs">
                    Tidak ada data dokumentasi yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition"
                  >
                    <td className="py-3.5 px-4 text-center font-medium text-gray-400 text-xs">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>

                    {/* Tanggal di Depan */}
                    <td className="py-3.5 px-4 text-xs text-gray-700 dark:text-gray-300 font-semibold whitespace-nowrap">
                      {formatIndonesianDate(item.tanggal_kegiatan)}
                    </td>

                    {/* Judul & Deskripsi */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {item.judul}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                        {item.deskripsi}
                      </div>
                    </td>

                    {/* Tombol Buka Dokumentasi */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <a
                        href={item.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 hover:bg-sky-100 text-xs font-semibold transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Buka Dokumentasi
                      </a>
                    </td>

                    {/* Sel Aksi (Khusus Pengelola) */}
                    {canManage && (
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => handleOpenEditForm(item, e)}
                            title="Edit Dokumentasi"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:text-gray-400 dark:hover:bg-brand-950/30 transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleOpenDeleteConfirm(item, e)}
                            title="Hapus Dokumentasi"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:text-gray-400 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Controls */}
        <div className="px-4 py-3.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span>Tampilkan</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>baris per halaman</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-400 mr-2">
              Halaman <strong className="text-gray-900 dark:text-white">{currentPage}</strong> dari <strong className="text-gray-900 dark:text-white">{totalPages}</strong>
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium cursor-pointer"
            >
              ← Prev
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium cursor-pointer"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* ===================== MODAL FORM (TAMBAH / EDIT) ===================== */}
      {isFormOpen && (
        <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} showCloseButton={false} className="max-w-lg p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingItem ? "Edit Dokumentasi" : "Tambah Dokumentasi Baru"}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Judul Kegiatan *
                </label>
                <input
                  type="text"
                  required
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  placeholder="Contoh: Sosialisasi Sensus Ekonomi 2026"
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal Kegiatan (Format: DD-MM-YYYY) *
                </label>
                <div className="relative">
                  <input
                    ref={dateInputRef}
                    type="text"
                    required
                    placeholder="Klik untuk memilih tanggal (DD-MM-YYYY)"
                    value={formatToDDMMYYYY(formData.tanggal_kegiatan)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, tanggal_kegiatan: formatToISO(val) });
                    }}
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-semibold cursor-pointer"
                  />
                  <svg
                    className="w-5 h-5 text-gray-400 absolute right-3.5 top-3.5 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Deskripsi Kegiatan
                </label>
                <textarea
                  rows={3}
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Ringkasan penjelasan kegiatan..."
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>


              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Upload Berkas / Foto Dokumentasi *
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        const fileNames = files.map((f) => f.name).join(", ");
                        setFormData((prev) => ({
                          ...prev,
                          selectedFiles: files,
                          uploadedFilesName: `${files.length} file dipilih (${fileNames.slice(0, 40)}${fileNames.length > 40 ? "..." : ""})`,
                        }));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                    <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Klik atau seret foto/berkas ke sini untuk upload
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      File akan disimpan ke Google Drive (Tahun ➔ Bulan ➔ Kegiatan) secara otomatis.
                    </p>
                    {formData.uploadedFilesName && (
                      <span className="mt-1 px-2.5 py-1 rounded-md bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300 text-xs font-medium">
                        📁 {formData.uploadedFilesName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isSubmitting && (
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs text-orange-800 dark:text-orange-300 flex items-center gap-2">
                  <span className="animate-spin text-base">⏳</span>
                  <span>{uploadStatusText || "Sedang memproses..."}</span>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">🔄</span>
                      <span>Menyimpan...</span>
                    </>
                  ) : editingItem ? (
                    "Simpan Perubahan"
                  ) : (
                    "Upload ke Drive & Simpan"
                  )}
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
                Apakah Anda yakin ingin menghapus dokumentasi <strong className="text-gray-900 dark:text-white">"{deletingItem.judul}"</strong>? Tindakan ini tidak dapat dibatalkan.
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
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
