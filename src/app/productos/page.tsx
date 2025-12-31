"use client";

import { useEffect, useMemo, useState } from "react";
import Toast, { ToastType } from "@/components/ui/Toast";

type ProductoRow = {
  id_producto: string;
  nombre: string;
  precio: number;
  tipo: string;
  activo: boolean;
  requiere_comanda: boolean;
  categoria_nombre: string | null;
  stock: number;
  id_insumo_stock: string | null;
  id_categoria: string;
};

type Categoria = {
  id_categoria: string;
  nombre: string;
};

type Sede = {
  id_sede: string;
  nombre: string;
};

type FormState = {
  id_producto?: string;
  nombre: string;
  id_categoria: string;
  tipo: "kiosco" | "elaborado" | "combo";
  precio: string;
  stocks: Record<string, string>;
  id_insumo_stock: string | null;
};

function Chip({ children, tone }: { children: React.ReactNode; tone: "emerald" | "rose" | "blue" | "amber" | "purple" }) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "rose"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : "bg-purple-50 text-purple-700 border-purple-100";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}

export default function ProductosPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProductoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [insumos, setInsumos] = useState<{id_insumo: string; nombre: string; unidad: string}[]>([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    nombre: "",
    id_categoria: "",
    tipo: "kiosco",
    precio: "",
    stocks: {},
    id_insumo_stock: null,
  });
  
  // State for combo ingredients
  const [comboItems, setComboItems] = useState<{id_insumo: string; nombre: string; cantidad: number}[]>([]);
  const [selectedInsumo, setSelectedInsumo] = useState("");
  const [selectedQty, setSelectedQty] = useState("1");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  function toast(message: string, type: ToastType = "info") {
    setToastMsg(message);
    setToastType(type);
    setToastOpen(true);
  }

  async function load() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("pageSize", String(pageSize));
      if (q.trim()) sp.set("q", q.trim());

      const res = await fetch(`/api/productos/list?${sp.toString()}`);
      const j = await res.json();

      if (!res.ok) throw new Error(j?.error ?? "Error listando productos");

      setRows(j.data ?? []);
      setTotal(j.total ?? 0);
    } catch (e: any) {
      toast(e?.message ?? "Error", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadCategorias();
    loadSedes();
    loadInsumos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q]);

  async function loadCategorias() {
    try {
      const res = await fetch("/api/categorias/list?onlyActive=true");
      const j = await res.json();
      if (res.ok) {
        setCategorias(j.data ?? []);
      }
    } catch (e) {
      console.error("Error cargando categorias:", e);
    }
  }

  async function loadSedes() {
    try {
      const res = await fetch("/api/sedes/list");
      const j = await res.json();
      if (res.ok) {
        setSedes(j.data ?? []);
      }
    } catch (e) {
      console.error("Error cargando sedes:", e);
    }
  }

  async function loadInsumos() {
      try {
          const res = await fetch("/api/insumos/list");
          const j = await res.json();
          if (res.ok) setInsumos(j.data ?? []);
      } catch (e) {
          console.error("Error loading insumos", e);
      }
  }

  async function openEdit(p: ProductoRow | null) {
    let stocksMap: Record<string, string> = {};
    
    // Initialize with 0 for all sedes
    sedes.forEach(s => {
      stocksMap[s.id_sede] = "0";
    });

    setComboItems([]);
    setSelectedInsumo("");
    setSelectedQty("1");

    if (p) {
        // Edit existing
        if (p.id_insumo_stock) {
          try {
            const res = await fetch(`/api/stock/by-insumo?id_insumo=${p.id_insumo_stock}`);
            if (res.ok) {
              const { data } = await res.json();
              if (Array.isArray(data)) {
                data.forEach((item: any) => {
                  stocksMap[item.id_sede] = String(item.cantidad_actual);
                });
              }
            }
          } catch (e) {
            console.error("Error fetching stock breakdown", e);
            toast("Error cargando detalle de stock", "warning");
          }
        }

        if (p.tipo === "combo") {
             // Load ingredients
             try {
                const res = await fetch(`/api/productos/${p.id_producto}/ingredients`);
                if(res.ok) {
                    const j = await res.json();
                    if(j.data) {
                        setComboItems(j.data.map((i: any) => ({
                            id_insumo: i.id_insumo,
                            nombre: i.insumos?.nombre ?? "Unknown",
                            cantidad: Number(i.cantidad)
                        })));
                    }
                }
             } catch(e) {
                 console.error("Error fetching combo ingredients", e);
             }
        }

        setForm({
          id_producto: p.id_producto,
          nombre: p.nombre,
          id_categoria: p.id_categoria,
          tipo: p.tipo as any,
          precio: String(p.precio),
          stocks: stocksMap,
          id_insumo_stock: p.id_insumo_stock,
        });
    } else {
        // Create new
        setForm({
            nombre: "",
            id_categoria: "",
            tipo: "kiosco",
            precio: "",
            stocks: stocksMap,
            id_insumo_stock: null,
        });
    }
    
    setOpen(true);
  }

  function addComboItem() {
      if (!selectedInsumo) return;
      const ins = insumos.find(i => i.id_insumo === selectedInsumo);
      if (!ins) return;

      const qty = parseFloat(selectedQty);
      if (qty <= 0) return;

      setComboItems(prev => {
          const exists = prev.find(p => p.id_insumo === selectedInsumo);
          if (exists) {
              return prev.map(p => p.id_insumo === selectedInsumo ? { ...p, cantidad: p.cantidad + qty } : p);
          }
          return [...prev, { id_insumo: selectedInsumo, nombre: ins.nombre, cantidad: qty }];
      });
      setSelectedInsumo("");
      setSelectedQty("1");
  }

  function removeComboItem(id: string) {
      setComboItems(prev => prev.filter(p => p.id_insumo !== id));
  }

  async function saveEdit() {
    try {
      const payload: any = {
          nombre: form.nombre,
          id_categoria: form.id_categoria,
          precio: parseFloat(form.precio),
          tipo: form.tipo,
      };

      if (form.tipo === "combo") {
          payload.items = comboItems;
      }

      let res;
      if (form.id_producto) {
          // Update
          res = await fetch(`/api/productos/update/${form.id_producto}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
          });
      } else {
          // Create
          res = await fetch(`/api/productos/create`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
          });
      }

      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error ?? "Error guardando producto");
      }
      
      const j = await res.json();

      // For stock updates (only if not combo/elaborado simple? actually combos don't have stock per se, ingredients do)
      // If regular product, update stock if editing
      if (form.id_producto && form.id_insumo_stock && form.tipo !== "combo" && sedes.length > 0) {
        const stocksPayload = sedes.map(s => ({
          id_sede: s.id_sede,
          cantidad: parseFloat(form.stocks[s.id_sede] || "0"),
        }));

        const stockRes = await fetch("/api/stock/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_insumo: form.id_insumo_stock,
            stocks: stocksPayload,
          }),
        });

        if (!stockRes.ok) {
          toast("Producto guardado pero error actualizando stock", "warning");
        }
      }

      toast("Producto guardado correctamente", "success");
      setOpen(false);
      await load();
    } catch (e: any) {
      toast(e?.message ?? "Error", "error");
    }
  }

  async function toggleActivo(p: ProductoRow) {
    const res = await fetch(`/api/productos/update/${p.id_producto}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !p.activo }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast(j?.error ?? "Error actualizando producto", "error");
      return;
    }
    toast(p.activo ? "Producto desactivado." : "Producto activado.", "success");
    await load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar producto definitivamente?")) return;

    const res = await fetch(`/api/productos/delete/${id}`, { method: "DELETE" });
    const j = await res.json();

    if (!res.ok) {
      toast(j?.error ?? "Error eliminando producto", "error");
      return;
    }

    toast("Producto eliminado.", "success");
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
                <div className="h-10 w-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  P
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Productos</h1>
                  <p className="text-sm text-slate-500">Gestión del catálogo de productos</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative">
                <input
                  className="w-full sm:w-[280px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  placeholder="Buscar producto…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">⌕</span>
              </div>
              
              <button
                onClick={() => openEdit(null)}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-white font-medium shadow-sm hover:bg-blue-700 transition focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                + Nuevo Producto
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
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="p-4 font-medium">Nombre</th>
                  <th className="p-4 font-medium">Categoría</th>
                  <th className="p-4 font-medium">Tipo</th>
                  <th className="p-4 font-medium">Precio</th>
                  <th className="p-4 font-medium">Stock</th>
                  <th className="p-4 font-medium">Estado</th>
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
                  rows.map((p) => (
                    <tr key={p.id_producto} className="hover:bg-slate-50/60 transition">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{p.nombre}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-600">{p.categoria_nombre ?? "-"}</div>
                      </td>
                      <td className="p-4">
                        {p.tipo === "kiosco" ? (
                          <Chip tone="blue">Kiosco</Chip>
                        ) : p.tipo === "elaborado" ? (
                          <Chip tone="amber">Elaborado</Chip>
                        ) : (
                          <Chip tone="purple">Combo</Chip>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900">${p.precio.toFixed(2)}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-blue-700 text-center">{p.stock}</div>
                      </td>
                      <td className="p-4">
                        {p.activo ? <Chip tone="emerald">Activo</Chip> : <Chip tone="rose">Inactivo</Chip>}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                            onClick={() => openEdit(p)}
                          >
                            Editar
                          </button>

                          <button
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                            onClick={() => toggleActivo(p)}
                          >
                            {p.activo ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100"
                            onClick={() => remove(p.id_producto)}
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

        {/* Modal de Edición */}
        {open && (
          <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{form.id_producto ? "Editar Producto" : "Nuevo Producto"}</h2>
                    <p className="text-sm text-slate-500">{form.id_producto ? "Modificar datos y stock" : "Crear nuevo producto"}</p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                <Field label="Nombre" required>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  />
                </Field>

                <Field label="Categoría" required>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    value={form.id_categoria}
                    onChange={(e) => setForm((f) => ({ ...f, id_categoria: e.target.value }))}
                  >
                    <option value="" disabled>Seleccionar categoría...</option>
                    {categorias.map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Tipo" required>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as any }))}
                  >
                    <option value="kiosco">Kiosco</option>
                    <option value="elaborado">Elaborado</option>
                    <option value="combo">Combo</option>
                  </select>
                </Field>

                <Field label="Precio" required>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    value={form.precio}
                    onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                  />
                </Field>

                {form.tipo === "combo" ? (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <label className="text-sm font-semibold text-slate-900">Ingredientes del Combo</label>
                        
                        <div className="flex gap-2">
                             <select 
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                value={selectedInsumo}
                                onChange={(e) => setSelectedInsumo(e.target.value)}
                             >
                                 <option value="">Seleccionar insumo...</option>
                                 {insumos.map(i => (
                                     <option key={i.id_insumo} value={i.id_insumo}>{i.nombre} ({i.unidad})</option>
                                 ))}
                             </select>
                             <input 
                                type="number" 
                                min="0.1" 
                                step="0.1" 
                                className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                value={selectedQty}
                                onChange={(e) => setSelectedQty(e.target.value)}
                             />
                             <button
                                onClick={addComboItem}
                                type="button"
                                className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 font-medium text-sm"
                             >
                                 +
                             </button>
                        </div>

                        <div className="space-y-2">
                            {comboItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <span>{item.cantidad} x {item.nombre}</span>
                                    <button onClick={() => removeComboItem(item.id_insumo)} className="text-rose-500 hover:text-rose-700">×</button>
                                </div>
                            ))}
                            {comboItems.length === 0 && <p className="text-xs text-slate-400 italic">Sin ingredientes</p>}
                        </div>
                    </div>
                ) : (
                    <Field label="Stock por Sede" required>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                        {sedes.length === 0 ? (
                          <div className="text-sm text-slate-500 italic">No hay sedes registradas</div>
                        ) : (
                          sedes.map((s) => (
                            <div key={s.id_sede} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-sm font-medium text-slate-700">{s.nombre}</span>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                className="w-[100px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-right text-slate-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                                placeholder="0"
                                value={form.stocks[s.id_sede] || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm(f => ({
                                    ...f,
                                    stocks: { ...f.stocks, [s.id_sede]: val }
                                  }));
                                }}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </Field>
                )}

                <div className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  {form.tipo === "combo" 
                    ? "💡 Los combos descuentan stock de sus ingredientes automáticamente al venderse."
                    : "💡 Ajusta el stock disponible para cada sucursal independientemente."}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
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
