"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import Toast, { ToastType } from "@/components/ui/Toast";

const ROLE_ID_DUENO = 'becb28f7-2cb0-46c7-8fff-86e4ba8f2f68';
const ROLE_ID_SUPERADMIN = 'b6bd71da-9208-4bd6-831a-dec53635913d';

type Caja = {
    id_caja: string;
    nombre: string;
    activa: boolean;
    id_sede: string;
    sedes?: { nombre: string };
};

type Sede = { id_sede: string; nombre: string };

export default function ConfigCajasPage() {
    const { user } = useSession();
    const [cajas, setCajas] = useState<Caja[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");

    // Modal state
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [form, setForm] = useState({ id_caja: "", nombre: "", activa: true, id_sede: "" });

    // Toast state
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMsg, setToastMsg] = useState("");
    const [toastType, setToastType] = useState<ToastType>("info");

    const currentUserSede = user?.id_sede;
    const canViewAllSedes = (user as any)?.id_rol === ROLE_ID_SUPERADMIN || (user as any)?.id_rol === ROLE_ID_DUENO;

    const [filterSede, setFilterSede] = useState("");

    useEffect(() => {
        fetchMeta();
    }, []);

    useEffect(() => {
        // If user CANNOT view all, force their sede
        if (currentUserSede && !canViewAllSedes) {
            setFilterSede(currentUserSede);
        }
        // If they CAN view all, leave it empty (Todas)
    }, [currentUserSede, canViewAllSedes]);

    useEffect(() => {
        fetchCajas();
    }, [filterSede]); // Fetch when filter changes

    function showToast(msg: string, type: ToastType) {
        setToastMsg(msg);
        setToastType(type);
        setToastOpen(true);
    }

    async function fetchMeta() {
        try {
            const res = await fetch("/api/sedes/list");
            const json = await res.json();
            if (res.ok) setSedes(json.data || []);
        } catch (e) { console.error(e); }
    }

    async function fetchCajas() {
        setLoading(true);
        try {
            // If user has permission, maybe fetch ALL? For now fetching by session sede
            // If we want to see ALL, we might need to adjust API. Assuming admin wants to see "current sede" or "all if superadmin".
            // Let's rely on params.
            let url = "/api/cajas";
            if (filterSede) url += `?id_sede=${filterSede}`;
            
            const res = await fetch(url);
            const json = await res.json();
            if (res.ok) setCajas(json);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const filteredCajas = cajas.filter(c => 
        c.nombre.toLowerCase().includes(q.toLowerCase())
    );

    // ...

    function openCreate() {
        setMode("create");
        setForm({ id_caja: "", nombre: "", activa: true, id_sede: currentUserSede || "" });
        setOpen(true);
    }

    function openEdit(caja: Caja) {
        setMode("edit");
        setForm({ id_caja: caja.id_caja, nombre: caja.nombre, activa: caja.activa, id_sede: caja.id_sede });
        setOpen(true);
    }

    async function save() {
        if (!form.nombre.trim()) {
            showToast("El nombre es obligatorio", "error");
            return;
        }
        if (!form.id_sede) {
            showToast("La sede es obligatoria", "error");
            return;
        }

        try {
            const method = mode === "create" ? "POST" : "PUT";
            const body: any = { id_sede: form.id_sede, nombre: form.nombre, activa: form.activa };
            if (mode === "edit") body.id_caja = form.id_caja;

            const res = await fetch("/api/cajas", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                showToast(mode=== "create" ? "Caja creada" : "Caja actualizada", "success");
                fetchCajas();
                setOpen(false);
            } else {
                const json = await res.json();
                showToast(json.error || "Error al guardar", "error");
            }
        } catch (e: any) { 
            console.error(e);
            showToast(e.message || "Error al guardar", "error");
        }
    }

    async function eliminarCaja(id: string) {
        if (!confirm("¿Seguro que querés eliminar esta caja?")) return;
        try {
            const res = await fetch(`/api/cajas?id_caja=${id}`, { method: "DELETE" });
            if (res.ok) {
                showToast("Caja eliminada", "success");
                fetchCajas();
            } else {
                showToast("No se pudo eliminar (quizás tiene uso)", "error");
            }
        } catch (e) { console.error(e); }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />
            
            <div className="max-w-4xl mx-auto space-y-6">
                 {/* Header & Search */}
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <Link href="/caja" className="p-2 hover:bg-slate-200 rounded-full transition">
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Cajas</h1>
                            <p className="text-sm text-slate-500">Administrá las cajas de tu sede</p>
                        </div>
                     </div>
                     
                     <div className="flex gap-2">
                         <div className="relative">
                            <input 
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder="Buscar caja..."
                                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-black focus:outline-none focus:ring-2 focus:ring-indigo-100 w-full sm:w-64"
                            />
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                         </div>
                         
                        {canViewAllSedes && (
                            <select
                                value={filterSede}
                                onChange={e => setFilterSede(e.target.value)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none"
                            >
                                <option value="">Todas las Sedes</option>
                                {sedes.map(s => <option key={s.id_sede} value={s.id_sede}>{s.nombre}</option>)}
                            </select>
                        )}

                         <button 
                            onClick={openCreate}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm"
                         >
                             <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nueva Caja</span>
                         </button>
                     </div>
                 </div>

                 {/* Table */}
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                     <table className="w-full text-left">
                         <thead className="bg-slate-50 border-b border-slate-200">
                             <tr>
                                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Sede</th>
                                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Acciones</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {loading ? (
                                 <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Cargando...</td></tr>
                             ) : filteredCajas.length === 0 ? (
                                 <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No se encontraron cajas.</td></tr>
                             ) : (
                                 filteredCajas.map(c => (
                                     <tr key={c.id_caja} className="hover:bg-slate-50 transition">
                                         <td className="px-6 py-4 text-slate-900 font-medium">
                                             {c.nombre}
                                         </td>
                                         <td className="px-6 py-4 text-slate-600 text-sm">
                                             {c.sedes?.nombre || "-"}
                                         </td>
                                         <td className="px-6 py-4">
                                             <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.activa ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                 {c.activa ? "ACTIVA" : "INACTIVA"}
                                             </span>
                                         </td>
                                         <td className="px-6 py-4 text-right flex justify-end gap-2">
                                             <button 
                                                onClick={() => openEdit(c)}
                                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                                             >
                                                 Editar
                                             </button>
                                             <button 
                                                onClick={() => eliminarCaja(c.id_caja)}
                                                className="px-3 py-1.5 rounded-lg border border-rose-100 bg-rose-50 text-sm font-medium text-rose-600 hover:bg-rose-100 transition"
                                             >
                                                 <Trash2 className="h-4 w-4" />
                                             </button>
                                         </td>
                                     </tr>
                                 ))
                             )}
                         </tbody>
                     </table>
                 </div>

                 {/* Modal */}
                 {open && (
                    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    {mode === "create" ? "Nueva Caja" : "Editar Caja"}
                                </h2>
                                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                    <input 
                                        autoFocus
                                        value={form.nombre}
                                        onChange={e => setForm({...form, nombre: e.target.value})}
                                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none"
                                        placeholder="Ej: Caja Principal"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sede</label>
                                    <select
                                        value={form.id_sede}
                                        onChange={e => setForm({...form, id_sede: e.target.value})}
                                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    >
                                        <option value="">Seleccionar Sede...</option>
                                        {sedes.map(s => <option key={s.id_sede} value={s.id_sede}>{s.nombre}</option>)}
                                    </select>
                                </div>
                                
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={form.activa}
                                        onChange={e => setForm({...form, activa: e.target.checked})}
                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">Caja Activa</div>
                                        <div className="text-xs text-slate-500">Desactivala para ocultarla en el selector.</div>
                                    </div>
                                </label>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                                <button 
                                    onClick={() => setOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-white transition"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={save}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm font-medium"
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
