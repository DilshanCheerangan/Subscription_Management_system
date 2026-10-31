import { NextRequest, NextResponse } from "next/server";
import { runBilling } from "@/lib/billing/runBilling";

const DEFAULT_CRON_SECRET = "brightloop_cron_secret_hackathon_default";

function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.substring(7).trim();
  const secret = process.env.CRON_SECRET || DEFAULT_CRON_SECRET;
  return token === secret;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized. Missing or invalid Bearer CRON_SECRET." }, { status: 401 });
  }

  try {
    const result = await runBilling();
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Billing run failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized. Missing or invalid Bearer CRON_SECRET." }, { status: 401 });
  }

  try {
    const result = await runBilling();
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Billing run failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
