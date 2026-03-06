"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "manager" as "admin" | "manager",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validasi
    if (form.password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Password dan konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);

    // 1. Cek apakah email sudah terdaftar di tabel users
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", form.email)
      .single();

    if (existing) {
      setError("Email sudah terdaftar.");
      setLoading(false);
      return;
    }

    // 2. Daftarkan ke Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? "Gagal membuat akun.");
      setLoading(false);
      return;
    }

    // 3. Simpan ke tabel users kita
    const { error: dbError } = await supabase.from("users").insert({
      id: authData.user.id,
      name: form.name,
      email: form.email,
      password_hash: "managed-by-supabase-auth",
      role: form.role,
    });

    if (dbError) {
      setError("Akun dibuat tapi gagal simpan profil: " + dbError.message);
      setLoading(false);
      return;
    }

    // 4. Sukses → redirect ke dashboard
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
          <h1 className="text-2xl font-extrabold text-gray-900">Buat Akun</h1>
          <p className="text-sm text-gray-500 mt-1">
            Daftarkan akun untuk kelola jadwal
          </p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          {/* Nama */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Nama Lengkap
            </label>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Nama lengkap"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Email
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@example.com"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Role
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
            >
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Password
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimal 6 karakter"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Konfirmasi Password */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Konfirmasi Password
            </label>
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Ulangi password"
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
            {loading ? "Mendaftarkan..." : "Daftar"}
          </button>

          {/* Link ke login */}
          <p className="text-center text-xs text-gray-500">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="text-blue-600 font-semibold hover:underline"
            >
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
