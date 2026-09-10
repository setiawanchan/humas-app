"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { mockFormTemplates } from "@/lib/mock-data";

export default function FormBuilderPage() {
  const { currentUser } = useAuth();
  const canManage = currentUser?.role === "admin_humas" || currentUser?.role === "administrator";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Form Builder & Kuis
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kelola template daftar hadir dan kuis interaktif
          </p>
        </div>

        {canManage && (
          <button className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 font-semibold text-sm shadow-md transition cursor-pointer">
            + Buat Form Baru
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockFormTemplates.map((form) => (
          <div
            key={form.id}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 uppercase">
                {form.jenis}
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                ● Publik
              </span>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
              {form.nama_form}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {form.deskripsi}
            </p>
            <div className="pt-2 text-xs text-gray-400">
              Slug Publik: <code className="text-brand-600 dark:text-brand-400 font-mono">/form/{form.slug}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
