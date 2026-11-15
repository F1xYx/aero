'use client';

import { useEffect } from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { BrowserTab } from '@/lib/zbrowser-store';
import { Favicon } from '@/components/zbrowser/favicon';
import { prettyDomain } from '@/lib/zbrowser-utils';

interface TabOverviewProps {
  tabs: BrowserTab[];
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onNewTab: () => void;
  onDismiss: () => void;
}

/** Safari-style grid overview of all open tabs. */
export function TabOverview({ tabs, onActivate, onClose, onNewTab, onDismiss }: TabOverviewProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Обзор вкладок"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200 sm:p-8"
      onClick={onDismiss}
    >
      <div
        className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
        onClick={(e) => e.stopPropagation()}
      >
        {tabs.map((tab, idx) => (
          <div
            key={tab.id}
            className="zb-anim-pop overflow-hidden rounded-xl bg-background shadow-2xl ring-1 ring-black/10 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)] dark:ring-white/10"
            style={{ animationDelay: `${Math.min(idx * 50, 350)}ms` }}
          >
            <div className="flex h-9 items-center gap-2 border-b border-black/[0.06] px-3 dark:border-white/[0.08]">
              {tab.url ? (
                <Favicon url={tab.url} className="size-4 shrink-0 rounded-[3px]" />
              ) : (
                <Search className="size-4 shrink-0 text-foreground/40" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 truncate text-xs">
                {tab.title || 'Новая вкладка'}
              </span>
              <button
                type="button"
                aria-label={`Закрыть вкладку ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded transition-colors hover:bg-black/10 dark:hover:bg-white/15"
              >
                <X className="size-3 text-foreground/55" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => onActivate(tab.id)}
              className="group flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 transition-colors hover:bg-black/[0.03] focus-visible:outline-none dark:hover:bg-white/[0.05]"
            >
              {tab.url ? (
                <Favicon
                  url={tab.url}
                  className="size-8 rounded-lg transition-transform duration-300 group-hover:scale-125"
                />
              ) : (
                <Search
                  className="size-8 text-foreground/30 transition-transform duration-300 group-hover:scale-125"
                  aria-hidden="true"
                />
              )}
              <span className="px-3 text-[11px] text-foreground/50">
                {tab.url ? prettyDomain(tab.url) : 'Начальная страница'}
              </span>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onNewTab}
          className="zb-anim-pop flex min-h-[148px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/15 text-foreground/45 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/30 hover:text-foreground/70 focus-visible:outline-none"
          style={{ animationDelay: `${Math.min(tabs.length * 50, 350)}ms` }}
        >
          <Plus
            className="size-7 transition-transform duration-300 hover:scale-110 hover:rotate-90"
            aria-hidden="true"
          />
          <span className="text-xs">Новая вкладка</span>
        </button>
      </div>
    </div>
  );
}
