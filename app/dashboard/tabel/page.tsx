import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import TabelClient from "./TabelClient";

async function TabelContent() {
  const supabase = await createClient();

  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, year, month, is_published")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  const { data: shiftCodes } = await supabase
    .from("shift_codes")
    .select(
      "id, code, label, color_bg, color_text, category, start_time, end_time",
    );

  const { data: divisions } = await supabase
    .from("divisions")
    .select("id, name");

  return (
    <TabelClient
      schedules={schedules ?? []}
      shiftCodes={shiftCodes ?? []}
      divisions={divisions ?? []}
    />
  );
}

export default function TabelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-400">Memuat tabel...</p>
        </div>
      }
    >
      <TabelContent />
    </Suspense>
  );
}
