/* Aero — app core: tabs, toolbar, omnibox, overview, IPC */
(function () {
  'use strict';

  var Store = window.AeroStore;
  var DESKTOP = !!(window.electronAPI && window.electronAPI.isDesktop);

  var state = { tabs: [], activeId: null, seq: 0, closed: [] };

  /* ── session persistence (restore on boot when "home on startup" is off) ── */
  var SKEY = 'aera.session.v1';
  var saveTimer = null;
  function saveSession() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        var activeIdx = -1;
        for (var i = 0; i < state.tabs.length; i++) if (state.tabs[i].id === state.activeId) { activeIdx = i; break; }
        localStorage.setItem(SKEY, JSON.stringify({
          urls: state.tabs.map(function (t) { return t.url; }),
          active: activeIdx
        }));
      } catch (_) {}
    }, 250);
  }

  /* ═══ helpers ═══ */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return url || ''; } }
  function isInternalUrl(u) { return /^(aero|aera):\/\//i.test(u || ''); }

  window.AeroUI = {
    version: '2.3.15',
    toast: toast,
    createTab: createTab,
    navigateActive: function (url) {
      var t = activeTab();
      if (t) tabNavigate(t, url);
    }
  };

  function toast(msg) {
    var root = $('toast-root');
    var t = el('div', 'toast', msg);
    root.appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
  }

  /* ═══ URL normalization (shared with omnibox + newtab ctx) ═══ */
  function normalizeInput(q) {
    q = (q || '').trim();
    if (!q) return null;
    if (/^https?:\/\//i.test(q) || /^(aero|aera):\/\//i.test(q)) return q;
    if (/^localhost(:\d+)?(\/.*)?$/i.test(q)) return 'http://' + q;
    if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(q) && !q.match(/\s/)) return 'https://' + q;
    var eng = Store.engines[Store.get().searchEngine] || Store.engines.google;
    return eng.template.replace('%s', encodeURIComponent(q));
  }

  /* ═══ tabs ═══ */
  function activeTab() {
    for (var i = 0; i < state.tabs.length; i++) if (state.tabs[i].id === state.activeId) return state.tabs[i];
    return null;
  }

  function createTab(url, opts) {
    opts = opts || {};
    state.seq++;
    var id = 't' + state.seq;
    var cfg = Store.get();
    if (!url) url = 'aero://newtab';

    var kind = 'web';
    if (isInternalUrl(url)) kind = url.indexOf('settings') !== -1 ? 'settings' : 'newtab';

    var tab = {
      id: id, url: url, kind: kind, title: kind === 'newtab' ? 'Новая вкладка' : kind === 'settings' ? 'Настройки' : hostOf(url),
      favicon: null, loading: false, hist: [url], hIdx: 0
    };

    /* tab button */
    var btn = el('button', 'tab tab-opening');
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-label', tab.title);
    var fav = el('span', 'favicon');
    setFaviconSpan(fav, tab);
    btn.appendChild(fav);
    tab.favEl = fav;
    btn.appendChild(el('span', 'tab-title', tab.title));
    tab.titleEl = btn.querySelector('.tab-title');
    var x = el('button', 'tab-close');
    x.type = 'button';
    x.setAttribute('aria-label', 'Закрыть вкладку');
    x.innerHTML = '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor"><path d="M2.5 2.5 L7.5 7.5 M7.5 2.5 L2.5 7.5" stroke-width="1.6" stroke-linecap="round"/></svg>';
    x.addEventListener('click', function (e) { e.stopPropagation(); closeTab(tab.id); });
    btn.appendChild(x);
    btn.addEventListener('click', function () { setActive(tab.id); });
    btn.addEventListener('auxclick', function (e) { if (e.button === 1) closeTab(tab.id); });
    btn.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      tabCtxMenu(e, tab);
    });
    tab.btnEl = btn;
    $('tabstrip').appendChild(btn);
    setTimeout(function () { btn.classList.remove('tab-opening'); }, 300);

    /* view */
    var view = el('div', 'view');
    view.setAttribute('role', 'tabpanel');
    tab.viewEl = view;

    if (kind === 'web') {
      if (DESKTOP) {
        var wv = document.createElement('webview');
        wv.setAttribute('src', url);
        wv.setAttribute('partition', 'persist:aera');
        wv.setAttribute('allowpopups', '');
        wv.addEventListener('dom-ready', function () {
          wv.addEventListener('context-menu', function (ev) {
            ev.preventDefault();
            webCtxMenu(ev, tab, wv);
          });
        });
        wv.addEventListener('page-title-updated', function (e) {
          tab.title = e.title || tab.title;
          tab.titleEl.textContent = tab.title;
          btn.setAttribute('aria-label', tab.title);
          if (Store.get().keepHistory) Store.history.add(tab.url, tab.title);
        });
        wv.addEventListener('page-favicon-updated', function (e) {
          if (e.favicons && e.favicons.length) {
            tab.favicon = e.favicons[e.favicons.length - 1];
            setFaviconSpan(tab.favEl, tab);
          }
        });
        wv.addEventListener('did-start-loading', function () { setLoading(tab, true); });
        wv.addEventListener('did-stop-loading', function () { setLoading(tab, false); });
        wv.addEventListener('did-navigate', function (e) {
          if (e.url && e.url !== 'about:blank') {
            if (tab._histNav === e.url) {
              tab._histNav = null;
            } else if (e.url !== tab.hist[tab.hIdx]) {
              tab.hist.splice(tab.hIdx + 1);
              tab.hist.push(e.url);
              tab.hIdx = tab.hist.length - 1;
            }
            tab.url = e.url;
            if (tab.id === state.activeId) { updateOmnibox(); }
          }
          updateNavButtons();
        });
        wv.addEventListener('did-navigate-in-page', function (e) {
          if (e.url && e.isMainFrame !== false && e.url !== tab.hist[tab.hIdx]) {
            tab.hist.splice(tab.hIdx + 1);
            tab.hist.push(e.url);
            tab.hIdx = tab.hist.length - 1;
          }
          if (e.url) tab.url = e.url;
        });
        wv.addEventListener('did-fail-load', function (e) {
          if (e.errorCode === -3) return;
          setLoading(tab, false);
          toast('Не удалось загрузить страницу (' + e.errorDescription + ')');
        });
        tab.wv = wv;
        view.appendChild(wv);
      } else {
        /* web demo mode: proxied iframe */
        var fr = document.createElement('iframe');
        fr.className = 'web-frame';
        fr.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin allow-popups');
        fr.setAttribute('src', '/api/proxy?url=' + encodeURIComponent(url));
        tab.fr = fr;
        view.appendChild(fr);
        tab.title = hostOf(url);
        tab.titleEl.textContent = tab.title;
      }
    } else {
      var page = el('div', 'page');
      tab.pageEl = page;
      view.appendChild(page);
    }

    $('views').appendChild(view);
    state.tabs.push(tab);
    saveSession();

    if (opts.activate !== false) setActive(id);

    if (kind !== 'web') {
      requestAnimationFrame(function () { renderInternal(tab); });
    }
    return tab;
  }

  function renderInternal(tab) {
    if (!tab.pageEl) return;
    var ctx = {
      navigate: function (u) { tabNavigate(tab, u); },
      onSettingsChanged: function () { Store.applyTheme(); applyCompact(); }
    };
    if (tab.kind === 'newtab') window.AeroNewTab.render(tab.pageEl, ctx);
    else if (tab.kind === 'settings') window.AeroSettings.render(tab.pageEl, ctx);
  }

  function setFaviconSpan(span, tab) {
    span.innerHTML = '';
    if (tab.loading) {
      var sp = el('span', 'spinner');
      span.appendChild(sp);
      span.style.background = 'transparent';
      return;
    }
    if (tab.favicon) {
      var img = document.createElement('img');
      img.src = tab.favicon; img.alt = '';
      img.onerror = function () { span.textContent = (tab.title || '#')[0].toUpperCase(); span.style.background = ''; };
      span.appendChild(img);
      span.style.background = 'transparent';
      return;
    }
    var letter = '#';
    var bg = 'var(--favicon-fallback, rgba(120,120,128,.24))';
    if (tab.kind === 'newtab') letter = '✦';
    else if (tab.kind === 'settings') letter = '⚙';
    else if (tab.title) letter = tab.title[0].toUpperCase();
    span.textContent = letter;
    span.style.background = bg;
  }

  function setLoading(tab, on) {
    tab.loading = on;
    setFaviconSpan(tab.favEl, tab);
    if (tab.id === state.activeId) $('btn-reload').classList.toggle('spinning', on);
    updateOverviewGrid();
  }

  function closeTab(id) {
    var idx = -1;
    for (var i = 0; i < state.tabs.length; i++) if (state.tabs[i].id === id) { idx = i; break; }
    if (idx === -1) return;
    var tab = state.tabs[idx];
    state.closed.push({ url: tab.url, kind: tab.kind });
    if (state.closed.length > 12) state.closed.shift();
    tab.btnEl.classList.add('tab-closing');
    setTimeout(function () {
      tab.btnEl.remove();
      tab.viewEl.remove();
      if (tab.wv) { try { tab.wv.stop(); tab.wv.remove(); } catch (_) {} }
      /* remove by identity: captured idx is stale when several tabs close at once */
      var at = state.tabs.indexOf(tab);
      if (at !== -1) state.tabs.splice(at, 1);
      saveSession();
      if (state.tabs.length === 0) {
        createTab('aero://newtab');
        return;
      }
      if (state.activeId === id) {
        var next = state.tabs[Math.min(at, state.tabs.length - 1)];
        setActive(next.id);
      }
    }, 170);
  }

  function setActive(id) {
    state.activeId = id;
    state.tabs.forEach(function (t) {
      var on = t.id === id;
      t.btnEl.classList.toggle('active', on);
      t.btnEl.setAttribute('aria-selected', on ? 'true' : 'false');
      t.viewEl.classList.toggle('active', on);
      if (on && t.kind !== 'web' && !t.pageEl.childNodes.length) renderInternal(t);
    });
    updateOmnibox();
    updateNavButtons();
    closeOverview();
    saveSession();
  }

  function tabNavigate(tab, url, opts) {
    opts = opts || {};
    if (!url) return;
    if (isInternalUrl(url)) {
      tab.kind = url.indexOf('settings') !== -1 ? 'settings' : 'newtab';
      tab.url = url;
      tab.title = tab.kind === 'settings' ? 'Настройки' : 'Новая вкладка';
      tab.favicon = null;
      tab.titleEl.textContent = tab.title;
      setFaviconSpan(tab.favEl, tab);
      if (!opts.traverse) {
        tab.hist.splice(tab.hIdx + 1);
        tab.hist.push(url);
        tab.hIdx = tab.hist.length - 1;
      }
      if (tab.wv) { try { tab.wv.remove(); } catch (_) {} tab.wv = null; }
      if (tab.fr) { tab.fr.remove(); tab.fr = null; }
      if (!tab.pageEl) {
        tab.pageEl = el('div', 'page');
        tab.viewEl.appendChild(tab.pageEl);
      }
      tab.viewEl.classList.add('active');
      renderInternal(tab);
      saveSession();
      if (tab.id === state.activeId) { updateOmnibox(); updateNavButtons(); }
      return;
    }
    tab.kind = 'web';
    tab.url = url;
    tab.pageEl = null;
    tab.title = hostOf(url);
    tab.favicon = null;
    tab.titleEl.textContent = tab.title;
    setFaviconSpan(tab.favEl, tab);
    if (!opts.traverse) {
      tab.hist.splice(tab.hIdx + 1);
      tab.hist.push(url);
      tab.hIdx = tab.hist.length - 1;
    } else {
      tab._histNav = url;
    }
    if (tab.wv) {
      if (typeof tab.wv.loadURL === 'function') { tab.wv.loadURL(url); }
      else { tab.wv.src = url; }
    } else if (tab.fr) {
      tab.fr.src = '/api/proxy?url=' + encodeURIComponent(url);
    } else {
      if (DESKTOP) {
        var wv = document.createElement('webview');
        wv.setAttribute('src', url);
        wv.setAttribute('partition', 'persist:aera');
        wv.setAttribute('allowpopups', '');
        wireWebview(wv, tab);
        tab.wv = wv;
        tab.viewEl.innerHTML = '';
        tab.viewEl.appendChild(wv);
      } else {
        var fr = document.createElement('iframe');
        fr.className = 'web-frame';
        fr.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin allow-popups');
        fr.setAttribute('src', '/api/proxy?url=' + encodeURIComponent(url));
        tab.fr = fr;
        tab.viewEl.innerHTML = '';
        tab.viewEl.appendChild(fr);
      }
    }
    saveSession();
    if (tab.id === state.activeId) { updateOmnibox(); updateNavButtons(); }
  }

  /* unified history: internal pages and web pages share one per-tab stack */
  function tabHistBack(t) {
    if (!t || t.hIdx <= 0) return;
    t.hIdx--;
    tabNavigate(t, t.hist[t.hIdx], { traverse: true });
  }
  function tabHistForward(t) {
    if (!t || t.hIdx >= t.hist.length - 1) return;
    t.hIdx++;
    tabNavigate(t, t.hist[t.hIdx], { traverse: true });
  }

  function wireWebview(wv, tab) {
    wv.addEventListener('page-title-updated', function (e) {
      tab.title = e.title || tab.title;
      tab.titleEl.textContent = tab.title;
      if (Store.get().keepHistory) Store.history.add(tab.url, tab.title);
    });
    wv.addEventListener('page-favicon-updated', function (e) {
      if (e.favicons && e.favicons.length) {
        tab.favicon = e.favicons[e.favicons.length - 1];
        setFaviconSpan(tab.favEl, tab);
      }
    });
    wv.addEventListener('did-start-loading', function () { setLoading(tab, true); });
    wv.addEventListener('did-stop-loading', function () { setLoading(tab, false); });
    wv.addEventListener('did-navigate', function (e) {
      if (e.url && e.url !== 'about:blank') {
        if (tab._histNav === e.url) {
          tab._histNav = null;
        } else if (e.url !== tab.hist[tab.hIdx]) {
          tab.hist.splice(tab.hIdx + 1);
          tab.hist.push(e.url);
          tab.hIdx = tab.hist.length - 1;
        }
        tab.url = e.url;
      }
      if (tab.id === state.activeId) updateOmnibox();
      updateNavButtons();
    });
    wv.addEventListener('did-navigate-in-page', function (e) {
      if (e.url && e.isMainFrame !== false && e.url !== tab.hist[tab.hIdx]) {
        tab.hist.splice(tab.hIdx + 1);
        tab.hist.push(e.url);
        tab.hIdx = tab.hist.length - 1;
      }
      if (e.url) tab.url = e.url;
      if (tab.id === state.activeId) { updateOmnibox(); updateNavButtons(); }
    });
    wv.addEventListener('did-fail-load', function (e) {
      if (e.errorCode === -3) return;
      setLoading(tab, false);
      toast('Не удалось загрузить страницу');
    });
  }

  /* ═══ omnibox ═══ */
  var omnibox = $('omnibox');
  var addressbar = $('addressbar');
  var suggest = $('suggest');

  function updateOmnibox() {
    var t = activeTab();
    if (!t) return;
    /* NOTE: state classes here must NOT collide with global CSS class names
       (e.g. ".newtab" is the new-tab PAGE layout: flex-column + flex:1).
       Omnibox state classes are prefixed "om-" on purpose. */
    if (t.kind === 'newtab') {
      addressbar.classList.add('om-newtab');
      addressbar.classList.remove('webpage');
      omnibox.value = '';
      omnibox.placeholder = 'Поиск или адрес сайта';
    } else if (t.kind === 'settings') {
      addressbar.classList.add('webpage');
      addressbar.classList.remove('om-newtab');
      omnibox.value = 'aero://settings';
      omnibox.placeholder = '';
    } else {
      addressbar.classList.add('webpage');
      addressbar.classList.remove('om-newtab');
      if (document.activeElement !== omnibox) omnibox.value = t.url || '';
      omnibox.placeholder = 'Поиск или адрес сайта';
    }
    addressbar.classList.toggle('has-text', !!omnibox.value);
  }

  omnibox.addEventListener('focus', function () {
    addressbar.classList.add('focused');
    if (activeTab() && activeTab().kind === 'web') { omnibox.select(); }
  });
  omnibox.addEventListener('blur', function () {
    addressbar.classList.remove('focused');
    setTimeout(function () { suggest.classList.remove('open'); }, 150);
    updateOmnibox();
  });
  omnibox.addEventListener('input', function () {
    addressbar.classList.toggle('has-text', !!omnibox.value);
    renderSuggest(omnibox.value);
  });
  omnibox.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var sel = suggest.querySelector('.suggest-item.sel');
      var url = (sel && sel.dataset && sel.dataset.url) ? sel.dataset.url : normalizeInput(omnibox.value);
      if (url) {
        var t = activeTab();
        if (t) tabNavigate(t, url);
        omnibox.blur();
        suggest.classList.remove('open');
      }
    } else if (e.key === 'Escape') {
      omnibox.blur();
      suggest.classList.remove('open');
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var items = suggest.querySelectorAll('.suggest-item[data-url]');
      if (!items.length) return;
      e.preventDefault();
      var cur = suggest.querySelector('.suggest-item.sel');
      var idx = cur ? Array.prototype.indexOf.call(items, cur) : -1;
      if (e.key === 'ArrowDown') idx = Math.min(idx + 1, items.length - 1);
      else idx = Math.max(idx - 1, 0);
      items.forEach(function (x) { x.classList.remove('sel'); });
      items[idx].classList.add('sel');
    }
  });

  /* clear ("×") button inside the address bar */
  $('ab-clear').addEventListener('mousedown', function (e) {
    e.preventDefault();
    omnibox.value = '';
    addressbar.classList.remove('has-text');
    renderSuggest('');
    omnibox.focus();
  });

  function renderSuggest(q) {
    suggest.innerHTML = '';
    q = q.trim();
    if (!q) { suggest.classList.remove('open'); return; }
    var cfg = Store.get();
    var items = [];
    if (cfg.suggestHistory) {
      Store.history.all().slice(0, 60).forEach(function (h) {
        if (h.url.indexOf(q) !== -1 || (h.title || '').toLowerCase().indexOf(q.toLowerCase()) !== -1) {
          items.push({ icon: 'clock', text: h.title || h.url, sub: hostOf(h.url), url: h.url, type: 'История' });
        }
      });
      cfg.quickLinks.forEach(function (l) {
        if (l.url.indexOf(q) !== -1 || l.title.toLowerCase().indexOf(q.toLowerCase()) !== -1) {
          items.push({ icon: 'link', text: l.title, sub: hostOf(l.url), url: l.url, type: 'Ссылка' });
        }
      });
    }
    items = items.slice(0, 6);
    items.forEach(function (it) {
      var row = el('div', 'suggest-item');
      row.setAttribute('role', 'option');
      row.dataset.url = it.url;
      var ic = el('span', 'si-icon');
      ic.innerHTML = it.icon === 'clock'
        ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><circle cx="8" cy="8" r="6" stroke-width="1.4"/><path d="M8 4.5 L8 8 L10.5 9.5" stroke-width="1.4" stroke-linecap="round"/></svg>'
        : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M6.5 9.5 L9.5 6.5 M5 7 L3.5 8.5 A2.5 2.5 0 0 0 7 12 L8.5 10.5 M11 9 L12.5 7.5 A2.5 2.5 0 0 0 9 4 L7.5 5.5" stroke-width="1.3"/></svg>';
      row.appendChild(ic);
      row.appendChild(el('span', 'si-text', it.text));
      row.appendChild(el('span', 'si-sub', it.sub));
      row.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var t = activeTab();
        if (t) tabNavigate(t, it.url);
        omnibox.blur();
        suggest.classList.remove('open');
      });
      suggest.appendChild(row);
    });
    if (items.length) suggest.appendChild(el('div', 'suggest-sep'));
    var eng = Store.engines[cfg.searchEngine] || Store.engines.google;
    var sr = el('div', 'suggest-item');
    sr.dataset.url = eng.template.replace('%s', encodeURIComponent(q));
    var sic = el('span', 'si-icon');
    sic.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><circle cx="7" cy="7" r="4.2" stroke-width="1.5"/><path d="M10.2 10.2 L13.5 13.5" stroke-width="1.5" stroke-linecap="round"/></svg>';
    sr.appendChild(sic);
    sr.appendChild(el('span', 'si-text', 'Искать «' + q + '» в ' + eng.name));
    sr.appendChild(el('span', 'si-type', 'Поиск'));
    sr.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var url = eng.template.replace('%s', encodeURIComponent(q));
      var t = activeTab();
      if (t) tabNavigate(t, url);
      omnibox.blur();
      suggest.classList.remove('open');
    });
    suggest.appendChild(sr);
    suggest.classList.add('open');
  }

  /* ═══ toolbar buttons ═══ */
  function updateNavButtons() {
    var t = activeTab();
    if (!t) {
      $('btn-back').disabled = true;
      $('btn-fwd').disabled = true;
      return;
    }
    /* unified per-tab history covers both internal pages and web pages */
    $('btn-back').disabled = t.hIdx <= 0;
    $('btn-fwd').disabled = t.hIdx >= t.hist.length - 1;
  }

  $('btn-back').addEventListener('click', function () {
    tabHistBack(activeTab());
  });
  $('btn-fwd').addEventListener('click', function () {
    tabHistForward(activeTab());
  });
  $('btn-reload').addEventListener('click', function () {
    var t = activeTab();
    if (!t) return;
    if (t.wv) { try { t.wv.reload(); } catch (_) {} }
    else if (t.kind === 'newtab' || t.kind === 'settings') renderInternal(t);
    else if (t.fr) t.fr.src = t.fr.src;
  });
  $('btn-newtab').addEventListener('click', function () { createTab('aero://newtab'); });
  $('btn-settings').addEventListener('click', openSettings);
  $('btn-overview').addEventListener('click', function () { toggleOverview(); });

  function openSettings() {
    for (var i = 0; i < state.tabs.length; i++) {
      if (state.tabs[i].kind === 'settings') { setActive(state.tabs[i].id); return; }
    }
    createTab('aero://settings');
  }

  /* ═══ overview ═══ */
  function toggleOverview() {
    var ov = $('overview');
    if (ov.classList.contains('hidden')) showOverview(); else closeOverview();
  }
  function showOverview() {
    var ov = $('overview');
    ov.classList.remove('hidden');
    ov.setAttribute('aria-hidden', 'false');
    updateOverviewGrid();
  }
  function closeOverview() {
    var ov = $('overview');
    if (!ov.classList.contains('hidden')) {
      ov.classList.add('hidden');
      ov.setAttribute('aria-hidden', 'true');
    }
  }
  function updateOverviewGrid() {
    var grid = $('overview-grid');
    if (!grid || $('overview').classList.contains('hidden')) return;
    grid.innerHTML = '';
    state.tabs.forEach(function (t, i) {
      var card = el('div', 'ov-card');
      card.style.animationDelay = (i * 0.03) + 's';
      var head = el('div', 'ov-head');
      var fav = el('div', 'ov-favicon');
      if (t.favicon) {
        var img = document.createElement('img');
        img.src = t.favicon; img.alt = '';
        fav.appendChild(img);
      } else {
        fav.textContent = (t.title || '#')[0].toUpperCase();
      }
      head.appendChild(fav);
      head.appendChild(el('div', 'ov-title', t.title || hostOf(t.url)));
      var x = el('button', 'ov-close');
      x.type = 'button';
      x.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" stroke-width="1.6" stroke-linecap="round"/></svg>';
      x.addEventListener('click', function (e) { e.stopPropagation(); closeTab(t.id); updateOverviewGrid(); });
      head.appendChild(x);
      card.appendChild(head);
      var prev = el('div', 'ov-preview', (t.title || '✦')[0].toUpperCase());
      card.appendChild(prev);
      card.appendChild(el('div', 'ov-url', t.kind === 'web' ? hostOf(t.url) : (t.kind === 'settings' ? 'Настройки' : 'Новая вкладка')));
      card.addEventListener('click', function () { setActive(t.id); });
      grid.appendChild(card);
    });
  }
  $('ov-close').addEventListener('click', closeOverview);
  $('overview').addEventListener('mousedown', function (e) { if (e.target === $('overview')) closeOverview(); });

  /* ═══ context menus ═══ */
  function showCtxMenu(x, y, items) {
    var m = $('ctxmenu');
    m.innerHTML = '';
    items.forEach(function (it) {
      if (it === '-') { m.appendChild(el('div', 'ctx-sep')); return; }
      var row = el('div', 'ctx-item' + (it.disabled ? ' disabled' : ''));
      row.setAttribute('role', 'menuitem');
      if (it.icon) {
        var s = el('span');
        s.innerHTML = it.icon;
        row.appendChild(s);
      }
      row.appendChild(el('span', null, it.label));
      if (it.kbd) row.appendChild(el('span', 'kbd', it.kbd));
      row.addEventListener('click', function () {
        hideCtxMenu();
        if (it.action) it.action();
      });
      m.appendChild(row);
    });
    m.classList.remove('hidden');
    var r = m.getBoundingClientRect();
    var px = Math.min(x, window.innerWidth - r.width - 8);
    var py = Math.min(y, window.innerHeight - r.height - 8);
    m.style.left = px + 'px';
    m.style.top = py + 'px';
  }
  function hideCtxMenu() { $('ctxmenu').classList.add('hidden'); }
  document.addEventListener('mousedown', function (e) {
    if (!$('ctxmenu').contains(e.target)) hideCtxMenu();
  });
  window.addEventListener('blur', hideCtxMenu);

  var IC = {
    plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M8 3v10M3 8h10" stroke-width="1.5" stroke-linecap="round"/></svg>',
    reload: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M13 8a5 5 0 1 1-1.46-3.54M13 2.5V5h-2.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><rect x="5.5" y="5.5" width="7" height="7" rx="1.5" stroke-width="1.3"/><path d="M10.5 3.5h-5a2 2 0 0 0-2 2v5" stroke-width="1.3"/></svg>',
    x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" stroke-width="1.5" stroke-linecap="round"/></svg>',
    dup: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><rect x="5" y="2.5" width="8.5" height="8.5" rx="2" stroke-width="1.3"/><path d="M11 11v.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h.5" stroke-width="1.3" stroke-linecap="round"/></svg>',
    ext: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M6.5 9.5 L13 3 M13 3 L13 7 M13 3 L9 3 M7 3.5 H3.5 A1.5 1.5 0 0 0 2 5 V12.5 A1.5 1.5 0 0 0 3.5 14 H11 A1.5 1.5 0 0 0 12.5 12.5 V9" stroke-width="1.3" stroke-linecap="round"/></svg>'
  };

  function tabCtxMenu(e, tab) {
    showCtxMenu(e.clientX, e.clientY, [
      { icon: IC.plus, label: 'Новая вкладка', kbd: 'Ctrl+T', action: function () { createTab('aero://newtab'); } },
      { icon: IC.dup, label: 'Дублировать', action: function () { createTab(tab.url); } },
      '-',
      { icon: IC.reload, label: 'Обновить', kbd: 'Ctrl+R', action: function () { setActive(tab.id); $('btn-reload').click(); } },
      '-',
      { icon: IC.x, label: 'Закрыть вкладку', kbd: 'Ctrl+W', action: function () { closeTab(tab.id); } },
      { label: 'Закрыть остальные', action: function () {
          state.tabs.slice().forEach(function (t) { if (t.id !== tab.id) closeTab(t.id); });
          setActive(tab.id);
        } }
    ]);
  }

  function webCtxMenu(e, tab, wv) {
    var items = [
      { label: 'Назад', disabled: tab.hIdx <= 0, action: function () { tabHistBack(tab); } },
      { label: 'Вперед', disabled: tab.hIdx >= tab.hist.length - 1, action: function () { tabHistForward(tab); } },
      { icon: IC.reload, label: 'Обновить', action: function () { wv.reload(); } },
      '-'
    ];
    if (e.srcURL) {
      items.push({ icon: IC.plus, label: 'Открыть ссылку в новой вкладке', action: function () { createTab(e.srcURL); } });
      if (DESKTOP && window.electronAPI.openExternal) {
        items.push({ icon: IC.ext, label: 'Открыть в системном браузере', action: function () { window.electronAPI.openExternal(e.srcURL); } });
      }
      items.push('-');
    }
    if (e.x && e.y && e.srcURL !== undefined && e.misspelledWord !== undefined) {
      /* full guest context menu: include copy actions from params */
      if (e.editFlags && (e.editFlags.canCopy || e.editFlags.canCut)) {
        items.push({ label: 'Копировать', kbd: 'Ctrl+C', action: function () { wv.copy(); } });
        if (e.editFlags.canCut) items.push({ label: 'Вырезать', kbd: 'Ctrl+X', action: function () { wv.cut(); } });
        if (e.editFlags.canPaste) items.push({ label: 'Вставить', kbd: 'Ctrl+V', action: function () { wv.paste(); } });
        items.push('-');
      }
    }
    items.push({ label: 'Обновить вкладку в браузере', action: function () { $('btn-reload').click(); } });
    showCtxMenu(e.clientX || e.x, e.clientY || e.y, items);
  }

  /* ═══ window controls ═══ */
  function wireWindowControls() {
    var min = $('wb-min'), max = $('wb-max'), close = $('wb-close');
    var tlc = $('tl-close'), tlm = $('tl-min'), tlx = $('tl-max');
    if (DESKTOP) {
      min.addEventListener('click', function () { window.electronAPI.minimize(); });
      max.addEventListener('click', function () { window.electronAPI.maximizeToggle(); });
      close.addEventListener('click', function () { window.electronAPI.close(); });
      tlc.addEventListener('click', function () { window.electronAPI.close(); });
      tlm.addEventListener('click', function () { window.electronAPI.minimize(); });
      tlx.addEventListener('click', function () { window.electronAPI.maximizeToggle(); });
      window.electronAPI.onWindowState(function (st) {
        $('app').classList.toggle('maximized', !!st.maximized);
      });
      window.electronAPI.windowState().then(function (st) {
        if (st) $('app').classList.toggle('maximized', !!st.maximized);
      }).catch(function () {});
    } else {
      [min, max, close, tlc, tlm, tlx].forEach(function (b) { b.style.display = 'none'; });
    }
  }

  /* ═══ keyboard ═══ */
  document.addEventListener('keydown', function (e) {
    var ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) {
      if (e.key === 'Escape') { closeOverview(); window.AeroModal.close(); }
      if (e.key === 'F5') { $('btn-reload').click(); }
      return;
    }
    var k = e.key.toLowerCase();
    if (e.shiftKey && k === 'o') { e.preventDefault(); toggleOverview(); return; }
    if (e.shiftKey && k === 't') {
      e.preventDefault();
      var last = state.closed.pop();
      if (last) createTab(last.url);
      else toast('Нет закрытых вкладок');
      return;
    }
    if (e.shiftKey && e.key === 'Tab') { e.preventDefault(); cycleTab(-1); return; }
    if (e.key === 'Tab') { e.preventDefault(); cycleTab(1); return; }
    if (k === 't') { e.preventDefault(); createTab('aero://newtab'); }
    else if (k === 'w') { e.preventDefault(); if (activeTab()) closeTab(activeTab().id); }
    else if (k === 'l') { e.preventDefault(); omnibox.focus(); }
    else if (k === 'r') { e.preventDefault(); $('btn-reload').click(); }
    else if (k === ',') { e.preventDefault(); openSettings(); }
    else if (k >= '1' && k <= '9') {
      e.preventDefault();
      var n = parseInt(k, 10) - 1;
      if (state.tabs[n]) setActive(state.tabs[n].id);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.altKey && !e.ctrlKey) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); $('btn-back').click(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); $('btn-fwd').click(); }
    }
  });

  function cycleTab(dir) {
    if (!state.tabs.length) return;
    var idx = 0;
    for (var i = 0; i < state.tabs.length; i++) if (state.tabs[i].id === state.activeId) { idx = i; break; }
    var next = (idx + dir + state.tabs.length) % state.tabs.length;
    setActive(state.tabs[next].id);
  }

  /* ═══ external links ═══ */
  if (DESKTOP && window.electronAPI.onOpenFromWebview) {
    window.electronAPI.onOpenFromWebview(function (url) {
      if (url) createTab(url);
    });
  }

  /* ═══ boot ═══ */
  function applyCompact() {
    document.documentElement.setAttribute('data-compact-tabs', Store.get().compactTabs ? 'on' : 'off');
  }

  function boot() {
    Store.applyTheme();
    applyCompact();
    wireWindowControls();

    if (DESKTOP && window.electronAPI.version) {
      window.electronAPI.version().then(function (v) {
        window.AeroUI.version = v || '2.3.15';
      }).catch(function () {});
    }

    /* "Открывать новую вкладку при запуске" (default on) — otherwise restore last session */
    var restored = false;
    if (Store.get().homeOnStartup === false) {
      try {
        var sess = JSON.parse(localStorage.getItem(SKEY) || 'null');
        if (sess && sess.urls && sess.urls.length) {
          var act = typeof sess.active === 'number' && sess.urls[sess.active] ? sess.active : 0;
          for (var i = 0; i < sess.urls.length; i++) {
            if (!sess.urls[i]) continue;
            createTab(sess.urls[i], { activate: i === act });
          }
          restored = true;
        }
      } catch (_) {}
    }
    if (!restored) createTab('aero://newtab');

    window.addEventListener('beforeunload', function () {
      saveSession();
      if (Store.get().clearOnExit && window.electronAPI && window.electronAPI.clearBrowsingData) {
        try { window.electronAPI.clearBrowsingData(); } catch (_) {}
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
