"use client";

import { useEffect, useMemo, useState } from "react";
import Toast, { ToastType } from "@/components/ui/Toast";

type Rol = { id_rol: string; nombre: string; nivel: number };
type Sede = { id_sede: string; nombre: string };

type UsuarioRow = {
  id_usuario: string;
  username: string;
  nombre: string;
  apellido: string;
  email: string | null;
  activo: boolean;
  created_at: string;
  last_login_at: string | null;
  id_rol: string;
  id_sede: string;
  roles: { nombre: string; nivel: number } | null;
  sedes: { nombre: string } | null;
};

type FormState = {
  id_usuario?: string;
  username: string;
  password?: string; // create / reset
  nombre: string;
  apellido: string;
  email: string;
  id_rol: string;
  id_sede: string;
  activo: boolean;
};

const emptyForm: FormState = {
  username: "",
  password: "",
  nombre: "",
  apellido: "",
  email: "",
  id_rol: "",
  id_sede: "",
  activo: true,
};

function formatDate(s: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("es-AR");
}

function initials(nombre: string, apellido: string) {
  const a = (nombre?.[0] ?? "").toUpperCase();
  const b = (apellido?.[0] ?? "").toUpperCase();
  return `${a}${b}` || "U";
}

function Chip({ children, tone }: { children: React.ReactNode; tone: "indigo" | "emerald" | "slate" | "rose" }) {
  const cls =
    tone === "indigo"
      ? "bg-indigo-50 text-indigo-700 border-indigo-100"
      : tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "rose"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : "bg-slate-50 text-slate-700 border-slate-100";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}

export default function UsuariosPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UsuarioRow[]>([]);
  const [total, setTotal] = useState(0);

  const [roles, setRoles] = useState<Rol[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(emptyForm);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");

  const [me, setMe] = useState<{ username: string; rol_nombre: string } | null>(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  function toast(message: string, type: ToastType = "info") {
    setToastMsg(message);
    setToastType(type);
    setToastOpen(true);
  }

  async function loadMeta() {
  const fetchJson = async (url: string) => {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include", // asegura cookie mk_token
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${url} -> ${res.status} ${json?.error ?? ""}`.trim());
    return json;
  };

  try {
    const [rolesRes, sedesRes, meRes] = await Promise.all([
      fetchJson("/api/roles/list"),
      fetchJson("/api/sedes/list"),
      fetchJson("/api/auth/me"),
    ]);

    setRoles(rolesRes.data ?? []);
    setSedes(sedesRes.data ?? []);
    setMe(meRes.user ?? null);

    // Si querés, seteo defaults cuando abre create:
    // (esto igual lo haces en openCreate)
  } catch (e: any) {
    toast(e?.message ?? "Error cargando roles/sedes", "error");
  }
}

  async function load() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      sp.set("page", String(page));
      sp.set("pageSize", String(pageSize));

      const res = await fetch(`/api/usuarios/list?${sp.toString()}`);
      const j = await res.json();

      if (!res.ok) throw new Error(j?.error ?? "Error listando usuarios");

      setRows(j.data ?? []);
      setTotal(j.total ?? 0);
    } catch (e: any) {
      toast(e?.message ?? "Error", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function openCreate() {
    setMode("create");
    setForm({
      ...emptyForm,
      id_rol: roles[0]?.id_rol ?? "",
      id_sede: sedes[0]?.id_sede ?? "",
      activo: true,
    });
    setOpen(true);
  }

  function openEdit(u: UsuarioRow) {
    setMode("edit");
    setForm({
      id_usuario: u.id_usuario,
      username: u.username,
      password: "",
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email ?? "",
      id_rol: u.id_rol,
      id_sede: u.id_sede,
      activo: u.activo,
    });
    setOpen(true);
  }

  async function save() {
    try {
      if (!form.username || !form.nombre || !form.apellido || !form.id_rol || !form.id_sede) {
        toast("Completá los campos obligatorios.", "error");
        return;
      }

      if (mode === "create" && (!form.password || form.password.length < 6)) {
        toast("La contraseña debe tener al menos 6 caracteres.", "error");
        return;
      }

      if (mode === "create") {
        const res = await fetch("/api/usuarios/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username,
            password: form.password,
            nombre: form.nombre,
            apellido: form.apellido,
            email: form.email ? form.email : null,
            id_rol: form.id_rol,
            id_sede: form.id_sede,
            activo: form.activo,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? "Error creando usuario");

        toast("Usuario creado.", "success");
      } else {
        const res = await fetch(`/api/usuarios/update/${form.id_usuario}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username,
            ...(form.password ? { password: form.password } : {}),
            nombre: form.nombre,
            apellido: form.apellido,
            email: form.email ? form.email : null,
            id_rol: form.id_rol,
            id_sede: form.id_sede,
            activo: form.activo,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? "Error actualizando usuario");

        toast("Cambios guardados.", "success");
      }

      setOpen(false);
      await load();
    } catch (e: any) {
      toast(e?.message ?? "Error", "error");
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar usuario definitivamente?")) return;

    const res = await fetch(`/api/usuarios/delete/${id}`, { method: "DELETE" });
    const j = await res.json();

    if (!res.ok) {
      toast(j?.error ?? "Error eliminando usuario", "error");
      return;
    }

    toast("Usuario eliminado.", "success");
    await load();
  }

  async function toggleActivo(u: UsuarioRow) {
    const res = await fetch(`/api/usuarios/update/${u.id_usuario}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !u.activo }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast(j?.error ?? "Error actualizando usuario", "error");
      return;
    }
    toast(u.activo ? "Usuario desactivado." : "Usuario activado.", "success");
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
                <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  U
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Usuarios</h1>
                  <p className="text-sm text-slate-500">
                    Gestión de usuarios por sede y rol
                    {me ? (
                      <>
                        {" "}· Sesión: <span className="font-medium text-slate-700">{me.username}</span>{" "}
                        <span className="text-slate-400">({me.rol_nombre})</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative">
                <input
                  className="w-full sm:w-[360px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Buscar por username, nombre, apellido o email…"
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
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
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
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="p-4 font-medium">Usuario</th>
                  <th className="p-4 font-medium">Rol</th>
                  <th className="p-4 font-medium">Sede</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Estado</th>
                  <th className="p-4 font-medium">Último login</th>
                  <th className="p-4 font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-slate-500">
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-slate-500">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr key={u.id_usuario} className="hover:bg-slate-50/60 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                            {initials(u.nombre, u.apellido)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{u.username}</div>
                            <div className="text-xs text-slate-500">{u.apellido}, {u.nombre}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        {u.roles?.nombre ? (
                          <Chip tone={u.roles.nombre === "superadmin" ? "indigo" : "slate"}>
                            {u.roles.nombre}
                          </Chip>
                        ) : (
                          <Chip tone="slate">-</Chip>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="text-slate-700">{u.sedes?.nombre ?? "-"}</span>
                      </td>

                      <td className="p-4">
                        <span className="text-slate-700">{u.email ?? "-"}</span>
                      </td>

                      <td className="p-4">
                        {u.activo ? <Chip tone="emerald">Activo</Chip> : <Chip tone="rose">Inactivo</Chip>}
                      </td>

                      <td className="p-4 text-slate-600">
                        {formatDate(u.last_login_at)}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                            onClick={() => openEdit(u)}
                          >
                            Editar
                          </button>

                          <button
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                            onClick={() => toggleActivo(u)}
                          >
                            {u.activo ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100"
                            onClick={() => remove(u.id_usuario)}
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
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {mode === "create" ? "Crear usuario" : "Editar usuario"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {mode === "create"
                        ? "Cargá datos básicos, rol y sede."
                        : "Actualizá datos. La contraseña solo si querés cambiarla."}
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
    <Field label="Username" required>
      <input
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                   text-slate-900 placeholder:text-slate-500
                   outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
        value={form.username}
        onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
        placeholder="ej: juan.perez"
      />
    </Field>

    <Field
      label={mode === "create" ? "Password" : "Password (opcional)"}
      required={mode === "create"}
    >
      <input
        type="password"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                   text-slate-900 placeholder:text-slate-500
                   outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
        value={form.password ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        placeholder={mode === "create" ? "mínimo 6 caracteres" : "dejar vacío para no cambiar"}
      />
    </Field>

    <Field label="Nombre" required>
      <input
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                   text-slate-900 placeholder:text-slate-500
                   outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
        value={form.nombre}
        onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
        placeholder="ej: Juan"
      />
    </Field>

    <Field label="Apellido" required>
      <input
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                   text-slate-900 placeholder:text-slate-500
                   outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
        value={form.apellido}
        onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
        placeholder="ej: Pérez"
      />
    </Field>

    <Field label="Email (opcional)">
      <input
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                   text-slate-900 placeholder:text-slate-500
                   outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        placeholder="ej: usuario@mail.com"
      />
    </Field>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
      <Field label="Rol" required>
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                     text-slate-900
                     outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          value={form.id_rol}
          onChange={(e) => setForm((f) => ({ ...f, id_rol: e.target.value }))}
        >
          <option value="" disabled>
            Seleccionar…
          </option>
          {roles.map((r) => (
            <option key={r.id_rol} value={r.id_rol}>
              {r.nombre} (nivel {r.nivel})
            </option>
          ))}
        </select>
      </Field>

      <Field label="Sede" required>
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                     text-slate-900
                     outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          value={form.id_sede}
          onChange={(e) => setForm((f) => ({ ...f, id_sede: e.target.value }))}
        >
          <option value="" disabled>
            Seleccionar…
          </option>
          {sedes.map((s) => (
            <option key={s.id_sede} value={s.id_sede}>
              {s.nombre}
            </option>
          ))}
        </select>
      </Field>
    </div>

    <div className="sm:col-span-2">
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          type="checkbox"
          checked={form.activo}
          onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
          className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
        />
        <div>
          <div className="text-sm font-medium text-slate-900">Usuario activo</div>
          <div className="text-xs text-slate-500">Si está desactivado, no podrá iniciar sesión.</div>
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
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
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
