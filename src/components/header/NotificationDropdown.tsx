"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { mockContentCalendar, mockUsers, ContentCalendarItem } from "@/lib/mock-data";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(true);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
    setNotifying(false);
  };

  // Filter 5 item konten mendatang yang belum terbit/selesai
  const upcomingAlerts = [...mockContentCalendar]
    .filter((item) => item.status !== "terbit" && item.status !== "selesai")
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .slice(0, 5);

  const getPicName = (picId: string) => {
    const user = mockUsers.find((u) => u.id === picId);
    return user ? user.nama : picId;
  };

  const getStatusBadge = (status: ContentCalendarItem["status"]) => {
    switch (status) {
      case "draft":
        return {
          label: "Draft",
          className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
        };
      case "siap":
        return {
          label: "Siap / Rencana",
          className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800",
        };
      case "terjadwal":
        return {
          label: "Terjadwal",
          className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
        };
      default:
        return {
          label: status,
          className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        };
    }
  };

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer"
        onClick={handleClick}
        title="Pengingat Deadline Konten"
      >
        {upcomingAlerts.length > 0 && notifying && (
          <span className="absolute right-0 top-0.5 z-10 h-3 w-3 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[380px] lg:right-0 z-50"
      >
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h5 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>📢</span> Pengingat Deadline Konten
            </h5>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {upcomingAlerts.length} konten perlu tindak lanjut
            </p>
          </div>
          <button
            onClick={toggleDropdown}
            className="text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-800">
          {upcomingAlerts.length === 0 ? (
            <li className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
              Tidak ada deadline postingan konten terdekat saat ini.
            </li>
          ) : (
            upcomingAlerts.map((item) => {
              const badge = getStatusBadge(item.status);
              return (
                <li key={item.id}>
                  <DropdownItem
                    onItemClick={closeDropdown}
                    href="/kalender-konten"
                    className="flex flex-col gap-1.5 p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 font-mono">
                        📅 {item.tanggal}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-gray-900 dark:text-white line-clamp-2">
                      {item.judul}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
                      <span className="uppercase font-semibold text-brand-600 dark:text-brand-400">
                        {item.platform}
                      </span>
                      <span>PIC: {getPicName(item.pic)}</span>
                    </div>
                  </DropdownItem>
                </li>
              );
            })
          )}
        </ul>

        <Link
          href="/kalender-konten"
          onClick={closeDropdown}
          className="block px-4 py-2.5 mt-3 text-xs font-bold text-center text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-900/60 cursor-pointer"
        >
          Buka Semua Kalender Konten →
        </Link>
      </Dropdown>
    </div>
  );
}
