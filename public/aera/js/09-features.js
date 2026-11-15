'use strict';

/* ============================================================================
   Aera 2.1 — функции браузера:
   менеджер загрузок с прогресс-барами, поиск по странице (Ctrl+F),
   режим инкогнито (Ctrl+Shift+N), МАГАЗИН РАСШИРЕНИЙ (Chrome Web Store),
   менеджер расширений, менеджер паролей, статистика блокировщика рекламы.
   ============================================================================ */

(function () {
  const A = window.Aera;
  const el = A.el;

  /* ==================================================================
     МЕНЕДЖЕР ЗАГРУЗОК
     ================================================================== */
  let downloadRows = [];   // список от главного процесса
  const rowEls = new Map(); // id -> корень строки

  function fmtBytes(n) {
    const v = Number(n) || 0;
    if (v >= 1024 * 1024 * 1024) return (v / 1024 / 1024 / 1024).toFixed(1) + ' ГБ';
    if (v >= 1024 * 1024) return (v / 1024 / 1024).toFixed(1) + ' МБ';
    if (v >= 1024) return Math.round(v / 1024) + ' КБ';
    return v + ' Б';
  }

  function stateLabel(rec) {
    if (rec.state === 'completed') return 'Завершено';
    if (rec.state === 'cancelled') return 'Отменено';
    if (rec.state === 'interrupted') return 'Прервано';
    return 'Загрузка…';
  }

  function renderDownloads() {
    if (!el.dlList) return;
    el.dlList.textContent = '';
    rowEls.clear();
    if (!downloadRows.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Загрузок пока нет';
      el.dlList.appendChild(empty);
      updateBadge();
      return;
    }
    downloadRows.forEach((rec) => {
      const row = document.createElement('div');
      row.className = 'dl-row';

      const head = document.createElement('div');
      head.className = 'dl-row-head';

      const icon = document.createElement('span');
      icon.className = 'dl-icon';
      icon.innerHTML = rec.state === 'completed' ? A.SVG.file : A.SVG.dl;

      const main = document.createElement('div');
      main.className = 'dl-main';
      const name = document.createElement('div');
      name.className = 'dl-name';
      name.textContent = rec.filename || 'файл';
      const sub = document.createElement('div');
      sub.className = 'dl-sub';
      const pct = rec.size > 0 && rec.state === 'progressing'
        ? ' · ' + Math.min(100, Math.round((rec.received / rec.size) * 100)) + '%'
        : '';
      sub.textContent = stateLabel(rec) + pct + ' · ' + fmtBytes(rec.received) +
        (rec.size > 0 ? ' из ' + fmtBytes(rec.size) : '');
      main.appendChild(name);
      main.appendChild(sub);
      head.appendChild(icon);
      head.appendChild(main);

      const tools = document.createElement('div');
      tools.className = 'dl-tools';

      if (rec.state === 'progressing') {
        const cancel = document.createElement('button');
        cancel.className = 'icon-btn mini';
        cancel.title = 'Отменить загрузку';
        cancel.innerHTML = A.SVG.x;
        cancel.addEventListener('click', () => {
          try { window.zdesktop.downloadCancel(rec.id); } catch (e) { /* noop */ }
        });
        tools.appendChild(cancel);
      } else {
        if (rec.state === 'completed') {
          const open = document.createElement('button');
          open.className = 'icon-btn mini';
          open.title = 'Открыть файл';
          open.innerHTML = A.SVG.file;
          open.addEventListener('click', () => {
            try { window.zdesktop.downloadOpenFile(rec.id); } catch (e) { /* noop */ }
          });
          tools.appendChild(open);
        }
        const folder = document.createElement('button');
        folder.className = 'icon-btn mini';
        folder.title = 'Показать в папке';
        folder.innerHTML = A.SVG.folder;
        folder.addEventListener('click', () => {
          try { window.zdesktop.downloadShowInFolder(rec.id); } catch (e) { /* noop */ }
        });
        tools.appendChild(folder);
      }
      head.appendChild(tools);
      row.appendChild(head);

      const bar = document.createElement('div');
      bar.className = 'dl-bar' + (rec.state === 'progressing' && !rec.size ? ' indet' : '');
      const fill = document.createElement('div');
      fill.className = 'dl-fill';
      const width = rec.size > 0 ? Math.min(100, (rec.received / rec.size) * 100) : 0;
      fill.style.width = (rec.state === 'completed' ? 100 : width) + '%';
      if (rec.state === 'cancelled' || rec.state === 'interrupted') fill.classList.add('bad');
      bar.appendChild(fill);
      row.appendChild(bar);

      el.dlList.appendChild(row);
      rowEls.set(rec.id, row);
    });
    updateBadge();
  }

  function updateBadge() {
    const active = downloadRows.filter((r) => r.state === 'progressing').length;
    el.btnDownloads.classList.toggle('has-badge', active > 0);
    el.btnDownloads.dataset.badge = active > 0 ? String(active) : '';
    el.btnDownloads.title = active > 0
      ? 'Загрузки (' + active + ')'
      : 'Загрузки (Ctrl+J)';
  }

  A.downloads = {
    render: renderDownloads,
    setList(list) {
      downloadRows = Array.isArray(list) ? list.slice() : [];
      renderDownloads();
    },
    async openDrawer() {
      A.openDrawer('downloads');
      if (A.DESKTOP) {
        try { A.downloads.setList(await window.zdesktop.downloadsList()); } catch (e) { /* noop */ }
      }
    }
  };

  if (el.downloadsDrawer) {
    document.getElementById('dlClose').addEventListener('click', A.closeDrawers);
    const folderBtn = document.getElementById('dlOpenFolder');
    if (folderBtn) {
      folderBtn.addEventListener('click', async () => {
        if (A.DESKTOP) {
          try {
            const ok = await window.zdesktop.openDownloadsFolder();
            if (!ok) A.toast('Не удалось открыть папку', 'warn');
          } catch (e) { /* noop */ }
        }
      });
    }
    const clearBtn = document.getElementById('dlClearList');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (A.DESKTOP) {
          try {
            await window.zdesktop.downloadsClearFinished();
            A.downloads.setList(await window.zdesktop.downloadsList());
          } catch (e) { /* noop */ }
        }
      });
    }
  }

  /* ==================================================================
     ПОИСК ПО СТРАНИЦЕ (Ctrl+F)
     ================================================================== */
  let findOpen = false;
  let findQuery = '';
  let findOrdinal = 0;
  let findTotal = 0;

  A.find = {
    open() {
      if (!A.DESKTOP) {
        A.toast('Поиск по странице доступен только в приложении', 'warn');
        return;
      }
      const tab = A.tabs.active();
      if (!tab) return;
      findOpen = true;
      el.findbar.classList.remove('hidden');
      try { el.findInput.focus(); el.findInput.select(); } catch (e) { /* noop */ }
      if (el.findInput.value) A.find.search(el.findInput.value, { findNext: false });
    },
    close() {
      if (!findOpen) return;
      findOpen = false;
      el.findbar.classList.add('hidden');
      A.stopFindInTab(A.tabs.active());
      findTotal = 0;
      findOrdinal = 0;
      el.findCount.textContent = '';
    },
    isOpen() { return findOpen; },
    search(text, opts) {
      findQuery = String(text || '');
      if (!findQuery) {
        findTotal = 0;
        findOrdinal = 0;
        el.findCount.textContent = '';
        A.stopFindInTab(A.tabs.active());
        return;
      }
      const options = opts || {};
      A.findInTab(A.tabs.active(), findQuery, { forward: options.forward !== false, findNext: !!options.findNext });
    },
    next() { A.find.search(findQuery || el.findInput.value, { forward: true, findNext: true }); },
    prev() { A.find.search(findQuery || el.findInput.value, { forward: false, findNext: true }); },
    onFound(e) {
      const r = e && e.result;
      if (!r) return;
      if (r.finalUpdate) {
        findTotal = r.numberOfMatches || 0;
        findOrdinal = r.activeMatchOrdinal || 0;
        el.findCount.textContent = findTotal ? (findOrdinal + '/' + findTotal) : '0/0';
      }
    }
  };

  el.findClose.addEventListener('click', A.find.close);
  el.findNext.addEventListener('click', A.find.next);
  el.findPrev.addEventListener('click', A.find.prev);
  el.findInput.addEventListener('input', () => A.find.search(el.findInput.value, { findNext: false }));
  el.findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) A.find.prev();
      else A.find.next();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      A.find.close();
    }
  });

  /* ==================================================================
     РЕЖИМ ИНКОГНИТО
     ================================================================== */
  A.newIncognitoTab = function () {
    if (!A.DESKTOP) {
      A.toast('Инкогнито доступно только в приложении', 'warn');
      return;
    }
    A.tabs.newTab(A.newtabUrl(), { incognito: true });
    setTimeout(A.addr.focusAddress, 80);
    A.toast('Открыта вкладка инкогнито — история не сохраняется');
  };

  /* ==================================================================
     МЕНЕДЖЕР РАСШИРЕНИЙ (UI)
     ================================================================== */
  let extItems = [];

  /* Кнопки тулбара: поиск по странице и инкогнито. */
  const btnFind = document.getElementById('btnFind');
  if (btnFind) btnFind.addEventListener('click', () => A.find.open());
  const btnIncognito = document.getElementById('btnIncognito');
  if (btnIncognito) btnIncognito.addEventListener('click', () => A.newIncognitoTab());

  function renderExtensions() {
    const box = document.getElementById('extList');
    if (!box) return;
    box.textContent = '';
    if (!extItems.length) {
      const empty = document.createElement('div');
      empty.className = 'ext-empty muted';
      empty.textContent = 'Расширений пока нет. Загрузите папку с manifest.json.';
      box.appendChild(empty);
      return;
    }
    extItems.forEach((ext) => {
      const row = document.createElement('div');
      row.className = 'ext-row';

      const icon = document.createElement('span');
      icon.className = 'ext-icon';
      if (ext.icon) {
        const img = document.createElement('img');
        img.src = ext.icon;
        img.alt = '';
        img.width = 20;
        img.height = 20;
        img.onerror = () => {
          img.remove();
          icon.textContent = (ext.name || '?').slice(0, 1).toUpperCase();
        };
        icon.appendChild(img);
      } else {
        icon.textContent = (ext.name || '?').slice(0, 1).toUpperCase();
      }
      row.appendChild(icon);

      const main = document.createElement('div');
      main.className = 'ext-main';
      const name = document.createElement('div');
      name.className = 'ext-name';
      name.textContent = ext.name || 'Расширение';
      const ver = document.createElement('div');
      ver.className = 'ext-ver muted';
      ver.textContent = ext.version ? 'v' + ext.version : '';
      main.appendChild(name);
      main.appendChild(ver);
      row.appendChild(main);

      const sw = document.createElement('label');
      sw.className = 'switch';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = ext.enabled !== false;
      input.setAttribute('aria-label', 'Включить расширение ' + (ext.name || ''));
      input.addEventListener('change', async () => {
        try { await window.zdesktop.extensionToggle(ext.id); } catch (e) { /* noop */ }
      });
      const track = document.createElement('span');
      track.className = 'track';
      const knob = document.createElement('span');
      knob.className = 'knob';
      track.appendChild(knob);
      sw.appendChild(input);
      sw.appendChild(track);
      row.appendChild(sw);

      const del = document.createElement('button');
      del.className = 'icon-btn mini ext-del';
      del.title = 'Удалить расширение';
      del.innerHTML = A.SVG.x;
      del.addEventListener('click', async () => {
        try { await window.zdesktop.extensionRemove(ext.id); } catch (e) { /* noop */ }
      });
      row.appendChild(del);

      box.appendChild(row);
    });
  }

  A.extensionsUI = {
    async refresh() {
      if (!A.DESKTOP) return;
      try {
        const j = await window.zdesktop.extensionsList();
        extItems = (j && Array.isArray(j.items)) ? j.items : [];
      } catch (e) { extItems = []; }
      renderExtensions();
    },
    init() {
      const btn = document.getElementById('extLoadBtn');
      if (btn) {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            const res = await window.zdesktop.extensionLoad();
            if (res && res.canceled) { /* пользователь отменил */ }
            else if (res && res.ok) A.toast('Расширение «' + res.ext.name + '» загружено');
            else if (res && res.error) A.toast(res.error, 'warn');
          } catch (e) {
            A.toast('Не удалось загрузить расширение', 'warn');
          } finally {
            btn.disabled = false;
            A.extensionsUI.refresh();
          }
        });
      }
      if (A.DESKTOP) {
        window.zdesktop.on('extensions-changed', () => A.extensionsUI.refresh());
        A.extensionsUI.refresh();
        /* Каталог магазина грузим фоном — старт остаётся быстрым. */
        setTimeout(() => { try { loadStoreCatalog(); } catch (e) { /* noop */ } }, 600);
      }
    }
  };

  /* ==================================================================
     МАГАЗИН РАСШИРЕНИЙ (Chrome Web Store)
     ================================================================== */
  const storeGrid = document.getElementById('extStoreGrid');
  const storeStatus = document.getElementById('extStoreStatus');
  const storeSearchInput = document.getElementById('extStoreSearch');
  const storeIdInput = document.getElementById('extStoreId');
  const storeIdBtn = document.getElementById('extStoreInstallBtn');
  const installing = new Set();
  let storeSeq = 0;

  function esc(s) { return String(s == null ? '' : s); }

  function storeTileIcon(item) {
    const box = document.createElement('span');
    box.className = 'store-icon';
    if (item.icon) {
      const img = document.createElement('img');
      img.src = item.icon;
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => {
        img.remove();
        box.textContent = (item.name || '?').slice(0, 1).toUpperCase();
      };
      box.appendChild(img);
    } else {
      box.textContent = (item.name || '?').slice(0, 1).toUpperCase();
    }
    return box;
  }

  function renderStore(items, note) {
    if (!storeGrid) return;
    storeGrid.textContent = '';
    if (note) storeStatus.textContent = note;
    if (!items || !items.length) {
      const empty = document.createElement('div');
      empty.className = 'ext-empty muted';
      empty.textContent = 'Ничего не найдено. Попробуйте другой запрос или установите по ID.';
      storeGrid.appendChild(empty);
      return;
    }
    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'store-item';

      row.appendChild(storeTileIcon(item));

      const main = document.createElement('div');
      main.className = 'ext-main';
      const name = document.createElement('div');
      name.className = 'ext-name';
      name.textContent = esc(item.name || 'Расширение');
      const desc = document.createElement('div');
      desc.className = 'store-desc';
      desc.textContent = esc(item.desc || item.cat || '');
      main.appendChild(name);
      main.appendChild(desc);
      row.appendChild(main);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn primary store-install';
      btn.textContent = 'Установить';
      const already = extItems.some((x) => x.id === item.id);
      if (already) { btn.textContent = 'Установлено'; btn.disabled = true; }
      if (installing.has(item.id)) { btn.textContent = 'Установка…'; btn.disabled = true; }
      btn.addEventListener('click', async () => {
        if (!window.zdesktop || installing.has(item.id)) return;
        installing.add(item.id);
        btn.disabled = true;
        btn.textContent = 'Установка…';
        try {
          const res = await window.zdesktop.extensionStoreInstall(item.id);
          if (res && res.ok) A.toast('«' + (res.ext && res.ext.name || item.name) + '» установлено');
          else A.toast((res && res.error) || 'Ошибка установки', 'warn');
        } catch (e) {
          A.toast('Ошибка установки расширения', 'warn');
        } finally {
          installing.delete(item.id);
          A.extensionsUI.refresh();
          renderStore(lastStoreItems, storeStatus.textContent);
        }
      });
      row.appendChild(btn);
      storeGrid.appendChild(row);
    });
  }

  let lastStoreItems = [];

  async function loadStoreCatalog() {
    if (!A.DESKTOP || !storeGrid) return;
    try {
      const j = await window.zdesktop.extensionStoreCatalog();
      lastStoreItems = (j && Array.isArray(j.items)) ? j.items : [];
      renderStore(lastStoreItems, 'Каталог «Выбор Aera» · живой поиск по Chrome Web Store');
    } catch (e) {
      renderStore([], 'Каталог недоступен');
    }
  }

  const runStoreSearch = A.debounce(async (q) => {
    if (!A.DESKTOP || !storeGrid) return;
    const query = String(q || '').trim();
    const seq = ++storeSeq;
    if (!query) { loadStoreCatalog(); return; }
    storeStatus.textContent = 'Поиск «' + query + '» в Chrome Web Store…';
    try {
      const j = await window.zdesktop.extensionStoreSearch(query, 12);
      if (seq !== storeSeq) return;
      lastStoreItems = (j && Array.isArray(j.items)) ? j.items : [];
      renderStore(lastStoreItems,
        j && j.offline
          ? 'Нет связи с Chrome Web Store — показан встроенный каталог'
          : 'Результаты Chrome Web Store · установка в один клик');
    } catch (e) {
      if (seq === storeSeq) renderStore([], 'Поиск недоступен — проверьте подключение к интернету');
    }
  }, 450);

  if (storeSearchInput) {
    storeSearchInput.addEventListener('input', () => runStoreSearch(storeSearchInput.value));
    storeSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); runStoreSearch(storeSearchInput.value); }
    });
  }

  if (storeIdBtn) {
    storeIdBtn.addEventListener('click', async () => {
      const id = String(storeIdInput.value || '').trim();
      if (!/^[a-p]{32}$/i.test(id)) {
        A.toast('ID расширения — 32 строчные буквы a–p (см. адрес в Chrome Web Store)', 'warn');
        return;
      }
      if (installing.has(id)) return;
      installing.add(id);
      storeIdBtn.disabled = true;
      storeIdBtn.textContent = 'Установка…';
      try {
        const res = await window.zdesktop.extensionStoreInstall(id);
        if (res && res.ok) {
          A.toast('Расширение «' + ((res.ext && res.ext.name) || id) + '» установлено');
          storeIdInput.value = '';
        } else {
          A.toast((res && res.error) || 'Ошибка установки', 'warn');
        }
      } catch (e) {
        A.toast('Ошибка установки расширения', 'warn');
      } finally {
        installing.delete(id);
        storeIdBtn.disabled = false;
        storeIdBtn.textContent = 'Установить по ID';
        A.extensionsUI.refresh();
        renderStore(lastStoreItems, storeStatus.textContent);
      }
    });
  }

  A.openExtStore = function () {
    if (A.DESKTOP) A.openSettingsSection('secExtensions');
    else A.openSettings();
    loadStoreCatalog();
  };

  /* ==================================================================
     МЕНЕДЖЕР ПАРОЛЕЙ (UI)
     ================================================================== */
  const pwListBox = document.getElementById('pwList');
  const pwCountEl = document.getElementById('pwCount');
  let pwItemsCache = [];
  let pwFilterQuery = '';
  let pwEditingId = null;

  function applyPwFilter(items) {
    const q = pwFilterQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) =>
      String(p.site || '').toLowerCase().includes(q) ||
      String(p.username || '').toLowerCase().includes(q));
  }

  function renderPasswords(items) {
    if (!pwListBox) return;
    pwItemsCache = Array.isArray(items) ? items : [];
    const shown = applyPwFilter(pwItemsCache);
    pwListBox.textContent = '';
    if (pwCountEl) pwCountEl.textContent = pwItemsCache.length
      ? pwItemsCache.length + ' записей · шифрование Windows (DPAPI)'
      : 'Нет сохранённых паролей · шифрование Windows (DPAPI)';
    if (!pwItemsCache.length) {
      const empty = document.createElement('div');
      empty.className = 'ext-empty muted';
      empty.textContent = 'Пароли появятся здесь: сохраните вручную ниже или войдите на сайте — Aera предложит запомнить.';
      pwListBox.appendChild(empty);
      return;
    }
    if (!shown.length) {
      const empty = document.createElement('div');
      empty.className = 'ext-empty muted';
      empty.textContent = 'Ничего не найдено по запросу «' + pwFilterQuery + '»';
      pwListBox.appendChild(empty);
      return;
    }
    shown.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'pw-row';

      const main = document.createElement('div');
      main.className = 'ext-main';
      const site = document.createElement('div');
      site.className = 'ext-name';
      site.textContent = p.site || '—';
      const user = document.createElement('div');
      user.className = 'store-desc';
      user.textContent = p.username || '(без логина)';
      main.appendChild(site);
      main.appendChild(user);
      row.appendChild(main);

      const show = document.createElement('button');
      show.type = 'button';
      show.className = 'icon-btn mini';
      show.title = 'Показать пароль';
      show.textContent = '•••';
      show.addEventListener('click', async () => {
        try {
          const r = await window.zdesktop.pwReveal(p.id);
          if (r && r.ok) {
            show.textContent = r.password;
            setTimeout(() => { show.textContent = '•••'; }, 6000);
          } else {
            A.toast((r && r.error) || 'Не удалось расшифровать', 'warn');
          }
        } catch (e) { /* noop */ }
      });
      row.appendChild(show);

      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'icon-btn mini';
      copy.title = 'Копировать пароль';
      copy.innerHTML = A.SVG.file;
      copy.addEventListener('click', async () => {
        try {
          const r = await window.zdesktop.pwReveal(p.id);
          if (r && r.ok) {
            await navigator.clipboard.writeText(r.password);
            A.toast('Пароль скопирован в буфер обмена');
          }
        } catch (e) { /* noop */ }
      });
      row.appendChild(copy);

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'icon-btn mini';
      edit.title = 'Изменить запись';
      edit.textContent = '✎';
      edit.addEventListener('click', async () => {
        try {
          const r = await window.zdesktop.pwReveal(p.id);
          if (r && r.ok) {
            pwEditingId = p.id;
            const siteI = document.getElementById('pwSite');
            const userI = document.getElementById('pwUser');
            const passI = document.getElementById('pwPass');
            if (siteI) siteI.value = p.site || '';
            if (userI) userI.value = p.username || '';
            if (passI) { passI.value = r.password || ''; passI.type = 'text'; }
            const addBtn = document.getElementById('pwAddBtn');
            if (addBtn) addBtn.textContent = 'Обновить';
            if (siteI) siteI.focus();
            A.toast('Правка записи ' + (p.site || ''));
          }
        } catch (e) { /* noop */ }
      });
      row.appendChild(edit);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'icon-btn mini ext-del';
      del.title = 'Удалить запись';
      del.innerHTML = A.SVG.x;
      del.addEventListener('click', async () => {
        try {
          await window.zdesktop.pwRemove(p.id);
          A.passwordsUI.refresh();
          A.toast('Запись удалена');
        } catch (e) { /* noop */ }
      });
      row.appendChild(del);

      pwListBox.appendChild(row);
    });
  }

  A.passwordsUI = {
    async refresh() {
      if (!A.DESKTOP || !pwListBox) return;
      try {
        const j = await window.zdesktop.pwList();
        renderPasswords((j && Array.isArray(j.items)) ? j.items : []);
      } catch (e) { /* noop */ }
    },
    init() {
      const addBtn = document.getElementById('pwAddBtn');
      const genBtn = document.getElementById('pwGenBtn');
      const siteI = document.getElementById('pwSite');
      const userI = document.getElementById('pwUser');
      const passI = document.getElementById('pwPass');
      const filterI = document.getElementById('pwFilter');
      if (filterI) {
        filterI.addEventListener('input', () => {
          pwFilterQuery = String(filterI.value || '');
          renderPasswords(pwItemsCache);
        });
      }
      if (genBtn) {
        genBtn.addEventListener('click', async () => {
          try {
            const r = await window.zdesktop.pwGenerate(16);
            if (r && r.ok) {
              passI.value = r.password;
              passI.type = 'text';
              A.toast('Пароль сгенерирован — не забудьте сохранить');
            }
          } catch (e) { /* noop */ }
        });
      }
      if (addBtn) {
        addBtn.addEventListener('click', async () => {
          const site = String(siteI.value || '').trim();
          const pass = String(passI.value || '');
          if (!site || !pass) {
            A.toast('Заполните сайт и пароль', 'warn');
            return;
          }
          try {
            if (pwEditingId) {
              const old = pwEditingId;
              const r = await window.zdesktop.pwAdd(site, String(userI.value || '').trim(), pass);
              if (r && r.ok) {
                await window.zdesktop.pwRemove(old);
                pwEditingId = null;
                addBtn.textContent = 'Сохранить';
                A.toast('Запись для ' + (r.site || site) + ' обновлена');
                siteI.value = ''; userI.value = ''; passI.value = ''; passI.type = 'password';
                A.passwordsUI.refresh();
              } else {
                A.toast((r && r.error) || 'Не удалось обновить', 'warn');
              }
              return;
            }
            const r = await window.zdesktop.pwAdd(site, String(userI.value || '').trim(), pass);
            if (r && r.ok) {
              A.toast('Пароль для ' + (r.site || site) + ' сохранён');
              siteI.value = ''; userI.value = ''; passI.value = ''; passI.type = 'password';
              A.passwordsUI.refresh();
            } else {
              A.toast((r && r.error) || 'Не удалось сохранить', 'warn');
            }
          } catch (e) { /* noop */ }
        });
      }
      A.passwordsUI.refresh();
    }
  };

  /* ==================================================================
     БЛОКИРОВЩИК РЕКЛАМЫ: живая статистика
     ================================================================== */
  let lastBlockedCount = -1;

  function applyAdblockStats(data) {
    const countEl = document.getElementById('adblockBlocked');
    const topEl = document.getElementById('adblockTop');
    if (!countEl && !topEl) return;
    const blocked = data && Number(data.blocked) || 0;
    if (countEl && blocked !== lastBlockedCount) {
      countEl.textContent = blocked >= 1000 ? (blocked / 1000).toFixed(1) + 'K' : String(blocked);
      lastBlockedCount = blocked;
      /* виджет «Защита» на начальной странице */
      A.broadcastNewtab({ __zaerablocked: blocked, __zaeraadblock: A.settings.adBlock !== false });
    }
    if (topEl) {
      const top = (data && Array.isArray(data.top) && data.top.length)
        ? 'Топ: ' + data.top.slice(0, 3).map((t) => t.host + ' (' + t.count + ')').join(', ')
        : 'Заблокированных запросов пока нет — откройте любой сайт';
      topEl.textContent = top;
    }
  }

  A.adblockStatsUI = {
    async refresh() {
      if (!A.DESKTOP) return;
      try { applyAdblockStats(await window.zdesktop.adblockStats()); } catch (e) { /* noop */ }
    },
    init() {
      if (A.DESKTOP) {
        window.zdesktop.on('adblock-stats', applyAdblockStats);
        A.adblockStatsUI.refresh();
      }
    }
  };

  /* ==================================================================
     АВТОЗАПОЛНЕНИЕ ПАРОЛЕЙ (получение команды от главного процесса)
     ================================================================== */
  A.autofillPassword = function (username, password) {
    const tab = A.tabs.active();
    if (!tab || !tab.guest || !A.DESKTOP) return;
    const script = '(function(){' +
      'function fire(el){el&&el.dispatchEvent(new Event("input",{bubbles:true}));el&&el.dispatchEvent(new Event("change",{bubbles:true}));}' +
      'var fields=Array.prototype.slice.call(document.querySelectorAll("input"))' +
      '.filter(function(i){var s=getComputedStyle(i);if(s.display==="none"||s.visibility==="hidden")return false;' +
      'var r=i.getBoundingClientRect();if(!r.width||!r.height)return false;return !i.disabled&&i.offsetParent!==null;});' +
      'var pass=fields.filter(function(i){return i.type==="password";})[0];' +
      'if(!pass)return "no-password-field";' +
      'pass.focus();pass.value=' + JSON.stringify(String(password == null ? '' : password)) + ';fire(pass);' +
      'var user=null,best=1e9,pi=fields.indexOf(pass);' +
      'for(var i=0;i<fields.length;i++){var f=fields[i];if(f===pass)continue;var t=(f.type||"").toLowerCase();' +
      'if(t!=="email"&&t!=="text"&&t!=="tel")continue;var n=((f.name||"")+" "+(f.id||"")).toLowerCase();' +
      'if(/(pass|pwd|captcha|search)/.test(n))continue;var d=Math.abs(i-pi);if(d<best){best=d;user=f;}}' +
      (username ? ('if(user){user.focus();user.value=' + JSON.stringify(String(username)) + ';fire(user);}') : '') +
      'return "ok";})();';
    try {
      tab.guest.executeJavaScript(script, false).then((r) => {
        if (r === 'no-password-field') A.toast('На странице нет активного поля пароля', 'warn');
      }).catch(() => { /* noop */ });
    } catch (e) { /* noop */ }
  };

  /* ==================================================================
     ЗАХВАТ ПАРОЛЕЙ С САЙТОВ (webview ipc-message от guest-preload)
     ================================================================== */
  A.handleGuestPasswordCapture = async function (tab, payload) {
    if (!A.DESKTOP || !payload || !payload.password) return;
    let site = '';
    try { site = new URL(tab.url || payload.url || '').hostname.replace(/^www\./, ''); } catch (e) { site = ''; }
    if (!site) return;
    try {
      const r = await window.zdesktop.pwAdd(site, String(payload.username || ''), String(payload.password));
      if (r && r.ok) {
        A.toast('Пароль для ' + site + ' сохранён — «' + (payload.username || 'без логина') + '»');
        A.passwordsUI.refresh();
      }
    } catch (e) { /* noop */ }
  };

})();
