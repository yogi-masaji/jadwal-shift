import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import PublicClient from "./PublicClient";

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

async function PublicContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const today = new Date();

  const year = params.year ? parseInt(params.year) : today.getFullYear();
  const month = params.month ? parseInt(params.month) - 1 : today.getMonth();

  // Cari schedule yang published untuk bulan ini
  const { data: schedule } = await supabase
    .from("schedules")
    .select("id, year, month, is_published, generated_at")
    .eq("year", year)
    .eq("month", month + 1)
    .eq("is_published", true)
    .single();

  // Ambil semua schedule yang published untuk dropdown navigasi
  const { data: allSchedules } = await supabase
    .from("schedules")
    .select("year, month")
    .eq("is_published", true)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  let details: {
    employee_id: string;
    date: string;
    shift_codes: {
      code: string;
      label: string;
      color_bg: string;
      color_text: string;
      category: string;
      start_time: string | null;
      end_time: string | null;
    } | null;
    employees: {
      name: string;
      employee_number: string;
      divisions: { name: string } | null;
      employee_types: { label: string; code: string } | null;
    } | null;
  }[] = [];

  if (schedule) {
    const { data } = await supabase
      .from("schedule_details")
      .select(
        `
        employee_id,
        date,
        shift_codes ( code, label, color_bg, color_text, category, start_time, end_time ),
        employees ( name, employee_number, divisions ( name ), employee_types ( label, code ) )
      `,
      )
      .eq("schedule_id", schedule.id)
      .order("date");

    details = (data as typeof details) ?? [];
  }

  const { data: shiftCodes } = await supabase
    .from("shift_codes")
    .select("code, label, color_bg, color_text, category, start_time, end_time")
    .order("category");

  return (
    <PublicClient
      year={year}
      month={month}
      schedule={schedule}
      details={details}
      shiftCodes={shiftCodes ?? []}
      allSchedules={allSchedules ?? []}
    />
  );
}

export default function PublicPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
          <p className="text-sm text-gray-400">Memuat jadwal...</p>
        </div>
      }
    >
      <PublicContent {...props} />
    </Suspense>
  );
}
