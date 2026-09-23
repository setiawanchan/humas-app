"use client";

import React, { useState } from "react";
import { FasihRejectItem } from "@/types/fasih-reject";
import { generateBulkRejectScript } from "@/utils/fasihScriptGenerator";

interface RejectScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: FasihRejectItem[];
  onManualMarkSuccess: () => void;
}

export default function RejectScriptModal({
  isOpen,
  onClose,
  selectedItems,
  onManualMarkSuccess,
}: RejectScriptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const scriptCode = generateBulkRejectScript(selectedItems, supabaseUrl, supabaseAnonKey);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scriptCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert("Gagal menyalin script secara otomatis. Silakan blok dan salin teks secara manual.");
    }
  };

  // Bookmarklet string (minified runnable code)
  const bookmarkletHref = `javascript:(function(){${encodeURIComponent(
    scriptCode.replace(/\n\s*/g, " ")
  )}})();`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-xl text-lg font-bold">
              ⚡
            </span>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Eksekusi Bulk Reject ({selectedItems.length} Link Terpilih)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Script ini akan menolak penugasan langsung di tab web FASIH Anda yang sudah login.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Steps / Guide */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/70 dark:border-gray-700/60">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 flex items-center justify-center bg-brand-600 text-white rounded-full text-[10px] font-bold">
                  1
                </span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  Buka Tab FASIH
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Pastikan Anda sudah login di <strong>fasih-sm.bps.go.id</strong> di browser ini.
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/70 dark:border-gray-700/60">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 flex items-center justify-center bg-brand-600 text-white rounded-full text-[10px] font-bold">
                  2
                </span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  Buka DevTools Console
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Tekan tombol <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">F12</kbd> atau <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">Ctrl+Shift+I</kbd>, lalu pilih tab <strong>Console</strong>.
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/70 dark:border-gray-700/60">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 flex items-center justify-center bg-brand-600 text-white rounded-full text-[10px] font-bold">
                  3
                </span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  Paste & Jalankan
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Paste kode di bawah ini lalu tekan <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">Enter</kbd>. Status di web ini otomatis ter-update live!
              </p>
            </div>
          </div>

          {/* Bookmarklet option */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50">
            <div className="text-xs text-amber-800 dark:text-amber-200">
              ⭐ <strong>Opsi Cepat (Bookmarklet):</strong> Seret (drag) tombol ini ke Bookmark Bar browser Anda:
            </div>
            <a
              href={bookmarkletHref}
              onClick={(e) => {
                e.preventDefault();
                alert("Seret (drag & drop) link ini ke bar Bookmark browser Anda! Setelah tersimpan di bookmark, klik tombol bookmark tersebut saat membuka tab FASIH.");
              }}
              draggable
              className="text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition"
            >
              📌 Reject ({selectedItems.length}) Bookmarklet
            </a>
          </div>

          {/* Script Display */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Script DevTools Console ({selectedItems.length} Link Terpasang):
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition flex items-center gap-1.5 shadow-xs"
              >
                {copied ? "✅ Berhasil Disalin!" : "📋 Salin Script ke Clipboard"}
              </button>
            </div>
            <pre className="p-4 bg-gray-900 text-gray-200 rounded-xl text-[11px] font-mono max-h-56 overflow-y-auto leading-relaxed border border-gray-800 select-all">
              {scriptCode}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onManualMarkSuccess}
            className="text-xs px-3 py-2 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-xl font-medium border border-emerald-200 dark:border-emerald-800 transition"
          >
            ✓ Tandai Manual sebagai "Rejected" (Jika dijalankan offline)
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md transition flex items-center gap-2"
            >
              {copied ? "✅ Script Disalin!" : "⚡ Salin Script & Jalankan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
