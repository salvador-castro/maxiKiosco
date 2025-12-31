import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { protectRoute, protectUsuarios } from "./middlewares/roles";

export default async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Role-based protection for usuarios (admin/superadmin only)
    if (pathname.startsWith("/usuarios")) {
        return protectUsuarios(req);
    }

    // Basic authentication protection for other routes
    if (
        pathname.startsWith("/dashboard/") ||
        pathname.startsWith("/pos") ||
        pathname.startsWith("/ventas") ||
        pathname.startsWith("/compras") ||
        pathname.startsWith("/proveedores") ||
        pathname.startsWith("/productos") ||
        pathname.startsWith("/categorias") ||
        pathname.startsWith("/reportes")
    ) {
        return protectRoute(req);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/usuarios/:path*",
        "/dashboard/:path*",
        "/pos/:path*",
        "/ventas/:path*",
        "/compras/:path*",
        "/proveedores/:path*",
        "/productos/:path*",
        "/categorias/:path*",
        "/reportes/:path*",
    ],
};
