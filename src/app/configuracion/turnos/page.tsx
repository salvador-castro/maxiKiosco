"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import Toast, { ToastType } from "@/components/ui/Toast";

type Turno = {
    id_turno: string;
    nombre: string;
    id_sede: string;
    hora_inicio: string;
    hora_fin: string;
    activo: boolean; // Note: 'activo' (singular) as per schema
    sedes?: { nombre: string };
};

const ROLE_ID_DUENO = 'becb28f7-2cb0-46c7-8fff-86e4ba8f2f68';
const ROLE_ID_SUPERADMIN = 'b6bd71da-9208-4bd6-831a-dec53635913d';

type Sede = { id_sede: string; nombre: string };

export default function ConfigTurnosPage() {
    const { user } = useSession();
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");

    // Modal state
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [form, setForm] = useState({ 
        id_turno: "", 
        nombre: "", 
        id_sede: "", 
        hora_inicio: "", 
        hora_fin: "", 
        activo: true 
    });

    // Toast state
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMsg, setToastMsg] = useState("");
    const [toastType, setToastType] = useState<ToastType>("info");

    const currentUserSede = user?.id_sede;
    // Cast user to any to access id_rol since it's missing in the type definition but present in runtime
    const canViewAllSedes = (user as any)?.id_rol === ROLE_ID_SUPERADMIN || (user as any)?.id_rol === ROLE_ID_DUENO;

    const [filterSede, setFilterSede] = useState("");

    useEffect(() => {
        fetchMeta();
    }, []);

    useEffect(() => {
        if (currentUserSede && !canViewAllSedes) {
            setFilterSede(currentUserSede);
        }
        // If they CAN view all, leave it empty (Todas)
    }, [currentUserSede, canViewAllSedes]);

    useEffect(() => {
        fetchTurnos();
    }, [filterSede]);

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

    async function fetchTurnos() {
        setLoading(true);
        try {
             let url = "/api/turnos";
            if (filterSede) url += `?id_sede=${filterSede}`;

            const res = await fetch(url);
            const json = await res.json();
            if (res.ok) setTurnos(json);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const filteredTurnos = turnos.filter(t => 
        t.nombre.toLowerCase().includes(q.toLowerCase())
    );

    function openCreate() {
        setMode("create");
        setForm({ 
            id_turno: "", 
            nombre: "", 
            id_sede: currentUserSede || "", 
            hora_inicio: "08:00", 
            hora_fin: "16:00", 
            activo: true 
        });
        setOpen(true);
    }

    function openEdit(turno: Turno) {
        setMode("edit");
        setForm({ 
            id_turno: turno.id_turno, 
            nombre: turno.nombre, 
            id_sede: turno.id_sede, 
            hora_inicio: turno.hora_inicio, 
            hora_fin: turno.hora_fin, 
            activo: turno.activo 
        });
        setOpen(true);
    }

    async function save() {
        if (!form.nombre.trim()) return showToast("Nombre obligatorio", "error");
        if (!form.id_sede) return showToast("Sede obligatoria", "error");
        if (!form.hora_inicio || !form.hora_fin) return showToast("Horarios obligatorios", "error");

        try {
            const method = mode === "create" ? "POST" : "PUT";
            const body: any = { 
                id_sede: form.id_sede, 
                nombre: form.nombre, 
                hora_inicio: form.hora_inicio,
                hora_fin: form.hora_fin,
                activo: form.activo 
            };
            if (mode === "edit") body.id_turno = form.id_turno;

            const res = await fetch("/api/turnos", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                showToast(mode=== "create" ? "Turno creado" : "Turno actualizado", "success");
                fetchTurnos();
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

    async function eliminarTurno(id: string) {
        if (!confirm("¿Seguro que querés eliminar este turno?")) return;
        try {
            const res = await fetch(`/api/turnos?id_turno=${id}`, { method: "DELETE" });
            if (res.ok) {
                showToast("Turno eliminado", "success");
                fetchTurnos();
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
                            <h1 className="text-2xl font-bold text-slate-900">Turnos</h1>
                            <p className="text-sm text-slate-500">Administrá los turnos de tu sede</p>
                        </div>
                     </div>
                     
                     <div className="flex gap-2">
                         <div className="relative">
                            <input 
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder="Buscar turno..."
                                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 w-full sm:w-64"
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
                             <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nuevo Turno</span>
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
                                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Horario</th>
                                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Acciones</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {loading ? (
                                 <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Cargando...</td></tr>
                             ) : filteredTurnos.length === 0 ? (
                                 <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No se encontraron turnos.</td></tr>
                             ) : (
                                 filteredTurnos.map(t => (
                                     <tr key={t.id_turno} className="hover:bg-slate-50 transition">
                                         <td className="px-6 py-4 text-slate-900 font-medium">{t.nombre}</td>
                                         <td className="px-6 py-4 text-slate-600 text-sm">{t.sedes?.nombre || "-"}</td>
                                         <td className="px-6 py-4 text-slate-600 text-sm">
                                             {t.hora_inicio} - {t.hora_fin}
                                         </td>
                                         <td className="px-6 py-4">
                                             <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                 {t.activo ? "ACTIVO" : "INACTIVO"}
                                             </span>
                                         </td>
                                         <td className="px-6 py-4 text-right flex justify-end gap-2">
                                             <button 
                                                onClick={() => openEdit(t)}
                                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                                             >
                                                 Editar
                                             </button>
                                             <button 
                                                onClick={() => eliminarTurno(t.id_turno)}
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
                                    {mode === "create" ? "Nuevo Turno" : "Editar Turno"}
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
                                        placeholder="Ej: Mañana"
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Hora Inicio</label>
                                        <input 
                                            type="time"
                                            value={form.hora_inicio}
                                            onChange={e => setForm({...form, hora_inicio: e.target.value})}
                                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Hora Fin</label>
                                        <input 
                                            type="time"
                                            value={form.hora_fin}
                                            onChange={e => setForm({...form, hora_fin: e.target.value})}
                                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 outline-none"
                                        />
                                    </div>
                                </div>
                                
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={form.activo}
                                        onChange={e => setForm({...form, activo: e.target.checked})}
                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">Turno Activo</div>
                                        <div className="text-xs text-slate-500">Desactivalo para ocultarlo en el selector.</div>
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
