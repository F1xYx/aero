import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/bookmarks — закладки веб-режима (in-memory).
 * GET  -> { items: [{url, title}] }
 * POST {url, title} -> добавить
 * DELETE ?url=...   -> удалить
 */

export const dynamic = 'force-dynamic';

type Item = { url: string; title: string };
const g = globalThis as unknown as { __aeraBookmarks?: Map<string, Item> };
const store: Map<string, Item> = g.__aeraBookmarks || new Map();
g.__aeraBookmarks = store;

export async function GET() {
  return NextResponse.json({ items: Array.from(store.values()) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = String(body?.url || '').trim();
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ ok: false, error: 'bad url' }, { status: 400 });
    }
    store.set(url, { url, title: String(body?.title || url) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (url) {
    const existed = store.delete(url);
    return NextResponse.json({ ok: true, removed: existed ? 1 : 0 });
  }
  store.clear();
  return NextResponse.json({ ok: true, removed: 'all' });
}
