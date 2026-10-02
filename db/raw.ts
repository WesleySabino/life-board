import { env } from "cloudflare:workers";
export function getRawDb(): D1Database {
  if (!env.DB) throw new Error("Task database binding is unavailable");
  return env.DB;
}
