"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  mockDashboardPages,
  mockDashboardPageAccess,
  DashboardPage,
  DashboardPageAccess,
  Role,
} from "@/lib/mock-data";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";

export default function AdminHalamanAksesPage() {
  const { currentUser, users } = useAuth();
  const isAdmin = currentUser?.role === "administrator";

  // State Data Dashboard Pages & Access Rules
  const [pages, setPages] = useState<DashboardPage[]>(mockDashboardPages);
  const [accessRules, setAccessRules] = useState<DashboardPageAccess[]>(mockDashboardPageAccess);

  // State Search Box
  const [searchQuery, setSearchQuery] = useState("");

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // State Modal Form (Tambah / Edit Halaman)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<DashboardPage | null>(null);
  const [formData, setFormData] = useState({
    nama_page: "",
    slug: "",
    deskripsi: "",
    requires_login: true,
    is_active: true,
  });

  // State Modal Atur Hak Akses Granular
  const [accessPage, setAccessPage] = useState<DashboardPage | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // State Modal Konfirmasi Hapus
  const [deletingPage, setDeletingPage] = useState<DashboardPage | null>(null);

  // Reset pagination to page 1 whenever search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Filter Halaman berdasarkan Search Box
  const filteredPages = pages.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.nama_page.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.deskripsi.toLowerCase().includes(q)
    );
  });

  // Calculations for Pagination
  const totalPages = Math.ceil(filteredPages.length / itemsPerPage) || 1;
  const paginatedPages = filteredPages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handler Buka Form Tambah Halaman
  const handleOpenCreateForm = () => {
    setEditingPage(null);
    setFormData({
      nama_page: "",
      slug: "",
      deskripsi: "",
      requires_login: true,
      is_active: true,
    });
    setIsFormOpen(true);
  };

  // Handler Buka Form Edit Halaman
  const handleOpenEditForm = (p: DashboardPage) => {
    setEditingPage(p);
    setFormData({
      nama_page: p.nama_page,
      slug: p.slug,
      deskripsi: p.deskripsi,
      requires_login: p.requires_login,
      is_active: p.is_active,
    });
    setIsFormOpen(true);
  };

  // Submit Form Halaman (Tambah / Edit)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedSlug = formData.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (editingPage) {
      setPages((prev) =>
        prev.map((item) =>
          item.id === editingPage.id
            ? {
                ...item,
                nama_page: formData.nama_page,
                slug: formattedSlug || item.slug,
                deskripsi: formData.deskripsi,
                requires_login: formData.requires_login,
                is_active: formData.is_active,
              }
            : item
        )
      );
    } else {
      const newPageId = `p_${Date.now()}`;
      const newPage: DashboardPage = {
        id: newPageId,
        nama_page: formData.nama_page,
        slug: formattedSlug || `halaman-${Date.now()}`,
        deskripsi: formData.deskripsi,
        requires_login: formData.requires_login,
        is_active: formData.is_active,
      };

      // Default default access rule: Pegawai, Admin Humas, Administrator
      const defaultRules: DashboardPageAccess[] = [
        { id: `a_${Date.now()}_1`, dashboard_page_id: newPageId, access_type: "role", role: "pegawai" },
        { id: `a_${Date.now()}_2`, dashboard_page_id: newPageId, access_type: "role", role: "admin_humas" },
        { id: `a_${Date.now()}_3`, dashboard_page_id: newPageId, access_type: "role", role: "administrator" },
      ];

      setPages((prev) => [...prev, newPage]);
      setAccessRules((prev) => [...prev, ...defaultRules]);
    }

    setIsFormOpen(false);
  };

  // Handler Toggle Status Aktif Halaman
  const handleToggleActive = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, is_active: !p.is_active } : p))
    );
  };

  // Handler Buka Modal Pengaturan Akses Granular
  const handleOpenAccessModal = (p: DashboardPage) => {
    setAccessPage(p);
    const existingRules = accessRules.filter((a) => a.dashboard_page_id === p.id);

    const activeRoles = existingRules
      .filter((a) => a.access_type === "role" && a.role)
      .map((a) => a.role as Role);

    const activeUserIds = existingRules
      .filter((a) => a.access_type === "user" && a.user_id)
      .map((a) => a.user_id as string);

    setSelectedRoles(activeRoles);
    setSelectedUserIds(activeUserIds);
    setUserSearchQuery("");
  };

  // Simpan Aturan Akses Granular
  const handleSaveAccessRules = () => {
    if (!accessPage) return;

    // Hapus aturan lama halaman ini
    const otherRules = accessRules.filter((a) => a.dashboard_page_id !== accessPage.id);

    // Reconstruct aturan baru
    const newRoleRules: DashboardPageAccess[] = selectedRoles.map((r, idx) => ({
      id: `a_${Date.now()}_r_${idx}`,
      dashboard_page_id: accessPage.id,
      access_type: "role",
      role: r,
    }));

    const newUserRules: DashboardPageAccess[] = selectedUserIds.map((uid, idx) => ({
      id: `a_${Date.now()}_u_${idx}`,
      dashboard_page_id: accessPage.id,
      access_type: "user",
      user_id: uid,
    }));

    setAccessRules([...otherRules, ...newRoleRules, ...newUserRules]);
    setAccessPage(null);
  };

  // Confirm Hapus Halaman
  const handleConfirmDelete = () => {
    if (!deletingPage) return;
    setPages((prev) => prev.filter((p) => p.id !== deletingPage.id));
    setAccessRules((prev) => prev.filter((a) => a.dashboard_page_id !== deletingPage.id));
    setDeletingPage(null);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center space-y-3">
        <h2 className="text-xl font-bold text-red-700 dark:text-red-400">
          Akses Ditolak
        </h2>
        <p className="text-sm text-red-600 dark:text-red-300">
          Halaman Manajemen Halaman & Akses hanya dapat diakses oleh akun dengan role <strong className="font-semibold">Administrator</strong>.
        </p>
        <p className="text-xs text-gray-500">
          Role Anda saat ini: <span className="font-mono">{currentUser?.role}</span> ({currentUser?.nama})
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manajemen Halaman & Akses
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kelola halaman dashboard kegiatan dinamis (`/dashboard-kegiatan/[slug]`) dan atur hak akses granular per role/user
          </p>
        </div>

        <button
          onClick={handleOpenCreateForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-5 py-3 font-semibold text-sm shadow-md hover:shadow-lg transition duration-200 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Halaman Dashboard
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-4 shadow-sm">
        <div className="relative">
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
            placeholder="Cari nama halaman, slug, atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
      </div>

      {/* Data Table Halaman Dashboard */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Halaman & Slug</th>
                <th className="py-3.5 px-4 w-32 text-center">Autentikasi</th>
                <th className="py-3.5 px-4 w-32 text-center">Status</th>
                <th className="py-3.5 px-4">Matriks Hak Akses Granular</th>
                <th className="py-3.5 px-4 w-40 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400 text-xs">
                    Tidak ada halaman dashboard yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                paginatedPages.map((page, index) => {
                  const pageRules = accessRules.filter((a) => a.dashboard_page_id === page.id);
                  const roleRules = pageRules.filter((a) => a.access_type === "role" && a.role);
                  const userRules = pageRules.filter((a) => a.access_type === "user" && a.user_id);

                  return (
                    <tr
                      key={page.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition"
                    >
                      <td className="py-3.5 px-4 text-center font-medium text-gray-400 text-xs">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>

                      {/* Nama Halaman & Slug */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {page.nama_page}
                        </div>
                        <div className="text-xs font-mono text-brand-600 dark:text-brand-400 mt-0.5">
                          /dashboard-kegiatan/{page.slug}
                        </div>
                        {page.deskripsi && (
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-1 mt-0.5">
                            {page.deskripsi}
                          </div>
                        )}
                      </td>

                      {/* Autentikasi / Required Login */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          page.requires_login
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        }`}>
                          {page.requires_login ? "🔒 Wajib Login" : "🌐 Publik"}
                        </span>
                      </td>

                      {/* Status Button Toggle */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(page.id)}
                          title="Klik untuk mengubah status aktif"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                            page.is_active
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          <span>{page.is_active ? "●" : "○"}</span>
                          <span>{page.is_active ? "Aktif" : "Nonaktif"}</span>
                        </button>
                      </td>

                      {/* Matriks Hak Akses Granular */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {roleRules.map((r) => (
                            <span key={r.id} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[11px] font-medium border border-blue-200 dark:border-blue-800">
                              Role: {r.role}
                            </span>
                          ))}
                          {userRules.map((u) => {
                            const foundUser = users.find((usr) => usr.id === u.user_id);
                            return (
                              <span key={u.id} className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 text-[11px] font-medium border border-purple-200 dark:border-purple-800">
                                User: {foundUser ? foundUser.nama : u.user_id}
                              </span>
                            );
                          })}
                          {roleRules.length === 0 && userRules.length === 0 && (
                            <span className="text-rose-500 text-[11px] italic">Tidak ada akses diberikan (Terkunci)</span>
                          )}
                        </div>
                      </td>

                      {/* Sel Aksi */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenAccessModal(page)}
                            title="Atur Hak Akses Granular"
                            className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/30 transition cursor-pointer"
                          >
                            ⚙️
                          </button>
                          <Link
                            href={page.slug.startsWith("/") ? page.slug : page.slug === "dok-se2026" ? "/dok-se2026" : `/dashboard-kegiatan/${page.slug}`}
                            title="Pratinjau Halaman"
                            className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/30 transition cursor-pointer"
                          >
                            ↗
                          </Link>
                          <button
                            onClick={() => handleOpenEditForm(page)}
                            title="Edit Halaman"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:text-gray-400 dark:hover:bg-brand-950/30 transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeletingPage(page)}
                            title="Hapus Halaman"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:text-gray-400 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

      {/* ===================== MODAL FORM (TAMBAH / EDIT HALAMAN) ===================== */}
      {isFormOpen && (
        <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} showCloseButton={false} className="max-w-lg p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingPage ? "Edit Halaman Dashboard" : "Tambah Halaman Dashboard Baru"}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Halaman Dashboard *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama_page}
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                    setFormData({
                      ...formData,
                      nama_page: val,
                      slug: editingPage ? formData.slug : autoSlug,
                    });
                  }}
                  placeholder="Contoh: Dashboard Sensus Ekonomi 2026"
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  URL Slug (Akan diakses di /dashboard-kegiatan/[slug]) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Contoh: sensus-ekonomi-2026"
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Deskripsi Halaman
                </label>
                <textarea
                  rows={3}
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Penjelasan fungsi dan cakupan data dashboard ini..."
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="requires_login_toggle"
                  checked={formData.requires_login}
                  onChange={(e) => setFormData({ ...formData, requires_login: e.target.checked })}
                  className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="requires_login_toggle" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Wajib Login (Pengguna harus autentikasi terlebih dahulu)
                </label>
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
                  {editingPage ? "Simpan Perubahan" : "Tambah Halaman"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ===================== MODAL ATUR HAK AKSES GRANULAR ===================== */}
      {accessPage && (
        <Modal isOpen={!!accessPage} onClose={() => setAccessPage(null)} showCloseButton={true} className="max-w-xl p-6">
          <div className="space-y-5">
            <div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
                /dashboard-kegiatan/{accessPage.slug}
              </span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                Pengaturan Hak Akses: {accessPage.nama_page}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tentukan role dan/atau akun user spesifik yang diizinkan mengakses halaman ini.
              </p>
            </div>

            {/* 1. Opsi Berdasarkan Role */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  1. Akses Berdasarkan Role:
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedRoles(["pegawai", "admin_humas", "administrator", "eksternal"])}
                    className="text-brand-600 dark:text-brand-400 hover:underline font-semibold cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRoles([])}
                    className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                  >
                    Hapus Semua
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {(["pegawai", "admin_humas", "administrator", "eksternal"] as Role[]).map((r) => {
                  const isChecked = selectedRoles.includes(r);
                  return (
                    <label
                      key={r}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border transition cursor-pointer ${
                        isChecked
                          ? "bg-brand-50/60 border-brand-300 text-brand-700 dark:bg-brand-950/40 dark:border-brand-800 dark:text-brand-300 font-semibold"
                          : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles((prev) => [...prev, r]);
                          } else {
                            setSelectedRoles((prev) => prev.filter((item) => item !== r));
                          }
                        }}
                        className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 cursor-pointer"
                      />
                      <span>Role: <strong className="uppercase">{r}</strong></span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 2. Opsi Berdasarkan User Spesifik */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  2. Akses Berdasarkan User Spesifik (Personal Grant):
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds(users.map((u) => u.id))}
                    className="text-purple-600 dark:text-purple-400 hover:underline font-semibold cursor-pointer"
                  >
                    Pilih Semua User
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                  >
                    Hapus Semua
                  </button>
                </div>
              </div>

              {/* Input Pencarian Nama User */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400"
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
                  placeholder="Cari nama user atau email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {users
                  .filter((u) => {
                    if (!userSearchQuery.trim()) return true;
                    const q = userSearchQuery.toLowerCase();
                    return (
                      u.nama.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                    );
                  })
                  .map((u) => {
                    const isChecked = selectedUserIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs transition cursor-pointer ${
                          isChecked
                            ? "bg-purple-50/60 border-purple-300 text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300 font-semibold"
                            : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds((prev) => [...prev, u.id]);
                              } else {
                                setSelectedUserIds((prev) => prev.filter((id) => id !== u.id));
                              }
                            }}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                          />
                          <span>{u.nama} ({u.email})</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono">
                          {u.role}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setAccessPage(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAccessRules}
                className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow transition cursor-pointer"
              >
                Simpan Matriks Akses
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================== MODAL KONFIRMASI HAPUS ===================== */}
      {deletingPage && (
        <Modal isOpen={!!deletingPage} onClose={() => setDeletingPage(null)} showCloseButton={false} className="max-w-md p-6">
          <div className="text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Konfirmasi Hapus Halaman
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Apakah Anda yakin ingin menghapus halaman <strong className="text-gray-900 dark:text-white">"{deletingPage.nama_page}"</strong> (/dashboard-kegiatan/{deletingPage.slug})? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingPage(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow transition cursor-pointer"
              >
                Ya, Hapus Halaman
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
