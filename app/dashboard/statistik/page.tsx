import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import StatistikClient from "./StatistikClient";

async function StatistikContent() {
  const supabase = await createClient();

  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, year, month, is_published")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  const { data: shiftCodes } = await supabase
    .from("shift_codes")
    .select("id, code, label, color_bg, color_text, category, is_work_shift");

  const { data: divisions } = await supabase
    .from("divisions")
    .select("id, name");

  return (
    <StatistikClient
      schedules={schedules ?? []}
      shiftCodes={shiftCodes ?? []}
      divisions={divisions ?? []}
    />
  );
}

export default function StatistikPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-400">Memuat statistik...</p>
        </div>
      }
    >
      <StatistikContent />
    </Suspense>
  );
}
