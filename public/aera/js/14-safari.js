'use strict';

/* ============================================================================
   Aera — Safari-поведение (реальные функции macOS Safari, ничего выдуманного):
     1. Меню «⋯» — переполнение тулбара (все функции, не влезающие в
        минимальный набор Safari: домой, поиск, история, загрузки,
        инкогнито, пароли, настройки).
     2. «Show Color in Tab Bar» — окраска панели инструментов цветом
        сайта (theme-color / фон страницы), как в настоящем Safari.
     3. Авто-скрытие панели в полноэкранном режиме при прокрутке вниз и
        возврат при прокрутке вверх / мыши у верхней кромки (Safari).
   Только десктоп; в веб-режиме работает лишь меню «⋯».
   ============================================================================ */

(function () {
  const A = window.Aera;
  const el = A.el;

  /* ============================================================
     1. МЕНЮ «⋯»
     ============================================================ */
  (function overflowMenu() {
    const menu = document.getElementById('overflowMenu');
    const btn = document.getElementById('btnOverflow');
    if (!menu || !btn) return;

    function setMenu(open) {
      menu.classList.toggle('open', open);
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setMenu(!menu.classList.contains('open'));
    });

    document.addEventListener('pointerdown', (e) => {
      if (!menu.classList.contains('open')) return;
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      setMenu(false);
    });

    /* Выбрал пункт — меню закрывается (как выпадающее меню macOS). */
    menu.addEventListener('click', (e) => {
      if (e.target.closest('.ov-item')) setTimeout(() => setMenu(false), 50);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenu(false);
    });
    window.addEventListener('blur', () => setMenu(false));
  })();

  /* ============================================================
     2. ОКРАСКА ПАНЕЛИ ЦВЕТОМ САЙТА
     ============================================================ */
  const TINT_JS =
    '(function(){var m=document.querySelector(\'meta[name="theme-color"]\');' +
    'if(m&&m.content)return m.content;' +
    'var b=document.body;if(!b)return "";' +
    'try{return getComputedStyle(b).backgroundColor;}catch(e){return "";}})()';

  function parseColor(str) {
    if (!str || typeof str !== 'string') return null;
    str = str.trim();
    let m = /^#([0-9a-f]{3})$/i.exec(str);
    if (m) {
      return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    }
    m = /^#([0-9a-f]{6})$/i.exec(str);
    if (m) {
      return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    }
    m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(str);
    if (m) return [+m[1], +m[2], +m[3]];
    return null;
  }

  function isDarkTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return A.schemeMedia.matches;
  }

  /** Смешение цвета страницы с базовым хромом Safari.
      Светлая: база #f8f8f8 (сэмпл), доля сайта 82%.
      Тёмная: база #32343b (сэмпл dk5), доля сайта 55% + затемнение. */
  function tintToRgba(rgb) {
    const dark = isDarkTheme();
    const base = dark ? [50, 52, 59] : [248, 248, 250];
    const share = dark ? 0.55 : 0.82;
    const mix = rgb.map((c, i) => Math.round(c * share + base[i] * (1 - share)));
    const [r, g, b] = dark
      ? mix.map((c) => Math.round(c * 0.78)) // затемнение в тёмной теме
      : mix;
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + (dark ? 0.94 : 0.96) + ')';
  }

  function clearTint() {
    document.documentElement.style.removeProperty('--chrome-tint');
    document.body.classList.remove('no-tint');
    document.body.classList.add('no-tint');
  }

  function applyTint(colorStr) {
    if (A.settings.pageTint === false || !colorStr) { clearTint(); return; }
    const rgb = parseColor(colorStr);
    if (!rgb) { clearTint(); return; }
    /* Полностью белый/чёрный фон сайта не окрашивает панель (Safari тоже
       оставляет нейтральной белую страницу). */
    const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    if (lum > 246 || lum < 12) { clearTint(); return; }
    document.body.classList.remove('no-tint');
    document.documentElement.style.setProperty('--chrome-tint', tintToRgba(rgb));
  }

  function extractTint(tab) {
    if (!A.DESKTOP || !tab || !tab.guest || !tab.guest.executeJavaScript) return;
    if (A.isNewtabUrl(tab.url || '')) { clearTint(); return; }
    const target = tab;
    try {
      tab.guest.executeJavaScript(TINT_JS, true).then((col) => {
        if (target === A.tabs.active()) applyTint(col);
      }).catch(() => clearTint());
    } catch (e) { clearTint(); }
  }

  (function pageTint() {
    if (!A.DESKTOP) return;
    /* Выключено настройкой — хром всегда нейтральный. */
    if (A.settings.pageTint === false) clearTint();

    /* Перехват создания гостя: на dom-ready активной вкладки берём цвет. */
    const origBuild = A.buildGuest;
    if (origBuild) {
      A.buildGuest = function (tab, startUrl, deferLoad) {
        const res = origBuild(tab, startUrl, deferLoad);
        if (tab.guest && tab.guest.addEventListener) {
          const grab = () => { if (tab.id === A.tabs.activeId()) extractTint(tab); };
          tab.guest.addEventListener('dom-ready', grab);
          tab.guest.addEventListener('did-navigate-in-page', grab);
        }
        return res;
      };
    }

    /* Переключение вкладки — обновить окраску. */
    const origActivate = A.tabs.activate;
    if (origActivate) {
      A.tabs.activate = function (id) {
        origActivate(id);
        const tab = A.tabs.get(id);
        if (!tab) return;
        if (A.isNewtabUrl(tab.url || '')) { clearTint(); return; }
        if (tab.guest && tab.guest.executeJavaScript) extractTint(tab);
        else clearTint(); /* выгруженная вкладка — нейтральный хром */
      };
    }

    /* Смена темы пересчитывает смешение. */
    A.schemeMedia.addEventListener('change', () => {
      const t = A.tabs.active();
      if (t) extractTint(t); else clearTint();
    });

    /* Начальное состояние. */
    setTimeout(() => {
      const t = A.tabs.active();
      if (t) extractTint(t);
    }, 600);

    /* Публичное обновление (вызывается тумблером в настройках). */
    A.safariRefreshTint = function () {
      const t = A.tabs.active();
      if (t) extractTint(t); else clearTint();
    };
  })();

  /* ============================================================
     3. АВТО-СКРЫТИЕ ПАНЕЛИ В ПОЛНОЭКРАННОМ РЕЖИМЕ
     ============================================================ */
  (function fullscreenAutohide() {
    if (!A.DESKTOP) return;

    let fs = false;
    let lastScroll = 0;
    let pollTimer = null;

    function setHidden(hidden) {
      document.body.classList.toggle('fs-hide', hidden && fs);
    }

    function poll() {
      if (!fs) return;
      const tab = A.tabs.active();
      if (!tab || !tab.guest || !tab.guest.executeJavaScript) return;
      if (A.isNewtabUrl(tab.url || '')) { setHidden(false); return; }
      try {
        tab.guest.executeJavaScript(
          '(document.scrollingElement?document.scrollingElement.scrollTop:(document.documentElement.scrollTop||document.body.scrollTop))||0',
          true
        ).then((y) => {
          const cur = Number(y) || 0;
          if (cur > lastScroll + 6 && cur > 40) setHidden(true);
          else if (cur < lastScroll - 6) setHidden(false);
          lastScroll = cur;
        }).catch(() => { /* noop */ });
      } catch (e) { /* noop */ }
    }

    function startPoll() {
      stopPoll();
      lastScroll = 0;
      pollTimer = setInterval(poll, 500);
    }
    function stopPoll() {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    function setFullscreen(v) {
      fs = !!v;
      if (fs) {
        setHidden(false);
        startPoll();
      } else {
        stopPoll();
        setHidden(false);
      }
    }

    if (window.zdesktop && window.zdesktop.on) {
      window.zdesktop.on('win-state', (st) => {
        if (st && typeof st.fullscreen === 'boolean') setFullscreen(st.fullscreen);
      });
      /* Стартовое состояние (окно могло открыться полноэкранным). */
      if (window.zdesktop.isFullScreen) {
        window.zdesktop.isFullScreen().then(setFullscreen).catch(() => { /* noop */ });
      }
    }

    /* Мышь у верхней кромки — показать панель (как в Safari). */
    window.addEventListener('mousemove', (e) => {
      if (!fs) return;
      if (e.clientY <= 4) setHidden(false);
    }, { passive: true });
  })();

})();
