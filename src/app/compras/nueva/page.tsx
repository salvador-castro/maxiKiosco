"use client";

import { useEffect, useState } from "react";
import Toast, { ToastType } from "@/components/ui/Toast";

type Proveedor = {
  id_proveedor: string;
  nombre: string;
};

type Producto = {
  id_producto: string;
  nombre: string;
};

type Categoria = {
  id_categoria: string;
  nombre: string;
};

type CompraItem = {
  id_producto: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
};

type CompraReciente = {
  id_compra: string;
  fecha_hora: string;
  estado: string;
  proveedores: { nombre: string } | null;
};

export default function NuevaCompraPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [comprasRecientes, setComprasRecientes] = useState<CompraReciente[]>([]);

  const [id_proveedor, setIdProveedor] = useState("");
  const [fecha_hora, setFechaHora] = useState(new Date().toISOString().slice(0, 16));
  const [observacion, setObservacion] = useState("");
  const [items, setItems] = useState<CompraItem[]>([]);

  // Form para agregar producto
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");

  // Modal para crear producto
  const [mostrarCrearProducto, setMostrarCrearProducto] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    id_categoria: "",
    tipo: "kiosco" as "kiosco" | "elaborado" | "combo",
    precio: "",
  });

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");
  const [saving, setSaving] = useState(false);

  function toast(message: string, type: ToastType = "info") {
    setToastMsg(message);
    setToastType(type);
    setToastOpen(true);
  }

  useEffect(() => {
    loadProveedores();
    loadProductos();
    loadCategorias();
    loadComprasRecientes();
  }, []);

  async function loadProveedores() {
    try {
      const res = await fetch("/api/proveedores/list?pageSize=100");
      const j = await res.json();
      if (res.ok) {
        setProveedores((j.data ?? []).filter((p: any) => p.activo));
      }
    } catch (e) {
      console.error("Error cargando proveedores:", e);
    }
  }

  async function loadProductos() {
    try {
      const res = await fetch("/api/productos/list?pageSize=500");
      const j = await res.json();
      if (res.ok) {
        // Transform data to match expected structure
        const prods = (j.data ?? []).map((p: any) => ({
          id_producto: p.id_producto,
          nombre: p.nombre,
        }));
        setProductos(prods);
      }
    } catch (e) {
      console.error("Error cargando productos:", e);
    }
  }

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

  async function loadComprasRecientes() {
    try {
      const res = await fetch("/api/compras/list?pageSize=10");
      const j = await res.json();
      if (res.ok) {
        setComprasRecientes(j.data ?? []);
      }
    } catch (e) {
      console.error("Error cargando compras recientes:", e);
    }
  }

  function agregarProducto() {
    if (!productoSeleccionado || !cantidad || !precioUnitario) {
      toast("Completá todos los campos del producto.", "error");
      return;
    }

    const cantNum = parseFloat(cantidad);
    const precioNum = parseFloat(precioUnitario);

    if (cantNum <= 0 || precioNum < 0) {
      toast("Cantidad y precio deben ser válidos.", "error");
      return;
    }

    const prod = productos.find((p) => p.id_producto === productoSeleccionado);
    if (!prod) {
      toast("Producto no encontrado.", "error");
      return;
    }

    // Verificar si ya existe
    if (items.some((i) => i.id_producto === productoSeleccionado)) {
      toast("Este producto ya está en la lista.", "error");
      return;
    }

    setItems([
      ...items,
      {
        id_producto: prod.id_producto,
        producto_nombre: prod.nombre,
        cantidad: cantNum,
        precio_unitario: precioNum,
      },
    ]);

    // Reset form
    setProductoSeleccionado("");
    setCantidad("");
    setPrecioUnitario("");
    setBusquedaProducto("");
  }

  async function crearProducto() {
    if (!nuevoProducto.nombre || !nuevoProducto.id_categoria || !nuevoProducto.precio) {
      toast("Completá todos los campos obligatorios.", "error");
      return;
    }

    const precioNum = parseFloat(nuevoProducto.precio);
    if (precioNum <= 0) {
      toast("El precio debe ser mayor a 0.", "error");
      return;
    }

    try {
      const res = await fetch("/api/productos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoProducto.nombre,
          id_categoria: nuevoProducto.id_categoria,
          tipo: nuevoProducto.tipo,
          precio: precioNum,
        }),
      });

      const j = await res.json();

      if (!res.ok) {
        throw new Error(j?.error ?? "Error creando producto");
      }

      const productoCreado = j.producto;
      toast("Producto creado exitosamente.", "success");
      setMostrarCrearProducto(false);
      setNuevoProducto({ nombre: "", id_categoria: "", tipo: "kiosco", precio: "" });
      
      // Reload products and auto-select the new one
      await loadProductos();
      
      // Auto-select the newly created product
      setProductoSeleccionado(productoCreado.id_producto);
      setBusquedaProducto(productoCreado.nombre);
      setPrecioUnitario(String(precioNum));
    } catch (e: any) {
      toast(e?.message ?? "Error", "error");
    }
  }

  function eliminarItem(id_producto: string) {
    setItems(items.filter((i) => i.id_producto !== id_producto));
  }

  const totalGeneral = items.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0);

  async function guardarCompra() {
    if (!id_proveedor) {
      toast("Seleccioná un proveedor.", "error");
      return;
    }

    if (!fecha_hora) {
      toast("Seleccioná una fecha y hora.", "error");
      return;
    }

    if (items.length === 0) {
      toast("Agregá al menos un producto.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/compras/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_proveedor,
          fecha_hora,
          observacion: observacion || null,
          estado: "confirmada",
          items: items.map((i) => ({
            id_producto: i.id_producto,
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario,
          })),
        }),
      });

      const j = await res.json();

      if (!res.ok) {
        throw new Error(j?.error ?? "Error guardando compra");
      }

      toast("Compra guardada exitosamente.", "success");

      // Reset form
      setIdProveedor("");
      setFechaHora(new Date().toISOString().slice(0, 16));
      setObservacion("");
      setItems([]);

      // Reload recientes
      loadComprasRecientes();
    } catch (e: any) {
      toast(e?.message ?? "Error", "error");
    } finally {
      setSaving(false);
    }
  }

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  const productoNoEncontrado =
    busquedaProducto.trim() && productosFiltrados.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />

      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center font-bold">
              C
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Nueva Compra</h1>
              <p className="text-sm text-slate-500">Registrar compra de productos a proveedores</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario de compra */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos generales */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Datos de la compra</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Proveedor" required>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                               text-slate-900 outline-none focus:border-green-300 focus:ring-4 focus:ring-green-100"
                    value={id_proveedor}
                    onChange={(e) => setIdProveedor(e.target.value)}
                  >
                    <option value="">Seleccionar…</option>
                    {proveedores.map((p) => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Fecha y Hora" required>
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                               text-slate-900 outline-none focus:border-green-300 focus:ring-4 focus:ring-green-100"
                    value={fecha_hora}
                    onChange={(e) => setFechaHora(e.target.value)}
                  />
                </Field>

                <Field label="Observaciones">
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                               text-slate-900 placeholder:text-slate-400 outline-none focus:border-green-300 focus:ring-4 focus:ring-green-100"
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder="Opcional"
                  />
                </Field>
              </div>
            </div>

            {/* Agregar productos */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Agregar productos</h2>
              <div className="space-y-4">
                <Field label="Buscar producto">
                  <div className="relative">
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                                 text-slate-900 placeholder:text-slate-400
                                 outline-none focus:border-green-300 focus:ring-4 focus:ring-green-100"
                      placeholder="Buscar por nombre…"
                      value={busquedaProducto}
                      onChange={(e) => {
                        setBusquedaProducto(e.target.value);
                        setProductoSeleccionado(""); // Clear selection when user types
                      }}
                    />
                  </div>
                </Field>

                {busquedaProducto && !productoSeleccionado && (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    {productoNoEncontrado ? (
                      <div className="p-4 space-y-3">
                        <div className="text-sm text-slate-500">
                          No se encontró el producto &quot;{busquedaProducto}&quot;
                        </div>
                        <button
                          onClick={() => {
                            setNuevoProducto({ ...nuevoProducto, nombre: busquedaProducto });
                            setMostrarCrearProducto(true);
                          }}
                          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                        >
                          + Crear producto nuevo
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                          <div className="text-xs font-medium text-slate-600">Resultados relacionados</div>
                        </div>
                        {productosFiltrados.slice(0, 10).map((p) => (
                          <button
                            key={p.id_producto}
                            onClick={() => {
                              setProductoSeleccionado(p.id_producto);
                              setBusquedaProducto(p.nombre);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                          >
                            <div className="text-sm font-medium text-slate-900">{p.nombre}</div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Cantidad" required>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                                 text-slate-900 placeholder:text-slate-400
                                 outline-none focus:border-green-300 focus:ring-4 focus:ring-green-100"
                      placeholder="10"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                    />
                  </Field>

                  <Field label="Precio unitario" required>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                                 text-slate-900 placeholder:text-slate-400
                                 outline-none focus:border-green-300 focus:ring-4 focus:ring-green-100"
                      placeholder="1500"
                      value={precioUnitario}
                      onChange={(e) => setPrecioUnitario(e.target.value)}
                    />
                  </Field>

                  <div className="flex items-end">
                    <button
                      onClick={agregarProducto}
                      className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-200"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de productos */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Productos ({items.length})</h2>
                <div className="text-lg font-bold text-green-700">
                  Total: ${totalGeneral.toFixed(2)}
                </div>
              </div>

              {items.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  No hay productos agregados
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr className="text-left">
                        <th className="p-4 font-medium">Producto</th>
                        <th className="p-4 font-medium">Cantidad</th>
                        <th className="p-4 font-medium">P. Unitario</th>
                        <th className="p-4 font-medium">Subtotal</th>
                        <th className="p-4 font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <tr key={item.id_producto} className="hover:bg-slate-50/60">
                          <td className="p-4">
                            <div className="font-semibold text-slate-900">{item.producto_nombre}</div>
                          </td>
                          <td className="p-4 text-slate-700">{item.cantidad}</td>
                          <td className="p-4 text-slate-700">${item.precio_unitario.toFixed(2)}</td>
                          <td className="p-4 font-semibold text-slate-900">
                            ${(item.cantidad * item.precio_unitario).toFixed(2)}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => eliminarItem(item.id_producto)}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700 hover:bg-rose-100 text-xs"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {items.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
                  <button
                    onClick={guardarCompra}
                    disabled={saving}
                    className="rounded-xl bg-green-600 px-6 py-3 text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar Compra"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Compras recientes */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Compras Recientes</h2>
              {comprasRecientes.length === 0 ? (
                <div className="text-sm text-slate-500">No hay compras registradas</div>
              ) : (
                <div className="space-y-3">
                  {comprasRecientes.map((c) => (
                    <div
                      key={c.id_compra}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="text-sm font-semibold text-slate-900">
                        {c.proveedores?.nombre ?? "Sin proveedor"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(c.fecha_hora).toLocaleDateString("es-AR")}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {c.estado}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Crear Producto */}
      {mostrarCrearProducto && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-lg font-semibold text-slate-900">Crear Producto Nuevo</h2>
              <p className="text-sm text-slate-500">Complete los datos del producto</p>
            </div>

            <div className="p-6 space-y-4">
              <Field label="Nombre" required>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                             text-slate-900 placeholder:text-slate-500
                             outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  value={nuevoProducto.nombre}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                  placeholder="ej: Coca Cola Light"
                />
              </Field>

              <Field label="Categoría" required>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                             text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  value={nuevoProducto.id_categoria}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, id_categoria: e.target.value })}
                >
                  <option value="">Seleccionar…</option>
                  {categorias.map((c) => (
                    <option key={c.id_categoria} value={c.id_categoria}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Tipo" required>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                             text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  value={nuevoProducto.tipo}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, tipo: e.target.value as any })}
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                             text-slate-900 placeholder:text-slate-500
                             outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  value={nuevoProducto.precio}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })}
                  placeholder="1500"
                />
              </Field>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setMostrarCrearProducto(false);
                  setNuevoProducto({ nombre: "", id_categoria: "", tipo: "kiosco", precio: "" });
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={crearProducto}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                Crear Producto
              </button>
            </div>
          </div>
        </div>
      )}
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
