"use client";

/* ═══════════════════════════════════════════════════════════════════
   GlassWindow — окно браузера Aero, отрисованное чистым CSS/SVG.
   Один-в-один повторяет реальный интерфейс приложения 2.3.20:

   • вкладки-пилюли Golden Gate + кнопка «новая вкладка» вплотную
     к последней вкладке, кнопки окна справа (без traffic lights);
   • плавающий стеклянный тулбар: назад/вперёд/обновить, адресная
     строка по центру, обзор вкладок и настройки (шестерёнка) справа;
   • стартовая страница: приветствие + быстрые ссылки (плитки с
     иконками сайтов) — без поисковой строки и виджетов;
   • вариант "showcase" показывает настоящую страницу настроек
     (сайдбар + сгруппированные строки, liquid-glass).

   Холст фиксированный 1200×740 (пропорция 16:10) и масштабируется
   под контейнер через transform: scale — типографика всегда верная.
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
  Cog,
  LayoutGrid,
  Lock,
  Minus,
  Plus,
  RotateCw,
  Search,
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
      className={`flex h-[30px] w-[30px] items-center justify-center rounded-[9px] ${
        dim ? "text-[#5c5c62]" : "text-[#c9c9ce]"
      } transition-colors hover:bg-white/[0.08]`}
    >
      {children}
    </span>
  );
}

/* ── Быстрые ссылки стартовой (как quickLinks в приложении) ───────── */
const QUICK_LINKS = [
  { letter: "Y", label: "YouTube", cls: "bg-red-500/80 text-white" },
  { letter: "G", label: "Google", cls: "bg-white/85 text-zinc-800" },
  { letter: "T", label: "Telegram", cls: "bg-sky-400/80 text-white" },
  { letter: "G", label: "GitHub", cls: "bg-zinc-700/90 text-zinc-100" },
  { letter: "W", label: "Wiki", cls: "bg-zinc-400/70 text-white" },
  { letter: "S", label: "Steam", cls: "bg-slate-600/90 text-sky-200" },
  { letter: "X", label: "Twitter", cls: "bg-zinc-900/90 text-zinc-100" },
  { letter: "R", label: "Reddit", cls: "bg-orange-500/80 text-white" },
];

/* ── Стартовая страница: приветствие + быстрые ссылки ─────────────── */
function StartPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1040px] flex-col items-center px-10 pb-8 pt-14">
      <p className="text-[30px] font-semibold tracking-tight text-zinc-100">Добрый день</p>
      <p className="mt-1.5 text-[12.5px] text-[#98989d]">Четверг, 19 ноября</p>

      <div className="mt-9 flex flex-wrap justify-center gap-x-3 gap-y-2">
        {/* 9 плиток как в реальном приложении — один ряд */}
        {QUICK_LINKS.map((tile) => (
          <div
            key={tile.label}
            className="flex w-[88px] flex-col items-center gap-2 rounded-2xl px-1 py-2 transition-colors hover:bg-white/[0.08]"
          >
            <span
              className={`flex h-[56px] w-[56px] items-center justify-center rounded-[16px] border border-white/[0.14] text-[19px] font-bold shadow-[0_10px_28px_-8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)] ${tile.cls}`}
            >
              {tile.letter}
            </span>
            <span className="max-w-[82px] truncate text-[12px] font-medium text-zinc-200">
              {tile.label}
            </span>
          </div>
        ))}

        {/* плитка «Добавить» */}
        <div className="flex w-[88px] flex-col items-center gap-2 rounded-2xl px-1 py-2">
          <span className="flex h-[56px] w-[56px] items-center justify-center rounded-[16px] border border-dashed border-white/25 text-[22px] font-light text-[#98989d]">
            +
          </span>
          <span className="text-[12px] font-medium text-[#98989d]">Добавить</span>
        </div>
      </div>

      {/* «Настроить» — стеклянная пилюля с шестерёнкой */}
      <div className="mt-8 flex h-[34px] items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.08] px-4 text-[12.5px] font-semibold text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_40px_-18px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <Cog className="h-[13px] w-[13px]" strokeWidth={1.8} />
        Настроить
      </div>

      <p className="mt-auto pt-6 text-[10px] font-medium uppercase tracking-[0.22em] text-[#6e6e73]">
        Aurora · тёмная тема · aero://newtab
      </p>
    </div>
  );
}

/* ── Страница настроек (только showcase) — как в приложении 2.3.18 ── */
const SET_NAV = [
  { label: "Стартовая", active: false },
  { label: "Оформление", active: true },
  { label: "Поиск", active: false },
  { label: "Общие", active: false },
  { label: "Приватность", active: false },
  { label: "О браузере", active: false },
];

const ACCENTS = [
  { cls: "bg-[#0a84ff]", sel: true },
  { cls: "bg-[#ff9f0a]", sel: false },
  { cls: "bg-[#32d74b]", sel: false },
  { cls: "bg-[#ff375f]", sel: false },
  { cls: "bg-[#98989d]", sel: false },
];

function SettingsRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-white/[0.05] px-4 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-zinc-100">{label}</p>
        {sub ? <p className="mt-0.5 text-[11.5px] text-[#85858b]">{sub}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function Seg({ options, activeIndex = 0 }: { options: string[]; activeIndex?: number }) {
  return (
    <div className="flex rounded-[9px] bg-white/[0.08] p-[3px]">
      {options.map((o, i) => (
        <span
          key={o}
          className={`rounded-[7px] px-3 py-1 text-[11.5px] font-semibold ${
            i === activeIndex ? "bg-white/[0.16] text-zinc-100" : "text-[#85858b]"
          }`}
        >
          {o}
        </span>
      ))}
    </div>
  );
}

function Toggle({ on = false }: { on?: boolean }) {
  return (
    <span
      className={`relative inline-flex h-[24px] w-[42px] rounded-full transition-colors ${
        on ? "bg-[#30d158]" : "bg-white/[0.14]"
      }`}
    >
      <span
        className={`absolute top-[2px] h-[20px] w-[20px] rounded-full bg-white shadow ${
          on ? "left-[20px]" : "left-[2px]"
        }`}
      />
    </span>
  );
}

function SettingsPage() {
  return (
    <div className="flex h-full">
      {/* сайдбар */}
      <div className="w-[216px] shrink-0 border-r border-white/[0.07] bg-white/[0.04] px-3 py-5">
        <p className="px-3 text-[15px] font-bold text-zinc-100">Настройки</p>
        <div className="mt-4 flex flex-col gap-1">
          {SET_NAV.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-[12.5px] ${
                item.active
                  ? "bg-white/[0.14] font-semibold text-zinc-100"
                  : "text-[#a8a8ad]"
              }`}
            >
              <span className="h-[13px] w-[13px] rounded-[4px] border border-white/25" />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* контент: Оформление */}
      <div className="min-w-0 flex-1 px-10 py-6">
        <p className="text-[21px] font-bold tracking-tight text-zinc-100">Оформление</p>
        <p className="mt-1 text-[12.5px] text-[#85858b]">Тема, акцент и эффекты</p>

        <div className="mt-6 rounded-[14px] border border-white/[0.08] bg-white/[0.05] backdrop-blur-xl">
          <SettingsRow label="Режим оформления" sub="«Авто» следует настройкам системы">
            <Seg options={["Тёмная", "Светлая", "Авто"]} activeIndex={0} />
          </SettingsRow>
          <SettingsRow label="Акцентный цвет">
            <div className="flex items-center gap-2">
              {ACCENTS.map((a, i) => (
                <span
                  key={i}
                  className={`h-[22px] w-[22px] rounded-full ${a.cls} ${
                    a.sel ? "ring-2 ring-white/60 ring-offset-2 ring-offset-[#1d1b2e]/60" : ""
                  }`}
                />
              ))}
            </div>
          </SettingsRow>
        </div>

        <div className="mt-5 rounded-[14px] border border-white/[0.08] bg-white/[0.05] backdrop-blur-xl">
          <SettingsRow label="Интенсивность стекла" sub="Сила размытия liquid glass">
            <Seg options={["Низкая", "Средняя", "Высокая", "Выкл"]} activeIndex={2} />
          </SettingsRow>
          <SettingsRow label="Анимации" sub="Плавные переходы вкладок">
            <Toggle on />
          </SettingsRow>
        </div>
      </div>
    </div>
  );
}

/* ── Титульная строка: вкладки + «новая вкладка» вплотную, окна справа ── */
function Titlebar({ thirdTabX, thirdTabOpacity }: { thirdTabX: MotionValue<number>; thirdTabOpacity: MotionValue<number> }) {
  return (
    <div className="flex h-[46px] shrink-0 items-center gap-1.5 border-b border-white/[0.08] bg-white/[0.07] px-3 backdrop-blur-2xl">
      <div className="ml-1 flex min-w-0 items-center gap-1.5">
        <Tab active label="Новое окно" dot="linear-gradient(135deg, #c084fc, #8b5cf6)" />
        <Tab label="Документация Aero" dot="#5c5c62" />
        <motion.div style={{ x: thirdTabX, opacity: thirdTabOpacity }} className="min-w-0">
          <Tab label="GitHub — F1xYx/aero" dot="#5c5c62" />
        </motion.div>
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] text-[#85858b] transition-colors hover:bg-white/[0.08]">
          <Plus className="h-[13px] w-[13px]" strokeWidth={2} />
        </span>
      </div>

      <div className="flex-1" />

      <div className="-mr-2 flex shrink-0 self-stretch items-stretch">
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

/* ── Панель инструментов: навигация + адрес по центру + обзор/настройки ── */
function Toolbar({ variant }: { variant: "hero" | "showcase" }) {
  return (
    <div className="flex h-[46px] shrink-0 items-center gap-1.5 border-b border-white/[0.08] bg-white/[0.06] px-3 backdrop-blur-2xl">
      <div className="flex shrink-0 items-center gap-1">
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
        <div className="flex h-[32px] w-full max-w-[430px] items-center justify-center gap-2 rounded-[11px] border border-white/10 bg-white/[0.1] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
          <Lock className="h-[11px] w-[11px] shrink-0 text-[#98989d]" strokeWidth={2} />
          <span className="truncate text-[12.5px] text-[#c9c9ce]">
            {variant === "showcase" ? "aero://settings" : "aero://newtab"}
          </span>
          <Search className="h-[11px] w-[11px] shrink-0 text-[#5c5c62]" strokeWidth={2} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <ToolButton>
          <LayoutGrid className="h-[13px] w-[13px]" strokeWidth={1.8} />
        </ToolButton>
        <ToolButton>
          <Cog className="h-[13px] w-[13px]" strokeWidth={1.8} />
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
          {/* мягкое «жидкое» свечение поверх обоев — живое стекло */}
          <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(90%_60%_at_70%_-10%,rgba(255,255,255,0.07),transparent_60%)]" />
          <Titlebar thirdTabX={thirdTabX} thirdTabOpacity={thirdTabOpacity} />
          <Toolbar variant={variant} />
          <div className="relative flex-1 overflow-hidden">
            {variant === "showcase" ? <SettingsPage /> : <StartPage />}
          </div>
        </div>
      </div>
    </div>
  );
}
