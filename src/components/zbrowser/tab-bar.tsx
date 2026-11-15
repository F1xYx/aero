'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import type { BrowserTab } from '@/lib/zbrowser-store';
import { Favicon } from '@/components/zbrowser/favicon';

interface TabBarProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onNewTab: () => void;
  onReorder?: (id: string, toIndex: number) => void;
}

interface DragState {
  id: string;
  pointerId: number;
  startX: number;
  started: boolean;
  fromIndex: number;
  toIndex: number;
  slotWidth: number;
}

/**
 * Tab strip with smooth pointer-based drag & drop reordering:
 * the grabbed tab follows the cursor while neighbours slide aside
 * with a spring-like transform transition.
 */
export function TabBar({ tabs, activeTabId, onActivate, onClose, onNewTab, onReorder }: TabBarProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const shiftsRef = useRef<Map<string, number>>(new Map());
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const clearVisuals = useCallback(() => {
    for (const el of tabRefs.current.values()) {
      el.style.transform = '';
      el.style.zIndex = '';
    }
    shiftsRef.current.clear();
  }, []);

  const endDrag = useCallback(
    (commit: boolean) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      clearVisuals();
      setDraggingId(null);
      const list = listRef.current;
      if (list) {
        try {
          list.releasePointerCapture(d.pointerId);
        } catch {
          /* not captured */
        }
      }
      if (!d.started) return;
      // Swallow the click that follows a real drag so the tab doesn't re-activate.
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      if (commit) onReorder?.(d.id, d.toIndex);
    },
    [clearVisuals, onReorder],
  );

  const onPointerDown = useCallback(
    (tab: BrowserTab, index: number, e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-tab-close]')) return;
      if (!onReorder || tabs.length < 2) return;
      const el = tabRefs.current.get(tab.id);
      if (!el) return;

      // Slot pitch = distance between the left edges of two adjacent tabs.
      let slotWidth = el.offsetWidth + 4;
      const first = tabRefs.current.get(tabs[0].id);
      const second = tabRefs.current.get(tabs[1].id);
      if (first && second) slotWidth = Math.max(24, second.offsetLeft - first.offsetLeft);

      dragRef.current = {
        id: tab.id,
        pointerId: e.pointerId,
        startX: e.clientX,
        started: false,
        fromIndex: index,
        toIndex: index,
        slotWidth,
      };
      const list = listRef.current;
      if (list) {
        try {
          list.setPointerCapture(e.pointerId);
        } catch {
          /* capture is best-effort */
        }
      }
    },
    [onReorder, tabs],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const el = tabRefs.current.get(d.id);
      if (!el) return;

      const dx = e.clientX - d.startX;
      if (!d.started) {
        if (Math.abs(dx) < 6) return;
        d.started = true;
        setDraggingId(d.id);
      }

      el.style.transform = `translateX(${dx}px)`;
      el.style.zIndex = '20';

      // Insertion index = number of non-dragged tabs whose *base* centre
      // is to the left of the pointer (base = position without shifts).
      let toIndex = 0;
      for (let i = 0; i < tabs.length; i++) {
        const t = tabs[i];
        if (t.id === d.id) continue;
        const other = tabRefs.current.get(t.id);
        if (!other) continue;
        const applied = shiftsRef.current.get(t.id) ?? 0;
        const rect = other.getBoundingClientRect();
        const baseCentre = rect.left + rect.width / 2 - applied;
        if (e.clientX > baseCentre) toIndex++;
      }
      d.toIndex = toIndex;

      // Slide the neighbours to their tentative slots.
      for (let i = 0; i < tabs.length; i++) {
        const t = tabs[i];
        if (t.id === d.id) continue;
        const other = tabRefs.current.get(t.id);
        if (!other) continue;
        const idxAmongOthers = i < d.fromIndex ? i : i - 1;
        const tentative = idxAmongOthers + (idxAmongOthers >= toIndex ? 1 : 0);
        const shift = (tentative - i) * d.slotWidth;
        other.style.transform = shift !== 0 ? `translateX(${shift}px)` : '';
        if (shift !== 0) shiftsRef.current.set(t.id, shift);
        else shiftsRef.current.delete(t.id);
      }
    },
    [tabs],
  );

  // Safety net: if the pointer is released outside the strip (e.g. alt-tab), stop the drag.
  useEffect(() => {
    const onBlur = () => endDrag(false);
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [endDrag]);

  return (
    <div
      className="flex h-10 shrink-0 items-center px-2"
      role="tablist"
      aria-label="Вкладки браузера"
    >
      <div
        ref={listRef}
        onPointerMove={onPointerMove}
        onPointerUp={() => endDrag(true)}
        onPointerCancel={() => endDrag(false)}
        className="no-scrollbar flex h-full w-full min-w-0 items-center gap-1 overflow-x-auto py-1"
      >
        {tabs.map((tab, index) => {
          const active = tab.id === activeTabId;
          const title = tab.title || 'Новая вкладка';
          const isDragged = tab.id === draggingId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                if (suppressClickRef.current) return;
                onActivate(tab.id);
              }}
              onPointerDown={(e) => onPointerDown(tab, index, e)}
              className={`zb-anim-tab group flex h-8 min-w-[64px] max-w-[220px] flex-1 cursor-pointer touch-none select-none items-center gap-1.5 rounded-[12px] px-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                isDragged
                  ? 'zb-tab-drag bg-white text-foreground shadow-[0_10px_28px_rgba(0,0,0,0.25)] ring-1 ring-black/10 dark:bg-[#3a3a3e] dark:ring-white/20'
                  : active
                    ? 'bg-white/85 text-foreground shadow-sm ring-1 ring-black/[0.04] dark:bg-white/[0.16] dark:ring-white/[0.08]'
                    : 'text-foreground/60 hover:bg-white/55 hover:text-foreground/85 hover:shadow-sm dark:hover:bg-white/[0.08]'
              }`}
            >
              {tab.loading ? (
                <Loader2
                  className="size-3.5 shrink-0 animate-spin text-foreground/50"
                  aria-hidden="true"
                />
              ) : tab.url ? (
                <Favicon
                  url={tab.url}
                  className="size-3.5 shrink-0 rounded-[3px] transition-transform duration-300 group-hover:scale-125"
                />
              ) : (
                <Search
                  className="size-3.5 shrink-0 text-foreground/40 transition-transform duration-300 group-hover:scale-125"
                  aria-hidden="true"
                />
              )}
              <span className="min-w-0 flex-1 truncate text-left">{title}</span>
              <span
                data-tab-close
                role="button"
                tabIndex={0}
                aria-label={`Закрыть вкладку ${title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onClose(tab.id);
                  }
                }}
                className="flex size-4 shrink-0 items-center justify-center rounded-full opacity-0 transition-all duration-200 hover:scale-110 hover:bg-black/[0.08] active:scale-90 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-white/15 cursor-pointer"
              >
                <X className="size-3" aria-hidden="true" />
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onNewTab}
          aria-label="Новая вкладка"
          title="Новая вкладка"
          className="zb-anim-pop ml-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground/60 transition-all duration-300 hover:rotate-90 hover:bg-white/70 hover:text-foreground hover:shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:scale-90 dark:hover:bg-white/[0.1]"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
