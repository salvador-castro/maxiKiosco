import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminOrSuperadmin } from "@/lib/auth/requireAdmin";

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    const auth = await requireAdminOrSuperadmin();
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabaseServer
        .from("proveedores")
        .delete()
        .eq("id_proveedor", params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
