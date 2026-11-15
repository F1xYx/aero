'use client';

import { useMemo, useState } from 'react';
import { Bookmark as BookmarkIcon, Moon, Search, Sun, Trash2, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Favicon } from '@/components/zbrowser/favicon';
import { HEADER_HEIGHT } from '@/components/zbrowser/constants';
import { prettyDomain, type BookmarkItem, type HistoryItem } from '@/lib/zbrowser-utils';

interface SidebarProps {
  bookmarks: BookmarkItem[];
  history: HistoryItem[];
  onNavigate: (url: string) => void;
  onRemoveBookmark: (url: string) => void;
  onRemoveHistory: (url: string) => void;
  onClearHistory: () => void;
}

interface HistoryGroup {
  label: string;
  items: HistoryItem[];
}

function groupHistory(rawItems: HistoryItem[]): HistoryGroup[] {
  const items = Array.isArray(rawItems) ? rawItems : [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86_400_000;

  const map = new Map<string, { label: string; order: number; items: HistoryItem[] }>();
  for (const it of items) {
    const d = new Date(it.visitedAt);
    if (Number.isNaN(d.getTime())) continue;
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    let label: string;
    let order: number;
    if (t === startOfToday) {
      label = 'Сегодня';
      order = 0;
    } else if (t === startOfToday - dayMs) {
      label = 'Вчера';
      order = 1;
    } else if (t > startOfToday - 6 * dayMs) {
      label = d.toLocaleDateString('ru-RU', { weekday: 'long' });
      order = (startOfToday - t) / dayMs + 2;
    } else {
      label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      order = t;
    }
    const entry = map.get(label) ?? { label, order, items: [] };
    entry.items.push(it);
    map.set(label, entry);
  }
  return [...map.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ label, items: grouped }) => ({ label, items: grouped }));
}

function Row({
  url,
  label,
  time,
  removeLabel,
  onOpen,
  onRemove,
}: {
  url: string;
  label: string;
  time?: string;
  removeLabel: string;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex h-8 items-center rounded-lg pr-1 transition-all duration-200 hover:bg-white/70 hover:pl-0.5 dark:hover:bg-white/[0.08]">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 text-left focus-visible:outline-none"
        title={url}
      >
        <Favicon url={url} className="size-4 shrink-0 rounded-[3px]" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground/85">{label}</span>
        {time && (
          <span className="shrink-0 text-[10.5px] tabular-nums text-foreground/40">{time}</span>
        )}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        title={removeLabel}
        className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-0 transition-all duration-200 hover:scale-110 hover:bg-black/[0.08] focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-white/15"
      >
        <X
          className="size-3 text-foreground/45 transition-transform duration-300 hover:rotate-90"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="px-3 py-10 text-center text-[12px] leading-relaxed text-foreground/40">{text}</p>
  );
}

export function Sidebar({
  bookmarks,
  history,
  onNavigate,
  onRemoveBookmark,
  onRemoveHistory,
  onClearHistory,
}: SidebarProps) {
  const [view, setView] = useState<'bookmarks' | 'history'>('bookmarks');
  const [query, setQuery] = useState('');
  const { resolvedTheme, setTheme } = useTheme();

  const q = query.trim().toLowerCase();

  const filteredBookmarks = useMemo(
    () =>
      (bookmarks ?? []).filter(
        (b) => !q || `${b.title} ${b.url}`.toLowerCase().includes(q),
      ),
    [bookmarks, q],
  );

  const historyGroups = useMemo(() => {
    const filtered = (history ?? []).filter(
      (h) => !q || `${h.title} ${h.url}`.toLowerCase().includes(q),
    );
    return groupHistory(filtered);
  }, [history, q]);

  const segClass = (active: boolean) =>
    `flex h-7 flex-1 cursor-pointer items-center justify-center rounded-lg text-[12px] font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
      active
        ? 'bg-white/90 text-foreground shadow-sm dark:bg-white/[0.18]'
        : 'text-foreground/55 hover:text-foreground/85'
    }`;

  return (
    <aside
      role="complementary"
      aria-label="Боковое меню"
      style={{ top: HEADER_HEIGHT }}
      className="absolute bottom-0 left-0 z-20 flex w-72 max-w-[85vw] shrink-0 animate-in slide-in-from-left fill-mode-both duration-200 flex-col border-r border-white/40 bg-white/65 backdrop-blur-3xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-[#232325]/80"
    >
      <div className="flex items-center gap-1.5 px-3 pt-3">
        <div className="flex flex-1 rounded-[10px] bg-black/[0.05] p-1 dark:bg-white/[0.08]">
          <button type="button" className={segClass(view === 'bookmarks')} onClick={() => setView('bookmarks')}>
            <BookmarkIcon className="mr-1 size-3.5" aria-hidden="true" />
            Закладки
          </button>
          <button type="button" className={segClass(view === 'history')} onClick={() => setView('history')}>
            <Search className="mr-1 size-3.5" aria-hidden="true" />
            История
          </button>
        </div>
        <button
          type="button"
          aria-label="Переключить тему"
          title="Переключить тему"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground/60 transition-all hover:bg-white/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:hover:bg-white/[0.1]"
        >
          <Sun className="size-4 dark:hidden" aria-hidden="true" />
          <Moon className="hidden size-4 dark:block" aria-hidden="true" />
        </button>
      </div>

      <div className="relative px-3 py-2">
        <Search
          className="pointer-events-none absolute left-5 top-1/2 size-3.5 -translate-y-1/2 text-foreground/40"
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск"
          aria-label="Поиск в боковом меню"
          className="h-7 w-full rounded-[10px] border-0 bg-white/60 pl-7 pr-2 text-[12.5px] outline-none placeholder:text-foreground/35 focus:ring-1 focus:ring-ring dark:bg-white/[0.1]"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 zb-scroll">
        {view === 'bookmarks' ? (
          filteredBookmarks.length === 0 ? (
            <EmptyHint text="Нет закладок. Откройте сайт и нажмите звёздочку в адресной строке." />
          ) : (
            filteredBookmarks.map((b) => (
              <Row
                key={b.id}
                url={b.url}
                label={b.title || prettyDomain(b.url)}
                removeLabel="Удалить закладку"
                onOpen={() => onNavigate(b.url)}
                onRemove={() => onRemoveBookmark(b.url)}
              />
            ))
          )
        ) : historyGroups.length === 0 ? (
          <EmptyHint text="История пуста." />
        ) : (
          historyGroups.map((g) => (
            <div key={g.label}>
              <p className="px-2 pb-1 pt-3 text-[11px] font-semibold text-foreground/45 first:pt-1">
                {g.label}
              </p>
              {g.items.map((h) => (
                <Row
                  key={h.id}
                  url={h.url}
                  label={h.title || prettyDomain(h.url)}
                  time={new Date(h.visitedAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  removeLabel="Удалить запись"
                  onOpen={() => onNavigate(h.url)}
                  onRemove={() => onRemoveHistory(h.url)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {view === 'history' && (history?.length ?? 0) > 0 && (
        <div className="border-t border-white/40 p-2 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onClearHistory}
            className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-[12.5px] text-red-500 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Очистить историю
          </button>
        </div>
      )}
    </aside>
  );
}
