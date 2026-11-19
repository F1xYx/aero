/* Aero — New Tab page: flagship widgets + widget settings */
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
  function svg(path, extra) {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 16 16');
    s.setAttribute('fill', 'none');
    if (extra) { for (var k in extra) s.setAttribute(k, extra[k]); }
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', path);
    if (extra && extra.fill) p.setAttribute('fill', extra.fill);
    s.appendChild(p);
    return s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return url; } }

  var SIZE_CLASS = { S: 'wS', M: 'wM', L: 'wL' };
  var SIZE_LABEL = { S: 'Мал.', M: 'Сред.', L: 'Больш.' };
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
      x.appendChild(svg('M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5', { 'stroke-width': 1.6 }));
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

  /* ═══════════ widget builders ═══════════ */

  function buildClock(w, cfg) {
    w.classList.add('widget-clock');
    var s = cfg.clock;
    var digital = s.format === '24h';
    var now = new Date();
    var hh = now.getHours(), mm = now.getMinutes(), ss = now.getSeconds();
    var h12 = hh % 12 || 12;
    var timeStr = digital ? pad(hh) + ':' + pad(mm) : h12 + ':' + pad(mm);

    var clockWrap = el('div', 'clock-analog');
    if (s.analog) {
      var face = el('div', 'face');
      clockWrap.appendChild(face);
      for (var i = 0; i < 12; i++) {
        var tick = el('div', 'tick');
        tick.style.transform = 'translateX(-50%) rotate(' + (i * 30) + 'deg)';
        clockWrap.appendChild(tick);
      }
      var hSec = el('div', 'hand h-sec');
      var hMin = el('div', 'hand h-min');
      var hHour = el('div', 'hand h-hour');
      clockWrap.appendChild(hSec); clockWrap.appendChild(hMin); clockWrap.appendChild(hHour);
      var dot = el('div', 'center-dot');
      clockWrap.appendChild(dot);
      w.appendChild(clockWrap);
    }

    var right = el('div', 'clock-right');
    var dig = el('div', 'clock-digital');
    dig.innerHTML = esc(timeStr) + (s.seconds ? ' <span class="sec">:' + pad(ss) + '</span>' : '') + (!digital ? ' <span class="sec">' + (hh >= 12 ? 'PM' : 'AM') + '</span>' : '');
    right.appendChild(dig);

    var opts = { day: 'numeric', month: 'long', weekday: 'long' };
    right.appendChild(el('div', 'clock-date', now.toLocaleDateString('ru-RU', opts)));
    w.appendChild(right);

    var iv = setInterval(function () {
      if (!w.isConnected) { clearInterval(iv); return; }
      var n = new Date();
      if (s.analog) {
        var sec = n.getSeconds(), min = n.getMinutes(), hr = n.getHours();
        hSec.style.transform = 'translateX(0) rotate(' + (sec * 6) + 'deg)';
        hMin.style.transform = 'translateX(0) rotate(' + (min * 6 + sec * 0.1) + 'deg)';
        hHour.style.transform = 'translateX(0) rotate(' + (hr % 12 * 30 + min * 0.5) + 'deg)';
      }
      var h24 = n.getHours();
      var t12 = h24 % 12 || 12;
      dig.innerHTML = esc(digital ? pad(h24) + ':' + pad(n.getMinutes()) : t12 + ':' + pad(n.getMinutes())) +
        (s.seconds ? ' <span class="sec">:' + pad(n.getSeconds()) + '</span>' : '') +
        (!digital ? ' <span class="sec">' + (h24 >= 12 ? 'PM' : 'AM') + '</span>' : '');
    }, 1000);
    tickInitial(clockWrap, s);
  }

  function tickInitial(clockWrap, s) {
    var n = new Date();
    var sec = n.getSeconds(), min = n.getMinutes(), hr = n.getHours();
    var q = function (c) { return clockWrap.querySelector(c); };
    if (q('.h-sec')) q('.h-sec').style.transform = 'rotate(' + (sec * 6) + 'deg)';
    if (q('.h-min')) q('.h-min').style.transform = 'rotate(' + (min * 6 + sec * 0.1) + 'deg)';
    if (q('.h-hour')) q('.h-hour').style.transform = 'rotate(' + (hr % 12 * 30 + min * 0.5) + 'deg)';
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var WMO = {
    0: ['Ясно', '☀️'], 1: ['Преим. ясно', '🌤️'], 2: ['Переменная облачность', '⛅'], 3: ['Облачно', '☁️'],
    45: ['Туман', '🌫️'], 48: ['Изморозь', '🌫️'],
    51: ['Морось', '🌦️'], 53: ['Морось', '🌦️'], 55: ['Морось', '🌦️'],
    61: ['Небольшой дождь', '🌦️'], 63: ['Дождь', '🌧️'], 65: ['Сильный дождь', '🌧️'],
    66: ['Ледяной дождь', '🌧️'], 67: ['Ледяной дождь', '🌧️'],
    71: ['Небольшой снег', '🌨️'], 73: ['Снег', '❄️'], 75: ['Сильный снег', '❄️'], 77: ['Снежные зёрна', '🌨️'],
    80: ['Ливни', '🌧️'], 81: ['Ливни', '🌧️'], 82: ['Сильные ливни', '⛈️'],
    85: ['Снегопад', '🌨️'], 86: ['Снегопад', '❄️'],
    95: ['Гроза', '⛈️'], 96: ['Гроза с градом', '⛈️'], 99: ['Гроза с градом', '⛈️']
  };

  function fetchWeather(cfg) {
    var cache = null;
    try { cache = JSON.parse(localStorage.getItem('aera.weather.cache') || 'null'); } catch (_) {}
    if (cache && cache.lat === cfg.weather.lat && cache.lon === cfg.weather.lon && Date.now() - cache.ts < 30 * 60 * 1000) {
      return Promise.resolve(cache.data);
    }
    var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + cfg.weather.lat + '&longitude=' + cfg.weather.lon +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto&wind_speed_unit=ms';
    /* 8-секундный таймаут: если API недоступен/медленный — не держим виджет
       в «Загрузка…» на полминуты (частая причина «всё долго грузится»). */
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var tid = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, 8000) : null;
    return fetch(u, ctrl ? { signal: ctrl.signal } : undefined).then(function (r) { return r.json(); }).then(function (d) {
      if (tid) clearTimeout(tid);
      try { localStorage.setItem('aera.weather.cache', JSON.stringify({ lat: cfg.weather.lat, lon: cfg.weather.lon, ts: Date.now(), data: d })); } catch (_) {}
      return d;
    }).catch(function (err) {
      if (tid) clearTimeout(tid);
      throw err;
    });
  }

  function buildWeather(w, cfg) {
    w.classList.add('widget-weather');
    var head = el('div', 'weather-head');
    var city = el('div', 'weather-city');
    city.appendChild(svg('M8 1.5 C4.7 1.5 2 4.2 2 7.5 C2 11.5 8 14.5 8 14.5 C8 14.5 14 11.5 14 7.5 C14 4.2 11.3 1.5 8 1.5 Z M8 9.4 A2 2 0 1 1 8 5.4 A2 2 0 0 1 8 9.4 Z', { 'stroke-width': 1.3 }));
    city.appendChild(el('span', null, cfg.weather.city));
    var icon = el('div', 'weather-icon', '⏳');
    head.appendChild(city); head.appendChild(icon);
    w.appendChild(head);

    var temp = el('div', 'weather-temp', '--');
    var desc = el('div', 'weather-desc', 'Загрузка…');
    w.appendChild(temp); w.appendChild(desc);
    var meta = el('div', 'weather-meta');
    w.appendChild(meta);

    fetchWeather(cfg).then(function (d) {
      if (!w.isConnected || !d || !d.current) return;
      var c = d.current;
      var code = c.weather_code;
      var pair = WMO[code] || ['—', '🌡️'];
      icon.textContent = pair[1];
      var t = Math.round(c.temperature_2m);
      temp.innerHTML = esc(String(t)) + '<sup>°' + (cfg.weather.units === 'f' ? 'F' : 'C') + '</sup>';
      desc.textContent = pair[0];
      meta.innerHTML = '<span>Ощущается: <b>' + Math.round(c.apparent_temperature) + '°</b></span>' +
        '<span>Ветер: <b>' + (c.wind_speed_10m != null ? c.wind_speed_10m.toFixed(1) : '—') + ' м/с</b></span>';
    }).catch(function () {
      if (w.isConnected) { desc.textContent = 'Не удалось загрузить погоду'; icon.textContent = '📡'; }
    });
  }

  function buildCalendar(w) {
    w.classList.add('widget-calendar');
    var now = new Date();
    var head = el('div', 'cal-today-row');
    head.appendChild(el('span', 'cal-day', String(now.getDate())));
    head.appendChild(el('span', 'cal-month', now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })));
    w.appendChild(head);

    var grid = el('div', 'cal-grid');
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach(function (d) { grid.appendChild(el('div', 'dow', d)); });
    var y = now.getFullYear(), m = now.getMonth();
    var first = new Date(y, m, 1);
    var offset = (first.getDay() + 6) % 7;
    var daysIn = new Date(y, m + 1, 0).getDate();
    var prevDays = new Date(y, m, 0).getDate();
    for (var i = 0; i < 42; i++) {
      var dayNum = i - offset + 1;
      var cell = el('div', 'd');
      if (dayNum < 1) { cell.textContent = String(prevDays + dayNum); cell.classList.add('other'); }
      else if (dayNum > daysIn) { cell.textContent = String(dayNum - daysIn); cell.classList.add('other'); }
      else {
        cell.textContent = String(dayNum);
        if (dayNum === now.getDate()) cell.classList.add('today');
      }
      grid.appendChild(cell);
      if (i >= 34 && dayNum > daysIn) break;
    }
    w.appendChild(grid);
  }

  function buildLinks(w, cfg, ctx) {
    w.classList.add('widget-links');
    w.appendChild(el('div', 'widget-title', 'Быстрый доступ'));
    var grid = el('div', 'links-grid');
    cfg.quickLinks.forEach(function (l, idx) {
      var tile = el('button', 'link-tile');
      tile.type = 'button';
      var fav = el('div', 'link-favicon');
      var img = document.createElement('img');
      img.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(hostOf(l.url)) + '&sz=64';
      img.alt = '';
      img.onerror = function () { img.remove(); fav.textContent = (l.title || '?')[0].toUpperCase(); };
      fav.appendChild(img);
      tile.appendChild(fav);
      tile.appendChild(el('div', 'link-name', l.title));
      var x = el('button', 'link-x', '✕');
      x.title = 'Удалить';
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        var s = Store.get();
        s.quickLinks.splice(idx, 1);
        Store.save();
        ctx.refresh();
      });
      tile.appendChild(x);
      tile.addEventListener('click', function () { ctx.navigate(l.url); });
      grid.appendChild(tile);
    });
    var add = el('button', 'link-tile link-add');
    add.type = 'button';
    var af = el('div', 'link-favicon', '+');
    add.appendChild(af);
    add.appendChild(el('div', 'link-name', 'Добавить'));
    add.addEventListener('click', function () {
      var body = window.AeroModal.open('Новая ссылка', function (b, close) {
        var tIn = el('input', 'inp'); tIn.placeholder = 'Название'; tIn.style.width = '100%';
        var uIn = el('input', 'inp'); uIn.placeholder = 'https://…'; uIn.style.width = '100%'; uIn.style.marginTop = '8px';
        var row = el('div', 'field-row'); row.style.display = 'block'; row.appendChild(tIn); row.appendChild(uIn);
        b.appendChild(row);
        var ok = el('button', 'nt-btn', 'Сохранить');
        ok.style.marginTop = '12px';
        ok.addEventListener('click', function () {
          var t = tIn.value.trim(), u = uIn.value.trim();
          if (!u) return;
          if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
          var s = Store.get();
          s.quickLinks.push({ title: t || hostOf(u), url: u });
          Store.save();
          close();
          ctx.refresh();
        });
        b.appendChild(ok);
      });
    });
    grid.appendChild(add);
    w.appendChild(grid);
  }

  /* ═══════════ New Tab render ═══════════ */
  var WIDGET_META = {
    clock:    { name: 'Часы',    icon: '🕐' },
    weather:  { name: 'Погода',  icon: '🌤️' },
    calendar: { name: 'Календарь', icon: '📅' },
    links:    { name: 'Быстрый доступ', icon: '🔗' }
  };

  window.AeroNewTab = {
    render: function (container, ctx) {
      ctx = ctx || {};
      var navigate = ctx.navigate || function (u) {};
      var cfg = Store.get();

      var isRefresh = !!container.querySelector(':scope > .newtab');
      container.innerHTML = '';
      /* при перерисовке (обои, edit-mode, порядок) не переигрываем входы */
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

      /* widgets grid */
      var grid = el('div', 'widgets-grid');
      grid.style.setProperty('--cols', String(cfg.columns || 4));
      inner.appendChild(grid);

      var refresh = function () { window.AeroNewTab.render(container, ctx); };

      function renderWidgets(animate) {
        grid.innerHTML = '';
        var c = Store.get();
        var visibleCount = 0;
        c.widgets.order.forEach(function (key, i) {
          if (c.widgets.hidden[key]) return;
          visibleCount++;
          var card = el('div', 'widget ' + (SIZE_CLASS[c.widgets.sizes[key]] || 'wS'));
          /* каскад появления только при первом рендере страницы */
          if (animate) { card.style.animationDelay = (0.05 + i * 0.05) + 's'; }
          else { card.style.animation = 'none'; }
          card.dataset.key = key;

          /* edit-mode controls: size cycle + hide; порядок — перетаскиванием */
          var ctrls = el('div', 'widget-controls');
          var bSize = el('button', 'wc-btn wc-size', c.widgets.sizes[key] || 'S');
          bSize.type = 'button';
          bSize.title = 'Размер (Мал. → Сред. → Больш.)';
          bSize.addEventListener('click', function () {
            var s = Store.get();
            var order = ['S', 'M', 'L'];
            s.widgets.sizes[key] = order[(order.indexOf(s.widgets.sizes[key] || 'S') + 1) % 3];
            Store.save();
            renderWidgets();
          });
          var bHide = el('button', 'wc-btn');
          bHide.type = 'button';
          bHide.appendChild(svg('M2.5 2.5 L13.5 13.5 M13.5 2.5 L2.5 13.5', { 'stroke-width': 1.7 }));
          bHide.title = 'Скрыть виджет';
          bHide.addEventListener('click', function () {
            var s = Store.get();
            s.widgets.hidden[key] = true;
            Store.save();
            renderWidgets();
          });
          ctrls.appendChild(bSize); ctrls.appendChild(bHide);
          card.appendChild(ctrls);

          if (key === 'clock') buildClock(card, c.widgets);
          else if (key === 'weather') buildWeather(card, c.widgets);
          else if (key === 'calendar') buildCalendar(card, c);
          else if (key === 'links') buildLinks(card, c, { navigate: navigate, refresh: renderWidgets });

          /* drag & drop reorder in edit mode */
          card.draggable = document.body.classList.contains('edit-mode');
          card.addEventListener('dragstart', function (e) { card.classList.add('dragging'); e.dataTransfer.setData('text/plain', key); });
          card.addEventListener('dragend', function () { card.classList.remove('dragging'); });
          card.addEventListener('dragover', function (e) { if (document.body.classList.contains('edit-mode')) { e.preventDefault(); card.classList.add('drag-over'); } });
          card.addEventListener('dragleave', function () { card.classList.remove('drag-over'); });
          card.addEventListener('drop', function (e) {
            if (!document.body.classList.contains('edit-mode')) return;
            e.preventDefault();
            card.classList.remove('drag-over');
            var srcKey = e.dataTransfer.getData('text/plain');
            var s = Store.get();
            var from = s.widgets.order.indexOf(srcKey);
            var to = s.widgets.order.indexOf(key);
            if (from !== -1 && to !== -1 && from !== to) {
              s.widgets.order.splice(from, 1);
              s.widgets.order.splice(to, 0, srcKey);
              Store.save();
              renderWidgets();
            }
          });

          grid.appendChild(card);
        });
        if (visibleCount === 0) {
          var empty = el('div', 'nt-empty');
          empty.appendChild(el('div', 'nt-empty-title', 'Все виджеты скрыты'));
          empty.appendChild(el('div', 'nt-empty-sub', 'Нажмите «Настроить», чтобы вернуть их на экран'));
          grid.appendChild(empty);
        }
      }
      renderWidgets(true);

      /* tools row + floating edit bar.
         В обычном режиме видна строка инструментов; при редактировании она
         сменяется плавающей панелью редактирования внизу экрана. */
      var tools = el('div', 'newtab-tools');
      var bEdit = el('button', 'nt-btn');
      bEdit.type = 'button';
      bEdit.appendChild(svg('M11 2.5 L13.5 5 L6 12.5 L3 13 L3.5 10 Z', { 'stroke-width': 1.4, 'stroke-linejoin': 'round' }));
      bEdit.appendChild(el('span', null, 'Изменить'));
      var bCfg = el('button', 'nt-btn');
      bCfg.type = 'button';
      bCfg.appendChild(svg('M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M12.4 3.6l-1.2 1.2M4.8 11.2l-1.2 1.2', { 'stroke-width': 1.4, 'stroke-linecap': 'round' }));
      bCfg.appendChild(el('span', null, 'Настроить'));
      bCfg.addEventListener('click', function () { navigate('aero://settings?section=start'); });
      tools.appendChild(bEdit);
      tools.appendChild(bCfg);
      inner.appendChild(tools);

      var editBar = el('div', 'edit-bar');
      editBar.style.display = 'none';
      editBar.appendChild(el('span', 'eb-title', 'Редактирование'));
      editBar.appendChild(el('span', 'eb-hint', 'Перетаскивайте карточки, меняйте размер кнопкой с буквой, скрывайте лишнее крестиком'));
      var bWid = el('button', 'nt-btn');
      bWid.type = 'button';
      bWid.appendChild(svg('M2.4 2.4h4.7v4.7H2.4zM8.9 2.4h4.7v4.7H8.9zM2.4 8.9h4.7v4.7H2.4zM8.9 8.9h4.7v4.7H8.9z', { fill: 'currentColor', 'stroke-width': 0 }));
      bWid.appendChild(el('span', null, 'Настроить'));
      bWid.addEventListener('click', function () { navigate('aero://settings?section=start'); });
      var bDone = el('button', 'nt-btn primary');
      bDone.type = 'button';
      bDone.appendChild(el('span', null, 'Готово'));
      bDone.addEventListener('click', function () { setEditMode(false); });
      editBar.appendChild(bWid);
      editBar.appendChild(bDone);
      inner.appendChild(editBar);

      function setEditMode(on) {
        document.body.classList.toggle('edit-mode', on);
        editBar.style.display = on ? '' : 'none';
        tools.style.display = on ? 'none' : '';
        renderWidgets();
      }
      bEdit.addEventListener('click', function () { setEditMode(true); });
      // при перерисовке страницы (смена обоев и т.п.) статус режима сохраняется
      if (document.body.classList.contains('edit-mode')) { editBar.style.display = ''; tools.style.display = 'none'; }

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
          body.appendChild(row);
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
     Простые сгруппированные строки: фон, раскладка, виджеты, быстрый доступ. */
  function mkToggle(on, cb) {
    var t = el('button', 'tgl' + (on ? ' on' : ''));
    t.type = 'button';
    t.setAttribute('role', 'switch');
    t.setAttribute('aria-checked', on ? 'true' : 'false');
    t.addEventListener('click', function () {
      t.classList.toggle('on');
      t.setAttribute('aria-checked', t.classList.contains('on') ? 'true' : 'false');
      cb(t.classList.contains('on'));
    });
    return t;
  }
  function mkSeg(options, current, cb) {
    var s = el('div', 'seg');
    options.forEach(function (o) {
      var b = el('button', o.value === current ? 'on' : '', o.label);
      b.type = 'button';
      b.addEventListener('click', function () {
        s.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        cb(o.value);
      });
      s.appendChild(b);
    });
    return s;
  }

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

      /* — Раскладка и виджеты — */
      var gW = mkGroup('Виджеты');
      var colRow = el('div', 'sc-row');
      var colL = el('div', 'sc-main');
      colL.appendChild(el('div', 'sc-label', 'Колонок в сетке'));
      colL.appendChild(el('div', 'sc-sub', 'Сколько карточек в одном ряду'));
      colRow.appendChild(colL);
      colRow.appendChild(mkSeg([2, 3, 4, 5, 6].map(function (n) { return { value: String(n), label: String(n) }; }), String(c.columns || 4), function (v) {
        Store.update({ columns: Number(v) });
        refresh();
      }));
      gW.appendChild(colRow);

      c.widgets.order.forEach(function (key) {
        var meta = WIDGET_META[key] || { name: key, icon: '▪️' };
        var r = el('div', 'sc-row');
        r.appendChild(el('div', 'ws-icon', meta.icon));
        var main = el('div', 'sc-main');
        main.appendChild(el('div', 'sc-label', meta.name));
        var subTxt = c.widgets.hidden[key] ? 'Скрыт' : 'Показан · ' + SIZE_LABEL[c.widgets.sizes[key] || 'S'];
        if (key === 'weather') subTxt += ' · ' + c.widgets.weather.city;
        if (key === 'clock') subTxt += ' · ' + (c.widgets.clock.format === '24h' ? '24 ч' : '12 ч') + (c.widgets.clock.seconds ? ' · сек' : '');
        main.appendChild(el('div', 'sc-sub', subTxt));
        r.appendChild(main);

        var acts = el('div', 'sc-actions');
        acts.appendChild(mkSeg([
          { value: 'S', label: 'М' },
          { value: 'M', label: 'С' },
          { value: 'L', label: 'Б' }
        ], c.widgets.sizes[key] || 'S', function (v) {
          var s = Store.get();
          s.widgets.sizes[key] = v;
          Store.save();
          refresh();
        }));
        if (key === 'clock' || key === 'weather') {
          var bGear = el('button', 'ws-btn');
          bGear.type = 'button';
          bGear.appendChild(svg('M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M12.4 3.6l-1.2 1.2M4.8 11.2l-1.2 1.2', { 'stroke-width': 1.4, 'stroke-linecap': 'round' }));
          bGear.title = 'Настройки виджета';
          bGear.setAttribute('aria-label', 'Настройки: ' + meta.name);
          bGear.addEventListener('click', function () { openWidgetOptions(key, refresh); });
          acts.appendChild(bGear);
        }
        acts.appendChild(mkToggle(!c.widgets.hidden[key], function (on) {
          var s = Store.get();
          if (on) delete s.widgets.hidden[key]; else s.widgets.hidden[key] = true;
          Store.save();
          refresh();
        }));
        r.appendChild(acts);
        gW.appendChild(r);
      });

      /* — Быстрый доступ — */
      var gQ = mkGroup('Быстрый доступ');
      c.quickLinks.forEach(function (l, i) {
        var r = el('div', 'sc-row');
        var fav = el('div', 'ws-icon');
        var img = document.createElement('img');
        img.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(hostOf(l.url)) + '&sz=64';
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
        bX.appendChild(svg('M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5', { 'stroke-width': 1.7 }));
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
        if (!u) return;
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
        if (confirm('Сбросить фон, виджеты и быстрый доступ?')) {
          var s = Store.get();
          s.widgets = JSON.parse(JSON.stringify(Store.defaults.widgets));
          s.wallpaper = Store.defaults.wallpaper;
          s.wallpaperUrl = '';
          s.wallpaperDim = Store.defaults.wallpaperDim;
          s.columns = Store.defaults.columns;
          s.quickLinks = JSON.parse(JSON.stringify(Store.defaults.quickLinks));
          Store.save();
          refresh();
        }
      });
      resetWrap.appendChild(bReset);
      root.appendChild(resetWrap);
    }
  };

  /* per-widget options modal */
  function openWidgetOptions(key, onChange) {
    var c = Store.get();
    var title = (WIDGET_META[key] || {}).name || 'Виджет';
    window.AeroModal.open(title, function (body, close) {
      function rerender() { Store.save(); onChange(); }
      if (key === 'clock') {
        var s = c.widgets.clock;
        var r1 = el('div', 'field-row');
        r1.appendChild(Object.assign(el('div'), { innerHTML: '<div class="field-label">Стрелки (аналоговые)</div>' }));
        var t1 = el('button', 'tgl' + (s.analog ? ' on' : ''));
        t1.addEventListener('click', function () { s.analog = !s.analog; t1.classList.toggle('on'); rerender(); });
        r1.appendChild(t1); body.appendChild(r1);

        var r2 = el('div', 'field-row');
        r2.appendChild(Object.assign(el('div'), { innerHTML: '<div class="field-label">Показывать секунды</div>' }));
        var t2 = el('button', 'tgl' + (s.seconds ? ' on' : ''));
        t2.addEventListener('click', function () { s.seconds = !s.seconds; t2.classList.toggle('on'); rerender(); });
        r2.appendChild(t2); body.appendChild(r2);

        var r3 = el('div', 'field-row');
        r3.appendChild(Object.assign(el('div'), { innerHTML: '<div class="field-label">Формат времени</div>' }));
        var seg3 = el('div', 'seg');
        [['24h', '24 ч'], ['12h', '12 ч']].forEach(function (pair) {
          var b = el('button', s.format === pair[0] ? 'on' : '', pair[1]);
          b.addEventListener('click', function () { s.format = pair[0]; seg3.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); rerender(); });
          seg3.appendChild(b);
        });
        r3.appendChild(seg3); body.appendChild(r3);
      } else if (key === 'weather') {
        var wcfg = c.widgets.weather;
        var row = el('div', 'field-row');
        row.style.display = 'block';
        row.appendChild(Object.assign(el('div'), { innerHTML: '<div class="field-label">Город</div><div class="field-sub">Введите название и нажмите «Найти»</div>' }));
        var irow = el('div');
        irow.style.cssText = 'display:flex;gap:8px;margin-top:10px';
        var cityIn = el('input', 'inp');
        cityIn.value = wcfg.city; cityIn.style.flex = '1';
        var bFind = el('button', 'nt-btn', 'Найти');
        bFind.addEventListener('click', function () {
          var q = cityIn.value.trim();
          if (!q) return;
          bFind.textContent = '…';
          fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=1&language=ru')
            .then(function (r) { return r.json(); })
            .then(function (d) {
              if (d.results && d.results[0]) {
                var r0 = d.results[0];
                wcfg.city = r0.name;
                wcfg.lat = r0.latitude;
                wcfg.lon = r0.longitude;
                try { localStorage.removeItem('aera.weather.cache'); } catch (_) {}
                rerender();
                close();
              } else {
                bFind.textContent = 'Не найдено';
                setTimeout(function () { bFind.textContent = 'Найти'; }, 1500);
              }
            })
            .catch(function () { bFind.textContent = 'Ошибка'; setTimeout(function () { bFind.textContent = 'Найти'; }, 1500); });
        });
        irow.appendChild(cityIn); irow.appendChild(bFind);
        row.appendChild(irow);
        body.appendChild(row);

        var rU = el('div', 'field-row');
        rU.style.marginTop = '10px';
        rU.appendChild(Object.assign(el('div'), { innerHTML: '<div class="field-label">Единицы температуры</div>' }));
        var segU = el('div', 'seg');
        [['c', '°C'], ['f', '°F']].forEach(function (pair) {
          var b = el('button', wcfg.units === pair[0] ? 'on' : '', pair[1]);
          b.addEventListener('click', function () { wcfg.units = pair[0]; segU.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); });
          segU.appendChild(b);
        });
        rU.appendChild(segU); body.appendChild(rU);
      } else if (key === 'calendar') {
        body.appendChild(el('p', 'hint', 'Календарь показывает текущий месяц и выделяет сегодняшний день. Дополнительных настроек пока нет.'));
      } else if (key === 'links') {
        body.appendChild(el('p', 'hint', 'Управляйте ссылками в общем разделе «Быстрый доступ» на панели настроек виджетов.'));
      }
    });
  }
})();
