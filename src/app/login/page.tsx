"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

export default function LoginPage() {
  const { users, currentUser, login } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentUser?.id || users[0]?.id || ""
  );
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId) {
      login(selectedUserId);
      router.push("/");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "administrator":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "admin_humas":
        return "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300";
      case "pegawai":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "eksternal":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold text-2xl">
              BPS
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Sistem Humas Internal
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            BPS Kabupaten Lebak
          </p>
          <div className="mt-3 inline-block rounded-full bg-orange-100 dark:bg-orange-950/40 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
            Simulasi Role-Based Login
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div>
            <label
              htmlFor="user-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Pilih Pengguna untuk Login
            </label>
            <select
              id="user-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3.5 text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm font-medium transition"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nama} ({user.role.toUpperCase()}) - {user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Selected user detail card */}
          {selectedUserId && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4 space-y-2">
              {(() => {
                const u = users.find((item) => item.id === selectedUserId);
                if (!u) return null;
                return (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                        {u.nama}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getRoleBadge(
                          u.role
                        )}`}
                      >
                        {u.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {u.email}
                    </p>
                  </>
                );
              })()}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 p-3.5 text-white font-semibold shadow-md hover:shadow-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer"
          >
            Masuk ke Sistem
          </button>
        </form>

        <div className="text-center text-xs text-gray-400 dark:text-gray-500">
          Mode Simulasi Development &bull; BPS Kabupaten Lebak
        </div>
      </div>
    </div>
  );
}
