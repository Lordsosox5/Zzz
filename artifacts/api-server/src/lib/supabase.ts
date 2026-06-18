import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`),
      v,
    ])
  );
}

export function mapRow<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [toCamel(k), v])
  ) as T;
}

export function mapRows<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => mapRow<T>(r));
}

export function dbError(error: { message: string } | null, res: import("express").Response, status = 500): boolean {
  if (error) {
    res.status(status).json({ error: error.message });
    return true;
  }
  return false;
}
