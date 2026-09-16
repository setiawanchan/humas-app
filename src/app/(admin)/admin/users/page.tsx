"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { User, Role } from "@/lib/mock-data";
import { Modal } from "@/components/ui/modal";
import { bulkUpsertUsersInSupabase } from "@/lib/supabase/user-service";
import * as XLSX from "xlsx";

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
  const { currentUser, users, addUser, updateUser, toggleUserStatus, deleteUser, refreshUsers } = useAuth();
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
    username: "",
    password: "",
    role: "pegawai" as Role,
    is_active: true,
  });

  // State Modal Konfirmasi Hapus
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // State Modal Import Excel User
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Handler Unduh Template Excel Pengguna
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Nama Lengkap": "Ahmad Fauzi",
        "Email": "ahmad.fauzi@bps.go.id",
        "Username": "ahmad_fauzi",
        "Password": "Password123",
        "Role": "pegawai",
        "Status Aktif": "Ya",
      },
      {
        "Nama Lengkap": "Petugas Pengolahan 01",
        "Email": "petugas01@gmail.com",
        "Username": "petugas01",
        "Password": "",
        "Role": "eksternal",
        "Status Aktif": "Ya",
      },
      {
        "Nama Lengkap": "Siti Admin Humas",
        "Email": "siti.humas@bps.go.id",
        "Username": "siti_humas",
        "Password": "admin123",
        "Role": "admin_humas",
        "Status Aktif": "Ya",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template User");
    XLSX.writeFile(workbook, "template-import-user-bps.xlsx");
  };

  // Handler Parse File Excel (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!json || json.length === 0) {
          setImportError("File Excel kosong atau format tidak sesuai!");
          return;
        }

        processUserImportRows(json);
      } catch (err: any) {
        setImportError("Gagal membaca file Excel: " + (err?.message || "Format tidak didukung"));
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handler Parse Teks / CSV Manual
  const handleManualTextImport = () => {
    if (!importText.trim()) {
      setImportError("Tempel data teks / CSV terlebih dahulu!");
      return;
    }
    setImportError("");

    try {
      const lines = importText.trim().split(/\r?\n/);
      if (lines.length < 2) {
        setImportError("Data harus memiliki baris judul kolom dan minimal satu baris data!");
        return;
      }

      const headers = lines[0].split(/,|\t/).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(/,|\t/).map((c) => c.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = cols[idx] || "";
        });
        rows.push(row);
      }

      processUserImportRows(rows);
    } catch (err: any) {
      setImportError("Gagal memproses teks: " + (err?.message || "Format tidak valid"));
    }
  };

  // Eksekutor Penyimpanan Data Impor ke Supabase
  const processUserImportRows = async (rows: any[]) => {
    setIsImporting(true);
    setImportError("");

    const userListToUpsert: Array<Omit<User, "id">> = [];

    rows.forEach((row) => {
      const nama = String(
        row["Nama Lengkap"] || row["Nama"] || row["nama"] || row["nama_lengkap"] || ""
      ).trim();

      const email = String(
        row["Email"] || row["email"] || row["E-mail"] || ""
      ).trim();

      const username = String(
        row["Username"] || row["username"] || row["User"] || ""
      ).trim();

      const password = String(
        row["Password"] || row["password"] || row["Kata Sandi"] || ""
      ).trim();

      let rawRole = String(
        row["Role"] || row["role"] || row["Peran"] || "eksternal"
      ).trim().toLowerCase();

      // Normalisasi role
      let role: Role = "eksternal";
      if (rawRole.includes("admin_humas") || rawRole.includes("humas")) {
        role = "admin_humas";
      } else if (rawRole.includes("administrator") || rawRole === "admin") {
        role = "administrator";
      } else if (rawRole.includes("pegawai") || rawRole.includes("bps")) {
        role = "pegawai";
      } else {
        role = "eksternal";
      }

      const rawStatus = String(
        row["Status Aktif"] || row["Status"] || row["is_active"] || row["status"] || "Ya"
      ).trim().toLowerCase();

      const is_active = rawStatus === "ya" || rawStatus === "true" || rawStatus === "1" || rawStatus === "aktif";

      // Validasi baris: harus memiliki minimal nama atau email atau username
      if (nama || email || username) {
        userListToUpsert.push({
          nama: nama || username || email.split("@")[0] || "User Baru",
          email: email || `${username || "user_" + Date.now()}@bps.go.id`,
          username: username || (email ? email.split("@")[0] : `user_${Date.now()}`),
          password: password || undefined,
          role,
          is_active,
        });
      }
    });

    if (userListToUpsert.length === 0) {
      setImportError("Tidak ada baris data pengguna yang valid untuk diimpor!");
      setIsImporting(false);
      return;
    }

    try {
      const result = await bulkUpsertUsersInSupabase(userListToUpsert);
      await refreshUsers();
      setIsImportModalOpen(false);
      setImportText("");

      let message = `Berhasil memproses import:\n- ${result.successCount} user baru ditambahkan\n- ${result.updatedCount} user lama diperbarui`;
      if (result.errors.length > 0) {
        message += `\n\nCatatan kendala (${result.errors.length}):\n` + result.errors.slice(0, 3).join("\n");
      }
      alert(message);
    } catch (err: any) {
      setImportError("Terjadi kesalahan saat menyimpan ke database: " + (err?.message || "Unknown error"));
    } finally {
      setIsImporting(false);
    }
  };

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole, selectedStatus]);

  // Logika Filter
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Text Search Filter (Nama & Email & Username)
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesName = u.nama.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesUsername = u.username?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesUsername) return false;
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
      username: "",
      password: "",
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
      username: u.username || "",
      password: "", // Kosongkan password saat edit kecuali ingin diganti
      role: u.role,
      is_active: u.is_active,
    });
    setIsFormOpen(true);
  };

  // Form Submit (Tambah / Edit)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Partial<User> & { nama: string; email: string; role: Role; is_active: boolean } = {
      nama: formData.nama,
      email: formData.email,
      username: formData.username.trim() || undefined,
      role: formData.role,
      is_active: formData.is_active,
    };

    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    if (editingUser) {
      updateUser(editingUser.id, payload);
    } else {
      addUser(payload as Omit<User, "id">);
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 font-semibold text-xs md:text-sm shadow-sm transition duration-200 cursor-pointer"
            title="Import Akun Pengguna dari File Excel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Excel
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2.5 font-semibold text-xs md:text-sm shadow-2xs transition duration-200 cursor-pointer"
            title="Unduh format template Excel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Template
          </button>

          <button
            onClick={handleOpenCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 font-semibold text-xs md:text-sm shadow-sm hover:shadow-md transition duration-200 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Tambah User
          </button>
        </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Username BPS
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Contoh: ahmadfauzi"
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Kata Sandi / Password {editingUser ? "(Biarkan kosong jika tidak diubah)" : "*"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "Masukkan password baru jika ingin mengubah..." : "Masukkan kata sandi..."}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-xs"
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

      {/* ===================== MODAL IMPORT EXCEL USER ===================== */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportError("");
          setImportText("");
        }}
        className="max-w-xl p-6"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Import User dari Excel / CSV
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Unggah daftar pengguna untuk membuat akun baru atau memperbarui akun yang sudah ada.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 text-xs font-semibold hover:bg-brand-100 transition cursor-pointer flex items-center gap-1"
              title="Unduh Template Excel"
            >
              📥 Template Excel
            </button>
          </div>

          {importError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300">
              ⚠️ {importError}
            </div>
          )}

          {/* Opsi 1: Upload File Langsung */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Metode 1: Upload File (.xlsx, .xls, .csv)
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:border-brand-500 transition cursor-pointer bg-gray-50 dark:bg-gray-900">
              <input
                type="file"
                id="userExcelFileInput"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={isImporting}
                className="hidden"
              />
              <label htmlFor="userExcelFileInput" className="cursor-pointer block">
                <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                  {isImporting ? "Sedang memproses data..." : "Klik untuk memilih file Excel (.xlsx) atau seret ke sini"}
                </span>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Kolom yang didukung: Nama Lengkap, Email, Username, Password, Role, Status Aktif
                </p>
              </label>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            <span className="flex-shrink mx-3 text-[11px] text-gray-400 uppercase font-semibold">ATAU</span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          {/* Opsi 2: Salin Tempel Teks/Tabel */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Metode 2: Salin & Tempel Data dari Spreadsheet
            </label>
            <textarea
              rows={4}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              disabled={isImporting}
              placeholder={`Nama Lengkap\tEmail\tUsername\tPassword\tRole\tStatus Aktif\nBudi Santoso\tbudi@bps.go.id\tbudi_s\tadmin123\tpegawai\tYa\nPetugas 01\tpetugas01@gmail.com\tpetugas01\t\teksternal\tYa`}
              className="w-full p-3 font-mono text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-[11px] text-gray-400">
              * Password kosong akan otomatis diatur ke password bawaan (<strong>admin123</strong>).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportError("");
                setImportText("");
              }}
              disabled={isImporting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleManualTextImport}
              disabled={isImporting || !importText.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition shadow-sm disabled:opacity-50"
            >
              {isImporting ? "Memproses..." : "Proses Impor Teks"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
