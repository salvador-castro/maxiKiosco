"use client";

import { useState } from "react";
import { formatCurrency } from "@/utils/format";

type ModalCierreSesionProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sesion: {
    id_sesion: string;
    nombre_caja: string;
    nombre_turno: string;
    monto_inicial: number;
  } | null;
};

type ResultadoCierre = {
  monto_inicial: number;
  total_ventas: number;
  cantidad_ventas: number;
  monto_real_calculado: number;
  monto_declarado: number;
  diferencia: number;
};

export default function ModalCierreSesion({
  isOpen,
  onClose,
  onSuccess,
  sesion,
}: ModalCierreSesionProps) {
  const [montoDeclarado, setMontoDeclarado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<ResultadoCierre | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!sesion) return;

    const monto = parseFloat(montoDeclarado);
    if (isNaN(monto) || monto < 0) {
      setError("Ingresá un monto válido");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/caja/cerrar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_sesion: sesion.id_sesion,
          monto_final_declarado: monto,
          observaciones: observaciones || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error cerrando sesión");

      // Mostrar resultado
      setResultado(json);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Error cerrando sesión");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleFinalClose() {
    setMontoDeclarado("");
    setObservaciones("");
    setResultado(null);
    setError("");
    onSuccess();
    onClose();
  }

  function handleCancel() {
    setMontoDeclarado("");
    setObservaciones("");
    setResultado(null);
    setError("");
    onClose();
  }

  if (!isOpen || !sesion) return null;

  // Si ya hay resultado, mostrar resumen
  if (resultado) {
    const diferencia = resultado.diferencia || 0;
    const tieneDiferencia = Math.abs(diferencia) > 0.01;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-linear-to-r from-green-500 to-green-600 px-6 py-4 text-white">
            <h2 className="text-xl font-bold">✅ Sesión Cerrada</h2>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Monto Inicial:</span>
                <span className="font-semibold">{formatCurrency(resultado.monto_inicial)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Ventas:</span>
                <span className="font-semibold">{formatCurrency(resultado.total_ventas)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Cantidad de Ventas:</span>
                <span className="font-semibold">{resultado.cantidad_ventas}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold text-slate-900">Esperado:</span>
                <span className="font-bold text-lg">{formatCurrency(resultado.monto_real_calculado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-900">Declarado:</span>
                <span className="font-bold text-lg">{formatCurrency(resultado.monto_declarado)}</span>
              </div>
              <div className={`flex justify-between pt-2 border-t ${tieneDiferencia ? 'text-red-600' : 'text-green-600'}`}>
                <span className="font-semibold">Diferencia:</span>
                <span className="font-bold text-xl">{formatCurrency(Math.abs(diferencia))}</span>
              </div>
            </div>

            {tieneDiferencia && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-800">
                  {diferencia > 0 ? "💰 Sobra dinero" : "⚠️ Falta dinero"}
                </p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-slate-50">
            <button
              onClick={handleFinalClose}
              className="w-full rounded-lg bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-green-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-linear-to-r from-red-500 to-red-600 px-6 py-4 text-white">
          <h2 className="text-xl font-bold">📊 Cerrar Sesión de Caja</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm font-semibold text-blue-900">
              {sesion.nombre_caja} - {sesion.nombre_turno}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Monto Inicial:</span>
              <span className="font-semibold">{formatCurrency(sesion.monto_inicial)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Monto Real en Caja
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={montoDeclarado}
                onChange={(e) => setMontoDeclarado(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-200 pl-8 pr-4 py-2 text-slate-900 outline-none focus:border-red-400"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Observaciones (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-200 px-4 py-2 text-slate-900 outline-none focus:border-red-400"
              rows={3}
              placeholder="Notas sobre el cierre..."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? "Cerrando..." : "Cerrar Sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
