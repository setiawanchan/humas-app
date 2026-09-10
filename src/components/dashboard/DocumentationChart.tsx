"use client";

import React, { useState, useMemo } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { mockDocumentation } from "@/lib/mock-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function DocumentationChart() {
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

  const chartData = useMemo(() => {
    const fullYearDoc = [12, 18, 15, 22, 28, 24, 30, 25, mockDocumentation.length + 15, 14, 16, 20];

    if (selectedRange === "current") {
      return {
        categories: ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"],
        data: [5, 8, 4, mockDocumentation.length],
        subtitle: `September ${selectedYear} (Bulan Berjalan)`,
      };
    } else if (selectedRange === "ytd") {
      return {
        categories: allMonths.slice(0, 9),
        data: fullYearDoc.slice(0, 9),
        subtitle: `Jan s.d. Sep ${selectedYear}`,
      };
    } else if (selectedRange === "yearly") {
      return {
        categories: ["2023", "2024", "2025", "2026"],
        data: [142, 198, 245, mockDocumentation.length + 250],
        subtitle: "Tren 4 Tahun Terakhir (2023 - 2026)",
      };
    } else {
      return {
        categories: allMonths,
        data: fullYearDoc,
        subtitle: `Setahun Penuh (${selectedYear})`,
      };
    }
  }, [selectedYear, selectedRange]);

  const totalItem = chartData.data.reduce((a, b) => a + b, 0);

  const options: ApexOptions = {
    colors: ["#f97316"], // Brand Orange BPS
    chart: {
      fontFamily: "Outfit, Inter, sans-serif",
      type: "bar",
      height: 280,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "40%",
        borderRadius: 6,
        borderRadiusApplication: "end",
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "11px",
        fontWeight: "bold",
        colors: ["#ea580c"],
      },
      offsetY: -18,
    },
    stroke: {
      show: true,
      width: 2,
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
          fontSize: "11px",
          fontWeight: 600,
        },
      },
      crosshairs: {
        show: true,
        width: 1,
        stroke: {
          color: "#f97316",
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
      x: {
        show: true,
      },
      y: {
        formatter: (val: number) => `${val} Dokumentasi`,
      },
    },
  };

  const series = [
    {
      name: "Dokumentasi Kegiatan",
      data: chartData.data,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">📸</span>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Statistik Dokumentasi Kegiatan
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

      {/* Counter Summary */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          <span className="text-gray-500 dark:text-gray-400 text-[11px]">Total Dokumentasi:</span>
          <strong className="text-gray-900 dark:text-white font-bold text-sm">{totalItem} File</strong>
        </div>
        <span className="text-[10px] text-gray-400">💡 Hover untuk crosshairs</span>
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
