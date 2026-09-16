"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { DokseItem } from "@/lib/dokse-data";
import {
  PengolahanRecord,
  PengolahanPetaMergedItem,
  checkIsFisikLengkap,
} from "@/lib/pengolahan-data";
import { getDokseDataFromSupabase } from "@/lib/supabase/dokse-service";
import {
  getPengolahanPetaFromSupabase,
  updatePengolahanRecordInSupabase,
  bulkUpsertPengolahanRecordsInSupabase,
} from "@/lib/supabase/pengolahan-service";
import { Modal } from "@/components/ui/modal";
import * as XLSX from "xlsx";

export default function PengolahanPetaPage() {
  const { currentUser, users, loginWithCredentials, logout } = useAuth();
  const isAdmin =
    currentUser?.role === "administrator" || currentUser?.role === "admin_humas";

  // Data State
  const [dokseList, setDokseList] = useState<DokseItem[]>([]);
  const [pengolahanMap, setPengolahanMap] = useState<Map<string, PengolahanRecord>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modal Login Petugas Langsung di Halaman
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Filter State
  const [selectedKec, setSelectedKec] = useState<string>("all");
  const [selectedDesa, setSelectedDesa] = useState<string>("all");
  const [selectedPetugas, setSelectedPetugas] = useState<string>("all");
  const [selectedFisik, setSelectedFisik] = useState<string>("all"); // 'all' | 'lengkap' | 'belum_lengkap'
  const [selectedStatusScan, setSelectedStatusScan] = useState<string>("all"); // 'all' | 'Sudah' | 'Belum' | '-'
  const [selectedStatusOlah, setSelectedStatusOlah] = useState<string>("all"); // 'all' | 'Sudah' | 'Belum' | '-'
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal State Catatan & Tanggal Selesai
  const [editingItem, setEditingItem] = useState<PengolahanPetaMergedItem | null>(
    null
  );
  const [editTanggalInput, setEditTanggalInput] = useState<string>("");
  const [editCatatanInput, setEditCatatanInput] = useState<string>("");

  // Modal State Import Excel Alokasi
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  // Ambil daftar petugas (khusus role eksternal atau semua user)
  const listPetugas = useMemo(() => {
    return users.filter((u) => u.role === "eksternal" || u.is_active);
  }, [users]);

  // Handler Submit Login Petugas
  const handlePetugasLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setLoginError("Harap isi username/email dan password.");
      return;
    }

    setIsLoggingIn(true);
    const ok = await loginWithCredentials(loginIdentifier.trim(), loginPassword.trim());
    setIsLoggingIn(false);

    if (ok) {
      setIsLoginModalOpen(false);
      setLoginIdentifier("");
      setLoginPassword("");
    } else {
      setLoginError("Username atau Password salah/belum terdaftar!");
    }
  };

  // Load Data dari Supabase (Dokse + Pengolahan)
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [dokData, pengolahanData] = await Promise.all([
        getDokseDataFromSupabase(),
        getPengolahanPetaFromSupabase(),
      ]);

      setDokseList(dokData || []);

      const pMap = new Map<string, PengolahanRecord>();
      (pengolahanData || []).forEach((p) => {
        pMap.set(p.idsubsls, p);
      });
      setPengolahanMap(pMap);
    } catch (err) {
      console.error("Gagal memuat data pengolahan peta:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Gabungkan data dokse dengan data pengolahan
  const mergedDataList: PengolahanPetaMergedItem[] = useMemo(() => {
    return dokseList.map((dok) => {
      const pengolahan = pengolahanMap.get(dok.idsubsls);
      const isLengkap = checkIsFisikLengkap(dok);

      return {
        ...dok,
        petugas_id: pengolahan?.petugas_id || null,
        nama_petugas: pengolahan?.nama_petugas || null,
        status_scan: pengolahan?.status_scan || "-",
        status_olah: pengolahan?.status_olah || "-",
        tgl_selesai_olah: pengolahan?.tgl_selesai_olah || null,
        catatan_pengolahan: pengolahan?.catatan || null,
        isFisikLengkap: isLengkap,
      };
    });
  }, [dokseList, pengolahanMap]);

  // Filter Kecamatan & Desa Berjenjang
  const listKecamatan = useMemo(() => {
    const map = new Map<string, string>();
    dokseList.forEach((d) => map.set(d.kode_kec, d.nama_kec));
    return Array.from(map.entries())
      .map(([kode, nama]) => ({ kode, nama }))
      .sort((a, b) => a.kode.localeCompare(b.kode));
  }, [dokseList]);

  const listDesa = useMemo(() => {
    let filtered = dokseList;
    if (selectedKec !== "all") {
      filtered = filtered.filter((d) => d.kode_kec === selectedKec);
    }
    const map = new Map<string, string>();
    filtered.forEach((d) => map.set(d.kode_desa, d.nama_desa));
    return Array.from(map.entries())
      .map(([kode, nama]) => ({ kode, nama }))
      .sort((a, b) => a.kode.localeCompare(b.kode));
  }, [dokseList, selectedKec]);

  // Filter Data berdasarkan User & Parameter Filter
  const filteredData = useMemo(() => {
    return mergedDataList.filter((item) => {
      // 1. Pembatasan Hak Akses: Jika bukan admin (petugas eksternal), hanya tampilkan yang dialokasikan ke dirinya
      if (!isAdmin) {
        if (!currentUser) return false;
        // Cocokkan id atau username/nama petugas
        const isAssignedToMe =
          item.petugas_id === currentUser.id ||
          item.nama_petugas?.toLowerCase() === currentUser.nama.toLowerCase();
        if (!isAssignedToMe) return false;
      }

      // 2. Filter Kecamatan & Desa
      if (selectedKec !== "all" && item.kode_kec !== selectedKec) return false;
      if (selectedDesa !== "all" && item.kode_desa !== selectedDesa) return false;

      // 3. Filter Petugas (Admin view)
      if (isAdmin && selectedPetugas !== "all") {
        if (selectedPetugas === "unassigned") {
          if (item.petugas_id) return false;
        } else {
          if (item.petugas_id !== selectedPetugas) return false;
        }
      }

      // 4. Filter Kelengkapan Fisik
      if (selectedFisik === "lengkap" && !item.isFisikLengkap) return false;
      if (selectedFisik === "belum_lengkap" && item.isFisikLengkap) return false;

      // 5. Filter Status Scan
      if (selectedStatusScan !== "all" && item.status_scan !== selectedStatusScan)
        return false;

      // 6. Filter Status Olah
      if (selectedStatusOlah !== "all" && item.status_olah !== selectedStatusOlah)
        return false;

      // 7. Search Query (idsubsls, nama_sls, nama_desa, nama_kec, nama_petugas)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = item.idsubsls?.toLowerCase().includes(q);
        const matchSls = item.nama_sls?.toLowerCase().includes(q);
        const matchDesa = item.nama_desa?.toLowerCase().includes(q);
        const matchKec = item.nama_kec?.toLowerCase().includes(q);
        const matchPetugas = item.nama_petugas?.toLowerCase().includes(q);
        if (!matchId && !matchSls && !matchDesa && !matchKec && !matchPetugas)
          return false;
      }

      return true;
    });
  }, [
    mergedDataList,
    isAdmin,
    currentUser,
    selectedKec,
    selectedDesa,
    selectedPetugas,
    selectedFisik,
    selectedStatusScan,
    selectedStatusOlah,
    searchQuery,
  ]);

  // Statistik Ringkasan (KPI Card)
  const stats = useMemo(() => {
    // Basis data KPI: filteredData atau seluruh peta yang relevan dengan user saat ini
    const base = isAdmin
      ? mergedDataList
      : mergedDataList.filter(
          (i) =>
            i.petugas_id === currentUser?.id ||
            i.nama_petugas?.toLowerCase() === currentUser?.nama.toLowerCase()
        );

    const total = base.length;
    const fisikLengkap = base.filter((i) => i.isFisikLengkap).length;
    const fisikBelum = total - fisikLengkap;
    const sudahScan = base.filter((i) => i.status_scan === "Sudah").length;
    const sudahOlah = base.filter((i) => i.status_olah === "Sudah").length;
    const persentaseOlah = total > 0 ? Math.round((sudahOlah / total) * 100) : 0;

    return {
      total,
      fisikLengkap,
      fisikBelum,
      sudahScan,
      sudahOlah,
      persentaseOlah,
    };
  }, [mergedDataList, isAdmin, currentUser]);

  // Data Paginasi
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset pagination saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedKec,
    selectedDesa,
    selectedPetugas,
    selectedFisik,
    selectedStatusScan,
    selectedStatusOlah,
    searchQuery,
    itemsPerPage,
  ]);

  // Handler Update Alokasi Petugas (Khusus Admin)
  const handleAssignPetugas = async (idsubsls: string, petugasId: string) => {
    const selectedUser = users.find((u) => u.id === petugasId);
    const namaPetugas = selectedUser ? selectedUser.nama : null;
    const currentRec = pengolahanMap.get(idsubsls);

    const updatedRecord: PengolahanRecord = {
      idsubsls,
      petugas_id: petugasId || null,
      nama_petugas: namaPetugas,
      status_scan: currentRec?.status_scan || "Belum",
      status_olah: currentRec?.status_olah || "Belum",
      tgl_selesai_olah: currentRec?.tgl_selesai_olah || null,
      catatan: currentRec?.catatan || null,
    };

    // Optimistic Update
    setPengolahanMap((prev) => {
      const next = new Map(prev);
      next.set(idsubsls, updatedRecord);
      return next;
    });

    await updatePengolahanRecordInSupabase(updatedRecord);
  };

  // Helper Styling Dropdown Scan & Olah
  const getStatusSelectClass = (val: string) => {
    if (val === "Sudah") {
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold";
    }
    if (val === "Belum") {
      return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-700 font-bold";
    }
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700 font-semibold";
  };

  // Handler Update Status Scan (Dropdown: '-' | 'Sudah' | 'Belum')
  const handleUpdateScan = async (
    item: PengolahanPetaMergedItem,
    newStatus: "-" | "Sudah" | "Belum"
  ) => {
    if (!isAdmin && !item.isFisikLengkap) {
      alert("Peta belum bisa di-update status scan karena dokumen fisik di penerimaan belum lengkap.");
      return;
    }

    const currentRec = pengolahanMap.get(item.idsubsls);
    const updatedRecord: PengolahanRecord = {
      idsubsls: item.idsubsls,
      petugas_id: item.petugas_id,
      nama_petugas: item.nama_petugas,
      status_scan: newStatus,
      status_olah: currentRec?.status_olah || "-",
      tgl_selesai_olah: currentRec?.tgl_selesai_olah || null,
      catatan: currentRec?.catatan || null,
    };

    setPengolahanMap((prev) => {
      const next = new Map(prev);
      next.set(item.idsubsls, updatedRecord);
      return next;
    });

    await updatePengolahanRecordInSupabase(updatedRecord);
  };

  // Handler Update Status Olah (Dropdown: '-' | 'Sudah' | 'Belum')
  const handleUpdateOlah = async (
    item: PengolahanPetaMergedItem,
    newStatus: "-" | "Sudah" | "Belum"
  ) => {
    if (!isAdmin && !item.isFisikLengkap) {
      alert("Peta belum bisa di-update status olah karena dokumen fisik di penerimaan belum lengkap.");
      return;
    }

    const currentRec = pengolahanMap.get(item.idsubsls);
    const autoDate =
      newStatus === "Sudah"
        ? currentRec?.tgl_selesai_olah || new Date().toISOString().split("T")[0]
        : currentRec?.tgl_selesai_olah || null;

    const updatedRecord: PengolahanRecord = {
      idsubsls: item.idsubsls,
      petugas_id: item.petugas_id,
      nama_petugas: item.nama_petugas,
      status_scan: currentRec?.status_scan || "-",
      status_olah: newStatus,
      tgl_selesai_olah: autoDate,
      catatan: currentRec?.catatan || null,
    };

    setPengolahanMap((prev) => {
      const next = new Map(prev);
      next.set(item.idsubsls, updatedRecord);
      return next;
    });

    await updatePengolahanRecordInSupabase(updatedRecord);
  };

  // Buka Modal Edit Tanggal & Catatan
  const handleOpenEditModal = (item: PengolahanPetaMergedItem) => {
    if (!isAdmin && !item.isFisikLengkap) {
      alert("Dokumen fisik belum lengkap. Belum dapat mengisi detail pengolahan.");
      return;
    }
    setEditingItem(item);
    setEditTanggalInput(item.tgl_selesai_olah || "");
    setEditCatatanInput(item.catatan_pengolahan || "");
  };

  // Simpan Modal Edit Tanggal & Catatan
  const handleSaveEditModal = async () => {
    if (!editingItem) return;

    setIsSaving(true);
    const updatedRecord: PengolahanRecord = {
      idsubsls: editingItem.idsubsls,
      petugas_id: editingItem.petugas_id,
      nama_petugas: editingItem.nama_petugas,
      status_scan: editingItem.status_scan,
      status_olah: editingItem.status_olah,
      tgl_selesai_olah: editTanggalInput.trim() || null,
      catatan: editCatatanInput.trim() || null,
    };

    setPengolahanMap((prev) => {
      const next = new Map(prev);
      next.set(editingItem.idsubsls, updatedRecord);
      return next;
    });

    await updatePengolahanRecordInSupabase(updatedRecord);
    setIsSaving(false);
    setEditingItem(null);
  };

  // Handler Export Rekap ke CSV
  const handleExportCSV = () => {
    const headers = [
      "ID SubSLS",
      "Nama SLS",
      "Kecamatan",
      "Desa",
      "Petugas Pengolahan",
      "Kelengkapan Fisik",
      "Status Scan",
      "Status Olah",
      "Tanggal Selesai",
      "Catatan Petugas",
    ];

    const rows = filteredData.map((item) => [
      `"${item.idsubsls || ""}"`,
      `"${item.nama_sls || ""}"`,
      `"${item.nama_kec || ""}"`,
      `"${item.nama_desa || ""}"`,
      `"${item.nama_petugas || "Belum Dialokasikan"}"`,
      `"${item.isFisikLengkap ? "Lengkap" : "Tidak Lengkap"}"`,
      `"${item.status_scan}"`,
      `"${item.status_olah}"`,
      `"${item.tgl_selesai_olah || "-"}"`,
      `"${(item.catatan_pengolahan || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rekap-pengolahan-peta-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler Download Template Import Alokasi Excel
  const handleDownloadTemplateAlokasi = () => {
    const sampleData = [
      {
        idsubsls: "360201000100100",
        nama_sls: "RT 001 RW 01",
        nama_kec: "Malingping",
        nama_desa: "Kecapi",
        username_petugas: "petugas1",
      },
      {
        idsubsls: "360201000100200",
        nama_sls: "RT 002 RW 01",
        nama_kec: "Malingping",
        nama_desa: "Kecapi",
        username_petugas: "petugas2",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Alokasi");
    XLSX.writeFile(wb, "template-alokasi-pengolahan-peta.xlsx");
  };

  // Handler Import File Excel / Paste Teks Alokasi
  const handleProcessImportExcel = async (file: File) => {
    setImportError("");
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!json || json.length === 0) {
        setImportError("File Excel kosong atau format tidak dikenali.");
        return;
      }

      await applyBatchAlokasi(json);
    } catch (err: any) {
      setImportError("Gagal membaca file Excel: " + err.message);
    }
  };

  const applyBatchAlokasi = async (rows: any[]) => {
    const updates: Array<Partial<PengolahanRecord> & { idsubsls: string }> = [];
    let countSuccess = 0;

    rows.forEach((row) => {
      const rawId =
        row.idsubsls ||
        row["ID SubSLS"] ||
        row["ID SLS"] ||
        row["id_subsls"] ||
        row.ID;
      const rawUser =
        row.username_petugas ||
        row["Username Petugas"] ||
        row["Petugas"] ||
        row["petugas_id"] ||
        row.nama_petugas;

      if (rawId && rawUser) {
        const idsubsls = String(rawId).trim();
        const userQuery = String(rawUser).trim().toLowerCase();

        // Cari petugas berdasarkan id, username, atau nama
        const foundUser = users.find(
          (u) =>
            u.id.toLowerCase() === userQuery ||
            u.username?.toLowerCase() === userQuery ||
            u.nama.toLowerCase() === userQuery
        );

        if (foundUser) {
          const currentRec = pengolahanMap.get(idsubsls);
          updates.push({
            idsubsls,
            petugas_id: foundUser.id,
            nama_petugas: foundUser.nama,
            status_scan: currentRec?.status_scan || "Belum",
            status_olah: currentRec?.status_olah || "Belum",
            tgl_selesai_olah: currentRec?.tgl_selesai_olah || null,
            catatan: currentRec?.catatan || null,
          });
          countSuccess++;
        }
      }
    });

    if (updates.length === 0) {
      setImportError(
        "Tidak ada baris yang valid atau username petugas tidak cocok dengan data pengguna."
      );
      return;
    }

    setIsSaving(true);
    await bulkUpsertPengolahanRecordsInSupabase(updates);

    // Update local state map
    setPengolahanMap((prev) => {
      const next = new Map(prev);
      updates.forEach((u) => {
        const curr = next.get(u.idsubsls);
        next.set(u.idsubsls, {
          idsubsls: u.idsubsls,
          petugas_id: u.petugas_id || null,
          nama_petugas: u.nama_petugas || null,
          status_scan: u.status_scan || curr?.status_scan || "Belum",
          status_olah: u.status_olah || curr?.status_olah || "Belum",
          tgl_selesai_olah: u.tgl_selesai_olah || curr?.tgl_selesai_olah || null,
          catatan: u.catatan || curr?.catatan || null,
        });
      });
      return next;
    });

    setIsSaving(false);
    setIsImportModalOpen(false);
    alert(`Berhasil mengalokasikan ${countSuccess} peta ke petugas.`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
              Sensus Ekonomi 2026
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Alokasi & Progres Olah
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Pengolahan & Scanning Peta
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin
              ? "Kelola alokasi pembagian peta ke 16 petugas, pantau hasil scan, dan progres pengolahan dokumen fisik."
              : `Halo ${currentUser?.nama || "Petugas"}, berikut adalah peta yang dialokasikan khusus untuk Anda scan dan olah.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Login / Tombol Login Petugas */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {currentUser.nama}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                title="Keluar / Logout Akun"
              >
                Keluar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow transition cursor-pointer"
            >
              🔐 Login Petugas
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Import Alokasi Excel
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export Rekap CSV
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Total Dialokasikan
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.total}
          </p>
          <span className="text-[11px] text-gray-400">Wilayah SLS</span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Fisik Lengkap
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.fisikLengkap}
          </p>
          <span className="text-[11px] text-emerald-500/80">Siap diolah</span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Menunggu Fisik
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {stats.fisikBelum}
          </p>
          <span className="text-[11px] text-amber-500/80">Aksi terkunci</span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
            Sudah Di-scan
          </p>
          <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
            {stats.sudahScan}
          </p>
          <span className="text-[11px] text-cyan-500/80">
            {stats.total > 0
              ? `${Math.round((stats.sudahScan / stats.total) * 100)}% peta`
              : "0%"}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Selesai Diolah
          </p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.sudahOlah}
          </p>
          <span className="text-[11px] text-indigo-500/80">Peta final</span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
            Progres Selesai
          </p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {stats.persentaseOlah}%
          </p>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-purple-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.persentaseOlah}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Cari ID SLS, nama SLS, desa, atau petugas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <svg
              className="w-4 h-4 absolute left-3.5 top-3 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Kecamatan */}
            <select
              value={selectedKec}
              onChange={(e) => {
                setSelectedKec(e.target.value);
                setSelectedDesa("all");
              }}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Semua Kecamatan</option>
              {listKecamatan.map((k) => (
                <option key={k.kode} value={k.kode}>
                  [{k.kode}] {k.nama}
                </option>
              ))}
            </select>

            {/* Filter Desa */}
            <select
              value={selectedDesa}
              onChange={(e) => setSelectedDesa(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Semua Desa</option>
              {listDesa.map((d) => (
                <option key={d.kode} value={d.kode}>
                  [{d.kode}] {d.nama}
                </option>
              ))}
            </select>

            {/* Filter Petugas (Khusus Admin) */}
            {isAdmin && (
              <select
                value={selectedPetugas}
                onChange={(e) => setSelectedPetugas(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">Semua Petugas</option>
                <option value="unassigned">-- Belum Dialokasikan --</option>
                {listPetugas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama} ({u.username || u.role})
                  </option>
                ))}
              </select>
            )}

            {/* Filter Kelengkapan Dokumen Fisik */}
            <select
              value={selectedFisik}
              onChange={(e) => setSelectedFisik(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Fisik: Semua</option>
              <option value="lengkap">Fisik: Lengkap (Siap Olah)</option>
              <option value="belum_lengkap">Fisik: Belum Lengkap (Terkunci)</option>
            </select>

            {/* Filter Status Scan */}
            <select
              value={selectedStatusScan}
              onChange={(e) => setSelectedStatusScan(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Scan: Semua</option>
              <option value="Sudah">Scan: Sudah</option>
              <option value="Belum">Scan: Belum</option>
            </select>

            {/* Filter Status Olah */}
            <select
              value={selectedStatusOlah}
              onChange={(e) => setSelectedStatusOlah(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Olah: Semua</option>
              <option value="Sudah">Olah: Sudah</option>
              <option value="Belum">Olah: Belum</option>
            </select>

            {/* Tombol Reset Filter */}
            <button
              onClick={() => {
                setSelectedKec("all");
                setSelectedDesa("all");
                setSelectedPetugas("all");
                setSelectedFisik("all");
                setSelectedStatusScan("all");
                setSelectedStatusOlah("all");
                setSearchQuery("");
              }}
              className="px-3 py-2 text-xs rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
              title="Reset Filter"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Data Utama */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Memuat data pengolahan peta...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-20 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
              Tidak ada data peta yang sesuai
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Coba sesuaikan kata kunci pencarian atau filter wilayah.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/75 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Wilayah (Kec / Desa / SLS)</th>
                  <th className="py-3 px-4">ID SubSLS</th>
                  <th className="py-3 px-4">Petugas Pengolahan</th>
                  <th className="py-3 px-4 text-center">Dokumen Fisik</th>
                  <th className="py-3 px-4 text-center">Scan Peta</th>
                  <th className="py-3 px-4 text-center">Selesai Olah</th>
                  <th className="py-3 px-4">Tgl Selesai & Catatan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {paginatedData.map((item, idx) => {
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isLockedForPetugas = !isAdmin && !item.isFisikLengkap;

                  return (
                    <tr
                      key={item.idsubsls}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition"
                    >
                      <td className="py-3 px-4 text-center text-gray-400 font-mono">
                        {globalIdx}
                      </td>

                      {/* Info Wilayah */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {item.nama_sls}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {item.nama_kec} &bull; {item.nama_desa}
                        </p>
                      </td>

                      {/* ID SubSLS */}
                      <td className="py-3 px-4 font-mono font-medium text-gray-600 dark:text-gray-300">
                        {item.idsubsls}
                      </td>

                      {/* Petugas Pengolahan */}
                      <td className="py-3 px-4">
                        {isAdmin ? (
                          <select
                            value={item.petugas_id || ""}
                            onChange={(e) =>
                              handleAssignPetugas(item.idsubsls, e.target.value)
                            }
                            className={`w-full text-xs rounded-lg px-2 py-1.5 border transition ${
                              item.petugas_id
                                ? "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-medium"
                                : "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            <option value="">-- Pilih Petugas --</option>
                            {listPetugas.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nama} ({p.username || p.role})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.nama_petugas || "-"}
                          </span>
                        )}
                      </td>

                      {/* Kelengkapan Dokumen Fisik */}
                      <td className="py-3 px-4 text-center">
                        {item.isFisikLengkap ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Lengkap
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 cursor-help"
                            title="Penerimaan belum lengkap di Dok-SE2026. Aksi olah dikunci untuk petugas."
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Belum Lengkap
                          </span>
                        )}
                      </td>

                      {/* Status Scan (Dropdown) */}
                      <td className="py-3 px-4 text-center">
                        <select
                          disabled={isLockedForPetugas}
                          value={item.status_scan}
                          onChange={(e) =>
                            handleUpdateScan(
                              item,
                              e.target.value as "-" | "Sudah" | "Belum"
                            )
                          }
                          className={`text-xs rounded-lg px-2.5 py-1.5 border transition cursor-pointer ${getStatusSelectClass(
                            item.status_scan
                          )} ${
                            isLockedForPetugas
                              ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800"
                              : ""
                          }`}
                          title={
                            isLockedForPetugas
                              ? "Terkunci: Dokumen fisik penerimaan belum lengkap."
                              : "Pilih status scan peta"
                          }
                        >
                          <option value="-">- (Strip)</option>
                          <option value="Sudah">Sudah</option>
                          <option value="Belum">Belum</option>
                        </select>
                      </td>

                      {/* Status Olah (Dropdown) */}
                      <td className="py-3 px-4 text-center">
                        <select
                          disabled={isLockedForPetugas}
                          value={item.status_olah}
                          onChange={(e) =>
                            handleUpdateOlah(
                              item,
                              e.target.value as "-" | "Sudah" | "Belum"
                            )
                          }
                          className={`text-xs rounded-lg px-2.5 py-1.5 border transition cursor-pointer ${getStatusSelectClass(
                            item.status_olah
                          )} ${
                            isLockedForPetugas
                              ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800"
                              : ""
                          }`}
                          title={
                            isLockedForPetugas
                              ? "Terkunci: Dokumen fisik penerimaan belum lengkap."
                              : "Pilih status pengolahan peta"
                          }
                        >
                          <option value="-">- (Strip)</option>
                          <option value="Sudah">Sudah</option>
                          <option value="Belum">Belum</option>
                        </select>
                      </td>

                      {/* Tgl Selesai & Catatan */}
                      <td className="py-3 px-4">
                        {item.tgl_selesai_olah && (
                          <p className="text-[11px] font-mono text-gray-800 dark:text-gray-200 font-medium">
                            {item.tgl_selesai_olah}
                          </p>
                        )}
                        {item.catatan_pengolahan ? (
                          <p
                            className="text-[11px] text-gray-500 dark:text-gray-400 italic truncate max-w-[150px]"
                            title={item.catatan_pengolahan}
                          >
                            {item.catatan_pengolahan}
                          </p>
                        ) : (
                          <span className="text-[11px] text-gray-300 dark:text-gray-600">
                            -
                          </span>
                        )}
                      </td>

                      {/* Aksi Edit Detail */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={isLockedForPetugas}
                          onClick={() => handleOpenEditModal(item)}
                          className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                            isLockedForPetugas
                              ? "opacity-30 cursor-not-allowed border-gray-200 text-gray-400"
                              : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          Edit Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, filteredData.length)} dari{" "}
              {filteredData.length} baris
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-medium text-gray-800 dark:text-gray-200">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Modal Edit Detail (Tanggal Selesai & Catatan) */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        className="max-w-md p-6"
      >
        {editingItem && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Detail Pengolahan Peta
            </h3>
            <p className="text-xs text-gray-500">
              Wilayah: <span className="font-semibold">{editingItem.nama_sls}</span> (
              {editingItem.idsubsls})
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal Selesai Pengolahan
                </label>
                <input
                  type="date"
                  value={editTanggalInput}
                  onChange={(e) => setEditTanggalInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Catatan / Keterangan Petugas
                </label>
                <textarea
                  rows={4}
                  value={editCatatanInput}
                  onChange={(e) => setEditCatatanInput(e.target.value)}
                  placeholder="Misal: Sudah di-scan folder A, batas wilayah RT sesuai..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditModal}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition shadow-sm"
              >
                {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Import Excel Mapping Alokasi (Khusus Admin) */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportError("");
        }}
        className="max-w-lg p-6"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Import Alokasi Petugas dari Excel
            </h3>
            <button
              onClick={handleDownloadTemplateAlokasi}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
              Unduh Template Excel (.xlsx)
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Unggah file Excel yang berisi kolom <code>idsubsls</code> dan{" "}
            <code>username_petugas</code> untuk mengalokasikan peta secara massal ke
            16 petugas.
          </p>

          {importError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {importError}
            </div>
          )}

          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-brand-500 transition cursor-pointer">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessImportExcel(e.target.files[0]);
                }
              }}
              className="hidden"
              id="file-upload-alokasi"
            />
            <label
              htmlFor="file-upload-alokasi"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Pilih atau seret file Excel di sini
              </span>
              <span className="text-xs text-gray-400">
                Mendukung format .xlsx, .xls, .csv
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportError("");
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Login Petugas Langsung di Halaman */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setLoginError("");
        }}
        className="max-w-md p-6"
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="h-12 w-12 rounded-2xl bg-brand-500 text-white font-bold text-xl flex items-center justify-center mx-auto mb-2 shadow-md">
              BPS
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Login Petugas Pengolahan
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Masuk menggunakan akun petugas untuk melihat dan mengupdate peta tugas Anda.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handlePetugasLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Username / Email
              </label>
              <input
                type="text"
                required
                placeholder="Masukkan username atau email..."
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Password / Kata Sandi
              </label>
              <input
                type="password"
                required
                placeholder="Masukkan kata sandi..."
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setIsLoginModalOpen(false);
                  setLoginError("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition shadow-sm disabled:opacity-50"
              >
                {isLoggingIn ? "Memverifikasi..." : "Masuk Sistem"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
