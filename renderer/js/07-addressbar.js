'use strict';

/* ============================================================================
   Aera 2.0 — адресная строка: подсказки, иконки, синхронизация UI.
   ============================================================================ */

(function () {
  const A = window.Aera;
  const el = A.el;

  let currentSuggest = [];
  let suggestIndex = -1;

  /* ---------- синхронизация адреса и кнопок ---------- */
  A.addr = {
    focusAddress() {
      try { el.addr.focus(); el.addr.select(); } catch (e) { /* noop */ }
    },

    syncAddressUI() {
      const tab = A.tabs.active();
      if (!tab) return;
      if (document.activeElement !== el.addr) {
        el.addr.value = (tab.newtab || !tab.url) ? '' : tab.url;
      }
      el.addr.placeholder = 'Поиск в ' + A.engine().name + ' или введите адрес';

      /* Замок / планета / лупа в зависимости от протокола. */
      if (tab.newtab || !tab.url) {
        el.siteIcon.innerHTML = A.SVG.search;
      } else if (/^https:/i.test(tab.url)) {
        el.siteIcon.innerHTML = A.SVG.lock;
      } else if (/^http:/i.test(tab.url)) {
        el.siteIcon.innerHTML = A.SVG.unlock;
      } else {
        el.siteIcon.innerHTML = A.SVG.globe;
      }

      /* Бейдж инкогнито. */
      if (el.incogBadge) el.incogBadge.classList.toggle('hidden', !tab.incognito);

      document.title = tab.newtab ? 'Aera' : (tab.title ? tab.title + ' — Aera' : 'Aera');

      const bookmarks = A.bookmarks.get();
      const bm = bookmarks.find((b) => b.url === tab.url);
      el.btnStar.classList.toggle('starred', !!bm);
      el.btnStar.title = bm ? 'Убрать из закладок' : 'Добавить в закладки (Ctrl+D)';
      el.btnStar.disabled = tab.newtab || !/^https?:/i.test(tab.url || '');
    },

    updateNavButtons() {
      const tab = A.tabs.active();
      let canBack = false;
      let canFwd = false;
      if (tab) {
        if (A.DESKTOP) {
          try { canBack = tab.guest.canGoBack(); } catch (e) { /* noop */ }
          try { canFwd = tab.guest.canGoForward(); } catch (e) { /* noop */ }
        } else {
          canBack = tab.back.length > 0;
          canFwd = tab.fwd.length > 0;
        }
      }
      el.btnBack.disabled = !canBack;
      el.btnFwd.disabled = !canFwd;
      el.btnReload.classList.toggle('spinning', !!(tab && tab.loading));
    },

    updateProgress() {
      const t = A.tabs.active();
      el.progress.classList.toggle('on', !!(t && t.loading));
    }
  };

  /* ---------- подсказки ---------- */
  function suggestSources() {
    if (A.WEB) return { history: A.history.cache, bookmarks: A.bookmarks.get() };
    return { history: A.LS.get('zhistory', []), bookmarks: A.LS.get('zbookmarks', []) };
  }

  function refreshSuggestSources() {
    if (A.WEB) A.history.fetchWeb(false);
  }

  function showSuggest(q) {
    const query = String(q || '').trim();
    currentSuggest = [];
    suggestIndex = -1;
    if (!A.settings.suggest) { paintSuggest(true); return; }
    if (query) {
      const lower = query.toLowerCase();
      const src = suggestSources();
      const seen = new Set();
      if (!A.looksLikeUrl(query)) {
        currentSuggest.push({
          url: A.searchUrl(query),
          title: 'Искать «' + query + '» — ' + A.engine().name,
          kind: 'search'
        });
      }
      /* Сначала закладки, затем история. */
      for (const b of src.bookmarks) {
        if (currentSuggest.length >= 8) break;
        if (!b.url || seen.has(b.url)) continue;
        if ((b.url || '').toLowerCase().includes(lower) || (b.title || '').toLowerCase().includes(lower)) {
          seen.add(b.url);
          currentSuggest.push({ url: b.url, title: b.title || b.url, kind: 'bookmark' });
        }
      }
      for (const h of src.history) {
        if (currentSuggest.length >= 8) break;
        if (!h.url || A.isNewtabUrl(h.url) || seen.has(h.url)) continue;
        if ((h.url || '').toLowerCase().includes(lower) || (h.title || '').toLowerCase().includes(lower)) {
          seen.add(h.url);
          currentSuggest.push({ url: h.url, title: h.title || h.url, kind: 'history' });
        }
      }
    }
    paintSuggest(true);
  }

  function paintSuggest(rebuild) {
    if (!currentSuggest.length) { hideSuggest(); return; }
    if (rebuild) {
      el.suggestBox.textContent = '';
      currentSuggest.forEach((item, i) => {
        const row = document.createElement('div');
        row.className = 'suggest-item';
        row.dataset.i = String(i);
        row.setAttribute('role', 'option');

        const icon = document.createElement('span');
        icon.className = 's-icon';
        icon.innerHTML = item.kind === 'search' ? A.SVG.search : (item.kind === 'bookmark' ? A.SVG.star : A.SVG.clock);

        const text = document.createElement('span');
        text.className = 's-text';
        text.textContent = item.title;

        row.appendChild(icon);
        row.appendChild(text);
        if (item.kind !== 'search') {
          const u = document.createElement('span');
          u.className = 's-url';
          u.textContent = A.hostOf(item.url);
          row.appendChild(u);
        }
        row.addEventListener('mouseenter', () => { suggestIndex = i; paintSuggest(false); });
        row.addEventListener('mousedown', (e2) => {
          e2.preventDefault();
          A.nav.navigateActive(item.url);
        });
        el.suggestBox.appendChild(row);
      });
    }
    el.suggestBox.classList.add('open');
    el.suggestBox.querySelectorAll('.suggest-item').forEach((row, i) => {
      row.classList.toggle('hovered', i === suggestIndex);
    });
  }

  function hideSuggest() {
    el.suggestBox.classList.remove('open');
    suggestIndex = -1;
  }

  A.hideSuggest = hideSuggest;

  /* ---------- события адресной строки ---------- */
  el.addr.addEventListener('focus', () => {
    try { el.addr.select(); } catch (e) { /* noop */ }
    refreshSuggestSources();
  });

  el.addr.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      /* Защита от двойного Enter: дедупликация внутри navigateTab. */
      const sel = (suggestIndex >= 0 && currentSuggest[suggestIndex]) ? currentSuggest[suggestIndex] : null;
      const url = sel ? sel.url : A.toNavigable(el.addr.value);
      if (url) A.nav.navigateActive(url);
    } else if (e.key === 'Escape') {
      const tab = A.tabs.active();
      if (tab) el.addr.value = (tab.newtab || !tab.url) ? '' : tab.url;
      try { el.addr.blur(); } catch (err) { /* noop */ }
      hideSuggest();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (currentSuggest.length) {
        e.preventDefault();
        const n = currentSuggest.length;
        suggestIndex = e.key === 'ArrowDown' ? (suggestIndex + 1) % n : (suggestIndex - 1 + n) % n;
        paintSuggest(false);
      }
    }
  });

  el.addr.addEventListener('input', () => showSuggest(el.addr.value));
  el.addr.addEventListener('blur', () => { setTimeout(hideSuggest, 160); });

})();
