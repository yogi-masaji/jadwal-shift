export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import KaryawanClient from "./KaryawanClient";

async function KaryawanData() {
  const supabase = await createClient();

  const [{ data: employees }, { data: divisions }, { data: employeeTypes }] =
    await Promise.all([
      supabase
        .from("employees")
        .select(
          `id, employee_number, name, is_active, deactivated_at, deleted_at, divisions(id,name), employee_types(id,code,label)`,
        )
        .is("deleted_at", null)
        .order("name"),
      supabase.from("divisions").select("id, name"),
      supabase.from("employee_types").select("id, code, label"),
    ]);

  return (
    <KaryawanClient
      initialEmployees={employees ?? []}
      divisions={divisions ?? []}
      employeeTypes={employeeTypes ?? []}
    />
  );
}

export default function KaryawanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-gray-400">Memuat data karyawan...</div>
        </div>
      }
    >
      <KaryawanData />
    </Suspense>
  );
}
