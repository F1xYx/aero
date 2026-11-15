'use strict';

/* ============================================================================
   Aera 2.3 — флагманские меню: главное меню (⋯), щит защиты, масштаб.
   Подключается после 11-shortcuts.js. Ничего не ломает: только новые
   обработчики + зеркалирование настроек на существующие чекбоксы шторки.
   ============================================================================ */

(function () {

  if (!window.Aera) return;
  const A = window.Aera;
  const $ = (id) => document.getElementById(id);

  /* ---------- служебное: открыть настройки на нужном разделе ----------
     Десктоп — в отдельном окне (BrowserWindow), веб — в шторке. */
  A.openSettingsSection = function (secId) {
    if (A.DESKTOP && window.zdesktop && window.zdesktop.openSettingsWindow) {
      window.zdesktop.openSettingsWindow(secId);
      return;
    }
    A.openSettings();
    const btn = document.querySelector('#setNav button[data-sec="' + secId + '"]');
    if (btn) setTimeout(() => btn.click(), 40);
  };

  /* ==================================================================
     ГЛАВНОЕ МЕНЮ (⋯)
     ================================================================== */
  const btnMenu = $('btnMenu');
  const mainMenu = $('mainMenu');
  const btnShield = $('btnShield');
  const shieldPop = $('shieldPop');

  function closeMenus(except) {
    if (mainMenu && except !== mainMenu) { mainMenu.classList.add('hidden'); btnMenu.setAttribute('aria-expanded', 'false'); btnMenu.classList.remove('on'); }
    if (shieldPop && except !== shieldPop) { shieldPop.classList.add('hidden'); btnShield.setAttribute('aria-expanded', 'false'); btnShield.classList.remove('on'); }
  }
  A.closeAeraMenus = () => closeMenus(null);

  if (btnMenu && mainMenu) {
    btnMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = mainMenu.classList.contains('hidden');
      closeMenus(null);
      if (willOpen) {
        syncZoomLabel();
        mainMenu.classList.remove('hidden');
        btnMenu.setAttribute('aria-expanded', 'true');
        btnMenu.classList.add('on');
      }
    });
    /* клик по любому пункту закрывает меню (сами действия навешены по id) */
    mainMenu.addEventListener('click', (e) => {
      if (e.target.closest('.menu-zoom')) return; /* масштаб: меню остаётся открытым */
      setTimeout(() => closeMenus(null), 0);
    });
  }

  /* клик мимо — закрыть оба */
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.menu-wrap') && !e.target.closest('.shield-wrap')) closeMenus(null);
  });

  /* Esc: сначала меню/поповер, потом штатная логика шторок */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const menuOpen = mainMenu && !mainMenu.classList.contains('hidden');
    const popOpen = shieldPop && !shieldPop.classList.contains('hidden');
    if (menuOpen || popOpen) {
      e.preventDefault();
      e.stopPropagation();
      closeMenus(null);
    }
  }, true);

  /* ---------- пункты меню ---------- */
  const on = (id, fn) => { const b = $(id); if (b) b.addEventListener('click', fn); };

  on('btnMenuNewTab', () => A.tabs.newTab());
  on('btnMenuRestore', () => { try { A.tabs.reopenClosed(); } catch (e) { /* noop */ } });
  on('btnMenuBookmarks', () => A.openSettingsSection('secAppearance'));
  on('btnExt', () => A.openSettingsSection('secExtensions'));
  on('btnMenuGitHub', () => A.tabs.newTab('https://github.com/F1xYx/aera'));

  on('btnMenuCopyUrl', () => {
    const t = A.tabs.active();
    const url = t && t.url;
    if (!url || /newtab\.html([?#]|$)/i.test(url)) { A.toast('Нечего копировать — открыта начальная страница', 'warn'); return; }
    try {
      navigator.clipboard.writeText(url).then(
        () => A.toast('Адрес скопирован'),
        () => A.toast('Не удалось скопировать адрес', 'warn')
      );
    } catch (e) { A.toast('Не удалось скопировать адрес', 'warn'); }
  });

  on('btnMenuPrint', () => {
    const t = A.tabs.active();
    try { if (t && t.guest && t.guest.print) t.guest.print(); else A.toast('Печать доступна в приложении для страниц сайтов', 'warn'); }
    catch (e) { A.toast('Печать недоступна', 'warn'); }
  });

  /* ---------- масштаб ---------- */
  function syncZoomLabel() {
    const lbl = $('menuZoomVal');
    if (lbl) lbl.textContent = Math.round((Number(A.settings.pageZoom) || 1) * 100) + '%';
  }
  function bumpZoom(delta) {
    const cur = Number(A.settings.pageZoom) || 1;
    const next = A.clamp(Math.round((cur + delta) * 10) / 10, 0.5, 2);
    if (next === cur) return;
    A.settings.pageZoom = next;
    A.saveSettings();
    A.applyPageZoom();
    syncZoomLabel();
  }
  on('menuZoomIn', () => bumpZoom(0.1));
  on('menuZoomOut', () => bumpZoom(-0.1));
  on('menuZoomVal', () => {
    A.settings.pageZoom = 1;
    A.saveSettings();
    A.applyPageZoom();
    syncZoomLabel();
  });

  /* ==================================================================
     ЩИТ ЗАЩИТЫ: поповер + зеркало настроек шторки
     ================================================================== */
  const SP = [
    { pop: 'spAdBlock',       drawer: 'setAdBlock',       key: 'adBlock' },
    { pop: 'spHttpsOnly',     drawer: 'setHttpsOnly',     key: 'httpsOnly' },
    { pop: 'spDnt',           drawer: 'setDnt',           key: 'dnt' },
    { pop: 'spTightReferrer', drawer: 'setTightReferrer', key: 'tightReferrer' },
    { pop: 'spBlock3p',       drawer: 'setBlock3p',       key: 'block3p' }
  ];

  function shieldAllOn() {
    return SP.every((s) => { const d = $(s.drawer); return d && d.checked; });
  }
  function syncShieldUi() {
    SP.forEach((s) => {
      const p = $(s.pop), d = $(s.drawer);
      if (p && d) p.checked = d.checked;
    });
    const all = shieldAllOn();
    const title = $('shieldTitle');
    if (title) title.textContent = all ? 'Защита включена' : 'Защита частично';
    if (btnShield) btnShield.classList.toggle('is-ok', all);
    const countEl = $('adblockBlocked');
    const n = countEl ? (parseInt(countEl.textContent.replace(/\s/g, ''), 10) || 0) : 0;
    const sess = $('spBlockedSession');
    if (sess) sess.textContent = String(n);
    const badge = $('shieldBadge');
    if (badge) {
      if (n > 0) { badge.textContent = n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); badge.classList.remove('hidden'); }
      else badge.classList.add('hidden');
    }
    const hostEl = $('shieldHost');
    if (hostEl) {
      const t = A.tabs.active();
      const u = t && t.url;
      hostEl.textContent = (u && !/newtab\.html([?#]|$)/i.test(u)) ? A.hostOf(u) : 'Страница Aera';
    }
  }

  if (btnShield && shieldPop) {
    btnShield.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = shieldPop.classList.contains('hidden');
      closeMenus(null);
      if (willOpen) {
        syncShieldUi();
        shieldPop.classList.remove('hidden');
        btnShield.setAttribute('aria-expanded', 'true');
        btnShield.classList.add('on');
      }
    });
    /* переключатели поповера зеркалят чекбоксы шторки — бизнес-логика одна */
    SP.forEach((s) => {
      const p = $(s.pop);
      if (!p) return;
      p.addEventListener('change', () => {
        const d = $(s.drawer);
        if (d) {
          d.checked = p.checked;
          d.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setTimeout(syncShieldUi, 60);
      });
    });
    const pa = $('spProtectAll');
    if (pa) pa.addEventListener('click', () => {
      const b = $('btnProtectAll');
      if (b) b.click();
      setTimeout(syncShieldUi, 120);
    });
    /* живой счётчик блокировок шторки → бейдж и статистика поповера */
    const countEl = $('adblockBlocked');
    if (countEl && window.MutationObserver) {
      new MutationObserver(() => {
        if (!shieldPop.classList.contains('hidden')) syncShieldUi();
        const n = parseInt(countEl.textContent.replace(/\s/g, ''), 10) || 0;
        const badge = $('shieldBadge');
        if (badge) {
          if (n > 0) { badge.textContent = n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); badge.classList.remove('hidden'); }
          else badge.classList.add('hidden');
        }
      }).observe(countEl, { childList: true, characterData: true, subtree: true });
    }
    document.addEventListener('tab-url-changed', syncShieldUi);
    window.addEventListener('focus', () => { if (!shieldPop.classList.contains('hidden')) syncShieldUi(); });
  }

})();
