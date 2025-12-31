import { createClient } from "@supabase/supabase-js";

/**
 * Server client: usalo SOLO en rutas server-side (Route Handlers, Server Actions).
 * Requiere SERVICE_ROLE para operaciones administrativas. No lo expongas al browser.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServer = createClient(supabaseUrl, serviceRoleKey);
