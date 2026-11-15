'use strict';

/* ============================================================================
   Aera 2.0 — ядро: namespace, режим, помощники, константы, элементы.
   Классические скрипты (не ES-модули): работают и на file://, и на http://.
   ============================================================================ */

(function () {

  const DESKTOP = !!(window.zdesktop && window.zdesktop.isDesktop);
  const WEB = !DESKTOP;

  const A = {
    VERSION: '2.3.6',
    DESKTOP,
    WEB
  };
  window.Aera = A;

  document.documentElement.classList.toggle('desktop', DESKTOP);
  document.documentElement.classList.toggle('web', WEB);
  document.body.classList.toggle('web-mode', WEB);

  /* ---------- поиск элементов ---------- */
  A.$ = (sel, root) => (root || document).querySelector(sel);
  A.$$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  /* ---------- localStorage ---------- */
  A.LS = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* noop */ }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (e) { /* noop */ }
    }
  };

  /* ---------- помощники ---------- */
  A.clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  A.debounce = function (fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  };

  A.hostOf = function (url) {
    try {
      const u = new URL(url);
      return (u.hostname || url).replace(/^www\./i, '');
    } catch (e) { return String(url || '').replace(/^www\./i, ''); }
  };

  A.letterFor = function (url) {
    if (/newtab\.html([?#]|$)/i.test(String(url))) return 'AE';
    const host = A.hostOf(url).replace(/[^a-zа-я0-9]/gi, '');
    return (host.slice(0, 2) || 'A').toUpperCase();
  };

  A.letterTile = function (url, cls) {
    const span = document.createElement('span');
    span.className = cls || 'lt';
    span.textContent = A.letterFor(url);
    return span;
  };

  /** Иконка домена через сервис фавиконок Google (как на начальной странице).
      Работает онлайн; при ошибке — буквенная плитка. */
  A.domainFaviconUrl = function (url) {
    try {
      const h = new URL(url).hostname;
      if (!h || /^localhost|\d+\.\d+\.\d+\.\d+/.test(h)) return '';
      return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(h) + '&sz=64';
    } catch (e) { return ''; }
  };

  A.faviconEl = function (favicon, url, size) {
    const box = document.createElement('span');
    box.className = 'fav';
    const s = size || 16;
    const urlStr = String(url || '');
    const img = document.createElement('img');
    img.width = s;
    img.height = s;
    img.alt = '';
    img.referrerPolicy = 'no-referrer';

    img.onerror = () => {
      img.remove();
      box.textContent = '';
      box.appendChild(A.letterTile(urlStr));
    };

    if (favicon) {
      img.src = favicon;
    } else if (A.isNewtabUrl(urlStr)) {
      /* Начальная страница: логотип Aera. */
      img.src = 'assets/logo-256.png';
    } else {
      const guessed = A.domainFaviconUrl(urlStr);
      if (!guessed) {
        img.remove();
        box.appendChild(A.letterTile(urlStr));
        return box;
      }
      img.src = guessed;
    }
    box.appendChild(img);
    return box;
  };

  A.relativeTime = function (ts) {
    const d = Number(ts) || 0;
    if (!d) return '';
    const diff = Date.now() - d;
    if (diff < 45 * 1000) return 'только что';
    if (diff < 60 * 60 * 1000) return Math.max(1, Math.round(diff / 60000)) + ' мин назад';
    if (diff < 24 * 60 * 60 * 1000) return Math.max(1, Math.round(diff / 3600000)) + ' ч назад';
    if (diff < 7 * 24 * 60 * 60 * 1000) return Math.max(1, Math.round(diff / 86400000)) + ' дн назад';
    try {
      return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch (e) { return ''; }
  };

  A.tabPlural = function (n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return n + ' вкладка';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return n + ' вкладки';
    return n + ' вкладок';
  };

  /* ---------- URL-помощники ---------- */
  A.newtabUrl = () => 'newtab.html';

  A.isNewtabUrl = function (url) {
    return typeof url === 'string' && /(^|\/)newtab\.html([?#].*)?$/i.test(url);
  };

  A.looksLikeUrl = function (s) {
    if (/\s/.test(s)) return false;
    if (/^(https?|file):\/\//i.test(s)) return true;
    if (/^localhost(:\d+)?([\/?#].*)?$/i.test(s)) return true;
    if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?([\/?#].*)?$/.test(s)) return true;
    return /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)+(:\d+)?([\/?#].*)?$/i.test(s);
  };

  A.safeNavUrl = function (u) {
    if (typeof u !== 'string' || !u.trim()) return null;
    if (/^https?:\/\//i.test(u)) return u;
    if (/(^|\/)newtab\.html([?#].*)?$/i.test(u)) return u;
    return null;
  };

  /** Тот же документ? Отличие только завершающим слэшем не считается переходом. */
  A.urlSamePage = function (a, b) {
    if (a === b) return true;
    return String(a).replace(/\/+$/, '') === String(b).replace(/\/+$/, '');
  };

  A.titleFor = function (url) {
    return A.isNewtabUrl(url) ? 'Новая вкладка' : A.hostOf(url);
  };

  /* ---------- константы ---------- */
  A.ENGINES = {
    google: { name: 'Google',      url: 'https://www.google.com/search?q=%s',  letter: 'G' },
    yandex: { name: 'Яндекс',      url: 'https://yandex.ru/search/?text=%s',   letter: 'Я' },
    bing:   { name: 'Bing',        url: 'https://www.bing.com/search?q=%s',    letter: 'B' },
    ddg:    { name: 'DuckDuckGo',  url: 'https://duckduckgo.com/?q=%s',        letter: 'D' }
  };

  A.WALLPAPERS = ['sunset', 'sakura', 'mint', 'golden', 'midnight', 'ocean', 'lavender', 'custom'];
  A.WALLPAPER_LEGACY = { aurora: 'sunset', graphite: 'midnight' };
  A.ACCENTS = ['azure', 'sunset', 'sakura', 'mint', 'golden', 'lavender', 'crimson', 'graphite'];

  A.SITE_THEMES = [
    { v: 'system', label: 'Системная' },
    { v: 'force-dark', label: 'Всегда тёмная' },
    { v: 'light', label: 'Светлая' }
  ];

  /* Полная схема настроек 2.0. Неизвестные ключи из прошлых версий сохраняются. */
  A.DEFAULT_SETTINGS = {
    engine: 'google',            // поисковик адресной строки и новой вкладки
    home: 'newtab.html',         // домашняя страница (по умолчанию — начальная)
    siteTheme: 'system',         // system | force-dark | light — тема САЙТОВ
    theme: 'system',             // dark | light | system — тема ИНТЕРФЕЙСА (Safari следует за системой)
    startup: 'restore',          // newtab | restore — поведение при запуске
    showBookmarks: true,         // панель закладок
    animations: true,            // плавные переходы
    uiScale: 1,                  // 0.8 … 1.3
    pageZoom: 1,                 // 0.5 … 2 — масштаб страниц по умолчанию
    saveHistory: true,           // журнал истории
    suggest: true,               // подсказки адресной строки
    downloadsAsk: false,         // спрашивать путь сохранения (десктоп)
    wallpaper: 'sunset',         // обои окна и новой вкладки
    accent: 'azure',             // акцентный цвет интерфейса
    glass: true,                 // «жидкое стекло»: прозрачные панели
    glassLevel: 50,              // 0 = ультра-прозрачное … 100 = сильно тонированное (слайдер Liquid Glass из macOS 27)
    pageTint: true,               // окраска панели цветом сайта (как Safari)
    newtabAfterActive: true,     // новая вкладка после активной
    dblCloseTab: false,          // закрытие вкладки двойным кликом
    wheelTabs: true,             // переключение вкладок колесом
    adBlock: true,               // блокировка рекламы и трекеров
    hwAccel: true,               // аппаратное ускорение (после перезапуска)
    hibernate: true,             // усыплять неактивные вкладки (2/10 минут)
    httpsOnly: true,             // http -> https для сайтов (центр защиты)
    dnt: true,                   // заголовок Do Not Track
    tightReferrer: true,         // не передавать сторонним сайтам адрес страницы
    block3p: false               // блокировать сторонние cookie
  };

  /* ---------- SVG-глифы ---------- */
  const S = (vb, inner, size, sw) =>
    '<svg viewBox="0 0 ' + vb + '" width="' + (size || 15) + '" height="' + (size || 15) + '" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '"' + (vb === '24 24' ? ' stroke-linecap="round" stroke-linejoin="round"' : '') + '>' + inner + '</svg>';

  A.SVG = {
    max: S('12 12', '<rect x="1.5" y="1.5" width="9" height="9" rx="1.6"/>', 12, 1.4),
    restore: S('12 12', '<rect x="1.5" y="3.5" width="7" height="7" rx="1.4"/><path d="M4 3.5V3a1.5 1.5 0 0 1 1.5-1.5H9A1.5 1.5 0 0 1 10.5 3v3.5A1.5 1.5 0 0 1 9 8h-.5"/>', 12, 1.4),
    globe: S('24 24', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14 0 18-3-4-3-14.5 0-18z"/>', 15, 2),
    lock: S('24 24', '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>', 14, 2),
    unlock: S('24 24', '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-1.6"/>', 14, 2),
    search: S('24 24', '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', 15, 2),
    star: S('24 24', '<path d="m12 3 2.7 5.6 6.1.8-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.4l6.1-.8Z"/>', 15, 2),
    clock: S('24 24', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>', 15, 2),
    check: S('24 24', '<path d="m4.5 12.5 5 5 10-11"/>', 15, 2.4),
    dl: S('24 24', '<path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>', 14, 2),
    alert: S('24 24', '<path d="M12 5v8"/><path d="M12 17h.01"/>', 14, 2),
    x: S('24 24', '<path d="M18 6 6 18M6 6l12 12"/>', 11, 2.2),
    moon: S('24 24', '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>', 14, 2),
    incognito: S('24 24', '<circle cx="7" cy="14" r="3.2"/><circle cx="17" cy="14" r="3.2"/><path d="M3.8 10.2 5.4 5.9A1.6 1.6 0 0 1 7 4.8h10a1.6 1.6 0 0 1 1.6 1.1l1.6 4.3"/><path d="M10.2 13.4c.5-.4 1.1-.6 1.8-.6s1.3.2 1.8.6"/>', 15, 1.8),
    puzzle: S('24 24', '<path d="M10 4a2 2 0 1 1 4 0v1h3a1 1 0 0 1 1 1v3h1a2 2 0 1 1 0 4h-1v3a1 1 0 0 1-1 1h-3v1a2 2 0 1 1-4 0v-1H7a1 1 0 0 1-1-1v-3H5a2 2 0 1 1 0-4h1V6a1 1 0 0 1 1-1h3Z"/>', 15, 1.8),
    folder: S('24 24', '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>', 14, 2),
    file: S('24 24', '<path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v4h4"/>', 14, 2)
  };

  /* ---------- реестр элементов (index.html уже в DOM) ---------- */
  const id = (s) => document.getElementById(s);
  A.el = {
    progress: id('progress'),
    windowCard: id('windowCard'),
    strip: id('tabstrip'),
    dropLine: id('dropLine'),
    btnNewTab: id('btnNewTab'),
    btnBack: id('btnBack'),
    btnFwd: id('btnFwd'),
    btnReload: id('btnReload'),
    btnHome: id('btnHome'),
    siteIcon: id('siteIcon'),
    addr: id('address'),
    btnStar: id('btnStar'),
    suggestBox: id('suggest'),
    btnHistory: id('btnHistory'),
    btnDownloads: id('btnDownloads'),
    btnSettings: id('btnSettings'),
    btnPasswords: id('btnPasswords'),
    btnOverview: id('btnOverview'),
    bmbar: id('bmbar'),
    content: id('content'),
    overlay: id('overlay'),
    settingsDrawer: id('settingsDrawer'),
    historyDrawer: id('historyDrawer'),
    downloadsDrawer: id('downloadsDrawer'),
    histList: id('histList'),
    histSearch: id('histSearch'),
    histClear: id('histClear'),
    dlList: id('dlList'),
    ctxMenu: id('ctxmenu'),
    toastsEl: id('toasts'),
    winMin: id('winMin'),
    winMax: id('winMax'),
    winClose: id('winClose'),
    btnOverviewEl: id('btnOverview'),
    overviewEl: id('overview'),
    overviewGrid: id('overviewGrid'),
    dockPill: id('dockPill'),
    dockCount: id('dockCount'),
    findbar: id('findbar'),
    findInput: id('findInput'),
    findCount: id('findCount'),
    findPrev: id('findPrev'),
    findNext: id('findNext'),
    findClose: id('findClose'),
    incogBadge: id('incogBadge'),
    titlebar: id('titlebar'),
    brand: id('brand')
  };

  /* ---------- медиа-запросы ---------- */
  A.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  A.schemeMedia = window.matchMedia('(prefers-color-scheme: dark)');

})();
