'use client';

import { useMemo, useState } from 'react';
import {
  Bookmark as BookmarkIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  PanelLeft,
  RotateCw,
  Search,
  Settings,
  Share,
  SquareStack,
  Star,
  X,
} from 'lucide-react';
import { Favicon } from '@/components/zbrowser/favicon';
import { TrafficLights } from '@/components/zbrowser/traffic-lights';
import { useZSettings } from '@/lib/zbrowser-settings';
import {
  prettyDomain,
  resolveInput,
  searchQueryOf,
  type BookmarkItem,
  type HistoryItem,
} from '@/lib/zbrowser-utils';

interface ToolbarProps {
  currentUrl: string | null;
  loading: boolean;
  canBack: boolean;
  canForward: boolean;
  bookmarks: BookmarkItem[];
  history: HistoryItem[];
  isBookmarked: boolean;
  isFullscreen: boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onNavigate: (url: string) => void;
  onGoHome: () => void;
  onToggleBookmark: () => void;
  onShare: () => void;
  onToggleSidebar: () => void;
  onToggleOverview: () => void;
  onOpenSettings: () => void;
  onCloseTab: () => void;
  onMinimizeWindow: () => void;
  onToggleFullscreen: () => void;
  addressInputRef: React.RefObject<HTMLInputElement | null>;
}

interface Suggestion {
  key: string;
  kind: 'search' | 'bookmark' | 'history';
  url: string | null;
  label: string;
  hint: string;
}

function ToolIcon({
  label,
  onClick,
  disabled,
  children,
  className = '',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`zb-press flex size-8 shrink-0 items-center justify-center rounded-full text-foreground/75 hover:bg-black/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-white/[0.1] cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

function ToolIconSmall({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="zb-press flex size-7 items-center justify-center rounded-full text-foreground/55 hover:bg-black/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:hover:bg-white/[0.12] cursor-pointer"
    >
      {children}
    </button>
  );
}

export function Toolbar(props: ToolbarProps) {
  const {
    currentUrl,
    loading,
    canBack,
    canForward,
    bookmarks,
    history,
    isBookmarked,
    onBack,
    onForward,
    onReload,
    onNavigate,
    onGoHome,
    onToggleBookmark,
    onShare,
    onToggleSidebar,
    onToggleOverview,
    onOpenSettings,
    onCloseTab,
    onMinimizeWindow,
    onToggleFullscreen,
    isFullscreen,
    addressInputRef,
  } = props;

  const engine = useZSettings((s) => s.engine);
  const suggestEnabled = useZSettings((s) => s.suggest);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);

  const display = useMemo(() => {
    if (!currentUrl) return { icon: 'search' as const, text: 'Поиск или адрес сайта' };
    const q = searchQueryOf(currentUrl);
    if (q !== null) return { icon: 'search' as const, text: q || 'Поиск' };
    return { icon: 'lock' as const, text: prettyDomain(currentUrl) };
  }, [currentUrl]);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!suggestEnabled) return [];
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    const items: Suggestion[] = [];
    const seen = new Set<string>();
    items.push({
      key: 'search',
      kind: 'search',
      url: null,
      label: draft.trim(),
      hint: 'Веб-поиск',
    });
    const push = (kind: Suggestion['kind'], url: string, label: string) => {
      if (seen.has(url) || items.length >= 6) return;
      seen.add(url);
      items.push({ key: `${kind}-${url}`, kind, url, label, hint: '' });
    };
    for (const b of bookmarks ?? []) {
      const hay = `${b.title} ${b.url}`.toLowerCase();
      if (hay.includes(q)) push('bookmark', b.url, b.title || prettyDomain(b.url));
    }
    for (const h of history ?? []) {
      const hay = `${h.title} ${h.url}`.toLowerCase();
      if (hay.includes(q)) push('history', h.url, h.title || prettyDomain(h.url));
    }
    return items;
  }, [draft, bookmarks, history, suggestEnabled]);

  const exitEditing = () => {
    setEditing(false);
    setActiveIdx(-1);
    addressInputRef.current?.blur();
  };

  const commit = (value?: string) => {
    const target = (value ?? draft).trim();
    if (!target) {
      onGoHome();
    } else {
      onNavigate(resolveInput(target, engine));
    }
    exitEditing();
  };

  const pickItem = (item: Suggestion) => {
    if (item.kind === 'search') {
      onNavigate(resolveInput(item.label, engine));
    } else if (item.url) {
      onNavigate(item.url);
    }
    exitEditing();
  };

  const startEditing = () => {
    setDraft(currentUrl ? (searchQueryOf(currentUrl) ?? currentUrl) : '');
    setActiveIdx(-1);
    setEditing(true);
  };

  return (
    <div className="relative flex h-12 shrink-0 items-center gap-0.5 px-2 sm:gap-1 sm:px-3">
      <TrafficLights
        onCloseTab={onCloseTab}
        onMinimize={onMinimizeWindow}
        onToggleFullscreen={onToggleFullscreen}
        isFullscreen={isFullscreen}
      />

      <ToolIcon label="Боковое меню" onClick={onToggleSidebar}>
        <PanelLeft className="size-4" aria-hidden="true" />
      </ToolIcon>
      <ToolIcon label="Назад" onClick={onBack} disabled={!canBack}>
        <ChevronLeft className="size-4" aria-hidden="true" />
      </ToolIcon>
      <ToolIcon label="Вперёд" onClick={onForward} disabled={!canForward}>
        <ChevronRight className="size-4" aria-hidden="true" />
      </ToolIcon>

      <div className="relative mx-auto flex w-full max-w-xl min-w-0 flex-1 px-1">
        {!editing ? (
          <div className="group flex h-9 w-full items-center rounded-[14px] bg-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05] transition-all duration-300 hover:bg-white/90 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:ring-black/[0.08] active:scale-[0.99] dark:bg-white/[0.12] dark:ring-white/[0.1] dark:hover:bg-white/[0.16]">
            <button
              type="button"
              aria-label="Адресная строка — нажмите для редактирования"
              className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-3 text-[13px] text-foreground/80 focus-visible:outline-none"
              onClick={startEditing}
            >
              {display.icon === 'lock' ? (
                <Lock className="size-3 shrink-0 text-foreground/45" aria-hidden="true" />
              ) : (
                <Search className="size-3.5 shrink-0 text-foreground/45" aria-hidden="true" />
              )}
              <span className="truncate">{display.text}</span>
            </button>
            {currentUrl && (
              <div className="flex shrink-0 items-center pr-1">
                <ToolIconSmall label="Обновить" onClick={onReload}>
                  {loading ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <RotateCw className="size-3.5" aria-hidden="true" />
                  )}
                </ToolIconSmall>
                <ToolIconSmall label="Поделиться" onClick={onShare}>
                  <Share className="size-3.5" aria-hidden="true" />
                </ToolIconSmall>
              </div>
            )}
          </div>
        ) : (
          <div className="zb-anim-pop flex h-9 w-full items-center rounded-[14px] bg-white/95 px-2.5 shadow-sm ring-1 ring-black/10 dark:bg-white/[0.16] dark:ring-white/[0.12]">
            <Search
              className="mr-2 size-3.5 shrink-0 text-foreground/40"
              aria-hidden="true"
            />
            <input
              ref={addressInputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setActiveIdx(-1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  exitEditing();
                } else if (e.key === 'Enter') {
                  const item = activeIdx >= 0 ? suggestions[activeIdx] : undefined;
                  if (item) pickItem(item);
                  else commit();
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIdx((i) => Math.max(i - 1, -1));
                }
              }}
              onFocus={(e) => e.currentTarget.select()}
              autoFocus
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              placeholder="Поиск или адрес сайта"
              aria-label="Адресная строка"
              className="h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-foreground/35"
            />
            {draft && (
              <ToolIconSmall
                label="Очистить"
                onClick={() => {
                  setDraft('');
                  setActiveIdx(-1);
                }}
              >
                <X className="size-3.5" aria-hidden="true" />
              </ToolIconSmall>
            )}
          </div>
        )}

        {editing && suggestions.length > 0 && (
          <div
            role="listbox"
            aria-label="Подсказки"
            className="zb-anim-pop absolute left-1 right-1 top-full z-50 mt-1.5 max-h-80 origin-top overflow-y-auto rounded-2xl bg-white/80 py-1 text-popover-foreground shadow-2xl ring-1 ring-black/[0.08] backdrop-blur-2xl dark:bg-[#2b2b2d]/85 dark:ring-white/[0.1] zb-scroll"
          >
            {suggestions.map((item, idx) => (
              <button
                key={item.key}
                type="button"
                role="option"
                aria-selected={idx === activeIdx}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickItem(item)}
                onMouseMove={() => setActiveIdx(idx)}
                className={`flex h-9 w-full cursor-pointer items-center gap-2.5 px-3 text-left text-[13px] transition-colors ${
                  idx === activeIdx
                    ? 'bg-black/[0.05] dark:bg-white/[0.07]'
                    : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
                }`}
              >
                {item.kind === 'search' ? (
                  <Search
                    className="size-4 shrink-0 text-foreground/45"
                    aria-hidden="true"
                  />
                ) : (
                  <Favicon url={item.url} className="size-4 shrink-0 rounded-[3px]" />
                )}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint ? (
                  <span className="shrink-0 text-[11px] text-foreground/40">{item.hint}</span>
                ) : item.kind === 'bookmark' ? (
                  <BookmarkIcon
                    className="size-3.5 shrink-0 text-foreground/35"
                    aria-hidden="true"
                  />
                ) : (
                  <Clock className="size-3.5 shrink-0 text-foreground/35" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {currentUrl && (
          <ToolIcon
            label={isBookmarked ? 'Убрать из закладок' : 'Добавить в закладки'}
            onClick={onToggleBookmark}
          >
            <Star
              key={isBookmarked ? 'bm-on' : 'bm-off'}
              className={`size-4 ${
                isBookmarked
                  ? 'fill-[#007aff] text-[#007aff] animate-[zb-star-pop_0.5s_var(--zb-spring)] dark:fill-[#409cff] dark:text-[#409cff]'
                  : ''
              }`}
              aria-hidden="true"
            />
          </ToolIcon>
        )}
        <ToolIcon label="Обзор вкладок" onClick={onToggleOverview} className="hidden sm:flex">
          <SquareStack className="size-4" aria-hidden="true" />
        </ToolIcon>
        <ToolIcon
          label="Настройки (Ctrl+,)"
          onClick={onOpenSettings}
          className="zb-anim-pop group"
        >
          <Settings
            className="size-4 transition-transform duration-500 group-hover:rotate-90"
            aria-hidden="true"
          />
        </ToolIcon>
      </div>
    </div>
  );
}
