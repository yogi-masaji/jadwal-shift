import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import KaryawanClient from "./KaryawanClient";

async function KaryawanContent() {
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from("employees")
    .select(
      `
      id, employee_number, name, is_active, deactivated_at, deleted_at,
      divisions ( id, name ),
      employee_types ( id, code, label )
    `,
    )
    .is("deleted_at", null)
    .order("name");

  const { data: divisions } = await supabase
    .from("divisions")
    .select("id, name");
  const { data: employeeTypes } = await supabase
    .from("employee_types")
    .select("id, code, label");

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
      <KaryawanContent />
    </Suspense>
  );
}
