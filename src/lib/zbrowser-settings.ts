'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EngineId = 'google' | 'yandex' | 'bing' | 'duckduckgo';

export interface EngineInfo {
  id: EngineId;
  name: string;
  /** URL prefix that a raw query gets appended to (already encoded). */
  searchUrl: string;
  /** Tailwind gradient classes for the letter badge. */
  badge: string;
  /** Single letter shown in the badge. */
  letter: string;
}

export const ENGINES: Record<EngineId, EngineInfo> = {
  google: {
    id: 'google',
    name: 'Google',
    searchUrl: 'https://www.google.com/search?q=',
    badge: 'bg-gradient-to-br from-[#4285f4] via-[#34a853] to-[#fbbc05]',
    letter: 'G',
  },
  yandex: {
    id: 'yandex',
    name: 'Яндекс',
    searchUrl: 'https://yandex.ru/search/?text=',
    badge: 'bg-gradient-to-br from-[#fc3f1d] to-[#ffcc00]',
    letter: 'Я',
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    searchUrl: 'https://www.bing.com/search?q=',
    badge: 'bg-gradient-to-br from-[#008373] to-[#00a4ef]',
    letter: 'b',
  },
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    // HTML-only endpoint: renders fully through the server-side proxy.
    searchUrl: 'https://html.duckduckgo.com/html/?q=',
    badge: 'bg-gradient-to-br from-[#de5833] to-[#ff7c4d]',
    letter: 'D',
  },
};

export const ENGINE_ORDER: EngineId[] = ['google', 'yandex', 'bing', 'duckduckgo'];

export interface ZSettings {
  engine: EngineId;
  /** Master switch for all decorative animations. */
  animations: boolean;
  /** Start page: favorites section. */
  showFavorites: boolean;
  /** Start page: frequently visited tiles. */
  showFrequent: boolean;
  /** Start page: privacy report card. */
  showPrivacyCard: boolean;
  /** Start page: desktop build download card. */
  showDownloadCard: boolean;
  /** Address bar suggestions (bookmarks + history). */
  suggest: boolean;
  /** Record visited pages into server history. */
  saveHistory: boolean;
  /** Home target for the empty address commit; '' shows the start page. */
  homeUrl: string;
}

export const DEFAULT_SETTINGS: ZSettings = {
  engine: 'bing',
  animations: true,
  showFavorites: true,
  showFrequent: true,
  showPrivacyCard: true,
  showDownloadCard: true,
  suggest: true,
  saveHistory: true,
  homeUrl: '',
};

export interface ZSettingsState extends ZSettings {
  setEngine: (engine: EngineId) => void;
  setAnimations: (v: boolean) => void;
  setShowFavorites: (v: boolean) => void;
  setShowFrequent: (v: boolean) => void;
  setShowPrivacyCard: (v: boolean) => void;
  setShowDownloadCard: (v: boolean) => void;
  setSuggest: (v: boolean) => void;
  setSaveHistory: (v: boolean) => void;
  setHomeUrl: (v: string) => void;
  resetSettings: () => void;
}

export const useZSettings = create<ZSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setEngine: (engine) => set({ engine }),
      setAnimations: (animations) => set({ animations }),
      setShowFavorites: (showFavorites) => set({ showFavorites }),
      setShowFrequent: (showFrequent) => set({ showFrequent }),
      setShowPrivacyCard: (showPrivacyCard) => set({ showPrivacyCard }),
      setShowDownloadCard: (showDownloadCard) => set({ showDownloadCard }),
      setSuggest: (suggest) => set({ suggest }),
      setSaveHistory: (saveHistory) => set({ saveHistory }),
      setHomeUrl: (homeUrl) => set({ homeUrl }),
      resetSettings: () => set({ ...DEFAULT_SETTINGS }),
    }),
    { name: 'zbrowser-settings' },
  ),
);

/** Current engine info (safe to call outside of React render). */
export function getEngine(): EngineInfo {
  return ENGINES[useZSettings.getState().engine] ?? ENGINES.bing;
}
