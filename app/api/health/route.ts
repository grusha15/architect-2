import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "architect-2",
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    at: new Date().toISOString(),
  });
}
