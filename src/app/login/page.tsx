"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { loginWithCredentials } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!identifier.trim() || !password.trim()) {
      setErrorMsg("Harap isi username/email dan password Anda.");
      return;
    }

    setIsSubmitting(true);
    const success = await loginWithCredentials(identifier.trim(), password.trim());
    setIsSubmitting(false);

    if (success) {
      router.push("/");
    } else {
      setErrorMsg("Username/Email atau Password tidak cocok / belum terdaftar!");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-bold text-2xl shadow-md">
              BPS
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Sistem Humas Internal
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            BPS Kabupaten Lebak &bull; Portal Kehumasan & Dokumen
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label
              htmlFor="identifier"
              className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Username / Email BPS
            </label>
            <input
              id="identifier"
              type="text"
              required
              placeholder="Masukkan username atau email..."
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-medium transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Kata Sandi / Password
            </label>
            <input
              id="password"
              type="password"
              required
              placeholder="Masukkan kata sandi..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-medium transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 p-3.5 text-white font-bold text-xs shadow-md hover:shadow-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "Memverifikasi..." : "Masuk ke Sistem"}
          </button>
        </form>

        <div className="text-center text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-4">
          BPS Kabupaten Lebak &bull; Integrated Public Relations Application
        </div>
      </div>
    </div>
  );
}
