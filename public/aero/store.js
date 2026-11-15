/* Aero - settings store (shared by app, newtab, settings) */
(function () {
  'use strict';

  var KEY = 'aera.settings.v2';
  var HKEY = 'aera.history.v2';

  var DEFAULTS = {
    theme: 'dark',            // dark | light | auto
    accent: 'safari',         // safari | orange | green | pink | graphite
    glass: 'high',            // low | medium | high
    animations: true,
    compactTabs: false,
    searchEngine: 'google',
    suggestHistory: true,
    keepHistory: true,
    clearOnExit: false,
    homeOnStartup: true,      // true: show widget page on launch; false: restore last session
    wallpaper: 'aurora',      // preset id | 'custom'
    wallpaperUrl: '',
    wallpaperDim: 20,         // 0..60 % darkening
    columns: 4,               // widget grid columns
    widgets: {
      order: ['clock', 'weather', 'links', 'calendar'],
      sizes: { clock: 'M', weather: 'S', links: 'L', calendar: 'S' },
      hidden: {},
      clock: { analog: true, seconds: false, format: '24h' },
      weather: { city: 'Москва', lat: 55.7558, lon: 37.6173, units: 'c' },
      calendar: { showWeekNumbers: false }
    },
    quickLinks: [
      { title: 'YouTube', url: 'https://www.youtube.com' },
      { title: 'Google', url: 'https://www.google.com' },
      { title: 'Telegram', url: 'https://web.telegram.org' },
      { title: 'GitHub', url: 'https://github.com' },
      { title: 'Wiki', url: 'https://ru.wikipedia.org' },
      { title: 'Steam', url: 'https://store.steampowered.com' },
      { title: 'Twitter', url: 'https://x.com' },
      { title: 'Reddit', url: 'https://www.reddit.com' }
    ]
  };

  var ACCENTS = {
    safari:   { light: '#0a84ff', dark: '#0a84ff' },
    orange:   { light: '#ff8a3d', dark: '#ff9f0a' },
    green:    { light: '#30c269', dark: '#32d74b' },
    pink:     { light: '#f256a0', dark: '#ff375f' },
    graphite: { light: '#7c7c82', dark: '#98989d' }
  };

  var ENGINES = {
    google:     { name: 'Google',     template: 'https://www.google.com/search?q=%s',     domain: 'google.com' },
    yandex:     { name: 'Яндекс',     template: 'https://yandex.ru/search/?text=%s',      domain: 'yandex.ru' },
    bing:       { name: 'Bing',       template: 'https://www.bing.com/search?q=%s',       domain: 'bing.com' },
    duckduckgo: { name: 'DuckDuckGo', template: 'https://duckduckgo.com/?q=%s',           domain: 'duckduckgo.com' },
    brave:      { name: 'Brave',      template: 'https://search.brave.com/search?q=%s',   domain: 'search.brave.com' }
  };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return deepClone(DEFAULTS);
      var parsed = JSON.parse(raw);
      return mergeDefaults(parsed, deepClone(DEFAULTS));
    } catch (_) {
      return deepClone(DEFAULTS);
    }
  }

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function mergeDefaults(src, base) {
    for (var k in base) {
      if (!(k in src)) { src[k] = base[k]; continue; }
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
        mergeDefaults(src[k], base[k]);
      }
    }
    return src;
  }

  var settings = load();
  var listeners = [];

  var Store = {
    get: function () { return settings; },
    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_) {}
      for (var i = 0; i < listeners.length; i++) { try { listeners[i](settings); } catch (_) {} }
    },
    update: function (patch) {
      for (var k in patch) settings[k] = patch[k];
      Store.save();
    },
    onChange: function (fn) { listeners.push(fn); },
    engines: ENGINES,
    accents: ACCENTS,
    defaults: DEFAULTS,
    reset: function () { settings = deepClone(DEFAULTS); Store.save(); },
    exportJSON: function () { return JSON.stringify(settings, null, 2); },
    importJSON: function (text) {
      var parsed = JSON.parse(text);
      settings = mergeDefaults(parsed, deepClone(DEFAULTS));
      Store.save();
    }
  };

  /* ---- history ---- */
  var History = {
    all: function () {
      try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (_) { return []; }
    },
    add: function (url, title) {
      if (!settings.keepHistory || !url || !/^https?:/i.test(url)) return;
      var list = History.all().filter(function (h) { return h.url !== url; });
      list.unshift({ url: url, title: title || url, ts: Date.now() });
      if (list.length > 400) list.length = 400;
      try { localStorage.setItem(HKEY, JSON.stringify(list)); } catch (_) {}
    },
    remove: function (url) {
      try { localStorage.setItem(HKEY, JSON.stringify(History.all().filter(function (h) { return h.url !== url; }))); } catch (_) {}
    },
    clear: function () { try { localStorage.removeItem(HKEY); } catch (_) {} }
  };
  Store.history = History;

  /* ---- theme application ---- */
  function applyTheme() {
    var s = settings;
    var theme = s.theme;
    if (theme === 'auto') {
      theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-glass', s.glass || 'high');
    root.setAttribute('data-animations', s.animations ? 'on' : 'off');
    var acc = ACCENTS[s.accent] || ACCENTS.safari;
    root.style.setProperty('--accent', acc[theme]);
    if (window.electronAPI && window.electronAPI.setNativeTheme) {
      window.electronAPI.setNativeTheme(theme);
    }
  }
  Store.applyTheme = applyTheme;
  applyTheme();

  window.AeroStore = Store;
})();
