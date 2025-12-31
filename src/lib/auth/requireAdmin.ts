import { cookies } from "next/headers";
import { verifySession } from "./jwt";

export async function requireAdminOrSuperadmin() {
    const token = (await cookies()).get("mk_token")?.value;

    if (!token) {
        return { ok: false as const, reason: "NO_TOKEN" };
    }

    try {
        const session = await verifySession(token);

        const rol = (session.rol_nombre || "").toLowerCase();

        if (rol !== "admin" && rol !== "superadmin") {
            return { ok: false as const, reason: "FORBIDDEN_ROLE", session };
        }

        return { ok: true as const, session };
    } catch {
        return { ok: false as const, reason: "INVALID_TOKEN" };
    }
}
