'use strict';

/* ============================================================================
   Aera 2.0 — темы и внешний вид.
   Тема интерфейса, акцент, стекло (лёгкая прозрачность БЕЗ тяжёлого
   backdrop-filter), обои, анимации, масштаб UI и страниц, тема сайтов.
   ============================================================================ */

(function () {
  const A = window.Aera;

  let webDarkState = null;

  /** Рассылает изменения в открытые страницы новых вкладок (webview/iframe). */
  A.broadcastNewtab = function (msg) {
    const tabs = A.tabs ? A.tabs.list() : [];
    tabs.forEach((t) => {
      if (!t.newtab || !t.guest || !t.guest.contentWindow) return;
      try { t.guest.contentWindow.postMessage(msg, '*'); } catch (e) { /* noop */ }
    });
  };

  A.applyTheme = function () {
    const t = ['dark', 'light', 'system'].includes(A.settings.theme) ? A.settings.theme : 'light';
    document.documentElement.dataset.theme = t;
    A.broadcastNewtab({ __zaeratheme: A.effectiveTheme() });
    if (A.DESKTOP) {
      try { window.zdesktop.setTheme(t); } catch (e) { /* noop */ }
    }
    A.applySiteDark();
  };

  A.applyAccent = function () {
    const a = A.ACCENTS.includes(A.settings.accent) ? A.settings.accent : 'azure';
    document.documentElement.dataset.accent = a;
  };

  /* «Стекло»: быстрая полупрозрачность панелей (rgba + 1px рамки),
     без backdrop-filter — так держатся стабильные 60–144 FPS. */
  A.applyGlass = function () {
    document.body.classList.toggle('glass', A.settings.glass !== false);
  };

  /** Тема САЙТОВ: system | force-dark | light. */
  A.applySiteDark = function () {
    if (A.DESKTOP) {
      try { window.zdesktop.setSiteTheme(A.settings.siteTheme || 'system'); } catch (e) { /* noop */ }
      return;
    }
    /* Веб-режим: cookie zb_dark управляет перекраской на /api/proxy.
       force-dark в песочнице означает «всегда тёмная». */
    const st = A.settings.siteTheme || 'system';
    const dark = st === 'force-dark'
      ? true
      : st === 'light' ? false : A.effectiveTheme() === 'dark';
    const first = webDarkState === null;
    if (webDarkState === dark) return;
    webDarkState = dark;
    try {
      document.cookie = 'zb_dark=' + (dark ? '1' : '0') + ';path=/;max-age=31536000;samesite=Lax';
    } catch (e) { /* noop */ }
    if (!first && A.tabs) {
      A.tabs.list().forEach((t) => {
        if (!t.newtab && !t.pendingUrl) A.nav.reloadTab(t);
      });
    }
  };

  A.applyAdBlock = function () {
    if (A.DESKTOP) {
      try { window.zdesktop.setAdBlock(!!A.settings.adBlock); } catch (e) { /* noop */ }
    }
  };

  /**
   * Тёплые соединения к поисковику и домашней странице: DNS+TCP+TLS
   * устанавливаются заранее, первый переход открывается быстрее.
   */
  A.syncPreconnect = function () {
    const hosts = new Set();
    try { hosts.add(new URL(A.engine().url).hostname); } catch (e) { /* noop */ }
    try { hosts.add(new URL(A.toNavigable(A.settings.home) || 'https://aera.local').hostname); } catch (e) { /* noop */ }
    if (A.WEB) hosts.add(location.hostname);
    document.querySelectorAll('link[data-aera-pre]').forEach((l) => l.remove());
    hosts.forEach((h) => {
      if (!h || h === 'newtab.html' || h === 'aera.local') return;
      ['preconnect', 'dns-prefetch'].forEach((rel) => {
        const link = document.createElement('link');
        link.rel = rel;
        link.href = 'https://' + h + '/';
        link.dataset.aeraPre = '1';
        document.head.appendChild(link);
      });
    });
  };

  A.applyUiScale = function () {
    const f = A.clamp(Number(A.settings.uiScale) || 1, 0.8, 1.3);
    if (A.DESKTOP) {
      try { window.zdesktop.setUiScale(f); } catch (e) { /* noop */ }
    } else {
      try { document.documentElement.style.zoom = String(f); } catch (e) { /* noop */ }
    }
  };

  /** Масштаб страниц по умолчанию: применяется к каждой webview-вкладке. */
  A.applyPageZoom = function () {
    const z = A.clamp(Number(A.settings.pageZoom) || 1, 0.5, 2);
    const tabs = A.tabs ? A.tabs.list() : [];
    tabs.forEach((t) => {
      if (!A.DESKTOP || !t.guest) return;
      try { if (t.guest.setZoomFactor) t.guest.setZoomFactor(z); } catch (e) { /* noop */ }
    });
  };

  A.applyAnimations = function () {
    const on = !!A.settings.animations && !A.reduceMotion.matches;
    document.body.classList.toggle('no-anim', !on);
    A.broadcastNewtab({ __zaeraanim: on });
  };

  /** Пресет обоев (или своё фото) применяется и к хрому, и к начальной странице. */
  A.applyWallpaper = function () {
    A.WALLPAPERS.forEach((w) => document.body.classList.remove('wp-' + w));
    let wp = A.WALLPAPERS.includes(A.settings.wallpaper) ? A.settings.wallpaper : 'sunset';
    const chip = document.getElementById('wpCustomChip');
    if (wp === 'custom') {
      const img = A.LS.get('zwallpaper', null);
      if (typeof img === 'string' && img.startsWith('data:image')) {
        document.body.style.setProperty('--wp-img', 'url("' + img + '")');
        if (chip) {
          chip.style.backgroundImage = 'url("' + img + '")';
          chip.classList.add('img-set');
        }
      } else {
        wp = 'sunset'; // фото не сохранилось — откат на пресет
      }
    } else if (chip) {
      chip.style.backgroundImage = '';
      chip.classList.remove('img-set');
    }
    document.body.classList.add('wp-' + wp);
  };

  A.applyDownloadsAsk = function () {
    if (A.DESKTOP) {
      try { window.zdesktop.setDownloadsAsk(!!A.settings.downloadsAsk); } catch (e) { /* noop */ }
    }
  };

  A.applyAll = function () {
    A.applyTheme();
    A.applyAccent();
    A.applyGlass();
    A.applyUiScale();
    A.applyAnimations();
    A.applyWallpaper();
    A.applyDownloadsAsk();
    A.applySiteDark();
    A.applyAdBlock();
    A.applyPageZoom();
  };

  A.reduceMotion.addEventListener?.('change', () => A.applyAnimations());
  A.schemeMedia.addEventListener?.('change', () => {
    if (A.settings.theme === 'system') A.applyTheme();
    else if (A.settings.siteTheme === 'system') A.applySiteDark();
  });

})();
