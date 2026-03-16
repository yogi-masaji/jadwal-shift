export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import JadwalClient from "./JadwalClient";

// Komponen async yang fetch data — HARUS dipanggil di dalam Suspense
async function JadwalData() {
  const supabase = await createClient();

  const [{ data: employees }, { data: shiftCodes }, { data: schedules }] =
    await Promise.all([
      supabase
        .from("v_active_employees")
        .select(
          "id, employee_number, name, division, type_code, type_label, max_work_days_per_month, allowed_days_of_week, needs_full_schedule, must_cover_all_shifts, level",
        )
        .order("name"),
      supabase
        .from("shift_codes")
        .select(
          "id, code, label, start_time, end_time, category, color_bg, color_text, is_work_shift",
        )
        .order("category"),
      supabase
        .from("schedules")
        .select("id, year, month, is_published, generated_at, last_edited_at")
        .order("year", { ascending: false })
        .order("month", { ascending: false }),
    ]);

  return (
    <JadwalClient
      initialEmployees={employees ?? []}
      shiftCodes={shiftCodes ?? []}
      existingSchedules={schedules ?? []}
    />
  );
}

// Page TIDAK async — cukup render Suspense wrapper
export default function JadwalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-400">Memuat jadwal...</p>
        </div>
      }
    >
      <JadwalData />
    </Suspense>
  );
}
