'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  Compass,
  History,
  Home,
  Info,
  LoaderPinwheel,
  Moon,
  Palette,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import {
  ENGINES,
  ENGINE_ORDER,
  useZSettings,
  type EngineId,
} from '@/lib/zbrowser-settings';

interface SettingsPanelProps {
  onClose: () => void;
  onClearHistory: () => void;
  onClearBookmarks: () => void;
}

const SECTION_CLASS =
  'zb-anim-fade-up rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/70 shadow-[0_4px_18px_rgba(0,0,0,0.05)] dark:bg-white/[0.07] dark:ring-white/[0.08] dark:shadow-none';

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-2.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground/75">
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </h3>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  ariaLabel,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground/85">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-snug text-foreground/45">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={ariaLabel ?? label} />
    </div>
  );
}

/** Safari-style settings window: search, appearance, start page, behaviour, privacy, reset. */
export function SettingsPanel({ onClose, onClearHistory, onClearBookmarks }: SettingsPanelProps) {
  const engine = useZSettings((s) => s.engine);
  const setEngine = useZSettings((s) => s.setEngine);
  const animations = useZSettings((s) => s.animations);
  const setAnimations = useZSettings((s) => s.setAnimations);
  const showFavorites = useZSettings((s) => s.showFavorites);
  const setShowFavorites = useZSettings((s) => s.setShowFavorites);
  const showFrequent = useZSettings((s) => s.showFrequent);
  const setShowFrequent = useZSettings((s) => s.setShowFrequent);
  const showPrivacyCard = useZSettings((s) => s.showPrivacyCard);
  const setShowPrivacyCard = useZSettings((s) => s.setShowPrivacyCard);
  const suggest = useZSettings((s) => s.suggest);
  const setSuggest = useZSettings((s) => s.setSuggest);
  const saveHistory = useZSettings((s) => s.saveHistory);
  const setSaveHistory = useZSettings((s) => s.setSaveHistory);
  const homeUrl = useZSettings((s) => s.homeUrl);
  const setHomeUrl = useZSettings((s) => s.setHomeUrl);
  const resetSettings = useZSettings((s) => s.resetSettings);
  const { resolvedTheme, setTheme } = useTheme();

  const [homeDraft, setHomeDraft] = useState(homeUrl);

  useEffect(() => {
    setHomeDraft(homeUrl);
  }, [homeUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const commitHome = () => {
    const raw = homeDraft.trim();
    if (!raw) {
      setHomeUrl('');
      return;
    }
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setHomeUrl(normalized);
    setHomeDraft(normalized);
  };

  const themeOptions = [
    { id: 'light', label: 'Светлая', icon: Sun },
    { id: 'dark', label: 'Тёмная', icon: Moon },
  ] as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Настройки браузера"
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm duration-200 sm:p-8"
      onClick={onClose}
    >
      <div
        className="zb-anim-slide-up zb-scroll max-h-[86vh] w-full max-w-md overflow-y-auto rounded-[22px] bg-white/75 p-5 shadow-[0_30px_80px_-10px_rgba(0,0,0,0.45)] ring-1 ring-white/70 backdrop-blur-2xl backdrop-saturate-150 dark:bg-[#232325]/90 dark:ring-white/[0.1]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <LoaderPinwheel
              className="size-4 text-[#007aff] dark:text-[#409cff]"
              aria-hidden="true"
            />
            Настройки
          </h2>
          <button
            type="button"
            aria-label="Закрыть настройки"
            onClick={onClose}
            className="zb-press flex size-7 cursor-pointer items-center justify-center rounded-full text-foreground/55 hover:bg-black/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:hover:bg-white/10"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Поиск */}
          <section
            className={SECTION_CLASS}
            style={{ animationDelay: '40ms' }}
            aria-label="Поисковая система"
          >
            <SectionTitle icon={Search}>Поисковая система</SectionTitle>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Выбор поисковика">
              {ENGINE_ORDER.map((id) => {
                const info = ENGINES[id];
                const active = engine === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setEngine(id as EngineId)}
                    className={`zb-press group flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                      active
                        ? 'bg-[#007aff]/[0.12] text-foreground ring-1 ring-[#007aff]/45 dark:bg-[#409cff]/[0.14] dark:ring-[#409cff]/45'
                        : 'bg-white/70 text-foreground/70 ring-1 ring-black/[0.06] hover:bg-white hover:text-foreground dark:bg-white/[0.08] dark:ring-white/[0.07] dark:hover:bg-white/[0.13]'
                    }`}
                  >
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-sm transition-transform group-hover:scale-105 ${info.badge}`}
                      aria-hidden="true"
                    >
                      {info.letter}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{info.name}</span>
                    {active && (
                      <Check
                        className="size-4 shrink-0 text-[#007aff] dark:text-[#409cff] animate-[zb-check-in_0.3s_var(--zb-spring)_both]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-foreground/45">
              Через серверный прокси стабильно работают Bing и DuckDuckGo — Google и Яндекс
              показывают капчу или пустую страницу. В Windows-версии ZBrowser все поисковики
              работают напрямую.
            </p>
          </section>

          {/* Оформление */}
          <section
            className={SECTION_CLASS}
            style={{ animationDelay: '90ms' }}
            aria-label="Оформление"
          >
            <SectionTitle icon={Palette}>Оформление</SectionTitle>
            <div
              className="flex rounded-[10px] bg-black/[0.05] p-1 dark:bg-white/[0.08]"
              role="radiogroup"
              aria-label="Тема оформления"
            >
              {themeOptions.map(({ id, label, icon: Icon }) => {
                const active = resolvedTheme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(id)}
                    className={`zb-press flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                      active
                        ? 'bg-white/95 text-foreground shadow-sm dark:bg-white/[0.2]'
                        : 'text-foreground/55 hover:text-foreground/85'
                    }`}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3">
              <SwitchRow
                label="Плавные анимации"
                hint="Живые переходы вкладок, панелей и элементов интерфейса."
                checked={animations}
                onChange={setAnimations}
              />
            </div>
          </section>

          {/* Начальная страница */}
          <section
            className={SECTION_CLASS}
            style={{ animationDelay: '140ms' }}
            aria-label="Начальная страница"
          >
            <SectionTitle icon={Compass}>Начальная страница</SectionTitle>
            <div className="flex flex-col gap-2">
              <SwitchRow
                label="Избранное"
                checked={showFavorites}
                onChange={setShowFavorites}
              />
              <SwitchRow
                label="Часто посещаемые сайты"
                checked={showFrequent}
                onChange={setShowFrequent}
              />
              <SwitchRow
                label="Отчёт о приватности"
                checked={showPrivacyCard}
                onChange={setShowPrivacyCard}
              />
            </div>
          </section>

          {/* Поведение */}
          <section
            className={SECTION_CLASS}
            style={{ animationDelay: '190ms' }}
            aria-label="Поведение"
          >
            <SectionTitle icon={Sparkles}>Поведение</SectionTitle>
            <div className="flex flex-col gap-2">
              <SwitchRow
                label="Подсказки в адресной строке"
                hint="Закладки и история предлагаются при вводе."
                checked={suggest}
                onChange={setSuggest}
              />
              <SwitchRow
                label="Сохранять историю"
                hint="Выключите, чтобы посещения не записывались."
                checked={saveHistory}
                onChange={setSaveHistory}
              />
            </div>
            <div className="mt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-foreground/80">
                <Home className="size-3.5" aria-hidden="true" />
                Домашняя страница
              </p>
              <input
                type="text"
                value={homeDraft}
                onChange={(e) => setHomeDraft(e.target.value)}
                onBlur={commitHome}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitHome();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Оставьте пустым — начальная страница"
                aria-label="Домашняя страница"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                className="h-9 w-full rounded-[10px] bg-white/80 px-3 text-[13px] outline-none ring-1 ring-black/[0.08] transition-all placeholder:text-foreground/35 focus:ring-2 focus:ring-[#007aff]/55 dark:bg-white/[0.1] dark:ring-white/[0.1] dark:focus:ring-[#409cff]/55"
              />
              <p className="mt-1 text-[11px] leading-snug text-foreground/45">
                Пустой запрос в адресной строке или ввод без текста открывает этот адрес.
              </p>
            </div>
          </section>

          {/* Приватность и данные */}
          <section
            className={SECTION_CLASS}
            style={{ animationDelay: '240ms' }}
            aria-label="Приватность"
          >
            <SectionTitle icon={History}>Приватность и данные</SectionTitle>
            <p className="mb-2.5 text-[11px] leading-snug text-foreground/45">
              История и закладки хранятся на сервере и никуда не передаются.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClearHistory}
                className="zb-press flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-red-500 ring-1 ring-red-500/30 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Очистить историю
              </button>
              <button
                type="button"
                onClick={onClearBookmarks}
                className="zb-press flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-red-500 ring-1 ring-red-500/30 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Удалить все закладки
              </button>
            </div>
          </section>

          {/* Сброс настроек */}
          <section
            className={SECTION_CLASS}
            style={{ animationDelay: '290ms' }}
            aria-label="Сброс настроек"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[12.5px] font-semibold text-foreground/75">Сброс настроек</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-foreground/45">
                  Вернуть все параметры к значениям по умолчанию.
                </p>
              </div>
              <button
                type="button"
                onClick={resetSettings}
                className="zb-press flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-foreground/70 ring-1 ring-black/[0.1] transition-colors hover:bg-black/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-white/[0.06] dark:ring-white/[0.12] dark:hover:bg-white/[0.12]"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Сбросить
              </button>
            </div>
          </section>

          {/* О браузере */}
          <section
            className="zb-anim-fade-up flex items-start gap-2.5 px-1 pb-1 text-[11px] leading-relaxed text-foreground/45"
            style={{ animationDelay: '340ms' }}
          >
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p>
              ZBrowser 1.1 — веб-версия. Полноценный браузер для Windows с движком Chromium
              доступен для скачивания на начальной странице.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
