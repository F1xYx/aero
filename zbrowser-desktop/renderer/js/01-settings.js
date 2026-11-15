'use strict';

/* ============================================================================
   Aera 2.0 — слой настроек.
   Десктоп: localStorage (мгновенно) + settings.json в userData (постоянно,
   главный процесс читает из него флаги движка и список расширений).
   Веб: только localStorage.
   ============================================================================ */

(function () {
  const A = window.Aera;

  const stored = A.LS.get('zsettings', {}) || {};
  const s = Object.assign({}, A.DEFAULT_SETTINGS, stored);

  /* ---- мягкие миграции прошлых версий (неизвестные ключи сохраняются) ---- */
  if (stored.showBookmarks === undefined && stored.showBookmarksBar !== undefined) {
    s.showBookmarks = !!stored.showBookmarksBar;
  }
  if (!stored.wallpaper && stored.newtabBg) {
    const map = { warm: 'sunset', ocean: 'mint', violet: 'sunset', mono: 'midnight' };
    s.wallpaper = map[stored.newtabBg] || A.DEFAULT_SETTINGS.wallpaper;
  }
  /* Старый дефолт домашней страницы (Google) -> встроенная начальная страница. */
  if (stored.home === undefined || stored.home === 'https://www.google.com') {
    s.home = 'newtab.html';
  }
  /* restoreSession (bool) -> startup (newtab | restore). */
  if (typeof stored.startup !== 'string') {
    s.startup = stored.restoreSession === false ? 'newtab' : 'restore';
  }
  /* forceDarkSites (bool) -> siteTheme (system | force-dark | light). */
  if (typeof stored.siteTheme !== 'string') {
    s.siteTheme = stored.forceDarkSites === false ? 'light' : 'system';
  }
  if (!A.ENGINES[s.engine]) s.engine = 'google';
  if (!A.ACCENTS.includes(s.accent)) s.accent = 'azure';
  if (!A.WALLPAPERS.includes(s.wallpaper)) {
    s.wallpaper = A.WALLPAPER_LEGACY[s.wallpaper] || 'sunset';
  }
  if (['system', 'force-dark', 'light'].indexOf(s.siteTheme) < 0) s.siteTheme = 'system';
  if (['newtab', 'restore'].indexOf(s.startup) < 0) s.startup = 'restore';
  s.uiScale = A.clamp(Number(s.uiScale) || 1, 0.8, 1.3);
  s.pageZoom = A.clamp(Number(s.pageZoom) || 1, 0.5, 2);

  A.settings = s;

  /* Каждое сохранение уходит и в localStorage, и (на десктопе) в settings.json. */
  let patchTimer = null;
  A.saveSettings = function () {
    A.LS.set('zsettings', A.settings);
    if (A.DESKTOP && window.zdesktop && window.zdesktop.settingsPatch) {
      clearTimeout(patchTimer);
      patchTimer = setTimeout(() => {
        try {
          window.zdesktop.settingsPatch(JSON.parse(JSON.stringify(A.settings)));
        } catch (e) { /* noop */ }
      }, 250);
    }
  };

  /* Мгновенная отправка (для ключей, важных главному процессу). */
  A.pushSettingsNow = function () {
    if (A.DESKTOP && window.zdesktop && window.zdesktop.settingsPatch) {
      try {
        window.zdesktop.settingsPatch(JSON.parse(JSON.stringify(A.settings)));
      } catch (e) { /* noop */ }
    }
  };

  A.engine = function () { return A.ENGINES[A.settings.engine] || A.ENGINES.google; };
  A.searchUrl = function (q) { return A.engine().url.replace('%s', encodeURIComponent(q)); };

  /** Ввод адресной строки -> URL или поисковый запрос (по выбранному движку). */
  A.toNavigable = function (text) {
    const str = String(text || '').trim();
    if (!str) return null;
    if (/^(https?|file):\/\//i.test(str) || /^about:blank$/i.test(str)) return str;
    if (/^localhost(:\d+)?([\/?#].*)?$/i.test(str)) return 'http://' + str;
    if (A.looksLikeUrl(str)) return 'https://' + str;
    return A.searchUrl(str);
  };

  A.effectiveTheme = function () {
    if (A.settings.theme === 'system') return A.schemeMedia.matches ? 'dark' : 'light';
    return A.settings.theme === 'light' ? 'light' : 'dark';
  };

  /* Десктоп: настройки из settings.json главнее localStorage (например,
     после правки вручную или обновления списка расширений). */
  A.syncRemoteSettings = function () {
    if (!A.DESKTOP || !window.zdesktop || !window.zdesktop.settingsGet) return;
    try {
      window.zdesktop.settingsGet().then((remote) => {
        if (!remote || typeof remote !== 'object') return;
        const before = JSON.stringify(A.settings);
        ['siteTheme', 'hwAccel', 'adBlock', 'downloadsAsk', 'hibernate', 'pageZoom', 'theme', 'engine', 'startup', 'home'].forEach((k) => {
          if (remote[k] !== undefined) A.settings[k] = remote[k];
        });
        if (JSON.stringify(A.settings) !== before) {
          A.LS.set('zsettings', A.settings);
          if (A.applyAll) A.applyAll();
          if (A.settingsUI && A.settingsUI.fill) A.settingsUI.fill();
        }
      }).catch(() => { /* нет ответа — работаем на localStorage */ });
    } catch (e) { /* noop */ }
  };

})();
