import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOWNLOAD_DIR = "/home/z/my-project/download";
/** Only Aero (formerly Aera) Windows build artifacts are downloadable, nothing else. */
const ALLOWED_PATTERN = /^Aer[oa]-(Setup|Portable)-[\w.-]+\.exe$/i;

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  const fileName = decodeSegment(file ?? "");

  // Reject path traversal and any unexpected shape before touching the disk.
  if (
    !fileName ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("..") ||
    fileName.length > 200 ||
    !ALLOWED_PATTERN.test(fileName)
  ) {
    return NextResponse.json(
      { ok: false, error: "File not found" },
      { status: 404 }
    );
  }

  const filePath = path.join(DOWNLOAD_DIR, fileName);

  let info;
  try {
    info = await stat(filePath);
  } catch {
    return NextResponse.json(
      { ok: false, error: "File not found" },
      { status: 404 }
    );
  }

  if (!info.isFile()) {
    return NextResponse.json(
      { ok: false, error: "File not found" },
      { status: 404 }
    );
  }

  // fs.createReadStream -> web ReadableStream so it can be used as a Response body.
  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(info.size),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
