'use strict';

/* ============================================================================
   Aera 2.0 — навигация.
   ГЛАВНОЕ: защита от двойной загрузки. Однострочная блокировка повтора
   того же URL в течение 300 мс + чёткий флаг навигации на вкладке.
   События did-navigate обновляют ТОЛЬКО интерфейс и никогда не повторяют
   загрузку — echo-циклов не существует.
   ============================================================================ */

(function () {
  const A = window.Aera;

  /* tabId -> { url, at } — память последних переходов для дедупликации. */
  const navMemory = new Map();
  const NAV_DEDUPE_MS = 300;

  function isDuplicate(tabId, url, force) {
    if (force) return false;
    const now = Date.now();
    const m = navMemory.get(tabId);
    if (m && m.url === url && now - m.at < NAV_DEDUPE_MS) return true;
    navMemory.set(tabId, { url, at: now });
    return false;
  }

  /* ------------------------------------------------------------------ */
  A.nav = {};

  /** Единая точка загрузки URL во вкладке. */
  A.nav.navigateTab = function (tab, url, opts) {
    const options = opts || {};
    if (!tab || !url) return;
    if (isDuplicate(tab.id, url, !!options.force)) return;
    A.hideSuggest();

    /* Флаг навигации: события загрузки теперь «свои» и не триггерят повторов. */
    tab.navState = url;

    if (A.DESKTOP) {
      let done = false;
      try { tab.guest.loadURL(url); done = true; } catch (e) { /* занят — пробуем src */ }
      if (!done && tab.guest) {
        try { tab.guest.setAttribute('src', url); } catch (e) { /* noop */ }
      }
      tab.url = url;
      tab.newtab = A.isNewtabUrl(url);
      tab.title = A.titleFor(url);
      tab.loading = true;
    } else {
      /* Стек назад/вперёд ведём сами (iframe не даёт истории наружу). */
      if (options.push !== false && tab.url && tab.url !== url) {
        tab.back.push(tab.url);
        if (tab.back.length > 100) tab.back.shift();
        tab.fwd.length = 0;
      }
      tab.url = url;
      tab.newtab = A.isNewtabUrl(url);
      tab.title = A.titleFor(url);
      tab.loading = true;
      tab.navResolving = true;
      tab.reportedFinal = null;
      try { tab.guest.src = A.webSrcFor(url, tab.id); } catch (e) { /* noop */ }
      [80, 500, 1500].forEach((ms) => setTimeout(() => A.pollTab(tab), ms));
    }

    A.tabs.renderTabs();
    A.addr.updateProgress();
    if (tab.id === A.tabs.activeId()) {
      A.addr.syncAddressUI();
      A.addr.updateNavButtons();
    }
    if (!tab.newtab && !tab.incognito) A.history.add(url, tab.title);
    A.tabs.scheduleSaveSession();
  };

  A.nav.navigateActive = function (url) {
    const tab = A.tabs.active();
    if (!tab || !url) return;
    A.closeDrawers();
    A.hideCtx();
    try { A.el.addr.blur(); } catch (e) { /* noop */ }
    A.nav.navigateTab(tab, url);
  };

  A.nav.goBack = function () {
    const t = A.tabs.active();
    if (!t) return;
    if (A.DESKTOP) {
      try { t.guest.goBack(); } catch (e) { /* noop */ }
      return;
    }
    if (!t.back.length) return;
    const prev = t.back.pop();
    t.fwd.push(t.url);
    A.nav.navigateTab(t, prev, { push: false, force: true });
  };

  A.nav.goForward = function () {
    const t = A.tabs.active();
    if (!t) return;
    if (A.DESKTOP) {
      try { t.guest.goForward(); } catch (e) { /* noop */ }
      return;
    }
    if (!t.fwd.length) return;
    const next = t.fwd.pop();
    t.back.push(t.url);
    A.nav.navigateTab(t, next, { push: false, force: true });
  };

  A.nav.reloadTab = function (tab) {
    if (!tab) return;
    if (A.DESKTOP) {
      try {
        if (tab.loading) tab.guest.stop();
        else tab.guest.reload();
      } catch (e) { /* noop */ }
      return;
    }
    let reloaded = false;
    try {
      tab.guest.contentWindow.location.reload();
      reloaded = true;
    } catch (e) { /* noop */ }
    if (!reloaded) {
      try { tab.guest.src = A.webSrcFor(tab.url || A.newtabUrl(), tab.id); } catch (e) { /* noop */ }
      tab.loading = true;
      A.addr.updateProgress();
      [80, 500, 1500].forEach((ms) => setTimeout(() => A.pollTab(tab), ms));
    }
  };

  /** Домой: встроенная начальная страница или адрес из настроек. */
  A.nav.goHome = function () {
    const h = String(A.settings.home || '').trim();
    if (!h || /(^|\/)newtab\.html([?#].*)?$/i.test(h)) {
      A.nav.navigateActive(A.newtabUrl());
      return;
    }
    const url = A.toNavigable(h);
    A.nav.navigateActive(url || A.newtabUrl());
  };

})();
