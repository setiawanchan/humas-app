"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Dropdown } from "../ui/dropdown/Dropdown";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const router = useRouter();

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  function handleLogout() {
    closeDropdown();
    logout();
    router.push("/login");
  }

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "administrator":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "admin_humas":
        return "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300";
      case "pegawai":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "eksternal":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-3 text-gray-700 dark:text-gray-400 dropdown-toggle cursor-pointer hover:opacity-80 transition"
      >
        <span className="h-10 w-10 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-brand-500/20">
          {getInitials(currentUser?.nama)}
        </span>

        <div className="hidden md:flex flex-col text-left">
          <span className="block font-semibold text-sm text-gray-900 dark:text-white leading-tight">
            {currentUser?.nama || "User"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {currentUser?.role ? currentUser.role.replace("_", " ") : "Role"}
          </span>
        </div>

        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <span className="block font-semibold text-gray-900 text-sm dark:text-white truncate">
              {currentUser?.nama || "User"}
            </span>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getRoleBadge(
                currentUser?.role
              )}`}
            >
              {currentUser?.role}
            </span>
          </div>
          <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
            {currentUser?.email || "email@bps.go.id"}
          </span>
        </div>



        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Keluar / Logout
        </button>
      </Dropdown>
    </div>
  );
}
