import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// UPDATE (edit data / deactivate)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, id, payload } = await request.json();

  if (action === "update") {
    const { data, error } = await supabase
      .from("employees")
      .update(payload)
      .eq("id", id)
      .select(
        `id, employee_number, name, is_active, deactivated_at, deleted_at, divisions(id,name), employee_types(id,code,label)`,
      )
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  if (action === "delete") {
    const { error } = await supabase
      .from("employees")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
