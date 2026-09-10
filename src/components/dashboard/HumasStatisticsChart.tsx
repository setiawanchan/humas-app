"use client";

import React, { useState, useMemo } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { mockDocumentation, mockContentCalendar } from "@/lib/mock-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function HumasStatisticsChart() {
  // Mode Periode: 'monthly' atau 'yearly'
  const [periodMode, setPeriodMode] = useState<"monthly" | "yearly">("monthly");

  // Filter Tahun (Default 2026)
  const [selectedYear, setSelectedYear] = useState<string>("2026");

  // Filter Rentang Bulan (Default 'current' = September 2026 / Bulan Berjalan)
  // Options: 'current' (Bulan Saat Ini), 'ytd' (Jan s.d. Bulan Saat Ini), 'full' (Setahun Penuh Jan-Des)
  const [selectedMonthRange, setSelectedMonthRange] = useState<string>("current");

  // Daftar Bulan
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

  // Hitung Data Grafik berdasarkan Filter
  const chartData = useMemo(() => {
    if (periodMode === "yearly") {
      return {
        categories: ["2023", "2024", "2025", "2026"],
        docSeries: [142, 198, 245, mockDocumentation.length + 250],
        contentSeries: [180, 260, 320, mockContentCalendar.length + 360],
        subtitle: "Tren pertumbuhan volume data 4 tahun terakhir (2023 - 2026)",
      };
    }

    // Mode Bulanan
    const fullDocByMonth = [12, 18, 15, 22, 28, 24, 30, 25, mockDocumentation.length + 15, 14, 16, 20];
    const fullContentByMonth = [15, 24, 28, 32, 40, 38, 45, 36, mockContentCalendar.length + 22, 22, 25, 30];

    if (selectedMonthRange === "current") {
      // Default: Bulan Berjalan (September - index 8)
      // Tampilkan per minggu / breakdown bulan berjalan
      return {
        categories: ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"],
        docSeries: [5, 8, 4, mockDocumentation.length],
        contentSeries: [7, 10, 8, mockContentCalendar.length],
        subtitle: `Data Bulan Ini (September ${selectedYear})`,
      };
    } else if (selectedMonthRange === "ytd") {
      // Jan s.d. Sep (Index 0 - 8)
      return {
        categories: allMonths.slice(0, 9),
        docSeries: fullDocByMonth.slice(0, 9),
        contentSeries: fullContentByMonth.slice(0, 9),
        subtitle: `Rentang Jan s.d. Sep ${selectedYear} (s.d. Bulan Berjalan)`,
      };
    } else {
      // Setahun Penuh (Jan - Des)
      return {
        categories: allMonths,
        docSeries: fullDocByMonth,
        contentSeries: fullContentByMonth,
        subtitle: `Rentang 1 Tahun Penuh (${selectedYear})`,
      };
    }
  }, [periodMode, selectedYear, selectedMonthRange]);

  const totalDoc = chartData.docSeries.reduce((a, b) => a + b, 0);
  const totalContent = chartData.contentSeries.reduce((a, b) => a + b, 0);

  const options: ApexOptions = {
    colors: ["#f97316", "#0284c7"], // Brand Orange & Sky Blue
    chart: {
      fontFamily: "Outfit, Inter, sans-serif",
      type: "bar",
      height: 320,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: periodMode === "monthly" && selectedMonthRange === "current" ? "35%" : "48%",
        borderRadius: 6,
        borderRadiusApplication: "end",
        dataLabels: {
          position: "top", // Angka langsung terlihat di atas batang
        },
      },
    },
    // Data Labels di atas batang langsung terlihat jelas
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "11px",
        fontWeight: "bold",
        colors: ["#ea580c", "#0369a1"],
      },
      offsetY: -20,
    },
    stroke: {
      show: true,
      width: 3,
      colors: ["transparent"],
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
          fontSize: "12px",
          fontWeight: 600,
        },
      },
      // Garis Crosshair tegak terlihat jelas saat hover
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
          fontSize: "11px",
        },
      },
    },
    legend: {
      show: false,
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
    // Tooltip gabungan saat hover
    tooltip: {
      theme: "light",
      shared: true,
      intersect: false,
      x: {
        show: true,
      },
      y: {
        formatter: (val: number) => `${val} Item`,
      },
    },
  };

  const series = [
    {
      name: "Dokumentasi Kegiatan",
      data: chartData.docSeries,
    },
    {
      name: "Kalender Konten",
      data: chartData.contentSeries,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-5">
      {/* Header & Controls Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Statistik Humas & Konten
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {chartData.subtitle}
          </p>
        </div>

        {/* Filter Controls (Rentang Bulan, Tahun, & Mode) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-xs font-semibold">
            <button
              onClick={() => setPeriodMode("monthly")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                periodMode === "monthly"
                  ? "bg-white dark:bg-gray-800 text-brand-600 dark:text-white shadow-sm font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              🗓️ Bulanan
            </button>
            <button
              onClick={() => setPeriodMode("yearly")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                periodMode === "yearly"
                  ? "bg-white dark:bg-gray-800 text-brand-600 dark:text-white shadow-sm font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              📈 Tahunan
            </button>
          </div>

          {/* Dynamic Filter Dropdowns jika mode Bulanan */}
          {periodMode === "monthly" && (
            <>
              {/* Dropdown Rentang Bulan */}
              <select
                value={selectedMonthRange}
                onChange={(e) => setSelectedMonthRange(e.target.value)}
                className="py-1.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="current">📍 Bulan Ini (September)</option>
                <option value="ytd">📆 Jan - Sep (s.d. Bulan Ini)</option>
                <option value="full">🗓️ Setahun Penuh (Jan - Des)</option>
              </select>

              {/* Dropdown Pilih Tahun */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="py-1.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Legend & Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-gray-100 dark:border-gray-700/60 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></span>
          <div>
            <div className="text-[11px] text-gray-400">Dokumentasi</div>
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {totalDoc} <span className="text-[11px] font-normal text-gray-400">Foto/Video</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-sky-600 shrink-0"></span>
          <div>
            <div className="text-[11px] text-gray-400">Kalender Konten</div>
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {totalContent} <span className="text-[11px] font-normal text-gray-400">Postingan</span>
            </div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-2 flex items-center justify-end text-right text-[11px] text-gray-400">
          <span className="bg-gray-50 dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-gray-800">
            💡 Kursor hover pada batang untuk melihat garis bantu crosshair
          </span>
        </div>
      </div>

      {/* ApexChart Component */}
      <div className="w-full overflow-x-auto pt-2">
        <div className="min-w-[600px]">
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height={320}
          />
        </div>
      </div>
    </div>
  );
}
