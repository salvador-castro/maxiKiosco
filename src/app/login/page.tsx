"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSession } from "@/lib/auth/session";

const ROLE_ID_DUENO = "becb28f7-2cb0-46c7-8fff-86e4ba8f2f68";
const ROLE_ID_SUPERADMIN = "b6bd71da-9208-4bd6-831a-dec53635913d";

function normalize(s: unknown) {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function isAdminLike(user: any) {
  const id = String(user?.id_rol ?? user?.rol_id ?? user?.rol?.id_rol ?? "").trim();
  const name = normalize(user?.rol?.nombre ?? user?.rol ?? user?.role ?? "");
  const levelRaw = user?.rol?.nivel ?? user?.nivel ?? null;
  const level = typeof levelRaw === "number" ? levelRaw : Number(levelRaw ?? 0) || 0;

  return (
    id === ROLE_ID_SUPERADMIN ||
    id === ROLE_ID_DUENO ||
    name === "superadmin" ||
    name === "dueno" ||
    level >= 30
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const j = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(j?.error ?? "No se pudo iniciar sesión");
      }

      const user = j?.user;
      if (!user) {
        throw new Error("Login OK pero no vino user en la respuesta.");
      }

      setSession({
        access_token: "cookie",
        user,
      });

      if (isAdminLike(user)) router.replace("/dashboard/");
      else router.replace("/ventas");
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white flex items-start justify-center pt-12 pb-6 px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <img 
            src="https://kxaygskhpuykrtysklim.supabase.co/storage/v1/object/public/logo/logo.png" 
            alt="MaxiKiosco Logo" 
            className="h-24 w-auto"
          />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <h1 className="text-xl font-semibold text-slate-900">Iniciar sesión</h1>
        <p className="text-sm text-slate-500 mt-1">Acceso a MaxiKiosco</p>

        {err && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 text-sm">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Username</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                         text-slate-900 placeholder:text-slate-500
                         outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej: admin"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                         text-slate-900 placeholder:text-slate-500
                         outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-white shadow-sm
                       hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-indigo-200"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
