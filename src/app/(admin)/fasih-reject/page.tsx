"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { FasihRejectItem } from "@/types/fasih-reject";
import RejectUploadModal from "@/components/fasih-reject/RejectUploadModal";
import RejectScriptModal from "@/components/fasih-reject/RejectScriptModal";

export default function FasihRejectPage() {
  const [items, setItems] = useState<FasihRejectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kecamatanFilter, setKecamatanFilter] = useState<string>("all");

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isScriptOpen, setIsScriptOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load data dari Supabase
  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("fasih_reject_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal mengambil data fasih_reject_items:", error);
      } else {
        setItems(data || []);
      }
    } catch (err) {
      console.error("Error fetchData:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup Supabase Realtime Subscription agar live update saat script console FASIH berjalan
    const channel = supabase
      .channel("fasih_reject_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fasih_reject_items" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => [payload.new as FasihRejectItem, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((it) => (it.id === payload.new.id ? (payload.new as FasihRejectItem) : it))
            );
          } else if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((it) => it.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // List Kecamatan unik untuk dropdown filter
  const distinctKecamatan = useMemo(() => {
    const list = items
      .map((it) => it.kecamatan)
      .filter((k): k is string => Boolean(k && k.trim()));
    return Array.from(new Set(list)).sort();
  }, [items]);

  // Data Terfilter
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // Filter status
      if (statusFilter !== "all" && it.status !== statusFilter) return false;

      // Filter kecamatan
      if (kecamatanFilter !== "all" && it.kecamatan !== kecamatanFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKec = it.kecamatan?.toLowerCase().includes(q);
        const matchDesa = it.desa?.toLowerCase().includes(q);
        const matchSls = it.sls?.toLowerCase().includes(q);
        const matchIdSls = it.idsls?.toLowerCase().includes(q);
        const matchLink = it.link?.toLowerCase().includes(q);
        const matchId = it.assignment_id?.toLowerCase().includes(q);
        if (!matchKec && !matchDesa && !matchSls && !matchIdSls && !matchLink && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [items, statusFilter, kecamatanFilter, searchQuery]);

  // Statistik Kartu
  const stats = useMemo(() => {
    const total = items.length;
    const rejected = items.filter((i) => i.status === "rejected").length;
    const pending = items.filter((i) => i.status === "pending").length;
    const failed = items.filter((i) => i.status === "failed").length;
    return { total, rejected, pending, failed };
  }, [items]);

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredItems.map((it) => it.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectOnlyPending = () => {
    const pendingIds = filteredItems
      .filter((it) => it.status === "pending")
      .map((it) => it.id);
    setSelectedIds(pendingIds);
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
    } catch (err: any) {
      alert("Gagal menghapus data: " + err.message);
    }
  };

  // Item yang dipilih untuk di-reject
  const selectedItemsToReject = useMemo(() => {
    return items.filter((it) => selectedIds.includes(it.id));
  }, [items, selectedIds]);

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
              Real-time Sync
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

          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => setIsScriptOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md transition flex items-center gap-2"
          >
            <span>⚡</span>
            <span>
              Eksekusi Reject ({selectedIds.length})
            </span>
          </button>
        </div>
      </div>

      {/* Cards Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-xs">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Penugasan</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</span>
            <span className="text-xs text-gray-400">item</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Berhasil Di-reject
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.rejected}</span>
            <span className="text-xs text-emerald-500 font-medium">
              {stats.total > 0 ? `${((stats.rejected / stats.total) * 100).toFixed(0)}%` : "0%"}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-xs">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            Belum Di-reject (Pending)
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</span>
            <span className="text-xs text-amber-500 font-medium">siap eksekusi</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-xs">
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
            Gagal / Error
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.failed}</span>
            <span className="text-xs text-rose-500 font-medium">periksa log</span>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-4 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Cari Kecamatan, Desa, SLS, atau Assignment ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-brand-500"
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

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Status</option>
              <option value="pending">🟡 Pending (Belum di-reject)</option>
              <option value="rejected">🟢 Rejected (Berhasil)</option>
              <option value="failed">🔴 Failed (Gagal)</option>
            </select>

            <select
              value={kecamatanFilter}
              onChange={(e) => setKecamatanFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Kecamatan</option>
              {distinctKecamatan.map((kec) => (
                <option key={kec} value={kec}>
                  {kec}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={fetchData}
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
              Terpilih: <strong>{selectedIds.length}</strong> dari {filteredItems.length} baris
            </span>
            {stats.pending > 0 && (
              <button
                type="button"
                onClick={handleSelectOnlyPending}
                className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline font-medium ml-2"
              >
                Pilih Semua yang Pending
              </button>
            )}
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
                      filteredItems.length > 0 &&
                      filteredItems.every((it) => selectedIds.includes(it.id))
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Kecamatan</th>
                <th className="p-3.5">Desa</th>
                <th className="p-3.5">SLS / IDSLS</th>
                <th className="p-3.5">Link Penugasan FASIH</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Keterangan / Waktu</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    <div className="inline-block animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full mb-2"></div>
                    <p>Memuat data daftar reject...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center">
                    <div className="text-3xl mb-2">📂</div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">
                      Belum ada data penugasan reject
                    </p>
                    <p className="text-gray-400 text-[11px] mt-1">
                      Klik tombol "Upload Excel / CSV" untuk menambahkan daftar link penugasan baru.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => {
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
      </div>

      {/* Modals */}
      <RejectUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          showToast("Data Excel/CSV berhasil diimpor ke Supabase!");
          fetchData();
        }}
      />

      <RejectScriptModal
        isOpen={isScriptOpen}
        onClose={() => setIsScriptOpen(false)}
        selectedItems={selectedItemsToReject}
        onManualMarkSuccess={() => {
          handleBulkUpdateStatus("rejected");
          setIsScriptOpen(false);
        }}
      />
    </div>
  );
}
