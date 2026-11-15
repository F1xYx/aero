"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import {
  AppWindow,
  ArrowDown,
  Gauge,
  LayoutGrid,
  PanelsTopLeft,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from "lucide-react";
import { DesktopDownloads } from "@/components/desktop-downloads";
import { NewtabMockup, SettingsMockup, WidgetSettingsMockup } from "@/components/landing/browser-mockups";

const VERSION = "2.3.9";

const NAV_LINKS = [
  { href: "#overview", label: "Обзор" },
  { href: "#demo", label: "Демо" },
  { href: "#widgets", label: "Виджеты" },
  { href: "#install", label: "Установка" },
] as const;

const FEATURES = [
  {
    icon: PanelsTopLeft,
    title: "Вкладки Golden Gate",
    text: "Пилюли-вкладки с пружинными анимациями, компактный режим и обзор всех вкладок — геометрия как в Safari 27 на macOS Tahoe.",
  },
  {
    icon: Sparkles,
    title: "Liquid glass по-настоящему",
    text: "Многослойное размытие с насыщением, три уровня интенсивности стекла и настраиваемый акцентный цвет интерфейса.",
  },
  {
    icon: SlidersHorizontal,
    title: "Настройки как во взрослых браузерах",
    text: "Полноценная страница aero://settings в отдельной вкладке: шесть разделов, экспорт и импорт конфигурации. Никаких боковых панелей.",
  },
  {
    icon: LayoutGrid,
    title: "Живые виджеты",
    text: "Часы, погода с реальными данными open-meteo, календарь и быстрый доступ. Редактирование перетаскиванием, размеры S/M/L, свои фоны.",
  },
  {
    icon: ShieldCheck,
    title: "Приватность без лишних слов",
    text: "История хранится локально, очистка данных сайтов в один клик, режим «стирать всё при выходе». Никакой телеметрии.",
  },
  {
    icon: Gauge,
    title: "Лёгкое ядро",
    text: "Electron/Chromium со стандартным User-Agent Chrome — сайты работают как в обычном браузере, без урезанных версий и блокировок.",
  },
] as const;

const WIDGETS_POINTS = [
  "Часы: аналоговые стрелки или циферблат, 12/24 ч, секунды",
  "Погода: живые данные open-meteo, город, °C/°F, ветер и ощущается как",
  "Календарь месяца с выделенной сегодняшней датой",
  "Быстрый доступ: плитки с фавиконами, добавление и удаление",
  "Режим «Изменить»: перетаскивание, размеры S/M/L, скрытие виджетов",
  "Фон: шесть пресетов, свой URL и регулируемое затемнение",
] as const;

const INSTALL_STEPS = [
  { n: "01", t: "Один экран", d: "Логотип, папка установки и опции ярлыков — всё на первой странице, как в Chrome" },
  { n: "02", t: "Установить", d: "Прогресс копирования — без лицензий, страниц выбора режима и лишних кликов" },
  { n: "03", t: "Готово", d: "Aero запускается сразу: галочка «Запустить» включена по умолчанию" },
] as const;

const CHANGELOG = [
  "Полное QA-тестирование интерфейса: протыканы все кнопки, вкладки, виджеты и настройки — 14/14 проверок",
  "Восстановление сессии: тумблер «Открывать новую вкладку при запуске» теперь работает — при выключении браузер открывает вкладки прошлого запуска",
  "Ctrl+Shift+Tab переключает на предыдущую вкладку (раньше шел вперёд)",
  "Исправлен редкий сбой при быстром закрытии нескольких вкладок подряд",
  "localhost:порт в адресной строке открывается как сайт, а не как поисковый запрос",
  "Сайт: вместо скриншотов — живые анимированные отрисовки интерфейса прямо на странице",
] as const;

/* ── Reveal: появление секций при скролле (opacity + подъём + расфокус) ── */
function Reveal({
  children,
  delay = 0,
  y = 44,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── Float: постоянное лёгкое «парение» элемента ── */
function Float({
  children,
  amp = 8,
  dur = 6,
  delay = 0,
  rot = 2,
  className,
}: {
  children: ReactNode;
  amp?: number;
  dur?: number;
  delay?: number;
  rot?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      animate={{ y: [-amp, amp, -amp], rotate: [-rot, rot, -rot] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  /* ── общий прогресс страницы → тонкая полоса прогресса сверху ── */
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  /* ── hero: параллакс при скролле ── */
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: heroP } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const sphereY = useTransform(heroP, [0, 1], [0, -170]);
  const sphereScale = useTransform(heroP, [0, 1], [1, 0.8]);
  const textY = useTransform(heroP, [0, 1], [0, 130]);
  const textOpacity = useTransform(heroP, [0, 0.72], [1, 0]);
  const glowAY = useTransform(heroP, [0, 1], [0, 260]);
  const glowBY = useTransform(heroP, [0, 1], [0, -180]);

  /* ── hero: наклон шара за курсором ── */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tiltX = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 110, damping: 16 });
  const tiltY = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 110, damping: 16 });
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  /* ── шапка: стекло уплотняется при скролле ── */
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", () => {
    setScrolled(window.scrollY > 24);
  });

  /* ── параллакс живых отрисовок в секциях ── */
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress: settingsP } = useScroll({
    target: settingsRef,
    offset: ["start end", "end start"],
  });
  const settingsImgY = useTransform(settingsP, [0, 1], [36, -36]);

  const widgetsRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress: widgetsP } = useScroll({
    target: widgetsRef,
    offset: ["start end", "end start"],
  });
  const widgetsImgY = useTransform(widgetsP, [0, 1], [-30, 30]);

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative flex min-h-screen flex-col overflow-x-clip bg-[#0a0a0d] text-zinc-100 selection:bg-[#ff9f0a] selection:text-black"
    >
      {/* полоса прогресса скролла */}
      <motion.div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-[#ffd60a] via-[#ff9f0a] to-[#ff6482]"
        style={{ scaleX: progressX }}
      />

      {/* фоновые световые пятна с параллаксом */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]">
        <motion.div
          style={{ y: glowAY }}
          className="absolute left-1/2 top-[-300px] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[#ff9f0a]/[0.08] blur-[130px]"
        />
        <motion.div
          style={{ y: glowBY }}
          className="absolute right-[-220px] top-[120px] h-[440px] w-[540px] rounded-full bg-[#ff6482]/[0.06] blur-[140px]"
        />
        <div className="absolute left-[-200px] top-[320px] h-[400px] w-[480px] rounded-full bg-[#ffd60a]/[0.05] blur-[140px]" />
      </div>

      {/* ── Шапка ─────────────────────────────────────────── */}
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        animate={{
          backgroundColor: scrolled ? "rgba(10,10,13,0.78)" : "rgba(10,10,13,0)",
          borderBottomColor: scrolled ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0)",
        }}
        style={{ backdropFilter: scrolled ? "blur(20px) saturate(1.5)" : "blur(0px)" }}
      >
        <div className="border-b border-inherit">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <a href="#top" className="flex items-center gap-2.5" aria-label="Aero — на главную">
              <Image src="/aero-icon.png" alt="" width={26} height={26} className="h-[26px] w-[26px]" />
              <span className="text-[15px] font-semibold tracking-tight">Aero</span>
              <span className="ml-1 rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                {VERSION}
              </span>
            </a>
            <nav aria-label="Основная навигация" className="hidden items-center gap-7 md:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[13px] text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <a
              href="#install"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#ff9f0a] px-4 py-1.5 text-[13px] font-semibold text-black transition-all hover:scale-[1.04] hover:bg-[#ffb340] active:scale-[0.98]"
            >
              Скачать
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </motion.header>

      <main id="top" className="flex-1">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section
          ref={heroRef}
          aria-labelledby="hero-title"
          className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-10 pt-28 text-center sm:px-6 sm:pt-36"
        >
          {/* стеклянный шар: параллакс скролла + наклон за мышью + парение */}
          <motion.div
            style={{ y: sphereY, scale: sphereScale }}
            className="relative mb-10"
          >
            <motion.div
              style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 900 }}
              className="relative"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 scale-125 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(255,159,10,0.22),transparent_65%)] blur-2xl"
              />
              <Float amp={11} dur={7} rot={1.6}>
                <Image
                  src="/aero-icon.png"
                  alt="Логотип Aero — стеклянный шар"
                  width={340}
                  height={340}
                  priority
                  sizes="(max-width: 640px) 240px, 340px"
                  className="h-[240px] w-[240px] drop-shadow-[0_40px_70px_rgba(255,159,10,0.16)] sm:h-[340px] sm:w-[340px]"
                />
              </Float>
            </motion.div>

            {/* парящие стеклянные чипы вокруг шара */}
            <Float
              amp={9}
              dur={5.4}
              delay={0.6}
              rot={0}
              className="absolute -left-14 top-10 hidden sm:block lg:-left-24"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[12.5px] text-zinc-200 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#30d158]" />
                Погода обновилась · +18°
              </span>
            </Float>
            <Float
              amp={12}
              dur={6.6}
              delay={1.4}
              rot={0}
              className="absolute -right-10 top-24 hidden sm:block lg:-right-20"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[12.5px] text-zinc-200 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans text-[11px]">Ctrl+T</kbd>
                новая вкладка
              </span>
            </Float>
            <Float
              amp={10}
              dur={6}
              delay={2.2}
              rot={0}
              className="absolute -left-8 bottom-6 hidden sm:block lg:-left-16"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[12.5px] text-zinc-200 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                aero://settings
              </span>
            </Float>
          </motion.div>

          <motion.div style={{ y: textY, opacity: textOpacity }}>
            <Reveal delay={0.05}>
              <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-[#ff9f0a]">
                Aero для Windows · v{VERSION}
              </p>
            </Reveal>
            <Reveal delay={0.12}>
              <h1
                id="hero-title"
                className="mx-auto mt-4 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-tight sm:text-6xl"
              >
                Браузер с интерфейсом{" "}
                <span className="bg-gradient-to-r from-[#ffd60a] via-[#ff9f0a] to-[#ff6482] bg-clip-text text-transparent">
                  Safari&nbsp;27.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                Liquid glass, вкладки-пилюли Golden Gate, тёмная тема и живые виджеты.
                Настоящий движок Chromium, установка в два клика — и стеклянный шар
                вместо скучной иконки.
              </p>
            </Reveal>
            <Reveal delay={0.28}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="#install"
                  className="inline-flex h-11 items-center rounded-full bg-[#ff9f0a] px-7 text-sm font-semibold text-black transition-all hover:scale-[1.04] hover:bg-[#ffb340] active:scale-[0.98]"
                >
                  Скачать для Windows
                </a>
                <a
                  href="#demo"
                  className="inline-flex h-11 items-center rounded-full border border-white/12 px-7 text-sm font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-zinc-100"
                >
                  Живое демо
                </a>
              </div>
              <p className="mt-4 text-xs text-zinc-600">Setup · Portable · Windows 10/11 · 64 бит</p>
            </Reveal>
          </motion.div>

          {/* живая отрисовка новой вкладки */}
          <Reveal delay={0.1} y={60} className="mt-14 w-full sm:mt-16">
            <figure className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-x-8 -top-6 h-40 rounded-full bg-[#ff9f0a]/10 blur-[90px]"
              />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.9)]">
                <NewtabMockup />
              </div>
              <figcaption className="mt-4 text-center text-xs text-zinc-600">
                Интерфейс Aero {VERSION} — живая отрисовка окна браузера, не скриншот
              </figcaption>
            </figure>
          </Reveal>
        </section>

        {/* ── Возможности ──────────────────────────────────── */}
        <section
          id="overview"
          aria-labelledby="features-title"
          className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24"
        >
          <Reveal>
            <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Возможности
            </p>
            <h2 id="features-title" className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Всё, что ждёте от браузера 2026 года
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={0.06 * (i % 3)} className="h-full">
                <Float amp={4} dur={6 + (i % 3)} delay={i * 0.7} rot={0} className="h-full">
                  <article
                    className="group h-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-sm transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
                    style={{ transform: "translateZ(0)" }}
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#ff9f0a]/10 text-[#ff9f0a] transition-colors group-hover:bg-[#ff9f0a]/[0.16]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-zinc-100">{title}</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-400">{text}</p>
                  </article>
                </Float>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Демо ─────────────────────────────────────────── */}
        <section
          id="demo"
          aria-labelledby="demo-title"
          className="border-t border-white/[0.06] bg-[#0d0d11]"
        >
          <div className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
            <Reveal>
              <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                Демо
              </p>
              <h2 id="demo-title" className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Попробуйте интерфейс прямо здесь
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
                Веб-версия Aero с теми же виджетами и настройками. Шестерёнка в
                тулбаре или Ctrl+, открывает aero://settings; кнопка «Изменить»
                включает режим редактирования виджетов.
              </p>
            </Reveal>
            <Reveal delay={0.15} y={56} className="mt-10">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101014] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
                <iframe
                  src="/aero/index.html"
                  className="h-[600px] w-full border-0"
                  title="Живое демо интерфейса Aero"
                  loading="lazy"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Настройки ────────────────────────────────────── */}
        <section
          id="settings"
          aria-labelledby="settings-title"
          className="border-t border-white/[0.06]"
        >
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
            <div>
              <Reveal>
                <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Настройки
                </p>
                <h2 id="settings-title" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Как в нормальном браузере
                </h2>
                <p className="mt-4 text-base leading-relaxed text-zinc-400">
                  Никаких боковых панелей поверх страницы. Настройки Aero —
                  отдельная вкладка aero://settings с окном в стиле Safari и
                  иконочной навигацией по разделам.
                </p>
              </Reveal>
              <ul className="mt-8 flex flex-col">
                {[
                  "Шесть разделов: общие, оформление, поиск, виджеты, приватность, о браузере",
                  "Тёмная тема по умолчанию; светлая и автоматическая — в один клик",
                  "Акцентный цвет, интенсивность стекла, анимации",
                  "Экспорт и импорт настроек в JSON",
                ].map((point, i) => (
                  <Reveal key={point} delay={0.08 * i} y={26}>
                    <li className="flex items-start gap-3 border-b border-white/[0.06] py-3.5 text-[15px] leading-relaxed text-zinc-300 last:border-0">
                      <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#ff9f0a]" />
                      {point}
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>
            <Reveal delay={0.1} y={56}>
              <figure>
                <div ref={settingsRef} className="relative">
                  <motion.div style={{ y: settingsImgY }}>
                    <div className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
                      <SettingsMockup />
                    </div>
                  </motion.div>
                </div>
                <figcaption className="mt-3 text-center text-xs text-zinc-600">
                  aero://settings — живая отрисовка окна настроек
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* ── Виджеты ──────────────────────────────────────── */}
        <section
          id="widgets"
          aria-labelledby="widgets-title"
          className="border-t border-white/[0.06] bg-[#0d0d11]"
        >
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
            <Reveal delay={0.1} y={56} className="order-2 lg:order-1">
              <figure>
                <div ref={widgetsRef} className="relative">
                  <motion.div style={{ y: widgetsImgY }}>
                    <div className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
                      <WidgetSettingsMockup />
                    </div>
                  </motion.div>
                </div>
                <figcaption className="mt-3 text-center text-xs text-zinc-600">
                  Настройки виджетов — живая отрисовка окна: фон, раскладка и каждый виджет по отдельности
                </figcaption>
              </figure>
            </Reveal>
            <div className="order-1 lg:order-2">
              <Reveal>
                <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Виджеты
                </p>
                <h2 id="widgets-title" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Новая вкладка как рабочий стол
                </h2>
                <p className="mt-4 text-base leading-relaxed text-zinc-400">
                  Не декорация, а инструмент: погода обновляется сама, часы идут
                  с секундами, ссылки открываются в один клик. Всё настраивается
                  мышкой — без единой строчки конфигов.
                </p>
              </Reveal>
              <ul className="mt-8 flex flex-col">
                {WIDGETS_POINTS.map((point, i) => (
                  <Reveal key={point} delay={0.07 * i} y={26}>
                    <li className="flex items-start gap-3 border-b border-white/[0.06] py-3.5 text-[15px] leading-relaxed text-zinc-300 last:border-0">
                      <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#ff9f0a]" />
                      {point}
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Установка + загрузки ─────────────────────────── */}
        <section
          id="install"
          aria-labelledby="install-title"
          className="border-t border-white/[0.06]"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-14 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            <div>
              <Reveal>
                <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Установка
                </p>
                <h2 id="install-title" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Установка в два клика
                </h2>
                <p className="mt-4 text-base leading-relaxed text-zinc-400">
                  Никаких лицензий, сайдбаров и семи страниц визарда — один
                  аккуратный экран с логотипом и опциями, как у флагманских
                  браузеров.
                </p>
              </Reveal>
              <ol className="mt-8 flex flex-col">
                {INSTALL_STEPS.map((step, i) => (
                  <Reveal key={step.n} delay={0.08 * i} y={26}>
                    <li className="flex items-start gap-4 border-b border-white/[0.06] py-3.5 last:border-0">
                      <span className="mt-0.5 w-7 shrink-0 text-sm font-semibold tabular-nums text-zinc-600">
                        {step.n}
                      </span>
                      <span className="text-[15px] leading-relaxed text-zinc-300">
                        <b className="font-semibold text-zinc-100">{step.t}</b>
                        <span className="text-zinc-500"> — {step.d}</span>
                      </span>
                    </li>
                  </Reveal>
                ))}
              </ol>
              <Reveal delay={0.2}>
                <p className="mt-6 flex items-center gap-2 text-xs leading-relaxed text-zinc-600">
                  <AppWindow className="h-3.5 w-3.5" aria-hidden="true" />
                  Windows 10/11, 64 бит. Установка для текущего пользователя, без прав администратора.
                </p>
              </Reveal>
            </div>
            <Reveal delay={0.12} y={56}>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-100">
                  <Wand2 className="h-4 w-4 text-[#ff9f0a]" aria-hidden="true" />
                  Скачать Aero {VERSION}
                </h3>
                <p className="mt-1 text-[13px] text-zinc-500">
                  Официальные сборки для Windows. Свежая версия — вверху списка.
                </p>
                <div className="mt-6">
                  <DesktopDownloads />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Что нового ───────────────────────────────────── */}
        <section
          id="changelog"
          aria-labelledby="changelog-title"
          className="border-t border-white/[0.06] bg-[#0d0d11]"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <Reveal>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="changelog-title" className="text-2xl font-semibold tracking-tight">
                  Что нового в {VERSION}
                </h2>
                <span className="text-sm text-zinc-600">15 ноября 2026</span>
              </div>
            </Reveal>
            <ul className="mt-6 flex flex-col">
              {CHANGELOG.map((item, i) => (
                <Reveal key={item} delay={0.06 * i} y={24}>
                  <li className="flex items-start gap-3 border-b border-white/[0.06] py-3.5 text-[15px] leading-relaxed text-zinc-300 last:border-0">
                    <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#ff9f0a]" />
                    {item}
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {/* ── Подвал ────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <Image src="/aero-icon.png" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
            <span className="text-sm text-zinc-500">
              Aero {VERSION} · работает на Electron/Chromium · не связана с Apple Inc.
            </span>
          </div>
          <span className="text-sm text-zinc-600">© 2026 Aero Team</span>
        </div>
      </footer>
    </div>
  );
}
