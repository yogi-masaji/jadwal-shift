import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex font-sans">
      <Sidebar userName={profile?.name ?? ""} userRole={profile?.role ?? ""} />
      {/* pt-14 = tinggi mobile top bar, lg:pt-0 = desktop tidak perlu */}
      <main className="flex-1 overflow-auto p-5 lg:p-7 pt-[calc(3.5rem+1.25rem)] lg:pt-7">
        {children}
      </main>
    </div>
  );
}
