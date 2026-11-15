import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/history — журнал истории веб-режима (in-memory на инстанс сервера).
 * GET    ?limit=100     -> { items: [{url, title, visitedAt}] }
 * POST   {url, title}   -> upsert записи
 * DELETE ?url=...       -> удалить одну | без url — очистить всё
 */

export const dynamic = 'force-dynamic';

type Item = { url: string; title: string; visitedAt: string };
const MAX = 2000;

const g = globalThis as unknown as { __aeraHistory?: Map<string, Item> };
const store: Map<string, Item> = g.__aeraHistory || new Map();
g.__aeraHistory = store;

function pushFront(key: string, item: Item) {
  store.delete(key);
  store.set(key, item);
  while (store.size > MAX) {
    const first = store.keys().next().value;
    if (first === undefined) break;
    store.delete(first);
  }
}

export async function GET(req: NextRequest) {
  const limit = Math.min(500, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 100));
  const items = Array.from(store.values()).slice(0, limit);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = String(body?.url || '').trim();
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ ok: false, error: 'bad url' }, { status: 400 });
    }
    const title = String(body?.title || url);
    pushFront(url, { url, title, visitedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (url) {
    store.delete(url);
    return NextResponse.json({ ok: true, removed: 1 });
  }
  store.clear();
  return NextResponse.json({ ok: true, removed: 'all' });
}
