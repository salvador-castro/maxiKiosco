"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export default function Toast({
  open,
  message,
  type = "info",
  onClose,
}: {
  open: boolean;
  message: string;
  type?: ToastType;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  const styles =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : type === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-sky-200 bg-sky-50 text-sky-800";

  return (
    <div className="fixed right-4 top-4 z-100">
      <div className={`rounded-xl border px-4 py-3 shadow-sm ${styles}`}>
        <div className="flex items-start gap-3">
          <div className="text-sm font-medium">{message}</div>
          <button
            onClick={onClose}
            className="ml-2 text-xs opacity-70 hover:opacity-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
