import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 15_000;

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Insert <base href="{origin}/"> right after the opening <head> tag (case-insensitive). */
function injectBaseTag(html: string, origin: string): string {
  const baseTag = `<base href="${origin}/">`;
  const headMatch = html.match(/<head\b[^>]*>/i);
  if (!headMatch || headMatch.index === undefined) return html;
  const insertAt = headMatch.index + headMatch[0].length;
  return `${html.slice(0, insertAt)}${baseTag}${html.slice(insertAt)}`;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return textResponse("Missing required query parameter: url", 400);
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return textResponse("Invalid url parameter", 400);
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return textResponse("Only http and https protocols are supported", 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent":
          request.headers.get("user-agent") ?? "Mozilla/5.0 (compatible; AeraProxy/1.0)",
        Accept:
          request.headers.get("accept") ??
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": request.headers.get("accept-language") ?? "ru-RU,ru;q=0.9,en;q=0.8",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return textResponse(`Upstream request failed: ${message}`, 502);
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const isHtml = /text\/html/i.test(contentType);

  let body: string | ArrayBuffer;
  let finalOrigin = target.origin;

  if (isHtml) {
    const html = await upstream.text();
    // Prefer the origin of the final URL after redirects.
    try {
      if (upstream.url) finalOrigin = new URL(upstream.url).origin;
    } catch {
      // Keep target origin as fallback.
    }
    body = injectBaseTag(html, finalOrigin);
  } else {
    body = await upstream.arrayBuffer();
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Proxied-By", "aera-proxy");
  // Deliberately NOT forwarded (they would block iframe embedding / leak state):
  // x-frame-options, content-security-policy, set-cookie, content-encoding.

  return new Response(body, { status: upstream.status, headers });
}
