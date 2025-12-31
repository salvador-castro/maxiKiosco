import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminOrSuperadmin } from "@/lib/auth/requireAdmin";

export async function GET() {
    const auth = await requireAdminOrSuperadmin();
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabaseServer
        .from("sedes")
        .select("id_sede, nombre")
        .order("nombre", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
}
