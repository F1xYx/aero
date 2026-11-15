'use strict';

/* ============================================================================
   Aera 2.0 — базовые UI-компоненты: тосты, контекстное меню, шторки,
   обзор вкладок (Exposé), управление окном, док-пилюля.
   ============================================================================ */

(function () {
  const A = window.Aera;
  const el = A.el;

  /* ============================ тосты ============================ */
  A.toast = function (msg, kind) {
    const k = kind || 'ok';
    const t = A.toast;
    const box = el.toastsEl;
    const item = document.createElement('div');
    item.className = 'toast' + (k === 'warn' ? ' t-warn' : (k === 'download' ? ' t-dl' : ''));
    const icon = document.createElement('span');
    icon.className = 't-icon';
    icon.innerHTML = k === 'download' ? A.SVG.dl : (k === 'warn' ? A.SVG.alert : A.SVG.check);
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
    void t;
  };

  /* ============================ контекстное меню ============================ */
  A.hideCtx = function () {
    el.ctxMenu.classList.add('hidden');
    el.ctxMenu.textContent = '';
  };

  A.showCtx = function (x, y, items) {
    el.ctxMenu.textContent = '';
    items.forEach((it) => {
      if (it.sep) {
        const sep = document.createElement('div');
        sep.className = 'ctx-sep';
        el.ctxMenu.appendChild(sep);
        return;
      }
      const item = document.createElement('div');
      item.className = 'ctx-item' + (it.danger ? ' danger' : '');
      item.textContent = it.label;
      item.addEventListener('click', () => {
        A.hideCtx();
        try { it.action(); } catch (e) { /* noop */ }
      });
      el.ctxMenu.appendChild(item);
    });
    el.ctxMenu.classList.remove('hidden');
    const r = el.ctxMenu.getBoundingClientRect();
    el.ctxMenu.style.left = A.clamp(x, 4, window.innerWidth - r.width - 6) + 'px';
    el.ctxMenu.style.top = A.clamp(y, 4, window.innerHeight - r.height - 6) + 'px';
  };

  document.addEventListener('pointerdown', (e) => {
    if (!el.ctxMenu.classList.contains('hidden') && !el.ctxMenu.contains(e.target)) A.hideCtx();
  });

  /* ============================ шторки ============================ */
  let openDrawerName = null;

  A.openDrawer = function (which) {
    openDrawerName = which;
    el.settingsDrawer.classList.toggle('open', which === 'settings');
    el.historyDrawer.classList.toggle('open', which === 'history');
    if (el.downloadsDrawer) el.downloadsDrawer.classList.toggle('open', which === 'downloads');
    el.overlay.classList.add('visible');
    if (which === 'downloads' && A.downloads) A.downloads.render();
  };

  A.closeDrawers = function () {
    if (!openDrawerName) return;
    openDrawerName = null;
    el.settingsDrawer.classList.remove('open');
    el.historyDrawer.classList.remove('open');
    if (el.downloadsDrawer) el.downloadsDrawer.classList.remove('open');
    el.overlay.classList.remove('visible');
  };

  A.currentDrawer = () => openDrawerName;

  A.openSettings = function () {
    A.importNewtabSettings();
    if (A.settingsUI) A.settingsUI.fill();
    A.openDrawer('settings');
  };

  /** Открыть настройки и подсветить нужный раздел (навигация по чипам,
      кнопке «Пароли» в тулбаре, Ctrl+Shift+P и т.д.). */
  A.openSettingsSection = function (secId) {
    A.openSettings();
    setTimeout(() => {
      try {
        const sec = document.getElementById(secId);
        if (!sec) return;
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        sec.classList.remove('sec-flash');
        requestAnimationFrame(() => sec.classList.add('sec-flash'));
        setTimeout(() => sec.classList.remove('sec-flash'), 1800);
      } catch (e) { /* noop */ }
    }, 140);
  };

  /** Менеджер паролей: отдельная кнопка тулбара и Ctrl+Shift+P. */
  A.openPasswords = function () {
    if (!A.DESKTOP) {
      A.openSettingsSection('secAbout');
      A.toast('Менеджер паролей доступен в приложении Aera для Windows', 'warn');
      return;
    }
    A.openSettingsSection('secPasswords');
  };

  /** Настройки, изменённые в «Кастомизации» новой вкладки (localStorage),
      подхватываются хостом при открытии шторки настроек. */
  A.importNewtabSettings = function () {
    try {
      const fromNewtab = A.LS.get('zsettings', {}) || {};
      const keys = ['engine', 'theme', 'wallpaper', 'accent', 'animations',
        'adBlock', 'httpsOnly', 'dnt', 'tightReferrer', 'block3p', 'saveHistory'];
      let changed = false;
      keys.forEach((k) => {
        if (fromNewtab[k] !== undefined && A.settings[k] !== fromNewtab[k]) {
          A.settings[k] = fromNewtab[k];
          changed = true;
        }
      });
      if (changed) {
        A.saveSettings();
        A.applyAll();
        A.pushSettingsNow();
      }
    } catch (e) { /* noop */ }
  };

  A.openHistoryDrawer = function () {
    A.history.render(el.histSearch.value);
    A.openDrawer('history');
    if (A.WEB) A.history.fetchWeb(true).then(() => A.history.render(el.histSearch.value));
    setTimeout(() => { try { el.histSearch.focus(); } catch (e) { /* noop */ } }, 340);
  };

  el.overlay.addEventListener('click', A.closeDrawers);
  document.getElementById('settingsClose').addEventListener('click', A.closeDrawers);
  document.getElementById('histClose').addEventListener('click', A.closeDrawers);
  el.histSearch.addEventListener('input', () => A.history.render(el.histSearch.value));

  /* Кнопка очистки истории — с подтверждением. */
  let histClearArmed = null;
  el.histClear.addEventListener('click', () => {
    if (histClearArmed) {
      clearTimeout(histClearArmed);
      histClearArmed = null;
      el.histClear.classList.remove('armed');
      el.histClear.textContent = 'Очистить всю историю';
      A.history.clearAll();
      return;
    }
    el.histClear.classList.add('armed');
    el.histClear.textContent = 'Точно очистить?';
    histClearArmed = setTimeout(() => {
      histClearArmed = null;
      el.histClear.classList.remove('armed');
      el.histClear.textContent = 'Очистить всю историю';
    }, 4000);
  });

  /* ============================ обзор вкладок (Exposé) ============================ */
  function buildOverview() {
    const tabs = A.tabs.list();
    el.overviewGrid.textContent = '';
    tabs.forEach((tab, idx) => {
      const card = document.createElement('div');
      card.className = 'ov-card';
      card.style.animationDelay = Math.min(idx * 45, 350) + 'ms';

      const head = document.createElement('div');
      head.className = 'ov-head';
      head.appendChild(A.faviconEl(tab.favicon, tab.url || '', 14));
      const ttl = document.createElement('span');
      ttl.className = 'ov-title';
      ttl.textContent = tab.title || 'Новая вкладка';
      head.appendChild(ttl);
      const x = document.createElement('button');
      x.className = 'ov-close';
      x.type = 'button';
      x.title = 'Закрыть вкладку';
      x.setAttribute('aria-label', 'Закрыть вкладку ' + (tab.title || ''));
      x.innerHTML = A.SVG.x;
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        A.tabs.closeTab(tab.id);
        setTimeout(() => {
          if (!el.overviewEl.classList.contains('hidden')) buildOverview();
        }, 220);
      });
      head.appendChild(x);

      const body = document.createElement('button');
      body.type = 'button';
      body.className = 'ov-body';
      body.title = tab.title || '';
      body.appendChild(A.letterTile(tab.url || '', 'lt'));
      const host = document.createElement('span');
      host.className = 'ov-host';
      host.textContent = tab.newtab || !tab.url ? 'Начальная страница' : A.hostOf(tab.url);
      body.appendChild(host);
      body.addEventListener('click', () => {
        A.tabs.activate(tab.id);
        closeOverview();
      });

      card.appendChild(head);
      card.appendChild(body);
      el.overviewGrid.appendChild(card);
    });

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'ov-new';
    add.style.animationDelay = Math.min(tabs.length * 45, 350) + 'ms';
    const plus = document.createElement('span');
    plus.className = 'ov-plus';
    plus.textContent = '+';
    const lbl = document.createElement('span');
    lbl.textContent = 'Новая вкладка';
    add.appendChild(plus);
    add.appendChild(lbl);
    add.addEventListener('click', () => {
      closeOverview();
      A.tabs.newTab();
      setTimeout(A.addr.focusAddress, 80);
    });
    el.overviewGrid.appendChild(add);
  }

  function openOverview() {
    buildOverview();
    el.overviewEl.classList.remove('hidden');
  }

  function closeOverview() {
    el.overviewEl.classList.add('hidden');
  }

  A.openOverview = openOverview;
  A.closeOverview = closeOverview;

  el.btnOverviewEl.addEventListener('click', () => {
    if (el.overviewEl.classList.contains('hidden')) openOverview();
    else closeOverview();
  });

  el.overviewEl.addEventListener('click', (e) => {
    if (e.target === el.overviewEl) closeOverview();
  });

  /* ============================ кнопки панели инструментов ============================ */
  el.btnBack.addEventListener('click', () => A.nav.goBack());
  el.btnFwd.addEventListener('click', () => A.nav.goForward());
  el.btnReload.addEventListener('click', () => A.nav.reloadTab(A.tabs.active()));
  el.btnHome.addEventListener('click', () => A.nav.goHome());
  el.btnStar.addEventListener('click', () => A.bookmarks.toggle());
  el.btnHistory.addEventListener('click', () => A.openHistoryDrawer());
  el.btnSettings.addEventListener('click', () => {
    if (A.currentDrawer() === 'settings') A.closeDrawers();
    else A.openSettings();
  });
  el.btnPasswords.addEventListener('click', () => A.openPasswords());

  /* Чипы-навигация внутри шторки настроек. */
  const setNav = document.getElementById('setNav');
  if (setNav) {
    setNav.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-sec]');
      if (!btn) return;
      A.openSettingsSection(btn.dataset.sec);
    });
  }

  /* Сигналы начальной страницы (конструктор виджетов): новый документ того же
     origin обновил localStorage — применяем защиту и настройки мгновенно. */
  let lastNtSignalTs = 0;
  window.addEventListener('storage', (e) => {
    if (e.key !== 'znt_signal' || !e.newValue) return;
    let sig = null;
    try { sig = JSON.parse(e.newValue); } catch (err) { sig = null; }
    if (!sig || typeof sig !== 'object' || !sig.action) return;
    if (sig.ts && sig.ts <= lastNtSignalTs) return;
    lastNtSignalTs = sig.ts || Date.now();

    if (sig.action === 'protect-all') {
      A.settings.adBlock = true;
      A.settings.httpsOnly = true;
      A.settings.dnt = true;
      A.settings.tightReferrer = true;
      A.settings.block3p = true;
      A.saveSettings();
      A.pushSettingsNow();
      A.applyAdBlock();
      if (A.settingsUI) A.settingsUI.fill();
      A.toast('Максимальная защита включена — экран Aera');
    } else if (sig.action === 'set-adblock') {
      A.settings.adBlock = sig.on !== false;
      A.saveSettings();
      A.pushSettingsNow();
      A.applyAdBlock();
      if (A.settingsUI) A.settingsUI.fill();
      A.toast(A.settings.adBlock ? 'Блокировка рекламы включена' : 'Блокировка рекламы выключена');
    } else if (sig.action === 'settings-changed') {
      A.importNewtabSettings();
      if (A.settingsUI) A.settingsUI.fill();
    }
  });
  el.btnDownloads.addEventListener('click', () => {
    if (A.DESKTOP) {
      A.downloads.openDrawer();
    } else if (window.zdesktop) {
      try { window.zdesktop.openDownloadsFolder(); } catch (e) { /* noop */ }
    }
  });

  /* ============================ управление окном ============================ */
  function updateMaxIcon(max) {
    el.winMax.innerHTML = max ? A.SVG.restore : A.SVG.max;
    el.winMax.title = A.DESKTOP
      ? (max ? 'Свернуть в окно' : 'Развернуть')
      : (max ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим');
  }
  A.updateMaxIcon = updateMaxIcon;

  if (A.DESKTOP) {
    el.winClose.title = 'Закрыть окно';
    el.winClose.addEventListener('click', () => window.zdesktop.closeWindow());
    el.winMin.addEventListener('click', () => window.zdesktop.minimizeWindow());
    el.winMax.addEventListener('click', () => window.zdesktop.toggleMaximizeWindow());
    window.zdesktop.on('win-state', (st) => updateMaxIcon(!!(st && st.maximized)));
    window.zdesktop.isMaximized().then((m) => updateMaxIcon(!!m)).catch(() => { /* noop */ });
  } else {
    /* Веб: красная закрывает активную вкладку, жёлтая сворачивает окно-карточку,
       белая — полноэкранный режим документа. */
    let webMinimized = false;

    el.winClose.title = 'Закрыть вкладку';
    el.winClose.addEventListener('click', () => A.tabs.closeTab(A.tabs.activeId()));
    el.winMin.title = 'Свернуть окно';
    el.winMin.addEventListener('click', () => {
      if (webMinimized) return;
      webMinimized = true;
      el.windowCard.classList.add('minimized');
      A.updateDockCount();
      el.dockPill.classList.remove('hidden');
      el.dockPill.classList.remove('pop');
      requestAnimationFrame(() => el.dockPill.classList.add('pop'));
    });
    el.winMax.title = 'Полноэкранный режим';
    el.winMax.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { /* noop */ });
      } else {
        document.documentElement.requestFullscreen().catch(() => { /* noop */ });
      }
    });
    document.addEventListener('fullscreenchange', () => updateMaxIcon(!!document.fullscreenElement));
    updateMaxIcon(false);

    el.dockPill.addEventListener('click', () => {
      if (!webMinimized) return;
      webMinimized = false;
      el.windowCard.classList.remove('minimized');
      el.dockPill.classList.add('hidden');
      el.dockPill.classList.remove('pop');
    });
  }

  A.updateDockCount = function () {
    el.dockCount.textContent = A.tabPlural(A.tabs.list().length);
  };

})();
