import { NextRequest } from 'next/server';
import { createReadStream, existsSync, statSync } from 'fs';
import path from 'path';

/**
 * /download/<file> — раздача готовых сборок Aera из каталога download/.
 * Отдаём только whitelisted имена (Aera-Setup-*.exe / Aera-Portable-*.exe).
 * Стриминг с корректной отменой (client abort → destroy, без uncaughtException).
 */

export const dynamic = 'force-dynamic';

const DOWNLOAD_DIR = path.join(process.cwd(), 'download');

const NAME_RE = /^(Aera-Setup-\d+\.\d+\.\d+\.exe|Aera-Portable-\d+\.\d+\.\d+\.exe)$/i;

function nodeToWebStream(filePath: string): ReadableStream<Uint8Array> {
  const nodeStream = createReadStream(filePath);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer | string) => {
        try {
          controller.enqueue(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk));
        } catch (e) {
          // клиент уже ушёл — гасим поток
          nodeStream.destroy();
        }
      });
      nodeStream.on('end', () => {
        try { controller.close(); } catch (e) { /* уже закрыт */ }
      });
      nodeStream.on('error', (err) => {
        try { controller.error(err); } catch (e) { /* уже закрыт */ }
      });
    },
    cancel() {
      try { nodeStream.destroy(); } catch (e) { /* noop */ }
    },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!NAME_RE.test(file)) {
    return new Response('Not found', { status: 404 });
  }
  const full = path.join(DOWNLOAD_DIR, file);
  if (!existsSync(full) || !statSync(full).isFile()) {
    return new Response('Not found', { status: 404 });
  }
  const size = statSync(full).size;
  return new Response(nodeToWebStream(full), {
    headers: {
      'Content-Type': 'application/vnd.microsoft.portable-executable',
      'Content-Length': String(size),
      'Content-Disposition': 'attachment; filename="' + file + '"',
      'Cache-Control': 'no-store',
      'Accept-Ranges': 'none',
    },
  });
}
