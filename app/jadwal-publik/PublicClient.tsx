"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────
type ShiftCode = {
  code: string;
  label: string;
  color_bg: string;
  color_text: string;
  category: string;
  start_time: string | null;
  end_time: string | null;
};

type Detail = {
  employee_id: string;
  date: string;
  shift_codes: ShiftCode | null;
  employees: {
    name: string;
    employee_number: string;
    divisions: { name: string } | null;
    employee_types: { label: string; code: string } | null;
  } | null;
};

type ScheduleMeta = {
  id: string;
  year: number;
  month: number;
  is_published: boolean;
  generated_at: string;
} | null;

interface Props {
  year: number;
  month: number;
  schedule: ScheduleMeta;
  details: Detail[];
  shiftCodes: ShiftCode[];
  allSchedules: { year: number; month: number }[];
}

// ── Constants ──────────────────────────────────────────────
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
const DAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const CATEGORY_META = {
  pagi: { label: "Pagi", icon: "🌅", color: "#0369A1" },
  siang: { label: "Siang", icon: "☀️", color: "#D97706" },
  malam: { label: "Malam", icon: "🌙", color: "#7C3AED" },
  libur: { label: "Libur", icon: "😴", color: "rgb(165,0,0)" },
  cuti: { label: "Cuti", icon: "✈️", color: "#B45309" },
};
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  tetap: { bg: "bg-blue-50", text: "text-blue-600" },
  kontrak: { bg: "bg-amber-50", text: "text-amber-600" },
  magang: { bg: "bg-emerald-50", text: "text-emerald-600" },
  ppm: { bg: "bg-violet-50", text: "text-violet-600" },
  kelas_industri: { bg: "bg-pink-50", text: "text-pink-600" },
  pkl: { bg: "bg-orange-50", text: "text-orange-600" },
  promotor: { bg: "bg-red-50", text: "text-red-500" },
};

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function getFirstDay(y: number, m: number) {
  return new Date(y, m, 1).getDay();
}
function isWeekend(y: number, m: number, d: number) {
  const day = new Date(y, m, d).getDay();
  return day === 0 || day === 6;
}

// ── Main Component ─────────────────────────────────────────
export default function PublicClient({
  year,
  month,
  schedule,
  details,
  shiftCodes,
  allSchedules,
}: Props) {
  const router = useRouter();
  const today = new Date();
  const [tab, setTab] = useState<"kalender" | "tabel" | "statistik">(
    "kalender",
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filterDiv, setFilterDiv] = useState("ALL");
  const [filterCat, setFilterCat] = useState("all");
  const [copied, setCopied] = useState(false);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);

  // ── Data maps ──
  const shiftMap = useMemo(() => {
    const m: Record<string, ShiftCode> = {};
    shiftCodes.forEach((s) => {
      m[s.code] = s;
    });
    return m;
  }, [shiftCodes]);

  // Unique employees
  const employees = useMemo(() => {
    const seen = new Set<string>();
    const list: NonNullable<Detail["employees"]>[] = [];
    details.forEach((d) => {
      if (d.employees && !seen.has(d.employee_id)) {
        seen.add(d.employee_id);
        list.push(d.employees);
      }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [details]);

  // schedule[empName][day] = shiftCode
  const schedMap = useMemo(() => {
    const m: Record<string, Record<number, ShiftCode | null>> = {};
    details.forEach((d) => {
      const name = d.employees?.name;
      if (!name) return;
      if (!m[name]) m[name] = {};
      const day = new Date(d.date).getDate();
      m[name][day] = d.shift_codes ?? null;
    });
    return m;
  }, [details]);

  const divisions = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => {
      if (e.divisions?.name) s.add(e.divisions.name);
    });
    return Array.from(s).sort();
  }, [employees]);

  // ── Copy share link ──
  function handleCopy() {
    const url = `${window.location.origin}/jadwal-publik?year=${year}&month=${month + 1}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Navigate month ──
  function navigate(y: number, m: number) {
    router.push(`/jadwal-publik?year=${y}&month=${m + 1}`);
    setSelectedDay(null);
  }

  function prevMonth() {
    const d = new Date(year, month - 1);
    navigate(d.getFullYear(), d.getMonth());
  }
  function nextMonth() {
    const d = new Date(year, month + 1);
    navigate(d.getFullYear(), d.getMonth());
  }

  const hasPrev = allSchedules.some((s) => {
    const d = new Date(year, month - 1);
    return s.year === d.getFullYear() && s.month === d.getMonth() + 1;
  });
  const hasNext = allSchedules.some((s) => {
    const d = new Date(year, month + 1);
    return s.year === d.getFullYear() && s.month === d.getMonth() + 1;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans">
      {/* ── Top Nav ── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold tracking-[3px] text-blue-600 uppercase leading-none">
              Working Schedule
            </p>
            <p className="text-sm font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent leading-tight">
              Meat Dept.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy link */}
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer
                ${copied ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}
            >
              {copied ? "✓ Tersalin!" : "🔗 Salin Link"}
            </button>

            {/* Login link */}
            <a
              href="/login"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:opacity-90 transition"
            >
              Login
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* ── Month nav + tabs ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          {/* Month navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              disabled={!hasPrev}
              className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
            >
              ‹
            </button>
            <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-xl">
              <span className="text-sm font-extrabold text-gray-900">
                {MONTHS[month]} {year}
              </span>
            </div>
            <button
              onClick={nextMonth}
              disabled={!hasNext}
              className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
            >
              ›
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {(
              [
                { id: "kalender", icon: "📅", label: "Kalender" },
                { id: "tabel", icon: "📋", label: "Tabel" },
                { id: "statistik", icon: "📊", label: "Statistik" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1
                  ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── No schedule ── */}
        {!schedule && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📅</div>
            <p className="text-base font-bold text-gray-600">
              Jadwal {MONTHS[month]} {year} belum tersedia
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Jadwal belum dipublish oleh admin.
            </p>
            {allSchedules.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                <p className="w-full text-xs text-gray-400 mb-1">
                  Jadwal tersedia:
                </p>
                {allSchedules.map((s) => (
                  <button
                    key={`${s.year}-${s.month}`}
                    onClick={() => navigate(s.year, s.month - 1)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 cursor-pointer transition"
                  >
                    {MONTHS[s.month - 1]} {s.year}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: KALENDER
        ══════════════════════════════════════════════ */}
        {schedule && tab === "kalender" && (
          <>
            {/* Category filter */}
            <div className="flex gap-1.5 flex-wrap mb-4">
              {[
                { id: "all", label: "Semua", icon: "📋" },
                ...Object.entries(CATEGORY_META).map(([k, v]) => ({
                  id: k,
                  label: v.label,
                  icon: v.icon,
                })),
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterCat(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer
                    ${filterCat === f.id ? "bg-blue-50 text-blue-600 border-blue-300" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
                >
                  {f.icon} {f.label}
                </button>
              ))}
            </div>

            <div className="flex gap-4 items-start">
              {/* Calendar grid */}
              <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                  {DAYS_SHORT.map((d, i) => (
                    <div
                      key={d}
                      className={`py-3 text-center text-[10px] font-extrabold tracking-widest uppercase
                      ${i === 0 || i === 6 ? "text-red-500" : "text-gray-400"}`}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div
                      key={`e${i}`}
                      className="min-h-[80px] border-r border-b border-gray-100 bg-gray-50/50"
                    />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const day = idx + 1;
                    const wknd = isWeekend(year, month, day);
                    const isToday =
                      today.getFullYear() === year &&
                      today.getMonth() === month &&
                      today.getDate() === day;
                    const isSel = selectedDay === day;

                    const dayEntries = employees
                      .map((e) => ({
                        name: e.name,
                        sc: schedMap[e.name]?.[day] ?? null,
                      }))
                      .filter(
                        (e) =>
                          e.sc &&
                          (filterCat === "all" || e.sc.category === filterCat),
                      );

                    const workCount = employees.filter((e) => {
                      const sc = schedMap[e.name]?.[day];
                      return (
                        sc?.category !== "libur" &&
                        sc?.category !== "cuti" &&
                        sc !== null &&
                        sc !== undefined
                      );
                    }).length;

                    return (
                      <div
                        key={day}
                        onClick={() => setSelectedDay(isSel ? null : day)}
                        className={`min-h-[80px] p-1.5 border-r border-b border-gray-100 cursor-pointer transition-colors
                          ${
                            isSel
                              ? "bg-blue-50 outline outline-2 outline-blue-500 outline-offset-[-2px]"
                              : wknd
                                ? "bg-red-50/40 hover:bg-red-50"
                                : "bg-white hover:bg-gray-50"
                          }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold
                            ${
                              isToday
                                ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white"
                                : wknd
                                  ? "text-red-500"
                                  : "text-gray-700"
                            }`}
                          >
                            {day}
                          </div>
                          {workCount > 0 && (
                            <span className="text-[8px] font-bold text-gray-400">
                              {workCount}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-[2px]">
                          {dayEntries.slice(0, 3).map((e, i) => (
                            <div
                              key={i}
                              className="text-[8px] font-bold px-1 py-[1px] rounded flex items-center gap-1 overflow-hidden"
                              style={{
                                background: e.sc!.color_bg,
                                color: e.sc!.color_text,
                              }}
                            >
                              <span className="font-mono shrink-0">
                                {e.sc!.code}
                              </span>
                              <span className="truncate hidden sm:block">
                                {e.name.split(" ")[0]}
                              </span>
                            </div>
                          ))}
                          {dayEntries.length > 3 && (
                            <span className="text-[8px] text-gray-400 pl-1">
                              +{dayEntries.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Side detail panel */}
              {selectedDay && (
                <div
                  className="w-68 shrink-0 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto hidden md:block"
                  style={{ width: 272 }}
                >
                  <div className="bg-blue-50 border-b border-blue-100 px-4 py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-blue-600 mb-0.5">
                          {
                            DAYS_SHORT[
                              new Date(year, month, selectedDay).getDay()
                            ]
                          }
                          {isWeekend(year, month, selectedDay) && (
                            <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                              Weekend
                            </span>
                          )}
                        </p>
                        <p className="text-3xl font-extrabold text-gray-900 leading-none">
                          {selectedDay}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {MONTHS[month]} {year}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedDay(null)}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 cursor-pointer text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    {/* Summary */}
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {Object.entries(CATEGORY_META).map(([cat, meta]) => {
                        const count = employees.filter(
                          (e) =>
                            schedMap[e.name]?.[selectedDay]?.category === cat,
                        ).length;
                        if (!count) return null;
                        return (
                          <span
                            key={cat}
                            className="text-[10px] font-bold px-2 py-1 rounded-full"
                            style={{
                              background:
                                cat === "libur" ? "rgb(165,0,0)" : "#fff",
                              color:
                                cat === "libur"
                                  ? "#fff"
                                  : (
                                      CATEGORY_META as Record<
                                        string,
                                        { color: string }
                                      >
                                    )[cat].color,
                              border: `1px solid ${cat === "libur" ? "rgb(165,0,0)" : "#E5E7EB"}`,
                            }}
                          >
                            {meta.icon} {count}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="px-4 py-4 flex flex-col gap-4">
                    {(
                      Object.entries(CATEGORY_META) as [
                        string,
                        { label: string; icon: string; color: string },
                      ][]
                    ).map(([cat, meta]) => {
                      const catEmps = employees.filter(
                        (e) =>
                          schedMap[e.name]?.[selectedDay]?.category === cat,
                      );
                      if (!catEmps.length) return null;
                      return (
                        <div key={cat}>
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-0.5 h-4 rounded-full"
                              style={{
                                background:
                                  cat === "libur" ? "rgb(165,0,0)" : meta.color,
                              }}
                            />
                            <span
                              className="text-[10px] font-extrabold uppercase tracking-widest"
                              style={{
                                color:
                                  cat === "libur" ? "rgb(165,0,0)" : meta.color,
                              }}
                            >
                              {meta.icon} {meta.label}
                            </span>
                            <span className="text-[10px] text-gray-400 ml-auto">
                              {catEmps.length}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {catEmps.map((emp, i) => {
                              const sc = schedMap[emp.name]?.[selectedDay];
                              const tc = TYPE_COLORS[
                                emp.employee_types?.code ?? ""
                              ] ?? { bg: "bg-gray-100", text: "text-gray-500" };
                              return (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100"
                                >
                                  <div
                                    className={`w-7 h-7 rounded-lg ${tc.bg} flex items-center justify-center text-xs font-bold ${tc.text} shrink-0`}
                                  >
                                    {emp.name.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-800 truncate">
                                      {emp.name}
                                    </p>
                                    <p className="text-[9px] text-gray-400">
                                      {emp.divisions?.name}
                                    </p>
                                  </div>
                                  {sc && (
                                    <span
                                      className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg shrink-0"
                                      style={{
                                        background: sc.color_bg,
                                        color: sc.color_text,
                                      }}
                                    >
                                      {sc.code}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════
            TAB: TABEL
        ══════════════════════════════════════════════ */}
        {schedule && tab === "tabel" && (
          <div>
            {/* Division filter */}
            <div className="flex gap-1.5 flex-wrap mb-4">
              {["ALL", ...divisions].map((d) => (
                <button
                  key={d}
                  onClick={() => setFilterDiv(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer
                    ${filterDiv === d ? "bg-blue-50 text-blue-600 border-blue-300" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
                >
                  {d === "ALL" ? "Semua" : d}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
              <table className="border-collapse w-full text-[10px] bg-white">
                <thead>
                  <tr className="bg-gray-50">
                    <td className="py-3 px-4 font-extrabold text-gray-500 sticky left-0 bg-gray-50 z-10 min-w-[160px] border-b border-r border-gray-200">
                      Nama
                    </td>
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const d = i + 1;
                      const wknd = isWeekend(year, month, d);
                      const isT =
                        today.getFullYear() === year &&
                        today.getMonth() === month &&
                        today.getDate() === d;
                      return (
                        <td
                          key={d}
                          className={`py-2 px-1 text-center font-bold border-b border-gray-200 min-w-[30px]
                          ${wknd ? "bg-red-50 text-red-500" : "text-gray-400"}
                          ${isT ? "bg-blue-50" : ""}`}
                        >
                          <div
                            className={`${isT ? "font-extrabold text-blue-600" : ""}`}
                          >
                            {d}
                          </div>
                          <div className="text-[7px] opacity-60">
                            {DAYS_SHORT[new Date(year, month, d).getDay()]}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees
                    .filter(
                      (e) =>
                        filterDiv === "ALL" || e.divisions?.name === filterDiv,
                    )
                    .map((emp, ei) => (
                      <tr
                        key={ei}
                        className={ei % 2 === 0 ? "bg-white" : "bg-gray-50/60"}
                      >
                        <td
                          className={`py-2 px-4 sticky left-0 z-10 border-r border-gray-200 ${ei % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                        >
                          <div className="font-bold text-[11px] text-gray-900 truncate max-w-[140px]">
                            {emp.name}
                          </div>
                          <div className="text-[9px] text-gray-400">
                            {emp.divisions?.name}
                          </div>
                        </td>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const sc = schedMap[emp.name]?.[day];
                          const wknd = isWeekend(year, month, day);
                          return (
                            <td
                              key={day}
                              className={`px-[2px] py-[3px] text-center ${wknd ? "bg-red-50/40" : ""}`}
                            >
                              {sc ? (
                                <span
                                  className="inline-block px-1 py-[2px] rounded font-mono font-extrabold text-[9px]"
                                  style={{
                                    background: sc.color_bg,
                                    color: sc.color_text,
                                  }}
                                >
                                  {sc.code}
                                </span>
                              ) : (
                                <span className="text-gray-200 text-[9px]">
                                  –
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-5 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">
                Legenda Kode Shift
              </p>
              <div className="flex flex-wrap gap-2">
                {shiftCodes.map((s) => (
                  <div
                    key={s.code}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-100"
                    style={{ background: s.color_bg }}
                  >
                    <span
                      className="font-mono font-extrabold text-[10px]"
                      style={{ color: s.color_text }}
                    >
                      {s.code}
                    </span>
                    <span
                      className="text-[9px]"
                      style={{ color: s.color_text, opacity: 0.8 }}
                    >
                      {s.start_time && s.end_time
                        ? `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`
                        : s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: STATISTIK
        ══════════════════════════════════════════════ */}
        {schedule && tab === "statistik" && (
          <div>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                {
                  icon: "👥",
                  label: "Total Karyawan",
                  value: employees.length,
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  icon: "📅",
                  label: "Hari Periode",
                  value: daysInMonth,
                  color: "text-violet-600",
                  bg: "bg-violet-50",
                },
                {
                  icon: "🏢",
                  label: "Divisi",
                  value: divisions.length,
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
                {
                  icon: "📢",
                  label: "Status",
                  value: "Published",
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
              ].map((c, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
                >
                  <div
                    className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center text-lg mb-2`}
                  >
                    {c.icon}
                  </div>
                  <div className={`text-2xl font-extrabold ${c.color}`}>
                    {c.value}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>

            {/* Division filter */}
            <div className="flex gap-1.5 flex-wrap mb-4">
              {["ALL", ...divisions].map((d) => (
                <button
                  key={d}
                  onClick={() => setFilterDiv(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer
                    ${filterDiv === d ? "bg-blue-50 text-blue-600 border-blue-300" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
                >
                  {d === "ALL" ? "Semua" : d}
                </button>
              ))}
            </div>

            {/* Per-employee stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {employees
                .filter(
                  (e) => filterDiv === "ALL" || e.divisions?.name === filterDiv,
                )
                .map((emp, i) => {
                  const empSchedule = schedMap[emp.name] ?? {};
                  const shiftCounts: Record<string, number> = {};
                  let totalWork = 0,
                    totalLibur = 0;
                  Object.values(empSchedule).forEach((sc) => {
                    if (!sc) return;
                    shiftCounts[sc.code] = (shiftCounts[sc.code] ?? 0) + 1;
                    if (sc.category === "libur") totalLibur++;
                    else totalWork++;
                  });
                  const topShifts = Object.entries(shiftCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                  const tc = TYPE_COLORS[emp.employee_types?.code ?? ""] ?? {
                    bg: "bg-gray-100",
                    text: "text-gray-500",
                  };

                  return (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl ${tc.bg} flex items-center justify-center text-sm font-extrabold ${tc.text} shrink-0`}
                        >
                          {emp.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {emp.name}
                          </p>
                          <p className={`text-[10px] font-semibold ${tc.text}`}>
                            {emp.employee_types?.label} · {emp.divisions?.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mb-3">
                        <div className="flex-1 bg-blue-50 rounded-xl p-2.5 text-center border border-blue-100">
                          <div className="text-xl font-extrabold text-blue-600">
                            {totalWork}
                          </div>
                          <div className="text-[8px] text-blue-400 uppercase tracking-wide font-bold">
                            Kerja
                          </div>
                        </div>
                        <div className="flex-1 bg-red-50 rounded-xl p-2.5 text-center border border-red-100">
                          <div className="text-xl font-extrabold text-red-600">
                            {totalLibur}
                          </div>
                          <div className="text-[8px] text-red-400 uppercase tracking-wide font-bold">
                            Libur
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {topShifts.map(([code, count]) => {
                          const sc = shiftMap[code];
                          if (!sc) return null;
                          return (
                            <span
                              key={code}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold border border-gray-100"
                              style={{
                                background: sc.color_bg,
                                color: sc.color_text,
                              }}
                            >
                              <span className="font-mono">{code}</span>
                              <span style={{ opacity: 0.7 }}>×{count}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-200 mt-8">
        Meat Department Working Schedule · {year}
      </footer>
    </div>
  );
}
