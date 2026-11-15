'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, ShieldCheck, X } from 'lucide-react';
import { Favicon } from '@/components/zbrowser/favicon';
import { HEADER_HEIGHT } from '@/components/zbrowser/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ENGINES, useZSettings } from '@/lib/zbrowser-settings';
import { type BookmarkItem, type HistoryItem, prettyDomain, resolveInput } from '@/lib/zbrowser-utils';

interface DesktopBuild {
  file: string;
  url: string;
  sizeMb: number;
  kind: 'setup' | 'portable';
}

export interface StartPageProps {
  bookmarks: BookmarkItem[];
  history: HistoryItem[];
  onNavigate: (url: string) => void;
  onRemoveBookmark: (url: string) => void;
  onAddBookmark: (title: string, url: string) => void;
  onOpenSettings?: () => void;
}

interface FrequentSite {
  domain: string;
  url: string;
  title: string;
  visits: number;
  lastVisited: string;
}

const TILE_CLASS =
  'group flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl p-2 transition-all hover:bg-white/55 hover:shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:hover:bg-white/10';

const GLASS_CARD =
  'bg-white/60 shadow-[0_10px_35px_rgba(0,0,0,0.07)] ring-1 ring-white/60 backdrop-blur-xl dark:bg-white/[0.09] dark:shadow-[0_10px_35px_rgba(0,0,0,0.35)] dark:ring-white/[0.1]';

/** Aggregates history entries by pretty domain (www stripped) and returns the top 6 sites. */
function topFrequentSites(rawHistory: HistoryItem[]): FrequentSite[] {
  const history = Array.isArray(rawHistory) ? rawHistory : [];
  const byDomain = new Map<string, FrequentSite>();
  for (const item of history) {
    const domain = prettyDomain(item.url);
    if (!domain) continue;
    const site = byDomain.get(domain);
    if (!site) {
      byDomain.set(domain, {
        domain,
        url: item.url,
        title: item.title,
        visits: 1,
        lastVisited: item.visitedAt,
      });
      continue;
    }
    site.visits += 1;
    if (item.visitedAt > site.lastVisited) {
      site.lastVisited = item.visitedAt;
      site.url = item.url;
      site.title = item.title;
    }
  }
  return Array.from(byDomain.values())
    .sort((a, b) => b.visits - a.visits || b.lastVisited.localeCompare(a.lastVisited))
    .slice(0, 6);
}

/** Number of distinct hosts (www stripped) seen in history. */
function distinctHostCount(rawHistory: HistoryItem[]): number {
  const history = Array.isArray(rawHistory) ? rawHistory : [];
  const hosts = new Set<string>();
  for (const item of history) {
    const domain = prettyDomain(item.url);
    if (domain) hosts.add(domain);
  }
  return hosts.size;
}

export function StartPage({
  bookmarks,
  history,
  onNavigate,
  onRemoveBookmark,
  onAddBookmark,
}: StartPageProps) {
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [desktopBuilds, setDesktopBuilds] = useState<DesktopBuild[]>([]);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const engine = useZSettings((s) => s.engine);
  const showFavorites = useZSettings((s) => s.showFavorites);
  const showFrequent = useZSettings((s) => s.showFrequent);
  const showPrivacyCard = useZSettings((s) => s.showPrivacyCard);
  const engineInfo = ENGINES[engine] ?? ENGINES.google;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/desktop-builds')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.builds) && data.builds.length > 0) {
          setDesktopBuilds(data.builds);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const frequent = useMemo(() => topFrequentSites(history), [history]);
  const analyzedSites = useMemo(() => distinctHostCount(history), [history]);

  const toggleEditing = () => {
    if (editing) setAddOpen(false);
    setEditing(!editing);
  };

  const submitSearch = () => {
    const target = query.trim();
    if (!target) {
      searchInputRef.current?.focus();
      return;
    }
    onNavigate(resolveInput(target, engine));
    setQuery('');
  };

  const submitNewBookmark = () => {
    const raw = newUrl.trim();
    if (!raw) return;
    const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const host = prettyDomain(normalizedUrl) || raw;
    onAddBookmark(newTitle.trim() || host, normalizedUrl);
    setNewTitle('');
    setNewUrl('');
    setAddOpen(false);
  };

  return (
    <div className="pb-10" style={{ paddingTop: HEADER_HEIGHT + 12 }}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6">
        {/* Большая строка поиска */}
        <section className="zb-anim-fade-up flex flex-col items-center gap-3 pt-2" aria-label="Поиск">
          <form
            className="w-full"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch();
            }}
          >
            <div
              className={`relative transition-all duration-300 ${
                searchFocused ? 'scale-[1.015]' : ''
              }`}
            >
              <Search
                className={`pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 transition-colors duration-300 ${
                  searchFocused ? 'text-[#007aff] dark:text-[#409cff]' : 'text-foreground/40'
                }`}
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={`Поиск в ${engineInfo.name} или адрес сайта`}
                aria-label="Поиск или адрес сайта"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                className={`h-12 w-full rounded-full bg-white/70 pl-11 pr-11 text-[14.5px] outline-none ring-1 shadow-[0_10px_35px_rgba(0,0,0,0.07)] backdrop-blur-xl transition-all duration-300 placeholder:text-foreground/40 dark:bg-white/[0.1] dark:ring-white/[0.1] dark:shadow-[0_10px_35px_rgba(0,0,0,0.35)] ${
                  searchFocused
                    ? 'ring-2 ring-[#007aff]/55 shadow-[0_14px_40px_rgba(0,122,255,0.16)] dark:ring-[#409cff]/55'
                    : 'ring-white/60 hover:bg-white/85 dark:hover:bg-white/[0.14]'
                }`}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Очистить"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="zb-press absolute right-3.5 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/[0.06] text-foreground/55 hover:bg-black/[0.1] hover:text-foreground dark:bg-white/[0.12] dark:hover:bg-white/[0.2]"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Избранное */}
        {showFavorites && (
        <section className="zb-anim-fade-up flex flex-col" style={{ animationDelay: '60ms' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-foreground/70">Избранное</h2>
            <button
              type="button"
              onClick={toggleEditing}
              className="text-[12.5px] text-[#007aff] hover:underline dark:text-[#409cff] cursor-pointer focus-visible:outline-none"
            >
              {editing ? 'Готово' : 'Правка'}
            </button>
          </div>

          {bookmarks.length === 0 && !editing ? (
            <div className={`rounded-xl px-4 py-3.5 text-[12.5px] text-foreground/60 ${GLASS_CARD}`}>
              В избранном пока пусто. Откройте сайт и нажмите звёздочку в адресной строке.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-6">
              {bookmarks.map((b) => (
                <div
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigate(b.url)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigate(b.url);
                    }
                  }}
                  className={TILE_CLASS}
                  title={b.title || prettyDomain(b.url)}
                >
                  <span className="relative flex size-14 w-full items-center justify-center rounded-[10px] bg-white/85 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-md transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-black/[0.08] dark:bg-white/[0.14] dark:ring-white/[0.08]">
                    <Favicon url={b.url} className="size-8 transition-transform duration-300 group-hover:scale-110" />
                    {editing && (
                      <button
                        type="button"
                        aria-label="Удалить из избранного"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveBookmark(b.url);
                        }}
                        className="absolute -right-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-white text-foreground/60 shadow-md ring-1 ring-black/10 hover:text-red-500 cursor-pointer"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                  <span className="w-full truncate text-center text-[11px] text-foreground/80">
                    {b.title || prettyDomain(b.url)}
                  </span>
                </div>
              ))}

              {editing && (
                <Popover open={addOpen} onOpenChange={setAddOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" aria-label="Добавить закладку" className={TILE_CLASS}>
                      <span className="flex size-14 w-full items-center justify-center rounded-[10px] border border-dashed border-foreground/25 text-foreground/45">
                        <Plus className="size-5" aria-hidden="true" />
                      </span>
                      <span className="text-[11px] text-foreground/70">Добавить</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <form
                      className="flex flex-col gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitNewBookmark();
                      }}
                    >
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Название"
                        aria-label="Название"
                      />
                      <Input
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="example.com"
                        aria-label="Адрес"
                      />
                      <Button
                        type="button"
                        onClick={submitNewBookmark}
                        className="w-full bg-[#007aff] text-white hover:bg-[#0071e3] cursor-pointer"
                      >
                        Добавить
                      </Button>
                    </form>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </section>
        )}

        {/* Часто посещаемые */}
        {showFrequent && frequent.length > 0 && (
          <section className="zb-anim-fade-up flex flex-col" style={{ animationDelay: '120ms' }}>
            <h2 className="mb-3 text-[13px] font-semibold text-foreground/70">
              Часто посещаемые
            </h2>
            <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-6">
              {frequent.map((site) => (
                <button
                  key={site.domain}
                  type="button"
                  onClick={() => onNavigate(site.url)}
                  className={TILE_CLASS}
                  title={site.title || site.domain}
                >
                  <span className="flex size-12 w-full items-center justify-center rounded-[10px] bg-white/85 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-md transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-black/[0.08] dark:bg-white/[0.14] dark:ring-white/[0.08]">
                    <Favicon url={site.url} className="size-6 transition-transform duration-300 group-hover:scale-110" />
                  </span>
                  <span className="w-full truncate text-center text-[11px] text-foreground/80">
                    {site.domain}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Отчёт о конфиденциальности */}
        {showPrivacyCard && (
        <div
          className={`zb-anim-fade-up flex w-fit max-w-full items-center gap-3 rounded-xl px-4 py-3.5 transition-transform duration-300 hover:scale-[1.015] ${GLASS_CARD}`}
          style={{ animationDelay: '180ms' }}
        >
          <ShieldCheck className="size-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-foreground/80">
              ZBrowser предотвращает отслеживание
            </p>
            <p className="text-[11.5px] text-foreground/50">
              За последние 7 дней было проанализировано сайтов: {analyzedSites}
            </p>
          </div>
        </div>
        )}

        {/* Небольшая ссылка на настольную версию */}
        {desktopBuilds.length > 0 && (
          <p
            className="zb-anim-fade-up mx-auto max-w-md text-center text-[11px] leading-relaxed text-foreground/35"
            style={{ animationDelay: '220ms' }}
          >
            Нужен полноценный браузер на движке Chromium?{' '}
            <a
              href={desktopBuilds[0].url}
              download={desktopBuilds[0].file}
              className="underline decoration-foreground/25 underline-offset-2 transition-colors hover:text-foreground/70 cursor-pointer"
            >
              Скачайте ZBrowser для Windows
            </a>{' '}
            ({desktopBuilds[0].sizeMb} МБ).
          </p>
        )}

        <p
          className="zb-anim-fade-up mx-auto max-w-md text-center text-[11px] leading-relaxed text-foreground/35"
          style={{ animationDelay: '300ms' }}
        >
          Страницы загружаются через серверный прокси: сайты с авторизацией и сложным
          JavaScript могут работать ограниченно.
        </p>
      </div>
    </div>
  );
}
