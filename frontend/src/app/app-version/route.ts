import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Build ID of the deployed frontend — clients compare it with their own to detect updates. */
export function GET() {
  return NextResponse.json(
    { build: process.env.NEXT_PUBLIC_BUILD_ID },
    { headers: { "Cache-Control": "no-store" } },
  );
}
