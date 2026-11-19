"use client";

/* ═══════════════════════════════════════════════════════════════════
   Лендинг Aero — «Liquid Glass».
   Полностью новая визуальная система: матовые стеклянные окна,
   aurora-градиенты, scroll-параллакс. Ни одного скриншота — только
   CSS/SVG-мокапы из browser-mockups.tsx и логотип /aero-icon.png.
   ═══════════════════════════════════════════════════════════════════ */

import Image from "next/image";
import { useRef, type ReactNode } from "react";
import {
  MotionConfig,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";
import {
  ArrowUpRight,
  Cpu,
  Download,
  Droplets,
  Layers,
  LayoutDashboard,
  MoonStar,
  Package,
  PanelsTopLeft,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { DesktopDownloads } from "@/components/desktop-downloads";
import { GlassWindow } from "@/components/landing/browser-mockups";

const VERSION = "2.3.18";

const NAV_LINKS = [
  { href: "#features", label: "Возможности" },
  { href: "#glass", label: "Стекло" },
  { href: "#download", label: "Скачать" },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

const reveal: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.75, ease: EASE } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};

/* ── Хуки и примитивы ─────────────────────────────────────────────── */

/** Параллакс по глобальному скроллу: элемент «плывёт» медленнее страницы. */
function useScrollParallax(distance: number): MotionValue<number> {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const raw = useTransform(scrollY, [0, 2400], [0, reduce ? 0 : distance]);
  return useSpring(raw, { stiffness: 45, damping: 22, mass: 0.5 });
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-15%" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function GlassChip({
  icon: Icon,
  className = "",
  speed = -40,
  delay = 0,
}: {
  icon: LucideIcon;
  className?: string;
  speed?: number;
  delay?: number;
}) {
  const y = useScrollParallax(speed);
  return (
    <motion.div
      aria-hidden="true"
      style={{ y }}
      className={`pointer-events-none absolute z-20 hidden lg:block ${className}`}
    >
      <div className="aero-float" style={{ animationDelay: `${delay}s` }}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_18px_50px_-16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-xl">
          <Icon className="h-5 w-5 text-zinc-200" strokeWidth={1.6} />
        </div>
      </div>
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: ReactNode;
  text: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-[12.5px] font-medium tracking-wide text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl">
        {eyebrow}
      </span>
      <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-zinc-100 sm:text-5xl sm:leading-[1.08]">
        {title}
      </h2>
      <p className="mt-4 text-pretty text-[15px] leading-relaxed text-zinc-400 sm:text-base">{text}</p>
    </div>
  );
}

/* ── Фон: aurora-блобы + зерно ────────────────────────────────────── */

function AuroraBackground() {
  const ySlow = useScrollParallax(-140);
  const yMid = useScrollParallax(-260);
  const yFast = useScrollParallax(-380);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0a0d]">
      <motion.div style={{ y: ySlow }} className="absolute -left-48 top-[-12%]">
        <div className="aero-blob-a h-[42rem] w-[42rem] rounded-full bg-violet-600/[0.22] blur-[130px]" />
      </motion.div>
      <motion.div style={{ y: yMid }} className="absolute right-[-18%] top-[14%]">
        <div className="aero-blob-b h-[38rem] w-[38rem] rounded-full bg-fuchsia-500/[0.16] blur-[140px]" />
      </motion.div>
      <motion.div style={{ y: yFast }} className="absolute bottom-[-24%] left-[22%]">
        <div className="aero-blob-c h-[40rem] w-[40rem] rounded-full bg-teal-400/[0.13] blur-[150px]" />
      </motion.div>
      <div className="aero-noise absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_55%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  );
}

/* ── Шапка: плавающая стеклянная пилюля ───────────────────────────── */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full">
      <motion.nav
        aria-label="Основная навигация"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="mx-auto mt-4 flex h-12 w-fit items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] pl-3.5 pr-3 shadow-[0_16px_50px_-16px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl"
      >
        <a href="#top" className="mr-1 flex items-center gap-2" aria-label="Aero — вернуться к началу">
          <Image
            src="/aero-icon.png"
            alt="Логотип Aero — стеклянный шар"
            width={24}
            height={24}
            className="h-6 w-6"
          />
          <span className="text-[15px] font-semibold tracking-tight text-zinc-100">Aero</span>
        </a>
        <span aria-hidden="true" className="mx-1 h-4 w-px bg-white/10" />
        <div className="hidden items-center sm:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
            >
              {link.label}
            </a>
          ))}
        </div>
        <span
          className="ml-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium tabular-nums text-zinc-300"
          title="Текущая версия Aero"
        >
          {VERSION}
        </span>
      </motion.nav>
    </header>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────── */

const HERO_CHIPS = [
  { icon: Cpu, label: "Chromium внутри" },
  { icon: Package, label: "Портативная версия" },
  { icon: ShieldCheck, label: "Блокировщик рекламы" },
  { icon: MoonStar, label: "Тёмная тема" },
] as const;

function Hero() {
  const windowY = useScrollParallax(-90);

  return (
    <section className="relative px-6 pb-20 pt-14 sm:pt-20 lg:pb-28" aria-labelledby="hero-title">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-[0.95fr_1.2fr] lg:gap-10">
        <div className="flex flex-col items-start">
          <motion.span
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-[12.5px] font-medium text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl"
          >
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" strokeWidth={1.8} />
            Версия {VERSION} — настоящее жидкое стекло
          </motion.span>

          <motion.h1
            id="hero-title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
            className="mt-6 text-balance text-[2.6rem] font-semibold leading-[1.04] tracking-tight text-zinc-100 sm:text-6xl lg:text-[4.1rem]"
          >
            Браузер с интерфейсом{" "}
            <span className="bg-gradient-to-br from-violet-300 via-fuchsia-200 to-teal-200 bg-clip-text text-transparent">
              Safari&nbsp;27
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
            className="mt-5 max-w-lg text-pretty text-[16px] leading-relaxed text-zinc-400 sm:text-[17px]"
          >
            Жидкое стекло, вкладки-пилюли и живые виджеты стартовой страницы. Вся красота macOS —
            в браузере для Windows на движке Chromium.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <a
              href="#download"
              className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-6 text-[15px] font-semibold text-zinc-950 shadow-[0_16px_50px_-12px_rgba(255,255,255,0.35)] transition-colors hover:bg-zinc-200"
            >
              <Download className="h-4 w-4" strokeWidth={2} />
              Скачать для Windows
            </a>
            <a
              href="#features"
              className="inline-flex h-12 items-center rounded-full border border-white/15 bg-white/[0.04] px-6 text-[15px] font-medium text-zinc-200 backdrop-blur-xl transition-colors hover:border-white/25 hover:bg-white/[0.08]"
            >
              Возможности
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.5 }}
            className="mt-9 flex flex-wrap gap-2"
          >
            {HERO_CHIPS.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12.5px] text-zinc-400 backdrop-blur-lg"
              >
                <chip.icon className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.7} />
                {chip.label}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Стеклянное окно — парит и наклонено в 3D */}
        <div className="relative">
          {/* Стеклянные бейджи — парят ПОВЕРХ окна (намеренный стек-эффект) */}
          <GlassChip icon={MoonStar} className="-top-3 right-8" speed={-80} delay={4.2} />
          <GlassChip icon={Layers} className="top-[45%] -left-3" speed={-30} delay={0.6} />
          <GlassChip icon={ShieldCheck} className="bottom-8 right-16" speed={-150} delay={2.4} />

          <motion.div style={{ y: windowY }} className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-x-6 -bottom-10 h-28 rounded-[50%] bg-gradient-to-r from-violet-500/25 via-fuchsia-500/20 to-teal-400/25 blur-2xl"
            />
            <div className="aero-float relative">
              <div className="lg:[transform:perspective(1600px)_rotateX(9deg)_rotateY(-11deg)]">
                <GlassWindow variant="hero" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── Возможности ──────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: PanelsTopLeft,
    title: "Вкладки-пилюли",
    text: "Плавающие пилюли Golden Gate с пружинными анимациями и обзором всех вкладок — геометрия Safari 27.",
  },
  {
    icon: Droplets,
    title: "Жидкое стекло",
    text: "Настоящий backdrop-blur с насыщением: хром окна парит над контентом, интенсивность настраивается ползунком.",
  },
  {
    icon: LayoutDashboard,
    title: "Живые виджеты",
    text: "Часы, погода, календарь и быстрый доступ на стартовой странице aero://newtab — всё дышит.",
  },
  {
    icon: Layers,
    title: "Обзор вкладок",
    text: "Все открытые страницы на одном стеклянном экране. Переключение — одним движением.",
  },
  {
    icon: MoonStar,
    title: "Тёмная и светлая тема",
    text: "Тема следует за системой, а aurora-обои меняют настроение всего интерфейса.",
  },
  {
    icon: ShieldCheck,
    title: "Блокировщик рекламы",
    text: "Встроенная защита от трекеров и раздражающих баннеров — без единого расширения.",
  },
] as const;

const EXTRA_FEATURES = [
  {
    icon: Cpu,
    title: "Chromium внутри",
    text: "Совместим со всеми сайтами и расширениями Chrome — движок остаётся настоящим.",
  },
  {
    icon: Package,
    title: "Портативная версия",
    text: "Запускается без установки: с флешки, из папки, на любом компьютере с Windows.",
  },
] as const;

function FeatureIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors duration-500 group-hover:border-white/20">
      <Icon className="h-5 w-5 text-zinc-200" strokeWidth={1.6} />
    </span>
  );
}

function Features() {
  return (
    <section id="features" className="relative px-6 py-24 sm:py-32" aria-labelledby="features-title">
      <div className="mx-auto w-full max-w-6xl">
        <Reveal>
          <div id="features-title">
            <SectionHeading
              eyebrow="Возможности"
              title="Всё нужное — из стекла"
              text="Продуманные детали Safari 27 и сила Chromium. Интерфейс, который не стыдно показать."
            />
          </div>
        </Reveal>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
          className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <motion.article
              key={feature.title}
              variants={reveal}
              className="group relative rounded-2xl border border-white/10 bg-white/[0.045] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl transition-[transform,border-color,background-color,box-shadow] duration-500 hover:-translate-y-1.5 hover:border-violet-300/30 hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_28px_70px_-24px_rgba(139,92,246,0.4)]"
            >
              <FeatureIcon icon={feature.icon} />
              <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-zinc-100">
                {feature.title}
              </h3>
              <p className="mt-2 text-pretty text-[14px] leading-relaxed text-zinc-400">{feature.text}</p>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
          className="mt-4 grid gap-4 sm:grid-cols-2"
        >
          {EXTRA_FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={reveal}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-lg transition-colors duration-500 hover:border-white/20 hover:bg-white/[0.05]"
            >
              <FeatureIcon icon={feature.icon} />
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-zinc-200">{feature.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-500">{feature.text}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ── «Живое стекло»: окно выпрямляется при скролле ────────────────── */

function ShowcaseChip({
  progress,
  icon: Icon,
  className,
  xRange,
  parallaxSpeed,
  delay,
}: {
  progress: MotionValue<number>;
  icon: LucideIcon;
  className: string;
  xRange: [number, number];
  parallaxSpeed: number;
  delay: number;
}) {
  const x = useTransform(progress, [0.3, 0.55], xRange);
  const y = useScrollParallax(parallaxSpeed);
  return (
    <motion.div aria-hidden="true" style={{ x, y }} className={`pointer-events-none absolute z-20 hidden md:block ${className}`}>
      <div className="aero-float" style={{ animationDelay: `${delay}s` }}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_18px_50px_-16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-xl">
          <Icon className="h-5 w-5 text-zinc-200" strokeWidth={1.6} />
        </div>
      </div>
    </motion.div>
  );
}

function Showcase() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.7 });

  const rotateX = useTransform(progress, [0.04, 0.36], reduce ? [0, 0] : [16, 0]);
  const rotateY = useTransform(progress, [0.04, 0.36], reduce ? [0, 0] : [-10, 0]);
  const scale = useTransform(progress, [0.04, 0.36], reduce ? [1, 1] : [0.9, 1]);
  const hintOpacity = useTransform(progress, [0.05, 0.2], [1, 0]);

  return (
    <section
      id="glass"
      ref={sectionRef}
      aria-labelledby="glass-title"
      className={`relative px-6 ${reduce ? "py-24 sm:py-32" : "h-[200vh] md:h-[220vh]"}`}
    >
      <div
        className={
          reduce
            ? ""
            : "sticky top-0 flex h-screen flex-col justify-center overflow-hidden pb-6 pt-20"
        }
      >
        <motion.div className="mx-auto w-full max-w-6xl">
          <div id="glass-title" className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-[12.5px] font-medium tracking-wide text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl">
              Живое стекло
            </span>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
              Хром окна парит над контентом
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-[14px] leading-relaxed text-zinc-400 sm:text-[15px]">
              Прокрутите страницу: окно выпрямится, боковая панель выедет из-под стекла, вкладки
              перестроятся. Ровно так живёт интерфейс Aero.
            </p>
          </div>

          <div className="relative mx-auto mt-8 w-full max-w-4xl lg:mt-10">
            <ShowcaseChip
              progress={progress}
              icon={Droplets}
              className="-left-8 top-1/3"
              xRange={[-10, -90]}
              parallaxSpeed={-60}
              delay={1.1}
            />
            <ShowcaseChip
              progress={progress}
              icon={Sparkles}
              className="-right-6 top-6"
              xRange={[10, 80]}
              parallaxSpeed={-180}
              delay={3.3}
            />
            <ShowcaseChip
              progress={progress}
              icon={ShieldCheck}
              className="-right-10 bottom-8"
              xRange={[0, 110]}
              parallaxSpeed={-110}
              delay={5.1}
            />
            <ShowcaseChip
              progress={progress}
              icon={LayoutDashboard}
              className="-left-12 bottom-1/4"
              xRange={[-20, -120]}
              parallaxSpeed={-220}
              delay={6.4}
            />

            <motion.div
              style={{ rotateX, rotateY, scale, transformPerspective: 1600 }}
              className="relative"
            >
              <div
                aria-hidden="true"
                className="absolute -inset-x-8 -bottom-12 h-32 rounded-[50%] bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-teal-400/20 blur-2xl"
              />
              <GlassWindow variant="showcase" progress={progress} />
            </motion.div>

            {!reduce ? (
              <motion.p
                style={{ opacity: hintOpacity }}
                className="mt-6 text-center text-[12px] font-medium uppercase tracking-[0.2em] text-zinc-500"
              >
                Прокручивайте — стекло выпрямится
              </motion.p>
            ) : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Скачать ──────────────────────────────────────────────────────── */

function DownloadSection() {
  return (
    <section id="download" className="relative px-6 py-24 sm:py-32" aria-labelledby="download-title">
      <div className="mx-auto w-full max-w-6xl">
        <Reveal>
          <div id="download-title">
            <SectionHeading
              eyebrow="Скачать"
              title="Aero для Windows"
              text="Установщик или портативная версия — без аккаунтов, подписок и телеметрии."
            />
          </div>
        </Reveal>

        <Reveal className="mt-12">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-zinc-100">Свежие сборки</h3>
                <p className="mt-1 text-[13.5px] text-zinc-500">
                  Windows 10/11 · x64 · список обновляется автоматически
                </p>
              </div>
              <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3.5 py-1.5 text-[12.5px] font-medium tabular-nums text-violet-200">
                Версия {VERSION}
              </span>
            </div>
            <div className="mt-8">
              <DesktopDownloads />
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-6">
          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-8">
            <div className="flex items-start gap-4 sm:gap-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-300/[0.08]">
                <ShieldCheck className="h-5 w-5 text-emerald-200" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold tracking-tight text-zinc-100">
                  Сертификат доверия уже внутри
                </h3>
                <p className="mt-2 max-w-2xl text-pretty text-[14.5px] leading-relaxed text-zinc-400">
                  Сборки подписаны сертификатом «Aero Team», и он устанавливается автоматически:
                  во время установки Windows один раз спросит доверие к сертификату — просто
                  нажмите «Да». Скачивать что-то ещё или запускать скрипты вручную не нужно.
                </p>
                <ul className="mt-5 space-y-1.5 text-[13px] leading-relaxed text-zinc-500">
                  <li>
                    Установщик: окно «Вы доверяете этому сертификату?» появляется на шаге установки —
                    ответьте «Да», и «Неизвестный издатель» исчезнет.
                  </li>
                  <li>
                    Портативная версия: то же окно Windows появится один раз при первом запуске.
                  </li>
                  <li>
                    SmartScreen может один раз спросить о новом скачанном файле — нажмите
                    «Подробнее → Выполнить в любом случае».
                  </li>
                  <li>
                    Честное примечание: полностью убрать предупреждение для всех пользователей может
                    только платный сертификат (EV/OV).
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Ченджлог ─────────────────────────────────────────────────────── */

const CHANGELOG = [
  {
    version: "2.3.18",
    current: true,
    text: "Настройки стали проще и понятнее: боковое меню как в macOS System Settings, все настройки стартовой страницы — на одной вкладке (фон, виджеты, быстрый доступ) без гигантского окна поверх браузера. Панель инструментов больше не перекрывает верх сайтов, редактирование — через плавающую панель внизу, порядок виджетов меняется перетаскиванием.",
  },
  {
    version: "2.3.17",
    current: false,
    text: "Быстрее качается: установщик сжат по-настоящему (LZMA) — файл меньше почти на треть, а при обрыве связи загрузка продолжается с места обрыва, а не с нуля.",
  },
  {
    version: "2.3.16",
    current: false,
    text: "Сборки снова доступны: установщик и портативная версия пересобраны и подписаны свежим сертификатом «Aero Team». Сертификат доверия по-прежнему встроен — отдельно качать ничего не нужно.",
  },
  {
    version: "2.3.15",
    current: false,
    text: "Сертификат доверия встроен: установщик сам добавляет его в Windows (одно окно — «Да»), портативная версия делает то же при первом запуске. Отдельно качать сертификат больше не нужно. Все кнопки и внешний вид проверены.",
  },
  {
    version: "2.3.14",
    current: false,
    text: "Плавнее некуда: новая система easing в стиле Apple, каскадные появления виджетов и карточек, переключатели на transform, уважение к «уменьшить движение» в Windows.",
  },
  {
    version: "2.3.13",
    current: false,
    text: "Окно снова перетаскивается (весь тайтлбар и тулбар — зоны захвата), стекло над живыми сайтами: контент заходит под хром и размывается, плюс тумблеры скорости рендеринга.",
  },
  {
    version: "2.3.12",
    current: false,
    text: "Свой красивый установщик: чекбоксы больше не обрезаются, нарисованный баннер с версией.",
  },
  {
    version: "2.3.11",
    current: false,
    text: "Перевыпуск сборок с новым сертификатом «Aero Team» после потери ключа.",
  },
  {
    version: "2.3.9",
    current: false,
    text: "QA 14/14, восстановление сессии.",
  },
  {
    version: "2.3.8",
    current: false,
    text: "Aera → Aero, новый логотип — стеклянный шар.",
  },
] as const;

function Changelog() {
  return (
    <section className="relative px-6 pb-24 sm:pb-32" aria-labelledby="changelog-title">
      <div className="mx-auto w-full max-w-4xl">
        <Reveal>
          <div id="changelog-title">
            <SectionHeading
              eyebrow="История версий"
              title="Что нового"
              text="Каждая сборка — шаг ближе к Safari 27 на Windows."
            />
          </div>
        </Reveal>
        <motion.ul
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
          className="mt-12 flex flex-col gap-3"
        >
          {CHANGELOG.map((entry) => (
            <motion.li
              key={entry.version}
              variants={reveal}
              className="flex flex-col gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-colors duration-500 hover:border-white/[0.16] hover:bg-white/[0.05] sm:flex-row sm:items-center sm:gap-6 sm:p-5"
            >
              <span className="flex shrink-0 items-center gap-2.5">
                <span
                  className={`rounded-lg px-2.5 py-1 text-[12.5px] font-semibold tabular-nums ${
                    entry.current
                      ? "border border-violet-300/25 bg-violet-400/15 text-violet-200"
                      : "bg-white/[0.07] text-zinc-300"
                  }`}
                >
                  {entry.version}
                </span>
                {entry.current ? (
                  <span className="text-[11px] font-medium uppercase tracking-wider text-violet-300/80">
                    текущая
                  </span>
                ) : null}
              </span>
              <p className="text-[14px] leading-relaxed text-zinc-400">{entry.text}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

/* ── Футер (прилипает к низу) ─────────────────────────────────────── */

function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-black/20 backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Image
              src="/aero-icon.png"
              alt="Логотип Aero — стеклянный шар"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="text-[16px] font-semibold tracking-tight text-zinc-100">Aero</span>
            <span aria-hidden="true" className="h-4 w-px bg-white/10" />
            <span className="text-[13.5px] text-zinc-400">браузер в стиле Safari 27</span>
          </div>
          <p className="mt-4 max-w-md text-[12.5px] leading-relaxed text-zinc-500">
            Aero не связан с Apple; Safari и macOS — товарные знаки Apple Inc. Интерфейс является
            художественной стилизацией на движке Chromium.
          </p>
        </div>
        <nav aria-label="Ссылки" className="flex flex-col items-start gap-3 text-[14px] sm:items-end">
          <a
            href="https://github.com/F1xYx/aero"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-300 transition-colors hover:text-white"
          >
            GitHub — F1xYx/aero
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
          </a>
          <a href="#top" className="text-zinc-500 transition-colors hover:text-zinc-300">
            Наверх
          </a>
          <span className="text-[13px] tabular-nums text-zinc-600">© 2026 Aero Team</span>
        </nav>
      </div>
    </footer>
  );
}

/* ═══ Корневая страница ════════════════════════════════════════════ */

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div
        id="top"
        className="relative flex min-h-screen flex-col overflow-x-clip bg-[#0a0a0d] text-zinc-100 antialiased"
      >
        <AuroraBackground />
        <SiteHeader />
        <main className="flex-1">
          <Hero />
          <Features />
          <Showcase />
          <DownloadSection />
          <Changelog />
        </main>
        <SiteFooter />
      </div>
    </MotionConfig>
  );
}
