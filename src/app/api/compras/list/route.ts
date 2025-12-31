import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? "20")));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Optional filters
    const id_proveedor = searchParams.get("id_proveedor");
    const id_sede = searchParams.get("id_sede");

    let query = supabaseServer
        .from("compras")
        .select(
            `
            id_compra,
            id_proveedor,
            id_usuario,
            id_sede,
            fecha_hora,
            observacion,
            estado,
            proveedores(nombre),
            usuarios(username, nombre, apellido),
            sedes(nombre)
            `,
            { count: "exact" }
        )
        .order("fecha_hora", { ascending: false });

    if (id_proveedor) {
        query = query.eq("id_proveedor", id_proveedor);
    }

    if (id_sede) {
        query = query.eq("id_sede", id_sede);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        data,
        page,
        pageSize,
        total: count ?? 0,
    });
}
