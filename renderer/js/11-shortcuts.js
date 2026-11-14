'use strict';

/* ============================================================================
   Aera 2.0 — горячие клавиши и команды главного процесса.
   На десктопе ускорители обрабатывает меню Electron (рендерер не дублирует),
   в веб-режиме вся клавиатура — здесь.
   ============================================================================ */

(function () {
  const A = window.Aera;

  /** Буква физической клавиши — не зависит от раскладки (рус/eng). */
  function keyLetter(e) {
    const c = e.code || '';
    if (c.indexOf('Key') === 0 && c.length === 4) return c.slice(3).toLowerCase();
    return (e.key || '').toLowerCase();
  }

  A.cmdHandlers = {
    'new-tab': () => { A.tabs.newTab(); setTimeout(A.addr.focusAddress, 80); },
    'close-tab': () => A.tabs.closeTab(A.tabs.activeId()),
    'reopen-tab': () => A.tabs.reopenClosed(),
    'new-incognito': () => A.newIncognitoTab(),
    'home': () => A.nav.goHome(),
    'back': () => A.nav.goBack(),
    'forward': () => A.nav.goForward(),
    'reload': () => A.nav.reloadTab(A.tabs.active()),
    'find': () => A.find.open(),
    'bookmark': () => A.bookmarks.toggle(),
    'toggle-bookmarks': () => toggleBookmarksBar(),
    'open-settings': () => A.openSettings(),
    'open-history': () => A.openHistoryDrawer(),
    'open-downloads': () => A.downloads.openDrawer(),
    'open-ext-store': () => { if (A.openExtStore) A.openExtStore(); },
    'open-passwords': () => {
      if (A.openPasswords) A.openPasswords();
    },
    'toggle-adblock': () => {
      A.settings.adBlock = !A.settings.adBlock;
      A.saveSettings();
      A.applyAdBlock();
      const input = document.getElementById('setAdBlock');
      if (input) input.checked = A.settings.adBlock;
      A.toast(A.settings.adBlock ? 'Реклама и трекеры блокируются' : 'Блокировка рекламы выключена');
    },
    'next-tab': () => A.tabs.cycleTab(1),
    'prev-tab': () => A.tabs.cycleTab(-1)
  };

  function toggleBookmarksBar() {
    A.settings.showBookmarks = !A.settings.showBookmarks;
    A.saveSettings();
    A.bookmarks.render();
    const input = document.getElementById('setShowBookmarks');
    if (input) input.checked = A.settings.showBookmarks;
  }
  A.toggleBookmarksBar = toggleBookmarksBar;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!A.el.ctxMenu.classList.contains('hidden')) { A.hideCtx(); return; }
      if (A.el.suggestBox.classList.contains('open')) { A.hideSuggest(); return; }
      if (!A.el.overviewEl.classList.contains('hidden')) { A.closeOverview(); return; }
      if (A.find.isOpen()) { A.find.close(); return; }
      A.closeDrawers();
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    const lk = keyLetter(e);

    /* Ctrl+L — фокус в адресную строку. */
    if (mod && !e.altKey && !e.shiftKey && lk === 'l') {
      e.preventDefault();
      A.addr.focusAddress();
      return;
    }

    /* Ctrl+1..9 — переход по номеру. */
    if (mod && !e.altKey && !e.shiftKey) {
      let n = 0;
      if (/^Digit[1-9]$/.test(e.code || '')) n = Number(e.code.slice(5));
      else if (e.key >= '1' && e.key <= '9') n = Number(e.key);
      if (n) {
        e.preventDefault();
        A.tabs.switchToIndex(n);
        return;
      }
    }

    if (e.key === 'F5') { e.preventDefault(); A.nav.reloadTab(A.tabs.active()); return; }

    /* Остальные ускорители в десктопе обрабатывает меню Electron. */
    if (!A.WEB) return;

    if (e.altKey && !mod) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); A.nav.goBack(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); A.nav.goForward(); }
      else if (lk === 'home') { e.preventDefault(); A.nav.goHome(); }
      return;
    }
    if (!mod || e.altKey) return;

    if (e.key === 'Tab') { e.preventDefault(); A.tabs.cycleTab(e.shiftKey ? -1 : 1); return; }

    if (e.shiftKey) {
      if (lk === 't') { e.preventDefault(); A.tabs.reopenClosed(); }
      else if (lk === 'b') { e.preventDefault(); toggleBookmarksBar(); }
      else if (lk === 'n') { e.preventDefault(); A.newIncognitoTab(); }
      return;
    }

    if (lk === 't') { e.preventDefault(); A.tabs.newTab(); setTimeout(A.addr.focusAddress, 80); }
    else if (lk === 'w') { e.preventDefault(); A.tabs.closeTab(A.tabs.activeId()); }
    else if (lk === 'r') { e.preventDefault(); A.nav.reloadTab(A.tabs.active()); }
    else if (lk === 'f') { e.preventDefault(); A.toast('Поиск по странице доступен только в приложении', 'warn'); }
    else if (lk === 'd') { e.preventDefault(); A.bookmarks.toggle(); }
    else if (lk === 'y') { e.preventDefault(); A.openHistoryDrawer(); }
    else if (lk === 'j') { e.preventDefault(); A.toast('Загрузки доступны только в приложении', 'warn'); }
    else if (e.code === 'Comma' || e.key === ',') { e.preventDefault(); A.openSettings(); }
  });

  /* ---------- подписки на события главного процесса (десктоп) ---------- */
  if (A.DESKTOP) {
    window.zdesktop.on('cmd', (action) => {
      const h = A.cmdHandlers[action];
      if (h) { try { h(); } catch (e) { /* noop */ } }
    });

    window.zdesktop.on('open-url-in-new-tab', (data) => {
      if (data && data.url) {
        A.tabs.newTab(data.url, {
          background: !!data.background,
          incognito: !!data.incognito
        });
      }
    });

    window.zdesktop.on('download-toast', (data) => {
      if (data && data.msg) A.toast(data.msg, 'download');
    });

    window.zdesktop.on('download-update', (list) => {
      if (A.downloads) A.downloads.setList(list);
    });

    window.zdesktop.on('pw-autofill', (data) => {
      if (data && typeof data.password === 'string') {
        A.autofillPassword(data.username, data.password);
      }
    });

    window.zdesktop.on('extension-install-progress', (p) => {
      if (p && p.msg) A.toast(p.msg);
    });
  }

})();
