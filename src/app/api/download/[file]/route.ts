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
  request: Request,
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

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    // Advertise resume support: interrupted downloads continue instead of
    // restarting from byte 0.
    "Accept-Ranges": "bytes",
  };

  // fs.createReadStream -> web ReadableStream so it can be used as a Response body.
  // 1 MiB chunks keep syscall/GC overhead low on slow client links.
  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    let start = 0;
    let end = info.size - 1;
    if (match) {
      if (match[1]) start = Number.parseInt(match[1], 10);
      if (match[2]) end = Number.parseInt(match[2], 10);
    }
    if (
      !match ||
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start > end ||
      start >= info.size ||
      end >= info.size
    ) {
      return new Response(null, {
        status: 416,
        headers: { ...baseHeaders, "Content-Range": `bytes */${info.size}` },
      });
    }
    const rangeStream = createReadStream(filePath, {
      start,
      end,
      highWaterMark: 1 << 20,
    });
    const rangeWeb = Readable.toWeb(rangeStream) as unknown as ReadableStream<Uint8Array>;
    return new Response(rangeWeb, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${info.size}`,
      },
    });
  }

  const nodeStream = createReadStream(filePath, { highWaterMark: 1 << 20 });
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(info.size),
    },
  });
}
