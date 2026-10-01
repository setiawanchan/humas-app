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
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

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

  // State Modal Dashboard Stats Pengolahan Peta
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState<"overview" | "progres_wilayah" | "progres_petugas">("overview");

  // State Drilldown Progres Wilayah di Dashboard
  const [dashSelectedKec, setDashSelectedKec] = useState<string>("all");
  const [dashSelectedDesa, setDashSelectedDesa] = useState<string>("all");
  const [dashPetugasSearchQuery, setDashPetugasSearchQuery] = useState("");

  // Modal State Update Massal per Desa
  const [isBulkDesaModalOpen, setIsBulkDesaModalOpen] = useState(false);
  const [bulkKec, setBulkKec] = useState<string>("");
  const [bulkDesa, setBulkDesa] = useState<string>("");
  const [bulkStatusScan, setBulkStatusScan] = useState<"keep" | "-" | "Sudah" | "Belum">("keep");
  const [bulkStatusOlah, setBulkStatusOlah] = useState<"keep" | "-" | "Sudah" | "Belum">("keep");
  const [bulkTglOlah, setBulkTglOlah] = useState<string>("");
  const [bulkCatatan, setBulkCatatan] = useState<string>("");
  const [isBulkSaving, setIsBulkSaving] = useState(false);

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

  // List Desa untuk modal Bulk Desa
  const listDesaForBulk = useMemo(() => {
    let filtered = dokseList;
    if (bulkKec) {
      filtered = filtered.filter((d) => d.kode_kec === bulkKec);
    }
    const map = new Map<string, string>();
    filtered.forEach((d) => map.set(d.kode_desa, d.nama_desa));
    return Array.from(map.entries())
      .map(([kode, nama]) => ({ kode, nama }))
      .sort((a, b) => a.kode.localeCompare(b.kode));
  }, [dokseList, bulkKec]);

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

  // ===================== KALKULASI DASHBOARD STATISTIK LENGKAP =====================
  const dashboardStats = useMemo(() => {
    const totalPeta = mergedDataList.length;
    let fisikLengkapCount = 0;
    let scanSudah = 0;
    let scanBelum = 0;
    let olahSudah = 0;
    let olahBelum = 0;
    let assignedCount = 0;
    let unassignedCount = 0;

    mergedDataList.forEach((item) => {
      if (item.isFisikLengkap) fisikLengkapCount++;
      if (item.status_scan === "Sudah") scanSudah++;
      else scanBelum++;

      if (item.status_olah === "Sudah") olahSudah++;
      else olahBelum++;

      if (item.petugas_id) assignedCount++;
      else unassignedCount++;
    });

    const fisikBelumCount = totalPeta - fisikLengkapCount;
    const olahPct = totalPeta > 0 ? Math.round((olahSudah / totalPeta) * 100) : 0;
    const scanPct = totalPeta > 0 ? Math.round((scanSudah / totalPeta) * 100) : 0;

    return {
      totalPeta,
      fisikLengkapCount,
      fisikBelumCount,
      scanSudah,
      scanBelum,
      olahSudah,
      olahBelum,
      assignedCount,
      unassignedCount,
      olahPct,
      scanPct,
    };
  }, [mergedDataList]);

  // ApexCharts Configs untuk Dashboard Pengolahan Peta
  const olahDonutSeries = useMemo(() => [
    dashboardStats.olahSudah,
    dashboardStats.olahBelum
  ], [dashboardStats]);

  const olahDonutOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
    },
    labels: ["Sudah Diolah", "Belum Diolah"],
    colors: ["#10B981", "#EF4444"],
    legend: {
      position: "bottom",
      fontSize: "12px",
      fontWeight: 600,
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toFixed(1) + "%";
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total SLS Peta",
              formatter: () => `${dashboardStats.totalPeta}`,
            },
          },
        },
      },
    },
  }), [dashboardStats]);

  const scanDonutSeries = useMemo(() => [
    dashboardStats.scanSudah,
    dashboardStats.scanBelum
  ], [dashboardStats]);

  const scanDonutOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
    },
    labels: ["Sudah Scan", "Belum Scan"],
    colors: ["#3B82F6", "#F59E0B"],
    legend: {
      position: "bottom",
      fontSize: "12px",
      fontWeight: 600,
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toFixed(1) + "%";
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total SLS Peta",
              formatter: () => `${dashboardStats.totalPeta}`,
            },
          },
        },
      },
    },
  }), [dashboardStats]);

  const overviewBarSeries = useMemo(() => [
    {
      name: "Selesai / Lengkap",
      data: [
        dashboardStats.fisikLengkapCount,
        dashboardStats.scanSudah,
        dashboardStats.olahSudah,
        dashboardStats.assignedCount,
      ],
    },
    {
      name: "Belum Selesai / Belum Lengkap",
      data: [
        dashboardStats.fisikBelumCount,
        dashboardStats.scanBelum,
        dashboardStats.olahBelum,
        dashboardStats.unassignedCount,
      ],
    },
  ], [dashboardStats]);

  const overviewBarOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: "bar",
      stacked: false,
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
    },
    colors: ["#10B981", "#EF4444"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "45%",
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: true,
    },
    xaxis: {
      categories: ["Dokumen Fisik", "Scanning Peta", "Pengolahan Peta", "Alokasi Petugas"],
      labels: {
        style: {
          fontSize: "11px",
          fontWeight: 600,
        },
      },
    },
    legend: {
      position: "top",
      fontSize: "12px",
      fontWeight: 600,
    },
  }), []);

  // Rekapitulasi Progres Capaian Per Kecamatan
  const kecProgressList = useMemo(() => {
    const map = new Map<string, {
      kode: string;
      nama: string;
      total: number;
      fisikLengkap: number;
      scanSudah: number;
      olahSudah: number;
      olahBelum: number;
    }>();

    mergedDataList.forEach((item) => {
      const existing = map.get(item.kode_kec) || {
        kode: item.kode_kec,
        nama: item.nama_kec,
        total: 0,
        fisikLengkap: 0,
        scanSudah: 0,
        olahSudah: 0,
        olahBelum: 0,
      };

      existing.total += 1;
      if (item.isFisikLengkap) existing.fisikLengkap += 1;
      if (item.status_scan === "Sudah") existing.scanSudah += 1;
      if (item.status_olah === "Sudah") existing.olahSudah += 1;
      else existing.olahBelum += 1;

      map.set(item.kode_kec, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.kode.localeCompare(b.kode));
  }, [mergedDataList]);

  // Rekapitulasi Progres Capaian Per Desa (Filtered by dashSelectedKec)
  const desaProgressList = useMemo(() => {
    let filtered = mergedDataList;
    if (dashSelectedKec !== "all") {
      filtered = filtered.filter((d) => d.kode_kec === dashSelectedKec);
    }

    const map = new Map<string, {
      kode: string;
      nama: string;
      namaKec: string;
      total: number;
      fisikLengkap: number;
      scanSudah: number;
      olahSudah: number;
      olahBelum: number;
    }>();

    filtered.forEach((item) => {
      const existing = map.get(item.kode_desa) || {
        kode: item.kode_desa,
        nama: item.nama_desa,
        namaKec: item.nama_kec,
        total: 0,
        fisikLengkap: 0,
        scanSudah: 0,
        olahSudah: 0,
        olahBelum: 0,
      };

      existing.total += 1;
      if (item.isFisikLengkap) existing.fisikLengkap += 1;
      if (item.status_scan === "Sudah") existing.scanSudah += 1;
      if (item.status_olah === "Sudah") existing.olahSudah += 1;
      else existing.olahBelum += 1;

      map.set(item.kode_desa, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.kode.localeCompare(b.kode));
  }, [mergedDataList, dashSelectedKec]);

  // Rekapitulasi Detail SLS / SubSLS (Filtered by dashSelectedKec & dashSelectedDesa)
  const slsProgressList = useMemo(() => {
    let filtered = mergedDataList;
    if (dashSelectedKec !== "all") {
      filtered = filtered.filter((d) => d.kode_kec === dashSelectedKec);
    }
    if (dashSelectedDesa !== "all") {
      filtered = filtered.filter((d) => d.kode_desa === dashSelectedDesa);
    }

    return filtered.map((item) => {
      const pendingTasks: string[] = [];
      if (!item.isFisikLengkap) pendingTasks.push("Fisik Belum Lengkap");
      if (item.status_scan !== "Sudah") pendingTasks.push("Belum Scan");
      if (item.status_olah !== "Sudah") pendingTasks.push("Belum Olah");
      if (!item.petugas_id) pendingTasks.push("Belum Ada Petugas");

      return {
        ...item,
        isCompleted: item.status_olah === "Sudah",
        pendingTasks,
      };
    }).sort((a, b) => a.idsubsls.localeCompare(b.idsubsls));
  }, [mergedDataList, dashSelectedKec, dashSelectedDesa]);

  // Rekapitulasi Progres Capaian Per Petugas
  const petugasProgressList = useMemo(() => {
    const map = new Map<string, {
      petugasId: string;
      nama: string;
      total: number;
      scanSudah: number;
      olahSudah: number;
      olahBelum: number;
    }>();

    mergedDataList.forEach((item) => {
      const pId = item.petugas_id || "unassigned";
      const pNama = item.nama_petugas || "Belum Dialokasikan";

      const existing = map.get(pId) || {
        petugasId: pId,
        nama: pNama,
        total: 0,
        scanSudah: 0,
        olahSudah: 0,
        olahBelum: 0,
      };

      existing.total += 1;
      if (item.status_scan === "Sudah") existing.scanSudah += 1;
      if (item.status_olah === "Sudah") existing.olahSudah += 1;
      else existing.olahBelum += 1;

      map.set(pId, existing);
    });

    let list = Array.from(map.values());
    if (dashPetugasSearchQuery.trim()) {
      const q = dashPetugasSearchQuery.toLowerCase();
      list = list.filter((p) => p.nama.toLowerCase().includes(q));
    }

    return list.sort((a, b) => {
      if (a.petugasId === "unassigned") return 1;
      if (b.petugasId === "unassigned") return -1;
      return b.total - a.total;
    });
  }, [mergedDataList, dashPetugasSearchQuery]);

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

  // Handler Download Template Import Alokasi Excel (Cukup idsubsls dan email_petugas)
  const handleDownloadTemplateAlokasi = () => {
    const sampleData = [
      {
        idsubsls: "360201000100100",
        email_petugas: "petugas01@gmail.com",
      },
      {
        idsubsls: "360201000100200",
        email_petugas: "petugas02@gmail.com",
      },
      {
        idsubsls: "360201000100300",
        email_petugas: "ahmad.fauzi@bps.go.id",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Alokasi");
    XLSX.writeFile(wb, "template-alokasi-petugas.xlsx");
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
        row["idsls"] ||
        row.ID;
      const rawUser =
        row.email_petugas ||
        row["Email Petugas"] ||
        row["email"] ||
        row["Email"] ||
        row.username_petugas ||
        row["Username Petugas"] ||
        row["Petugas"] ||
        row["petugas_id"] ||
        row.nama_petugas;

      if (rawId && rawUser) {
        const idsubsls = String(rawId).trim();
        const userQuery = String(rawUser).trim().toLowerCase();

        // Cari petugas berdasarkan email, username, id, atau nama
        const foundUser = users.find(
          (u) =>
            u.email?.toLowerCase() === userQuery ||
            u.username?.toLowerCase() === userQuery ||
            u.id.toLowerCase() === userQuery ||
            u.nama.toLowerCase() === userQuery
        );

        if (foundUser) {
          const currentRec = pengolahanMap.get(idsubsls);
          updates.push({
            idsubsls,
            petugas_id: foundUser.id,
            nama_petugas: foundUser.nama,
            status_scan: currentRec?.status_scan || "-",
            status_olah: currentRec?.status_olah || "-",
            tgl_selesai_olah: currentRec?.tgl_selesai_olah || null,
            catatan: currentRec?.catatan || null,
          });
          countSuccess++;
        }
      }
    });

    if (updates.length === 0) {
      setImportError(
        "Tidak ada baris yang valid atau email/username petugas tidak cocok dengan data pengguna."
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

  // Handler Buka Modal Bulk Desa (Default mengambil nilai filter jika ada)
  const handleOpenBulkDesaModal = () => {
    const defaultKec = selectedKec !== "all" ? selectedKec : listKecamatan[0]?.kode || "";
    setBulkKec(defaultKec);

    let defaultDesa = "";
    if (selectedDesa !== "all") {
      defaultDesa = selectedDesa;
    } else {
      const firstDesa = dokseList.find((d) => d.kode_kec === defaultKec)?.kode_desa || "";
      defaultDesa = firstDesa;
    }
    setBulkDesa(defaultDesa);
    setBulkStatusScan("keep");
    setBulkStatusOlah("keep");
    setBulkTglOlah("");
    setBulkCatatan("");
    setIsBulkDesaModalOpen(true);
  };

  // Kalkulasi item yang terdampak oleh Bulk Desa
  const bulkPreviewStats = useMemo(() => {
    if (!bulkKec || !bulkDesa) {
      return { totalInDesa: 0, eligibleCount: 0, skippedCount: 0, eligibleItems: [] };
    }

    const inDesa = mergedDataList.filter(
      (item) => item.kode_kec === bulkKec && item.kode_desa === bulkDesa
    );

    const eligibleItems = inDesa.filter((item) => {
      // 1. Cek hak akses
      if (!isAdmin) {
        if (!currentUser) return false;
        const isMine =
          item.petugas_id === currentUser.id ||
          item.nama_petugas?.toLowerCase() === currentUser.nama.toLowerCase();
        if (!isMine) return false;
      }
      // 2. Wajib dokumen fisik lengkap
      return item.isFisikLengkap;
    });

    const skippedCount = inDesa.length - eligibleItems.length;

    return {
      totalInDesa: inDesa.length,
      eligibleCount: eligibleItems.length,
      skippedCount,
      eligibleItems,
    };
  }, [bulkKec, bulkDesa, mergedDataList, isAdmin, currentUser]);

  // Handler Submit Update Massal per Desa
  const handleSaveBulkDesa = async () => {
    if (!bulkKec || !bulkDesa) {
      alert("Harap pilih Kecamatan dan Desa terlebih dahulu.");
      return;
    }

    if (bulkStatusScan === "keep" && bulkStatusOlah === "keep" && !bulkCatatan.trim()) {
      alert("Harap pilih perubahan Status Scan, Status Olah, atau isi Catatan yang ingin diterapkan.");
      return;
    }

    const { eligibleItems } = bulkPreviewStats;
    if (eligibleItems.length === 0) {
      alert("Tidak ada peta di desa ini yang memenuhi syarat untuk diupdate (pastikan dokumen fisik sudah lengkap dan peta dialokasikan ke Anda).");
      return;
    }

    const confirmMsg = `Anda akan mengupdate ${eligibleItems.length} peta di desa terpilih.\n` +
      `- Status Scan: ${bulkStatusScan === "keep" ? "Tidak diubah" : bulkStatusScan}\n` +
      `- Status Olah: ${bulkStatusOlah === "keep" ? "Tidak diubah" : bulkStatusOlah}\n` +
      (bulkStatusOlah === "Sudah" && bulkTglOlah ? `- Tanggal Selesai: ${bulkTglOlah}\n` : "") +
      (bulkCatatan.trim() ? `- Catatan: ${bulkCatatan.trim()}\n` : "") +
      `Lanjutkan?`;

    if (!window.confirm(confirmMsg)) return;

    setIsBulkSaving(true);
    const updates: Array<Partial<PengolahanRecord> & { idsubsls: string }> = [];

    const defaultDate = new Date().toISOString().split("T")[0];

    eligibleItems.forEach((item) => {
      const currentRec = pengolahanMap.get(item.idsubsls);

      const newScan =
        bulkStatusScan === "keep"
          ? (item.status_scan as "-" | "Sudah" | "Belum")
          : bulkStatusScan;

      const newOlah =
        bulkStatusOlah === "keep"
          ? (item.status_olah as "-" | "Sudah" | "Belum")
          : bulkStatusOlah;

      let newTgl = currentRec?.tgl_selesai_olah || null;
      if (bulkStatusOlah === "Sudah") {
        newTgl = bulkTglOlah.trim() || currentRec?.tgl_selesai_olah || defaultDate;
      } else if (bulkStatusOlah === "Belum" || bulkStatusOlah === "-") {
        newTgl = null;
      }

      const newCatatan = bulkCatatan.trim() ? bulkCatatan.trim() : (currentRec?.catatan || null);

      updates.push({
        idsubsls: item.idsubsls,
        petugas_id: item.petugas_id,
        nama_petugas: item.nama_petugas,
        status_scan: newScan,
        status_olah: newOlah,
        tgl_selesai_olah: newTgl,
        catatan: newCatatan,
      });
    });

    try {
      await bulkUpsertPengolahanRecordsInSupabase(updates);

      // Optimistic update local map
      setPengolahanMap((prev) => {
        const next = new Map(prev);
        updates.forEach((u) => {
          next.set(u.idsubsls, {
            idsubsls: u.idsubsls,
            petugas_id: u.petugas_id || null,
            nama_petugas: u.nama_petugas || null,
            status_scan: u.status_scan || "-",
            status_olah: u.status_olah || "-",
            tgl_selesai_olah: u.tgl_selesai_olah || null,
            catatan: u.catatan || null,
          });
        });
        return next;
      });

      setIsBulkDesaModalOpen(false);
      alert(`Berhasil memperbarui ${updates.length} peta di desa ini!`);
    } catch (err: any) {
      console.error("Gagal update massal per desa:", err);
      alert("Terjadi kesalahan saat menyimpan data: " + (err.message || err));
    } finally {
      setIsBulkSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Standalone Header Bar Tanpa Sidebar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-xs">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-sm shadow hover:bg-brand-600 transition"
              title="Kembali ke Beranda"
            >
              BPS
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900 dark:text-white">
                  🗺️ Pengolahan & Scanning Peta
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                  Sensus Ekonomi 2026
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isAdmin
                  ? "Sistem Distribusi & Pengawasan Pengolahan Peta BPS Kabupaten Lebak"
                  : `Portal Petugas Pengolahan: ${currentUser?.nama || "Petugas"}`}
              </p>
            </div>
          </div>

          {/* Action Buttons & Status Login */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tombol Dashboard Rekapitulasi (Fullscreen Modal) */}
            <button
              onClick={() => setIsDashboardModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow transition cursor-pointer"
              title="Buka Dashboard Rekapitulasi & Progres Wilayah"
            >
              <span className="text-sm">📊</span>
              <span>Dashboard Rekap</span>
            </button>

            <Link
              href="/dok-se2026"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition"
              title="Lihat Pengecekan Dok-SE2026"
            >
              📋 Dok-SE2026
            </Link>

            {isAdmin && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Alokasi
              </button>
            )}

            {/* Tombol Update Massal per Desa (Admin & Petugas) */}
            <button
              onClick={handleOpenBulkDesaModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
              title="Update status scan & selesai olah sekaligus untuk seluruh SLS di suatu desa"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Update Massal Desa
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>

            {/* Status Login / Tombol Login Petugas */}
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[130px]">
                    {currentUser.nama}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                  title="Keluar / Logout Akun"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow transition cursor-pointer"
              >
                🔐 Login Petugas
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1700px] mx-auto p-4 md:p-6 space-y-4">

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

      {/* Menu Filter & Pencarian Proporsional */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <span>Filter Wilayah, Petugas & Status:</span>
          <span className="text-[11px] font-normal lowercase text-gray-400">
            Ditemukan: <strong className="text-brand-600 dark:text-brand-400 font-semibold">{filteredData.length}</strong> dari {mergedDataList.length} SLS
          </span>
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center">
          {/* 1. Filter Kecamatan */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Kecamatan
            </label>
            <select
              value={selectedKec}
              onChange={(e) => {
                setSelectedKec(e.target.value);
                setSelectedDesa("all");
              }}
              className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
            >
              <option value="all">Semua Kecamatan</option>
              {listKecamatan.map((k) => (
                <option key={k.kode} value={k.kode}>
                  [{k.kode}] {k.nama}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Desa */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Desa / Kelurahan
            </label>
            <select
              value={selectedDesa}
              disabled={selectedKec === "all"}
              onChange={(e) => setSelectedDesa(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {selectedKec === "all" ? (
                <option value="all">-- Pilih Kecamatan Terlebih Dahulu --</option>
              ) : (
                <>
                  <option value="all">Semua Desa/Kelurahan</option>
                  {listDesa.map((d) => (
                    <option key={d.kode} value={d.kode}>
                      [{d.kode}] {d.nama}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* 3. Filter Petugas (Admin view) / Status Fisik (Petugas view) */}
          {isAdmin ? (
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Alokasi Petugas
              </label>
              <select
                value={selectedPetugas}
                onChange={(e) => setSelectedPetugas(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                <option value="all">Semua Petugas</option>
                <option value="unassigned">-- Belum Dialokasikan --</option>
                {listPetugas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama} ({u.username || u.role})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Fisik Penerimaan
              </label>
              <select
                value={selectedFisik}
                onChange={(e) => setSelectedFisik(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                <option value="all">Fisik: Semua Status</option>
                <option value="lengkap">Lengkap (Siap Olah)</option>
                <option value="belum_lengkap">Belum Lengkap (Terkunci)</option>
              </select>
            </div>
          )}

          {/* 4. Status Olah & Scan */}
          <div className="md:col-span-3 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Status Scan
              </label>
              <select
                value={selectedStatusScan}
                onChange={(e) => setSelectedStatusScan(e.target.value)}
                className="w-full py-2 px-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                <option value="all">Semua</option>
                <option value="Sudah">Sudah</option>
                <option value="Belum">Belum</option>
                <option value="-">-</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Status Olah
              </label>
              <select
                value={selectedStatusOlah}
                onChange={(e) => setSelectedStatusOlah(e.target.value)}
                className="w-full py-2 px-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                <option value="all">Semua</option>
                <option value="Sudah">Sudah</option>
                <option value="Belum">Belum</option>
                <option value="-">-</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dedicated Search Bar Row with Reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2.5 border-t border-gray-100 dark:border-gray-700">
          <div className="relative w-full sm:w-96">
            <svg
              className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari SLS, ID SubSLS, Desa, atau Petugas..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isAdmin && (
              <select
                value={selectedFisik}
                onChange={(e) => setSelectedFisik(e.target.value)}
                className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                <option value="all">Fisik: Semua Status</option>
                <option value="lengkap">Fisik: Lengkap</option>
                <option value="belum_lengkap">Fisik: Belum Lengkap</option>
              </select>
            )}

            <button
              onClick={() => {
                setSelectedKec("all");
                setSelectedDesa("all");
                setSelectedPetugas("all");
                setSelectedFisik("all");
                setSelectedStatusScan("all");
                setSelectedStatusOlah("all");
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <span>✕</span> Reset Filter
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
                          <option value="-">-</option>
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
                          <option value="-">-</option>
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
      </main>

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
            <code>email_petugas</code> untuk mengalokasikan peta ke petugas pengolahan.
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

      {/* Modal Update Massal per Desa */}
      <Modal
        isOpen={isBulkDesaModalOpen}
        onClose={() => {
          if (!isBulkSaving) setIsBulkDesaModalOpen(false);
        }}
        className="max-w-lg p-6"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-brand-400/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-lg">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Update Status Massal per Desa
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Terapkan status scan, selesai olah, atau catatan sekaligus untuk semua SLS di satu desa.
              </p>
            </div>
          </div>

          {/* Pemilihan Wilayah Desa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Kecamatan
              </label>
              <select
                value={bulkKec}
                onChange={(e) => {
                  const newKec = e.target.value;
                  setBulkKec(newKec);
                  const firstDesa = dokseList.find((d) => d.kode_kec === newKec)?.kode_desa || "";
                  setBulkDesa(firstDesa);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                {listKecamatan.map((k) => (
                  <option key={k.kode} value={k.kode}>
                    [{k.kode}] {k.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Desa / Kelurahan
              </label>
              <select
                value={bulkDesa}
                onChange={(e) => setBulkDesa(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                {listDesaForBulk.map((d) => (
                  <option key={d.kode} value={d.kode}>
                    [{d.kode}] {d.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info Banner Kalkulasi Eligible vs Skipped */}
          <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span>📊 Ringkasan Target Peta:</span>
              <span className="text-[11px] font-mono">
                Total di Desa: {bulkPreviewStats.totalInDesa} SLS
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="bg-white/80 dark:bg-gray-900/60 p-2 rounded-lg border border-emerald-300 dark:border-emerald-800">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold block">
                  ✓ {bulkPreviewStats.eligibleCount} Peta Siap Diupdate
                </span>
                <span className="text-gray-500 text-[10px]">
                  {isAdmin ? "Dokumen fisik lengkap" : "Tugas Anda & fisik lengkap"}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-gray-900/60 p-2 rounded-lg border border-rose-300 dark:border-rose-800">
                <span className="text-rose-700 dark:text-rose-300 font-bold block">
                  ✕ {bulkPreviewStats.skippedCount} Peta Dilewati
                </span>
                <span className="text-gray-500 text-[10px]">
                  Fisik belum lengkap / bukan tugas Anda
                </span>
              </div>
            </div>
          </div>

          {/* Pilihan Perubahan Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Status Scan Peta
              </label>
              <select
                value={bulkStatusScan}
                onChange={(e) =>
                  setBulkStatusScan(e.target.value as "keep" | "-" | "Sudah" | "Belum")
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="keep">-- Jangan Ubah Status Scan --</option>
                <option value="Sudah">Sudah</option>
                <option value="Belum">Belum</option>
                <option value="-">-</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Status Pengolahan
              </label>
              <select
                value={bulkStatusOlah}
                onChange={(e) => {
                  const val = e.target.value as "keep" | "-" | "Sudah" | "Belum";
                  setBulkStatusOlah(val);
                  if (val === "Sudah" && !bulkTglOlah) {
                    setBulkTglOlah(new Date().toISOString().split("T")[0]);
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="keep">-- Jangan Ubah Status Olah --</option>
                <option value="Sudah">Sudah</option>
                <option value="Belum">Belum</option>
                <option value="-">-</option>
              </select>
            </div>
          </div>

          {/* Tanggal Selesai Olah (Muncul jika status olah diubah ke 'Sudah') */}
          {bulkStatusOlah === "Sudah" && (
            <div className="bg-brand-50/50 dark:bg-brand-950/30 p-3 rounded-xl border border-brand-200 dark:border-brand-800/60">
              <label className="block text-xs font-semibold text-brand-900 dark:text-brand-300 mb-1">
                Tanggal Selesai Pengolahan
              </label>
              <input
                type="date"
                value={bulkTglOlah}
                onChange={(e) => setBulkTglOlah(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Default: tanggal hari ini. Akan disimpan ke semua SLS yang berstatus &apos;Sudah&apos;.
              </span>
            </div>
          )}

          {/* Catatan Massal (Opsional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Catatan Pengolahan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Selesai digitasi & validasi batas desa..."
              value={bulkCatatan}
              onChange={(e) => setBulkCatatan(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              Biarkan kosong jika tidak ingin menimpa catatan SLS yang sudah ada.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              disabled={isBulkSaving}
              onClick={() => setIsBulkDesaModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={
                isBulkSaving ||
                bulkPreviewStats.eligibleCount === 0 ||
                (bulkStatusScan === "keep" &&
                  bulkStatusOlah === "keep" &&
                  !bulkCatatan.trim())
              }
              onClick={handleSaveBulkDesa}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBulkSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <span>⚡ Terapkan ke {bulkPreviewStats.eligibleCount} SLS</span>
                </>
              )}
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

      {/* ===================== MODAL DASHBOARD STATISTIK REKAPITULASI (FULL SCREEN) ===================== */}
      {isDashboardModalOpen && (
        <Modal
          isOpen={isDashboardModalOpen}
          onClose={() => setIsDashboardModalOpen(false)}
          showCloseButton={true}
          isFullscreen={true}
          className="p-3 sm:p-5 md:p-6 bg-white dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white"
        >
          <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-5 h-full flex flex-col justify-between">
            {/* Header Dialog Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-3 pr-12 sm:pr-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  🗺️
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Dashboard Progres Scanning & Pengolahan Peta SE2026
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
                      Full Screen View
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sistem Pengawasan Real-time Capaian Scan, Olah, dan Alokasi Beban Petugas BPS Kabupaten Lebak
                  </p>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex items-center gap-1.5 bg-gray-200 dark:bg-gray-800 p-1.5 rounded-2xl self-start sm:self-auto flex-wrap">
                <button
                  onClick={() => setActiveDashboardTab("overview")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeDashboardTab === "overview"
                      ? "bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-xs"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <span>📈</span> Ringkasan Visual Grafik
                </button>
                <button
                  onClick={() => setActiveDashboardTab("progres_wilayah")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeDashboardTab === "progres_wilayah"
                      ? "bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-xs"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <span>🏛️</span> Progres Wilayah (Drill-down)
                </button>
                <button
                  onClick={() => setActiveDashboardTab("progres_petugas")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeDashboardTab === "progres_petugas"
                      ? "bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-xs"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <span>👥</span> Capaian per Petugas
                </button>
              </div>
            </div>

            {/* TAB 1: RINGKASAN VISUAL (CHARTS & CARDS) */}
            {activeDashboardTab === "overview" && (
              <div className="space-y-6 overflow-y-auto pr-1">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total SLS / Peta</span>
                    <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                      {dashboardStats.totalPeta} <span className="text-xs font-medium text-gray-500">Peta SLS</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 shadow-xs">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Dokumen Fisik Lengkap</span>
                    <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                      {dashboardStats.fisikLengkapCount} <span className="text-xs font-medium text-purple-600/70">SLS ({((dashboardStats.fisikLengkapCount / (dashboardStats.totalPeta || 1)) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 shadow-xs">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Sudah Scanning</span>
                    <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                      {dashboardStats.scanSudah} <span className="text-xs font-medium text-blue-600/70">SLS ({dashboardStats.scanPct}%)</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Selesai Pengolahan</span>
                    <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                      {dashboardStats.olahSudah} <span className="text-xs font-medium text-emerald-600/70">SLS ({dashboardStats.olahPct}%)</span>
                    </div>
                  </div>
                </div>

                {/* Visual Charts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Donut Chart Status Olah */}
                  <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs flex flex-col justify-between">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                      🟢 Proporsi Selesai Pengolahan Peta
                    </h3>
                    <div className="w-full flex items-center justify-center my-auto min-h-[280px]">
                      <ReactApexChart
                        options={olahDonutOptions}
                        series={olahDonutSeries}
                        type="donut"
                        width="100%"
                        height={300}
                      />
                    </div>
                  </div>

                  {/* Donut Chart Status Scan */}
                  <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs flex flex-col justify-between">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                      🔵 Proporsi Hasil Scanning Peta
                    </h3>
                    <div className="w-full flex items-center justify-center my-auto min-h-[280px]">
                      <ReactApexChart
                        options={scanDonutOptions}
                        series={scanDonutSeries}
                        type="donut"
                        width="100%"
                        height={300}
                      />
                    </div>
                  </div>

                  {/* Bar Chart 4 Pilar Pengolahan */}
                  <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs flex flex-col justify-between">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                      📊 Perbandingan Komponen Utama
                    </h3>
                    <div className="w-full min-h-[280px]">
                      <ReactApexChart
                        options={overviewBarOptions}
                        series={overviewBarSeries}
                        type="bar"
                        width="100%"
                        height={300}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PROGRES CAPAIAN WILAYAH (DRILL-DOWN INTERAKTIF KECAMATAN → DESA → SLS) */}
            {activeDashboardTab === "progres_wilayah" && (
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                {/* Breadcrumb Navigasi Jalur & Filter Quick Selection */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                  {/* Breadcrumbs */}
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 flex-wrap">
                    <button
                      onClick={() => {
                        setDashSelectedKec("all");
                        setDashSelectedDesa("all");
                      }}
                      className={`px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        dashSelectedKec === "all"
                          ? "bg-brand-500 text-white border-brand-500"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                      }`}
                    >
                      🏛️ Semua Kecamatan ({kecProgressList.length})
                    </button>

                    {dashSelectedKec !== "all" && (
                      <>
                        <span className="text-gray-400">➔</span>
                        <button
                          onClick={() => setDashSelectedDesa("all")}
                          className={`px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                            dashSelectedDesa === "all"
                              ? "bg-brand-500 text-white border-brand-500"
                              : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                          }`}
                        >
                          🏡 Kecamatan {kecProgressList.find((k) => k.kode === dashSelectedKec)?.nama} ({desaProgressList.length} Desa)
                        </button>
                      </>
                    )}

                    {dashSelectedDesa !== "all" && (
                      <>
                        <span className="text-gray-400">➔</span>
                        <span className="px-3 py-1.5 rounded-xl bg-purple-600 text-white border border-purple-600">
                          📍 Desa {desaProgressList.find((d) => d.kode === dashSelectedDesa)?.nama} ({slsProgressList.length} SLS)
                        </span>
                      </>
                    )}
                  </div>

                  {/* Reset Drill-down Button */}
                  {(dashSelectedKec !== "all" || dashSelectedDesa !== "all") && (
                    <button
                      onClick={() => {
                        setDashSelectedKec("all");
                        setDashSelectedDesa("all");
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition cursor-pointer self-end md:self-auto"
                    >
                      ⬅️ Kembali ke Rekap Kecamatan
                    </button>
                  )}
                </div>

                {/* Content Table Container Full Height */}
                <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs">
                  {/* LEVEL 1: TABEL KECAMATAN */}
                  {dashSelectedKec === "all" && (
                    <div className="p-2 sm:p-3 space-y-2.5">
                      <div className="bg-gray-50 dark:bg-gray-700/60 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                        <span>🏛️ Rekapitulasi Seluruh 28 Kecamatan (BPS Kab. Lebak)</span>
                        <span className="text-brand-600 dark:text-brand-400 font-semibold text-[11px] hidden sm:inline">*Klik baris kecamatan untuk rincian desa</span>
                      </div>

                      {/* Desktop View: 2 Kolom Berdampingan */}
                      <div className="hidden lg:grid lg:grid-cols-2 gap-3">
                        {[
                          kecProgressList.slice(0, Math.ceil(kecProgressList.length / 2)),
                          kecProgressList.slice(Math.ceil(kecProgressList.length / 2)),
                        ].map((group, groupIdx) => (
                          <div key={groupIdx} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-600 uppercase tracking-wider text-[10px]">
                                  <th className="py-1.5 px-2.5 w-12 text-center">Kd</th>
                                  <th className="py-1.5 px-2.5">Kecamatan</th>
                                  <th className="py-1.5 px-2 text-center w-14">SLS</th>
                                  <th className="py-1.5 px-2 text-center w-20 text-blue-600">Scan</th>
                                  <th className="py-1.5 px-2 text-center w-24 text-emerald-600">Olah</th>
                                  <th className="py-1.5 px-2 text-center w-36">Progres Olah</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-[11px]">
                                {group.map((k) => {
                                  const pct = Math.round((k.olahSudah / (k.total || 1)) * 100);
                                  return (
                                    <tr
                                      key={k.kode}
                                      onClick={() => setDashSelectedKec(k.kode)}
                                      className="hover:bg-brand-50/70 dark:hover:bg-brand-950/40 cursor-pointer transition select-none"
                                    >
                                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-brand-600 text-[11px]">{k.kode}</td>
                                      <td className="py-1.5 px-2.5 font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{k.nama}</td>
                                      <td className="py-1.5 px-2 text-center font-semibold text-gray-600 dark:text-gray-400">{k.total}</td>
                                      <td className="py-1.5 px-2 text-center font-semibold text-blue-600 dark:text-blue-400">{k.scanSudah}</td>
                                      <td className="py-1.5 px-2 text-center font-bold">
                                        <span className="text-emerald-600">{k.olahSudah}</span>
                                        <span className="text-gray-400 mx-1">/</span>
                                        <span className="text-rose-500">{k.olahBelum}</span>
                                      </td>
                                      <td className="py-1.5 px-2 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                            <div
                                              className={`h-2 rounded-full transition-all ${
                                                pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                                              }`}
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                          <span className="font-extrabold text-[11px] text-gray-900 dark:text-white w-8 text-right">{pct}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>

                      {/* Mobile View: Kartu Minimalis */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-2">
                        {kecProgressList.map((k) => {
                          const pct = Math.round((k.olahSudah / (k.total || 1)) * 100);
                          return (
                            <div
                              key={k.kode}
                              onClick={() => setDashSelectedKec(k.kode)}
                              className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-500 cursor-pointer shadow-xs transition"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                                    {k.kode}
                                  </span>
                                  <h4 className="font-bold text-xs text-gray-900 dark:text-white">{k.nama}</h4>
                                </div>
                                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                                  pct === 100
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    : pct >= 50
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                }`}>
                                  {pct}% Olah
                                </span>
                              </div>

                              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden mb-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                                <span>Total: <strong>{k.total}</strong> SLS</span>
                                <span>Scan: <strong className="text-blue-600">{k.scanSudah}</strong></span>
                                <span className="text-brand-600 dark:text-brand-400 font-bold text-[10px]">Rincian Desa ➔</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* LEVEL 2: TABEL DESA (Ketika Kecamatan Dipilih) */}
                  {dashSelectedKec !== "all" && dashSelectedDesa === "all" && (
                    <div className="p-2 sm:p-3 space-y-2.5">
                      <div className="bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center justify-between">
                        <span>
                          🏡 Daftar Desa pada Kecamatan {kecProgressList.find((k) => k.kode === dashSelectedKec)?.nama} ({desaProgressList.length} Desa/Kelurahan)
                        </span>
                        <span className="font-semibold text-[11px] hidden sm:inline">*Klik desa untuk melihat rincian baris SLS</span>
                      </div>

                      {/* Desktop View: Tabel Desa */}
                      <div className="hidden lg:grid lg:grid-cols-2 gap-3">
                        {[
                          desaProgressList.slice(0, Math.ceil(desaProgressList.length / 2)),
                          desaProgressList.slice(Math.ceil(desaProgressList.length / 2)),
                        ].map((group, groupIdx) => (
                          <div key={groupIdx} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-600 uppercase tracking-wider text-[10px]">
                                  <th className="py-1.5 px-2.5 w-12 text-center">Kd</th>
                                  <th className="py-1.5 px-2.5">Desa / Kelurahan</th>
                                  <th className="py-1.5 px-2 text-center w-14">SLS</th>
                                  <th className="py-1.5 px-2 text-center w-20 text-blue-600">Scan</th>
                                  <th className="py-1.5 px-2 text-center w-24 text-emerald-600">Olah</th>
                                  <th className="py-1.5 px-2 text-center w-36">Progres Olah</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-[11px]">
                                {group.map((d) => {
                                  const pct = Math.round((d.olahSudah / (d.total || 1)) * 100);
                                  return (
                                    <tr
                                      key={d.kode}
                                      onClick={() => setDashSelectedDesa(d.kode)}
                                      className="hover:bg-purple-50/70 dark:hover:bg-purple-950/40 cursor-pointer transition select-none"
                                    >
                                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-purple-600 text-[11px]">{d.kode}</td>
                                      <td className="py-1.5 px-2.5 font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{d.nama}</td>
                                      <td className="py-1.5 px-2 text-center font-semibold text-gray-600 dark:text-gray-400">{d.total}</td>
                                      <td className="py-1.5 px-2 text-center font-semibold text-blue-600 dark:text-blue-400">{d.scanSudah}</td>
                                      <td className="py-1.5 px-2 text-center font-bold">
                                        <span className="text-emerald-600">{d.olahSudah}</span>
                                        <span className="text-gray-400 mx-1">/</span>
                                        <span className="text-rose-500">{d.olahBelum}</span>
                                      </td>
                                      <td className="py-1.5 px-2 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                            <div
                                              className={`h-2 rounded-full transition-all ${
                                                pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                                              }`}
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                          <span className="font-extrabold text-[11px] text-gray-900 dark:text-white w-8 text-right">{pct}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>

                      {/* Mobile View: Kartu Desa */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-2">
                        {desaProgressList.map((d) => {
                          const pct = Math.round((d.olahSudah / (d.total || 1)) * 100);
                          return (
                            <div
                              key={d.kode}
                              onClick={() => setDashSelectedDesa(d.kode)}
                              className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-500 cursor-pointer shadow-xs transition"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                                    {d.kode}
                                  </span>
                                  <h4 className="font-bold text-xs text-gray-900 dark:text-white">{d.nama}</h4>
                                </div>
                                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                                  pct === 100
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    : pct >= 50
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                }`}>
                                  {pct}%
                                </span>
                              </div>

                              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden mb-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                                <span>Total: <strong>{d.total}</strong> SLS</span>
                                <span>Scan: <strong className="text-blue-600">{d.scanSudah}</strong></span>
                                <span className="text-purple-600 dark:text-purple-400 font-bold text-[10px]">Rincian SLS ➔</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* LEVEL 3: TABEL RINCIAN DETAIL SLS / SUBSLS */}
                  {dashSelectedKec !== "all" && dashSelectedDesa !== "all" && (
                    <div className="p-2 sm:p-3 space-y-2.5">
                      <div className="bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center justify-between">
                        <span>
                          📍 Rincian Detail SLS pada Desa {desaProgressList.find((d) => d.kode === dashSelectedDesa)?.nama} ({slsProgressList.length} Baris SLS)
                        </span>
                        <span className="font-normal text-[11px] text-gray-500 dark:text-gray-400 hidden sm:inline">*Menampilkan status scan, olah, & petugas alokasi</span>
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden sm:block rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-600 uppercase tracking-wider text-[10px]">
                              <th className="py-2 px-3 w-36">ID SubSLS</th>
                              <th className="py-2 px-3 min-w-[160px]">Nama SLS / SubSLS</th>
                              <th className="py-2 px-3 w-32">Petugas</th>
                              <th className="py-2 px-2.5 text-center w-24">Scan</th>
                              <th className="py-2 px-2.5 text-center w-24">Olah</th>
                              <th className="py-2 px-3 min-w-[220px]">Catatan / Kendala</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-[11px]">
                            {slsProgressList.map((item) => (
                              <tr key={item.idsubsls} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                <td className="py-2 px-3 font-mono font-bold text-brand-600 text-xs">{item.idsubsls}</td>
                                <td className="py-2 px-3 font-bold text-gray-900 dark:text-white text-xs">{item.nama_sls}</td>
                                <td className="py-2 px-3 text-xs">
                                  {item.nama_petugas ? (
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{item.nama_petugas}</span>
                                  ) : (
                                    <span className="text-gray-400 italic">Belum Dialokasi</span>
                                  )}
                                </td>
                                <td className="py-2 px-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.status_scan === "Sudah"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                  }`}>
                                    {item.status_scan}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.status_olah === "Sudah"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                      : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  }`}>
                                    {item.status_olah}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  {item.pendingTasks.length === 0 ? (
                                    <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                                      <span>✓</span> Lengkap & Selesai
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {item.pendingTasks.map((pt, idx) => (
                                        <span
                                          key={idx}
                                          className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-semibold"
                                        >
                                          ⚠️ {pt}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View: Kartu SLS */}
                      <div className="space-y-2 sm:hidden">
                        {slsProgressList.map((item) => (
                          <div
                            key={item.idsubsls}
                            className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-[11px] font-bold text-brand-600">{item.idsubsls}</span>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.status_scan === "Sudah" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                                }`}>
                                  Scan: {item.status_scan}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.status_olah === "Sudah" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                }`}>
                                  Olah: {item.status_olah}
                                </span>
                              </div>
                            </div>
                            <div className="font-bold text-xs text-gray-900 dark:text-white mb-1">{item.nama_sls}</div>
                            <div className="text-[11px] text-gray-500 mb-2">
                              Petugas: <strong>{item.nama_petugas || "Belum ada"}</strong>
                            </div>
                            {item.pendingTasks.length === 0 ? (
                              <div className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                                <span>✓</span> Selesai Olah & Scan
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 flex-wrap">
                                {item.pendingTasks.map((pt, idx) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 text-[10px] font-semibold"
                                  >
                                    ⚠️ {pt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: PROGRES PETUGAS PENGOLAHAN */}
            {activeDashboardTab === "progres_petugas" && (
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      👥 Rekapitulasi Beban & Capaian Masing-Masing Petugas
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Evaluasi volume alokasi tugas, status scanning, dan progres penyelesaian pengolahan peta.
                    </p>
                  </div>
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Cari nama petugas..."
                      value={dashPetugasSearchQuery}
                      onChange={(e) => setDashPetugasSearchQuery(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Tabel Capaian Petugas */}
                <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs p-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-600 uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Nama Petugas</th>
                          <th className="py-2.5 px-3 text-center w-24">Beban SLS</th>
                          <th className="py-2.5 px-3 text-center w-28 text-blue-600">Sudah Scan</th>
                          <th className="py-2.5 px-3 text-center w-36 text-emerald-600">Selesai Olah</th>
                          <th className="py-2.5 px-3 text-center w-48">Persentase Pengolahan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                        {petugasProgressList.map((p) => {
                          const pct = p.total > 0 ? Math.round((p.olahSudah / p.total) * 100) : 0;
                          const scanPct = p.total > 0 ? Math.round((p.scanSudah / p.total) * 100) : 0;

                          return (
                            <tr key={p.petugasId} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                  <span>{p.petugasId === "unassigned" ? "⚠️" : "👤"}</span>
                                  <span className={p.petugasId === "unassigned" ? "text-rose-600 italic" : ""}>{p.nama}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-gray-800 dark:text-gray-200">
                                {p.total}
                              </td>
                              <td className="py-2.5 px-3 text-center font-semibold text-blue-600 dark:text-blue-400">
                                {p.scanSudah} <span className="text-[10px] text-gray-400">({scanPct}%)</span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold">
                                <span className="text-emerald-600">{p.olahSudah}</span>
                                <span className="text-gray-400 mx-1">/</span>
                                <span className="text-rose-500">{p.olahBelum}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                    <div
                                      className={`h-2.5 rounded-full transition-all ${
                                        pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="font-extrabold text-xs text-gray-900 dark:text-white w-9 text-right">
                                    {pct}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
