import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createFacturaB } from "@/lib/afip";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id_venta, doc_nro } = body; // doc_nro is optional (DNI/CUIT of client)

        if (!id_venta) {
            return NextResponse.json({ error: "id_venta requerido" }, { status: 400 });
        }

        // 1. Fetch Sale Data
        const { data: venta, error: ventaError } = await supabaseServer
            .from("ventas")
            .select("*")
            .eq("id_venta", id_venta)
            .single();

        if (ventaError || !venta) {
            return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
        }

        // 2. Check if already invoiced (Check 'facturas' table)
        const { data: existingFactura } = await supabaseServer
            .from("facturas")
            .select("id_factura")
            .eq("id_venta", id_venta)
            .single();

        if (existingFactura) {
            return NextResponse.json({ error: "Esta venta ya fue facturada" }, { status: 400 });
        }

        // 3. Generate Factura with AFIP
        const afipResult = await createFacturaB(venta.total, doc_nro);

        // Format date from YYYYMMDD to YYYY-MM-DD
        const vtoCaeStr = afipResult.vencimiento.toString();
        const vtoCaeDate = `${vtoCaeStr.slice(0, 4)}-${vtoCaeStr.slice(4, 6)}-${vtoCaeStr.slice(6)}`;

        // 4. Save to DB (User's Schema)
        const { error: insertError } = await supabaseServer
            .from("facturas")
            .insert({
                id_venta: id_venta, // UUID
                tipo: afipResult.tipo_comprobante.toString(), // text
                punto_venta: afipResult.punto_venta.toString(), // text
                numero: afipResult.nro_comprobante.toString(), // text
                cae: afipResult.cae,
                vto_cae: vtoCaeDate, // date
                estado: 'aprobada',
                // total: venta.total, // User schema does not have total column
                response_payload: afipResult,
                // We could store request info too if we had it separated
            });

        if (insertError) {
            console.error("Error saving factura to DB:", insertError);
            return NextResponse.json({ error: "Factura generada en AFIP pero falló al guardar en DB.", data: afipResult }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: afipResult });

    } catch (e: any) {
        console.error("Error generating invoice:", e);
        return NextResponse.json({ error: e.message || "Error al facturar" }, { status: 500 });
    }
}
