import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
        const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? "100")));
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const onlyActive = searchParams.get("onlyActive") === "true";

        let query = supabaseServer
            .from("categorias")
            .select("id_categoria, nombre, activa", { count: "exact" })
            .order("nombre", { ascending: true });

        if (onlyActive) {
            query = query.eq("activa", true);
        }

        const { data, error, count } = await query.range(from, to);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            data: data ?? [],
            page,
            pageSize,
            total: count ?? 0
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
    }
}
