/**
 * Determina el turno según la hora actual del servidor (o podés pasar una fecha).
 * IMPORTANTE: depende de la definición de turnos en la DB (tabla turnos por sede).
 * Esta función se suele usar en /api/caja/abrir para elegir el turno automáticamente.
 */
export function nowTimeHHMMSS(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
