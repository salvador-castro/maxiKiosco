import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export type SessionClaims = {
    sub: string; // id_usuario
    username: string;
    id_rol: string;
    rol_nombre: string;
    rol_nivel: number;
    id_sede: string;
};

export async function signSession(claims: SessionClaims) {
    return await new SignJWT(claims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("12h")
        .sign(secret);
}

export async function verifySession(token: string) {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionClaims;
}
