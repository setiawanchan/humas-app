"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase/client";
import { extractAssignmentId } from "@/types/fasih-reject";

interface RejectUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  kecamatan: string;
  desa: string;
  sls: string;
  idsls: string;
  nama_usaha: string;
  link: string;
  assignment_id: string;
}

export default function RejectUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: RejectUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage("");
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          setErrorMessage("File kosong atau tidak memiliki data baris.");
          setParsedData([]);
          return;
        }

        // Normalisasi key header kolom
        const rows: ParsedRow[] = [];
        for (const row of rawJson) {
          // Cari key yang cocok case-insensitively
          const keys = Object.keys(row);
          const findKey = (target: string) =>
            keys.find((k) => k.trim().toLowerCase() === target.toLowerCase()) || "";

          const kKec = findKey("kecamatan");
          const kDesa = findKey("desa");
          const kSls = findKey("sls");
          const kIdSls = findKey("idsls") || findKey("id_sls") || findKey("id sls");
          const kUsaha =
            findKey("nama usaha") ||
            findKey("nama_usaha") ||
            findKey("nama_perusahaan") ||
            findKey("usaha") ||
            findKey("perusahaan");
          const kLink =
            findKey("link") ||
            findKey("url") ||
            findKey("link penugasan") ||
            findKey("link fasih");

          const linkVal = String(row[kLink] || "").trim();
          if (!linkVal) continue; // Abaikan baris tanpa link

          rows.push({
            kecamatan: String(row[kKec] || "").trim(),
            desa: String(row[kDesa] || "").trim(),
            sls: String(row[kSls] || "").trim(),
            idsls: String(row[kIdSls] || "").trim(),
            nama_usaha: String(row[kUsaha] || "").trim(),
            link: linkVal,
            assignment_id: extractAssignmentId(linkVal),
          });
        }

        if (rows.length === 0) {
          setErrorMessage(
            "Kolom 'Link' tidak ditemukan atau semua baris link kosong. Pastikan ada kolom header: Kecamatan, Desa, SLS, IDSLS, Link."
          );
          setParsedData([]);
        } else {
          setParsedData(rows);
        }
      } catch (err: any) {
        setErrorMessage("Gagal membaca file: " + (err?.message || "Format tidak valid"));
        setParsedData([]);
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Kecamatan: "010 - BATANGHARI",
        Desa: "001 - BUMI RESTU",
        SLS: "RT 001 RW 001",
        IDSLS: "18040100010001",
        "Nama Usaha": "TOKO BERKAH JAYA",
        Link: "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/0e11feb6-f933-45d4-b0c6-7d15fc0a1104",
      },
      {
        Kecamatan: "010 - BATANGHARI",
        Desa: "002 - BUMI HARJO",
        SLS: "RT 002 RW 001",
        IDSLS: "18040100020002",
        "Nama Usaha": "UD MAJU MAPAN",
        Link: "https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/147cb6a4-cac2-40ae-8a92-ecd4c377587c",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Reject");
    XLSX.writeFile(wb, "template_daftar_reject.xlsx");
  };

  const handleSaveToSupabase = async () => {
    if (parsedData.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Hilangkan duplikat internal dalam file upload terlebih dahulu (ambil yang paling akhir)
      const uniqueMap = new Map<string, any>();
      for (const d of parsedData) {
        const key = d.assignment_id || d.link;
        uniqueMap.set(key, {
          kecamatan: d.kecamatan || null,
          desa: d.desa || null,
          sls: d.sls || null,
          idsls: d.idsls || null,
          nama_usaha: d.nama_usaha || null,
          link: d.link,
          assignment_id: d.assignment_id || null,
          status: "pending",
          updated_at: new Date().toISOString(),
        });
      }

      const payload = Array.from(uniqueMap.values());

      // Kirim dalam batch (chunk 500) agar Supabase REST API tidak overload saat mengunggah ribuan data
      const CHUNK_SIZE = 500;
      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from("fasih_reject_items")
          .upsert(chunk, {
            onConflict: "assignment_id",
            ignoreDuplicates: false, // false = timpa/update jika sudah ada
          });

        if (error) {
          throw new Error(error.message);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage("Gagal menyimpan ke database: " + (err?.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              Upload Daftar Reject (Excel / CSV)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              File dapat memuat kolom: <span className="font-semibold text-brand-500">Kecamatan, Desa, SLS, IDSLS, Nama Usaha, Link</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between gap-3 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50">
            <span className="text-xs text-blue-700 dark:text-blue-300">
              Belum punya template Excel? Unduh format contoh di sini:
            </span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              📥 Download Template
            </button>
          </div>

          {/* File Input */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center hover:border-brand-500 transition cursor-pointer">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-300 cursor-pointer"
            />
            {file && (
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                File terpilih: {file.name} (Ukuran: {(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Preview Data ({parsedData.length} baris terdeteksi):
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-xl text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="p-2">Kecamatan</th>
                      <th className="p-2">Desa</th>
                      <th className="p-2">SLS / IDSLS</th>
                      <th className="p-2">Nama Usaha</th>
                      <th className="p-2">Assignment ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {parsedData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="p-2 text-gray-800 dark:text-gray-200">{row.kecamatan || "-"}</td>
                        <td className="p-2 text-gray-800 dark:text-gray-200">{row.desa || "-"}</td>
                        <td className="p-2 text-gray-600 dark:text-gray-400">
                          {row.sls} <span className="text-[10px] text-gray-400">({row.idsls})</span>
                        </td>
                        <td className="p-2 font-medium text-gray-800 dark:text-gray-200">
                          {row.nama_usaha || "-"}
                        </td>
                        <td className="p-2 font-mono text-[11px] text-brand-600 dark:text-brand-400">
                          {row.assignment_id || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 10 && (
                <p className="text-[11px] text-gray-400 mt-1 italic">
                  * Menampilkan 10 dari {parsedData.length} baris total.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveToSupabase}
            disabled={parsedData.length === 0 || isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Menyimpan...
              </>
            ) : (
              `Simpan ke Database (${parsedData.length} Item)`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
