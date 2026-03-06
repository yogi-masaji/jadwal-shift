"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Cek ke tabel users kita
    const { data: user, error: dbError } = await supabase
      .from("users")
      .select("id, name, email, is_active, role")
      .eq("email", email)
      .single();

    if (dbError || !user) {
      setError("Email tidak ditemukan.");
      setLoading(false);
      return;
    }

    if (!user.is_active) {
      setError("Akun kamu tidak aktif. Hubungi admin.");
      setLoading(false);
      return;
    }

    // 2. Verifikasi password via Supabase Auth
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Password salah.");
      setLoading(false);
      return;
    }

    // 3. Refresh dulu supaya server component kenal session baru
    router.refresh();
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
            Working Schedule
          </p>
          <h1 className="text-2xl font-extrabold text-gray-900">Meat Dept.</h1>
          <p className="text-sm text-gray-500 mt-1">
            Login untuk kelola jadwal
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-sm disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Loading..." : "Login"}
          </button>

          {/* Link ke register */}
          <p className="text-center text-xs text-gray-500">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="text-blue-600 font-semibold hover:underline"
            >
              Daftar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
