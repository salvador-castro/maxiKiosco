"use client";

import { useState, useEffect, useCallback } from "react";

type Caja = {
  id_caja: string;
  nombre: string;
  activa: boolean;
  tiene_sesion_abierta: boolean;
};

type Turno = {
  id_turno: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  usuario_asignado: boolean;
};

type ModalAperturaSesionProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  idSede: string;
};

export default function ModalAperturaSesion({
  isOpen,
  onClose,
  onSuccess,
  idSede,
}: ModalAperturaSesionProps) {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedCaja, setSelectedCaja] = useState("");
  const [selectedTurno, setSelectedTurno] = useState("");
  const [montoInicial, setMontoInicial] = useState("0");
  const [error, setError] = useState("");

  const loadOpciones = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/caja/opciones?id_sede=${idSede}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || "Error cargando opciones");

      setCajas(json.cajas || []);
      setTurnos(json.turnos || []);

      // Auto-seleccionar primera caja disponible
      const cajaDisponible = (json.cajas || []).find(
        (c: Caja) => !c.tiene_sesion_abierta
      );
      if (cajaDisponible) {
        setSelectedCaja(cajaDisponible.id_caja);
      }

      // Auto-seleccionar primer turno asignado
      const turnoAsignado = (json.turnos || []).find(
        (t: Turno) => t.usuario_asignado
      );
      if (turnoAsignado) {
        setSelectedTurno(turnoAsignado.id_turno);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando opciones");
    } finally {
      setLoading(false);
    }
  }, [idSede]);

  // Cargar opciones al abrir modal
  useEffect(() => {
    if (isOpen && idSede) {
      loadOpciones();
    }
  }, [isOpen, idSede, loadOpciones]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedCaja || !selectedTurno) {
      setError("Seleccioná una caja y un turno");
      return;
    }

    const monto = parseFloat(montoInicial);
    if (isNaN(monto) || monto < 0) {
      setError("Ingresá un monto válido");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/caja/abrir-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_caja: selectedCaja,
          id_turno: selectedTurno,
          id_sede: idSede,
          monto_inicial: monto,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error abriendo sesión");

      // Éxito
      onSuccess();
      resetForm();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error abriendo sesión");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedCaja("");
    setSelectedTurno("");
    setMontoInicial("0");
    setError("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  if (!isOpen) return null;

  const cajasDisponibles = cajas.filter((c) => !c.tiene_sesion_abierta);
  const turnosDisponibles = turnos; // Mostrar todos los turnos activos

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-500 to-blue-600 px-6 py-4 text-white">
          <h2 className="text-xl font-bold">🏦 Abrir Sesión de Caja</h2>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mb-2"></div>
              <p className="text-slate-600">Cargando opciones...</p>
            </div>
          ) : (
            <>
              {/* Selector de Caja */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Caja
                </label>
                <select
                  value={selectedCaja}
                  onChange={(e) => setSelectedCaja(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-200 px-4 py-2 text-slate-900 outline-none focus:border-blue-400"
                  required
                >
                  <option value="">Seleccioná una caja</option>
                  {cajasDisponibles.map((caja) => (
                    <option key={caja.id_caja} value={caja.id_caja}>
                      {caja.nombre}
                    </option>
                  ))}
                </select>
                {cajasDisponibles.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No hay cajas disponibles
                  </p>
                )}
              </div>

              {/* Selector de Turno */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Turno
                </label>
                <select
                  value={selectedTurno}
                  onChange={(e) => setSelectedTurno(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-200 px-4 py-2 text-slate-900 outline-none focus:border-blue-400"
                  required
                >
                  <option value="">Seleccioná un turno</option>
                  {turnosDisponibles.map((turno) => (
                    <option key={turno.id_turno} value={turno.id_turno}>
                      {turno.nombre} ({turno.hora_inicio} - {turno.hora_fin})
                    </option>
                  ))}
                </select>
                {turnosDisponibles.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No hay turnos disponibles
                  </p>
                )}
              </div>

              {/* Monto Inicial */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Monto Inicial
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-200 pl-8 pr-4 py-2 text-slate-900 outline-none focus:border-blue-400"
                    required
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading || cajasDisponibles.length === 0}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Abriendo..." : "Abrir Sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
