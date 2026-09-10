"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { mockDokseData, DokseItem } from "@/lib/dokse-data";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import * as XLSX from "xlsx";
import {
  getDokseDataFromSupabase,
  updateDokseItemInSupabase,
  bulkInsertDokseDataToSupabase,
} from "@/lib/supabase/dokse-service";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function Dokse2026Page() {
  // State Data Utama Dokse 2026
  const [dataList, setDataList] = useState<DokseItem[]>([]);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(true);

  // Load Data dari Supabase saat Komponen Dimuat
  useEffect(() => {
    async function loadData() {
      setIsLoadingSupabase(true);
      const remoteData = await getDokseDataFromSupabase();
      setDataList(remoteData || []);
      setIsLoadingSupabase(false);
    }

    loadData();
  }, []);



  // State Modal Dashboard Stats
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState<"overview" | "progres_wilayah">("overview");

  // State Drilldown Progres Wilayah di Dashboard
  const [dashSelectedKec, setDashSelectedKec] = useState<string>("all");
  const [dashSelectedDesa, setDashSelectedDesa] = useState<string>("all");

  // State Import Excel Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");

  // State Modal Edit Keterangan Panjang
  const [editingKeteranganItem, setEditingKeteranganItem] = useState<DokseItem | null>(null);
  const [keteranganInput, setKeteranganInput] = useState("");

  // Filter Berjenjang
  const [selectedKec, setSelectedKec] = useState<string>("all");
  const [selectedDesa, setSelectedDesa] = useState<string>("all");
  const [selectedSls, setSelectedSls] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 1. Opsi Filter Kecamatan (Terurut berdasarkan Kode Sort)
  const listKecamatan = useMemo(() => {
    const map = new Map<string, string>();
    dataList.forEach((d) => map.set(d.kode_kec, d.nama_kec));
    return Array.from(map.entries())
      .map(([kode, nama]) => ({ kode, nama }))
      .sort((a, b) => a.kode.localeCompare(b.kode));
  }, [dataList]);

  // 2. Opsi Filter Desa Berjenjang (Terurut berdasarkan Kode Sort Desa)
  const listDesa = useMemo(() => {
    let filtered = dataList;
    if (selectedKec !== "all") {
      filtered = filtered.filter((d) => d.kode_kec === selectedKec);
    }
    const map = new Map<string, string>();
    filtered.forEach((d) => map.set(d.kode_desa, d.nama_desa));
    return Array.from(map.entries())
      .map(([kode, nama]) => ({ kode, nama }))
      .sort((a, b) => a.kode.localeCompare(b.kode));
  }, [dataList, selectedKec]);

  // 3. Opsi Filter SLS Berjenjang (Terurut berdasarkan idsubsls)
  const listSls = useMemo(() => {
    let filtered = dataList;
    if (selectedKec !== "all") {
      filtered = filtered.filter((d) => d.kode_kec === selectedKec);
    }
    if (selectedDesa !== "all") {
      filtered = filtered.filter((d) => d.kode_desa === selectedDesa);
    }
    return filtered
      .map((d) => ({ idsubsls: d.idsubsls, nama: d.nama_sls }))
      .sort((a, b) => a.idsubsls.localeCompare(b.idsubsls));
  }, [dataList, selectedKec, selectedDesa]);

  // Handler Reset Filter Berjenjang
  const handleResetFilter = () => {
    setSelectedKec("all");
    setSelectedDesa("all");
    setSelectedSls("all");
    setSelectedStatus("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Helper Hitung Status Penerimaan Otomatis
  // Status "Lengkap" jika 4 pengecekan utama terisi: Peta Desa="Ada", Peta Sub-RT="Ada", Dokumen PSLS="Ada", Peta Terisi="Ya"
  const getStatusPenerimaan = (item: DokseItem): "Lengkap" | "Tidak Lengkap" => {
    if (
      item.peta_desa === "Ada" &&
      item.peta_subrt === "Ada" &&
      item.dokumen_psls === "Ada" &&
      item.peta_terisi === "Ya"
    ) {
      return "Lengkap";
    }
    return "Tidak Lengkap";
  };

  // Rekapitulasi Statistik Dashboard
  const dashboardStats = useMemo(() => {
    const totalSls = dataList.length;
    let lengkapCount = 0;
    let tidakLengkapCount = 0;

    let petaDesaAda = 0;
    let petaDesaTidak = 0;

    let petaSubRtAda = 0;
    let petaSubRtTidak = 0;

    let pslsAda = 0;
    let pslsTidak = 0;

    let petaTerisiAda = 0; // "Ya"
    let petaTerisiTidak = 0; // "Tidak"

    let perubahanBatasAda = 0;
    let perubahanBatasTidak = 0;

    dataList.forEach((item) => {
      const st = getStatusPenerimaan(item);
      if (st === "Lengkap") lengkapCount++;
      else tidakLengkapCount++;

      if (item.peta_desa === "Ada") petaDesaAda++;
      else if (item.peta_desa === "Tidak") petaDesaTidak++;

      if (item.peta_subrt === "Ada") petaSubRtAda++;
      else if (item.peta_subrt === "Tidak") petaSubRtTidak++;

      if (item.dokumen_psls === "Ada") pslsAda++;
      else if (item.dokumen_psls === "Tidak") pslsTidak++;

      if (item.peta_terisi === "Ya") petaTerisiAda++;
      else if (item.peta_terisi === "Tidak") petaTerisiTidak++;

      if (item.perubahan_batas === "Ada") perubahanBatasAda++;
      else if (item.perubahan_batas === "Tidak") perubahanBatasTidak++;
    });

    return {
      totalSls,
      lengkapCount,
      tidakLengkapCount,
      petaDesaAda,
      petaDesaTidak,
      petaSubRtAda,
      petaSubRtTidak,
      pslsAda,
      pslsTidak,
      petaTerisiAda,
      petaTerisiTidak,
      perubahanBatasAda,
      perubahanBatasTidak,
    };
  }, [dataList]);

  // ApexCharts Configs untuk Modal Dashboard
  const statusDonutSeries = useMemo(() => [
    dashboardStats.lengkapCount,
    dashboardStats.tidakLengkapCount
  ], [dashboardStats]);

  const statusDonutOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
    },
    labels: ["Lengkap", "Tidak Lengkap"],
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
              label: "Total SLS",
              formatter: () => `${dashboardStats.totalSls}`,
            },
          },
        },
      },
    },
  }), [dashboardStats]);

  const componentsBarSeries = useMemo(() => [
    {
      name: "Ada / Ya",
      data: [
        dashboardStats.petaDesaAda,
        dashboardStats.petaSubRtAda,
        dashboardStats.pslsAda,
        dashboardStats.petaTerisiAda,
        dashboardStats.perubahanBatasAda,
      ],
    },
    {
      name: "Tidak / Belum",
      data: [
        dashboardStats.petaDesaTidak,
        dashboardStats.petaSubRtTidak,
        dashboardStats.pslsTidak,
        dashboardStats.petaTerisiTidak,
        dashboardStats.perubahanBatasTidak,
      ],
    },
  ], [dashboardStats]);

  const componentsBarOptions: ApexOptions = useMemo(() => ({
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
        columnWidth: "50%",
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: true,
    },
    xaxis: {
      categories: ["Peta Desa", "Peta Sub-RT", "Dokumen PSLS", "Peta Terisi", "Perubahan Batas"],
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
    const map = new Map<string, { kode: string; nama: string; total: number; lengkap: number; tidakLengkap: number }>();

    dataList.forEach((item) => {
      const existing = map.get(item.kode_kec) || {
        kode: item.kode_kec,
        nama: item.nama_kec,
        total: 0,
        lengkap: 0,
        tidakLengkap: 0,
      };

      existing.total += 1;
      if (getStatusPenerimaan(item) === "Lengkap") {
        existing.lengkap += 1;
      } else {
        existing.tidakLengkap += 1;
      }

      map.set(item.kode_kec, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.kode.localeCompare(b.kode));
  }, [dataList]);

  // Rekapitulasi Progres Capaian Per Desa (Filtered by dashSelectedKec)
  const desaProgressList = useMemo(() => {
    let filtered = dataList;
    if (dashSelectedKec !== "all") {
      filtered = filtered.filter((d) => d.kode_kec === dashSelectedKec);
    }

    const map = new Map<string, { kode: string; nama: string; namaKec: string; total: number; lengkap: number; tidakLengkap: number }>();

    filtered.forEach((item) => {
      const existing = map.get(item.kode_desa) || {
        kode: item.kode_desa,
        nama: item.nama_desa,
        namaKec: item.nama_kec,
        total: 0,
        lengkap: 0,
        tidakLengkap: 0,
      };

      existing.total += 1;
      if (getStatusPenerimaan(item) === "Lengkap") {
        existing.lengkap += 1;
      } else {
        existing.tidakLengkap += 1;
      }

      map.set(item.kode_desa, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.kode.localeCompare(b.kode));
  }, [dataList, dashSelectedKec]);

  // Daftar Detail SLS / SubSLS (Filtered by dashSelectedKec & dashSelectedDesa)
  const slsProgressList = useMemo(() => {
    let filtered = dataList;
    if (dashSelectedKec !== "all") {
      filtered = filtered.filter((d) => d.kode_kec === dashSelectedKec);
    }
    if (dashSelectedDesa !== "all") {
      filtered = filtered.filter((d) => d.kode_desa === dashSelectedDesa);
    }

    return filtered.map((item) => {
      const st = getStatusPenerimaan(item);
      const missingParts: string[] = [];
      if (item.peta_desa !== "Ada") missingParts.push("Peta Desa");
      if (item.peta_subrt !== "Ada") missingParts.push("Peta Sub-RT");
      if (item.dokumen_psls !== "Ada") missingParts.push("Dokumen PSLS");
      if (item.peta_terisi !== "Ya") missingParts.push("Peta Terisi");

      return {
        ...item,
        statusPenerimaan: st,
        missingParts,
      };
    }).sort((a, b) => a.idsubsls.localeCompare(b.idsubsls));
  }, [dataList, dashSelectedKec, dashSelectedDesa]);

  // Filter Data Utama
  const filteredData = useMemo(() => {
    let result = dataList.filter((item) => {
      // 1. Filter Kecamatan
      if (selectedKec !== "all" && item.kode_kec !== selectedKec) return false;

      // 2. Filter Desa
      if (selectedDesa !== "all" && item.kode_desa !== selectedDesa) return false;

      // 3. Filter SLS
      if (selectedSls !== "all" && item.idsubsls !== selectedSls) return false;

      // 4. Filter Status Penerimaan
      if (selectedStatus !== "all") {
        const st = getStatusPenerimaan(item);
        if (selectedStatus === "lengkap" && st !== "Lengkap") return false;
        if (selectedStatus === "tidak_lengkap" && st !== "Tidak Lengkap") return false;
      }

      // 5. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = (item.nama_sls || "").toLowerCase().includes(q);
        const matchDesa = (item.nama_desa || "").toLowerCase().includes(q);
        const matchKec = (item.nama_kec || "").toLowerCase().includes(q);
        const matchId = (item.idsubsls || "").toLowerCase().includes(q);
        const matchKet = (item.keterangan || "").toLowerCase().includes(q);
        const matchJenis = (item.jenis || "").toLowerCase().includes(q);
        const matchKodeSls = (item.kode_sls || "").toLowerCase().includes(q);
        const matchKodeSubsls = (item.kode_subsls || "").toLowerCase().includes(q);
        if (
          !matchNama &&
          !matchDesa &&
          !matchKec &&
          !matchId &&
          !matchKet &&
          !matchJenis &&
          !matchKodeSls &&
          !matchKodeSubsls
        )
          return false;
      }

      return true;
    });

    // Otomatis terurut dari idsubsls
    return result.sort((a, b) => a.idsubsls.localeCompare(b.idsubsls));
  }, [dataList, selectedKec, selectedDesa, selectedSls, selectedStatus, searchQuery]);

  // Reset pagination saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKec, selectedDesa, selectedSls, selectedStatus, searchQuery]);

  // Calculations for Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Handler Update Kolom Pengecekan
  // CATATAN KHUSUS: Jika Peta Desa diubah, maka seluruh SLS dalam desa yang sama otomatis ikut berubah!
  const handleUpdateItem = async (idsubsls: string, field: keyof DokseItem, value: string) => {
    const targetItem = dataList.find((d) => d.idsubsls === idsubsls);
    if (!targetItem) return;

    if (field === "peta_desa") {
      const targetKodeDesa = targetItem.kode_desa;
      const updatedList = dataList.map((item) =>
        item.kode_desa === targetKodeDesa
          ? { ...item, peta_desa: value as "Ada" | "Tidak" | "-" }
          : item
      );
      setDataList(updatedList);

      // Batch sync items of the same village to Supabase
      const affectedItems = updatedList.filter((item) => item.kode_desa === targetKodeDesa);
      await bulkInsertDokseDataToSupabase(affectedItems);
    } else {
      const updatedItem = { ...targetItem, [field]: value };
      setDataList((prev) =>
        prev.map((item) => (item.idsubsls === idsubsls ? updatedItem : item))
      );

      // Single item sync to Supabase
      await updateDokseItemInSupabase(updatedItem);
    }
  };

  // State Admin / Login Mode (Default: View Only)
  const { currentUser, loginWithCredentials } = useAuth();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Otomatis Aktifkan Mode Edit jika user yang login di sistem utama ber-role Administrator/Admin Humas
  useEffect(() => {
    if (currentUser && (currentUser.role === "administrator" || currentUser.role === "admin_humas")) {
      setIsAdminLoggedIn(true);
    }
  }, [currentUser]);

  // Handler Login Admin (Terhubung ke Supabase User Service)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    const success = await loginWithCredentials(loginForm.username.trim(), loginForm.password.trim());
    setIsLoggingIn(false);

    if (success) {
      setIsAdminLoggedIn(true);
      setIsLoginModalOpen(false);
      setLoginForm({ username: "", password: "" });
    } else {
      setLoginError("Username/Email atau Password tidak cocok dengan akun Supabase!");
    }
  };

  // Handler Export CSV / Excel
  const handleExportExcel = () => {
    const headers = [
      "ID SubSLS",
      "Nama SLS",
      "Jenis",
      "Kode Kecamatan",
      "Nama Kecamatan",
      "Kode Desa",
      "Nama Desa",
      "Kode SLS",
      "Kode SubSLS",
      "Peta Desa",
      "Peta Sub-RT",
      "Dokumen PSLS",
      "Peta Terisi",
      "Perubahan Batas Wilayah",
      "Status Penerimaan",
      "Keterangan",
    ];

    const rows = filteredData.map((item) => [
      `"${item.idsubsls || ""}"`,
      `"${item.nama_sls || ""}"`,
      `"${item.jenis || ""}"`,
      `"${item.kode_kec || ""}"`,
      `"${item.nama_kec || ""}"`,
      `"${item.kode_desa || ""}"`,
      `"${item.nama_desa || ""}"`,
      `"${item.kode_sls || ""}"`,
      `"${item.kode_subsls || ""}"`,
      `"${item.peta_desa || ""}"`,
      `"${item.peta_subrt || ""}"`,
      `"${item.dokumen_psls || ""}"`,
      `"${item.peta_terisi || ""}"`,
      `"${item.perubahan_batas || ""}"`,
      `"${getStatusPenerimaan(item)}"`,
      `"${(item.keterangan || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pengecekan-dok-se2026-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  // Handler Unduh Template Excel (.xlsx)
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "ID SubSLS": "360201000100100",
        "Nama SLS": "RT 001 / RW 001",
        "Jenis": "SLS",
        "Kode Kecamatan": "010",
        "Nama Kecamatan": "Malingping",
        "Kode Desa": "001",
        "Nama Desa": "Malingping Utara",
        "Kode SLS": "001",
        "Kode SubSLS": "00",
        "Peta Desa": "Ada",
        "Peta Sub-RT": "Ada",
        "Dokumen PSLS": "Ada",
        "Peta Terisi": "Ya",
        "Perubahan Batas": "Tidak",
        "Keterangan": "Contoh catatan kelengkapan",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Dokse 2026");

    XLSX.writeFile(workbook, "template-pengecekan-dokse2026.xlsx");
  };

  // Handler Simple Import Data (JSON / CSV / Paste Excel)
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    try {
      let itemsToInsert: DokseItem[] = [];

      // Try parsing JSON first
      if (importText.trim().startsWith("[")) {
        const rawJson = JSON.parse(importText);
        itemsToInsert = rawJson.map((row: any, i: number) => ({
          idsubsls: String(row.idsubsls || row["id subsls"] || row["ID SubSLS"] || `sls_${Date.now()}_${i}`),
          nama_sls: String(row.nama_sls || row["nama sls"] || row["Nama SLS"] || row.sls || "SLS"),
          jenis: String(row.jenis || row["Jenis"] || ""),
          kode_kec: String(row.kode_kec || row["kode kec"] || row["Kode Kecamatan"] || row["kode kecamatan"] || row.kecamatan?.substring(0, 3) || "010"),
          nama_kec: String(row.nama_kec || row["nama kec"] || row["Nama Kecamatan"] || row["nama kecamatan"] || row.kecamatan || "Kecamatan"),
          kode_desa: String(row.kode_desa || row["kode desa"] || row["Kode Desa"] || row["kode desa"] || row.desa?.substring(0, 3) || "001"),
          nama_desa: String(row.nama_desa || row["nama desa"] || row["Nama Desa"] || row["nama desa"] || row.desa || "Desa"),
          kode_sls: String(row.kode_sls || row["kode sls"] || row["Kode SLS"] || ""),
          kode_subsls: String(row.kode_subsls || row["kode subsls"] || row["Kode SubSLS"] || ""),
          peta_desa: (row.peta_desa || row["peta desa"] || row["Peta Desa"] || "Ada") as "Ada" | "Tidak" | "-",
          peta_subrt: (row.peta_subrt || row["peta subrt"] || row["Peta Sub-RT"] || row["Peta SubRT"] || "Ada") as "Ada" | "Tidak" | "-",
          dokumen_psls: (row.dokumen_psls || row["dokumen psls"] || row["Dokumen PSLS"] || "Ada") as "Ada" | "Tidak" | "-",
          peta_terisi: (row.peta_terisi || row["peta terisi"] || row["Peta Terisi"] || "Ya") as "Ya" | "Tidak" | "-",
          perubahan_batas: (row.perubahan_batas || row["perubahan batas"] || row["Perubahan Batas"] || "Tidak") as "Ada" | "Tidak" | "-",
          keterangan: String(row.keterangan || row["keterangan"] || row["Keterangan"] || ""),
        }));
      } else {
        // Parse CSV or Tab-Separated Values (Copy Paste dari Excel)
        const lines = importText.trim().split(/\r?\n/);
        const headers = lines[0].split(/,|\t/).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols = lines[i].split(/,|\t/).map((c) => c.trim().replace(/^"|"$/g, ""));
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = cols[idx] || "";
          });

          if (row.idsubsls || row["id subsls"] || row["id_subsls"]) {
            itemsToInsert.push({
              idsubsls: row.idsubsls || row["id subsls"] || row["id_subsls"] || `sls_${Date.now()}_${i}`,
              nama_sls: row.nama_sls || row["nama sls"] || row["nama_sls"] || row["sls"] || "SLS",
              jenis: row.jenis || "",
              kode_kec: row.kode_kec || row["kode kec"] || row["kode_kec"] || row["kode kecamatan"] || row.kecamatan?.substring(0, 3) || "010",
              nama_kec: row.nama_kec || row["nama kec"] || row["nama_kec"] || row["nama kecamatan"] || row.kecamatan || "Kecamatan",
              kode_desa: row.kode_desa || row["kode desa"] || row["kode_desa"] || row["kode desa/kelurahan"] || row.desa?.substring(0, 3) || "001",
              nama_desa: row.nama_desa || row["nama desa"] || row["nama_desa"] || row["nama desa/kelurahan"] || row.desa || "Desa",
              kode_sls: row.kode_sls || row["kode sls"] || row["kode_sls"] || "",
              kode_subsls: row.kode_subsls || row["kode subsls"] || row["kode_subsls"] || "",
              peta_desa: (row.peta_desa || row["peta desa"] || row["peta_desa"] || "Ada") as "Ada" | "Tidak" | "-",
              peta_subrt: (row.peta_subrt || row["peta subrt"] || row["peta_subrt"] || row["peta sub-rt"] || "Ada") as "Ada" | "Tidak" | "-",
              dokumen_psls: (row.dokumen_psls || row["dokumen psls"] || row["dokumen_psls"] || "Ada") as "Ada" | "Tidak" | "-",
              peta_terisi: (row.peta_terisi || row["peta terisi"] || row["peta_terisi"] || "Ya") as "Ya" | "Tidak" | "-",
              perubahan_batas: (row.perubahan_batas || row["perubahan batas"] || row["perubahan_batas"] || "Tidak") as "Ada" | "Tidak" | "-",
              keterangan: row.keterangan || "",
            });
          }
        }
      }

      if (itemsToInsert.length > 0) {
        setDataList(itemsToInsert);
        await bulkInsertDokseDataToSupabase(itemsToInsert);
        setIsImportModalOpen(false);
        setImportText("");
        alert(`Berhasil mengunggah & menyinkronkan ${itemsToInsert.length} data ke Supabase!`);
      } else {
        alert("Format data tidak valid! Harap pastikan header kolom sesuai dengan template.");
      }
    } catch {
      alert("Gagal membaca data! Harap gunakan format CSV/Tab-Separated dari Excel atau JSON yang valid.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Standalone Header Bar Tanpa Sidebar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-xs">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-sm shadow">
              BPS
            </Link>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white">
                📋 Pengecekan Dokumen Sensus Ekonomi 2026
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sistem Validasi & Pengawasan Kelengkapan Peta dan Dokumen PSLS BPS Kabupaten Lebak
              </p>
            </div>
          </div>

          {/* Actions & Status Login Admin */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Indikator Status Admin jika logged in */}
            {isAdminLoggedIn && (
              <span className="text-xs px-3 py-1.5 rounded-xl font-semibold border flex items-center gap-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                👑 Mode Admin (Editable)
              </span>
            )}

            {/* Tombol Dashboard (Di samping Refresh) */}
            <button
              onClick={() => setIsDashboardModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow transition cursor-pointer flex items-center gap-1.5"
              title="Lihat Rekap Dashboard Dokumen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Dashboard
            </button>

            {/* Tombol Refresh */}
            <button
              onClick={async () => {
                setIsLoadingSupabase(true);
                const remote = await getDokseDataFromSupabase();
                if (remote && remote.length > 0) setDataList(remote);
                setIsLoadingSupabase(false);
              }}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              title="Refresh Data dari Supabase"
            >
              🔄 {isLoadingSupabase ? "Loading..." : "Refresh"}
            </button>

            {/* Tombol Unduh Excel (Untuk Semua User) */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Unduh Excel (CSV)
            </button>

            {/* Tombol Unggah Excel (Khusus Admin) */}
            {isAdminLoggedIn && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow transition cursor-pointer flex items-center gap-1.5"
              >
                📥 Unggah Excel / Data
              </button>
            )}

            {/* Tombol Login Admin */}
            {!isAdminLoggedIn ? (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow transition cursor-pointer"
              >
                🔐 Login Admin
              </button>
            ) : (
              <button
                onClick={() => setIsAdminLoggedIn(false)}
                className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition cursor-pointer"
              >
                Keluar Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1700px] mx-auto p-4 md:p-6 space-y-4">
        {/* Menu Filter Berjenjang & Toolbar */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Menu Filter Berjenjang & Pencarian:
          </div>

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
                  setSelectedSls("all");
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

            {/* 2. Filter Desa (Berjenjang: Aktif hanya jika Kecamatan dipilih) */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Desa / Kelurahan
              </label>
              <select
                value={selectedDesa}
                disabled={selectedKec === "all"}
                onChange={(e) => {
                  setSelectedDesa(e.target.value);
                  setSelectedSls("all");
                }}
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

            {/* 3. Filter SLS (Berjenjang: Aktif hanya jika Desa dipilih) */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Nama SLS / SubSLS
              </label>
              <select
                value={selectedSls}
                disabled={selectedDesa === "all"}
                onChange={(e) => setSelectedSls(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {selectedDesa === "all" ? (
                  <option value="all">-- Pilih Desa Terlebih Dahulu --</option>
                ) : (
                  <>
                    <option value="all">Semua SLS/SubSLS</option>
                    {listSls.map((s) => (
                      <option key={s.idsubsls} value={s.idsubsls}>
                        {s.nama} ({s.idsubsls})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* 4. Filter Status Kelengkapan */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Status Kelengkapan
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="lengkap">Lengkap</option>
                <option value="tidak_lengkap">Tidak Lengkap</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            {/* Search Box */}
            <div className="relative w-full sm:w-80">
              <svg
                className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Cari SLS, ID SubSLS, Desa, atau Catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Tombol Reset Filter */}
            <button
              onClick={handleResetFilter}
              className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1 self-end sm:self-auto"
            >
              <span>✕</span> Reset Filter
            </button>
          </div>
        </div>

        {/* Counter Info Data */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
          <div>
            Menampilkan <strong className="text-brand-600 dark:text-brand-400">{filteredData.length}</strong> dari {dataList.length} Baris SubSLS (Otomatis Terurut ID SubSLS)
          </div>
          <div className="text-[11px] text-gray-400">
            * Peta Desa tersinkronisasi otomatis untuk desa yang sama
          </div>
        </div>

        {/* Full Data Table */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1400px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/50 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none">
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 w-36">ID SubSLS</th>
                  <th className="py-3 px-3 min-w-[180px]">Nama SLS</th>
                  <th className="py-3 px-3 w-20">Jenis</th>
                  <th className="py-3 px-3 w-24">Kd Kec</th>
                  <th className="py-3 px-3 w-32">Kecamatan</th>
                  <th className="py-3 px-3 w-24">Kd Desa</th>
                  <th className="py-3 px-3 w-36">Desa / Kelurahan</th>
                  <th className="py-3 px-3 w-20">Kd SLS</th>
                  <th className="py-3 px-3 w-24">Kd SubSLS</th>
                  <th className="py-3 px-3 w-28 text-center bg-orange-50/50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-300">Peta Desa</th>
                  <th className="py-3 px-3 w-28 text-center">Peta Sub-RT</th>
                  <th className="py-3 px-3 w-28 text-center">Dokumen PSLS</th>
                  <th className="py-3 px-3 w-28 text-center">Peta Terisi</th>
                  <th className="py-3 px-3 w-32 text-center">Perubahan Batas</th>
                  <th className="py-3 px-3 w-36 text-center">Status Penerimaan</th>
                  <th className="py-3 px-3 min-w-[200px]">Keterangan Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      Tidak ada data pengecekan Dokse 2026 yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, index) => {
                    const statusPenerimaan = getStatusPenerimaan(item);
                    const isLengkap = statusPenerimaan === "Lengkap";

                    return (
                      <tr
                        key={item.idsubsls}
                        className="hover:bg-brand-50/80 dark:hover:bg-brand-950/40 transition duration-150 border-b border-gray-200 dark:border-gray-700/80"
                      >
                        <td className="py-3 px-3 text-center font-medium text-gray-400">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>

                        {/* ID SubSLS */}
                        <td className="py-3 px-3 font-mono font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                          {item.idsubsls}
                        </td>

                        {/* Nama SLS */}
                        <td className="py-3 px-3 font-semibold text-gray-900 dark:text-white">
                          {item.nama_sls}
                        </td>

                        {/* Jenis */}
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-[11px]">
                            {item.jenis || "-"}
                          </span>
                        </td>

                        {/* Kode Kecamatan */}
                        <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {item.kode_kec}
                        </td>

                        {/* Kecamatan */}
                        <td className="py-3 px-3 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {item.nama_kec}
                        </td>

                        {/* Kode Desa */}
                        <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {item.kode_desa}
                        </td>

                        {/* Desa */}
                        <td className="py-3 px-3 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {item.nama_desa}
                        </td>

                        {/* Kode SLS */}
                        <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {item.kode_sls || "-"}
                        </td>

                        {/* Kode SubSLS */}
                        <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {item.kode_subsls || "-"}
                        </td>

                        {/* Peta Desa (Sinkron per Desa) */}
                        <td className="py-3 px-3 text-center bg-orange-50/30 dark:bg-orange-950/10">
                          {isAdminLoggedIn ? (
                            <select
                              value={item.peta_desa}
                              onChange={(e) => handleUpdateItem(item.idsubsls, "peta_desa", e.target.value)}
                              className="py-1 px-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold cursor-pointer"
                            >
                              <option value="-">-</option>
                              <option value="Ada">Ada</option>
                              <option value="Tidak">Tidak</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              item.peta_desa === "Ada"
                                ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : item.peta_desa === "Tidak"
                                ? "text-rose-700 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                                : "text-gray-400"
                            }`}>
                              {item.peta_desa}
                            </span>
                          )}
                        </td>

                        {/* Peta Sub-RT */}
                        <td className="py-3 px-3 text-center">
                          {isAdminLoggedIn ? (
                            <select
                              value={item.peta_subrt}
                              onChange={(e) => handleUpdateItem(item.idsubsls, "peta_subrt", e.target.value)}
                              className="py-1 px-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold cursor-pointer"
                            >
                              <option value="-">-</option>
                              <option value="Ada">Ada</option>
                              <option value="Tidak">Tidak</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              item.peta_subrt === "Ada"
                                ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : item.peta_subrt === "Tidak"
                                ? "text-rose-700 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                                : "text-gray-400"
                            }`}>
                              {item.peta_subrt}
                            </span>
                          )}
                        </td>

                        {/* Dokumen PSLS */}
                        <td className="py-3 px-3 text-center">
                          {isAdminLoggedIn ? (
                            <select
                              value={item.dokumen_psls}
                              onChange={(e) => handleUpdateItem(item.idsubsls, "dokumen_psls", e.target.value)}
                              className="py-1 px-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold cursor-pointer"
                            >
                              <option value="-">-</option>
                              <option value="Ada">Ada</option>
                              <option value="Tidak">Tidak</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              item.dokumen_psls === "Ada"
                                ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : item.dokumen_psls === "Tidak"
                                ? "text-rose-700 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                                : "text-gray-400"
                            }`}>
                              {item.dokumen_psls}
                            </span>
                          )}
                        </td>

                        {/* Peta Terisi */}
                        <td className="py-3 px-3 text-center">
                          {isAdminLoggedIn ? (
                            <select
                              value={item.peta_terisi}
                              onChange={(e) => handleUpdateItem(item.idsubsls, "peta_terisi", e.target.value)}
                              className="py-1 px-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold cursor-pointer"
                            >
                              <option value="-">-</option>
                              <option value="Ya">Ya</option>
                              <option value="Tidak">Tidak</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              item.peta_terisi === "Ya"
                                ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : item.peta_terisi === "Tidak"
                                ? "text-rose-700 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                                : "text-gray-400"
                            }`}>
                              {item.peta_terisi}
                            </span>
                          )}
                        </td>

                        {/* Perubahan Batas Wilayah */}
                        <td className="py-3 px-3 text-center">
                          {isAdminLoggedIn ? (
                            <select
                              value={item.perubahan_batas}
                              onChange={(e) => handleUpdateItem(item.idsubsls, "perubahan_batas", e.target.value)}
                              className="py-1 px-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold cursor-pointer"
                            >
                              <option value="-">-</option>
                              <option value="Ada">Ada</option>
                              <option value="Tidak">Tidak</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              item.perubahan_batas === "Ada"
                                ? "text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                                : item.perubahan_batas === "Tidak"
                                ? "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                                : "text-gray-400"
                            }`}>
                              {item.perubahan_batas}
                            </span>
                          )}
                        </td>

                        {/* Status Penerimaan (Kalkulasi Otomatis) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            isLengkap
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          }`}>
                            {isLengkap ? "Lengkap" : "Tidak Lengkap"}
                          </span>
                        </td>

                        {/* Keterangan */}
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-600 dark:text-gray-300 text-xs line-clamp-2">
                              {item.keterangan || "-"}
                            </span>
                            {isAdminLoggedIn && (
                              <button
                                onClick={() => {
                                  setEditingKeteranganItem(item);
                                  setKeteranganInput(item.keterangan);
                                }}
                                className="text-brand-600 dark:text-brand-400 hover:underline text-[11px] font-semibold shrink-0 cursor-pointer"
                              >
                                Edit Catatan
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
                className="py-1 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none"
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
      </main>

      {/* ===================== MODAL LOGIN ADMIN ===================== */}
      {isLoginModalOpen && (
        <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} showCloseButton={true} className="max-w-sm p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              🔐 Login Mode Admin Pengecekan
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Masukkan kredensial administrator untuk mendapatkan hak akses pengeditan data pengecekan Dokse 2026.
            </p>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Username / Email BPS
                </label>
                <input
                  type="text"
                  required
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="Masukkan username/email..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Kata Sandi / Password
                </label>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Masukkan password..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow disabled:opacity-50"
                >
                  {isLoggingIn ? "Memverifikasi..." : "Masuk Admin"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ===================== MODAL EDIT KETERANGAN ===================== */}
      {editingKeteranganItem && (
        <Modal isOpen={!!editingKeteranganItem} onClose={() => setEditingKeteranganItem(null)} showCloseButton={true} className="max-w-md p-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-mono font-bold text-brand-600">
                {editingKeteranganItem.idsubsls}
              </span>
              <h2 className="text-base font-bold text-gray-900 dark:text-white mt-1">
                Edit Catatan Keterangan: {editingKeteranganItem.nama_sls}
              </h2>
            </div>

            <textarea
              rows={4}
              value={keteranganInput}
              onChange={(e) => setKeteranganInput(e.target.value)}
              placeholder="Tuliskan catatan detail hasil pengecekan..."
              className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500/20"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setEditingKeteranganItem(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleUpdateItem(editingKeteranganItem.idsubsls, "keterangan", keteranganInput);
                  setEditingKeteranganItem(null);
                }}
                className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================== MODAL UNGGAH EXCEL / DATA ===================== */}
      {isImportModalOpen && (
        <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} showCloseButton={true} className="max-w-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  📥 Unggah Data Pengecekan Dokse 2026
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Impor data baru dari Excel (.xlsx) secara langsung
                </p>
              </div>

              {/* Tombol Unduh Template */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>📊</span> Unduh Template Excel (.xlsx)
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-3">
              {/* Opsi Upload File */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  1. Pilih File Excel (.xlsx / .xls / .csv):
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.json,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const fileName = file.name.toLowerCase();
                      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                          const workbook = XLSX.read(data, { type: "array" });
                          const firstSheetName = workbook.SheetNames[0];
                          const worksheet = workbook.Sheets[firstSheetName];
                          const json = XLSX.utils.sheet_to_json(worksheet);
                          setImportText(JSON.stringify(json));
                        };
                        reader.readAsArrayBuffer(file);
                      } else {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const content = evt.target?.result as string;
                          if (content) setImportText(content);
                        };
                        reader.readAsText(file);
                      }
                    }
                  }}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-950 dark:file:text-emerald-300 border border-gray-200 dark:border-gray-700 rounded-xl p-1 bg-gray-50 dark:bg-gray-900 cursor-pointer"
                />
              </div>

              <div className="text-center text-[11px] font-bold text-gray-400 py-1">
                ── ATAU ──
              </div>

              {/* Opsi Tempel Teks */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  2. Tempelkan (Paste) Baris Tabel dari Ms. Excel:
                </label>
                <textarea
                  rows={5}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Tempelkan (Ctrl+V) baris tabel dari Ms. Excel di sini..."
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition cursor-pointer"
                >
                  Impor & Simpan Data
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ===================== MODAL DASHBOARD STATISTIK REKAPITULASI (FULL SCREEN) ===================== */}
      {isDashboardModalOpen && (
        <Modal
          isOpen={isDashboardModalOpen}
          onClose={() => setIsDashboardModalOpen(false)}
          showCloseButton={true}
          isFullscreen={true}
          className="p-4 md:p-6 bg-gray-50 dark:bg-gray-900"
        >
          <div className="max-w-[1600px] mx-auto space-y-5 h-full flex flex-col justify-between">
            {/* Header Dialog Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  📊
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Dashboard Rekapitulasi Dokumen Sensus Ekonomi 2026
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-800">
                      Full Screen View
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sistem Pengawasan Real-time Progres Capaian & Rekapitulasi Berjenjang BPS Kabupaten Lebak
                  </p>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex items-center gap-1.5 bg-gray-200 dark:bg-gray-800 p-1.5 rounded-2xl self-start sm:self-auto">
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
                  <span>🗺️</span> Progres Capaian Wilayah (Drill-down)
                </button>
              </div>
            </div>

            {/* TAB 1: RINGKASAN VISUAL (CHARTS & CARDS) */}
            {activeDashboardTab === "overview" && (
              <div className="space-y-6 overflow-y-auto pr-1">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total SLS / SubSLS</span>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
                      {dashboardStats.totalSls} <span className="text-xs font-medium text-gray-500">Baris</span>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Status Lengkap</span>
                    <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                      {dashboardStats.lengkapCount} <span className="text-xs font-medium text-emerald-600/70">SLS ({((dashboardStats.lengkapCount / (dashboardStats.totalSls || 1)) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 shadow-xs">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Status Tidak Lengkap</span>
                    <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                      {dashboardStats.tidakLengkapCount} <span className="text-xs font-medium text-rose-600/70">SLS ({((dashboardStats.tidakLengkapCount / (dashboardStats.totalSls || 1)) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>

                {/* Visual Charts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                  {/* Donut Chart Status Kelengkapan */}
                  <div className="md:col-span-2 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs flex flex-col justify-between">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                      🍩 Proporsi Kelengkapan Dokumen SE2026
                    </h3>
                    <div className="w-full flex items-center justify-center my-auto min-h-[300px]">
                      <ReactApexChart
                        options={statusDonutOptions}
                        series={statusDonutSeries}
                        type="donut"
                        width="100%"
                        height={320}
                      />
                    </div>
                  </div>

                  {/* Bar Chart Rincian 5 Komponen Pengecekan */}
                  <div className="md:col-span-3 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs flex flex-col justify-between">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                      📊 Rekapitulasi Rincian 5 Komponen Pengecekan
                    </h3>
                    <div className="w-full min-h-[300px]">
                      <ReactApexChart
                        options={componentsBarOptions}
                        series={componentsBarSeries}
                        type="bar"
                        width="100%"
                        height={320}
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
                  {/* LEVEL 1: TABEL KECAMATAN (Klik Baris untuk Buka Popup / Detail Desa) */}
                  {dashSelectedKec === "all" && (
                    <div>
                      <div className="bg-gray-50 dark:bg-gray-700/60 p-3 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                        <span>Daftar Seluruh Kecamatan BPS Kabupaten Lebak</span>
                        <span className="text-brand-600 dark:text-brand-400 font-semibold">*Klik baris kecamatan untuk melihat daftar desa</span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-600 uppercase tracking-wider text-[11px]">
                            <th className="py-3 px-4 w-24">Kode</th>
                            <th className="py-3 px-4 min-w-[220px]">Nama Kecamatan</th>
                            <th className="py-3 px-4 text-center w-28">Total SLS</th>
                            <th className="py-3 px-4 text-center w-28 text-emerald-600">Lengkap</th>
                            <th className="py-3 px-4 text-center w-28 text-rose-600">Tidak Lengkap</th>
                            <th className="py-3 px-4 text-center w-48">Progres Capaian</th>
                            <th className="py-3 px-4 text-center w-28">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {kecProgressList.map((k) => {
                            const pct = Math.round((k.lengkap / (k.total || 1)) * 100);
                            return (
                              <tr
                                key={k.kode}
                                onClick={() => {
                                  setDashSelectedKec(k.kode);
                                  setDashSelectedDesa("all");
                                }}
                                className="hover:bg-brand-50/70 dark:hover:bg-brand-950/40 cursor-pointer transition"
                              >
                                <td className="py-3 px-4 font-mono font-bold text-brand-600">{k.kode}</td>
                                <td className="py-3 px-4 font-bold text-gray-900 dark:text-white text-sm">{k.nama}</td>
                                <td className="py-3 px-4 text-center font-bold text-gray-700 dark:text-gray-300">{k.total}</td>
                                <td className="py-3 px-4 text-center font-bold text-emerald-600">{k.lengkap}</td>
                                <td className="py-3 px-4 text-center font-bold text-rose-600">{k.tidakLengkap}</td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-28 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                      <div
                                        className={`h-2.5 rounded-full transition-all ${
                                          pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                                        }`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="font-extrabold text-xs text-gray-900 dark:text-white w-9 text-right">{pct}%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-2.5 py-1 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 font-bold text-[11px] hover:underline">
                                    Lihat Desa ➔
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* LEVEL 2: TABEL DESA / KELURAHAN (Klik Baris untuk Buka SLS) */}
                  {dashSelectedKec !== "all" && dashSelectedDesa === "all" && (
                    <div>
                      <div className="bg-brand-50 dark:bg-brand-950/40 p-3 border-b border-brand-100 dark:border-brand-900 text-xs font-bold text-brand-700 dark:text-brand-300 flex items-center justify-between">
                        <span>📍 Rekapitulasi Seluruh Desa pada Kecamatan {kecProgressList.find((k) => k.kode === dashSelectedKec)?.nama}</span>
                        <span className="font-semibold">*Klik baris desa untuk merinci status tiap SLS</span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-600 uppercase tracking-wider text-[11px]">
                            <th className="py-3 px-4 w-24">Kode</th>
                            <th className="py-3 px-4 min-w-[220px]">Nama Desa / Kelurahan</th>
                            <th className="py-3 px-4 text-center w-28">Total SLS</th>
                            <th className="py-3 px-4 text-center w-28 text-emerald-600">Lengkap</th>
                            <th className="py-3 px-4 text-center w-28 text-rose-600">Tidak Lengkap</th>
                            <th className="py-3 px-4 text-center w-48">Progres Capaian</th>
                            <th className="py-3 px-4 text-center w-28">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {desaProgressList.map((d) => {
                            const pct = Math.round((d.lengkap / (d.total || 1)) * 100);
                            return (
                              <tr
                                key={d.kode}
                                onClick={() => setDashSelectedDesa(d.kode)}
                                className="hover:bg-purple-50/70 dark:hover:bg-purple-950/40 cursor-pointer transition"
                              >
                                <td className="py-3 px-4 font-mono font-bold text-purple-600">{d.kode}</td>
                                <td className="py-3 px-4 font-bold text-gray-900 dark:text-white text-sm">{d.nama}</td>
                                <td className="py-3 px-4 text-center font-bold text-gray-700 dark:text-gray-300">{d.total}</td>
                                <td className="py-3 px-4 text-center font-bold text-emerald-600">{d.lengkap}</td>
                                <td className="py-3 px-4 text-center font-bold text-rose-600">{d.tidakLengkap}</td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-28 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                      <div
                                        className={`h-2.5 rounded-full transition-all ${
                                          pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                                        }`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="font-extrabold text-xs text-gray-900 dark:text-white w-9 text-right">{pct}%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 font-bold text-[11px] hover:underline">
                                    Detail SLS ➔
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* LEVEL 3: TABEL RINCIAN DETAIL SLS / SUBSLS & KRITERIA YANG BELUM LENGKAP */}
                  {dashSelectedKec !== "all" && dashSelectedDesa !== "all" && (
                    <div>
                      <div className="bg-purple-50 dark:bg-purple-950/40 p-3 border-b border-purple-100 dark:border-purple-900 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center justify-between">
                        <span>
                          📍 Rincian Detail SLS pada Desa {desaProgressList.find((d) => d.kode === dashSelectedDesa)?.nama} ({slsProgressList.length} Baris SLS)
                        </span>
                        <span className="font-normal text-[11px] text-gray-500 dark:text-gray-400">*Menampilkan kriteria komponen yang belum lengkap</span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-600 uppercase tracking-wider text-[11px]">
                            <th className="py-3 px-4 w-40">ID SubSLS</th>
                            <th className="py-3 px-4 min-w-[200px]">Nama SLS / SubSLS</th>
                            <th className="py-3 px-4 text-center w-36">Status Kelengkapan</th>
                            <th className="py-3 px-4 min-w-[300px]">Bagian Komponen Belum Lengkap</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {slsProgressList.map((item) => (
                            <tr key={item.idsubsls} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                              <td className="py-3 px-4 font-mono font-bold text-brand-600 text-xs">{item.idsubsls}</td>
                              <td className="py-3 px-4 font-bold text-gray-900 dark:text-white text-xs">{item.nama_sls}</td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                                    item.statusPenerimaan === "Lengkap"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                                      : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                                  }`}
                                >
                                  {item.statusPenerimaan}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {item.missingParts.length === 0 ? (
                                  <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                                    <span>✓</span> Semua 4 Komponen Utama Lengkap & Terisi
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {item.missingParts.map((mp, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold"
                                      >
                                        ⚠️ Belum Ada: {mp}
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
                  )}
                </div>
              </div>
            )}

            {/* Footer Dialog Dashboard */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                * Data statistik dan progres kelengkapan wilayah terintegrasi otomatis secara real-time.
              </div>
              <button
                onClick={() => setIsDashboardModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-xs font-bold shadow transition cursor-pointer"
              >
                Tutup Dashboard Full Screen
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
