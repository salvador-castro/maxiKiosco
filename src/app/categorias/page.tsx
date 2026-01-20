"use client";

import { useEffect, useMemo, useState } from "react";
import Toast, { ToastType } from "@/components/ui/Toast";

type CategoriaRow = {
  id_categoria: string;
  nombre: string;
  activa: boolean;
};

type FormState = {
  id_categoria?: string;
  nombre: string;
  activa: boolean;
};

const emptyForm: FormState = {
  nombre: "",
  activa: true,
};

function Chip({ children, tone }: { children: React.ReactNode; tone: "emerald" | "rose" }) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : "bg-rose-50 text-rose-700 border-rose-100";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}

export default function CategoriasPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CategoriaRow[]>([]);
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
      sp.set("page", String(page));
      sp.set("pageSize", String(pageSize));

      const res = await fetch(`/api/categorias/list?${sp.toString()}`);
      const j = await res.json();

      if (!res.ok) throw new Error(j?.error ?? "Error listando categorías");

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

  function openEdit(c: CategoriaRow) {
    setMode("edit");
    setForm({
      id_categoria: c.id_categoria,
      nombre: c.nombre,
      activa: c.activa,
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
        const res = await fetch("/api/categorias/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre,
            activa: form.activa,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? "Error creando categoría");

        toast("Categoría creada.", "success");
      } else {
        const res = await fetch(`/api/categorias/update/${form.id_categoria}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre,
            activa: form.activa,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? "Error actualizando categoría");

        toast("Cambios guardados.", "success");
      }

      setOpen(false);
      await load();
    } catch (e: any) {
      toast(e?.message ?? "Error", "error");
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar categoría definitivamente?")) return;

    const res = await fetch(`/api/categorias/delete/${id}`, { method: "DELETE" });
    const j = await res.json();

    if (!res.ok) {
      toast(j?.error ?? "Error eliminando categoría", "error");
      return;
    }

    toast("Categoría eliminada.", "success");
    await load();
  }

  async function toggleActiva(c: CategoriaRow) {
    const res = await fetch(`/api/categorias/update/${c.id_categoria}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !c.activa }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast(j?.error ?? "Error actualizando categoría", "error");
      return;
    }
    toast(c.activa ? "Categoría desactivada." : "Categoría activada.", "success");
    await load();
  }

  const filteredRows = q.trim()
    ? rows.filter((r) => r.nombre.toLowerCase().includes(q.toLowerCase()))
    : rows;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />

      <div className="mx-auto max-w-5xl p-6 space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  C
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Categorías</h1>
                  <p className="text-sm text-slate-500">Gestión de categorías de productos</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative">
                <input
                  className="w-full sm:w-[280px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                  placeholder="Buscar categoría…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">⌕</span>
              </div>

              <button
                onClick={openCreate}
                className="rounded-xl bg-purple-600 px-4 py-2.5 text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-200"
              >
                + Nueva
              </button>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="text-sm text-slate-600">
              {loading ? "Cargando…" : <>Mostrando <span className="font-medium text-slate-800">{filteredRows.length}</span> de <span className="font-medium text-slate-800">{total}</span></>}
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
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-center">
                  <th className="p-4 font-medium">Nombre</th>
                  <th className="p-4 font-medium">Estado</th>
                  <th className="p-4 font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-slate-500">
                      Cargando…
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-slate-500">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((c) => (
                    <tr key={c.id_categoria} className="hover:bg-slate-50/60 transition text-center">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{c.nombre}</div>
                      </td>
                      <td className="p-4">
                        {c.activa ? <Chip tone="emerald">Activa</Chip> : <Chip tone="rose">Inactiva</Chip>}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2 justify-center">
                          <button
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                            onClick={() => openEdit(c)}
                          >
                            Editar
                          </button>

                          <button
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                            onClick={() => toggleActiva(c)}
                          >
                            {c.activa ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100"
                            onClick={() => remove(c.id_categoria)}
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
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {mode === "create" ? "Crear categoría" : "Editar categoría"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {mode === "create"
                        ? "Ingresá el nombre de la nueva categoría."
                        : "Actualizá los datos de la categoría."}
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
                <Field label="Nombre" required>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                               text-slate-900 placeholder:text-slate-500
                               outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="ej: Bebidas"
                  />
                </Field>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.activa}
                    onChange={(e) => setForm((f) => ({ ...f, activa: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 accent-purple-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Categoría activa</div>
                    <div className="text-xs text-slate-500">Si está desactivada, no aparecerá en selecciones.</div>
                  </div>
                </label>
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
                  className="rounded-xl bg-purple-600 px-4 py-2.5 text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-200"
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
