import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(req: NextRequest) {
  const currentVersion = req.nextUrl.searchParams.get("v") || "unknown";
  const osVersion = req.nextUrl.searchParams.get("os") || "unknown";

  // Log for analytics (visible in Vercel logs)
  console.log(`[update-check] v=${currentVersion} os=${osVersion} ts=${new Date().toISOString()}`);

  try {
    const manifestPath = join(process.cwd(), "public", "releases", "latest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));

    return NextResponse.json(manifest, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
  }
}
