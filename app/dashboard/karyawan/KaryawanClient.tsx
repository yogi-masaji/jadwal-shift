"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────
type Division = { id: number; name: string };
type EmpType = { id: number; code: string; label: string };
type Employee = {
  id: string;
  employee_number: string;
  name: string;
  is_active: boolean;
  deactivated_at: string | null;
  deleted_at: string | null;
  divisions: { id: number; name: string } | null;
  employee_types: { id: number; code: string; label: string } | null;
};
type FormState = {
  name: string;
  employee_number: string;
  division_id: number;
  employee_type_id: number;
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  tetap: { bg: "bg-blue-50", text: "text-blue-600" },
  kontrak: { bg: "bg-amber-50", text: "text-amber-600" },
  magang: { bg: "bg-emerald-50", text: "text-emerald-600" },
  ppm: { bg: "bg-violet-50", text: "text-violet-600" },
  kelas_industri: { bg: "bg-pink-50", text: "text-pink-600" },
  pkl: { bg: "bg-orange-50", text: "text-orange-600" },
  promotor: { bg: "bg-red-50", text: "text-red-500" },
};
const getTypeColor = (code?: string) =>
  TYPE_COLORS[code ?? ""] ?? { bg: "bg-gray-100", text: "text-gray-500" };

// ── API helper — semua mutasi lewat server (hindari CORS PATCH) ──
async function callApi(action: string, id: string, payload?: object) {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, id, payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

// ── Modal ──────────────────────────────────────────────────
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Employee Form ──────────────────────────────────────────
function EmployeeForm({
  form,
  onChange,
  divisions,
  employeeTypes,
  onSubmit,
  loading,
  submitLabel,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  divisions: Division[];
  employeeTypes: EmpType[];
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
}) {
  const inputCls =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>Nama Lengkap</label>
        <input
          className={inputCls}
          placeholder="Nama lengkap karyawan"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>Employee ID / No. Karyawan</label>
        <input
          className={inputCls}
          placeholder="e.g. 2510037 / PPM"
          value={form.employee_number}
          onChange={(e) =>
            onChange({ ...form, employee_number: e.target.value })
          }
        />
      </div>
      <div>
        <label className={labelCls}>Divisi</label>
        <select
          className={inputCls}
          value={form.division_id}
          onChange={(e) => onChange({ ...form, division_id: +e.target.value })}
        >
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Tipe Karyawan</label>
        <select
          className={inputCls}
          value={form.employee_type_id}
          onChange={(e) =>
            onChange({ ...form, employee_type_id: +e.target.value })
          }
        >
          {employeeTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-sm disabled:opacity-60 cursor-pointer mt-1"
      >
        {loading ? "Menyimpan..." : submitLabel}
      </button>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────
export default function KaryawanClient({
  initialEmployees,
  divisions,
  employeeTypes,
}: {
  initialEmployees: Employee[];
  divisions: Division[];
  employeeTypes: EmpType[];
}) {
  const supabase = createClient();

  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState("");
  const [filterDiv, setFilterDiv] = useState("ALL");
  const [showTab, setShowTab] = useState<"aktif" | "nonaktif">("aktif");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Employee | null>(
    null,
  );

  const emptyForm: FormState = {
    name: "",
    employee_number: "",
    division_id: divisions[0]?.id ?? 1,
    employee_type_id: employeeTypes[0]?.id ?? 1,
  };
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Filter ──
  const filtered = useMemo(
    () =>
      employees.filter((e) => {
        if (showTab === "aktif" ? !e.is_active : e.is_active) return false;
        if (filterDiv !== "ALL" && e.divisions?.name !== filterDiv)
          return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            e.name.toLowerCase().includes(q) ||
            e.employee_number.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [employees, showTab, filterDiv, search],
  );

  const grouped = useMemo(() => {
    const g: Record<string, Employee[]> = {};
    filtered.forEach((e) => {
      const d = e.divisions?.name ?? "—";
      (g[d] ??= []).push(e);
    });
    return g;
  }, [filtered]);

  // ── ADD — pakai supabase langsung (INSERT = POST, tidak kena CORS) ──
  async function handleAdd() {
    if (!addForm.name.trim() || !addForm.employee_number.trim()) {
      showToast("Nama dan ID wajib diisi.", "error");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .insert({
        name: addForm.name.trim(),
        employee_number: addForm.employee_number.trim(),
        division_id: addForm.division_id,
        employee_type_id: addForm.employee_type_id,
        is_active: true,
      })
      .select(
        `id, employee_number, name, is_active, deactivated_at, deleted_at, divisions(id,name), employee_types(id,code,label)`,
      )
      .single();

    setLoading(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    setEmployees((prev) => [data, ...prev]);
    setAddForm(emptyForm);
    setShowAdd(false);
    showToast(`${data.name} berhasil ditambahkan.`);
  }

  // ── EDIT — lewat API route (PATCH → server-side) ──
  function openEdit(emp: Employee) {
    setEditForm({
      name: emp.name,
      employee_number: emp.employee_number,
      division_id: emp.divisions?.id ?? divisions[0]?.id,
      employee_type_id: emp.employee_types?.id ?? employeeTypes[0]?.id,
    });
    setEditTarget(emp);
  }

  async function handleEdit() {
    if (!editTarget) return;
    setLoading(true);
    try {
      const { data } = await callApi("update", editTarget.id, {
        name: editForm.name.trim(),
        employee_number: editForm.employee_number.trim(),
        division_id: editForm.division_id,
        employee_type_id: editForm.employee_type_id,
      });
      setEmployees((prev) => prev.map((e) => (e.id === data.id ? data : e)));
      setEditTarget(null);
      showToast(`Data ${data.name} berhasil diperbarui.`);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Gagal menyimpan.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  // ── DEACTIVATE / REACTIVATE — lewat API route ──
  async function handleDeactivate(emp: Employee) {
    setLoading(true);
    const newStatus = !emp.is_active;
    try {
      await callApi("update", emp.id, {
        is_active: newStatus,
        deactivated_at: newStatus ? null : new Date().toISOString(),
      });
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === emp.id
            ? {
                ...e,
                is_active: newStatus,
                deactivated_at: newStatus ? null : new Date().toISOString(),
              }
            : e,
        ),
      );
      setDeactivateTarget(null);
      showToast(
        newStatus
          ? `${emp.name} diaktifkan kembali.`
          : `${emp.name} dinonaktifkan.`,
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Gagal mengubah status.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  // ── DELETE — lewat API route ──
  async function handleDelete(emp: Employee) {
    setLoading(true);
    try {
      await callApi("delete", emp.id);
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      setDeleteTarget(null);
      showToast(`${emp.name} dihapus permanen.`);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Gagal menghapus.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  const aktifCount = employees.filter((e) => e.is_active).length;
  const nonaktifCount = employees.filter((e) => !e.is_active).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2
          ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Karyawan</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {aktifCount} aktif · {nonaktifCount} nonaktif
          </p>
        </div>
        <button
          onClick={() => {
            setShowAdd(true);
            setAddForm(emptyForm);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-bold rounded-xl shadow-sm hover:opacity-90 transition cursor-pointer"
        >
          <span className="text-base">＋</span> Tambah Karyawan
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-5">
        {(["aktif", "nonaktif"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setShowTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer capitalize
              ${showTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t} {t === "aktif" ? `(${aktifCount})` : `(${nonaktifCount})`}
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        <input
          placeholder="🔍 Cari nama / ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full sm:w-52"
        />
        <div className="flex gap-1.5 flex-wrap">
          {["ALL", ...divisions.map((d) => d.name)].map((d) => (
            <button
              key={d}
              onClick={() => setFilterDiv(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer
                ${filterDiv === d ? "bg-blue-50 text-blue-600 border-blue-300" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
            >
              {d === "ALL" ? "Semua" : d}
            </button>
          ))}
        </div>
      </div>

      {/* Employee list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-sm">
            Tidak ada karyawan {showTab === "nonaktif" ? "nonaktif" : ""}{" "}
            ditemukan.
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([div, emps]) => (
          <div key={div} className="mb-6">
            <p className="text-[10px] font-extrabold tracking-[2px] text-gray-400 uppercase mb-2">
              {div} ({emps.length})
            </p>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {emps.map((emp, i) => {
                const tc = getTypeColor(emp.employee_types?.code);
                return (
                  <div
                    key={emp.id}
                    className={`flex items-center gap-3 px-4 py-3
                      ${i < emps.length - 1 ? "border-b border-gray-100" : ""}
                      ${!emp.is_active ? "opacity-60" : ""}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl ${tc.bg} flex items-center justify-center text-sm font-extrabold ${tc.text} shrink-0`}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 truncate">
                          {emp.name}
                        </span>
                        {!emp.is_active && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 uppercase tracking-wide">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-mono text-gray-400">
                          {emp.employee_number}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}
                        >
                          {emp.employee_types?.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEdit(emp)}
                        className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center text-sm transition cursor-pointer"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeactivateTarget(emp)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition cursor-pointer
                          ${emp.is_active ? "bg-amber-50 hover:bg-amber-100 text-amber-600" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"}`}
                        title={
                          emp.is_active ? "Nonaktifkan" : "Aktifkan kembali"
                        }
                      >
                        {emp.is_active ? "🔕" : "✅"}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(emp)}
                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center text-sm transition cursor-pointer"
                        title="Hapus permanen"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Modal: Tambah */}
      {showAdd && (
        <Modal title="Tambah Karyawan" onClose={() => setShowAdd(false)}>
          <EmployeeForm
            form={addForm}
            onChange={setAddForm}
            divisions={divisions}
            employeeTypes={employeeTypes}
            onSubmit={handleAdd}
            loading={loading}
            submitLabel="Tambah Karyawan"
          />
        </Modal>
      )}

      {/* Modal: Edit */}
      {editTarget && (
        <Modal
          title={`Edit — ${editTarget.name}`}
          onClose={() => setEditTarget(null)}
        >
          <EmployeeForm
            form={editForm}
            onChange={setEditForm}
            divisions={divisions}
            employeeTypes={employeeTypes}
            onSubmit={handleEdit}
            loading={loading}
            submitLabel="Simpan Perubahan"
          />
        </Modal>
      )}

      {/* Modal: Nonaktifkan */}
      {deactivateTarget && (
        <Modal
          title={
            deactivateTarget.is_active
              ? "Nonaktifkan Karyawan"
              : "Aktifkan Kembali"
          }
          onClose={() => setDeactivateTarget(null)}
        >
          <p className="text-sm text-gray-600 mb-5">
            {deactivateTarget.is_active ? (
              <>
                <strong>Nonaktifkan</strong>{" "}
                <strong>{deactivateTarget.name}</strong>? Karyawan tidak akan
                tampil di jadwal baru.
              </>
            ) : (
              <>
                <strong>Aktifkan kembali</strong>{" "}
                <strong>{deactivateTarget.name}</strong>?
              </>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeactivateTarget(null)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={() => handleDeactivate(deactivateTarget)}
              disabled={loading}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60 cursor-pointer
                ${deactivateTarget.is_active ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
            >
              {loading
                ? "..."
                : deactivateTarget.is_active
                  ? "Nonaktifkan"
                  : "Aktifkan"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Hapus */}
      {deleteTarget && (
        <Modal title="Hapus Permanen" onClose={() => setDeleteTarget(null)}>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">
              ⚠️ Peringatan
            </p>
            <p className="text-sm text-red-600">
              Aksi ini <strong>tidak bisa dibatalkan</strong>.
            </p>
          </div>
          <p className="text-sm text-gray-600 mb-5">
            Hapus <strong>{deleteTarget.name}</strong> (
            {deleteTarget.employee_number}) secara permanen?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={() => handleDelete(deleteTarget)}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Menghapus..." : "Hapus Permanen"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
