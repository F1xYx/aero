/* Aero — New Tab page: greeting + quick links (Safari-style favorites) */
(function () {
  'use strict';

  var Store = window.AeroStore;

  /* ═══════════ helpers ═══════════ */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(inner, extra) {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 16 16');
    s.setAttribute('fill', 'none');
    if (extra) { for (var k in extra) s.setAttribute(k, extra[k]); }
    s.innerHTML = inner;
    return s;
  }
  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return url || ''; } }
  function faviconUrl(url) {
    try {
      var h = new URL(url).hostname;
      return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(h) + '&sz=64';
    } catch (_) { return ''; }
  }

  /* шестерёнка (lucide «settings», масштаб 24→16) */
  var GEAR = '<g transform="scale(0.6667)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></g>';
  var X_IC = '<path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" stroke-width="1.6" stroke-linecap="round"/>';

  var WALLPAPERS = [
    { id: 'aurora',   name: 'Аврора' },
    { id: 'sunset',   name: 'Закат' },
    { id: 'forest',   name: 'Лес' },
    { id: 'ocean',    name: 'Океан' },
    { id: 'graphite', name: 'Графит' },
    { id: 'rose',     name: 'Роза' }
  ];

  /* ═══════════ modal helper ═══════════ */
  window.AeroModal = {
    open: function (title, build) {
      window.AeroModal.close();
      var root = document.getElementById('modal-root');
      var bd = el('div', 'modal-backdrop');
      var m = el('div', 'modal');
      var head = el('div', 'modal-head');
      var h = el('h2', null, title);
      var x = el('button', 'ws-btn');
      x.type = 'button';
      x.setAttribute('aria-label', 'Закрыть');
      x.appendChild(svg(X_IC));
      x.addEventListener('click', function () { window.AeroModal.close(); });
      head.appendChild(h); head.appendChild(x);
      var body = el('div', 'modal-body');
      if (build) build(body, function () { window.AeroModal.close(); });
      m.appendChild(head); m.appendChild(body);
      bd.appendChild(m);
      bd.addEventListener('mousedown', function (e) { if (e.target === bd) window.AeroModal.close(); });
      root.appendChild(bd);
      return body;
    },
    close: function () {
      var root = document.getElementById('modal-root');
      while (root && root.firstChild) root.removeChild(root.firstChild);
    }
  };

  /* ═══════════ New Tab render: greeting + quick links ═══════════ */
  window.AeroNewTab = {
    render: function (container, ctx) {
      ctx = ctx || {};
      var navigate = ctx.navigate || function (u) {};
      var cfg = Store.get();

      var isRefresh = !!container.querySelector(':scope > .newtab');
      container.innerHTML = '';
      /* при перерисовке (обои, правки ссылок) не переигрываем входы */
      var nt = el('div', 'newtab' + (isRefresh ? ' no-replay' : ''));

      /* wallpaper */
      var wp = el('div', 'wp');
      var w = cfg.wallpaper;
      if (w === 'custom' && cfg.wallpaperUrl) { wp.style.backgroundImage = 'url("' + cfg.wallpaperUrl.replace(/"/g, '%22') + '")'; wp.style.backgroundColor = '#1a1a20'; }
      else { wp.classList.add('wp-' + (WALLPAPERS.some(function (p) { return p.id === w; }) ? w : 'aurora')); }
      nt.appendChild(wp);
      var dim = el('div', 'wp-dim');
      dim.style.setProperty('--wp-dim', (cfg.wallpaperDim || 20) / 100);
      nt.appendChild(dim);

      var inner = el('div', 'newtab-inner');

      /* greeting */
      var h = new Date().getHours();
      var greet = h < 5 ? 'Доброй ночи' : h < 11 ? 'Доброе утро' : h < 17 ? 'Добрый день' : h < 23 ? 'Добрый вечер' : 'Доброй ночи';
      var g = el('div', 'greeting');
      g.appendChild(el('h1', null, greet));
      g.appendChild(el('p', null, new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })));
      inner.appendChild(g);

      /* quick links */
      var grid = el('div', 'ql-grid');
      inner.appendChild(grid);

      function renderTiles() {
        grid.innerHTML = '';
        var c = Store.get();
        c.quickLinks.forEach(function (l, i) {
          var tile = el('button', 'ql-tile');
          tile.type = 'button';
          tile.title = l.title + ' — ' + hostOf(l.url);
          tile.style.animationDelay = (0.04 + i * 0.04) + 's';

          var circle = el('span', 'ql-circle');
          var img = document.createElement('img');
          img.src = faviconUrl(l.url);
          img.alt = '';
          img.referrerPolicy = 'no-referrer';
          img.onerror = function () {
            img.remove();
            circle.textContent = (l.title || '?')[0].toUpperCase();
          };
          circle.appendChild(img);
          tile.appendChild(circle);

          tile.appendChild(el('span', 'ql-label', l.title));

          var x = el('button', 'ql-x');
          x.type = 'button';
          x.setAttribute('aria-label', 'Удалить ' + l.title);
          x.title = 'Удалить';
          x.appendChild(svg(X_IC));
          x.addEventListener('click', function (e) {
            e.stopPropagation();
            var s = Store.get();
            s.quickLinks.splice(i, 1);
            Store.save();
            renderTiles();
          });
          tile.appendChild(x);

          tile.addEventListener('click', function () { navigate(l.url); });
          grid.appendChild(tile);
        });

        /* add tile */
        var add = el('button', 'ql-tile ql-add');
        add.type = 'button';
        add.title = 'Добавить ссылку';
        add.setAttribute('aria-label', 'Добавить ссылку');
        add.style.animationDelay = (0.04 + c.quickLinks.length * 0.04) + 's';
        var ac = el('span', 'ql-circle ql-circle-add', '+');
        add.appendChild(ac);
        add.appendChild(el('span', 'ql-label', 'Добавить'));
        add.addEventListener('click', openAddDialog);
        grid.appendChild(add);
      }
      renderTiles();

      /* tools row: single «Настроить» button */
      var tools = el('div', 'newtab-tools');
      var bCfg = el('button', 'nt-btn');
      bCfg.type = 'button';
      bCfg.appendChild(svg(GEAR));
      bCfg.appendChild(el('span', null, 'Настроить'));
      bCfg.addEventListener('click', function () { navigate('aero://settings?section=start'); });
      tools.appendChild(bCfg);
      inner.appendChild(tools);

      function openAddDialog() {
        window.AeroModal.open('Новая ссылка', function (body, close) {
          var tIn = el('input', 'inp'); tIn.placeholder = 'Название'; tIn.style.width = '100%';
          var uIn = el('input', 'inp'); uIn.placeholder = 'example.com'; uIn.style.width = '100%'; uIn.style.marginTop = '8px';
          var row = el('div', 'field-row'); row.style.display = 'block'; row.appendChild(tIn); row.appendChild(uIn);
          body.appendChild(row);
          var ok = el('button', 'nt-btn primary', 'Сохранить');
          ok.style.marginTop = '12px';
          ok.addEventListener('click', function () {
            var t = tIn.value.trim(), u = uIn.value.trim();
            if (!u) { uIn.focus(); return; }
            if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
            var s = Store.get();
            s.quickLinks.push({ title: t || hostOf(u), url: u });
            Store.save();
            close();
            renderTiles();
          });
          body.appendChild(ok);
          setTimeout(function () { try { uIn.focus(); } catch (_) {} }, 60);
        });
      }

      nt.appendChild(inner);
      container.appendChild(nt);
      nt.classList.add('view-entrance');
    }
  };

  /* ═══════════ Wallpaper picker (общий) ═══════════ */
  window.AeroWallpaperPicker = {
    render: function (root, opts) {
      opts = opts || {};
      var refresh = opts.refresh || function () {};
      var c = Store.get();

      var wpGrid = el('div', 'wp-grid');
      wpGrid.style.margin = '14px 16px 6px';
      WALLPAPERS.forEach(function (p) {
        var b = el('button', 'wp-swatch' + (c.wallpaper === p.id ? ' sel' : ''));
        b.type = 'button';
        var prev = el('div', 'wp-prev wp-' + p.id);
        b.appendChild(prev);
        b.appendChild(el('span', 'wp-name', p.name));
        b.addEventListener('click', function () {
          Store.update({ wallpaper: p.id });
          refresh();
        });
        wpGrid.appendChild(b);
      });
      /* custom wallpaper */
      var cb = el('button', 'wp-swatch' + (c.wallpaper === 'custom' ? ' sel' : ''));
      cb.type = 'button';
      var cp = el('div', 'wp-prev');
      cp.style.background = 'linear-gradient(140deg, #3a3a44, #232329)';
      if (c.wallpaper === 'custom' && c.wallpaperUrl) cp.style.backgroundImage = 'url("' + c.wallpaperUrl.replace(/"/g, '%22') + '")';
      cb.appendChild(cp);
      cb.appendChild(el('span', 'wp-name', 'Своя'));
      cb.addEventListener('click', function () {
        window.AeroModal.open('Свой фон', function (body, close) {
          var row = el('div', 'field-row');
          row.style.display = 'block';
          row.appendChild(Object.assign(el('div'), { innerHTML: '<div class="field-label">URL изображения</div><div class="field-sub">Прямая ссылка на картинку (jpg, png, webp)</div>' }));
          var uIn = el('input', 'inp');
          uIn.placeholder = 'https://…';
          uIn.value = c.wallpaperUrl || '';
          uIn.style.cssText = 'width:100%;margin-top:10px';
          row.appendChild(uIn);
          var actions = el('div', 'wp-modal-actions');
          var bClear = el('button', 'nt-btn', 'Сбросить');
          bClear.type = 'button';
          bClear.addEventListener('click', function () {
            Store.update({ wallpaper: 'aurora', wallpaperUrl: '' });
            close();
            refresh();
          });
          var bOk = el('button', 'nt-btn primary', 'Применить');
          bOk.type = 'button';
          bOk.addEventListener('click', function () {
            Store.update({ wallpaper: 'custom', wallpaperUrl: uIn.value.trim() });
            close();
            refresh();
          });
          actions.appendChild(bClear);
          actions.appendChild(bOk);
          body.appendChild(actions);
        });
      });
      wpGrid.appendChild(cb);
      root.appendChild(wpGrid);

      var dimRow = el('div', 'wp-dim-row');
      dimRow.appendChild(el('span', 'wp-dim-label', 'Затемнение фона'));
      var dimR = el('input');
      dimR.type = 'range'; dimR.min = '0'; dimR.max = '60'; dimR.value = String(c.wallpaperDim || 20);
      dimR.style.width = '150px';
      dimR.setAttribute('aria-label', 'Затемнение фона');
      dimR.addEventListener('change', function () { Store.update({ wallpaperDim: Number(dimR.value) }); refresh(); });
      dimRow.appendChild(dimR);
      root.appendChild(dimRow);
    }
  };

  /* ═══════════ Настройки стартовой страницы (раздел «Стартовая») ═══════════
     Простые сгруппированные строки: фон и быстрый доступ. */
  window.AeroWidgetsSettings = {
    render: function (root, opts) {
      opts = opts || {};
      var refresh = opts.refresh || function () {};
      var c = Store.get();

      function mkGroup(title) {
        var w = el('div');
        if (title) w.appendChild(el('div', 'sc-title', title));
        var b = el('div', 'sc-group');
        w.appendChild(b);
        root.appendChild(w);
        return b;
      }

      /* — Фон — */
      var gWp = mkGroup('Фон');
      window.AeroWallpaperPicker.render(gWp, { refresh: refresh });

      /* — Быстрый доступ — */
      var gQ = mkGroup('Быстрый доступ');
      c.quickLinks.forEach(function (l, i) {
        var r = el('div', 'sc-row');
        var fav = el('div', 'ws-icon');
        var img = document.createElement('img');
        img.src = faviconUrl(l.url);
        img.width = 20; img.height = 20; img.alt = '';
        img.onerror = function () { img.remove(); fav.textContent = '🔗'; };
        fav.appendChild(img);
        r.appendChild(fav);
        var main = el('div', 'sc-main');
        main.appendChild(el('div', 'sc-label', l.title));
        main.appendChild(el('div', 'sc-sub', hostOf(l.url)));
        r.appendChild(main);
        var acts = el('div', 'sc-actions');
        var bX = el('button', 'ws-btn');
        bX.type = 'button';
        bX.appendChild(svg(X_IC));
        bX.title = 'Удалить';
        bX.setAttribute('aria-label', 'Удалить ' + l.title);
        bX.addEventListener('click', function () {
          var s = Store.get(); s.quickLinks.splice(i, 1); Store.save(); refresh();
        });
        acts.appendChild(bX);
        r.appendChild(acts);
        gQ.appendChild(r);
      });

      var addRow = el('div', 'sc-row');
      var addInputs = el('div', 'sc-main');
      addInputs.style.display = 'flex';
      addInputs.style.gap = '8px';
      var tIn = el('input', 'inp'); tIn.placeholder = 'Название'; tIn.style.width = '150px';
      var uIn = el('input', 'inp'); uIn.placeholder = 'example.com'; uIn.style.flex = '1';
      addInputs.appendChild(tIn); addInputs.appendChild(uIn);
      addRow.appendChild(addInputs);
      var bAdd = el('button', 'nt-btn', 'Добавить');
      bAdd.type = 'button';
      bAdd.addEventListener('click', function () {
        var u = uIn.value.trim();
        if (!u) { uIn.focus(); return; }
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        var s = Store.get();
        s.quickLinks.push({ title: tIn.value.trim() || hostOf(u), url: u });
        Store.save();
        refresh();
      });
      addRow.appendChild(bAdd);
      gQ.appendChild(addRow);

      /* — Сброс — */
      var resetWrap = el('div', 'sc-reset');
      var bReset = el('button', 'btn-danger', 'Сбросить настройки стартовой');
      bReset.type = 'button';
      bReset.addEventListener('click', function () {
        if (confirm('Сбросить фон и быстрый доступ?')) {
          var s = Store.get();
          s.wallpaper = Store.defaults.wallpaper;
          s.wallpaperUrl = '';
          s.wallpaperDim = Store.defaults.wallpaperDim;
          s.quickLinks = JSON.parse(JSON.stringify(Store.defaults.quickLinks));
          Store.save();
          refresh();
        }
      });
      resetWrap.appendChild(bReset);
      root.appendChild(resetWrap);
    }
  };
})();
