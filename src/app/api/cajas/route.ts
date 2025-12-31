import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id_sede = searchParams.get("id_sede");

        let query = supabaseServer.from("cajas").select("*, sedes(nombre)").order("nombre");

        if (id_sede) {
            query = query.eq("id_sede", id_sede);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id_sede, nombre } = body;

        if (!id_sede || !nombre) {
            return NextResponse.json({ error: "Faltan datos (sede o nombre)" }, { status: 400 });
        }

        const { data, error } = await supabaseServer
            .from("cajas")
            .insert({
                id_sede,
                nombre,
                activa: typeof body.activa !== "undefined" ? body.activa : true
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id_caja, nombre, activa, id_sede } = body;

        if (!id_caja) return NextResponse.json({ error: "ID Caja requerido" }, { status: 400 });

        const updates: any = {};
        if (typeof activa !== "undefined") updates.activa = activa;
        if (nombre) updates.nombre = nombre;
        if (id_sede) updates.id_sede = id_sede;

        const { data, error } = await supabaseServer
            .from("cajas")
            .update(updates)
            .eq("id_caja", id_caja)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id_caja = searchParams.get("id_caja");

        if (!id_caja) return NextResponse.json({ error: "ID Caja requerido" }, { status: 400 });

        const { error } = await supabaseServer
            .from("cajas")
            .delete()
            .eq("id_caja", id_caja);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
