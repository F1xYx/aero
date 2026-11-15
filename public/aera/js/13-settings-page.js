'use strict';

/* ============================================================================
   Aera 2.2 — клей страницы настроек (settings.html).
   Страница живёт в отдельном окне (десктоп) или как полноэкранная страница
   (веб). Логика контролов — в 10-settings-ui.js, расширения/пароли — в
   12-store-ui.js; здесь — навигация, синхронизация между окнами, «о программе».
   ============================================================================ */

(function () {
  const A = window.Aera;

  /* ---------- тосты (легковесная копия из 04-ui.js — страница настроек
     не тянет весь UI-модуль) ---------- */
  if (!A.toast) {
    A.toast = function (msg, kind) {
      const box = document.getElementById('toasts');
      if (!box) return;
      const item = document.createElement('div');
      item.className = 'toast' + (kind === 'warn' ? ' t-warn' : '');
      const icon = document.createElement('span');
      icon.className = 't-icon';
      icon.innerHTML = kind === 'warn' ? A.SVG.alert : A.SVG.check;
      const text = document.createElement('span');
      text.className = 't-text';
      text.textContent = String(msg || '');
      const line = document.createElement('span');
      line.className = 't-line';
      item.appendChild(icon);
      item.appendChild(text);
      item.appendChild(line);
      box.appendChild(item);
      while (box.children.length > 4) box.firstChild.remove();
      requestAnimationFrame(() => requestAnimationFrame(() => item.classList.add('show')));
      setTimeout(() => {
        item.classList.remove('show');
        setTimeout(() => { try { item.remove(); } catch (e) { /* noop */ } }, 340);
      }, 3500);
    };
  }

  const TITLES = {
    secAppearance: 'Вид',
    secStartup: 'Запуск и главная',
    secSearch: 'Поиск',
    secPerf: 'Производительность',
    secTabs: 'Вкладки',
    secBookmarks: 'Закладки',
    secExtensions: 'Расширения',
    secPasswords: 'Пароли',
    secDownloads: 'Загрузки',
    secSecurity: 'Защита',
    secPrivacy: 'Приватность',
    secHotkeys: 'Горячие клавиши',
    secAbout: 'О программе'
  };

  const nav = document.getElementById('spNav');
  const titleEl = document.getElementById('spTitle');
  const scroll = document.getElementById('spScroll');

  function setActiveSec(secId) {
    if (!nav) return;
    nav.querySelectorAll('button[data-sec]').forEach((b) => {
      b.classList.toggle('active', b.dataset.sec === secId);
    });
    if (titleEl) titleEl.textContent = TITLES[secId] || 'Настройки';
  }

  function gotoSection(secId, smooth) {
    if (!secId) return;
    const sec = document.getElementById(secId);
    if (!sec) return;
    setActiveSec(secId);
    try {
      sec.scrollIntoView({ behavior: smooth === false ? 'auto' : 'smooth', block: 'start' });
    } catch (e) { /* noop */ }
    sec.classList.remove('sec-flash');
    requestAnimationFrame(() => sec.classList.add('sec-flash'));
    setTimeout(() => sec.classList.remove('sec-flash'), 1800);
  }
  A.settingsGoto = gotoSection;

  /* Клик по навигации. */
  if (nav) {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-sec]');
      if (!btn) return;
      gotoSection(btn.dataset.sec);
    });
  }

  /* Начальный раздел: ?sec=… или #sec=… (откроем нужный сразу). */
  function initialSec() {
    try {
      const q = new URLSearchParams(location.search).get('sec');
      if (q && TITLES[q]) return q;
      const h = (location.hash || '').replace(/^#/, '');
      if (h && TITLES[h]) return h;
    } catch (e) { /* noop */ }
    return 'secAppearance';
  }

  /* Закрытие окна (Esc / крестик). */
  function closeSettings() {
    if (A.DESKTOP && window.zdesktop && window.zdesktop.closeSettingsWindow) {
      window.zdesktop.closeSettingsWindow();
      return;
    }
    if (A.WEB) {
      /* Веб: страница настроек открывается в отдельной вкладке хоста —
         сообщаем хосту, что пора вернуться на начальную страницу. */
      try {
        parent.postMessage({ __zaeranav: true, url: 'newtab.html' }, '*');
      } catch (e) { /* noop */ }
      try { window.close(); } catch (e) { /* noop */ }
    }
  }
  const closeBtn = document.getElementById('spClose');
  if (closeBtn) closeBtn.addEventListener('click', closeSettings);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettings();
  });

  /* События главного процесса. */
  if (A.DESKTOP && window.zdesktop) {
    window.zdesktop.on('settings-goto', (sec) => { if (sec) gotoSection(sec); });
    /* Настройки могли поменять в основном окне, пока страница открыта. */
    window.zdesktop.on('settings-updated', (next) => {
      if (!next || typeof next !== 'object') return;
      let changed = false;
      Object.keys(A.settings).forEach((k) => {
        if (next[k] !== undefined && A.settings[k] !== next[k]) {
          A.settings[k] = next[k];
          changed = true;
        }
      });
      if (changed) {
        A.LS.set('zsettings', A.settings);
        if (A.settingsUI && A.settingsUI.fill) A.settingsUI.fill();
      }
    });
  }

  /* ---------- запуск ---------- */
  function boot() {
    A.applyAll();
    if (A.settingsUI && A.settingsUI.fill) A.settingsUI.fill();
    A.paintRangeFill(document.getElementById('setUiScale'));
    A.paintRangeFill(document.getElementById('setPageZoom'));
    if (A.settingsUI && A.settingsUI.fillAbout) A.settingsUI.fillAbout();
    if (A.extensionsUI && A.extensionsUI.init) A.extensionsUI.init();
    if (A.passwordsUI && A.passwordsUI.init) A.passwordsUI.init();
    if (A.adblockStatsUI && A.adblockStatsUI.init) A.adblockStatsUI.init();

    const vEl = document.getElementById('spVersion');
    if (vEl) {
      vEl.textContent = 'Aera ' + A.VERSION;
      if (A.DESKTOP && window.zdesktop && window.zdesktop.info) {
        window.zdesktop.info().then((info) => {
          if (info && info.version) vEl.textContent = 'Aera ' + info.version;
        }).catch(() => { /* noop */ });
      }
    }

    gotoSection(initialSec(), false);
  }

  boot();
})();
