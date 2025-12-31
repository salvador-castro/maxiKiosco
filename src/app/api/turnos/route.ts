import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id_sede = searchParams.get("id_sede");

        let query = supabaseServer.from("turnos").select("*, sedes(nombre)").order("nombre");

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
        const { id_sede, nombre, hora_inicio, hora_fin, activo } = body;

        if (!id_sede || !nombre) {
            return NextResponse.json({ error: "Faltan datos (sede o nombre)" }, { status: 400 });
        }

        const { data, error } = await supabaseServer
            .from("turnos")
            .insert({
                id_sede,
                nombre,
                hora_inicio: hora_inicio || "08:00",
                hora_fin: hora_fin || "16:00",
                activo: activo !== undefined ? activo : true
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
        const { id_turno, nombre, hora_inicio, hora_fin, activo, id_sede } = body;

        if (!id_turno) return NextResponse.json({ error: "ID Turno requerido" }, { status: 400 });

        const updates: any = {};
        if (nombre) updates.nombre = nombre;
        if (hora_inicio) updates.hora_inicio = hora_inicio;
        if (hora_fin) updates.hora_fin = hora_fin;
        if (typeof activo !== "undefined") updates.activo = activo;
        if (id_sede) updates.id_sede = id_sede;

        const { data, error } = await supabaseServer
            .from("turnos")
            .update(updates)
            .eq("id_turno", id_turno)
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
        const id_turno = searchParams.get("id_turno");

        if (!id_turno) return NextResponse.json({ error: "ID Turno requerido" }, { status: 400 });

        const { error } = await supabaseServer
            .from("turnos")
            .delete()
            .eq("id_turno", id_turno);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
