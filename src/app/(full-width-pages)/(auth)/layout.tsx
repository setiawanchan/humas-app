import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col  dark:bg-gray-900 sm:p-0">
          {children}
          <div className="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
            <div className="relative items-center justify-center  flex z-1">
              {/* <!-- ===== Common Grid Shape Start ===== --> */}
              <GridShape />
              <div className="flex flex-col items-center max-w-xs text-center">
                <Link href="/" className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/30">
                    BPS
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-white text-lg leading-tight">
                      Humas BPS
                    </span>
                    <span className="text-xs text-brand-300 font-medium">
                      Kabupaten Lebak
                    </span>
                  </div>
                </Link>
                <p className="text-center text-gray-400 dark:text-white/60 text-sm">
                  Sistem Manajemen Hubungan Masyarakat Internal BPS Kabupaten Lebak
                </p>
              </div>
            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
