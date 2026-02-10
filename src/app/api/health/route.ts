import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export async function GET() {
  const health: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  try {
    await getPool().query("SELECT 1");
    health.db = "connected";
  } catch {
    health.db = "error";
  }

  const statusCode = health.db === "error" ? 503 : 200;
  return NextResponse.json(health, { status: statusCode });
}
