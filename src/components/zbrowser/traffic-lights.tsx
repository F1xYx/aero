'use client';

import { Maximize2, Minus, Minimize2, X } from 'lucide-react';

interface TrafficLightsProps {
  onCloseTab: () => void;
  onMinimize: () => void;
  onToggleFullscreen: () => void;
  isFullscreen?: boolean;
}

const LIGHTS = [
  { color: '#ff5f57', label: 'Закрыть вкладку', Glyph: X, action: 'close' },
  { color: '#febc2e', label: 'Свернуть окно', Glyph: Minus, action: 'minimize' },
  {
    color: '#28c840',
    label: 'Развернуть окно',
    fullscreenLabel: 'Выйти из полноэкранного режима',
    Glyph: Maximize2,
    action: 'fullscreen',
  },
] as const;

/** Functional macOS window control buttons (Safari style). */
export function TrafficLights({
  onCloseTab,
  onMinimize,
  onToggleFullscreen,
  isFullscreen = false,
}: TrafficLightsProps) {
  return (
    <div
      className="group hidden shrink-0 select-none items-center gap-2 pr-2.5 sm:flex"
      role="group"
      aria-label="Управление окном"
    >
      {LIGHTS.map(({ color, label, fullscreenLabel, Glyph, action }) => {
        const ariaLabel =
          action === 'fullscreen' && isFullscreen ? fullscreenLabel : label;
        return (
          <button
            key={color}
            type="button"
            title={ariaLabel}
            aria-label={ariaLabel}
            onClick={() => {
              if (action === 'close') onCloseTab();
              else if (action === 'minimize') onMinimize();
              else onToggleFullscreen();
            }}
            className="flex size-3 cursor-pointer items-center justify-center rounded-full shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.15)] transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40"
            style={{ backgroundColor: color }}
          >
            {action === 'fullscreen' && isFullscreen ? (
              <Minimize2
                className="size-2 text-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                strokeWidth={2.75}
                aria-hidden="true"
              />
            ) : (
              <Glyph
                className="size-2 text-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                strokeWidth={2.75}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
