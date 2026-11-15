'use client';

import { useEffect, useState } from 'react';
import { BatteryMedium, Compass, Moon, Settings, Sun, Wifi } from 'lucide-react';
import { useTheme } from 'next-themes';

interface MenuBarProps {
  onNewTab: () => void;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
}

const MENUS: Array<{ label: string; action?: 'newTab' | 'sidebar' }> = [
  { label: 'Файл', action: 'newTab' },
  { label: 'Правка' },
  { label: 'Вид' },
  { label: 'История', action: 'sidebar' },
  { label: 'Закладки', action: 'sidebar' },
  { label: 'Окно' },
  { label: 'Справка' },
];

/** Frosted-glass macOS menu bar shown above the browser window. */
export function MenuBar({ onNewTab, onOpenSidebar, onOpenSettings }: MenuBarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const date = now
    .toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '');

  const runAction = (action?: 'newTab' | 'sidebar') => {
    if (action === 'newTab') onNewTab();
    else if (action === 'sidebar') onOpenSidebar();
  };

  return (
    <div
      className="flex h-8 shrink-0 select-none items-center bg-black/[0.22] px-2 text-[12px] text-white/95 backdrop-blur-2xl backdrop-saturate-150"
      role="banner"
      aria-label="Строка меню macOS"
    >
      <span className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5">
        <Compass className="size-3.5" aria-hidden="true" />
        <span className="font-semibold">Safari</span>
      </span>

      <nav className="ml-1 hidden items-center lg:flex" aria-label="Меню приложения">
        {MENUS.map((m) => (
          <button
            key={m.label}
            type="button"
            title={m.action === 'newTab' ? 'Новая вкладка' : undefined}
            onClick={() => runAction(m.action)}
            className="cursor-pointer rounded-md px-2 py-0.5 text-white/85 transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
          >
            {m.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-1 items-center justify-end gap-0.5">
        <button
          type="button"
          aria-label="Настройки (Ctrl+,)"
          title="Настройки (Ctrl+,)"
          onClick={onOpenSettings}
          className="flex size-7 cursor-pointer items-center justify-center rounded-full text-white/85 transition-all duration-300 hover:rotate-90 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
        >
          <Settings className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Переключить тему"
          title="Переключить тему"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="flex size-7 cursor-pointer items-center justify-center rounded-full text-white/85 transition-all duration-300 hover:scale-110 hover:bg-white/20 active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
        >
          <Sun className="size-3.5 dark:hidden" aria-hidden="true" />
          <Moon className="hidden size-3.5 dark:block" aria-hidden="true" />
        </button>
        <span className="flex size-7 items-center justify-center" title="Wi-Fi">
          <Wifi className="size-3.5 text-white/85" aria-hidden="true" />
        </span>
        <span className="mr-1.5 hidden size-7 items-center justify-center sm:flex" title="Батарея">
          <BatteryMedium className="size-4 text-white/85" aria-hidden="true" />
        </span>
        <span className="whitespace-nowrap pr-1 tabular-nums" suppressHydrationWarning>
          {date} {time}
        </span>
      </div>
    </div>
  );
}
