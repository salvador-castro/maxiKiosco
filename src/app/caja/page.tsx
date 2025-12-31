"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { formatCurrency } from "@/utils/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function CajaPage() {
    const { user } = useSession();
    const [loading, setLoading] = useState(true);
    const [sesion, setSesion] = useState<any>(null);
    const [montoInicial, setMontoInicial] = useState("");
    const [montoFinal, setMontoFinal] = useState("");
    const [error, setError] = useState("");
    const [msg, setMsg] = useState("");

    // Selection states
    const [cajas, setCajas] = useState<any[]>([]);
    const [turnos, setTurnos] = useState<any[]>([]);
    const [selectedCaja, setSelectedCaja] = useState("");
    const [selectedTurno, setSelectedTurno] = useState("");

    const id_sede = user?.id_sede;

    useEffect(() => {
        if (id_sede) {
            fetchSession();
            fetchInfo();
        }
    }, [id_sede]);

    async function fetchInfo() {
        try {
            const res = await fetch(`/api/caja/info?id_sede=${id_sede}`);
            const json = await res.json();
            if (res.ok) {
                setCajas(json.cajas || []);
                setTurnos(json.turnos || []);
                // Pre-select if only one
                if (json.cajas?.length === 1) setSelectedCaja(json.cajas[0].id_caja);
                if (json.turnos?.length === 1) setSelectedTurno(json.turnos[0].id_turno);
            }
        } catch (e) {
            console.error("Error fetching info", e);
        }
    }

    async function fetchSession() {
        setLoading(true);
        try {
            const res = await fetch(`/api/caja/sesion?id_sede=${id_sede}`);
            const json = await res.json();
            if (json.active) {
                setSesion(json.session);
            } else {
                setSesion(null);
            }
        } catch (e: any) {
            console.error(e);
            // setError("Error cargando sesión");
        } finally {
            setLoading(false);
        }
    }

    async function abrirCaja() {
        if (!montoInicial) return setError("Ingresá un monto inicial");
        if (!selectedCaja) return setError("Seleccioná una caja");
        if (!selectedTurno) return setError("Seleccioná un turno");
        
        setError("");
        
        try {
            const res = await fetch("/api/caja/abrir", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_sede,
                    monto_inicial: parseFloat(montoInicial),
                    id_caja: selectedCaja,
                    id_turno: selectedTurno
                })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            
            setMsg("¡Caja abierta exitosamente!");
            setMontoInicial("");
            fetchSession();
        } catch (e: any) {
            setError(e.message);
        }
    }

    async function generatePDF(idSesion: string) {
        try {
            const res = await fetch(`/api/caja/resumen?id_sesion=${idSesion}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Error obteniendo datos para PDF");

            const { session, items, totals } = json;
            const doc = new jsPDF();

            // Header
            doc.setFontSize(18);
            doc.text("Resumen de Cierre de Caja", 14, 20);

            doc.setFontSize(10);
            doc.text(`Usuario: ${session.user || "Desconocido"}`, 14, 30);
            doc.text(`Apertura: ${new Date(session.openedAt).toLocaleString()}`, 14, 35);
            doc.text(`Cierre: ${new Date(session.closedAt).toLocaleString()}`, 14, 40);
            doc.text(`Turno ID: ${idSesion.slice(0, 8)}`, 14, 45);

            // Totals Info
            doc.text(`Monto Inicial: ${formatCurrency(session.initialAmount)}`, 140, 30);
            // doc.text(`Monto Final Declarado: ${formatCurrency(session.finalAmount || 0)}`, 140, 35);
            doc.text(`Total Vendido: ${formatCurrency(totals.totalSold)}`, 140, 40);

            // Items Table
            // Columns: Cantidad, Descripcion, Modo Pago, P.Unit, Subtotal
            const tableBody = items.map((i: any) => [
                 i.quantity,
                 i.description,
                 i.paymentMethod,
                 formatCurrency(i.unitPrice), // Note: if mixed prices, this might be misleading, but ok for now
                 formatCurrency(i.subtotal)
            ]);

            autoTable(doc, {
                startY: 55,
                head: [["Cant", "Descripción", "Pago", "Unitario", "Subtotal"]],
                body: tableBody,
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;

            // Payment Methods Summary
            doc.text("Desglose por Metodo de Pago:", 14, finalY);
            let y = finalY + 7;
            Object.entries(totals.byPayment).forEach(([method, amount]) => {
                 doc.text(`- ${method}: ${formatCurrency(amount as number)}`, 14, y);
                 y += 5;
            });

            // Save
            doc.save(`cierre_caja_${new Date().toISOString().slice(0,10)}_${idSesion.slice(0,4)}.pdf`);

        } catch (e: any) {
            console.error(e);
            alert("Error generando PDF: " + e.message);
        }
    }

    async function cerrarCaja() {
        if (!confirm("¿Seguro que querés cerrar la caja?")) return;
        setError("");

        try {
            const res = await fetch("/api/caja/cerrar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_sesion: sesion.id_sesion,
                    monto_final: montoFinal ? parseFloat(montoFinal) : 0, 
                    comentarios: "Cierre manual desde web"
                })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            
            setMsg("Caja cerrada. Generando reporte...");
            
            // Generate PDF immediately using the closed session ID
            await generatePDF(sesion.id_sesion);

            setMontoFinal("");
            fetchSession();
        } catch (e: any) {
            setError(e.message);
        }
    }

    if (!user) return <div className="p-8">Cargando usuario...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl">
                        🏪
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Control de Caja</h1>
                </div>

                {msg && (
                    <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200">
                        {msg}
                    </div>
                )}

                {error && (
                    <div className="bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="p-12 text-center text-slate-500">Cargando estado de caja...</div>
                ) : sesion ? (
                    // CAJA ABIERTA
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-lg font-semibold text-emerald-700">Caja Abierta</h2>
                                <p className="text-sm text-slate-500">
                                    Abierta el {new Date(sesion.fecha_apertura).toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                ACTIVA
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="text-xs text-slate-500 uppercase font-medium">Monto Inicial</div>
                                <div className="text-xl font-bold text-slate-900">{formatCurrency(sesion.monto_inicial)}</div>
                            </div>
                            {/* We could add logic to show current sales total here if we had an endpoint for it */}
                        </div>

                        <div className="pt-6 border-t border-slate-100 space-y-4">
                            <h3 className="font-medium text-slate-900">Cerrar Caja</h3>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Monto final en caja (arqueo)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        value={montoFinal}
                                        onChange={e => setMontoFinal(e.target.value)}
                                        className="flex-1 rounded-xl border border-slate-200 text-black px-4 py-2"
                                        placeholder="0.00"
                                    />
                                    <button 
                                        onClick={cerrarCaja}
                                        className="bg-slate-900 text-white px-6 py-2 rounded-xl font-medium hover:bg-slate-800 transition"
                                    >
                                        Cerrar Caja
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    Al cerrar, se calcularán las diferencias automáticamente.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    // CAJA CERRADA
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-700">La caja está cerrada</h2>
                            <p className="text-slate-500 text-sm">Debés abrir la caja para poder realizar ventas.</p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Caja</label>
                                    <select 
                                        value={selectedCaja}
                                        onChange={e => setSelectedCaja(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 bg-white"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {cajas.map(c => <option key={c.id_caja} value={c.id_caja}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Turno</label>
                                    <select 
                                        value={selectedTurno}
                                        onChange={e => setSelectedTurno(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 bg-white"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {turnos.map(t => <option key={t.id_turno} value={t.nombre || t.id_turno}>{t.nombre || "Turno"}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Monto Inicial (Cambio)</label>
                                <div className="flex gap-3">
                                    <input 
                                        type="number" 
                                        value={montoInicial}
                                        onChange={e => setMontoInicial(e.target.value)}
                                        className="flex-1 rounded-xl border border-slate-200 text-black px-4 py-3 text-lg"
                                        placeholder="0.00"
                                    />
                                    <button 
                                        onClick={abrirCaja}
                                        className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition"
                                    >
                                        Abrir Caja
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
