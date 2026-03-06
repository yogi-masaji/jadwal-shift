"use client";

import { useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────
type Employee = {
  id: string;
  employee_number: string;
  name: string;
  division: string;
  type_code: string;
  type_label: string;
  max_work_days_per_month: number | null;
  allowed_days_of_week: number[] | null;
  needs_full_schedule: boolean;
  must_cover_all_shifts: boolean;
};

type ShiftCode = {
  id: number;
  code: string;
  label: string;
  start_time: string | null;
  end_time: string | null;
  category: "pagi" | "siang" | "malam" | "libur" | "cuti";
  color_bg: string;
  color_text: string;
  is_work_shift: boolean;
};

type ScheduleMeta = {
  id: string;
  year: number;
  month: number;
  is_published: boolean;
  generated_at: string;
  last_edited_at: string | null;
};

// schedule[employeeId][day] = shiftCode | null
type ScheduleData = Record<string, Record<number, string | null>>;

interface Props {
  initialEmployees: Employee[];
  shiftCodes: ShiftCode[];
  existingSchedules: ScheduleMeta[];
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

// ── Helpers ────────────────────────────────────────────────
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

// ── Shift Code Dropdown ───────────────────────────────────
function ShiftDropdown({
  codes,
  value,
  onChange,
  onClose,
}: {
  codes: ShiftCode[];
  value: string;
  onChange: (code: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = codes.filter(
    (s) =>
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.label.toLowerCase().includes(search.toLowerCase()),
  );
  const grouped: Record<string, ShiftCode[]> = {};
  filtered.forEach((s) => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });
  const CAT_ORDER = ["pagi", "siang", "malam", "libur", "cuti"];
  const CAT_LABEL: Record<string, string> = {
    pagi: "🌅 Pagi",
    siang: "☀️ Siang",
    malam: "🌙 Malam",
    libur: "😴 Libur",
    cuti: "✈️ Cuti",
  };
  return (
    <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-2xl w-52 overflow-hidden">
      <div className="p-2 border-b border-gray-100">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          placeholder="Cari kode shift..."
          className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 outline-none focus:border-blue-400"
        />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {/* Clear / kosongkan */}
        <button
          onClick={() => {
            onChange("");
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
        >
          <span className="w-8 text-center font-mono font-bold text-gray-300">
            –
          </span>
          <span>Kosongkan</span>
        </button>
        {CAT_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
          <div key={cat}>
            <div className="px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-gray-400 bg-gray-50">
              {CAT_LABEL[cat]}
            </div>
            {grouped[cat].map((s) => (
              <button
                key={s.code}
                onClick={() => {
                  onChange(s.code);
                  onClose();
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50 transition
                  ${value === s.code ? "bg-blue-50" : ""}`}
              >
                <span
                  className="w-8 text-center font-mono font-extrabold text-[10px] px-1 py-0.5 rounded"
                  style={{ background: s.color_bg, color: s.color_text }}
                >
                  {s.code}
                </span>
                <span className="text-gray-600 truncate">{s.label}</span>
                {s.start_time && (
                  <span className="ml-auto text-[9px] text-gray-400 shrink-0">
                    {s.start_time.slice(0, 5)}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-xs text-gray-400 text-center">
            Kode tidak ditemukan
          </p>
        )}
      </div>
    </div>
  );
}

// ── Seeded RNG (Mulberry32) ───────────────────────────────
// ── Seeded RNG (Mulberry32) ───────────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle dengan seed
function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Generate Schedule Logic ────────────────────────────────
function generateSchedule(
  employees: Employee[],
  shiftCodes: ShiftCode[],
  year: number,
  month: number,
  seed: number,
): ScheduleData {
  const days = getDaysInMonth(year, month);
  const sched: ScheduleData = {};
  employees.forEach((e) => {
    sched[e.id] = {};
  });

  const rng = mulberry32(seed);
  const byCategory = (cat: string) =>
    shiftCodes
      .filter((s) => s.category === cat && s.is_work_shift)
      .map((s) => s.code);
  const PAGI = seededShuffle(byCategory("pagi"), rng);
  const SIANG = seededShuffle(byCategory("siang"), rng);
  const MALAM = seededShuffle(byCategory("malam"), rng);
  const ALL_WORK = seededShuffle([...PAGI, ...SIANG, ...MALAM], rng);
  // Shuffle employee order for variety
  const shuffledEmps = seededShuffle(employees, rng);

  // kontrak computed after shuffle
  const kontrak = shuffledEmps.filter((e) => e.must_cover_all_shifts);

  // Pre-calc PPM work days
  const ppmWorkDays: Record<string, Set<number>> = {};
  shuffledEmps
    .filter((e) => e.max_work_days_per_month !== null)
    .forEach((emp, idx) => {
      const maxDays = emp.max_work_days_per_month ?? 15;
      const allDays = Array.from({ length: days }, (_, i) => i + 1);
      const weekdays = allDays.filter((d) => !isWeekend(year, month, d));
      const weekends = allDays.filter((d) => isWeekend(year, month, d));
      const wkdCount = Math.min(maxDays - 2, weekdays.length);
      const offset = (idx * 4) % weekdays.length;
      const rotated = [...weekdays.slice(offset), ...weekdays.slice(0, offset)];
      const picked = new Set(rotated.slice(0, wkdCount));
      const wkOffset = (idx * 2) % Math.max(weekends.length, 1);
      [
        weekends[wkOffset % weekends.length],
        weekends[(wkOffset + 1) % weekends.length],
      ]
        .filter(Boolean)
        .forEach((d) => picked.add(d));
      ppmWorkDays[emp.id] = picked;
    });

  for (let day = 1; day <= days; day++) {
    const wknd = isWeekend(year, month, day);
    const dow = new Date(year, month, day).getDay();
    let liburToday = 0;

    shuffledEmps.forEach((emp, idx) => {
      // PPM — limited work days
      if (emp.max_work_days_per_month !== null) {
        sched[emp.id][day] = ppmWorkDays[emp.id]?.has(day)
          ? PAGI[(idx + day) % PAGI.length]
          : null;
        return;
      }

      // Kelas Industri — only Fri/Sat/Sun
      if (emp.allowed_days_of_week) {
        sched[emp.id][day] = emp.allowed_days_of_week.includes(dow)
          ? PAGI[(idx + day) % PAGI.length]
          : null;
        return;
      }

      // Promotor — not scheduled
      if (
        !emp.needs_full_schedule &&
        !emp.allowed_days_of_week &&
        emp.max_work_days_per_month === null
      ) {
        sched[emp.id][day] = null;
        return;
      }

      // Full schedule (tetap, kontrak, magang, pkl)
      let consec = 0;
      for (let d = day - 1; d >= 1; d--) {
        const s = sched[emp.id][d];
        if (s && s !== "X" && s !== "SL" && s !== "AL") consec++;
        else break;
      }

      if (consec >= 7) {
        sched[emp.id][day] = "X";
        liburToday++;
        return;
      }
      if (wknd && liburToday >= 1) {
        sched[emp.id][day] = ALL_WORK[(idx * 7 + day) % ALL_WORK.length];
        return;
      }
      const offCycle = (idx * 3 + Math.floor((day - 1) / 7) * 7) % 7;
      if (!wknd && dow === ((offCycle + idx) % 5) + 1 && consec >= 5) {
        sched[emp.id][day] = "X";
        liburToday++;
        return;
      }
      const period = (idx + day - 1) % 21;
      if (period < 7) sched[emp.id][day] = PAGI[(idx + day) % PAGI.length];
      else if (period < 14)
        sched[emp.id][day] = SIANG[(idx + day) % SIANG.length];
      else sched[emp.id][day] = MALAM[(idx + day) % MALAM.length];
    });

    // Kontrak: pastikan semua shift terwakili
    if (kontrak.length > 0) {
      const cats = { pagi: false, siang: false, malam: false };
      kontrak.forEach((k) => {
        const code = sched[k.id][day];
        const sc = shiftCodes.find((s) => s.code === code);
        if (sc) (cats as Record<string, boolean>)[sc.category] = true;
      });
      (["pagi", "siang", "malam"] as const).forEach((cat, ci) => {
        if (!cats[cat]) {
          const emp = kontrak[ci % kontrak.length];
          const pool = cat === "pagi" ? PAGI : cat === "siang" ? SIANG : MALAM;
          sched[emp.id][day] = pool[day % pool.length];
        }
      });
    }
  }

  return sched;
}

// ── Main Component ─────────────────────────────────────────
export default function JadwalClient({
  initialEmployees,
  shiftCodes,
  existingSchedules,
}: Props) {
  const supabase = createClient();
  const today = new Date();

  const [employees] = useState<Employee[]>(initialEmployees);
  const [loadedEmployees, setLoadedEmployees] =
    useState<Employee[]>(initialEmployees);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [schedMeta, setSchedMeta] = useState<ScheduleMeta | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [editCell, setEditCell] = useState<{
    empId: string;
    day: number;
  } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generateCount, setGenerateCount] = useState(0);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);

  // Karyawan yang digunakan untuk render kalender:
  // - saat generate: pakai employees (aktif saja)
  // - saat muat tersimpan: pakai loadedEmployees (termasuk historis/terhapus)
  const displayEmployees =
    loadedEmployees.length > employees.length ? loadedEmployees : employees;

  const shiftMap = useMemo(() => {
    const m: Record<string, ShiftCode> = {};
    shiftCodes.forEach((s) => {
      m[s.code] = s;
    });
    return m;
  }, [shiftCodes]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Generate ──
  function handleGenerate() {
    const seed = Date.now() ^ ((Math.random() * 0xffffffff) | 0);
    const generated = generateSchedule(
      employees,
      shiftCodes,
      year,
      month,
      seed,
    );
    setSchedule(generated);
    setSchedMeta(null);
    setSelectedDay(null);
    setFilterCat("all");
    setLoadedEmployees(employees); // reset ke aktif saja saat generate baru
    setGenerateCount((c) => c + 1);
    showToast(
      generateCount === 0
        ? "Jadwal berhasil digenerate!"
        : "Jadwal di-shuffle ulang!",
    );
  }

  // ── Save to DB ──
  async function handleSave() {
    if (!schedule) return;
    setSaving(true);

    // Upsert schedule header
    const { data: schedRow, error: schedErr } = await supabase
      .from("schedules")
      .upsert(
        {
          year,
          month: month + 1,
          is_published: schedMeta?.is_published ?? false,
        },
        { onConflict: "year,month" },
      )
      .select()
      .single();

    if (schedErr) {
      showToast(schedErr.message, "error");
      setSaving(false);
      return;
    }

    // Build rows
    const rows: object[] = [];
    employees.forEach((emp) => {
      for (let day = 1; day <= daysInMonth; day++) {
        const code = schedule[emp.id]?.[day] ?? null;
        const shiftId = code
          ? (shiftCodes.find((s) => s.code === code)?.id ?? null)
          : null;
        rows.push({
          schedule_id: schedRow.id,
          employee_id: emp.id,
          date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          shift_code_id: shiftId,
          is_manual_edit: false,
        });
      }
    });

    // Delete existing details then insert fresh
    await supabase
      .from("schedule_details")
      .delete()
      .eq("schedule_id", schedRow.id);
    const { error: detailErr } = await supabase
      .from("schedule_details")
      .insert(rows);

    setSaving(false);
    if (detailErr) {
      showToast(detailErr.message, "error");
      return;
    }
    setSchedMeta(schedRow);
    showToast(`Jadwal ${MONTHS[month]} ${year} berhasil disimpan!`);
  }

  // ── Publish / Unpublish ──
  async function handlePublish() {
    if (!schedMeta) return;
    setPublishing(true);
    const newStatus = !schedMeta.is_published;

    // Pakai API route (server-side) untuk hindari CORS PATCH issue
    const res = await fetch("/api/schedules/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: schedMeta.id, is_published: newStatus }),
    });

    const json = await res.json();
    setPublishing(false);

    if (!res.ok) {
      showToast(json.error ?? "Gagal publish.", "error");
      return;
    }
    setSchedMeta({ ...schedMeta, is_published: newStatus });
    showToast(
      newStatus
        ? "Jadwal dipublish! Karyawan bisa melihat."
        : "Jadwal dijadikan draft.",
    );
  }

  // ── Copy share link ──
  function handleCopy() {
    if (!schedMeta) return;
    const url = `${window.location.origin}/jadwal-publik?year=${year}&month=${month + 1}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // ── Load existing schedule ──
  async function handleLoad() {
    const existing = existingSchedules.find(
      (s) => s.year === year && s.month === month + 1,
    );
    if (!existing) {
      showToast("Belum ada jadwal tersimpan untuk bulan ini.", "error");
      return;
    }

    // Fetch details + employee snapshot (termasuk yang sudah dihapus)
    const { data: details } = await supabase
      .from("schedule_details")
      .select(
        `
        employee_id,
        date,
        shift_codes ( code ),
        employees ( id, employee_number, name, is_active, deleted_at,
          divisions ( id, name ),
          employee_types ( id, code, label )
        )
      `,
      )
      .eq("schedule_id", existing.id);

    if (!details) return;

    // Rebuild employee list dari detail rows (termasuk yang terhapus)
    const empMap: Record<string, Employee> = {};
    (
      details as {
        employee_id: string;
        date: string;
        shift_codes: { code: string } | null;
        employees: Employee | null;
      }[]
    ).forEach((d) => {
      if (d.employees && !empMap[d.employee_id]) {
        empMap[d.employee_id] = {
          ...d.employees,
          deactivated_at: null,
        };
      }
    });

    // Merge: aktif dari state + historis dari jadwal (yang mungkin sudah dihapus)
    const mergedEmps = [...employees];
    Object.values(empMap).forEach((emp) => {
      if (!mergedEmps.find((e) => e.id === emp.id)) {
        mergedEmps.push(emp); // tambahkan karyawan historis yang tidak ada di list aktif
      }
    });
    setLoadedEmployees(mergedEmps);

    // Build schedule map
    const loaded: ScheduleData = {};
    mergedEmps.forEach((e) => {
      loaded[e.id] = {};
    });
    (
      details as {
        employee_id: string;
        date: string;
        shift_codes: { code: string } | null;
      }[]
    ).forEach((d) => {
      const day = parseInt(d.date.split("-")[2], 10);
      if (!loaded[d.employee_id]) loaded[d.employee_id] = {};
      loaded[d.employee_id][day] = d.shift_codes?.code ?? null;
    });

    setSchedule(loaded);
    setSchedMeta(existing);
    setSelectedDay(null);
    showToast("Jadwal dimuat dari database.");
  }

  // ── Edit cell ──
  function commitEdit(empId: string, day: number) {
    const upper = editVal.trim().toUpperCase();
    if (upper && !shiftMap[upper]) {
      showToast(`Kode shift "${upper}" tidak dikenal.`, "error");
      return;
    }
    setSchedule((prev) => ({
      ...prev!,
      [empId]: { ...prev![empId], [day]: upper || null },
    }));
    setEditCell(null);
    setEditVal("");
  }

  // ── Stats per day ──
  const dayStats = useCallback(
    (day: number) => {
      if (!schedule) return { work: 0, libur: 0 };
      let work = 0,
        libur = 0;
      displayEmployees.forEach((e) => {
        const code = schedule[e.id]?.[day];
        if (!code) return;
        const sc = shiftMap[code];
        if (!sc) return;
        if (sc.is_work_shift) work++;
        else libur++;
      });
      return { work, libur };
    },
    [schedule, employees, shiftMap],
  );

  const hasExisting = existingSchedules.some(
    (s) => s.year === year && s.month === month + 1,
  );

  return (
    <div className="max-w-full">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold
          ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Jadwal Shift
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {employees.length} karyawan aktif
          </p>
        </div>

        {/* Status badge */}
        {schedMeta && (
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold
            ${schedMeta.is_published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
          >
            {schedMeta.is_published ? "✓ Published" : "⏳ Draft"}
          </span>
        )}
      </div>

      {/* ── Controls bar ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month/Year picker */}
          <select
            value={month}
            onChange={(e) => {
              setMonth(+e.target.value);
              setSchedule(null);
              setSchedMeta(null);
              setGenerateCount(0);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 bg-white cursor-pointer"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => {
              setYear(+e.target.value);
              setSchedule(null);
              setSchedMeta(null);
              setGenerateCount(0);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 bg-white cursor-pointer"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <div className="flex gap-2 flex-wrap">
            {/* Generate / Re-shuffle */}
            <button
              onClick={handleGenerate}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-bold rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
            >
              {schedule ? "🔀 Shuffle Ulang" : "⚡ Generate"}
            </button>

            {/* Load */}
            {hasExisting && (
              <button
                onClick={handleLoad}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition cursor-pointer"
              >
                📂 Muat Tersimpan
              </button>
            )}

            {/* Save */}
            {schedule && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {saving ? "Menyimpan..." : "💾 Simpan"}
              </button>
            )}

            {/* Publish */}
            {schedMeta && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition cursor-pointer disabled:opacity-60
                  ${
                    schedMeta.is_published
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
              >
                {publishing
                  ? "..."
                  : schedMeta.is_published
                    ? "🔒 Jadikan Draft"
                    : "📢 Publish"}
              </button>
            )}

            {/* Share link */}
            {schedMeta?.is_published && (
              <button
                onClick={handleCopy}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5
                  ${
                    copied
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                {copied ? "✓ Tersalin!" : "🔗 Salin Link"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!schedule && (
        <div className="text-center py-24 text-gray-400">
          <div className="text-5xl mb-4">📅</div>
          <p className="text-base font-semibold text-gray-500">
            Belum ada jadwal untuk {MONTHS[month]} {year}
          </p>
          <p className="text-sm mt-1">
            Klik <span className="font-bold text-blue-600">⚡ Generate</span>{" "}
            untuk membuat jadwal baru
            {hasExisting && (
              <>
                {" "}
                atau{" "}
                <span className="font-bold text-gray-600">
                  📂 Muat Tersimpan
                </span>
              </>
            )}
          </p>
        </div>
      )}

      {/* ── Calendar ── */}
      {schedule && (
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

          {/* Calendar + Side panel */}
          <div className="flex gap-4 items-start">
            {/* Calendar grid */}
            <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Day headers */}
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

              {/* Calendar cells */}
              <div className="grid grid-cols-7">
                {/* Empty cells */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div
                    key={`e${i}`}
                    className="min-h-[90px] border-r border-b border-gray-100 bg-gray-50/50"
                  />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const wknd = isWeekend(year, month, day);
                  const isToday =
                    today.getFullYear() === year &&
                    today.getMonth() === month &&
                    today.getDate() === day;
                  const isSel = selectedDay === day;
                  const stats = dayStats(day);

                  const dayEntries = displayEmployees
                    .map((e) => ({ ...e, code: schedule[e.id]?.[day] ?? null }))
                    .filter((e) => e.code)
                    .filter(
                      (e) =>
                        filterCat === "all" ||
                        shiftMap[e.code!]?.category === filterCat,
                    );

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(isSel ? null : day)}
                      className={`min-h-[90px] p-1.5 border-r border-b border-gray-100 cursor-pointer transition-colors
                        ${
                          isSel
                            ? "bg-blue-50 outline outline-2 outline-blue-500 outline-offset-[-2px]"
                            : wknd
                              ? "bg-red-50/40 hover:bg-red-50"
                              : "bg-white hover:bg-gray-50"
                        }`}
                    >
                      {/* Date number */}
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
                        {stats.work > 0 && (
                          <span className="text-[8px] font-bold text-gray-400">
                            {stats.work}
                          </span>
                        )}
                      </div>

                      {/* Shift chips */}
                      <div className="flex flex-col gap-[2px]">
                        {dayEntries.slice(0, 3).map((emp) => {
                          const sc = emp.code ? shiftMap[emp.code] : null;
                          if (!sc) return null;
                          return (
                            <div
                              key={emp.id}
                              className="text-[8px] font-bold px-1 py-[1px] rounded flex items-center gap-1 overflow-hidden"
                              style={{
                                background: sc.color_bg,
                                color: sc.color_text,
                              }}
                            >
                              <span className="font-mono shrink-0">
                                {emp.code}
                              </span>
                              <span className="truncate hidden sm:block">
                                {emp.name.split(" ")[0]}
                              </span>
                            </div>
                          );
                        })}
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

            {/* ── Side panel ── */}
            {selectedDay && (
              <div className="w-72 shrink-0 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
                {/* Panel header */}
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
                      onClick={() => {
                        setSelectedDay(null);
                        setEditCell(null);
                      }}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 cursor-pointer text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Summary badges */}
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {Object.entries(CATEGORY_META).map(([cat, meta]) => {
                      const count = displayEmployees.filter(
                        (e) =>
                          shiftMap[schedule[e.id]?.[selectedDay] ?? ""]
                            ?.category === cat,
                      ).length;
                      if (!count) return null;
                      return (
                        <span
                          key={cat}
                          className="text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{
                            background:
                              cat === "libur" ? "rgb(165,0,0)" : "#fff",
                            color: cat === "libur" ? "#fff" : meta.color,
                            border: `1px solid ${cat === "libur" ? "rgb(165,0,0)" : "#E5E7EB"}`,
                          }}
                        >
                          {meta.icon} {count}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Shift sections */}
                <div className="px-4 py-4 flex flex-col gap-4">
                  {(
                    Object.entries(CATEGORY_META) as [
                      keyof typeof CATEGORY_META,
                      (typeof CATEGORY_META)[keyof typeof CATEGORY_META],
                    ][]
                  ).map(([cat, meta]) => {
                    const catEmps = displayEmployees.filter(
                      (e) =>
                        shiftMap[schedule[e.id]?.[selectedDay] ?? ""]
                          ?.category === cat,
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
                          {catEmps.map((emp) => {
                            const code =
                              schedule[emp.id]?.[selectedDay] ?? null;
                            const sc = code ? shiftMap[code] : null;
                            const editing =
                              editCell?.empId === emp.id &&
                              editCell?.day === selectedDay;
                            return (
                              <div
                                key={emp.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100"
                              >
                                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                                  {emp.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-800 truncate">
                                    {emp.name}
                                  </p>
                                  <p className="text-[9px] text-gray-400">
                                    {emp.division}
                                  </p>
                                </div>
                                {editing ? (
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDropdownOpen((o) => !o);
                                      }}
                                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 border-blue-400 bg-blue-50 cursor-pointer"
                                    >
                                      {editVal ? (
                                        <span
                                          className="font-mono font-extrabold text-[10px]"
                                          style={{
                                            color:
                                              shiftMap[editVal]?.color_text ??
                                              "#374151",
                                          }}
                                        >
                                          {editVal}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-gray-400">
                                          Pilih...
                                        </span>
                                      )}
                                      <span className="text-[10px] text-blue-400">
                                        ▾
                                      </span>
                                    </button>
                                    <div className="flex gap-1 mt-1">
                                      <button
                                        onClick={() => {
                                          commitEdit(emp.id, selectedDay);
                                          setDropdownOpen(false);
                                        }}
                                        className="flex-1 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                                      >
                                        ✓ Simpan
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditCell(null);
                                          setEditVal("");
                                          setDropdownOpen(false);
                                        }}
                                        className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] rounded-lg cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    {dropdownOpen && (
                                      <ShiftDropdown
                                        codes={shiftCodes}
                                        value={editVal}
                                        onChange={(v) => {
                                          setEditVal(v);
                                          setDropdownOpen(false);
                                        }}
                                        onClose={() => setDropdownOpen(false)}
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span
                                      className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg"
                                      style={{
                                        background: sc?.color_bg ?? "#F3F4F6",
                                        color: sc?.color_text ?? "#374151",
                                      }}
                                    >
                                      {code ?? "–"}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditCell({
                                          empId: emp.id,
                                          day: selectedDay,
                                        });
                                        setEditVal(code ?? "");
                                        setDropdownOpen(false);
                                      }}
                                      className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded-md text-[9px] cursor-pointer flex items-center justify-center"
                                    >
                                      ✏️
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* No shift */}
                  {(() => {
                    const noShift = displayEmployees.filter(
                      (e) => !schedule[e.id]?.[selectedDay],
                    );
                    if (!noShift.length) return null;
                    return (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-0.5 h-4 rounded-full bg-gray-200" />
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                            Tidak Terjadwal
                          </span>
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {noShift.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {noShift.map((emp) => (
                            <span
                              key={emp.id}
                              className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-400"
                            >
                              {emp.name.split(" ")[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
