"use client";

import { useEffect, useMemo, useState } from "react";
import Toast, { ToastType } from "@/components/ui/Toast";

type ProveedorRow = {
  id_proveedor: string;
  nombre: string;
  cuit: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  created_at: string;
};

type FormState = {
  id_proveedor?: string;
  nombre: string;
  cuit: string;
  telefono: string;
  email: string;
  activo: boolean;
};

const emptyForm: FormState = {
  nombre: "",
  cuit: "",
  telefono: "",
  email: "",
  activo: true,
};

function formatDate(s: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("es-AR");
}

function Chip({ children, tone }: { children: React.ReactNode; tone: "emerald" | "rose" }) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : "bg-rose-50 text-rose-700 border-rose-100";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}

export default function ProveedoresPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProveedorRow[]>([]);
  const [total, setTotal] = useState(0);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(emptyForm);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  function toast(message: string, type: ToastType = "info") {
    setToastMsg(message);
    setToastType(type);
    setToastOpen(true);
  }

  async function load() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      sp.set("page", String(page));
      sp.set("pageSize", String(pageSize));

      const res = await fetch(`/api/proveedores/list?${sp.toString()}`);
      const j = await res.json();

      if (!res.ok) throw new Error(j?.error ?? "Error listando proveedores");

      setRows(j.data ?? []);
      setTotal(j.total ?? 0);
    } catch (e: any) {
      toast(e?.message ?? "Error", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function openCreate() {
    setMode("create");
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: ProveedorRow) {
    setMode("edit");
    setForm({
      id_proveedor: p.id_proveedor,
      nombre: p.nombre,
      cuit: p.cuit ?? "",
      telefono: p.telefono ?? "",
      email: p.email ?? "",
      activo: p.activo,
    });
    setOpen(true);
  }

  async function save() {
    try {
      if (!form.nombre) {
        toast("El nombre es obligatorio.", "error");
        return;
      }

      if (mode === "create") {
        const res = await fetch("/api/proveedores/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre,
            cuit: form.cuit || null,
            telefono: form.telefono || null,
            email: form.email || null,
            activo: form.activo,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? "Error creando proveedor");

        toast("Proveedor creado.", "success");
      } else {
        const res = await fetch(`/api/proveedores/update/${form.id_proveedor}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre,
            cuit: form.cuit || null,
            telefono: form.telefono || null,
            email: form.email || null,
            activo: form.activo,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? "Error actualizando proveedor");

        toast("Cambios guardados.", "success");
      }

      setOpen(false);
      await load();
    } catch (e: any) {
      toast(e?.message ?? "Error", "error");
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar proveedor definitivamente?")) return;

    const res = await fetch(`/api/proveedores/delete/${id}`, { method: "DELETE" });
    const j = await res.json();

    if (!res.ok) {
      toast(j?.error ?? "Error eliminando proveedor", "error");
      return;
    }

    toast("Proveedor eliminado.", "success");
    await load();
  }

  async function toggleActivo(p: ProveedorRow) {
    const res = await fetch(`/api/proveedores/update/${p.id_proveedor}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !p.activo }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast(j?.error ?? "Error actualizando proveedor", "error");
      return;
    }
    toast(p.activo ? "Proveedor desactivado." : "Proveedor activado.", "success");
    await load();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />

      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  P
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Proveedores</h1>
                  <p className="text-sm text-slate-500">
                    Gestión de proveedores
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative">
                <input
                  className="w-full sm:w-[360px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  placeholder="Buscar por nombre, CUIT, email o teléfono…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPage(1);
                      load();
                    }
                  }}
                />
                <span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">⌕</span>
              </div>

              <button
                onClick={() => {
                  setPage(1);
                  load();
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Buscar
              </button>

              <button
                onClick={openCreate}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                + Nuevo
              </button>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="text-sm text-slate-600">
              {loading ? "Cargando…" : <>Mostrando <span className="font-medium text-slate-800">{rows.length}</span> de <span className="font-medium text-slate-800">{total}</span></>}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ←
              </button>
              <div className="text-sm text-slate-600">
                Página <span className="font-medium text-slate-800">{page}</span> /{" "}
                <span className="font-medium text-slate-800">{pages}</span>
              </div>
              <button
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                →
              </button>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="p-4 font-medium">Nombre</th>
                  <th className="p-4 font-medium">CUIT</th>
                  <th className="p-4 font-medium">Teléfono</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Estado</th>
                  <th className="p-4 font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-slate-500">
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-slate-500">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => (
                    <tr key={p.id_proveedor} className="hover:bg-slate-50/60 transition">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{p.nombre}</div>
                      </td>
                      <td className="p-4 text-slate-700">{p.cuit || "-"}</td>
                      <td className="p-4 text-slate-700">{p.telefono || "-"}</td>
                      <td className="p-4 text-slate-700">{p.email || "-"}</td>
                      <td className="p-4">
                        {p.activo ? <Chip tone="emerald">Activo</Chip> : <Chip tone="rose">Inactivo</Chip>}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                            onClick={() => openEdit(p)}
                          >
                            Editar
                          </button>

                          <button
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                            onClick={() => toggleActivo(p)}
                          >
                            {p.activo ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100"
                            onClick={() => remove(p.id_proveedor)}
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {open && (
          <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {mode === "create" ? "Crear proveedor" : "Editar proveedor"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {mode === "create"
                        ? "Ingresá los datos del nuevo proveedor."
                        : "Actualizá los datos del proveedor."}
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nombre" required>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                                 text-slate-900 placeholder:text-slate-500
                                 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                      value={form.nombre}
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                      placeholder="ej: Distribuidora XYZ S.A."
                    />
                  </Field>

                  <Field label="CUIT/CUIL">
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                                 text-slate-900 placeholder:text-slate-500
                                 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                      value={form.cuit}
                      onChange={(e) => setForm((f) => ({ ...f, cuit: e.target.value }))}
                      placeholder="ej: 20-12345678-9"
                    />
                  </Field>

                  <Field label="Teléfono">
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                                 text-slate-900 placeholder:text-slate-500
                                 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                      value={form.telefono}
                      onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                      placeholder="ej: 11-1234-5678"
                    />
                  </Field>

                  <Field label="Email">
                    <input
                      type="email"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                                 text-slate-900 placeholder:text-slate-500
                                 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="ej: contacto@proveedor.com"
                    />
                  </Field>



                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={form.activo}
                        onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-900">Proveedor activo</div>
                        <div className="text-xs text-slate-500">Si está desactivado, no aparecerá en selecciones.</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={save}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-700">{label}</label>
        {required ? <span className="text-[11px] text-rose-600">obligatorio</span> : null}
      </div>
      {children}
    </div>
  );
}
