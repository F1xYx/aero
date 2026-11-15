/** Shared helpers for the Z Browser UI. */

import { ENGINES, type EngineId } from '@/lib/zbrowser-settings';

export interface BookmarkItem {
  id: string;
  url: string;
  title: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitedAt: string;
}

export const SEARCH_ENGINE = 'https://www.bing.com/search?q=';

const ENGINE_DETECTORS: Array<(u: URL) => string | null> = [
  // Google
  (u) =>
    /(^|\.)google\.[a-z.]+$/i.test(u.hostname) && /^\/search$/.test(u.pathname)
      ? u.searchParams.get('q')
      : null,
  // Bing
  (u) =>
    /(^|\.)bing\.com$/i.test(u.hostname) && u.pathname.startsWith('/search')
      ? u.searchParams.get('q')
      : null,
  // Yandex
  (u) =>
    /(^|\.)yandex\.(ru|com|by|kz|ua)$/i.test(u.hostname) && u.pathname.startsWith('/search')
      ? (u.searchParams.get('text') ?? u.searchParams.get('q'))
      : null,
  // DuckDuckGo (regular and html-only endpoints)
  (u) =>
    /(^|\.)duckduckgo\.com$/i.test(u.hostname) && u.pathname !== '/favicon.ico'
      ? u.searchParams.get('q')
      : null,
];

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Pretty domain for the address bar and labels: strips "www." */
export function prettyDomain(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).host.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

/**
 * Returns the search query when the url is a search results page of any known
 * engine (shown in the address bar instead of the raw url), otherwise null.
 */
export function searchQueryOf(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  for (const detect of ENGINE_DETECTORS) {
    const q = detect(u);
    if (q !== null) return q;
  }
  return null;
}

/** What the iframe should load for a given target url (with reload nonce). */
export function proxySrc(url: string, nonce: number): string {
  return `/api/proxy?url=${encodeURIComponent(url)}&zr=${nonce}`;
}

/** Server-side favicon for a page url, delivered through our proxy. */
export function faviconFor(url: string | null | undefined): string | null {
  if (!url) return null;
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    return null;
  }
  if (!host) return null;
  return `/api/proxy?url=${encodeURIComponent(`https://icons.duckduckgo.com/ip3/${host}.ico`)}`;
}

export function searchUrl(query: string, engine: EngineId = 'bing'): string {
  const info = ENGINES[engine] ?? ENGINES.google;
  return `${info.searchUrl}${encodeURIComponent(query)}`;
}

/**
 * Decides what the address bar input means:
 * - explicit http(s) url -> as is;
 * - localhost -> http;
 * - host-like token (no spaces, contains a dot) -> https;
 * - anything else -> web search.
 */
export function resolveInput(input: string, engine: EngineId = 'bing'): string {
  const t = input.trim();
  if (!t) return searchUrl(t, engine);
  if (/^https?:\/\//i.test(t)) return t;
  if (/^localhost(:\d+)?(\/\S*)?$/i.test(t)) return `http://${t}`;
  const looksLikeUrl = !/\s/.test(t) && /^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(t);
  if (looksLikeUrl) return `https://${t}`;
  return searchUrl(t, engine);
}
