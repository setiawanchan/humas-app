"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { FasihRejectItem } from "@/types/fasih-reject";
import RejectUploadModal from "@/components/fasih-reject/RejectUploadModal";
import RejectScriptModal from "@/components/fasih-reject/RejectScriptModal";

export default function FasihRejectPage() {
  const [items, setItems] = useState<FasihRejectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kecamatanFilter, setKecamatanFilter] = useState<string>("all");
  const [desaFilter, setDesaFilter] = useState<string>("all");
  const [slsFilter, setSlsFilter] = useState<string>("all");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Dropdown options lists
  const [distinctKecamatan, setDistinctKecamatan] = useState<string[]>([]);
  const [distinctDesa, setDistinctDesa] = useState<string[]>([]);
  const [distinctSls, setDistinctSls] = useState<string[]>([]);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    rejected: 0,
    pending: 0,
    failed: 0,
  });

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isScriptOpen, setIsScriptOpen] = useState(false);
  const [itemsToReject, setItemsToReject] = useState<FasihRejectItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingScript, setIsExportingScript] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset page on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch filter options (Kecamatan, Desa, SLS) secara dinamis & lengkap tanpa batas 1.000
  const fetchFilterOptions = useCallback(async () => {
    try {
      // Prioritas 1: Panggil RPC function jika sudah dibuat di Supabase
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_fasih_filter_options", {
        target_kecamatan: kecamatanFilter === "all" ? null : kecamatanFilter,
        target_desa: desaFilter === "all" ? null : desaFilter,
      });

      if (!rpcError && rpcData) {
        if (rpcData.kecamatan) setDistinctKecamatan(rpcData.kecamatan);
        if (rpcData.desa) setDistinctDesa(rpcData.desa);
        if (rpcData.sls) setDistinctSls(rpcData.sls);
        return;
      }

      // Fallback (jika user belum sempat menjalankan script SQL RPC):
      // Ambil data dalam batch pagination range hingga seluruh nama desa/SLS terkumpul
      const allRows: any[] = [];
      const BATCH = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore && from < 15000) {
        let q = supabase
          .from("fasih_reject_items")
          .select("kecamatan, desa, sls, idsls")
          .range(from, from + BATCH - 1);

        if (kecamatanFilter !== "all") {
          q = q.eq("kecamatan", kecamatanFilter);
        }
        if (desaFilter !== "all") {
          q = q.eq("desa", desaFilter);
        }

        const { data: chunk, error } = await q;
        if (error || !chunk || chunk.length === 0) {
          hasMore = false;
        } else {
          allRows.push(...chunk);
          if (chunk.length < BATCH) hasMore = false;
          else from += BATCH;
        }
      }

      const kecs = Array.from(new Set(allRows.map((d) => d.kecamatan).filter(Boolean))).sort() as string[];
      const desas = Array.from(new Set(allRows.map((d) => d.desa).filter(Boolean))).sort() as string[];
      
      // Ambil SLS unik dan urutkan berdasarkan idsls / idsubsls, tetapi tetap simpan nama SLS
      const slsMap = new Map<string, string>(); // slsName -> idsls
      allRows.forEach((d) => {
        if (d.sls && !slsMap.has(d.sls)) {
          slsMap.set(d.sls, d.idsls || "");
        }
      });
      const slses = Array.from(slsMap.entries())
        .sort((a, b) => (a[1] || "").localeCompare(b[1] || ""))
        .map(([slsName]) => slsName);

      if (kecs.length > 0) setDistinctKecamatan(kecs);
      setDistinctDesa(desas);
      setDistinctSls(slses);
    } catch (err) {
      console.warn("Gagal mengambil options filter", err);
    }
  }, [kecamatanFilter, desaFilter]);

  // Fetch statistik keseluruhan data
  const fetchStats = useCallback(async () => {
    try {
      const { count: total } = await supabase
        .from("fasih_reject_items")
        .select("*", { count: "exact", head: true });

      const { count: rejected } = await supabase
        .from("fasih_reject_items")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected");

      const { count: pending } = await supabase
        .from("fasih_reject_items")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: failed } = await supabase
        .from("fasih_reject_items")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed");

      setStats({
        total: total || 0,
        rejected: rejected || 0,
        pending: pending || 0,
        failed: failed || 0,
      });
    } catch (err) {
      console.warn("Gagal mengambil statistik", err);
    }
  }, []);

  // Fetch tabel data dengan SERVER-SIDE PAGINATION & FILTER
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("fasih_reject_items")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Filter status
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Filter Kecamatan
      if (kecamatanFilter !== "all") {
        query = query.eq("kecamatan", kecamatanFilter);
      }

      // Filter Desa
      if (desaFilter !== "all") {
        query = query.eq("desa", desaFilter);
      }

      // Filter SLS
      if (slsFilter !== "all") {
        query = query.eq("sls", slsFilter);
      }

      // Search query (ilike multi-column)
      if (debouncedSearch.trim()) {
        const q = `%${debouncedSearch.trim()}%`;
        query = query.or(
          `kecamatan.ilike.${q},desa.ilike.${q},sls.ilike.${q},idsls.ilike.${q},nama_usaha.ilike.${q},assignment_id.ilike.${q}`
        );
      }

      // Server-side Range
      const { data, count, error } = await query.range(from, to);

      if (error) {
        console.error("Gagal mengambil data fasih_reject_items:", error);
      } else {
        setItems(data || []);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error("Error fetchData:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, kecamatanFilter, desaFilter, slsFilter, debouncedSearch]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription Supabase
  useEffect(() => {
    const channel = supabase
      .channel("fasih_reject_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fasih_reject_items" },
        () => {
          // Re-fetch current view & stats when changes occur
          fetchData();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, fetchStats]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reset pagination saat filter berubah
  const handleKecamatanChange = (val: string) => {
    setKecamatanFilter(val);
    setDesaFilter("all");
    setSlsFilter("all");
    setCurrentPage(1);
  };

  const handleDesaChange = (val: string) => {
    setDesaFilter(val);
    setSlsFilter("all");
    setCurrentPage(1);
  };

  const handleSlsChange = (val: string) => {
    setSlsFilter(val);
    setCurrentPage(1);
  };

  // Checkbox handlers
  const handleSelectAllCurrentPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(items.map((it) => it.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectOnlyPendingOnPage = () => {
    const pendingIds = items
      .filter((it) => it.status === "pending")
      .map((it) => it.id);
    setSelectedIds(pendingIds);
  };

  // Eksekusi Reject: baris terpilih di halaman saat ini
  const handleOpenScriptForSelected = () => {
    const selected = items.filter((it) => selectedIds.includes(it.id));
    setItemsToReject(selected);
    setIsScriptOpen(true);
  };

  // Eksekusi Reject: Seluruh data sesuai filter aktif (hingga ribuan data)
  const handleOpenScriptForAllFiltered = async () => {
    try {
      setIsExportingScript(true);
      let query = supabase
        .from("fasih_reject_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (kecamatanFilter !== "all") query = query.eq("kecamatan", kecamatanFilter);
      if (desaFilter !== "all") query = query.eq("desa", desaFilter);
      if (slsFilter !== "all") query = query.eq("sls", slsFilter);
      if (debouncedSearch.trim()) {
        const q = `%${debouncedSearch.trim()}%`;
        query = query.or(
          `kecamatan.ilike.${q},desa.ilike.${q},sls.ilike.${q},idsls.ilike.${q},nama_usaha.ilike.${q},assignment_id.ilike.${q}`
        );
      }

      // Fetch all matching data without limit
      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert("Tidak ada data penugasan yang sesuai dengan filter saat ini.");
        return;
      }

      setItemsToReject(data);
      setIsScriptOpen(true);
    } catch (err: any) {
      alert("Gagal memuat seluruh data filter: " + err.message);
    } finally {
      setIsExportingScript(false);
    }
  };

  // Aksi Update Status Manual
  const handleBulkUpdateStatus = async (newStatus: "pending" | "rejected" | "failed") => {
    if (selectedIds.length === 0) return;
    try {
      const updatePayload: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "rejected") {
        updatePayload.rejected_at = new Date().toISOString();
      } else {
        updatePayload.rejected_at = null;
      }

      const { error } = await supabase
        .from("fasih_reject_items")
        .update(updatePayload)
        .in("id", selectedIds);

      if (error) throw error;

      showToast(`Status ${selectedIds.length} item berhasil diubah menjadi "${newStatus}"!`);
      setSelectedIds([]);
      fetchData();
      fetchStats();
    } catch (err: any) {
      alert("Gagal update status: " + err.message);
    }
  };

  // Hapus Data Terpilih
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} data terpilih dari database?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("fasih_reject_items")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      showToast(`${selectedIds.length} item berhasil dihapus.`);
      setSelectedIds([]);
      fetchData();
      fetchStats();
    } catch (err: any) {
      alert("Gagal menghapus data: " + err.message);
    }
  };

  // Total pages
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-2.5 rounded-xl shadow-xl border border-gray-700 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              FASIH Bulk Reject Helper
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 rounded-full">
              Server Pagination
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Simpan daftar penugasan, pantau status reject, dan eksekusi otomatis ke tab web FASIH.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl shadow-xs transition flex items-center gap-2"
          >
            <span>📁</span>
            <span>Upload Excel / CSV</span>
          </button>

          {/* Tombol Reject Filtered (Semua) */}
          <button
            type="button"
            disabled={isExportingScript || totalCount === 0}
            onClick={handleOpenScriptForAllFiltered}
            className="px-3.5 py-2 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 border border-brand-200 dark:border-brand-900/60 rounded-xl transition flex items-center gap-1.5"
            title="Eksekusi semua data yang sesuai dengan filter saat ini"
          >
            <span>🚀</span>
            <span>
              {isExportingScript
                ? "Memuat..."
                : `Reject Semua Filter (${totalCount.toLocaleString()})`}
            </span>
          </button>

          {/* Tombol Reject Terpilih */}
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={handleOpenScriptForSelected}
            className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md transition flex items-center gap-2"
          >
            <span>⚡</span>
            <span>
              Reject Terpilih ({selectedIds.length})
            </span>
          </button>
        </div>
      </div>

      {/* Cards Statistik (Bisa Diklik untuk Filter Cepat) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setCurrentPage(1);
          }}
          className={`p-4 text-left rounded-2xl border transition shadow-xs cursor-pointer ${
            statusFilter === "all"
              ? "bg-brand-50/50 dark:bg-brand-950/40 border-brand-500 ring-2 ring-brand-500/20"
              : "bg-white dark:bg-gray-800 border-gray-200/80 dark:border-gray-700 hover:border-brand-300"
          }`}
        >
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Penugasan</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-gray-800 dark:text-white">
              {stats.total.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">item</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "rejected" ? "all" : "rejected");
            setCurrentPage(1);
          }}
          className={`p-4 text-left rounded-2xl border transition shadow-xs cursor-pointer ${
            statusFilter === "rejected"
              ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400"
          }`}
        >
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Berhasil Di-reject
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.rejected.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-500 font-medium">
              {stats.total > 0 ? `${((stats.rejected / stats.total) * 100).toFixed(0)}%` : "0%"}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "pending" ? "all" : "pending");
            setCurrentPage(1);
          }}
          className={`p-4 text-left rounded-2xl border transition shadow-xs cursor-pointer ${
            statusFilter === "pending"
              ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-900/50 hover:border-amber-400"
          }`}
        >
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            Belum Di-reject (Pending)
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.pending.toLocaleString()}
            </span>
            <span className="text-xs text-amber-500 font-medium">siap eksekusi</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "failed" ? "all" : "failed");
            setCurrentPage(1);
          }}
          className={`p-4 text-left rounded-2xl border transition shadow-xs cursor-pointer ${
            statusFilter === "failed"
              ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/20"
              : "bg-white dark:bg-gray-800 border-rose-200 dark:border-rose-900/50 hover:border-rose-400"
          }`}
        >
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
            Gagal / Error
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {stats.failed.toLocaleString()}
            </span>
            <span className="text-xs text-rose-500 font-medium">periksa log</span>
          </div>
        </button>
      </div>

      {/* Filter & Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-4 space-y-4 shadow-xs">
        {/* Quick Filter Pills Status */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700/60">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
            Status:
          </span>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              statusFilter === "all"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs"
                : "bg-gray-100 text-gray-600 dark:bg-gray-750 dark:text-gray-300 hover:bg-gray-200"
            }`}
          >
            <span>Semua Data</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/10 dark:bg-white/20">
              {stats.total.toLocaleString()}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("pending");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              statusFilter === "pending"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-900/50"
            }`}
          >
            <span>🟡 Belum Di-reject (Pending)</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-600/20 text-current">
              {stats.pending.toLocaleString()}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("rejected");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              statusFilter === "rejected"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900/50"
            }`}
          >
            <span>🟢 Sudah Di-reject</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-600/20 text-current">
              {stats.rejected.toLocaleString()}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("failed");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              statusFilter === "failed"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/50"
            }`}
          >
            <span>🔴 Gagal / Error</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-600/20 text-current">
              {stats.failed.toLocaleString()}
            </span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Cari Kecamatan, Desa, SLS, Nama Usaha, IDSLS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-brand-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Filters: Kecamatan, Desa, SLS */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Kecamatan */}
            <select
              value={kecamatanFilter}
              onChange={(e) => handleKecamatanChange(e.target.value)}
              className="text-xs px-3 py-2 max-w-[160px] rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Kecamatan</option>
              {distinctKecamatan.map((kec) => (
                <option key={kec} value={kec}>
                  {kec}
                </option>
              ))}
            </select>

            {/* Desa */}
            <select
              value={desaFilter}
              onChange={(e) => handleDesaChange(e.target.value)}
              className="text-xs px-3 py-2 max-w-[160px] rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Desa</option>
              {distinctDesa.map((desa) => (
                <option key={desa} value={desa}>
                  {desa}
                </option>
              ))}
            </select>

            {/* SLS */}
            <select
              value={slsFilter}
              onChange={(e) => handleSlsChange(e.target.value)}
              className="text-xs px-3 py-2 max-w-[160px] rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua SLS</option>
              {distinctSls.map((sls) => (
                <option key={sls} value={sls}>
                  {sls}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                fetchData();
                fetchStats();
              }}
              title="Refresh Data"
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition border border-gray-200 dark:border-gray-700"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">
              Terpilih di halaman ini: <strong>{selectedIds.length}</strong> dari {items.length} baris
            </span>
            <button
              type="button"
              onClick={handleSelectOnlyPendingOnPage}
              className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline font-medium ml-2"
            >
              Pilih Semua Pending di Halaman Ini
            </button>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkUpdateStatus("rejected")}
                className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 transition font-medium text-[11px]"
              >
                ✓ Tandai Rejected
              </button>
              <button
                type="button"
                onClick={() => handleBulkUpdateStatus("pending")}
                className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-lg hover:bg-amber-200 transition font-medium text-[11px]"
              >
                ↺ Reset ke Pending
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-2.5 py-1 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-lg hover:bg-rose-200 transition font-medium text-[11px]"
              >
                🗑 Hapus Terpilih
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      items.length > 0 && items.every((it) => selectedIds.includes(it.id))
                    }
                    onChange={handleSelectAllCurrentPage}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Kecamatan</th>
                <th className="p-3.5">Desa</th>
                <th className="p-3.5">SLS / IDSLS</th>
                <th className="p-3.5">Nama Usaha</th>
                <th className="p-3.5">Link Penugasan FASIH</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Keterangan / Waktu</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    <div className="inline-block animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full mb-2"></div>
                    <p>Memuat data daftar reject...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center">
                    <div className="text-3xl mb-2">📂</div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">
                      Tidak ada data penugasan yang sesuai
                    </p>
                    <p className="text-gray-400 text-[11px] mt-1">
                      Coba ubah kata kunci pencarian atau sesuaikan pilihan filter di atas.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const isChecked = selectedIds.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50/70 dark:hover:bg-gray-750 transition ${
                        isChecked ? "bg-brand-50/40 dark:bg-brand-950/20" : ""
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectOne(row.id)}
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {row.kecamatan || "-"}
                      </td>
                      <td className="p-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {row.desa || "-"}
                      </td>
                      <td className="p-3.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        <div>{row.sls || "-"}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{row.idsls || ""}</div>
                      </td>
                      <td className="p-3.5 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap max-w-[200px] truncate">
                        {row.nama_usaha || "-"}
                      </td>
                      <td className="p-3.5 max-w-xs truncate">
                        <a
                          href={row.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 dark:text-brand-400 hover:underline font-mono text-[11px] flex items-center gap-1"
                        >
                          <span className="truncate">{row.assignment_id || row.link}</span>
                          <span className="text-[9px]">↗</span>
                        </a>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {row.status === "rejected" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Rejected
                          </span>
                        )}
                        {row.status === "pending" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Pending
                          </span>
                        )}
                        {row.status === "failed" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Gagal
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-gray-500 dark:text-gray-400 text-[11px] whitespace-nowrap">
                        {row.status === "rejected" && row.rejected_at && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {new Date(row.rejected_at).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        {row.notes && (
                          <div className="text-[10px] text-gray-400 truncate max-w-[180px]">
                            {row.notes}
                          </div>
                        )}
                        {!row.rejected_at && !row.notes && "-"}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {row.status !== "rejected" ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await supabase
                                  .from("fasih_reject_items")
                                  .update({
                                    status: "rejected",
                                    rejected_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                  })
                                  .eq("id", row.id);
                                fetchData();
                                fetchStats();
                              }}
                              title="Tandai Sudah Di-reject"
                              className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-md transition"
                            >
                              ✓
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                await supabase
                                  .from("fasih_reject_items")
                                  .update({
                                    status: "pending",
                                    rejected_at: null,
                                    updated_at: new Date().toISOString(),
                                  })
                                  .eq("id", row.id);
                                fetchData();
                                fetchStats();
                              }}
                              title="Reset ke Pending"
                              className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-md transition"
                            >
                              ↺
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm("Hapus baris penugasan ini?")) {
                                await supabase
                                  .from("fasih_reject_items")
                                  .delete()
                                  .eq("id", row.id);
                                fetchData();
                                fetchStats();
                              }
                            }}
                            title="Hapus"
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-md transition"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <span>
              Menampilkan{" "}
              <strong>
                {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, totalCount)}
              </strong>{" "}
              dari <strong>{totalCount.toLocaleString()}</strong> data
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span>Per baris:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          {/* Page Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage(1)}
              className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Halaman Pertama"
            >
              «
            </button>
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Prev
            </button>

            <span className="px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Next
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage(totalPages)}
              className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Halaman Terakhir"
            >
              »
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RejectUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          showToast("Data Excel/CSV berhasil diimpor ke Supabase!");
          fetchData();
          fetchStats();
          fetchFilterOptions();
        }}
      />

      <RejectScriptModal
        isOpen={isScriptOpen}
        onClose={() => setIsScriptOpen(false)}
        selectedItems={itemsToReject}
        onManualMarkSuccess={() => {
          handleBulkUpdateStatus("rejected");
          setIsScriptOpen(false);
        }}
      />
    </div>
  );
}
