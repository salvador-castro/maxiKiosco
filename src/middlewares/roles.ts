import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

/**
 * Generic route protection - checks if user has valid JWT token
 * Redirects to /login if not authenticated
 */
export async function protectRoute(req: NextRequest) {
    const token = req.cookies.get("mk_token")?.value;

    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    try {
        // Verify token is valid
        await jwtVerify(token, secret);
        return NextResponse.next();
    } catch {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }
}

/**
 * Role-based protection for /usuarios route
 * Requires admin or superadmin role
 */
export async function protectUsuarios(req: NextRequest) {
    const token = req.cookies.get("mk_token")?.value;

    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    try {
        const { payload } = await jwtVerify(token, secret);
        const rol = String((payload as any).rol_nombre || "").toLowerCase();

        if (rol !== "admin" && rol !== "superadmin") {
            const url = req.nextUrl.clone();
            url.pathname = "/";
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    } catch {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }
}
