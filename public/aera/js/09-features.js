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

})();
