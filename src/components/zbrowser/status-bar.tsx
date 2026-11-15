'use client';

import { Loader2, ShieldCheck } from 'lucide-react';

interface StatusBarProps {
  loading: boolean;
  url: string | null;
}

export function StatusBar({ loading, url }: StatusBarProps) {
  return (
    <footer className="mt-auto flex items-center gap-3 px-3 h-7 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-500 shrink-0">
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        {loading ? (
          <>
            <Loader2 className="size-3 animate-spin text-emerald-400" aria-hidden="true" />
            <span className="text-zinc-300">Загрузка…</span>
          </>
        ) : (
          <>
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>Готово</span>
          </>
        )}
      </span>
      <span className="truncate flex-1 font-mono hidden md:block">
        {url ?? 'zbrowser://начальная'}
      </span>
      <span className="flex items-center gap-1 whitespace-nowrap ml-auto md:ml-0">
        <ShieldCheck className="size-3 text-emerald-500" aria-hidden="true" />
        <span>Серверный прокси</span>
      </span>
    </footer>
  );
}
