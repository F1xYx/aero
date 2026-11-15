'use strict';

/* ============================================================================
   Aera 2.0 — вкладки: модель, отрисовка, перетаскивание, сессия,
   ДВУХУРОВНЕВАЯ ГИБЕРНАЦИЯ неактивных вкладок:
     • 2 минуты — «заморозка» (остановка отрисовки, вкладка тускнеет);
     • 10 минут — полная выгрузка из ОЗУ (webview уничтожается, сохраняются
       URL/Title/Favicon; при клике вкладка пересоздаётся).
   Активные и загружающиеся вкладки не усыпляются никогда.
   ============================================================================ */

(function () {
  const A = window.Aera;
  const el = A.el;

  const FREEZE_MS = 2 * 60 * 1000;
  const UNLOAD_MS = 10 * 60 * 1000;

  /* ---------- состояние ---------- */
  let tabs = [];
  let activeId = null;
  let tabSeq = 1;
  let saveTimer = null;
  let drag = null;
  const closedStack = [];
  const closingIds = new Set();
  const enterAnimIds = new Set();

  A.tabs = {
    list: () => tabs,
    get: (id) => tabs.find((t) => t.id === id) || null,
    active: () => tabs.find((t) => t.id === activeId) || null,
    activeId: () => activeId
  };

  function tabElById(id) { return el.strip.querySelector('.tab[data-id="' + id + '"]'); }

  /* ==================================================================
     ГИБЕРНАЦИЯ
     ================================================================== */
  function disarmHibernation(tab) {
    clearTimeout(tab.hbFreeze);
    clearTimeout(tab.hbUnload);
    tab.hbFreeze = null;
    tab.hbUnload = null;
  }

  function armHibernation(tab) {
    disarmHibernation(tab);
    if (!A.DESKTOP || A.settings.hibernate === false) return;
    tab.hbFreeze = setTimeout(() => freezeTab(tab), FREEZE_MS);
    tab.hbUnload = setTimeout(() => unloadTab(tab), UNLOAD_MS);
  }

  function guestWC(tab) {
    try { return tab.guest && tab.guest.getWebContents ? tab.guest.getWebContents() : null; }
    catch (e) { return null; }
  }

  function freezeTab(tab) {
    if (!tab || tab.id === activeId || !tab.guest || tab.unloaded) return;
    try {
      if (tab.guest.isLoading && tab.guest.isLoading()) {
        /* Догрузится — проверим позже. */
        clearTimeout(tab.hbFreeze);
        tab.hbFreeze = setTimeout(() => freezeTab(tab), 60000);
        return;
      }
    } catch (e) { /* noop */ }
    const wc = guestWC(tab);
    if (wc) {
      try { if (wc.stopPainting) wc.stopPainting(); } catch (e) { /* noop */ }
    }
    tab.frozen = true;
    renderTabs();
  }

  function wakeTab(tab) {
    if (!tab || !tab.frozen) return;
    const wc = guestWC(tab);
    if (wc) {
      try { if (wc.startPainting) wc.startPainting(); } catch (e) { /* noop */ }
    }
    tab.frozen = false;
    renderTabs();
  }

  function unloadTab(tab) {
    if (!A.DESKTOP || !tab || tab.id === activeId || !tab.guest) return;
    if (tab.pendingUrl) return;           // ещё не загружалась — выгружать нечего
    if (A.isNewtabUrl(tab.url)) return;   // начальная страница легковесна
    if (tab.loading) { armHibernation(tab); return; }

    const snapshot = {
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon
    };
    disarmHibernation(tab);
    tab.frozen = false;
    tab.unloaded = snapshot;
    try { tab.guest.stop(); } catch (e) { /* noop */ }
    try { if (tab.guest.parentNode) tab.guest.parentNode.removeChild(tab.guest); } catch (e) { /* noop */ }
    tab.guest = null;
    renderTabs();
  }

  A.tabs.hibernateNow = function () {
    tabs.forEach((t) => {
      if (t.id !== activeId) {
        freezeTab(t);
        if (!A.isNewtabUrl(t.url)) unloadTab(t);
      }
    });
  };

  /* ==================================================================
     СОЗДАНИЕ ВКЛАДОК
     ================================================================== */
  /**
   * opts: { background, defer, incognito, force }
   * defer — создать вкладку БЕЗ загрузки (восстановление сессии: грузится
   * только активная вкладка, остальные — при клике).
   */
  A.tabs.newTab = function (url, opts) {
    const options = opts || {};
    const startUrl = url || A.newtabUrl();
    const deferLoad = !!options.defer && !A.isNewtabUrl(startUrl);

    const holder = document.createElement('div');
    holder.className = 'tab-view';

    const tab = {
      id: 'tab-' + (tabSeq++),
      guest: null,
      url: startUrl,
      title: A.isNewtabUrl(startUrl) ? 'Новая вкладка' : A.titleFor(startUrl),
      favicon: null,
      loading: false,
      newtab: A.isNewtabUrl(startUrl),
      back: [],
      fwd: [],
      error: null,
      pendingUrl: deferLoad ? startUrl : null,
      loadedFor: null,
      navResolving: true,
      reportedFinal: null,
      navState: null,
      incognito: !!options.incognito && A.DESKTOP,
      frozen: false,
      unloaded: null,
      hbFreeze: null,
      hbUnload: null,
      loadWatch: null,
      holder
    };

    A.buildGuest(tab, startUrl, deferLoad);
    el.content.appendChild(holder);

    /* Порядок вставки: после активной вкладки или в конце. */
    const ai = tabs.findIndex((t2) => t2.id === activeId);
    if (A.settings.newtabAfterActive !== false && ai !== -1) {
      tabs.splice(ai + 1, 0, tab);
    } else {
      tabs.push(tab);
    }

    enterAnimIds.add(tab.id);
    armHibernation(tab);
    renderTabs();
    if (!options.background) activate(tab.id);
    A.updateDockCount();
    scheduleSaveSession();
    return tab;
  };

  /* ==================================================================
     АКТИВАЦИЯ / ЗАКРЫТИЕ
     ================================================================== */
  function activate(id) {
    const tab = A.tabs.get(id);
    if (!tab) return;
    activeId = id;

    /* Пробуждение усыпленной вкладки. */
    wakeTab(tab);

    /* Выгруженная вкладка: гостевой процесс был освобождён —
       пересобираем webview/iframe по снимку URL/Title/Favicon. */
    if (tab.unloaded) {
      const snap = tab.unloaded;
      tab.unloaded = null;
      tab.url = snap.url;
      tab.title = snap.title || A.titleFor(snap.url);
      tab.favicon = snap.favicon || null;
      tab.loading = !A.isNewtabUrl(snap.url);
      tab.loadedFor = null;
      tab.navResolving = true;
      tab.reportedFinal = null;
      A.buildGuest(tab, snap.url, false);
      armHibernation(tab);
      renderTabs();
    }

    /* Отложенная вкладка (восстановленная сессия) загружается при первом показе. */
    if (tab.pendingUrl) {
      const u = tab.pendingUrl;
      tab.pendingUrl = null;
      A.nav.navigateTab(tab, u, { push: false });
    }

    tabs.forEach((t) => t.holder.classList.toggle('active', t.id === id));
    armHibernation(tab);
    renderTabs();
    A.addr.syncAddressUI();
    A.addr.updateNavButtons();
    A.addr.updateProgress();
    A.updateDockCount();
    scheduleSaveSession();
  }
  A.tabs.activate = activate;

  function closeTab(id) {
    if (!id || closingIds.has(id)) return;
    const tabEl = tabElById(id);
    if (tabEl && A.settings.animations && !A.reduceMotion.matches) {
      closingIds.add(id);
      tabEl.classList.add('tab-closing');
      setTimeout(() => {
        closingIds.delete(id);
        reallyCloseTab(id);
      }, 180);
    } else {
      reallyCloseTab(id);
    }
  }
  A.tabs.closeTab = closeTab;

  function reallyCloseTab(id) {
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const tab = tabs[idx];

    /* Строгая очистка памяти: таймеры + гостевой процесс + DOM. */
    disarmHibernation(tab);
    clearTimeout(tab.loadWatch);
    if (!A.isNewtabUrl(tab.url) && !tab.incognito) {
      closedStack.push({ url: tab.url, title: tab.title });
      if (closedStack.length > 30) closedStack.shift();
    }
    tabs.splice(idx, 1);
    try {
      if (A.DESKTOP && tab.guest) tab.guest.stop();
      else if (!A.DESKTOP && tab.guest) tab.guest.src = 'about:blank';
    } catch (e) { /* noop */ }
    try { if (tab.guest && tab.guest.parentNode) tab.guest.parentNode.removeChild(tab.guest); } catch (e) { /* noop */ }
    tab.guest = null;
    try { tab.holder.remove(); } catch (e) { /* noop */ }

    if (tabs.length === 0) {
      if (A.DESKTOP) {
        try { window.zdesktop.closeWindow(); } catch (e) { /* noop */ }
        return;
      }
      A.tabs.newTab();
      return;
    }
    if (activeId === id) {
      const next = tabs[Math.min(idx, tabs.length - 1)];
      activate(next.id);
    } else {
      renderTabs();
      A.updateDockCount();
    }
    scheduleSaveSession();
  }

  A.tabs.reopenClosed = function () {
    const item = closedStack.pop();
    if (item) {
      A.tabs.newTab(item.url);
    } else {
      A.toast('Нет закрытых вкладок', 'warn');
    }
  };

  A.tabs.cycleTab = function (dir) {
    if (tabs.length < 2) return;
    const i = tabs.findIndex((t) => t.id === activeId);
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    activate(next.id);
  };

  A.tabs.switchToIndex = function (n) {
    const t = n === 9 ? tabs[tabs.length - 1] : tabs[n - 1];
    if (t) activate(t.id);
  };

  /* ==================================================================
     ОТРИСОВКА ВКЛАДОК
     Инкрементальная: элементы вкладок переиспользуются, DOM не
     пересобирается целиком (источник мерцания и «кривых» вкладок).
     Обновляются только изменившиеся части: классы, заголовок, иконка.
     ================================================================== */
  function updateTabWidths() {
    const count = tabs.length;
    if (!count) return;
    const avail = Math.max(300, el.strip.clientWidth);
    /* Safari Separate: вкладки делят полосу поровну, широкие при малом числе
       (мягкий потолок 520px), узкие — до одних фавиконов. */
    const w = A.clamp(Math.floor((avail - count * 4) / count), 64, 520);
    el.strip.style.setProperty('--tab-w', w + 'px');
    /* Перегрузка: при узких вкладках остаются только фавиконы (как в Safari). */
    el.titlebar.classList.toggle('crowded', w < 84);
  }

  const tabEls = new Map(); // id -> { root, fav, title, close, favKey, titleText, cls }

  function buildTabEl(tab) {
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.id = tab.id;
    tabEl.setAttribute('role', 'tab');
    tabEl.setAttribute('aria-selected', 'false');
    tabEl.tabIndex = -1;

    const fav = document.createElement('span');
    fav.className = 'fav';
    const title = document.createElement('span');
    title.className = 'tab-title';
    const close = document.createElement('button');
    close.className = 'tab-close';
    close.type = 'button';
    close.title = 'Закрыть вкладку';
    close.setAttribute('aria-label', 'Закрыть вкладку ' + (tab.title || ''));
    close.innerHTML = A.SVG.x;
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    tabEl.appendChild(fav);
    tabEl.appendChild(title);
    tabEl.appendChild(close);

    tabEl.addEventListener('auxclick', (e) => {
      if (e.button === 1) closeTab(tab.id);
    });

    return { root: tabEl, fav, title, close, favKey: null, titleText: null, cls: '' };
  }

  function favKeyOf(tab) {
    if (tab.loading) return '\u0001loading';
    if (tab.unloaded) return '\u0002unloaded';
    return tab.favicon || '';
  }

  function paintFav(tab, refs) {
    const key = favKeyOf(tab);
    if (key === refs.favKey) return;
    refs.favKey = key;
    refs.fav.textContent = '';
    refs.fav.className = 'fav';
    if (tab.loading) {
      refs.fav.classList.add('spinner');
    } else if (tab.unloaded) {
      refs.fav.innerHTML = A.SVG.moon;
      refs.fav.classList.add('unloaded');
    } else if (tab.favicon) {
      const img = document.createElement('img');
      img.src = tab.favicon;
      img.width = 16;
      img.height = 16;
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => {
        img.remove();
        refs.fav.textContent = '';
        refs.fav.appendChild(A.letterTile(tab.url || ''));
      };
      refs.fav.appendChild(img);
    } else {
      /* Нет события от страницы: начальная страница — логотип Aera,
         остальные домены — иконка из сервиса Google, при ошибке — плитка. */
      let guessed = '';
      if (A.isNewtabUrl(tab.url || '')) {
        guessed = 'assets/logo-256.png';
      } else {
        guessed = A.domainFaviconUrl(tab.url || '');
      }
      if (guessed) {
        const img = document.createElement('img');
        img.src = guessed;
        img.width = 16;
        img.height = 16;
        img.alt = '';
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => {
          img.remove();
          refs.fav.textContent = '';
          refs.fav.appendChild(A.letterTile(tab.url || ''));
        };
        refs.fav.appendChild(img);
      } else {
        refs.fav.appendChild(A.letterTile(tab.url || ''));
      }
    }
  }

  function paintTab(tab, refs) {
    let cls = 'tab' + (tab.id === activeId ? ' active' : '');
    if (tab.incognito) cls += ' incognito';
    if (tab.frozen || tab.unloaded) cls += ' hibernated';
    if (enterAnimIds.has(tab.id)) {
      cls += ' tab-enter';
      enterAnimIds.delete(tab.id);
    }
    if (cls !== refs.cls) {
      refs.cls = cls;
      refs.root.className = cls;
      refs.root.setAttribute('aria-selected', tab.id === activeId ? 'true' : 'false');
    }
    const titleText = (tab.unloaded ? tab.unloaded.title : tab.title) || 'Без названия';
    if (titleText !== refs.titleText) {
      refs.titleText = titleText;
      refs.title.textContent = titleText;
      refs.root.title = tab.unloaded
        ? titleText + ' — выгружена из памяти, откроется при клике'
        : titleText;
      if (tab.id === activeId) document.title = tab.newtab ? 'Aera' : (titleText === 'Без названия' ? 'Aera' : titleText + ' — Aera');
    }
    paintFav(tab, refs);
  }

  function renderTabs() {
    /* Во время перетаскивания или закрытия DOM вкладок не пересобираем. */
    if ((drag && drag.moved) || closingIds.size) {
      updateTabWidths();
      return;
    }
    updateTabWidths();

    /* Удаляем элементы закрытых вкладок. */
    for (const [id, refs] of tabEls) {
      if (!tabs.some((t) => t.id === id)) {
        refs.root.remove();
        tabEls.delete(id);
      }
    }

    /* Вставляем/переставляем и обновляем только изменённое. */
    let cursor = el.strip.firstChild;
    tabs.forEach((tab) => {
      let refs = tabEls.get(tab.id);
      if (!refs) {
        refs = buildTabEl(tab);
        tabEls.set(tab.id, refs);
      }
      /* Позиция: элемент должен стоять на своем месте в порядке tabs. */
      if (refs.root !== cursor) {
        el.strip.insertBefore(refs.root, cursor);
      }
      cursor = refs.root.nextSibling;
      paintTab(tab, refs);
    });
    /* dropLine всегда последним. */
    el.strip.appendChild(el.dropLine);

    if (drag && !drag.moved) {
      const tabEl = tabElById(drag.id);
      if (tabEl) drag.el = tabEl;
    }
  }
  A.tabs.renderTabs = renderTabs;

  window.addEventListener('resize', () => {
    if (!(drag && drag.moved)) updateTabWidths();
  });

  /* ==================================================================
     ПЕРЕТАСКИВАНИЕ ВКЛАДОК (FLIP)
     ================================================================== */
  function dragMoveTo(newIndex) {
    if (!drag) return;
    const from = tabs.findIndex((t) => t.id === drag.id);
    if (from === -1 || newIndex === from || newIndex < 0 || newIndex >= tabs.length) return;

    const firstLeft = new Map();
    tabs.forEach((t) => {
      if (t.id === drag.id) return;
      const tabEl = tabElById(t.id);
      if (tabEl) firstLeft.set(t.id, tabEl.getBoundingClientRect().left);
    });

    const [moved] = tabs.splice(from, 1);
    tabs.splice(newIndex, 0, moved);

    tabs.forEach((t) => {
      const tabEl = tabElById(t.id);
      if (tabEl) el.strip.appendChild(tabEl);
    });
    el.strip.appendChild(el.dropLine);

    tabs.forEach((t) => {
      if (t.id === drag.id) return;
      const tabEl = tabElById(t.id);
      const fl = firstLeft.get(t.id);
      if (!tabEl || fl == null) return;
      const lastLeft = tabEl.getBoundingClientRect().left;
      const delta = fl - lastLeft;
      if (!delta) return;
      tabEl.style.transition = 'none';
      tabEl.style.transform = 'translateX(' + delta + 'px)';
      void tabEl.offsetWidth;
      tabEl.style.transition = '';
      tabEl.style.transform = '';
    });
  }

  function updateDropLine() {
    if (!drag || !drag.moved) return;
    const tabEl = tabElById(drag.id);
    if (!tabEl) return;
    const cur = tabs.findIndex((t) => t.id === drag.id);
    const toRight = cur > drag.origIndex;
    const sr = el.strip.getBoundingClientRect();
    const r = tabEl.getBoundingClientRect();
    el.dropLine.style.left = ((toRight ? r.right : r.left) - sr.left - 1) + 'px';
    el.dropLine.style.display = 'block';
  }

  function endDrag(commit) {
    if (!drag) return;
    const d = drag;
    drag = null;
    el.dropLine.style.display = 'none';
    const tabEl = tabElById(d.id);
    if (!tabEl) return;
    if (!d.moved) return;

    if (commit === false) {
      const orig = d.origIndex != null ? d.origIndex : tabs.findIndex((t) => t.id === d.id);
      const cur = tabs.findIndex((t) => t.id === d.id);
      if (orig !== cur && orig >= 0) {
        const [t] = tabs.splice(cur, 1);
        tabs.splice(orig, 0, t);
      }
      tabs.forEach((t) => {
        const tEl = tabElById(t.id);
        if (tEl) el.strip.appendChild(tEl);
      });
      el.strip.appendChild(el.dropLine);
    }

    /* Safari 27.2: вкладка «приземляется» плавно — масштаб и подъём
       уходят той же пружиной, что и перемещение (ghost-класс снимаем
       после анимации, чтобы scale не щёлкал мгновенно). */
    tabEl.style.transition = 'transform 0.26s var(--zb-smooth), scale 0.26s var(--zb-smooth), box-shadow 0.26s var(--zb-smooth), background 0.26s var(--zb-smooth)';
    tabEl.style.transform = '';
    setTimeout(() => {
      tabEl.classList.remove('drag-ghost');
      try { tabEl.style.transition = ''; } catch (err) { /* noop */ }
    }, 280);
    scheduleSaveSession();
  }

  el.btnNewTab.addEventListener('click', () => {
    A.tabs.newTab();
    setTimeout(A.addr.focusAddress, 80);
  });

  el.strip.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const tabEl = e.target.closest('.tab');
    if (!tabEl || e.target.closest('.tab-close')) return;
    const id = tabEl.dataset.id;
    if (id !== activeId) activate(id);
    const liveEl = tabElById(id) || tabEl;
    drag = {
      id,
      el: liveEl,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      origIndex: tabs.findIndex((t) => t.id === id),
      curTx: 0
    };
  });

  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (e.buttons && !(e.buttons & 1)) { endDrag(true); return; }

    if (!drag.moved) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
      drag.moved = true;
      const r = drag.el.getBoundingClientRect();
      drag.grabOffset = e.clientX - r.left;
      drag.curTx = 0;
      drag.el.classList.add('drag-ghost');
      drag.el.style.transform = 'translateX(0px)';
    }

    const r = drag.el.getBoundingClientRect();
    const baseLeft = r.left - (drag.curTx || 0);
    const tx = e.clientX - drag.grabOffset - baseLeft;
    drag.curTx = tx;
    drag.el.style.transform = 'translateX(' + tx + 'px)';

    const cur = tabs.findIndex((t) => t.id === drag.id);
    const nextEl = tabElById(tabs[cur + 1] ? tabs[cur + 1].id : '');
    const prevEl = tabElById(tabs[cur - 1] ? tabs[cur - 1].id : '');
    if (nextEl) {
      const nr = nextEl.getBoundingClientRect();
      if (e.clientX > nr.left + nr.width / 2) { dragMoveTo(cur + 1); updateDropLine(); return; }
    }
    if (prevEl) {
      const pr = prevEl.getBoundingClientRect();
      if (e.clientX < pr.left + pr.width / 2) { dragMoveTo(cur - 1); updateDropLine(); return; }
    }
    updateDropLine();
  });

  window.addEventListener('pointerup', () => endDrag(true));
  window.addEventListener('pointercancel', () => endDrag(false));
  window.addEventListener('blur', () => endDrag(true));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drag && drag.moved) endDrag(false);
  });

  el.strip.addEventListener('wheel', (e) => {
    if (A.settings.wheelTabs === false) return;
    if (!e.deltaY) return;
    e.preventDefault();
    A.tabs.cycleTab(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  el.strip.addEventListener('dblclick', (e) => {
    if (e.target === el.strip) { A.tabs.newTab(); return; }
    const tabEl = e.target.closest('.tab');
    if (tabEl && A.settings.dblCloseTab) closeTab(tabEl.dataset.id);
  });

  el.titlebar.addEventListener('dblclick', (e) => {
    if (e.target.closest('.tab') || e.target.closest('button') || e.target.closest('#brand')) return;
    if (A.DESKTOP && window.zdesktop) {
      window.zdesktop.toggleMaximizeWindow();
    } else {
      A.tabs.newTab();
    }
  });

  if (el.brand) el.brand.addEventListener('dblclick', () => A.tabs.newTab());

  /* ---------- контекстное меню вкладки ---------- */
  el.strip.addEventListener('contextmenu', (e) => {
    const tabEl = e.target.closest('.tab');
    if (!tabEl) {
      e.preventDefault();
      A.showCtx(e.clientX, e.clientY, [
        { label: 'Новая вкладка', action: () => A.tabs.newTab() },
        { label: 'Новое окно инкогнито', action: () => A.newIncognitoTab() }
      ]);
      return;
    }
    e.preventDefault();
    const id = tabEl.dataset.id;
    const tab = A.tabs.get(id);
    if (!tab) return;
    const items = [
      { label: 'Обновить', action: () => A.nav.reloadTab(tab) },
      { sep: true },
      { label: 'Закрыть вкладку', action: () => closeTab(id) }
    ];
    if (tabs.length > 1) {
      items.push({
        label: 'Закрыть другие вкладки',
        action: () => {
          tabs.slice().forEach((t) => { if (t.id !== id) closeTab(t.id); });
        }
      });
    }
    A.showCtx(e.clientX, e.clientY, items);
  });

  /* ==================================================================
     СЕССИЯ (сохранение + восстановление с ленивыми вкладками)
     ================================================================== */
  function sessionUrl(u) {
    return A.isNewtabUrl(u) ? A.newtabUrl() : u;
  }

  function saveSession() {
    /* Инкогнито в сессию не попадает никогда. */
    const persistable = tabs.filter((t) => !t.incognito);
    A.LS.set('zsession', {
      tabs: persistable.map((t) => ({ url: sessionUrl(t.unloaded ? t.unloaded.url : t.url), title: (t.unloaded ? t.unloaded.title : t.title) })),
      active: persistable.findIndex((t) => t.id === activeId)
    });
  }
  A.tabs.saveSession = saveSession;

  function scheduleSaveSession() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveSession, 400);
  }
  A.tabs.scheduleSaveSession = scheduleSaveSession;

  window.addEventListener('beforeunload', saveSession);

  A.tabs.restoreSession = function () {
    if (A.settings.startup !== 'restore') return false;
    const sess = A.LS.get('zsession', null);
    if (!sess || !Array.isArray(sess.tabs) || !sess.tabs.length) return false;
    const urls = sess.tabs
      .map((t) => (t && t.url) ? t.url : A.newtabUrl())
      .filter((u) => typeof u === 'string')
      .slice(0, 20);
    if (!urls.length) return false;
    /* Отложенная загрузка: старт быстрый; webview получает ТОЛЬКО активная
       вкладка, остальные грузятся при первом клике. */
    urls.forEach((u) => A.tabs.newTab(u, { background: true, defer: true }));
    if (tabs.length) {
      const ai = A.clamp(Number(sess.active) || 0, 0, tabs.length - 1);
      activate(tabs[ai].id);
    }
    return true;
  };

})();
