import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function DivisionsData() {
  const supabase = await createClient();
  const { data: divisions, error } = await supabase
    .from("divisions")
    .select("*");

  if (error) return <p>Error: {error.message}</p>;

  return <pre>{JSON.stringify(divisions, null, 2)}</pre>;
}

export default function Divisions() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DivisionsData />
    </Suspense>
  );
}
