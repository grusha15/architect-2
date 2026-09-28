import { NextResponse } from "next/server";
import { availableProviders } from "@/lib/gateway";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ providers: availableProviders() });
}
