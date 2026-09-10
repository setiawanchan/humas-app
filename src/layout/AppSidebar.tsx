"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import {
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  UserCircleIcon,
  BoxCubeIcon,
  FolderIcon,
} from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
  rolesAllowed?: string[]; // undefined means all roles allowed
};

export default function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { currentUser } = useAuth();
  const pathname = usePathname();

  const mainNavItems: NavItem[] = [
    {
      name: "Dashboard",
      icon: <GridIcon />,
      path: "/",
    },
    {
      name: "Dokumentasi",
      icon: <BoxCubeIcon />,
      path: "/dokumentasi",
    },
    {
      name: "Arsip",
      icon: <FolderIcon />,
      path: "/arsip",
    },
    {
      name: "Kalender Konten",
      icon: <CalenderIcon />,
      path: "/kalender-konten",
    },
    {
      name: "Admin",
      icon: <UserCircleIcon />,
      rolesAllowed: ["administrator"],
      subItems: [
        { name: "Manajemen User", path: "/admin/users" },
        { name: "Manajemen Halaman & Akses", path: "/admin/halaman-akses" },
        { name: "Integrasi Google Drive", path: "/admin/google-drive" },
      ],
    },
  ];

  // Filter navigation items by role
  const filteredNavItems = mainNavItems.filter((item) => {
    if (!item.rolesAllowed) return true;
    if (!currentUser) return false;
    return item.rolesAllowed.includes(currentUser.role);
  });

  const [openSubmenu, setOpenSubmenu] = useState<string | null>(() => {
    if (typeof window !== "undefined" && pathname.startsWith("/admin")) {
      return "Admin";
    }
    return null;
  });

  const isActive = useCallback(
    (path?: string) => (path ? pathname === path || (path !== "/" && pathname.startsWith(path)) : false),
    [pathname]
  );

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      setOpenSubmenu("Admin");
    }
  }, [pathname]);

  const handleSubmenuToggle = (name: string) => {
    setOpenSubmenu((prev) => (prev === name ? null : name));
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-4 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand Header */}
      <div
        className={`py-6 flex items-center border-b border-gray-100 dark:border-gray-800 px-2 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start gap-3"
        }`}
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 min-w-10 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/30">
            BPS
          </div>
          {(isExpanded || isHovered || isMobileOpen) && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-gray-900 dark:text-white text-base leading-tight truncate">
                Humas BPS
              </span>
              <span className="text-xs text-brand-600 dark:text-brand-400 font-medium truncate">
                Kabupaten Lebak
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation List */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar mt-4">
        <nav className="mb-6">
          <div className="flex flex-col gap-2">
            <h2
              className={`mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 ${
                !isExpanded && !isHovered ? "lg:justify-center flex" : ""
              }`}
            >
              {isExpanded || isHovered || isMobileOpen ? (
                "Navigasi Utama"
              ) : (
                <HorizontaLDots />
              )}
            </h2>

            <ul className="flex flex-col gap-1.5">
              {filteredNavItems.map((nav, index) => (
                <li key={nav.name}>
                  {nav.subItems ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => handleSubmenuToggle(nav.name)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition cursor-pointer ${
                          openSubmenu === nav.name
                            ? "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400"
                            : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                        } ${
                          !isExpanded && !isHovered
                            ? "lg:justify-center"
                            : "lg:justify-start"
                        }`}
                      >
                        <span className="w-5 h-5 flex items-center justify-center">
                          {nav.icon}
                        </span>
                        {(isExpanded || isHovered || isMobileOpen) && (
                          <span className="flex-1 text-left">{nav.name}</span>
                        )}
                        {(isExpanded || isHovered || isMobileOpen) && (
                          <ChevronDownIcon
                            className={`w-4 h-4 transition-transform duration-200 ${
                              openSubmenu === nav.name ? "rotate-180 text-brand-500" : ""
                            }`}
                          />
                        )}
                      </button>

                      {(isExpanded || isHovered || isMobileOpen) && openSubmenu === nav.name && (
                        <div className="overflow-hidden transition-all duration-300">
                          <ul className="mt-1 space-y-1 ml-9">
                            {nav.subItems.map((sub) => (
                              <li key={sub.name}>
                                <Link
                                  href={sub.path}
                                  className={`block px-3 py-2 text-xs rounded-lg transition font-medium ${
                                    isActive(sub.path)
                                      ? "bg-brand-500 text-white shadow-sm"
                                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                                  }`}
                                >
                                  {sub.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    nav.path && (
                      <Link
                        href={nav.path}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${
                          isActive(nav.path)
                            ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                            : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                        } ${
                          !isExpanded && !isHovered
                            ? "lg:justify-center"
                            : "lg:justify-start"
                        }`}
                      >
                        <span className="w-5 h-5 flex items-center justify-center">
                          {nav.icon}
                        </span>
                        {(isExpanded || isHovered || isMobileOpen) && (
                          <span>{nav.name}</span>
                        )}
                      </Link>
                    )
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
}
