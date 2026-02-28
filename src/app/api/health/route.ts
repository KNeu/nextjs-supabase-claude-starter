// =============================================================================
// Health Check Endpoint
// =============================================================================
// GET /api/health
//
// Returns the application's health status. Used by monitoring tools
// (UptimeRobot, Vercel health checks, etc.) to verify the app is running.
// Does not require authentication.
// =============================================================================

import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env["npm_package_version"] ?? "0.1.0",
      environment: process.env["NODE_ENV"] ?? "development",
    },
    { status: 200 }
  );
}
