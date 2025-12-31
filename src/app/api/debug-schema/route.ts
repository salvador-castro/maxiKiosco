import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const table = searchParams.get("table") || "ventas";

        // Try to fetch one row to see columns
        const { data, error } = await supabaseServer.from(table).select("*").limit(1);

        if (error) {
            return NextResponse.json({
                error: error,
                message: "Error querying ventas table"
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data_sample: data,
            keys: data && data.length > 0 ? Object.keys(data[0]) : "Table empty"
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
