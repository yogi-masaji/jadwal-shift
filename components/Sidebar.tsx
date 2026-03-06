"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "📊", label: "Overview" },
  { href: "/dashboard/karyawan", icon: "👥", label: "Karyawan" },
  { href: "/dashboard/jadwal", icon: "📅", label: "Kalender" },
  { href: "/dashboard/tabel", icon: "📋", label: "Tabel Shift" },
  { href: "/dashboard/statistik", icon: "📈", label: "Statistik" },
];

interface SidebarProps {
  userName: string;
  userRole: string;
}

function NavContent({
  userName,
  userRole,
  onClose,
}: SidebarProps & { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold tracking-[3px] text-blue-600 uppercase mb-0.5">
            Working Schedule
          </p>
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent leading-tight">
            Meat Dept.
          </h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`
                flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors
                border-l-[3px]
                ${
                  isActive
                    ? "bg-blue-50 text-blue-600 border-blue-600"
                    : "text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700"
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {userName?.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-gray-800 truncate">
              {userName}
            </p>
            <p className="text-[10px] text-gray-400 capitalize">{userRole}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full py-2 text-xs font-semibold text-red-500 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition cursor-pointer"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ userName, userRole }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-56 bg-white border-r border-gray-200 shrink-0 sticky top-0 h-screen overflow-y-auto shadow-[2px_0_8px_rgba(0,0,0,0.04)] flex-col">
        <NavContent userName={userName} userRole={userRole} />
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14 shadow-sm">
        <div>
          <p className="text-[8px] font-bold tracking-[2px] text-blue-600 uppercase leading-none mb-0.5">
            Working Schedule
          </p>
          <p className="text-sm font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent leading-none">
            Meat Dept.
          </p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 cursor-pointer"
        >
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="2" y1="5" x2="16" y2="5" />
            <line x1="2" y1="9" x2="16" y2="9" />
            <line x1="2" y1="13" x2="16" y2="13" />
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`
        lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-2xl
        transform transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <NavContent
          userName={userName}
          userRole={userRole}
          onClose={() => setMobileOpen(false)}
        />
      </div>
    </>
  );
}
