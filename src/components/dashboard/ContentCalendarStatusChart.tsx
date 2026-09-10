"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { mockContentCalendar, ContentCalendarItem } from "@/lib/mock-data";
import { getKalenderKontenFromSupabase } from "@/lib/supabase/kalender-service";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function ContentCalendarStatusChart() {
  const currentRealDate = new Date();
  const currentRealYear = currentRealDate.getFullYear().toString();
  const currentRealMonthIdx = currentRealDate.getMonth();

  const [selectedYear, setSelectedYear] = useState<string>(currentRealYear);
  const [selectedRange, setSelectedRange] = useState<string>("current");
  const [items, setItems] = useState<ContentCalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const remote = await getKalenderKontenFromSupabase();
        if (remote && remote.length > 0) {
          setItems(remote as ContentCalendarItem[]);
        } else {
          setItems(mockContentCalendar);
        }
      } catch (err) {
        console.error("Error loading calendar content chart:", err);
        setItems(mockContentCalendar);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const allMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agt",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  const fullMonthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  // Helper untuk memetakan status
  const normalizeStatus = (status: string): "draft" | "siap" | "terjadwal" | "terbit" => {
    const s = (status || "").toLowerCase();
    if (s === "draft") return "draft";
    if (s === "siap" || s === "rencana") return "siap";
    if (s === "terjadwal") return "terjadwal";
    if (s === "terbit" || s === "selesai") return "terbit";
    return "draft";
  };

  // Distribution status breakdown berbasis data riil
  const chartData = useMemo(() => {
    const targetYearNum = parseInt(selectedYear, 10);

    if (selectedRange === "current") {
      // 4 Minggu dalam Bulan Berjalan
      // Hitung tanggal pada bulan & tahun terpilih (jika tahun sama dengan tahun sekarang, gunakan bulan sekarang, jika tidak gunakan September / bulan terakhir)
      const targetMonthIdx =
        selectedYear === currentRealYear ? currentRealMonthIdx : 8; // fallback ke September jika beda tahun
      const monthName = fullMonthNames[targetMonthIdx];

      const draft = [0, 0, 0, 0];
      const siap = [0, 0, 0, 0];
      const terjadwal = [0, 0, 0, 0];
      const terbit = [0, 0, 0, 0];

      items.forEach((item) => {
        if (!item.tanggal) return;
        const d = new Date(item.tanggal);
        if (isNaN(d.getTime())) return;
        if (d.getFullYear() === targetYearNum && d.getMonth() === targetMonthIdx) {
          const dateNum = d.getDate();
          const weekIdx = Math.min(Math.floor((dateNum - 1) / 7), 3);
          const st = normalizeStatus(item.status);
          if (st === "draft") draft[weekIdx]++;
          else if (st === "siap") siap[weekIdx]++;
          else if (st === "terjadwal") terjadwal[weekIdx]++;
          else if (st === "terbit") terbit[weekIdx]++;
        }
      });

      return {
        categories: ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"],
        draft,
        siap,
        terjadwal,
        terbit,
        subtitle: `${monthName} ${selectedYear} (Per Minggu & Status)`,
      };
    } else if (selectedRange === "ytd") {
      // Jan s.d. Bulan Berjalan
      const endMonthIdx =
        selectedYear === currentRealYear ? currentRealMonthIdx : 8;
      const categories = allMonths.slice(0, endMonthIdx + 1);

      const draft = new Array(categories.length).fill(0);
      const siap = new Array(categories.length).fill(0);
      const terjadwal = new Array(categories.length).fill(0);
      const terbit = new Array(categories.length).fill(0);

      items.forEach((item) => {
        if (!item.tanggal) return;
        const d = new Date(item.tanggal);
        if (isNaN(d.getTime())) return;
        if (d.getFullYear() === targetYearNum && d.getMonth() <= endMonthIdx) {
          const mIdx = d.getMonth();
          const st = normalizeStatus(item.status);
          if (st === "draft") draft[mIdx]++;
          else if (st === "siap") siap[mIdx]++;
          else if (st === "terjadwal") terjadwal[mIdx]++;
          else if (st === "terbit") terbit[mIdx]++;
        }
      });

      return {
        categories,
        draft,
        siap,
        terjadwal,
        terbit,
        subtitle: `Jan s.d. ${allMonths[endMonthIdx]} ${selectedYear} (Per Bulan & Status)`,
      };
    } else if (selectedRange === "yearly") {
      // 4 Tahun Terakhir
      const currentY = parseInt(currentRealYear, 10);
      const categories = [
        (currentY - 3).toString(),
        (currentY - 2).toString(),
        (currentY - 1).toString(),
        currentY.toString(),
      ];

      const draft = [0, 0, 0, 0];
      const siap = [0, 0, 0, 0];
      const terjadwal = [0, 0, 0, 0];
      const terbit = [0, 0, 0, 0];

      items.forEach((item) => {
        if (!item.tanggal) return;
        const d = new Date(item.tanggal);
        if (isNaN(d.getTime())) return;
        const yStr = d.getFullYear().toString();
        const yIdx = categories.indexOf(yStr);
        if (yIdx !== -1) {
          const st = normalizeStatus(item.status);
          if (st === "draft") draft[yIdx]++;
          else if (st === "siap") siap[yIdx]++;
          else if (st === "terjadwal") terjadwal[yIdx]++;
          else if (st === "terbit") terbit[yIdx]++;
        }
      });

      return {
        categories,
        draft,
        siap,
        terjadwal,
        terbit,
        subtitle: `Tren 4 Tahun Terakhir (${categories[0]} - ${categories[3]})`,
      };
    } else {
      // Setahun Penuh (12 Bulan)
      const draft = new Array(12).fill(0);
      const siap = new Array(12).fill(0);
      const terjadwal = new Array(12).fill(0);
      const terbit = new Array(12).fill(0);

      items.forEach((item) => {
        if (!item.tanggal) return;
        const d = new Date(item.tanggal);
        if (isNaN(d.getTime())) return;
        if (d.getFullYear() === targetYearNum) {
          const mIdx = d.getMonth();
          const st = normalizeStatus(item.status);
          if (st === "draft") draft[mIdx]++;
          else if (st === "siap") siap[mIdx]++;
          else if (st === "terjadwal") terjadwal[mIdx]++;
          else if (st === "terbit") terbit[mIdx]++;
        }
      });

      return {
        categories: allMonths,
        draft,
        siap,
        terjadwal,
        terbit,
        subtitle: `Setahun Penuh ${selectedYear} (Per Bulan & Status)`,
      };
    }
  }, [items, selectedYear, selectedRange, currentRealYear, currentRealMonthIdx]);


  const totalDraft = chartData.draft.reduce((a, b) => a + b, 0);
  const totalSiap = chartData.siap.reduce((a, b) => a + b, 0);
  const totalTerjadwal = chartData.terjadwal.reduce((a, b) => a + b, 0);
  const totalTerbit = chartData.terbit.reduce((a, b) => a + b, 0);

  const options: ApexOptions = {
    colors: ["#f59e0b", "#0284c7", "#6366f1", "#10b981"], // Amber, Sky Blue, Indigo, Emerald
    chart: {
      fontFamily: "Outfit, Inter, sans-serif",
      type: "bar",
      stacked: true,
      height: 280,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "40%",
        borderRadius: 4,
        dataLabels: {
          total: {
            enabled: true,
            style: {
              fontSize: "11px",
              fontWeight: "bold",
              color: "#334155",
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false, // Disembunyikan pada internal stack agar bersih, total di atas saja
    },
    stroke: {
      show: true,
      width: 1,
      colors: ["#ffffff"],
    },
    xaxis: {
      categories: chartData.categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: "#64748b",
          fontSize: "11px",
          fontWeight: 600,
        },
      },
      crosshairs: {
        show: true,
        width: 1,
        stroke: {
          color: "#0284c7",
          width: 1,
          dashArray: 4,
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#94a3b8",
          fontSize: "10px",
        },
      },
    },
    legend: {
      show: false, // Gunakan legend kustom agar tampilan sangat rapi
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      theme: "light",
      shared: true,
      intersect: false,
      x: {
        show: true,
      },
      y: {
        formatter: (val: number) => `${val} Postingan`,
      },
    },
  };

  const series = [
    {
      name: "Draft",
      data: chartData.draft,
    },
    {
      name: "Rencana / Siap",
      data: chartData.siap,
    },
    {
      name: "Terjadwal",
      data: chartData.terjadwal,
    },
    {
      name: "Terbit / Selesai",
      data: chartData.terbit,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">📅</span>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Statistik Kalender Konten (Per Status)
            </h2>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            {chartData.subtitle}
          </p>
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="py-1 px-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-[11px] font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="current">📍 Bulan Ini ({allMonths[currentRealMonthIdx]})</option>
            <option value="ytd">📆 Jan - {allMonths[currentRealMonthIdx]}</option>
            <option value="full">🗓️ Setahun Penuh</option>
            <option value="yearly">📈 Tren Tahunan</option>
          </select>

          {selectedRange !== "yearly" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="py-1 px-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-[11px] font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          )}
        </div>
      </div>

      {/* Legend & Counter Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-gray-100 dark:border-gray-700/60 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
          <span className="text-gray-500 dark:text-gray-400">Draft:</span>
          <strong className="text-gray-900 dark:text-white font-bold">{totalDraft}</strong>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0"></span>
          <span className="text-gray-500 dark:text-gray-400">Siap:</span>
          <strong className="text-gray-900 dark:text-white font-bold">{totalSiap}</strong>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
          <span className="text-gray-500 dark:text-gray-400">Terjadwal:</span>
          <strong className="text-gray-900 dark:text-white font-bold">{totalTerjadwal}</strong>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="text-gray-500 dark:text-gray-400">Terbit:</span>
          <strong className="text-gray-900 dark:text-white font-bold">{totalTerbit}</strong>
        </div>
      </div>

      {/* ApexChart Component */}
      <div className="w-full overflow-x-auto pt-1">
        <div className="min-w-[400px]">
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height={280}
          />
        </div>
      </div>
    </div>
  );
}
