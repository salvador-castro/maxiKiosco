"use client";

type SesionActiva = {
  id_sesion: string;
  nombre_caja: string;
  nombre_turno: string;
  apertura_at: string;
  monto_inicial: number;
};

type IndicadorSesionProps = {
  sesion: SesionActiva | null;
  onCerrarClick: () => void;
};

export default function IndicadorSesion({
  sesion,
  onCerrarClick,
}: IndicadorSesionProps) {
  if (!sesion) return null;

  const aperturaDate = new Date(sesion.apertura_at);
  const horaApertura = aperturaDate.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-xl bg-green-50 border-2 border-green-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500">
            <span className="text-white text-xl">🟢</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900">
              Sesión Abierta: {sesion.nombre_caja}
            </p>
            <p className="text-xs text-green-700">
              {sesion.nombre_turno} • Desde {horaApertura} • Inicial: ${sesion.monto_inicial.toFixed(2)}
            </p>
          </div>
        </div>
        <button
          onClick={onCerrarClick}
          className="rounded-lg bg-red-500 hover:bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
