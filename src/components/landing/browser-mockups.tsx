"use client";

/* ═══════════════════════════════════════════════════════════════════
   Живые отрисовки интерфейса Aero для лендинга (вместо PNG-скриншотов).

   Все три компонента — чистый код (без растровых картинок), воспроизводящий
   геометрию и палитру настоящего приложения 1:1 по токенам из
   zbrowser-desktop/renderer/styles.css:

     --titlebar-h: 46px  --toolbar-h: 46px  --radius-tab: 9px
     --chrome-tint: rgba(24,24,29,.82)   --chrome-tint-strong: rgba(18,18,23,.94)
     --glass: rgba(255,255,255,.07)      --glass-border: rgba(255,255,255,.09)
     --text: #f5f5f7  --text-secondary: #98989d  --text-tertiary: #6e6e73
     --widget-bg: rgba(28,28,34,.55)     --input-bg: rgba(255,255,255,.08)
     акцент #ff9f0a, traffic lights #ff5f57/#febc2e/#28c840

   Каждая отрисовка — фиксированный холст 1440×900 (пропорция 16:10,
   как у прежних изображений), который масштабируется под контейнер
   через transform: scale — типографика всегда в правильной пропорции.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cog,
  Eye,
  EyeOff,
  Info,
  LayoutGrid,
  Lock,
  MapPin,
  Minus,
  Paintbrush,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Settings,
  ShieldCheck,
  Square,
  X,
  type LucideIcon,
} from "lucide-react";

/* ── Дизайн-токены настоящего Aero ─────────────────────────────────── */
const T = {
  bg: "#16161a",
  chromeTint: "rgba(24, 24, 29, 0.82)",
  chromeTintStrong: "rgba(18, 18, 23, 0.94)",
  glass: "rgba(255, 255, 255, 0.07)",
  glassHover: "rgba(255, 255, 255, 0.11)",
  glassActive: "rgba(255, 255, 255, 0.16)",
  glassBorder: "rgba(255, 255, 255, 0.09)",
  text: "#f5f5f7",
  text2: "#98989d",
  text3: "#6e6e73",
  tabFg: "#b8b8bd",
  widgetBg: "rgba(28, 28, 34, 0.55)",
  inputBg: "rgba(255, 255, 255, 0.08)",
  faviconFallback: "rgba(120, 120, 128, 0.28)",
  accent: "#ff9f0a",
  success: "#30d158",
  font: `"SF Pro Display", "SF Pro Text", -apple-system, "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif`,
} as const;

/* ── Обои «Закат» и другие пресеты (точно из .wp-*) ────────────────── */
const WALLPAPER = {
  sunset:
    "radial-gradient(110% 80% at 15% 15%, rgba(255,154,86,0.13) 0%, transparent 55%), " +
    "radial-gradient(120% 90% at 90% 30%, rgba(255,94,98,0.13) 0%, transparent 60%), " +
    "linear-gradient(160deg, #20161a 0%, #2a1a20 50%, #1a1216 100%)",
  forest:
    "radial-gradient(120% 90% at 25% 15%, rgba(29,58,47,0.2) 0%, transparent 55%), " +
    "radial-gradient(110% 100% at 80% 80%, rgba(42,90,63,0.13) 0%, transparent 60%), " +
    "linear-gradient(155deg, #131a16 0%, #1a2620 50%, #121815 100%)",
  graphite:
    "radial-gradient(130% 100% at 30% 10%, rgba(255,255,255,0.05) 0%, transparent 50%), " +
    "linear-gradient(160deg, #1a1a1e 0%, #202026 55%, #17171b 100%)",
  rose:
    "radial-gradient(120% 90% at 25% 12%, rgba(143,45,86,0.19) 0%, transparent 55%), " +
    "radial-gradient(110% 100% at 80% 85%, rgba(176,48,96,0.13) 0%, transparent 60%), " +
    "linear-gradient(150deg, #1a1016 0%, #241521 50%, #161014 100%)",
  custom: "linear-gradient(140deg, #3a3a44, #232329)",
} as const;

const pad = (n: number) => (n < 10 ? "0" : "") + n;

/* ── Холст с автоскейлом под ширину контейнера ─────────────────────── */
function MockupFrame({
  designWidth,
  designHeight,
  className,
  children,
}: {
  designWidth: number;
  designHeight: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / designWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`relative w-full overflow-hidden ${className ?? ""}`}
      style={{ aspectRatio: `${designWidth} / ${designHeight}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left select-none"
        style={{
          width: designWidth,
          height: designHeight,
          transform: scale != null ? `scale(${scale})` : undefined,
          visibility: scale != null ? "visible" : "hidden",
          fontFamily: T.font,
          color: T.text,
          background: T.bg,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Лёгкое непрерывное «парение» ──────────────────────────────────── */
function FloatY({
  children,
  amp = 2.5,
  dur = 6,
  delay = 0,
}: {
  children: ReactNode;
  amp?: number;
  dur?: number;
  delay?: number;
}) {
  return (
    <motion.div
      animate={{ y: [-amp, amp, -amp] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════ Общие детали окна браузера ══════════════ */

function TrafficLights() {
  return (
    <div
      className="flex items-center"
      style={{ gap: 8, marginRight: 10, filter: "saturate(.85) brightness(.92)" }}
    >
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span
          key={c}
          style={{ width: 12, height: 12, borderRadius: "50%", background: c, border: "1px solid rgba(0,0,0,.18)" }}
        />
      ))}
    </div>
  );
}

function WinButtons() {
  const icons: [LucideIcon, number][] = [
    [Minus, 1.2],
    [Square, 1.2],
    [X, 1.2],
  ];
  return (
    <div className="flex" style={{ marginLeft: 4 }}>
      {icons.map(([Icon, sw], i) => (
        <span
          key={i}
          className="flex items-center justify-center"
          style={{ width: 44, height: 36, color: T.text2 }}
        >
          <Icon size={12} strokeWidth={sw} />
        </span>
      ))}
    </div>
  );
}

function ToolButton({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <span
      className="flex items-center justify-center"
      style={{ width: 34, height: 34, borderRadius: 9, color: T.text, opacity: disabled ? 0.35 : 1 }}
    >
      {children}
    </span>
  );
}

function BrowserTab({ title, letter, active }: { title: string; letter: string; active?: boolean }) {
  return (
    <div
      className="flex items-center"
      style={{
        flex: "1 1 0",
        gap: 7,
        height: 32,
        minWidth: 42,
        maxWidth: 200,
        padding: "0 10px",
        borderRadius: 9,
        overflow: "hidden",
        background: active ? T.glassActive : "transparent",
        color: active ? T.text : T.tabFg,
        boxShadow: active ? "0 1px 3px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.07)" : undefined,
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: T.faviconFallback,
          fontSize: 10,
          fontWeight: 700,
          color: T.text2,
          flexShrink: 0,
        }}
      >
        {letter}
      </span>
      <span className="flex-1 truncate text-left" style={{ fontSize: 12.5 }}>
        {title}
      </span>
      {active && <X size={10} strokeWidth={2} style={{ color: T.text2, opacity: 0.8, flexShrink: 0 }} />}
    </div>
  );
}

/* стеклянная карточка виджета — 1:1 с .widget */
function WidgetCard({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div
      className={className}
      style={{
        background: T.widgetBg,
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: 20,
        padding: 18,
        boxShadow: "0 10px 34px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.07)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Элементы настроек ─────────────────────────────────────────────── */

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className="relative block shrink-0"
      style={{
        width: 42,
        height: 26,
        borderRadius: 13,
        background: on ? T.success : T.inputBg,
        transition: "background .25s",
      }}
    >
      <span
        className="absolute"
        style={{
          top: 2,
          left: on ? 18 : 2,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,.3)",
          transition: "left .22s cubic-bezier(.32,.92,.34,1)",
        }}
      />
    </span>
  );
}

function Seg({ options, active }: { options: string[]; active: number }) {
  return (
    <span className="flex shrink-0" style={{ background: T.inputBg, borderRadius: 9, padding: 2.5, gap: 2 }}>
      {options.map((o, i) => (
        <span
          key={o}
          className="flex items-center justify-center"
          style={{
            padding: "5px 13px",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            color: i === active ? "#fff" : T.text2,
            background: i === active ? T.accent : "transparent",
            boxShadow: i === active ? "0 1px 4px rgba(255,159,10,.4)" : undefined,
          }}
        >
          {o}
        </span>
      ))}
    </span>
  );
}

function MockSlider({ pct, width = 180 }: { pct: number; width?: number }) {
  return (
    <span className="relative block shrink-0" style={{ width, height: 5, borderRadius: 3, background: T.inputBg }}>
      <span className="absolute left-0 top-0 h-full" style={{ width: `${pct}%`, borderRadius: 3, background: T.accent }} />
      <span
        className="absolute"
        style={{
          left: `calc(${pct}% - 8px)`,
          top: -6,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 5px rgba(0,0,0,.4), 0 0 0 4px rgba(255,159,10,.22)",
        }}
      />
    </span>
  );
}

function SectionTitle({ children, first }: { children: ReactNode; first?: boolean }) {
  return (
    <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: first ? 0 : 18, marginBottom: 10 }}>{children}</h3>
  );
}

function FieldRow({ label, sub, children }: { label: string; sub?: string; children?: ReactNode }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "12px 16px", borderRadius: 14, background: T.glass, marginBottom: 8, gap: 12 }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && (
          <div style={{ fontSize: 11.5, color: T.text2, marginTop: 2 }}>{sub}</div>
        )}
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   1. NewtabMockup — окно браузера целиком: титлбар с вкладками,
      тулбар со стеклянным омнибоксом и новая вкладка с виджетами.
      Часы тикают реальным временем, календарь — текущий месяц.
   ═══════════════════════════════════════════════════════════════════ */

function AnalogClock({ now }: { now: Date }) {
  const sec = now.getSeconds();
  const min = now.getMinutes();
  const hr = now.getHours();
  const secAngle = sec * 6;
  const minAngle = min * 6 + sec * 0.1;
  const hourAngle = (hr % 12) * 30 + min * 0.5;

  return (
    <div className="relative shrink-0" style={{ width: 92, height: 92 }}>
      {/* циферблат */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,.14), rgba(255,255,255,.03) 65%)",
          border: "1.5px solid rgba(255,255,255,.2)",
          boxShadow: "inset 0 2px 8px rgba(255,255,255,.06), inset 0 -4px 12px rgba(0,0,0,.3), 0 6px 20px rgba(0,0,0,.3)",
        }}
      />
      {/* 12 часовых меток */}
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: "50%",
            top: 4,
            width: 1.5,
            height: 6,
            marginLeft: -0.75,
            background: "rgba(255,255,255,.4)",
            transformOrigin: "50% 42px",
            transform: `rotate(${i * 30}deg)`,
          }}
        />
      ))}
      {/* стрелки — как в .clock-analog. Время рендерится и на сервере, и на клиенте,
          поэтому возможные расхождения гидратации подавлены — через секунду тик обновит углы */}
      <div
        suppressHydrationWarning
        className="absolute"
        style={{ left: "50%", bottom: "50%", width: 3, height: "26%", marginLeft: -1.5, borderRadius: 3, background: T.text, transformOrigin: "50% 100%", transform: `rotate(${hourAngle}deg)` }}
      />
      <div
        suppressHydrationWarning
        className="absolute"
        style={{ left: "50%", bottom: "50%", width: 2, height: "36%", marginLeft: -1, borderRadius: 3, background: T.text, transformOrigin: "50% 100%", transform: `rotate(${minAngle}deg)` }}
      />
      <div
        suppressHydrationWarning
        className="absolute"
        style={{ left: "50%", bottom: "50%", width: 1, height: "40%", marginLeft: -0.5, background: T.accent, transformOrigin: "50% 100%", transform: `rotate(${secAngle}deg)` }}
      >
        <span
          className="absolute rounded-full"
          style={{ bottom: -6, left: -2, width: 5, height: 5, background: T.accent }}
        />
      </div>
      <div
        className="absolute rounded-full"
        style={{ left: "50%", top: "50%", width: 7, height: 7, margin: -3.5, background: T.accent, boxShadow: `0 0 6px ${T.accent}` }}
      />
    </div>
  );
}

function CalendarGrid({ now }: { now: Date }) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysIn = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();

  const cells: { num: number; other: boolean; today: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - offset + 1;
    if (i >= 34 && dayNum > daysIn) break;
    if (dayNum < 1) cells.push({ num: prevDays + dayNum, other: true, today: false });
    else if (dayNum > daysIn) cells.push({ num: dayNum - daysIn, other: true, today: false });
    else cells.push({ num: dayNum, other: false, today: dayNum === now.getDate() });
  }

  return (
    <div>
      <div className="flex items-baseline" style={{ gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{now.getDate()}</span>
        <span className="capitalize" style={{ fontSize: 13, color: T.text2, fontWeight: 600 }} suppressHydrationWarning>
          {now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
        </span>
      </div>
      <div className="grid text-center" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontSize: 10.5 }} suppressHydrationWarning>
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
          <div key={d} style={{ color: T.text3, fontWeight: 700, padding: "2px 0" }}>
            {d}
          </div>
        ))}
        {cells.map((c, i) => (
          <div
            key={i}
            className={c.other ? "opacity-35" : ""}
            style={{
              padding: "3.5px 0",
              borderRadius: 6,
              color: c.today ? "#fff" : T.text2,
              background: c.today ? T.accent : undefined,
              fontWeight: c.today ? 700 : undefined,
            }}
          >
            {c.num}
          </div>
        ))}
      </div>
    </div>
  );
}

const QUICK_LINKS = ["YouTube", "Google", "Telegram", "GitHub", "Wiki", "Steam", "Twitter", "Reddit"] as const;

function LinksWidget() {
  return (
    <div className="flex flex-col">
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: T.text2,
          marginBottom: 12,
        }}
      >
        Быстрый доступ
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 10, alignContent: "start" }}>
        {QUICK_LINKS.map((name) => (
          <div
            key={name}
            className="flex flex-col items-center"
            style={{ gap: 6, padding: "12px 4px 10px", borderRadius: 14 }}
          >
            <span
              className="flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(255,255,255,.09)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.1)",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {name[0]}
            </span>
            <span className="truncate" style={{ fontSize: 11, maxWidth: 70 }}>
              {name}
            </span>
          </div>
        ))}
        <div className="flex flex-col items-center" style={{ gap: 6, padding: "12px 4px 10px", borderRadius: 14 }}>
          <span
            className="flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: `1.5px dashed ${T.text3}`,
              fontSize: 20,
              color: T.text2,
            }}
          >
            +
          </span>
          <span style={{ fontSize: 11, color: T.text2 }}>Добавить</span>
        </div>
      </div>
    </div>
  );
}

export function NewtabMockup({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const sync = setTimeout(() => setNow(new Date()), 0);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(sync);
      clearInterval(t);
    };
  }, []);

  const h = now.getHours();
  const greeting = h < 5 ? "Доброй ночи" : h < 11 ? "Доброе утро" : h < 17 ? "Добрый день" : h < 23 ? "Добрый вечер" : "Доброй ночи";
  const dateLine = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  const clockDate = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <MockupFrame designWidth={1440} designHeight={900} className={className}>
      <div className="flex h-full flex-col">
        {/* ── Титлбар: traffic lights + вкладки + кнопки Windows ── */}
        <div
          className="relative z-10 flex shrink-0 items-center"
          style={{ height: 46, padding: "0 8px 0 12px", gap: 6, background: T.chromeTint, borderBottom: "1px solid rgba(0,0,0,.25)" }}
        >
          <TrafficLights />
          <div className="flex h-full flex-1 items-center" style={{ gap: 5, padding: "7px 0", minWidth: 0 }}>
            <BrowserTab title="Новая вкладка" letter="Н" active />
            <BrowserTab title="YouTube" letter="Y" />
            <BrowserTab title="GitHub" letter="G" />
            <span className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 9 }}>
              <Plus size={17} strokeWidth={1.6} />
            </span>
          </div>
          <div style={{ width: 10, flexShrink: 0 }} />
          <WinButtons />
        </div>

        {/* ── Тулбар: навигация + стеклянный омнибокс ── */}
        <div
          className="flex shrink-0 items-center"
          style={{ height: 46, padding: "0 12px", gap: 8, background: T.chromeTintStrong, borderBottom: "1px solid rgba(0,0,0,.22)" }}
        >
          <div className="flex items-center" style={{ gap: 4 }}>
            <ToolButton disabled>
              <ChevronLeft size={17} strokeWidth={1.8} />
            </ToolButton>
            <ToolButton disabled>
              <ChevronRight size={17} strokeWidth={1.8} />
            </ToolButton>
            <ToolButton>
              <RotateCw size={16} strokeWidth={1.5} />
            </ToolButton>
          </div>
          <div className="flex flex-1 justify-center" style={{ minWidth: 0 }}>
            <div
              className="flex items-center"
              style={{
                width: 640,
                height: 34,
                padding: "0 12px",
                gap: 8,
                background: T.glass,
                border: `1px solid ${T.glassBorder}`,
                borderRadius: 11,
              }}
            >
              <Lock size={13} strokeWidth={1.4} style={{ color: T.text2, flexShrink: 0 }} />
              <span className="flex-1 text-center" style={{ fontSize: 13.5, color: T.text2, whiteSpace: "nowrap" }}>
                Поиск или адрес сайта
              </span>
              <motion.span
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 1.15, times: [0, 0.48, 0.52, 1], repeat: Infinity, ease: "linear" }}
                className="block"
                style={{ width: 1.5, height: 15, borderRadius: 1, background: T.accent, flexShrink: 0 }}
              />
            </div>
          </div>
          <div className="flex items-center" style={{ gap: 4 }}>
            <ToolButton>
              <LayoutGrid size={16} strokeWidth={1.3} />
            </ToolButton>
            <ToolButton>
              <Settings size={16} strokeWidth={1.4} />
            </ToolButton>
          </div>
        </div>

        {/* ── Новая вкладка: обои + виджеты ── */}
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0" style={{ background: WALLPAPER.sunset }} />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.2)" }} />

          <div
            className="relative z-10 mx-auto flex flex-col items-center"
            style={{ maxWidth: 1080, padding: "40px 32px 0" }}
          >
            {/* приветствие */}
            <div className="text-center">
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 0.2, lineHeight: 1.15, textShadow: "0 2px 18px rgba(0,0,0,.35)" }} suppressHydrationWarning>
                {greeting}
              </div>
              <div className="capitalize" style={{ marginTop: 5, color: "rgba(255,255,255,.75)", fontSize: 13.5, textShadow: "0 1px 10px rgba(0,0,0,.4)" }} suppressHydrationWarning>
                {dateLine}
              </div>
            </div>

            {/* стеклянный поиск */}
            <FloatY amp={2.5} dur={5.5}>
              <div
                className="flex items-center"
                style={{
                  marginTop: 26,
                  width: 600,
                  height: 52,
                  padding: "0 10px 0 20px",
                  gap: 12,
                  background: T.widgetBg,
                  border: "1px solid rgba(255,255,255,.14)",
                  borderRadius: 26,
                  boxShadow: "0 12px 40px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08)",
                }}
              >
                <Search size={17} strokeWidth={1.6} style={{ color: T.text2, flexShrink: 0 }} />
                <span className="flex-1" style={{ fontSize: 15.5, color: T.text2, whiteSpace: "nowrap" }}>
                  Поиск в Google или введите адрес
                </span>
                <span
                  className="flex items-center shrink-0"
                  style={{
                    gap: 6,
                    height: 34,
                    padding: "0 12px",
                    background: T.glassHover,
                    borderRadius: 17,
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  Google
                  <ChevronDown size={12} strokeWidth={1.6} />
                </span>
              </div>
            </FloatY>

            {/* сетка виджетов */}
            <div className="grid w-full items-start" style={{ marginTop: 30, gap: 16, gridTemplateColumns: "repeat(4, 1fr)" }}>
              {/* часы — размер M (span 2) */}
              <WidgetCard style={{ gridColumn: "span 2", minHeight: 150 }}>
                <div className="flex h-full items-center justify-center" style={{ gap: 22, padding: "6px 8px" }}>
                  <AnalogClock now={now} />
                  <div className="flex flex-col" style={{ gap: 3 }}>
                    <div
                      style={{ fontSize: 34, fontWeight: 300, letterSpacing: 0.5, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}
                      suppressHydrationWarning
                    >
                      {pad(now.getHours())}:{pad(now.getMinutes())}
                    </div>
                    <div className="capitalize" style={{ fontSize: 12.5, color: T.text2 }} suppressHydrationWarning>
                      {clockDate}
                    </div>
                  </div>
                </div>
              </WidgetCard>

              {/* погода — размер S */}
              <WidgetCard style={{ minHeight: 150 }} className="flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex items-center" style={{ gap: 5, fontSize: 12.5, color: T.text2, fontWeight: 600 }}>
                    <MapPin size={12} strokeWidth={1.6} />
                    Москва
                  </div>
                  <span style={{ fontSize: 34, lineHeight: 1, filter: "drop-shadow(0 3px 8px rgba(0,0,0,.3))" }}>⛅</span>
                </div>
                <div style={{ fontSize: 40, fontWeight: 200, lineHeight: 1.15, letterSpacing: -1 }}>
                  18<sup style={{ fontSize: 18, fontWeight: 400, color: T.text2 }}>°C</sup>
                </div>
                <div style={{ fontSize: 12.5, color: T.text2 }}>Переменная облачность</div>
                <div
                  className="mt-auto flex flex-wrap"
                  style={{ paddingTop: 10, columnGap: 14, rowGap: 3, fontSize: 11.5, color: T.text2 }}
                >
                  <span>
                    Ощущается: <b style={{ color: T.text, fontWeight: 600 }}>16°</b>
                  </span>
                  <span>
                    Ветер: <b style={{ color: T.text, fontWeight: 600 }}>3 м/с</b>
                  </span>
                </div>
              </WidgetCard>

              {/* календарь — размер S, текущий месяц */}
              <WidgetCard style={{ minHeight: 150 }} className="flex flex-col">
                <CalendarGrid now={now} />
              </WidgetCard>

              {/* быстрый доступ — размер L (span 2) */}
              <WidgetCard style={{ gridColumn: "span 2", minHeight: 230 }} className="flex flex-col">
                <LinksWidget />
              </WidgetCard>
            </div>

            {/* инструменты новой вкладки */}
            <div className="flex" style={{ marginTop: 26, gap: 10 }}>
              <span
                className="flex items-center"
                style={{
                  gap: 7,
                  height: 36,
                  padding: "0 16px",
                  background: T.widgetBg,
                  border: "1px solid rgba(255,255,255,.14)",
                  borderRadius: 18,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Pencil size={14} strokeWidth={1.4} />
                Изменить
              </span>
              <span
                className="flex items-center"
                style={{
                  gap: 7,
                  height: 36,
                  padding: "0 16px",
                  background: T.widgetBg,
                  border: "1px solid rgba(255,255,255,.14)",
                  borderRadius: 18,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Settings size={14} strokeWidth={1.4} />
                Настройки виджетов
              </span>
            </div>
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   2. SettingsMockup — окно aero://settings: иконочные вкладки разделов
      (активный «Общие»), сегмент-контрол темы, акцентные цвета,
      переключатели (два живут в бесконечном цикле) и слайдер стекла.
   ═══════════════════════════════════════════════════════════════════ */

const SETTINGS_TABS: { name: string; icon: LucideIcon }[] = [
  { name: "Общие", icon: Cog },
  { name: "Оформление", icon: Paintbrush },
  { name: "Поиск", icon: Search },
  { name: "Виджеты", icon: LayoutGrid },
  { name: "Приватность", icon: ShieldCheck },
  { name: "О браузере", icon: Info },
];

const ACCENT_DOTS: { color: string; sel?: boolean }[] = [
  { color: "#ff9f0a", sel: true },
  { color: "#ffd60a" },
  { color: "#32d74b" },
  { color: "#ff375f" },
  { color: "#98989d" },
];

export function SettingsMockup({ className }: { className?: string }) {
  const [startupToggle, setStartupToggle] = useState(true);
  const [animationsToggle, setAnimationsToggle] = useState(false);

  useEffect(() => {
    const a = setInterval(() => setStartupToggle((v) => !v), 4000);
    let b: ReturnType<typeof setInterval> | undefined;
    const shift = setTimeout(() => {
      setAnimationsToggle((v) => !v);
      b = setInterval(() => setAnimationsToggle((v) => !v), 4000);
    }, 2000);
    return () => {
      clearInterval(a);
      clearTimeout(shift);
      if (b) clearInterval(b);
    };
  }, []);

  return (
    <MockupFrame designWidth={1440} designHeight={900} className={className}>
      {/* фон страницы настроек — как .settings-page */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          background:
            "radial-gradient(90% 60% at 50% 0%, rgba(255,159,10,.07) 0%, transparent 65%), #16161a",
        }}
      >
        {/* окно настроек — как .settings-window */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            width: 820,
            background: T.chromeTint,
            border: `1px solid ${T.glassBorder}`,
            borderRadius: 22,
            boxShadow: "0 30px 80px rgba(0,0,0,.55)",
          }}
        >
          {/* chrome-полоса окна */}
          <div
            className="relative flex shrink-0 items-center"
            style={{ height: 44, padding: "0 8px 0 12px", background: T.chromeTintStrong, borderBottom: "1px solid rgba(0,0,0,.25)" }}
          >
            <TrafficLights />
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ gap: 6, fontSize: 12.5, color: T.text2 }}
            >
              <Lock size={12} strokeWidth={1.4} />
              aero://settings
            </div>
            <div className="ml-auto">
              <WinButtons />
            </div>
          </div>

          {/* шапка */}
          <div style={{ padding: "24px 30px 0" }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.2 }}>Настройки</div>
            <div style={{ marginTop: 4, color: T.text2, fontSize: 12.5 }}>
              Aero — браузер в стиле Safari 27 (Golden Gate)
            </div>
          </div>

          {/* иконочные вкладки разделов */}
          <div className="flex" style={{ gap: 4, padding: "16px 22px 0", borderBottom: `1px solid ${T.glassBorder}` }}>
            {SETTINGS_TABS.map(({ name, icon: Icon }, i) => {
              const active = i === 0;
              return (
                <div
                  key={name}
                  className="relative flex flex-col items-center"
                  style={{
                    gap: 5,
                    padding: "10px 14px 12px",
                    minWidth: 86,
                    borderRadius: "12px 12px 0 0",
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: active ? T.accent : T.text2,
                    background: active ? "transparent" : undefined,
                  }}
                >
                  <Icon size={21} strokeWidth={1.3} />
                  {name}
                  {active && (
                    <span
                      className="absolute"
                      style={{ bottom: -1, left: 12, right: 12, height: 2.5, borderRadius: 2, background: T.accent }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* тело раздела */}
          <div style={{ padding: "22px 30px 30px" }}>
            <SectionTitle first>Тема</SectionTitle>
            <FieldRow label="Режим оформления">
              <Seg options={["Тёмная", "Светлая", "Авто"]} active={0} />
            </FieldRow>

            <SectionTitle>Акцентный цвет</SectionTitle>
            <div className="flex" style={{ gap: 12, marginBottom: 8 }}>
              {ACCENT_DOTS.map(({ color, sel }) => (
                <span
                  key={color}
                  className="rounded-full"
                  style={{
                    width: 34,
                    height: 34,
                    background: color,
                    border: sel ? "2.5px solid #f5f5f7" : "2.5px solid transparent",
                    boxShadow: sel ? "0 0 0 3px rgba(255,159,10,.25)" : undefined,
                  }}
                />
              ))}
            </div>

            <SectionTitle>Вкладки</SectionTitle>
            <FieldRow label="Компактные вкладки" sub="Заголовок виден только на активной вкладке — как в Safari">
              <Toggle on={startupToggle} />
            </FieldRow>

            <SectionTitle>Эффекты</SectionTitle>
            <FieldRow label="Интенсивность стекла" sub="Сила размытия liquid glass">
              <MockSlider pct={72} />
            </FieldRow>
            <FieldRow label="Анимации" sub="Плавные переходы вкладок и виджетов">
              <Toggle on={animationsToggle} />
            </FieldRow>
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   3. WidgetSettingsMockup — модальное окно «Настройки виджетов» над
      приглушённой новой вкладкой: пресеты фона, колонки, строки
      виджетов с размерами S/M/L и глазками видимости (живой цикл).
   ═══════════════════════════════════════════════════════════════════ */

const SIZES = ["S", "M", "L"] as const;
const SIZE_LABEL: Record<(typeof SIZES)[number], string> = { S: "Мал.", M: "Сред.", L: "Больш." };

const WP_SWATCHES: { name: string; bg: string; sel?: boolean }[] = [
  { name: "Закат", bg: WALLPAPER.sunset, sel: true },
  { name: "Лес", bg: WALLPAPER.forest },
  { name: "Графит", bg: WALLPAPER.graphite },
  { name: "Роза", bg: WALLPAPER.rose },
  { name: "Своя", bg: WALLPAPER.custom },
];

function WsRow({
  icon,
  name,
  sub,
  sizeChip,
  hidden,
  dimmed,
}: {
  icon: string;
  name: string;
  sub: string;
  sizeChip: string;
  hidden?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div
      className="flex items-center"
      style={{ gap: 12, padding: "12px 16px", borderRadius: 14, background: T.glass, marginBottom: 8, opacity: dimmed ? 0.6 : 1 }}
    >
      <span
        className="flex items-center justify-center"
        style={{ width: 34, height: 34, borderRadius: 10, background: T.glassHover, fontSize: 17, flexShrink: 0 }}
      >
        {icon}
      </span>
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 11.5, color: T.text2, marginTop: 1 }}>{sub}</div>
      </div>
      <div className="flex items-center" style={{ gap: 5 }}>
        <span
          className="flex items-center justify-center"
          style={{
            height: 28,
            padding: "0 9px",
            borderRadius: 8,
            background: T.inputBg,
            color: T.text2,
            fontSize: 11,
            fontWeight: 700,
            transition: "width .2s",
          }}
        >
          {sizeChip}
        </span>
        <span
          className="flex items-center justify-center"
          style={{ width: 28, height: 28, borderRadius: 8, background: T.inputBg, color: hidden ? T.text3 : T.text2 }}
        >
          {hidden ? <EyeOff size={13} strokeWidth={1.4} /> : <Eye size={13} strokeWidth={1.4} />}
        </span>
      </div>
    </div>
  );
}

export function WidgetSettingsMockup({ className }: { className?: string }) {
  const [clockSize, setClockSize] = useState<(typeof SIZES)[number]>("M");
  const [calHidden, setCalHidden] = useState(false);

  useEffect(() => {
    const a = setInterval(() => setClockSize((s) => SIZES[(SIZES.indexOf(s) + 1) % SIZES.length]), 3000);
    let b: ReturnType<typeof setInterval> | undefined;
    const shift = setTimeout(() => {
      setCalHidden((v) => !v);
      b = setInterval(() => setCalHidden((v) => !v), 4500);
    }, 2200);
    return () => {
      clearInterval(a);
      clearTimeout(shift);
      if (b) clearInterval(b);
    };
  }, []);

  const ghostCard: CSSProperties = {
    background: T.widgetBg,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 20,
  };

  return (
    <MockupFrame designWidth={1440} designHeight={900} className={className}>
      {/* призрак новой вкладки под модальным окном */}
      <div className="absolute inset-0" style={{ background: WALLPAPER.sunset }} />
      <div className="absolute inset-0 flex flex-col items-center" style={{ paddingTop: 92 }}>
        <div
          style={{
            width: 600,
            height: 52,
            borderRadius: 26,
            background: T.widgetBg,
            border: "1px solid rgba(255,255,255,.14)",
            opacity: 0.6,
          }}
        />
        <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 16, width: 1016, marginTop: 34, opacity: 0.6 }}>
          <div style={{ ...ghostCard, gridColumn: "span 2", height: 150 }} className="flex items-center justify-center">
            <span className="rounded-full" style={{ width: 92, height: 92, border: "1.5px solid rgba(255,255,255,.18)" }} />
          </div>
          <div style={{ ...ghostCard, height: 150 }} />
          <div style={{ ...ghostCard, height: 150 }} />
          <div style={{ ...ghostCard, gridColumn: "span 2", height: 230 }} />
        </div>
      </div>
      {/* затемняющий бэкдроп — как .modal-backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,.5)", backdropFilter: "blur(14px) saturate(1.2)", WebkitBackdropFilter: "blur(14px) saturate(1.2)" }}
      />

      {/* модальное окно */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex flex-col overflow-hidden"
          style={{
            width: 720,
            background: T.chromeTintStrong,
            border: `1px solid ${T.glassBorder}`,
            borderRadius: 22,
            boxShadow: "0 30px 80px rgba(0,0,0,.55)",
          }}
        >
          {/* заголовок */}
          <div className="flex items-center justify-between" style={{ padding: "18px 22px 12px" }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Настройки виджетов</div>
            <span
              className="flex items-center justify-center"
              style={{ width: 28, height: 28, borderRadius: 8, background: T.inputBg, color: T.text2 }}
            >
              <X size={13} strokeWidth={1.6} />
            </span>
          </div>

          <div style={{ padding: "0 22px 22px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, margin: "4px 0 8px" }}>Фон</div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 6 }}>
              {WP_SWATCHES.map(({ name, bg, sel }) => (
                <div
                  key={name}
                  className="relative overflow-hidden"
                  style={{
                    height: 64,
                    borderRadius: 12,
                    background: bg,
                    border: sel ? `2px solid ${T.accent}` : "2px solid transparent",
                    boxShadow: sel ? "0 0 0 3px rgba(255,159,10,.3)" : undefined,
                  }}
                >
                  <span
                    className="absolute inset-x-0 text-center"
                    style={{ bottom: 4, fontSize: 9, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.8)" }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>
            <FieldRow label="Затемнение фона">
              <MockSlider pct={33} width={150} />
            </FieldRow>

            <div style={{ fontSize: 16, fontWeight: 700, margin: "12px 0 8px" }}>Раскладка</div>
            <FieldRow label="Колонок в сетке">
              <Seg options={["2", "3", "4", "5", "6"]} active={2} />
            </FieldRow>

            <div style={{ fontSize: 16, fontWeight: 700, margin: "12px 0 8px" }}>Виджеты</div>
            <WsRow icon="🕐" name="Часы" sub={`${SIZE_LABEL[clockSize]} · 24 ч`} sizeChip={clockSize} />
            <WsRow icon="🌤️" name="Погода" sub="Мал. · Москва" sizeChip="S" />
            <WsRow icon="🔗" name="Быстрый доступ" sub="Больш." sizeChip="L" />
            <WsRow
              icon="📅"
              name="Календарь"
              sub={calHidden ? "Скрыт" : "Мал."}
              sizeChip="S"
              hidden={calHidden}
              dimmed={calHidden}
            />
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}
