import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function OverviewContent() {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("name, role")
    .single();

  const { count: totalKaryawan } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .is("deleted_at", null);

  const { count: totalDivisi } = await supabase
    .from("divisions")
    .select("*", { count: "exact", head: true });

  const { data: latestSchedule } = await supabase
    .from("schedules")
    .select("year, month, is_published, generated_at")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)
    .single();

  const MONTHS = [
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

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Selamat datang kembali, <strong>{profile?.name}</strong> 👋
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {[
          {
            icon: "👥",
            label: "Total Karyawan",
            value: totalKaryawan ?? 0,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            icon: "🏢",
            label: "Divisi",
            value: totalDivisi ?? 0,
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
          {
            icon: "📅",
            label: "Jadwal Aktif",
            value: latestSchedule
              ? `${MONTHS[latestSchedule.month - 1]} ${latestSchedule.year}`
              : "—",
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            icon: "📢",
            label: "Status",
            value: latestSchedule?.is_published ? "Published" : "Draft",
            color: latestSchedule?.is_published
              ? "text-emerald-600"
              : "text-amber-600",
            bg: latestSchedule?.is_published ? "bg-emerald-50" : "bg-amber-50",
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
          >
            <div
              className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center text-lg mb-3`}
            >
              {card.icon}
            </div>
            <div className={`text-2xl font-extrabold ${card.color}`}>
              {card.value}
            </div>
            <div className="text-xs text-gray-400 mt-1 font-medium">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
          Menu Cepat
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              href: "/dashboard/karyawan",
              icon: "👥",
              label: "Kelola Karyawan",
            },
            { href: "/dashboard/jadwal", icon: "📅", label: "Lihat Kalender" },
            { href: "/dashboard/tabel", icon: "📋", label: "Tabel Shift" },
            { href: "/dashboard/statistik", icon: "📈", label: "Statistik" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors group"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-semibold text-gray-600 group-hover:text-blue-600 text-center">
                {item.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-gray-400 text-sm">Loading...</p>}>
      <OverviewContent />
    </Suspense>
  );
}
