"use client";

import React, { useState, useMemo } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { mockContentCalendar } from "@/lib/mock-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function ContentCalendarStatusChart() {
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedRange, setSelectedRange] = useState<string>("current");

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

  // Distribution status breakdown
  const chartData = useMemo(() => {
    // Draft, Siap, Terjadwal, Terbit
    if (selectedRange === "current") {
      // September 2026 - Rincian per minggu
      return {
        categories: ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"],
        draft: [2, 1, 3, 2],
        siap: [3, 2, 2, 4],
        terjadwal: [2, 4, 3, 2],
        terbit: [5, 6, 4, mockContentCalendar.filter((c) => c.status === "terbit").length + 3],
        subtitle: `September ${selectedYear} (Per Status Konten)`,
      };
    } else if (selectedRange === "ytd") {
      // Jan - Sep
      return {
        categories: allMonths.slice(0, 9),
        draft: [3, 4, 2, 5, 4, 3, 6, 4, 5],
        siap: [4, 5, 6, 7, 8, 6, 9, 7, 8],
        terjadwal: [3, 4, 5, 6, 7, 5, 8, 6, 6],
        terbit: [10, 15, 18, 20, 25, 22, 28, 24, 20],
        subtitle: `Jan s.d. Sep ${selectedYear} (Per Status Konten)`,
      };
    } else if (selectedRange === "yearly") {
      return {
        categories: ["2023", "2024", "2025", "2026"],
        draft: [20, 30, 35, 40],
        siap: [40, 50, 60, 75],
        terjadwal: [30, 45, 55, 65],
        terbit: [90, 135, 170, 194],
        subtitle: "Tren Status Konten 4 Tahun Terakhir",
      };
    } else {
      // Setahun penuh
      return {
        categories: allMonths,
        draft: [3, 4, 2, 5, 4, 3, 6, 4, 5, 3, 4, 2],
        siap: [4, 5, 6, 7, 8, 6, 9, 7, 8, 6, 7, 5],
        terjadwal: [3, 4, 5, 6, 7, 5, 8, 6, 6, 4, 5, 4],
        terbit: [10, 15, 18, 20, 25, 22, 28, 24, 20, 18, 20, 22],
        subtitle: `Setahun Penuh ${selectedYear} (Per Status Konten)`,
      };
    }
  }, [selectedYear, selectedRange]);

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
            <option value="current">📍 Bulan Ini (Sep)</option>
            <option value="ytd">📆 Jan - Sep</option>
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
