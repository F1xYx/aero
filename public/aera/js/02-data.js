'use strict';

/* ============================================================================
   Aera 2.0 — данные: закладки и история.
   Десктоп: localStorage. Веб: /api/bookmarks и /api/history + кэши.
   ============================================================================ */

(function () {
  const A = window.Aera;

  /* ============================ ЗАКЛАДКИ ============================ */
  let bookmarksCache = [];

  A.bookmarks = {
    get() {
      return A.WEB ? bookmarksCache.slice() : A.LS.get('zbookmarks', []);
    },
    async remove(url) {
      if (A.WEB) {
        bookmarksCache = bookmarksCache.filter((b) => b.url !== url);
        A.bookmarks.render();
        try {
          await fetch('/api/bookmarks?url=' + encodeURIComponent(url), { method: 'DELETE' });
        } catch (e) { /* noop */ }
      } else {
        const list = A.LS.get('zbookmarks', []).filter((b) => b.url !== url);
        A.LS.set('zbookmarks', list);
        A.bookmarks.render();
      }
      if (A.addr) A.addr.syncAddressUI();
    },
    toggle() {
      const tab = A.tabs.active();
      if (!tab || tab.newtab || !/^https?:/i.test(tab.url || '')) return;
      const list = A.WEB ? bookmarksCache.slice() : A.LS.get('zbookmarks', []);
      const i = list.findIndex((b) => b.url === tab.url);
      if (i >= 0) {
        if (A.WEB) {
          A.bookmarks.remove(tab.url);
        } else {
          list.splice(i, 1);
          A.LS.set('zbookmarks', list);
          A.bookmarks.render();
        }
        A.toast('Убрано из закладок');
      } else {
        const item = { url: tab.url, title: tab.title || tab.url, favicon: tab.favicon || undefined, ts: Date.now() };
        list.unshift(item);
        if (A.WEB) {
          bookmarksCache = list;
          A.bookmarks.render();
          fetch('/api/bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: item.url, title: item.title })
          }).catch(() => { /* noop */ });
        } else {
          A.LS.set('zbookmarks', list);
          A.bookmarks.render();
        }
        A.toast('Добавлено в закладки');
      }
      if (A.addr) A.addr.syncAddressUI();
    },
    async loadWeb() {
      if (!A.WEB) return;
      try {
        const r = await fetch('/api/bookmarks');
        const j = await r.json();
        const items = Array.isArray(j.items) ? j.items : [];
        bookmarksCache = items.map((it) => ({ url: it.url, title: it.title || it.url }));
      } catch (e) {
        bookmarksCache = [];
      }
      A.bookmarks.render();
    },
    render() {
      const bmbar = A.el.bmbar;
      bmbar.textContent = '';
      if (!A.settings.showBookmarks) {
        bmbar.classList.add('hidden-soft');
        return;
      }
      const list = A.bookmarks.get();
      bmbar.classList.toggle('hidden-soft', list.length === 0);
      if (!list.length) return;

      list.forEach((b) => {
        const chip = document.createElement('button');
        chip.className = 'bm-chip';
        chip.type = 'button';
        chip.title = b.title || b.url;

        chip.appendChild(A.faviconEl(b.favicon, b.url, 14));

        const label = document.createElement('span');
        label.className = 'bm-label';
        label.textContent = String(b.title || b.url).slice(0, 40);
        chip.appendChild(label);

        const del = document.createElement('span');
        del.className = 'bm-del';
        del.innerHTML = A.SVG.x;
        del.title = 'Удалить закладку';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          A.bookmarks.remove(b.url);
          A.toast('Закладка удалена');
        });
        chip.appendChild(del);

        chip.addEventListener('click', () => A.nav.navigateActive(b.url));
        chip.addEventListener('auxclick', (e) => {
          if (e.button === 1) A.tabs.newTab(b.url, { background: true });
        });
        chip.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          A.showCtx(e.clientX, e.clientY, [
            { label: 'Открыть в новой вкладке', action: () => A.tabs.newTab(b.url, { background: true }) },
            { sep: true },
            { label: 'Удалить закладку', danger: true, action: () => { A.bookmarks.remove(b.url); A.toast('Закладка удалена'); } }
          ]);
        });
        bmbar.appendChild(chip);
      });
    }
  };

  /* ============================ ИСТОРИЯ ============================ */
  let historyCache = [];
  let lastHistFetch = 0;
  let webHistPostTimer = null;
  let webHistPostPayload = null;

  A.history = {
    get cache() { return historyCache; },
    add(url, title) {
      if (!A.settings.saveHistory) return;
      if (!url || A.isNewtabUrl(url) || !/^https?:/i.test(url)) return;

      if (A.WEB) {
        const i = historyCache.findIndex((h) => h.url === url);
        if (i >= 0) {
          const [item] = historyCache.splice(i, 1);
          if (title) item.title = title;
          item.ts = Date.now();
          historyCache.unshift(item);
        } else {
          historyCache.unshift({ url, title: title || url, ts: Date.now() });
        }
        if (historyCache.length > 200) historyCache.length = 200;
        A.history.scheduleWebPost(url, title);
        return;
      }

      const list = A.LS.get('zhistory', []);
      const last = list[0];
      if (last && last.url === url) {
        last.ts = Date.now();
        if (title) last.title = title;
        A.LS.set('zhistory', list);
        return;
      }
      list.unshift({ url, title: title || url, ts: Date.now() });
      if (list.length > 3000) list.length = 3000;
      A.LS.set('zhistory', list);
    },

    scheduleWebPost(url, title) {
      webHistPostPayload = { url, title: title || url };
      clearTimeout(webHistPostTimer);
      webHistPostTimer = setTimeout(() => {
        const p = webHistPostPayload;
        webHistPostPayload = null;
        if (!p) return;
        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p)
        }).catch(() => { /* noop */ });
      }, 600);
    },

    async fetchWeb(force) {
      if (!A.WEB) return;
      const now = Date.now();
      if (!force && now - lastHistFetch < 30000) return;
      lastHistFetch = now;
      try {
        const r = await fetch('/api/history?limit=100');
        const j = await r.json();
        const items = Array.isArray(j.items) ? j.items : [];
        historyCache = items.map((it) => ({
          url: it.url,
          title: it.title || it.url,
          ts: Date.parse(it.visitedAt) || Date.now()
        }));
      } catch (e) { /* сервер может быть недоступен */ }
    },

    async deleteItem(url) {
      if (A.WEB) {
        historyCache = historyCache.filter((h) => h.url !== url);
        try {
          await fetch('/api/history?url=' + encodeURIComponent(url), { method: 'DELETE' });
        } catch (e) { /* noop */ }
      } else {
        const list = A.LS.get('zhistory', []).filter((h) => h.url !== url);
        A.LS.set('zhistory', list);
      }
      A.history.render(A.el.histSearch.value);
    },

    async clearAll() {
      if (A.WEB) {
        historyCache = [];
        try { await fetch('/api/history', { method: 'DELETE' }); } catch (e) { /* noop */ }
      } else {
        A.LS.set('zhistory', []);
      }
      A.history.render(A.el.histSearch.value);
      A.toast('История очищена');
    },

    render(filter) {
      const histList = A.el.histList;
      histList.textContent = '';
      const q = String(filter || '').trim().toLowerCase();
      const list = A.WEB ? historyCache : A.LS.get('zhistory', []);
      let shown = 0;
      for (const item of list) {
        if (shown >= 300) break;
        if (q && !((item.url || '').toLowerCase().includes(q) || (item.title || '').toLowerCase().includes(q))) continue;

        const row = document.createElement('div');
        row.className = 'hist-row';

        row.appendChild(A.faviconEl(item.favicon, item.url || '', 14));

        const main = document.createElement('div');
        main.className = 'hist-main';
        const t = document.createElement('div');
        t.className = 'hist-title';
        t.textContent = item.title || item.url;
        const sub = document.createElement('div');
        sub.className = 'hist-sub';
        const hostSpan = document.createElement('b');
        hostSpan.textContent = A.hostOf(item.url);
        sub.appendChild(hostSpan);
        const timeText = document.createElement('span');
        timeText.textContent = ' · ' + A.relativeTime(item.ts);
        sub.appendChild(timeText);
        main.appendChild(t);
        main.appendChild(sub);
        row.appendChild(main);

        const del = document.createElement('button');
        del.className = 'hist-del';
        del.title = 'Удалить запись';
        del.innerHTML = A.SVG.x;
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          A.history.deleteItem(item.url);
        });
        row.appendChild(del);

        row.addEventListener('click', (e) => {
          if (e.target === del || del.contains(e.target)) return;
          A.nav.navigateActive(item.url);
        });

        histList.appendChild(row);
        shown++;
      }
      if (!shown) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = q ? 'Ничего не найдено' : 'История пуста';
        histList.appendChild(empty);
      }
    }
  };

})();
