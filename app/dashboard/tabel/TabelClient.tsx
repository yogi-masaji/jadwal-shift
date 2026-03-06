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
  start_time: string | null;
  end_time: string | null;
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
  shift_codes: { code: string; color_bg: string; color_text: string } | null;
  employees: { name: string; divisions: { name: string } | null } | null;
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
const DAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function isWeekend(y: number, m: number, d: number) {
  const day = new Date(y, m, d).getDay();
  return day === 0 || day === 6;
}

interface Props {
  schedules: Schedule[];
  shiftCodes: ShiftCode[];
  divisions: Division[];
}

export default function TabelClient({
  schedules,
  shiftCodes,
  divisions,
}: Props) {
  const supabase = createClient();
  const today = new Date();

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
        shift_codes ( code, color_bg, color_text ),
        employees ( name, divisions ( name ) )
      `,
      )
      .eq("schedule_id", sched.id)
      .order("date");

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

  // employees list
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

  // schedMap[name][day] = shiftCode
  const schedMap = useMemo(() => {
    const m: Record<
      string,
      Record<
        number,
        { code: string; color_bg: string; color_text: string } | null
      >
    > = {};
    details.forEach((d) => {
      const name = d.employees?.name;
      if (!name) return;
      if (!m[name]) m[name] = {};
      m[name][new Date(d.date).getDate()] = d.shift_codes ?? null;
    });
    return m;
  }, [details]);

  const daysInMonth = selectedSched
    ? getDaysInMonth(selectedSched.year, selectedSched.month - 1)
    : 31;
  const year = selectedSched?.year ?? today.getFullYear();
  const month = selectedSched ? selectedSched.month - 1 : today.getMonth();

  const filteredEmps = employees.filter(
    (e) => filterDiv === "ALL" || e.divisions?.name === filterDiv,
  );

  return (
    <div className="max-w-full">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Tabel Shift</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tampilan lengkap per karyawan per hari
          </p>
        </div>
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

      {/* Empty / loading */}
      {!loaded && !loading && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm">
            Pilih jadwal di atas untuk melihat tabel shift
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

          {/* Table */}
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
                          className={isT ? "font-extrabold text-blue-600" : ""}
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
                {filteredEmps.map((emp, ei) => (
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
                            <span className="text-gray-200 text-[9px]">–</span>
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                  style={{
                    background: s.color_bg,
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
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
        </>
      )}
    </div>
  );
}
