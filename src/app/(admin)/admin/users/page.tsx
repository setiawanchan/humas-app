"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { User, Role } from "@/lib/mock-data";
import { Modal } from "@/components/ui/modal";

// Helper Role Badge Styling & Label
const getRoleBadge = (role: Role) => {
  switch (role) {
    case "administrator":
      return {
        label: "Administrator",
        className: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
      };
    case "admin_humas":
      return {
        label: "Admin Humas",
        className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
      };
    case "pegawai":
      return {
        label: "Pegawai BPS",
        className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
      };
    case "eksternal":
    default:
      return {
        label: "Eksternal",
        className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
      };
  }
};

export default function AdminUsersPage() {
  const { currentUser, users, addUser, updateUser, toggleUserStatus, deleteUser } = useAuth();
  const isAdmin = currentUser?.role === "administrator";

  // State Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // State Modal Form (Tambah / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    role: "pegawai" as Role,
    is_active: true,
  });

  // State Modal Konfirmasi Hapus
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole, selectedStatus]);

  // Logika Filter
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Text Search Filter (Nama & Email)
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesName = u.nama.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }

      // 2. Filter Role
      if (selectedRole !== "all" && u.role !== selectedRole) {
        return false;
      }

      // 3. Filter Status
      if (selectedStatus !== "all") {
        const isActive = selectedStatus === "active";
        if (u.is_active !== isActive) return false;
      }

      return true;
    });
  }, [users, searchQuery, selectedRole, selectedStatus]);

  // Calculations for Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const isFilterActive =
    searchQuery !== "" || selectedRole !== "all" || selectedStatus !== "all";

  const handleResetFilter = () => {
    setSearchQuery("");
    setSelectedRole("all");
    setSelectedStatus("all");
  };

  // Handler Buka Form Tambah
  const handleOpenCreateForm = () => {
    setEditingUser(null);
    setFormData({
      nama: "",
      email: "",
      role: "pegawai",
      is_active: true,
    });
    setIsFormOpen(true);
  };

  // Handler Buka Form Edit
  const handleOpenEditForm = (u: User) => {
    setEditingUser(u);
    setFormData({
      nama: u.nama,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
    });
    setIsFormOpen(true);
  };

  // Form Submit (Tambah / Edit)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      updateUser(editingUser.id, {
        nama: formData.nama,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active,
      });
    } else {
      addUser({
        nama: formData.nama,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active,
      });
    }

    setIsFormOpen(false);
  };

  // Confirm Hapus User
  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    deleteUser(deletingUser.id);
    setDeletingUser(null);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center space-y-3">
        <h2 className="text-xl font-bold text-red-700 dark:text-red-400">
          Akses Ditolak
        </h2>
        <p className="text-sm text-red-600 dark:text-red-300">
          Halaman Manajemen User hanya dapat diakses oleh akun dengan role <strong className="font-semibold">Administrator</strong>.
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
            Manajemen User
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pengelolaan akun pengguna BPS Lebak & penugasan role hak akses sistem
          </p>
        </div>

        <button
          onClick={handleOpenCreateForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-5 py-3 font-semibold text-sm shadow-md hover:shadow-lg transition duration-200 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah User Baru
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center">
          {/* 1. Search Box */}
          <div className="relative md:col-span-5">
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
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* 2. Filter Role */}
          <div className="md:col-span-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="all">👤 Semua Role</option>
              <option value="administrator">👑 Administrator</option>
              <option value="admin_humas">⭐ Admin Humas</option>
              <option value="pegawai">💼 Pegawai BPS</option>
              <option value="eksternal">🌐 Eksternal</option>
            </select>
          </div>

          {/* 3. Filter Status */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="all">⚡ Semua Status</option>
              <option value="active">● Aktif</option>
              <option value="inactive">○ Nonaktif</option>
            </select>
          </div>

          {/* 4. Reset Filter */}
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
          Menampilkan <span className="font-bold text-brand-600 dark:text-brand-400">{filteredUsers.length}</span> dari {users.length} Akun User
        </div>
        <div>
          * Akun Administrator memiliki hak akses sistem penuh
        </div>
      </div>

      {/* Data Table User */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Lengkap</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4 w-44">Role</th>
                <th className="py-3.5 px-4 w-32 text-center">Status</th>
                <th className="py-3.5 px-4 w-32 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400 text-xs">
                    Tidak ada akun user yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, index) => {
                  const roleBadge = getRoleBadge(u.role);
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition"
                    >
                      <td className="py-3.5 px-4 text-center font-medium text-gray-400 text-xs">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>

                      {/* Nama Lengkap */}
                      <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{u.nama}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300 font-bold border border-brand-200 dark:border-brand-800">
                              Anda
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {u.email}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${roleBadge.className}`}>
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* Status Button Toggle */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => toggleUserStatus(u.id)}
                          title="Klik untuk mengubah status aktif"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                            u.is_active
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          <span>{u.is_active ? "●" : "○"}</span>
                          <span>{u.is_active ? "Aktif" : "Nonaktif"}</span>
                        </button>
                      </td>

                      {/* Sel Aksi */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditForm(u)}
                            title="Edit User"
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
                            onClick={() => !isCurrent && setDeletingUser(u)}
                            disabled={isCurrent}
                            title={isCurrent ? "Tidak dapat menghapus akun sendiri" : "Hapus User"}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:text-gray-400 dark:hover:bg-rose-950/30 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
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

      {/* ===================== MODAL FORM (TAMBAH / EDIT) ===================== */}
      {isFormOpen && (
        <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} showCloseButton={false} className="max-w-lg p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingUser ? "Edit Akun User" : "Tambah Akun User Baru"}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Ahmad Fauzi, S.Stat."
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Alamat Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Contoh: ahmad@bps.go.id"
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Role Hak Akses *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-semibold"
                >
                  <option value="pegawai">💼 Pegawai BPS (Hanya Lihat)</option>
                  <option value="admin_humas">⭐ Admin Humas (Pengelola Konten)</option>
                  <option value="administrator">👑 Administrator (Akses Penuh System)</option>
                  <option value="eksternal">🌐 Eksternal (Tamu / Instansi Luar)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_active_toggle"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="is_active_toggle" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Akun dalam keadaan Aktif (Bisa Login)
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
                  {editingUser ? "Simpan Perubahan" : "Tambah User"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ===================== MODAL KONFIRMASI HAPUS ===================== */}
      {deletingUser && (
        <Modal isOpen={!!deletingUser} onClose={() => setDeletingUser(null)} showCloseButton={false} className="max-w-md p-6">
          <div className="text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Konfirmasi Hapus User
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Apakah Anda yakin ingin menghapus akun user <strong className="text-gray-900 dark:text-white">"{deletingUser.nama}" ({deletingUser.email})</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow transition cursor-pointer"
              >
                Ya, Hapus User
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
