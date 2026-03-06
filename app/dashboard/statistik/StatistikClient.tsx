"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type ShiftCode = {
  id: number;
  code: string;
  label: string;
  color_bg: string;
  color_text: string;
  category: string;
  is_work_shift: boolean;
};
type Schedule = {
  id: string;
  year: number;
  month: number;
  is_published: boolean;
};
type Division = { id: number; name: string };
type DetailRow = {
  employee_id: string;
  date: string;
  shift_codes: {
    code: string;
    category: string;
    color_bg: string;
    color_text: string;
    is_work_shift: boolean;
  } | null;
  employees: {
    name: string;
    divisions: { name: string } | null;
    employee_types: { label: string; code: string } | null;
  } | null;
};

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
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  tetap: { bg: "bg-blue-50", text: "text-blue-600" },
  kontrak: { bg: "bg-amber-50", text: "text-amber-600" },
  magang: { bg: "bg-emerald-50", text: "text-emerald-600" },
  ppm: { bg: "bg-violet-50", text: "text-violet-600" },
  kelas_industri: { bg: "bg-pink-50", text: "text-pink-600" },
  pkl: { bg: "bg-orange-50", text: "text-orange-600" },
  promotor: { bg: "bg-red-50", text: "text-red-500" },
};

interface Props {
  schedules: Schedule[];
  shiftCodes: ShiftCode[];
  divisions: Division[];
}

export default function StatistikClient({
  schedules,
  shiftCodes,
  divisions,
}: Props) {
  const supabase = createClient();

  const [selectedSched, setSelectedSched] = useState<Schedule | null>(
    schedules[0] ?? null,
  );
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [filterDiv, setFilterDiv] = useState("ALL");

  async function loadSchedule(sched: Schedule) {
    if (loaded === sched.id) return;
    setLoading(true);
    setSelectedSched(sched);

    const { data } = await supabase
      .from("schedule_details")
      .select(
        `
        employee_id, date,
        shift_codes ( code, category, color_bg, color_text, is_work_shift ),
        employees ( name, divisions ( name ), employee_types ( label, code ) )
      `,
      )
      .eq("schedule_id", sched.id);

    setDetails((data as DetailRow[]) ?? []);
    setLoaded(sched.id);
    setLoading(false);
  }

  const shiftMap = useMemo(() => {
    const m: Record<string, ShiftCode> = {};
    shiftCodes.forEach((s) => {
      m[s.code] = s;
    });
    return m;
  }, [shiftCodes]);

  // unique employees
  const employees = useMemo(() => {
    const seen = new Set<string>();
    const list: NonNullable<DetailRow["employees"]>[] = [];
    details.forEach((d) => {
      if (d.employees && !seen.has(d.employee_id)) {
        seen.add(d.employee_id);
        list.push(d.employees);
      }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [details]);

  // per-employee stats
  const empStats = useMemo(() => {
    const m: Record<
      string,
      {
        work: number;
        libur: number;
        cuti: number;
        shifts: Record<string, number>;
      }
    > = {};
    details.forEach((d) => {
      const name = d.employees?.name;
      if (!name || !d.shift_codes) return;
      if (!m[name]) m[name] = { work: 0, libur: 0, cuti: 0, shifts: {} };
      const sc = d.shift_codes;
      m[name].shifts[sc.code] = (m[name].shifts[sc.code] ?? 0) + 1;
      if (sc.category === "libur") m[name].libur++;
      else if (sc.category === "cuti") m[name].cuti++;
      else if (sc.is_work_shift) m[name].work++;
    });
    return m;
  }, [details]);

  // overall stats
  const totalWork = Object.values(empStats).reduce((a, e) => a + e.work, 0);
  const totalLibur = Object.values(empStats).reduce((a, e) => a + e.libur, 0);

  // shift distribution
  const shiftDist = useMemo(() => {
    const m: Record<string, number> = {};
    details.forEach((d) => {
      const code = d.shift_codes?.code;
      if (code) m[code] = (m[code] ?? 0) + 1;
    });
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [details]);

  const filteredEmps = employees.filter(
    (e) => filterDiv === "ALL" || e.divisions?.name === filterDiv,
  );

  const daysInMonth = selectedSched
    ? new Date(selectedSched.year, selectedSched.month, 0).getDate()
    : 0;

  return (
    <div className="max-w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">Statistik</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Ringkasan shift per karyawan
        </p>
      </div>

      {/* Schedule selector */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          Pilih Jadwal
        </p>
        <div className="flex gap-2 flex-wrap">
          {schedules.length === 0 && (
            <p className="text-sm text-gray-400">Belum ada jadwal tersimpan.</p>
          )}
          {schedules.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSchedule(s)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition cursor-pointer flex items-center gap-2
                ${
                  selectedSched?.id === s.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                }`}
            >
              {MONTHS[s.month - 1]} {s.year}
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full
                ${
                  s.is_published
                    ? selectedSched?.id === s.id
                      ? "bg-white/20 text-white"
                      : "bg-emerald-100 text-emerald-600"
                    : selectedSched?.id === s.id
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-600"
                }`}
              >
                {s.is_published ? "✓" : "Draft"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {!loaded && !loading && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm">
            Pilih jadwal di atas untuk melihat statistik
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-sm">Memuat data...</p>
        </div>
      )}

      {loaded && !loading && (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
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
                icon: "✅",
                label: "Total Hari Kerja",
                value: totalWork,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                icon: "😴",
                label: "Total Hari Libur",
                value: totalLibur,
                color: "text-red-600",
                bg: "bg-red-50",
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

          {/* Shift distribution */}
          {shiftDist.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 shadow-sm">
              <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">
                Distribusi Shift (Top 10)
              </p>
              <div className="flex flex-col gap-2">
                {shiftDist.map(([code, count]) => {
                  const sc = shiftMap[code];
                  const max = shiftDist[0][1];
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={code} className="flex items-center gap-3">
                      <span
                        className="w-8 text-center font-mono font-extrabold text-[11px] px-1.5 py-1 rounded-lg shrink-0"
                        style={{
                          background: sc?.color_bg ?? "#F3F4F6",
                          color: sc?.color_text ?? "#374151",
                        }}
                      >
                        {code}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: sc?.color_bg ?? "#E5E7EB",
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-500 w-8 text-right shrink-0">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Division filter */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {["ALL", ...divisions.map((d) => d.name)].map((d) => (
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

          {/* Per-employee cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEmps.map((emp, i) => {
              const st = empStats[emp.name] ?? {
                work: 0,
                libur: 0,
                cuti: 0,
                shifts: {},
              };
              const topShifts = Object.entries(st.shifts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6);
              const tc = TYPE_COLORS[emp.employee_types?.code ?? ""] ?? {
                bg: "bg-gray-100",
                text: "text-gray-500",
              };
              const total = st.work + st.libur + st.cuti;
              const workPct =
                total > 0 ? Math.round((st.work / total) * 100) : 0;

              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
                >
                  {/* Header */}
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

                  {/* Work/Libur/Cuti counts */}
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 bg-blue-50 rounded-xl p-2.5 text-center border border-blue-100">
                      <div className="text-xl font-extrabold text-blue-600">
                        {st.work}
                      </div>
                      <div className="text-[8px] text-blue-400 uppercase tracking-wide font-bold">
                        Kerja
                      </div>
                    </div>
                    <div className="flex-1 bg-red-50 rounded-xl p-2.5 text-center border border-red-100">
                      <div className="text-xl font-extrabold text-red-600">
                        {st.libur}
                      </div>
                      <div className="text-[8px] text-red-400 uppercase tracking-wide font-bold">
                        Libur
                      </div>
                    </div>
                    {st.cuti > 0 && (
                      <div className="flex-1 bg-amber-50 rounded-xl p-2.5 text-center border border-amber-100">
                        <div className="text-xl font-extrabold text-amber-600">
                          {st.cuti}
                        </div>
                        <div className="text-[8px] text-amber-400 uppercase tracking-wide font-bold">
                          Cuti
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[9px] text-gray-400 mb-1">
                      <span>Kehadiran</span>
                      <span className="font-bold text-blue-600">
                        {workPct}%
                      </span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-700"
                        style={{ width: `${workPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Shift breakdown */}
                  <div className="flex flex-wrap gap-1.5">
                    {topShifts.map(([code, count]) => {
                      const sc = shiftMap[code];
                      return (
                        <span
                          key={code}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold"
                          style={{
                            background: sc?.color_bg ?? "#F3F4F6",
                            color: sc?.color_text ?? "#374151",
                            border: "1px solid rgba(0,0,0,0.06)",
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
        </>
      )}
    </div>
  );
}
