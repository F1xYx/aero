'use client';

import { create } from 'zustand';
import { hostOf, proxySrc } from '@/lib/zbrowser-utils';

export interface BrowserTab {
  id: string;
  /** Logical current url; null means the start page is shown. */
  url: string | null;
  title: string;
  /** What the iframe element should currently be loading. */
  srcUrl: string | null;
  nonce: number;
  loading: boolean;
  /** Back/forward stack of urls. */
  history: string[];
  historyIndex: number;
}

export interface TabMeta {
  url?: string | null;
  title?: string;
  loading?: boolean;
  /** Push meta.url into the per-tab back/forward stack. */
  pushHistory?: boolean;
}

interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string;
  newTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  /** Move `id` so it sits at `toIndex` among the other tabs (drag & drop). */
  reorderTabs: (id: string, toIndex: number) => void;
  navigate: (id: string, url: string) => void;
  goHome: (id: string) => void;
  back: (id: string) => void;
  forward: (id: string) => void;
  reload: (id: string) => void;
  setTabMeta: (id: string, meta: TabMeta) => void;
}

function mkTab(): BrowserTab {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    url: null,
    title: 'Новая вкладка',
    srcUrl: null,
    nonce: 0,
    loading: false,
    history: [],
    historyIndex: -1,
  };
}

const initialTab = mkTab();

export const useZBrowserStore = create<BrowserState>()((set) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,

  newTab: () =>
    set((state) => {
      const t = mkTab();
      return { tabs: [...state.tabs, t], activeTabId: t.id };
    }),

  closeTab: (id) =>
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id);
      if (idx === -1) return state;
      const tabs = state.tabs.filter((t) => t.id !== id);
      if (tabs.length === 0) {
        const t = mkTab();
        return { tabs: [t], activeTabId: t.id };
      }
      const activeTabId =
        state.activeTabId === id ? tabs[Math.min(idx, tabs.length - 1)].id : state.activeTabId;
      return { tabs, activeTabId };
    }),

  setActiveTab: (id) => set(() => ({ activeTabId: id })),

  reorderTabs: (id, toIndex) =>
    set((state) => {
      const from = state.tabs.findIndex((t) => t.id === id);
      if (from === -1) return state;
      const tabs = state.tabs.slice();
      const [tab] = tabs.splice(from, 1);
      const idx = Math.max(0, Math.min(tabs.length, toIndex));
      tabs.splice(idx, 0, tab);
      return { tabs };
    }),

  navigate: (id, url) =>
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id !== id) return t;
        const history = [...t.history.slice(0, t.historyIndex + 1), url];
        const nonce = t.nonce + 1;
        return {
          ...t,
          url,
          srcUrl: proxySrc(url, nonce),
          nonce,
          loading: true,
          title: hostOf(url),
          history,
          historyIndex: history.length - 1,
        };
      }),
    })),

  goHome: (id) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, url: null, srcUrl: null, loading: false, title: 'Новая вкладка' } : t,
      ),
    })),

  back: (id) =>
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id !== id || t.historyIndex <= 0) return t;
        const historyIndex = t.historyIndex - 1;
        const url = t.history[historyIndex];
        const nonce = t.nonce + 1;
        return {
          ...t,
          historyIndex,
          url,
          srcUrl: proxySrc(url, nonce),
          nonce,
          loading: true,
          title: hostOf(url),
        };
      }),
    })),

  forward: (id) =>
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id !== id || t.historyIndex >= t.history.length - 1) return t;
        const historyIndex = t.historyIndex + 1;
        const url = t.history[historyIndex];
        const nonce = t.nonce + 1;
        return {
          ...t,
          historyIndex,
          url,
          srcUrl: proxySrc(url, nonce),
          nonce,
          loading: true,
          title: hostOf(url),
        };
      }),
    })),

  reload: (id) =>
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id !== id || !t.url) return t;
        const nonce = t.nonce + 1;
        return { ...t, srcUrl: proxySrc(t.url, nonce), nonce, loading: true };
      }),
    })),

  setTabMeta: (id, meta) =>
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id !== id) return t;
        const { pushHistory, ...rest } = meta;
        let history = t.history;
        let historyIndex = t.historyIndex;
        if (pushHistory && rest.url && rest.url !== t.url) {
          history = [...history.slice(0, historyIndex + 1), rest.url];
          historyIndex = history.length - 1;
        }
        return { ...t, ...rest, history, historyIndex };
      }),
    })),
}));

export function canGoBack(tab: BrowserTab | undefined): boolean {
  return !!tab && tab.historyIndex > 0;
}

export function canGoForward(tab: BrowserTab | undefined): boolean {
  return !!tab && tab.historyIndex < tab.history.length - 1;
}
