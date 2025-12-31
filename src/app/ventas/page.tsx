"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "@/hooks/useSession";
import Toast, { ToastType } from "@/components/ui/Toast";
import { formatCurrency, numeroALetras } from "@/utils/format";

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
    const [showProductos, setShowProductos] = useState(false);
    const [loading, setLoading] = useState(false);

    const [items, setItems] = useState<VentaItem[]>([]);
    const [formaPago, setFormaPago] = useState("efectivo");

    const [wantsFactura, setWantsFactura] = useState(false);
    const [clienteDoc, setClienteDoc] = useState("");

    // UI State for keyboard navigation
    const [selectedRowIndex, setSelectedRowIndex] = useState<number>(-1);
    const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const [toastOpen, setToastOpen] = useState(false);
    const [toastMsg, setToastMsg] = useState("");
    const [toastType, setToastType] = useState<ToastType>("info");

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const id_sede = user?.id_sede ?? "";

    function toast(message: string, type: ToastType = "info") {
        setToastMsg(message);
        setToastType(type);
        setToastOpen(true);
    }

    // Load categories on mount
    useEffect(() => {
        loadCategorias();
    }, []);

    // Close product dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowProductos(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Keyboard Navigation & Shortcuts
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Ignore if Confirm Modal is open
            if (confirmOpen) return;

            const activeTag = document.activeElement?.tagName.toLowerCase();
            const isTyping = activeTag === "input" || activeTag === "textarea";

            // Allow navigation if not typing in search or if explicit navigation keys are used differently
            // but we want to navigate rows mostly when NOT in the search box, 
            // OR if we are in the search box but press Down/Up to maybe leave it? 
            // For now, let's keep it simple: Standard navigation works when not focused on Main Search.
            // But we allow navigating quantity inputs.

            // 1. Global Shortcuts
            // F10 or similar could be "Cobrar", but user asked for clicking.

            if (items.length === 0) return;

            // Row Navigation (ArrowUp/Down) - only if we are not inside the search input navigating results (future)
            // If strictly inside search input, maybe Arrows navigate items? User asked to "Search... select".
            // Let's assume Arrows control the Table Selection when NOT in Search Input, OR if Search Input is empty/blur.
            // Actually, best POS UX: Arrows always move selection in the grid unless dropdown open.

            if (!showProductos && e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedRowIndex((prev) => Math.min(items.length - 1, prev + 1));
            } else if (!showProductos && e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedRowIndex((prev) => Math.max(0, prev - 1));
            }

            // Edit Quantity (* or Enter on selected row)
            if ((e.key === "*" || e.key === "Enter") && selectedRowIndex !== -1 && !isTyping) {
                e.preventDefault(); // Prevent "*" typing if catching it early
                const input = quantityInputRefs.current[selectedRowIndex];
                if (input) {
                    input.focus();
                    input.select();
                }
            }

            // Delete Item
            if ((e.key === "Delete" || e.key === "Backspace") && selectedRowIndex !== -1 && !isTyping) {
                // If focusing a quantity input, Backspace deletes chars, don't remove row!
                if (activeTag === "input") return; 
                
                e.preventDefault();
                const itemToRemove = items[selectedRowIndex];
                if (itemToRemove) removeItem(itemToRemove.id_producto);
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [items, selectedRowIndex, showProductos, confirmOpen]);

    // Search products with debounce
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim().length < 2 && !selectedCategoria) {
            setProductos([]);
            setShowProductos(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(() => {
            searchProductos();
        }, 300);

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, selectedCategoria]);

    async function loadCategorias() {
        try {
            const res = await fetch("/api/categorias/list");
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? "Error cargando categorías");
            setCategorias(json.data ?? []);
        } catch (e: any) {
            toast(e?.message ?? "Error", "error");
        }
    }

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
            setShowProductos(true);
        } catch (e: any) {
            toast(e?.message ?? "Error", "error");
        } finally {
            setLoading(false);
        }
    }

    function addProducto(prod: Producto) {
        const existingIndex = items.findIndex((i) => i.id_producto === prod.id_producto);

        if (existingIndex >= 0) {
            const existing = items[existingIndex];
            // Increment quantity
            if (existing.cantidad >= prod.stock) {
                toast(`Stock insuficiente. Disponible: ${prod.stock}`, "error");
                return;
            }
            setItems((prev) => {
                const updated = [...prev];
                updated[existingIndex] = { ...existing, cantidad: existing.cantidad + 1 };
                return updated;
            });
            // Select the existing row
            setSelectedRowIndex(existingIndex);
        } else {
            // Add new item
            if (prod.stock < 1) {
                toast("Producto sin stock", "error");
                return;
            }
            setItems((prev) => {
                const newItem = {
                    id_producto: prod.id_producto,
                    nombre: prod.nombre,
                    cantidad: 1,
                    precio_unitario: prod.precio,
                    stock_disponible: prod.stock,
                };
                return [...prev, newItem];
            });
            // Select the new row (last index)
            setSelectedRowIndex(items.length); 
        }

        setSearchQuery("");
        setShowProductos(false);
        // Keep focus on search if needed, or maybe just let user navigate?
        // Usually in POS, you scan/search, then maybe edit quantity. 
        // We'll focus input back effectively.
        searchInputRef.current?.focus();
        
        // toast(`${prod.nombre} agregado`, "success"); // A bit spammy for POS navigation
    }

    function updateCantidad(id_producto: string, cantidad: number) {
        const item = items.find((i) => i.id_producto === id_producto);
        if (!item) return;

        if (cantidad < 1) {
            removeItem(id_producto);
            return;
        }

        if (cantidad > item.stock_disponible) {
            toast(`Stock insuficiente. Disponible: ${item.stock_disponible}`, "error");
            // Do not update
            return;
        }

        setItems((prev) =>
            prev.map((i) => (i.id_producto === id_producto ? { ...i, cantidad } : i))
        );
    }

    function removeItem(id_producto: string) {
        setItems((prev) => {
            const newItems = prev.filter((i) => i.id_producto !== id_producto);
            // Adjust selection if out of bounds
            if (selectedRowIndex >= newItems.length) {
                setSelectedRowIndex(Math.max(0, newItems.length - 1));
            }
            return newItems;
        });
    }

    function clearSale() {
        if (items.length === 0) return;
        if (!confirm("¿Limpiar venta actual?")) return;
        setItems([]);
        setSelectedRowIndex(-1);
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
            // 1. Create Sale
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
            
            const newVentaId = json.data.id_venta;

            // 2. Generate Invoice (if requested)
            if (wantsFactura) {
                 try {
                     const invoiceRes = await fetch("/api/ventas/facturar", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            id_venta: newVentaId,
                            doc_nro: clienteDoc ? parseInt(clienteDoc) : 0
                        }),
                     });
                     const invoiceJson = await invoiceRes.json();
                     if (!invoiceRes.ok) {
                         toast(`Venta OK, pero error al facturar: ${invoiceJson.error}`, "warning");
                     } else {
                         toast("Venta y Factura registradas exitosamente!", "success");
                     }
                 } catch (err: any) {
                     console.error(err);
                     toast("Venta OK, pero falló la conexión con AFIP", "warning");
                 }
            } else {
                toast("¡Venta completada exitosamente!", "success");
            }

            setItems([]);
            setSelectedRowIndex(-1);
            setConfirmOpen(false);
            setWantsFactura(false);
            setClienteDoc("");
        } catch (e: any) {
            toast(e?.message ?? "Error", "error");
        } finally {
            setProcessing(false);
        }
    }

    const total = items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" 
             onClick={() => {
                 // Clicking blank area could reset row selection if desired, 
                 // but for POS keeping selection is usually better.
             }}
        >
            <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />

            <div className="mx-auto max-w-7xl p-6 space-y-6">
                {/* Header */}
                <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-6 py-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                            $
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Ventas</h1>
                            <p className="text-sm text-slate-500">Punto de venta · Nueva transacción</p>
                        </div>
                    </div>
                </div>

                {/* Search & Categories */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
                    {/* Search */}
                    <div className="relative" ref={searchRef}>
                        <input
                            ref={searchInputRef}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                            placeholder="Buscar producto por nombre... (ej: coca)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                // Allow Enter to select first product if available
                                if (e.key === "Enter" && productos.length > 0 && showProductos) {
                                    e.preventDefault();
                                    addProducto(productos[0]);
                                }
                            }}
                            onFocus={() => {
                                if (productos.length > 0) setShowProductos(true);
                            }}
                        />
                        <span className="pointer-events-none absolute right-3 top-3 text-slate-400">🔍</span>

                        {/* Product Dropdown */}
                        {showProductos && productos.length > 0 && (
                            <div className="absolute top-full mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-80 overflow-auto z-10">
                                {loading ? (
                                    <div className="p-4 text-slate-500 text-center">Buscando...</div>
                                ) : (
                                    productos.map((prod) => (
                                        <button
                                            key={prod.id_producto}
                                            onClick={() => addProducto(prod)}
                                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 border-b border-slate-100 last:border-b-0 transition"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="font-medium text-slate-900">{prod.nombre}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {prod.categoria_nombre ?? "Sin categoría"} · Stock: {prod.stock}
                                                    </div>
                                                </div>
                                                <div className="text-lg font-semibold text-emerald-700">
                                                    ${prod.precio.toFixed(2)}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Categories */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-slate-600 font-medium">Categorías:</span>
                        <button
                            onClick={() => setSelectedCategoria("")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition ${
                                selectedCategoria === ""
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            Todas
                        </button>
                        {categorias.map((cat) => (
                            <button
                                key={cat.id_categoria}
                                onClick={() => setSelectedCategoria(cat.id_categoria)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                                    selectedCategoria === cat.id_categoria
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                                {cat.nombre}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sales Items */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h2 className="font-semibold text-slate-900">Items de la venta</h2>
                        <div className="text-xs text-slate-400 hidden sm:block">
                            <span className="bg-white border rounded px-1.5 py-0.5 mx-1">↑</span>
                            <span className="bg-white border rounded px-1.5 py-0.5 mx-1">↓</span> navegar
                            <span className="bg-white border rounded px-1.5 py-0.5 mx-1 ml-3">*</span> editar cant.
                            <span className="bg-white border rounded px-1.5 py-0.5 mx-1 ml-3">Del</span> borrar
                        </div>
                    </div>

                    {items.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <div className="text-4xl mb-2">🛒</div>
                            <div>No hay productos agregados</div>
                            <div className="text-sm">Buscá y seleccioná productos para comenzar</div>
                        </div>
                    ) : (
                        <div className="overflow-auto">
                            <table className="min-w-full w-full text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr className="text-left">
                                        <th className="p-4 font-medium">Producto</th>
                                        <th className="p-4 font-medium">Cantidad</th>
                                        <th className="p-4 font-medium">Precio Unit.</th>
                                        <th className="p-4 font-medium">Subtotal</th>
                                        <th className="p-4 font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, idx) => (
                                        <tr
                                            key={item.id_producto}
                                            onClick={() => setSelectedRowIndex(idx)}
                                            className={`transition cursor-pointer ${
                                                selectedRowIndex === idx ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200" : "hover:bg-slate-50/60"
                                            }`}
                                        >
                                            <td className="p-4">
                                                <div className="font-medium text-slate-900">{item.nombre}</div>
                                                <div className="text-xs text-slate-500">
                                                    Stock disponible: {item.stock_disponible}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateCantidad(item.id_producto, item.cantidad - 1);
                                                        }}
                                                        className="h-8 w-8 rounded-lg border text-black bg-emerald-600 bg-white hover:bg-emerald-600 flex items-center justify-center p-0"
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        ref={(el) => {
                                                            quantityInputRefs.current[idx] = el;
                                                        }}
                                                        type="number"
                                                        min="1"
                                                        max={item.stock_disponible}
                                                        value={item.cantidad}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedRowIndex(idx);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                e.currentTarget.blur();
                                                                // Return focus to table row or something to continue navigation
                                                                searchInputRef.current?.focus(); 
                                                            }
                                                        }}
                                                        onChange={(e) =>
                                                            updateCantidad(item.id_producto, parseInt(e.target.value) || 1)
                                                        }
                                                        className="w-16 text-center rounded-lg border bg-white text-black py-1"
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateCantidad(item.id_producto, item.cantidad + 1);
                                                        }}
                                                        className="h-8 w-8 rounded-lg border text-black bg-emerald-600 bg-white hover:bg-emerald-600 flex items-center justify-center p-0"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-700">${item.precio_unitario.toFixed(2)}</td>
                                            <td className="p-4 font-semibold text-emerald-700">
                                                ${(item.cantidad * item.precio_unitario).toFixed(2)}
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeItem(item.id_producto);
                                                    }}
                                                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100"
                                                >
                                                    Quitar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Payment & Total */}
                {items.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Forma de pago</label>
                                <div className="flex gap-2">
                                    {FORMAS_PAGO.map((fp) => (
                                        <button
                                            key={fp.value}
                                            onClick={() => setFormaPago(fp.value)}
                                            className={`px-4 py-2 rounded-xl border transition ${
                                                formaPago === fp.value
                                                    ? "bg-emerald-600 text-white border-emerald-600"
                                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                            }`}
                                        >
                                            {fp.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-sm text-slate-600 mb-1">Total</div>
                                <div className="text-4xl font-bold text-emerald-700">{formatCurrency(total)}</div>
                                <div className="text-xs text-slate-500 font-medium mt-1 uppercase">
                                    {numeroALetras(total)}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                            <button
                                onClick={clearSale}
                                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-slate-700 hover:bg-slate-50"
                            >
                                Limpiar venta
                            </button>
                            <button
                                onClick={() => setConfirmOpen(true)}
                                className="rounded-xl bg-emerald-600 px-6 py-3 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 font-semibold"
                            >
                                Completar venta
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm Dialog */}
            {confirmOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
                            <h2 className="text-lg font-semibold text-slate-900">Confirmar venta</h2>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Items:</span>
                                    <span className="font-medium text-slate-900">{items.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Forma de pago:</span>
                                    <span className="font-medium text-slate-900">
                                        {FORMAS_PAGO.find((fp) => fp.value === formaPago)?.label}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-slate-200">
                                    <span className="font-semibold text-slate-900">Total:</span>
                                    <span className="font-bold text-2xl text-emerald-700">{formatCurrency(total)}</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        id="afip-check"
                                        checked={wantsFactura}
                                        onChange={(e) => setWantsFactura(e.target.checked)}
                                        className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <label htmlFor="afip-check" className="text-sm font-medium text-slate-700">
                                        Generar Factura ARCA (AFIP)
                                    </label>
                                </div>
                                
                                {wantsFactura && (
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">DNI/CUIT Cliente (Opcional)</label>
                                        <input 
                                            type="text" 
                                            value={clienteDoc}
                                            onChange={(e) => setClienteDoc(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Ingresar número..."
                                            className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                        />
                                        <p className="text-xs text-slate-400 mt-1">Si se deja vacío, se factura a Consumidor Final anónimo.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
                            <button
                                onClick={() => setConfirmOpen(false)}
                                disabled={processing}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={completeSale}
                                disabled={processing}
                                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:opacity-50"
                            >
                                {processing ? "Procesando..." : "Confirmar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
