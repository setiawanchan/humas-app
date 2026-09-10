"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { mockDocumentation, Documentation } from "@/lib/mock-data";
import { getDokumentasiFromSupabase } from "@/lib/supabase/kalender-service";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function DocumentationChart() {
  const currentRealDate = new Date();
  const currentRealYear = currentRealDate.getFullYear().toString();
  const currentRealMonthIdx = currentRealDate.getMonth();

  const [selectedYear, setSelectedYear] = useState<string>(currentRealYear);
  const [selectedRange, setSelectedRange] = useState<string>("current");
  const [items, setItems] = useState<Documentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const remote = await getDokumentasiFromSupabase();
        if (remote && remote.length > 0) {
          setItems(remote as Documentation[]);
        } else {
          setItems(mockDocumentation);
        }
      } catch (err) {
        console.error("Error fetching documentation for chart:", err);
        setItems(mockDocumentation);
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

  // Distribution calculation berbasis data riil
  const chartData = useMemo(() => {
    const targetYearNum = parseInt(selectedYear, 10);

    if (selectedRange === "current") {
      // 4 Minggu dalam Bulan Berjalan
      const targetMonthIdx =
        selectedYear === currentRealYear ? currentRealMonthIdx : 8; // fallback ke September jika beda tahun
      const monthName = fullMonthNames[targetMonthIdx];

      const weeklyData = [0, 0, 0, 0];

      items.forEach((item) => {
        if (!item.tanggal_kegiatan) return;
        const d = new Date(item.tanggal_kegiatan);
        if (isNaN(d.getTime())) return;
        if (d.getFullYear() === targetYearNum && d.getMonth() === targetMonthIdx) {
          const dateNum = d.getDate();
          const weekIdx = Math.min(Math.floor((dateNum - 1) / 7), 3);
          weeklyData[weekIdx]++;
        }
      });

      return {
        categories: ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"],
        data: weeklyData,
        subtitle: `${monthName} ${selectedYear} (Per Minggu)`,
      };
    } else if (selectedRange === "ytd") {
      // Jan s.d. Bulan Berjalan
      const endMonthIdx =
        selectedYear === currentRealYear ? currentRealMonthIdx : 8;
      const categories = allMonths.slice(0, endMonthIdx + 1);
      const monthlyData = new Array(categories.length).fill(0);

      items.forEach((item) => {
        if (!item.tanggal_kegiatan) return;
        const d = new Date(item.tanggal_kegiatan);
        if (isNaN(d.getTime())) return;
        if (d.getFullYear() === targetYearNum && d.getMonth() <= endMonthIdx) {
          monthlyData[d.getMonth()]++;
        }
      });

      return {
        categories,
        data: monthlyData,
        subtitle: `Jan s.d. ${allMonths[endMonthIdx]} ${selectedYear}`,
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
      const yearlyData = [0, 0, 0, 0];

      items.forEach((item) => {
        if (!item.tanggal_kegiatan) return;
        const d = new Date(item.tanggal_kegiatan);
        if (isNaN(d.getTime())) return;
        const yStr = d.getFullYear().toString();
        const yIdx = categories.indexOf(yStr);
        if (yIdx !== -1) {
          yearlyData[yIdx]++;
        }
      });

      return {
        categories,
        data: yearlyData,
        subtitle: `Tren 4 Tahun Terakhir (${categories[0]} - ${categories[3]})`,
      };
    } else {
      // Setahun Penuh (12 Bulan)
      const fullYearData = new Array(12).fill(0);

      items.forEach((item) => {
        if (!item.tanggal_kegiatan) return;
        const d = new Date(item.tanggal_kegiatan);
        if (isNaN(d.getTime())) return;
        if (d.getFullYear() === targetYearNum) {
          fullYearData[d.getMonth()]++;
        }
      });

      return {
        categories: allMonths,
        data: fullYearData,
        subtitle: `Setahun Penuh (${selectedYear})`,
      };
    }
  }, [items, selectedYear, selectedRange, currentRealYear, currentRealMonthIdx]);


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
