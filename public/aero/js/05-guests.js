'use strict';

/* ============================================================================
   Aera 2.0 — гости вкладок: webview (десктоп) / iframe (веб).
   Жизненный цикл, события загрузки, зум, поиск по странице.
   ============================================================================ */

(function () {
  const A = window.Aera;

  /* ---------- SRC для iframe (веб): newtab.html или /api/proxy ---------- */
  A.webSrcFor = function (url, tabId) {
    if (A.isNewtabUrl(url)) {
      const params = new URLSearchParams();
      if (tabId) params.set('t', tabId);
      try {
        const panel = new URL(url, location.href).searchParams.get('panel');
        if (panel) params.set('panel', panel);
      } catch (e) { /* noop */ }
      const qs = params.toString();
      return 'newtab.html' + (qs ? '?' + qs : '');
    }
    return '/api/proxy?url=' + encodeURIComponent(url);
  };

  /** Фиксирует переход внутри iframe (ссылка/форма на прокси-странице). */
  A.recordWebNav = function (tab, newUrl) {
    if (!tab || !newUrl || newUrl === tab.url) return;
    if (tab.url && !tab.newtab) {
      tab.back.push(tab.url);
      if (tab.back.length > 100) tab.back.shift();
      tab.fwd.length = 0;
    } else {
      tab.fwd.length = 0;
    }
    tab.url = newUrl;
    tab.newtab = A.isNewtabUrl(newUrl);
  };

  /* ---------- сборка гостя вкладки (webview или iframe) ---------- */
  /**
   * Создаёт элемент гостя, карточку ошибки (десктоп), вешает обработчики
   * и добавляет в holder вкладки. Используется и при создании вкладки,
   * и при пробуждении выгруженной вкладки.
   */
  A.buildGuest = function (tab, startUrl, deferLoad) {
    const guest = A.DESKTOP ? document.createElement('webview') : document.createElement('iframe');
    tab.guest = guest;

    if (A.DESKTOP) {
      if (tab.incognito) guest.setAttribute('partition', 'incognito');
      if (!deferLoad) guest.setAttribute('src', startUrl);
      guest.setAttribute('allowpopups', '');
      tab.holder.appendChild(guest);

      const errEl = document.createElement('div');
      errEl.className = 'tab-error hidden';
      const card = document.createElement('div');
      card.className = 'err-card';
      const t = document.createElement('div');
      t.className = 'err-title';
      t.textContent = 'Не удалось открыть страницу';
      const d = document.createElement('div');
      d.className = 'err-desc';
      const retry = document.createElement('button');
      retry.className = 'btn primary err-retry';
      retry.textContent = 'Повторить';
      retry.addEventListener('click', () => {
        tab.error = null;
        errEl.classList.add('hidden');
        try { guest.reload(); } catch (e) { /* noop */ }
      });
      card.appendChild(t);
      card.appendChild(d);
      card.appendChild(retry);
      errEl.appendChild(card);
      tab.holder.appendChild(errEl);
      tab.errEl = errEl;
      tab.errDesc = d;

      bindDesktopWebview(tab, guest);
    } else {
      guest.setAttribute('src', deferLoad ? 'about:blank' : A.webSrcFor(startUrl, tab.id));
      guest.setAttribute('allow', 'fullscreen');
      guest.setAttribute('referrerpolicy', 'no-referrer');
      tab.holder.appendChild(guest);
      tab.loading = !A.isNewtabUrl(startUrl) && !deferLoad;
      guest.addEventListener('load', () => {
        if (tab.pendingUrl) return; // about:blank при отложенной загрузке
        tab.loadedFor = tab.url;
        tab.loading = false;
        A.addr.updateProgress();
        [80, 500, 1500].forEach((ms) => setTimeout(() => A.pollTab(tab), ms));
      });
    }
    return guest;
  };

  /* ---------- привязка webview (десктоп) ---------- */
  function bindDesktopWebview(tab, wv) {
    wv.addEventListener('page-title-updated', (e) => {
      tab.title = (e && e.title) || tab.title;
      A.tabs.renderTabs();
      A.tabs.scheduleSaveSession();
      if (tab.id === A.tabs.activeId()) A.addr.syncAddressUI();
    });

    wv.addEventListener('page-favicon-updated', (e) => {
      const icons = (e && e.favicons) || [];
      if (icons.length) tab.favicon = icons[icons.length - 1];
      A.tabs.renderTabs();
      if (tab.id === A.tabs.activeId()) A.addr.syncAddressUI();
    });

    wv.addEventListener('did-start-loading', () => {
      tab.loading = true;
      A.tabs.renderTabs();
      A.addr.updateProgress();
      A.addr.updateNavButtons();
      clearTimeout(tab.loadWatch);
      tab.loadWatch = setTimeout(() => {
        let busy = false;
        try { busy = wv.isLoading(); } catch (e) { busy = false; }
        if (busy && tab.id === A.tabs.activeId()) {
          A.toast('Сайт отвечает слишком долго — попробуйте обновить вкладку', 'warn');
        }
      }, 30000);
    });

    wv.addEventListener('did-stop-loading', () => {
      clearTimeout(tab.loadWatch);
      tab.loading = false;
      try { tab.url = wv.getURL() || tab.url; } catch (e) { /* noop */ }
      tab.newtab = A.isNewtabUrl(tab.url);
      A.tabs.renderTabs();
      A.addr.updateProgress();
      A.addr.updateNavButtons();
      if (tab.id === A.tabs.activeId()) A.addr.syncAddressUI();
      A.tabs.scheduleSaveSession();
    });

    wv.addEventListener('did-navigate', (e) => {
      tab.url = (e && e.url) || tab.url;
      tab.newtab = A.isNewtabUrl(tab.url);
      if (tab.newtab && /[?&]panel=settings/.test(tab.url)) A.openSettings();
      if (!tab.newtab && !tab.incognito) A.history.add(tab.url, tab.title);
      tab.error = null;
      if (tab.errEl) tab.errEl.classList.add('hidden');
      if (tab.id === A.tabs.activeId()) A.addr.syncAddressUI();
      A.addr.updateNavButtons();
      A.tabs.scheduleSaveSession();
    });

    wv.addEventListener('did-navigate-in-page', (e) => {
      if (e && e.isMainFrame === false) return;
      tab.url = (e && e.url) || tab.url;
      tab.newtab = A.isNewtabUrl(tab.url);
      if (!tab.newtab && !tab.incognito) A.history.add(tab.url, tab.title);
      if (tab.id === A.tabs.activeId()) A.addr.syncAddressUI();
      A.tabs.scheduleSaveSession();
    });

    wv.addEventListener('dom-ready', () => {
      /* Масштаб страниц по умолчанию (настройка). */
      try { if (wv.setZoomFactor) wv.setZoomFactor(A.clamp(Number(A.settings.pageZoom) || 1, 0.5, 2)); } catch (e) { /* noop */ }
    });

    wv.addEventListener('found-in-page', (e) => {
      if (A.find) A.find.onFound(e);
    });

    /* Сообщения guest-preload: захват логина/пароля при отправке формы. */
    wv.addEventListener('ipc-message', (e) => {
      if (e && e.channel === 'pw-capture' && e.args && e.args[0]) {
        if (A.handleGuestPasswordCapture) A.handleGuestPasswordCapture(tab, e.args[0]);
      }
    });

    wv.addEventListener('did-fail-load', (e) => {
      if (!e || e.errorCode === -3 || e.isMainFrame === false) return;
      tab.error = { code: e.errorCode, desc: e.errorDescription || 'Ошибка загрузки' };
      if (tab.errDesc) tab.errDesc.textContent = tab.error.desc + ' (код ' + tab.error.code + ')';
      if (tab.errEl) tab.errEl.classList.remove('hidden');
    });

    wv.addEventListener('render-process-gone', () => {
      if (tab.errDesc) tab.errDesc.textContent = 'Вкладка аварийно завершилась';
      if (tab.errEl) tab.errEl.classList.remove('hidden');
    });

    wv.addEventListener('enter-html-full-screen', () => document.body.classList.add('html-fullscreen'));
    wv.addEventListener('leave-html-full-screen', () => document.body.classList.remove('html-fullscreen'));
  }

  /* ---------- опрос состояния iframe (резерв к postMessage) ---------- */
  A.pollTab = function (tab) {
    if (!A.WEB || !tab || !tab.guest) return;
    let w = null;
    try { w = tab.guest.contentWindow; } catch (e) { return; }
    if (!w) return;
    let path = '';
    let search = '';
    try {
      path = w.location.pathname || '';
      search = w.location.search || '';
    } catch (e) { return; } // cross-origin — пропускаем

    if (tab.loadedFor !== tab.url) return;

    try {
      if (/newtab\.html$/.test(path)) {
        const params = new URLSearchParams(search);
        const wasNewtab = tab.newtab;
        tab.newtab = true;
        tab.url = 'newtab.html';
        tab.loading = false;
        tab.title = 'Новая вкладка';
        tab.navResolving = false;
        if (params.get('panel') === 'settings' && tab.id === A.tabs.activeId()) A.openSettings();
        if (!wasNewtab) {
          A.tabs.renderTabs();
          if (tab.id === A.tabs.activeId()) { A.addr.syncAddressUI(); A.addr.updateNavButtons(); }
          A.addr.updateProgress();
          A.tabs.scheduleSaveSession();
        }
        return;
      }

      if (!tab.reportedFinal) {
        const real = new URLSearchParams(search).get('url');
        if (real) {
          if (A.urlSamePage(real, tab.url)) {
            if (real !== tab.url) {
              tab.url = real;
              A.tabs.renderTabs();
              if (tab.id === A.tabs.activeId()) { A.addr.syncAddressUI(); A.addr.updateNavButtons(); }
              A.tabs.scheduleSaveSession();
            }
            tab.loading = false;
          } else if (tab.navResolving) {
            tab.url = real;
            tab.loadedFor = tab.url;
            tab.navResolving = false;
            tab.loading = false;
            A.tabs.renderTabs();
            if (tab.id === A.tabs.activeId()) { A.addr.syncAddressUI(); A.addr.updateNavButtons(); }
            A.tabs.scheduleSaveSession();
          } else {
            A.recordWebNav(tab, real);
            tab.navResolving = false;
            tab.loading = false;
            if (!tab.incognito) A.history.add(real, tab.title);
            A.tabs.renderTabs();
            if (tab.id === A.tabs.activeId()) { A.addr.syncAddressUI(); A.addr.updateNavButtons(); }
            A.addr.updateProgress();
            A.tabs.scheduleSaveSession();
          }
        }
      } else {
        tab.loading = false;
      }

      let doc = null;
      try { doc = w.document; } catch (e) { doc = null; }
      if (doc) {
        let t = null;
        try { t = doc.title || null; } catch (e) { /* noop */ }
        if (t && t !== tab.title) {
          tab.title = t;
          A.tabs.renderTabs();
          if (tab.id === A.tabs.activeId()) A.addr.syncAddressUI();
        }
        try {
          const link = doc.querySelector('link[rel*="icon"]');
          if (link && link.href && link.href !== tab.favicon) {
            tab.favicon = link.href;
            A.tabs.renderTabs();
          }
        } catch (e) { /* noop */ }
      }
    } catch (e) { /* noop */ }
  };

  /* Резервный опрос активной вкладки. */
  setInterval(() => A.pollTab(A.tabs ? A.tabs.active() : null), 700);

  /* ---------- сообщения от гостей ---------- */
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;

    /* Новая вкладка просит переход. */
    if (d.__zaeranav) {
      const url = A.safeNavUrl(d.url);
      if (!url) return;
      const tab = (d.tab && A.tabs.get(d.tab)) || A.tabs.active();
      if (!tab) return;
      if (tab.newtab && A.isNewtabUrl(url) && /[?&]panel=settings/.test(url)) {
        A.openSettings();
        return;
      }
      A.nav.navigateTab(tab, url);
      return;
    }

    /* Прокси-страница сообщает свой URL и заголовок. */
    if (d.__zbrowser) {
      const tab = A.tabs.list().find((t) => t.guest && t.guest.contentWindow === e.source);
      if (!tab) return;
      if (tab.loadedFor !== tab.url) return;
      let touched = false;
      if (typeof d.url === 'string' && d.url) {
        if (A.urlSamePage(d.url, tab.url)) {
          if (d.url !== tab.url) {
            tab.url = d.url;
            touched = true;
          }
        } else if (tab.navResolving) {
          tab.url = d.url;
          tab.loadedFor = tab.url;
          touched = true;
        } else {
          A.recordWebNav(tab, d.url);
          touched = true;
        }
        tab.reportedFinal = d.url;
      }
      tab.navResolving = false;
      tab.loading = false;
      if (typeof d.title === 'string' && d.title && d.title !== tab.title) {
        tab.title = d.title;
        touched = true;
      }
      if (touched) {
        A.tabs.renderTabs();
        if (tab.id === A.tabs.activeId()) { A.addr.syncAddressUI(); A.addr.updateNavButtons(); }
        A.addr.updateProgress();
        if (tab.url && !tab.newtab && !tab.incognito) A.history.add(tab.url, tab.title);
        A.tabs.scheduleSaveSession();
      }
      return;
    }

    /* Новая вкладка сменила поисковик чипом — синхронизируем хост (веб). */
    if (d.__zaeraengine && A.ENGINES[d.__zaeraengine]) {
      const fromGuest = A.tabs.list().some((t) => t.guest && t.guest.contentWindow === e.source);
      if (fromGuest && A.settings.engine !== d.__zaeraengine) {
        A.settings.engine = d.__zaeraengine;
        A.saveSettings();
        if (A.settingsUI) A.settingsUI.fill();
        A.addr.syncAddressUI();
        A.syncPreconnect();
        A.broadcastNewtab({ __zaeraengine: A.settings.engine });
      }
    }

    /* Веб-новая вкладка включила «Защитить всё» / переключила защиту. */
    if (d.__zaerasecurity === true || d.__zaerasetadblock === true) {
      const fromGuest2 = A.tabs.list().some((t) => t.guest && t.guest.contentWindow === e.source);
      if (fromGuest2) {
        if (d.__zaerasecurity === true) {
          A.settings.adBlock = true;
          A.settings.httpsOnly = true;
          A.settings.dnt = true;
          A.settings.tightReferrer = true;
          A.settings.block3p = true;
        }
        if (d.__zaerasetadblock === true) {
          A.settings.adBlock = true;
        }
        A.saveSettings();
        A.pushSettingsNow();
        if (A.applyAdBlock) A.applyAdBlock();
        if (A.settingsUI) A.settingsUI.fill();
        A.toast('Максимальная защита включена');
      }
    }
  });

  /* ---------- поиск по странице ---------- */
  A.findInTab = function (tab, text, opts) {
    if (!A.DESKTOP || !tab || !tab.guest) return false;
    const options = opts || {};
    try {
      tab.guest.findInPage(text, { forward: options.forward !== false, findNext: !!options.findNext });
      return true;
    } catch (e) { return false; }
  };

  A.stopFindInTab = function (tab) {
    if (!A.DESKTOP || !tab || !tab.guest) return;
    try { tab.guest.stopFindInPage('clearSelection'); } catch (e) { /* noop */ }
  };

})();
