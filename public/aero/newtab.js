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

      container.innerHTML = '';
      var nt = el('div', 'newtab');

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

      /* search */
      var search = el('div', 'nt-search');
      var box = el('div', 'nt-search-box');
      box.appendChild(svg('M11.5 11.5 L14 14', { 'stroke-width': 1.6, 'stroke-linecap': 'round' }) && (function () {
        var NS = 'http://www.w3.org/2000/svg';
        var s = document.createElementNS(NS, 'svg');
        s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('fill', 'none');
        var c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', '7'); c.setAttribute('cy', '7'); c.setAttribute('r', '4.2'); c.setAttribute('stroke-width', '1.6');
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('d', 'M10.2 10.2 L13.5 13.5'); p.setAttribute('stroke-width', '1.6'); p.setAttribute('stroke-linecap', 'round');
        s.appendChild(c); s.appendChild(p);
        return s;
      })());
      var inp = el('input');
      inp.placeholder = 'Поиск в ' + (Store.engines[cfg.searchEngine] || Store.engines.google).name + ' или введите адрес';
      inp.setAttribute('aria-label', 'Поиск');
      box.appendChild(inp);
      var chip = el('button', 'engine-chip');
      chip.appendChild(el('span', null, (Store.engines[cfg.searchEngine] || Store.engines.google).name));
      chip.appendChild(svg('M4.5 6.5 L8 10 L11.5 6.5', { 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      box.appendChild(chip);
      search.appendChild(box);
      var sugg = el('div', 'nt-suggest');
      search.appendChild(sugg);
      inner.appendChild(search);

      chip.addEventListener('click', function () {
        var names = Object.keys(Store.engines);
        sugg.innerHTML = '';
        names.forEach(function (k) {
          var it = el('div', 'suggest-item' + (k === cfg.searchEngine ? ' sel' : ''));
          it.appendChild(el('span', 'si-icon', '🔍'));
          it.appendChild(el('span', 'si-text', Store.engines[k].name));
          it.addEventListener('click', function () {
            Store.update({ searchEngine: k });
            inp.placeholder = 'Поиск в ' + Store.engines[k].name + ' или введите адрес';
            chip.querySelector('span').textContent = Store.engines[k].name;
            sugg.classList.remove('open');
          });
          sugg.appendChild(it);
        });
        sugg.classList.toggle('open');
      });

      inp.addEventListener('input', function () {
        var q = inp.value.trim();
        sugg.innerHTML = '';
        if (!q) { sugg.classList.remove('open'); return; }
        var items = [];
        if (cfg.suggestHistory) {
          Store.history.all().slice(0, 40).forEach(function (hi) {
            if (hi.url.indexOf(q) !== -1 || (hi.title || '').toLowerCase().indexOf(q.toLowerCase()) !== -1) {
              items.push({ icon: '🕘', text: hi.title || hi.url, sub: hostOf(hi.url), url: hi.url, type: 'История' });
            }
          });
          cfg.quickLinks.forEach(function (l) {
            if (l.url.indexOf(q) !== -1 || l.title.toLowerCase().indexOf(q.toLowerCase()) !== -1) {
              items.push({ icon: '🔗', text: l.title, sub: hostOf(l.url), url: l.url, type: 'Ссылка' });
            }
          });
        }
        items.slice(0, 6).forEach(function (it) {
          var row = el('div', 'suggest-item');
          row.appendChild(el('span', 'si-icon', it.icon));
          var txt = el('span', 'si-text', it.text);
          row.appendChild(txt);
          row.appendChild(el('span', 'si-sub', it.sub));
          row.addEventListener('click', function () { navigate(it.url); });
          sugg.appendChild(row);
        });
        if (items.length) {
          var sep = el('div', 'suggest-sep');
          sugg.appendChild(sep);
        }
        var sr = el('div', 'suggest-item');
        sr.appendChild(el('span', 'si-icon', '🔍'));
        sr.appendChild(el('span', 'si-text', 'Искать «' + q + '» в ' + (Store.engines[cfg.searchEngine] || Store.engines.google).name));
        sr.addEventListener('click', function () {
          navigate((Store.engines[cfg.searchEngine] || Store.engines.google).template.replace('%s', encodeURIComponent(q)));
        });
        sugg.appendChild(sr);
        sugg.classList.add('open');
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var q = inp.value.trim();
          if (!q) return;
          if (/^https?:\/\//i.test(q) || (!q.match(/\s/) && q.indexOf('.') !== -1)) {
            if (!/^https?:\/\//i.test(q)) q = 'https://' + q;
            navigate(q);
          } else {
            navigate((Store.engines[cfg.searchEngine] || Store.engines.google).template.replace('%s', encodeURIComponent(q)));
          }
        } else if (e.key === 'Escape') {
          sugg.classList.remove('open');
          inp.blur();
        }
      });
      document.addEventListener('mousedown', function onDoc(e) {
        if (!nt.isConnected) { document.removeEventListener('mousedown', onDoc); return; }
        if (!search.contains(e.target)) sugg.classList.remove('open');
      });

      /* widgets grid */
      var grid = el('div', 'widgets-grid');
      grid.style.setProperty('--cols', String(cfg.columns || 4));
      inner.appendChild(grid);

      var refresh = function () { window.AeroNewTab.render(container, ctx); };

      function renderWidgets() {
        grid.innerHTML = '';
        var c = Store.get();
        c.widgets.order.forEach(function (key, i) {
          if (c.widgets.hidden[key]) return;
          var card = el('div', 'widget ' + (SIZE_CLASS[c.widgets.sizes[key]] || 'wS'));
          card.style.animationDelay = (0.05 + i * 0.05) + 's';
          card.dataset.key = key;

          /* edit-mode controls */
          var ctrls = el('div', 'widget-controls');
          var bSize = el('button', 'wc-btn wc-size', c.widgets.sizes[key] || 'S');
          bSize.title = 'Размер';
          bSize.addEventListener('click', function () {
            var s = Store.get();
            var order = ['S', 'M', 'L'];
            s.widgets.sizes[key] = order[(order.indexOf(s.widgets.sizes[key] || 'S') + 1) % 3];
            Store.save();
            renderWidgets();
          });
          var bUp = el('button', 'wc-btn');
          bUp.appendChild(svg('M8 3 L13 8 L10.5 8 L10.5 13 L5.5 13 L5.5 8 L3 8 Z', { fill: 'currentColor', 'stroke-width': 0 }));
          bUp.title = 'Переместить раньше';
          bUp.addEventListener('click', function () {
            var s = Store.get();
            var idx = s.widgets.order.indexOf(key);
            if (idx > 0) { s.widgets.order.splice(idx, 1); s.widgets.order.splice(idx - 1, 0, key); Store.save(); renderWidgets(); }
          });
          var bDown = el('button', 'wc-btn');
          bDown.appendChild(svg('M8 13 L3 8 L5.5 8 L5.5 3 L10.5 3 L10.5 8 L13 8 Z', { fill: 'currentColor', 'stroke-width': 0 }));
          bDown.title = 'Переместить позже';
          bDown.addEventListener('click', function () {
            var s = Store.get();
            var idx = s.widgets.order.indexOf(key);
            if (idx < s.widgets.order.length - 1) { s.widgets.order.splice(idx, 1); s.widgets.order.splice(idx + 1, 0, key); Store.save(); renderWidgets(); }
          });
          var bHide = el('button', 'wc-btn');
          bHide.appendChild(svg('M2.5 2.5 L13.5 13.5 M13.5 2.5 L2.5 13.5', { 'stroke-width': 1.7 }));
          bHide.title = 'Скрыть виджет';
          bHide.addEventListener('click', function () {
            var s = Store.get();
            s.widgets.hidden[key] = true;
            Store.save();
            renderWidgets();
          });
          ctrls.appendChild(bSize); ctrls.appendChild(bUp); ctrls.appendChild(bDown); ctrls.appendChild(bHide);
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
      }
      renderWidgets();

      /* tools row */
      var tools = el('div', 'newtab-tools');
      var bEdit = el('button', 'nt-btn');
      bEdit.appendChild(svg('M11 2.5 L13.5 5 L6 12.5 L3 13 L3.5 10 Z', { 'stroke-width': 1.4, 'stroke-linejoin': 'round' }));
      bEdit.appendChild(el('span', null, 'Изменить'));
      bEdit.addEventListener('click', function () {
        var on = document.body.classList.toggle('edit-mode');
        bEdit.querySelector('span').textContent = on ? 'Готово' : 'Изменить';
        renderWidgets();
      });
      var bCfg = el('button', 'nt-btn');
      bCfg.appendChild(svg('M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M12.4 3.6l-1.2 1.2M4.8 11.2l-1.2 1.2', { 'stroke-width': 1.4, 'stroke-linecap': 'round' }));
      bCfg.appendChild(el('span', null, 'Настройки виджетов'));
      bCfg.addEventListener('click', function () {
        window.AeroModal.open('Настройки виджетов', function (body) {
          window.AeroWidgetsSettings.render(body, { refresh: function () { refresh(); } });
        });
      });
      tools.appendChild(bEdit);
      tools.appendChild(bCfg);
      inner.appendChild(tools);

      nt.appendChild(inner);
      container.appendChild(nt);
      nt.classList.add('view-entrance');
    }
  };

  /* ═══════════ Widget settings (shared: modal + settings page) ═══════════ */
  window.AeroWidgetsSettings = {
    render: function (root, opts) {
      opts = opts || {};
      var refresh = opts.refresh || function () {};
      var c = Store.get();

      /* — Фон — */
      root.appendChild(el('h2', null, 'Фон'));
      var wpGrid = el('div', 'wp-grid');
      WALLPAPERS.forEach(function (p) {
        var b = el('button', 'wp-swatch' + (c.wallpaper === p.id ? ' sel' : ''));
        b.type = 'button';
        var prev = el('div', 'wp-prev wp-' + p.id);
        b.appendChild(prev);
        b.appendChild(el('span', 'wp-name', p.name));
        b.addEventListener('click', function () {
          Store.update({ wallpaper: p.id });
          wpGrid.querySelectorAll('.wp-swatch').forEach(function (x) { x.classList.remove('sel'); });
          b.classList.add('sel');
          refresh();
        });
        wpGrid.appendChild(b);
      });
      /* custom */
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
          bClear.addEventListener('click', function () {
            Store.update({ wallpaper: 'aurora', wallpaperUrl: '' });
            close();
            refresh();
            window.AeroWidgetsSettings.render(root.parentNode, opts);
          });
          var bOk = el('button', 'nt-btn primary', 'Применить');
          bOk.addEventListener('click', function () {
            var url = uIn.value.trim();
            Store.update({ wallpaper: 'custom', wallpaperUrl: url });
            close();
            refresh();
            window.AeroWidgetsSettings.render(root.parentNode, opts);
          });
          actions.appendChild(bClear);
          actions.appendChild(bOk);
          body.appendChild(actions);
        });
      });
      wpGrid.appendChild(cb);
      root.appendChild(wpGrid);

      var dimRow = el('div', 'field-row');
      var dimL = el('div');
      dimL.appendChild(el('div', 'field-label', 'Затемнение фона'));
      dimRow.appendChild(dimL);
      var dimR = el('input');
      dimR.type = 'range'; dimR.min = '0'; dimR.max = '60'; dimR.value = String(c.wallpaperDim || 20);
      dimR.style.width = '150px';
      dimR.addEventListener('change', function () { Store.update({ wallpaperDim: Number(dimR.value) }); refresh(); });
      dimRow.appendChild(dimR);
      root.appendChild(dimRow);

      /* — Раскладка — */
      root.appendChild(el('h2', null, 'Раскладка'));
      var colRow = el('div', 'field-row');
      var colL = el('div');
      colL.appendChild(el('div', 'field-label', 'Колонок в сетке'));
      colRow.appendChild(colL);
      var seg = el('div', 'seg');
      [2, 3, 4, 5, 6].forEach(function (n) {
        var b = el('button', (c.columns === n ? 'on' : ''), String(n));
        b.addEventListener('click', function () {
          Store.update({ columns: n });
          seg.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          refresh();
        });
        seg.appendChild(b);
      });
      colRow.appendChild(seg);
      root.appendChild(colRow);

      /* — Виджеты — */
      root.appendChild(el('h2', null, 'Виджеты'));
      c.widgets.order.forEach(function (key) {
        var meta = WIDGET_META[key] || { name: key, icon: '▪️' };
        var row = el('div', 'ws-row');

        var icon = el('div', 'ws-icon', meta.icon);
        row.appendChild(icon);

        var main = el('div', 'ws-main');
        main.appendChild(el('div', 'ws-name', meta.name));
        var subTxt = c.widgets.hidden[key] ? 'Скрыт' : SIZE_LABEL[c.widgets.sizes[key] || 'S'];
        if (key === 'weather') subTxt += ' · ' + c.widgets.weather.city;
        if (key === 'clock') subTxt += ' · ' + (c.widgets.clock.format === '24h' ? '24 ч' : '12 ч') + (c.widgets.clock.seconds ? ' · сек' : '');
        main.appendChild(el('div', 'ws-sub', subTxt));
        row.appendChild(main);

        var acts = el('div', 'ws-actions');
        var bSize = el('button', 'ws-btn size', c.widgets.sizes[key] || 'S');
        bSize.title = 'Размер (Мал./Сред./Больш.)';
        bSize.addEventListener('click', function () {
          var s = Store.get();
          var order = ['S', 'M', 'L'];
          s.widgets.sizes[key] = order[(order.indexOf(s.widgets.sizes[key] || 'S') + 1) % 3];
          Store.save();
          rerender();
        });
        acts.appendChild(bSize);

        var bUp = el('button', 'ws-btn');
        bUp.appendChild(svg('M8 3 L3 8 L6 8 L6 13 L10 13 L10 8 L13 8 Z', { fill: 'currentColor', 'stroke-width': 0 }));
        bUp.title = 'Выше';
        bUp.addEventListener('click', function () {
          var s = Store.get();
          var i = s.widgets.order.indexOf(key);
          if (i > 0) { s.widgets.order.splice(i, 1); s.widgets.order.splice(i - 1, 0, key); Store.save(); rerender(); }
        });
        acts.appendChild(bUp);

        var bDown = el('button', 'ws-btn');
        bDown.appendChild(svg('M8 13 L13 8 L10 8 L10 3 L6 3 L6 8 L3 8 Z', { fill: 'currentColor', 'stroke-width': 0 }));
        bDown.title = 'Ниже';
        bDown.addEventListener('click', function () {
          var s = Store.get();
          var i = s.widgets.order.indexOf(key);
          if (i < s.widgets.order.length - 1) { s.widgets.order.splice(i, 1); s.widgets.order.splice(i + 1, 0, key); Store.save(); rerender(); }
        });
        acts.appendChild(bDown);

        var bEye = el('button', 'ws-btn' + (c.widgets.hidden[key] ? ' off' : ''));
        bEye.innerHTML = c.widgets.hidden[key]
          ? '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"><path d="M2 8 C4 4.7 6 3.5 8 3.5 C10 3.5 12 4.7 14 8 C12 11.3 10 12.5 8 12.5 C6 12.5 4 11.3 2 8 Z" stroke-width="1.3"/><circle cx="8" cy="8" r="2" stroke-width="1.3"/><path d="M3 13 L13 3" stroke-width="1.4"/></svg>'
          : '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"><path d="M2 8 C4 4.7 6 3.5 8 3.5 C10 3.5 12 4.7 14 8 C12 11.3 10 12.5 8 12.5 C6 12.5 4 11.3 2 8 Z" stroke-width="1.3"/><circle cx="8" cy="8" r="2" stroke-width="1.3"/></svg>';
        bEye.title = c.widgets.hidden[key] ? 'Показать' : 'Скрыть';
        bEye.addEventListener('click', function () {
          var s = Store.get();
          if (s.widgets.hidden[key]) delete s.widgets.hidden[key]; else s.widgets.hidden[key] = true;
          Store.save();
          rerender();
        });
        acts.appendChild(bEye);

        /* settings gear for widget-specific options */
        var bGear = el('button', 'ws-btn');
        bGear.appendChild(svg('M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M12.4 3.6l-1.2 1.2M4.8 11.2l-1.2 1.2', { 'stroke-width': 1.4, 'stroke-linecap': 'round' }));
        bGear.title = 'Настройки виджета';
        bGear.addEventListener('click', function () {
          openWidgetOptions(key, rerender);
        });
        acts.appendChild(bGear);

        row.appendChild(acts);
        root.appendChild(row);
      });

      /* — Быстрый доступ management — */
      root.appendChild(el('h2', null, 'Быстрый доступ'));
      c.quickLinks.forEach(function (l, i) {
        var row = el('div', 'ws-row');
        var fav = el('div', 'ws-icon');
        var img = document.createElement('img');
        img.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(hostOf(l.url)) + '&sz=64';
        img.width = 20; img.height = 20; img.alt = '';
        img.onerror = function () { img.remove(); fav.textContent = '🔗'; };
        fav.appendChild(img);
        row.appendChild(fav);
        var main = el('div', 'ws-main');
        main.appendChild(el('div', 'ws-name', l.title));
        main.appendChild(el('div', 'ws-sub', hostOf(l.url)));
        row.appendChild(main);
        var acts = el('div', 'ws-actions');
        var bUp = el('button', 'ws-btn');
        bUp.appendChild(svg('M8 3 L3 8 L6 8 L6 13 L10 13 L10 8 L13 8 Z', { fill: 'currentColor', 'stroke-width': 0 }));
        bUp.addEventListener('click', function () {
          if (i > 0) { var s = Store.get(); var t = s.quickLinks[i - 1]; s.quickLinks[i - 1] = s.quickLinks[i]; s.quickLinks[i] = t; Store.save(); rerender(); }
        });
        var bDown = el('button', 'ws-btn');
        bDown.appendChild(svg('M8 13 L13 8 L10 8 L10 3 L6 3 L6 8 L3 8 Z', { fill: 'currentColor', 'stroke-width': 0 }));
        bDown.addEventListener('click', function () {
          var s = Store.get();
          if (i < s.quickLinks.length - 1) { var t = s.quickLinks[i + 1]; s.quickLinks[i + 1] = s.quickLinks[i]; s.quickLinks[i] = t; Store.save(); rerender(); }
        });
        var bX = el('button', 'ws-btn');
        bX.appendChild(svg('M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5', { 'stroke-width': 1.7 }));
        bX.addEventListener('click', function () {
          var s = Store.get(); s.quickLinks.splice(i, 1); Store.save(); rerender();
        });
        acts.appendChild(bUp); acts.appendChild(bDown); acts.appendChild(bX);
        row.appendChild(acts);
        root.appendChild(row);
      });

      var addRow = el('div', 'wp-custom-url');
      var tIn = el('input', 'inp'); tIn.placeholder = 'Название';
      var uIn = el('input', 'inp'); uIn.placeholder = 'https://…'; uIn.style.flex = '1';
      var bAdd = el('button', 'nt-btn', 'Добавить');
      bAdd.addEventListener('click', function () {
        var u = uIn.value.trim();
        if (!u) return;
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        var s = Store.get();
        s.quickLinks.push({ title: tIn.value.trim() || hostOf(u), url: u });
        Store.save();
        rerender();
      });
      addRow.appendChild(tIn); addRow.appendChild(uIn); addRow.appendChild(bAdd);
      root.appendChild(addRow);

      /* — Reset — */
      var resetRow = el('div');
      resetRow.style.marginTop = '18px';
      var bReset = el('button', 'btn-danger', 'Сбросить настройки виджетов');
      bReset.addEventListener('click', function () {
        if (confirm('Сбросить все настройки виджетов, фона и быстрого доступа?')) {
          var s = Store.get();
          s.widgets = JSON.parse(JSON.stringify(Store.defaults.widgets));
          s.wallpaper = Store.defaults.wallpaper;
          s.wallpaperUrl = '';
          s.wallpaperDim = Store.defaults.wallpaperDim;
          s.columns = Store.defaults.columns;
          s.quickLinks = JSON.parse(JSON.stringify(Store.defaults.quickLinks));
          Store.save();
          rerender();
          refresh();
        }
      });
      resetRow.appendChild(bReset);
      root.appendChild(resetRow);

      function rerender() {
        Store.save();
        var parent = root.parentNode;
        if (!parent) return;
        parent.innerHTML = '';
        window.AeroWidgetsSettings.render(parent, opts);
        refresh();
      }
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
