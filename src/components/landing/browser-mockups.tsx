"use client";

/* ═══════════════════════════════════════════════════════════════════
   GlassWindow — стеклянное окно браузера Aero, отрисованное чистым
   CSS/SVG (никаких скриншотов). Воспроизводит реальный интерфейс
   приложения: aurora-обои, стеклянный хром с backdrop-blur, вкладки-
   пилюли Golden Gate, адресная строка и стартовая страница с виджетами.

   Холст фиксированный 1200×740 (пропорция 16:10) и масштабируется под
   контейнер через transform: scale — типографика всегда в верной
   пропорции. Параметр `variant` позволяет показать окно дважды:
   "hero" — статичное, "showcase" — с боковой панелью и перестроением
   вкладок, управляемым scroll-прогрессом (MotionValue 0…1).
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Cloud,
  LayoutGrid,
  Lock,
  Minus,
  Plus,
  RotateCw,
  Search,
  Settings,
  Square,
  X,
} from "lucide-react";

const CANVAS_W = 1200;
const CANVAS_H = 740;

/* Aurora-обои настоящего Aero (wp-aurora из styles.css приложения) */
const AURORA_BG = [
  "radial-gradient(120% 90% at 20% 10%, #2b1055 0%, transparent 55%)",
  "radial-gradient(110% 100% at 85% 20%, #0f3460 0%, transparent 60%)",
  "radial-gradient(130% 110% at 60% 100%, rgba(117,151,222,0.2) 0%, transparent 55%)",
  "linear-gradient(150deg, #16161f 0%, #1d1b2e 45%, #171722 100%)",
].join(", ");

/* ── Масштабирование холста под контейнер ─────────────────────────── */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function useFitScale(canvasW: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / canvasW);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [canvasW]);

  return { ref, scale };
}

/* ── Мелкие детали хрома ──────────────────────────────────────────── */
function Tab({ label, dot, active = false }: { label: string; dot: string; active?: boolean }) {
  return (
    <div
      className={`flex h-[30px] min-w-0 max-w-[190px] items-center gap-2 rounded-[9px] px-3 text-[12.5px] leading-none ${
        active
          ? "bg-white/[0.14] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]"
          : "text-[#85858b]"
      }`}
    >
      <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: dot }} />
      <span className="truncate">{label}</span>
    </div>
  );
}

function WinButton({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <span
      className={`flex w-[42px] flex-1 items-center justify-center text-[#a8a8ad] transition-colors ${
        danger ? "hover:bg-[#e5484d] hover:text-white" : "hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </span>
  );
}

function ToolButton({ children, dim = false }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <span
      className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
        dim ? "text-[#5c5c62]" : "text-[#c9c9ce]"
      }`}
    >
      {children}
    </span>
  );
}

function Widget({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`h-[196px] rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_50px_-24px_rgba(0,0,0,0.55)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Виджет: часы (аналоговые + цифровые) ─────────────────────────── */
function ClockWidget() {
  return (
    <Widget>
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="relative h-[84px] w-[84px] rounded-full border border-white/[0.14] bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <span className="absolute left-1/2 top-[5px] h-[3px] w-[1.5px] -translate-x-1/2 rounded-full bg-white/25" />
          <span className="absolute bottom-[5px] left-1/2 h-[3px] w-[1.5px] -translate-x-1/2 rounded-full bg-white/25" />
          <span className="absolute left-[5px] top-1/2 h-[1.5px] w-[3px] -translate-y-1/2 rounded-full bg-white/25" />
          <span className="absolute right-[5px] top-1/2 h-[1.5px] w-[3px] -translate-y-1/2 rounded-full bg-white/25" />
          {/* 19:20 → часовая 220°, минутная 120°, секундная живая */}
          <span
            className="absolute bottom-[42px] left-1/2 -ml-[1.5px] w-[3px] rounded-full bg-zinc-200/90"
            style={{ height: 22, transformOrigin: "50% 100%", transform: "rotate(220deg)" }}
          />
          <span
            className="absolute bottom-[42px] left-1/2 -ml-[1px] w-[2px] rounded-full bg-zinc-300/80"
            style={{ height: 30, transformOrigin: "50% 100%", transform: "rotate(120deg)" }}
          />
          <span className="aero-second-hand absolute bottom-[42px] left-1/2 -ml-[0.75px] w-[1.5px] rounded-full bg-gradient-to-t from-fuchsia-500 to-fuchsia-300" style={{ height: 33, transformOrigin: "50% 100%" }} />
          <span className="absolute left-1/2 top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/85 shadow-[0_0_0_2px_rgba(0,0,0,0.25)]" />
        </div>
        <div className="text-center">
          <p className="text-[22px] font-semibold tabular-nums leading-none text-zinc-100">19:20</p>
          <p className="mt-1 text-[11px] text-[#98989d]">Москва · вечер</p>
        </div>
      </div>
    </Widget>
  );
}

/* ── Виджет: погода ───────────────────────────────────────────────── */
function WeatherWidget() {
  return (
    <Widget>
      <div className="flex h-full flex-col justify-between py-1">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-medium text-[#c9c9ce]">Москва</p>
          <Cloud className="h-[18px] w-[18px] text-[#98989d]" strokeWidth={1.7} />
        </div>
        <p className="text-[44px] font-light leading-none tracking-tight text-zinc-100">1°</p>
        <div>
          <p className="text-[12px] text-[#c9c9ce]">Облачно</p>
          <p className="mt-0.5 text-[11px] text-[#6e6e73]">макс. 3° · мин. −1°</p>
        </div>
      </div>
    </Widget>
  );
}

/* ── Виджет: быстрый доступ ───────────────────────────────────────── */
const QUICK_LINKS = [
  { letter: "G", label: "Google", cls: "bg-violet-500/70 text-white" },
  { letter: "Y", label: "YouTube", cls: "bg-red-500/70 text-white" },
  { letter: "W", label: "Wikipedia", cls: "bg-zinc-500/50 text-zinc-100" },
  { letter: "H", label: "Habr", cls: "bg-teal-500/70 text-white" },
  { letter: "@", label: "Mail", cls: "bg-fuchsia-500/70 text-white" },
  { letter: "D", label: "Docs", cls: "bg-amber-500/70 text-black/80" },
];

function QuickAccessWidget() {
  return (
    <Widget>
      <div className="flex h-full flex-col">
        <p className="text-[12px] font-medium text-[#c9c9ce]">Быстрый доступ</p>
        <div className="mt-3 grid flex-1 grid-cols-3 gap-2">
          {QUICK_LINKS.map((tile) => (
            <span
              key={tile.label}
              title={tile.label}
              className={`flex items-center justify-center rounded-xl text-[12px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] ${tile.cls}`}
            >
              {tile.letter}
            </span>
          ))}
        </div>
      </div>
    </Widget>
  );
}

/* ── Виджет: календарь (ноябрь 2026, день 15 выделен) ─────────────── */
const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function CalendarWidget() {
  const cells: (number | null)[] = [
    ...Array.from({ length: 6 }, () => null),
    ...Array.from({ length: 30 }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Widget>
      <div className="flex h-full flex-col">
        <p className="text-[12px] font-medium text-[#c9c9ce]">
          Ноябрь <span className="text-[#6e6e73]">2026</span>
        </p>
        <div className="mt-2 grid grid-cols-7 gap-y-[3px] text-center">
          {WEEKDAYS.map((day) => (
            <span key={day} className="text-[9.5px] uppercase text-[#5c5c62]">
              {day}
            </span>
          ))}
          {cells.map((day, index) => (
            <span key={index} className="flex h-[17px] items-center justify-center">
              {day !== null ? (
                <span
                  className={`flex h-[16px] w-[16px] items-center justify-center rounded-full text-[10px] tabular-nums ${
                    day === 15
                      ? "bg-violet-500/90 font-semibold text-white shadow-[0_0_12px_rgba(139,92,246,0.5)]"
                      : "text-[#a8a8ad]"
                  }`}
                >
                  {day}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </Widget>
  );
}

/* ── Стартовая страница ───────────────────────────────────────────── */
function StartPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1020px] flex-col items-center px-10 pb-8 pt-11">
      <p className="text-[30px] font-semibold tracking-tight text-zinc-100">Добрый вечер</p>
      <p className="mt-1.5 text-[12.5px] text-[#98989d]">Суббота, 15 ноября</p>

      <div className="mt-7 flex h-[52px] w-full max-w-[600px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_24px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <Search className="h-4 w-4 shrink-0 text-[#98989d]" strokeWidth={1.8} />
        <span className="truncate text-[13px] text-[#85858b]">Поиск в Google или введите адрес</span>
        <span className="ml-auto shrink-0 rounded-md border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[10.5px] font-medium text-[#98989d]">
          Google
        </span>
      </div>

      <div className="mt-8 grid w-full grid-cols-4 gap-4">
        <ClockWidget />
        <WeatherWidget />
        <QuickAccessWidget />
        <CalendarWidget />
      </div>

      <p className="mt-auto pt-6 text-[10px] font-medium uppercase tracking-[0.22em] text-[#6e6e73]">
        Aurora · тёмная тема · aero://newtab
      </p>
    </div>
  );
}

/* ── Боковая панель (только showcase, выезжает от scroll-прогресса) ─ */
const SIDEBAR_BOOKMARKS = [
  { label: "GitHub — F1xYx/aero", dot: "#28c840" },
  { label: "Документация Aero", dot: "#8b5cf6" },
  { label: "Safari 27 · HIG", dot: "#d946ef" },
  { label: "Aero: changelog", dot: "#2dd4bf" },
];

const SIDEBAR_LATER = [
  { label: "Liquid Glass в вебе", dot: "#fbbf24" },
  { label: "Chromium → webview", dot: "#5c5c62" },
];

function Sidebar({ x, opacity }: { x: MotionValue<number>; opacity: MotionValue<number> }) {
  return (
    <motion.div
      style={{ x, opacity }}
      className="absolute bottom-0 left-0 top-0 z-10 w-[232px] border-r border-white/[0.08] bg-[#15151d]/[0.72] shadow-[24px_0_60px_-30px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
    >
      <div className="flex h-full flex-col p-4">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#6e6e73]">
          Боковая панель
        </p>
        <p className="mt-4 text-[11px] font-medium text-[#85858b]">Закладки</p>
        <div className="mt-2 flex flex-col gap-1">
          {SIDEBAR_BOOKMARKS.map((row) => (
            <div key={row.label} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] text-[#c9c9ce]">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: row.dot }} />
              <span className="truncate">{row.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[11px] font-medium text-[#85858b]">Чтение позже</p>
        <div className="mt-2 flex flex-col gap-1">
          {SIDEBAR_LATER.map((row) => (
            <div key={row.label} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] text-[#98989d]">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: row.dot }} />
              <span className="truncate">{row.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300/80" />
          <p className="text-[10.5px] leading-snug text-[#98989d]">Обои просвечивают сквозь стекло</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Титульная строка ─────────────────────────────────────────────── */
function Titlebar({ thirdTabX, thirdTabOpacity }: { thirdTabX: MotionValue<number>; thirdTabOpacity: MotionValue<number> }) {
  return (
    <div className="flex h-[46px] shrink-0 items-center gap-2.5 border-b border-white/[0.08] bg-white/[0.07] px-3.5 backdrop-blur-2xl">
      <div className="flex shrink-0 items-center gap-2 pl-0.5">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      </div>

      <div className="ml-2.5 flex min-w-0 items-center gap-1.5">
        <Tab active label="Новое окно" dot="linear-gradient(135deg, #c084fc, #8b5cf6)" />
        <Tab label="Документация Aero" dot="#5c5c62" />
        <motion.div style={{ x: thirdTabX, opacity: thirdTabOpacity }} className="min-w-0">
          <Tab label="GitHub — F1xYx/aero" dot="#5c5c62" />
        </motion.div>
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-[#85858b]">
          <Plus className="h-[13px] w-[13px]" strokeWidth={2} />
        </span>
      </div>

      <div className="ml-auto -mr-2.5 flex shrink-0 self-stretch items-stretch">
        <WinButton>
          <Minus className="h-[11px] w-[11px]" strokeWidth={1.8} />
        </WinButton>
        <WinButton>
          <Square className="h-[10px] w-[10px]" strokeWidth={1.8} />
        </WinButton>
        <WinButton danger>
          <X className="h-[12px] w-[12px]" strokeWidth={1.8} />
        </WinButton>
      </div>
    </div>
  );
}

/* ── Панель инструментов ──────────────────────────────────────────── */
function Toolbar({ variant }: { variant: "hero" | "showcase" }) {
  return (
    <div className="flex h-[46px] shrink-0 items-center gap-2 border-b border-white/[0.08] bg-white/[0.06] px-3 backdrop-blur-2xl">
      <div className="flex shrink-0 items-center gap-1.5">
        <ToolButton>
          <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={2} />
        </ToolButton>
        <ToolButton dim>
          <ChevronRight className="h-[14px] w-[14px]" strokeWidth={2} />
        </ToolButton>
        <ToolButton>
          <RotateCw className="h-[12px] w-[12px]" strokeWidth={2} />
        </ToolButton>
      </div>

      <div className="flex min-w-0 flex-1 justify-center px-2">
        <div className="flex h-[32px] w-full max-w-[430px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.1] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
          <Lock className="h-[11px] w-[11px] shrink-0 text-[#98989d]" strokeWidth={2} />
          <span className="truncate text-[12.5px] text-[#c9c9ce]">
            {variant === "showcase" ? "aero.dev" : "aero://newtab"}
          </span>
          <Search className="h-[11px] w-[11px] shrink-0 text-[#5c5c62]" strokeWidth={2} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <ToolButton>
          <LayoutGrid className="h-[13px] w-[13px]" strokeWidth={1.8} />
        </ToolButton>
        <ToolButton>
          <Settings className="h-[13px] w-[13px]" strokeWidth={1.8} />
        </ToolButton>
      </div>
    </div>
  );
}

/* ═══ GlassWindow — публичный компонент ════════════════════════════ */
export interface GlassWindowProps {
  variant?: "hero" | "showcase";
  /** scroll-прогресс 0…1 для варианта "showcase" */
  progress?: MotionValue<number>;
  className?: string;
}

export function GlassWindow({ variant = "hero", progress, className = "" }: GlassWindowProps) {
  const { ref, scale } = useFitScale(CANVAS_W);

  /* Хуки всегда вызываются безусловно: в hero-варианте «прогресс»
     считается завершённым (1) — третья вкладка видна статично. */
  const idle = useMotionValue(variant === "showcase" ? 0 : 1);
  const p = progress ?? idle;

  const thirdTabX = useTransform(p, [0.26, 0.4], [-46, 0]);
  const thirdTabOpacity = useTransform(p, [0.26, 0.4], [0, 1]);
  const sidebarX = useTransform(p, [0.4, 0.55], [-240, 0]);
  const sidebarOpacity = useTransform(p, [0.4, 0.5], [0, 1]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`relative w-full ${className}`}
      style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
        }}
      >
        {/* окно */}
        <div
          className="relative flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-white/[0.12] shadow-[0_70px_160px_-40px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)]"
          style={{ background: AURORA_BG }}
        >
          {/* мягкое «жидкое» свечение поверх обоих — живое стекло */}
          <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(90%_60%_at_70%_-10%,rgba(255,255,255,0.07),transparent_60%)]" />
          <Titlebar thirdTabX={thirdTabX} thirdTabOpacity={thirdTabOpacity} />
          <Toolbar variant={variant} />
          <div className="relative flex-1 overflow-hidden">
            <StartPage />
            {variant === "showcase" ? <Sidebar x={sidebarX} opacity={sidebarOpacity} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
