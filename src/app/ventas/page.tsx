"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/hooks/useSession";
import Toast, { ToastType } from "@/components/ui/Toast";
import { formatCurrency } from "@/utils/format";
import ModalAperturaSesion from "@/components/caja/ModalAperturaSesion";
import ModalCierreSesion from "@/components/caja/ModalCierreSesion";
import IndicadorSesion from "@/components/caja/IndicadorSesion";
import { Ticket, TicketData } from "@/components/ventas/Ticket";

type Categoria = {
  id_categoria: string;
  nombre: string;
};

type Producto = {
  id_producto: string;
  nombre: string;
  precio: number;
  id_categoria: string;
  categoria_nombre: string | null;
  stock: number;
};

type VentaItem = {
  id_producto: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  stock_disponible: number;
};

type SesionActiva = {
  id_sesion: string;
  id_caja: string;
  nombre_caja: string;
  id_turno: string;
  nombre_turno: string;
  apertura_at: string;
  monto_inicial: number;
};

const FORMAS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "debito", label: "Débito" },
];

export default function VentasPage() {
  const { user } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<string>("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<VentaItem[]>([]);
  const [formaPago, setFormaPago] = useState("efectivo");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Estados de sesión de caja
  const [sesionActiva, setSesionActiva] = useState<SesionActiva | null>(null);
  const [modalAbrirSesion, setModalAbrirSesion] = useState(false);
  const [modalCerrarSesion, setModalCerrarSesion] = useState(false);
  const [loadingSesion, setLoadingSesion] = useState(true);

  // Estado para ticket
  const [ticketData, setTicketData] = useState<TicketData | null>(null);

  // Efecto para imprimir cuando hay datos de ticket
  useEffect(() => {
    if (ticketData) {
      // Pequeño delay para asegurar que el DOM se actualizó
      const timer = setTimeout(() => {
        window.print();
        // Opcional: limpiar ticketData después de imprimir si se desea
        // setTicketData(null); 
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [ticketData]);

  const id_sede = user?.id_sede ?? "";

  function toast(message: string, type: ToastType = "info") {
    setToastMsg(message);
    setToastType(type);
    setToastOpen(true);
  }

  // Cargar sesión activa
  const loadSesionActiva = useCallback(async () => {
    if (!id_sede) return;
    
    setLoadingSesion(true);
    try {
      const res = await fetch(`/api/caja/sesion-activa?id_sede=${id_sede}`);
      const json = await res.json();
      
      if (!res.ok) {
        console.error("Error cargando sesión:", json.error);
        setSesionActiva(null);
        return;
      }
      
      setSesionActiva(json.sesion || null);
      
      // Si no hay sesión activa, abrir modal automáticamente
      if (!json.sesion) {
        setModalAbrirSesion(true);
      }
    } catch (e) {
      console.error("Error cargando sesión:", e);
      setSesionActiva(null);
    } finally {
      setLoadingSesion(false);
    }
  }, [id_sede]);

  // Load session on mount
  useEffect(() => {
    if (id_sede) {
      loadSesionActiva();
    }
  }, [id_sede, loadSesionActiva]);

  const loadCategorias = useCallback(async () => {
    try {
      const res = await fetch("/api/categorias/list");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Error cargando categorías");
      setCategorias(json.data ?? []);
    } catch (e: unknown) {
      const error = e as Error;
      toast(error?.message ?? "Error", "error");
    }
  }, []);

  // Load categories on mount
  useEffect(() => {
    loadCategorias();
  }, [loadCategorias]);

  // Auto-search when query or category changes
  useEffect(() => {
    if (searchQuery.trim().length >= 2 || selectedCategoria) {
      searchProductos();
    } else {
      setProductos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategoria]);

  async function searchProductos() {
    if (!id_sede) {
      toast("No se pudo obtener la sede del usuario", "error");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedCategoria) params.set("categoria", selectedCategoria);
      params.set("id_sede", id_sede);

      const res = await fetch(`/api/productos/search?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Error buscando productos");

      setProductos(json.data ?? []);
    } catch (e: unknown) {
      const error = e as Error;
      toast(error?.message ?? "Error", "error");
    } finally {
      setLoading(false);
    }
  }

  function addProducto(prod: Producto) {
    const existingIndex = items.findIndex(
      (i) => i.id_producto === prod.id_producto,
    );

    if (existingIndex >= 0) {
      const existing = items[existingIndex];
      if (existing.cantidad >= prod.stock) {
        toast(`Stock insuficiente. Disponible: ${prod.stock}`, "error");
        return;
      }
      setItems((prev) => {
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          cantidad: existing.cantidad + 1,
        };
        return updated;
      });
    } else {
      if (prod.stock < 1) {
        toast("Producto sin stock", "error");
        return;
      }
      setItems((prev) => [
        ...prev,
        {
          id_producto: prod.id_producto,
          nombre: prod.nombre,
          cantidad: 1,
          precio_unitario: prod.precio,
          stock_disponible: prod.stock,
        },
      ]);
    }
    toast(`${prod.nombre} agregado`, "success");
  }

  function updateCantidad(id_producto: string, cantidad: number) {
    const item = items.find((i) => i.id_producto === id_producto);
    if (!item) return;

    if (cantidad < 1) {
      removeItem(id_producto);
      return;
    }

    if (cantidad > item.stock_disponible) {
      toast(
        `Stock insuficiente. Disponible: ${item.stock_disponible}`,
        "error",
      );
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.id_producto === id_producto ? { ...i, cantidad } : i)),
    );
  }

  function removeItem(id_producto: string) {
    setItems((prev) => prev.filter((i) => i.id_producto !== id_producto));
  }

  function clearSale() {
    if (items.length === 0) return;
    if (!confirm("¿Limpiar venta actual?")) return;
    setItems([]);
    toast("Venta limpiada", "info");
  }

  async function completeSale() {
    if (items.length === 0) {
      toast("Agregá productos a la venta", "error");
      return;
    }

    if (!id_sede) {
      toast("No se pudo obtener la sede del usuario", "error");
      return;
    }

    setProcessing(true);
    try {
      const body = {
        items: items.map((i) => ({
          id_producto: i.id_producto,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
        forma_pago: formaPago,
        id_sede,
      };

      const res = await fetch("/api/ventas/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Error creando venta");

      // Mostrar mensaje según si se generó factura o comanda
      if (json.data?.factura) {
        const factura = json.data.factura;
        toast(
          `¡Venta completada! Factura ${factura.puntoVenta}-${String(factura.numeroComprobante).padStart(8, '0')} | CAE: ${factura.cae}`,
          "success"
        );
      } else if (json.data?.es_comanda) {
        toast("¡Comanda registrada exitosamente!", "success");
      } else {
        toast("¡Venta completada exitosamente!", "success");
      }

      // Preparar datos para el ticket si corresponde (Factura o Comanda)
      // Si hay factura (Transferencia/Débito) se imprime seguro.
      // Si es comanda, también podría imprimirse si se quiere.
      // El requerimiento decía "cuando haga venta con trf o debito, se imprima ticket fiscal"
      
      const datosTicket: TicketData = {
        items: items.map(i => ({
          cantidad: i.cantidad,
          descripcion: i.nombre,
          precioUnitario: i.precio_unitario,
          subtotal: i.cantidad * i.precio_unitario
        })),
        total: total,
        fecha: new Date().toISOString(),
        formaPago: FORMAS_PAGO.find(fp => fp.value === formaPago)?.label || formaPago,
        nroComprobante: json.data?.factura 
          ? `${String(json.data.factura.puntoVenta).padStart(5, '0')}-${String(json.data.factura.numeroComprobante).padStart(8, '0')}`
          : undefined, 
        
        // Datos crudos para QR
        ptoVta: json.data?.factura?.puntoVenta,
        tipoCmp: json.data?.factura?.tipoComprobante,
        nroCmp: json.data?.factura?.numeroComprobante,
        
        cae: json.data?.factura?.cae,
        vtoCae: json.data?.factura?.caeVencimiento,
      };

      // Setear ticket data triggerea el useEffect de impresión
      if (json.data?.factura) {
         setTicketData(datosTicket);
      } else {
         // Si es efectivo/comanda, decidimos si imprimir o no. 
         // Por ahora NO imprimimos automático en efectivo para no gastar papel si no piden,
         // pero podríamos dejar el ticketData listo por si agrego un botón "Imprimir Último"
         setTicketData(null); 
      }

      setItems([]);
      setConfirmOpen(false);
    } catch (e: unknown) {
      const error = e as Error;
      toast(error?.message ?? "Error", "error");
    } finally {
      setProcessing(false);
    }
  }

  const total = items.reduce(
    (sum, item) => sum + item.cantidad * item.precio_unitario,
    0,
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-emerald-50">
      {/* Modales de Sesión */}
      <ModalAperturaSesion
        isOpen={modalAbrirSesion}
        onClose={() => setModalAbrirSesion(false)}
        onSuccess={() => {
          loadSesionActiva();
          toast("Sesión abierta correctamente", "success");
        }}
        idSede={id_sede}
      />

      <ModalCierreSesion
        isOpen={modalCerrarSesion}
        onClose={() => setModalCerrarSesion(false)}
        onSuccess={() => {
          setSesionActiva(null);
          setModalAbrirSesion(true);
          toast("Sesión cerrada correctamente", "success");
        }}
        sesion={sesionActiva}
      />

      {/* Header Minimalista */}
      <div className="mx-auto max-w-[1600px] px-4 pt-6 pb-2">
        <div className="flex justify-between items-center mb-1">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Ventas</h1>
            <p className="text-sm text-slate-500">{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          {loadingSesion ? (
             <div className="animate-pulse h-8 w-32 bg-slate-200 rounded-full"></div>
          ) : sesionActiva ? (
             <IndicadorSesion
               sesion={sesionActiva}
               onCerrarClick={() => setModalCerrarSesion(true)}
             />
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] p-4 h-[calc(100vh-100px)]">
       
        {/* Main Layout: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 h-full">
          {/* Left Column: Search, Categories, Products */}
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Search & Categories Bar */}
            <div className="mb-6 space-y-4">
              {/* Search */}
              <div className="relative group">
                <input
                  className="w-full rounded-2xl border-none bg-slate-100/80 px-5 py-4 pl-12 text-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all duration-300 shadow-sm"
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </div>
                {loading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
                  </div>
                )}
              </div>

              {/* Categories Scroll */}
              <div className="overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex gap-2 min-w-max">
                  <button
                    onClick={() => setSelectedCategoria("")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                      selectedCategoria === ""
                        ? "bg-slate-800 text-white shadow-md"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Todos
                  </button>
                  {categorias.map((cat) => (
                    <button
                      key={cat.id_categoria}
                      onClick={() => setSelectedCategoria(cat.id_categoria)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                        selectedCategoria === cat.id_categoria
                          ? "bg-slate-800 text-white shadow-md"
                          : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {cat.nombre}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                Productos {productos.length > 0 && `(${productos.length})`}
              </h2>

              {loading ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mb-2"></div>
                  <p>Buscando productos...</p>
                </div>
              ) : productos.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="text-5xl mb-3">🔍</div>
                  <p>No hay productos para mostrar</p>
                  <p className="text-sm mt-1">
                    Busca por nombre o selecciona una categoría
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-2">
                  {productos.map((prod) => (
                    <button
                      key={prod.id_producto}
                      onClick={() => addProducto(prod)}
                      className="text-left rounded-lg border-2 border-slate-200 bg-white p-3 transition hover:border-emerald-300 hover:shadow-md hover:scale-[1.02] active:scale-100"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-slate-900 text-sm leading-tight flex-1">
                          {prod.nombre}
                        </h3>
                        <div className="ml-2 text-lg font-bold text-emerald-600">
                          ${prod.precio.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          {prod.categoria_nombre || "Sin categoría"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium ${
                            prod.stock > 10
                              ? "bg-emerald-100 text-emerald-700"
                              : prod.stock > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          Stock: {prod.stock}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Shopping Cart */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl bg-white border border-slate-200 shadow-lg overflow-hidden">
              {/* Cart Header */}
              <div className="bg-linear-to-r from-emerald-500 to-emerald-600 px-5 py-4 text-white">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛒</span>
                  <div>
                    <h2 className="text-lg font-bold">Carrito</h2>
                    <p className="text-sm text-emerald-100">
                      {items.length}{" "}
                      {items.length === 1 ? "producto" : "productos"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cart Items */}
              <div className="max-h-[400px] overflow-y-auto p-4">
                {items.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <div className="text-5xl mb-2">🛍️</div>
                    <p className="text-sm">Carrito vacío</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id_producto}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-900 text-sm">
                              {item.nombre}
                            </h3>
                            <p className="text-xs text-slate-500">
                              ${item.precio_unitario.toFixed(2)} c/u
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.id_producto)}
                            className="ml-2 text-red-500 hover:text-red-700 text-lg"
                            title="Quitar"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateCantidad(
                                  item.id_producto,
                                  item.cantidad - 1,
                                )
                              }
                              className="h-7 w-7 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold"
                            >
                              −
                            </button>
                            <span className="w-8 text-center font-semibold text-slate-900">
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() =>
                                updateCantidad(
                                  item.id_producto,
                                  item.cantidad + 1,
                                )
                              }
                              className="h-7 w-7 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold"
                            >
                              +
                            </button>
                          </div>
                          <div className="font-bold text-emerald-700">
                            ${(item.cantidad * item.precio_unitario).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              {items.length > 0 && (
                <div className="border-t border-slate-200 p-4 space-y-4">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Forma de pago
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {FORMAS_PAGO.map((fp) => (
                        <button
                          key={fp.value}
                          onClick={() => setFormaPago(fp.value)}
                          className={`py-2 rounded-lg text-xs font-medium transition ${
                            formaPago === fp.value
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {fp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                    <div className="text-xs text-emerald-700 font-medium mb-1">
                      TOTAL
                    </div>
                    <div className="text-3xl font-bold text-emerald-700">
                      {formatCurrency(total)}
                    </div>

                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={clearSale}
                      className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Limpiar
                    </button>
                    <button
                      onClick={() => setConfirmOpen(true)}
                      className="flex-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition hover:shadow-lg"
                    >
                      Completar Venta
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-linear-to-br from-emerald-500 to-emerald-600 px-6 py-4 text-white">
              <h2 className="text-xl font-bold">Confirmar Venta</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Items:</span>
                  <span className="font-semibold text-slate-900">
                    {items.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Forma de pago:</span>
                  <span className="font-semibold text-slate-900">
                    {FORMAS_PAGO.find((fp) => fp.value === formaPago)?.label}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-slate-200">
                  <span className="font-bold text-slate-900">Total:</span>
                  <span className="font-bold text-2xl text-emerald-700">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <div className={`rounded-lg p-3 border ${
                formaPago === 'efectivo' 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <p className="text-sm">
                  {formaPago === 'efectivo' ? (
                    <>
                      <strong>📋 Comanda:</strong> Esta venta se registrará como comanda interna (sin factura electrónica AFIP).
                    </>
                  ) : (
                    <>
                      <strong>📄 Factura Electrónica:</strong> Se generará automáticamente un comprobante fiscal en AFIP.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={processing}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={completeSale}
                disabled={processing}
                className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {processing ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Ticket Invisible (Visible on Print) */}
      <Ticket data={ticketData} />
    </div>
  );
}
