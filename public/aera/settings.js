/* Aero — Settings page (aero://settings): sidebar + grouped content */
(function () {
  'use strict';

  var Store = window.AeroStore;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function toggleBtn(on, cb) {
    var t = el('button', 'tgl' + (on ? ' on' : ''));
    t.type = 'button';
    t.setAttribute('role', 'switch');
    t.setAttribute('aria-checked', on ? 'true' : 'false');
    t.addEventListener('click', function () { t.classList.toggle('on'); t.setAttribute('aria-checked', t.classList.contains('on') ? 'true' : 'false'); cb(t.classList.contains('on')); });
    return t;
  }
  /* row inside a group: label (+ sub) left, control right */
  function row(label, sub, control) {
    var r = el('div', 'sc-row');
    var l = el('div', 'sc-main');
    l.appendChild(el('div', 'sc-label', label));
    if (sub) l.appendChild(el('div', 'sc-sub', sub));
    r.appendChild(l);
    if (control) r.appendChild(control);
    return r;
  }
  function group(title) {
    var wrap = el('div');
    if (title) wrap.appendChild(el('div', 'sc-title', title));
    var g = el('div', 'sc-group');
    wrap.appendChild(g);
    return { wrap: wrap, body: g };
  }
  function seg(options, current, cb) {
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
  function svgWrap(inner) {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 16 16');
    s.setAttribute('fill', 'none');
    s.innerHTML = inner;
    return s;
  }

  var TABS = [
    {
      id: 'start', name: 'Стартовая',
      svg: '<g stroke="currentColor" stroke-width="1.25"><rect x="2.4" y="2.4" width="4.7" height="4.7" rx="1.3"/><rect x="8.9" y="2.4" width="4.7" height="4.7" rx="1.3"/><rect x="2.4" y="8.9" width="4.7" height="4.7" rx="1.3"/><rect x="8.9" y="8.9" width="4.7" height="4.7" rx="1.3"/></g>'
    },
    {
      id: 'look', name: 'Оформление',
      svg: '<path stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" d="M10.6 2.6 A3.6 3.6 0 1 0 13.4 5.4 L8 11 A2.2 2.2 0 1 1 5 8 Z"/>'
    },
    {
      id: 'search', name: 'Поиск',
      svg: '<g stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="7" cy="7" r="4.3"/><path d="M10.3 10.3 L13.6 13.6"/></g>'
    },
    {
      id: 'general', name: 'Общие',
      svg: '<path style="fill:currentColor;stroke:none" fill-rule="evenodd" d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>'
    },
    {
      id: 'privacy', name: 'Приватность',
      svg: '<path stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" d="M8 1.5 L13 3.5 V7.5 C13 11 10.8 13.4 8 14.5 C5.2 13.4 3 11 3 7.5 V3.5 Z"/>'
    },
    {
      id: 'about', name: 'О браузере',
      svg: '<g stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="8" cy="8" r="6.4"/><path d="M8 7.2 L8 11.3 M8 4.7 v.2"/></g>'
    }
  ];

  var SECTION_HEADS = {
    start:    { t: 'Стартовая страница', s: 'Фон и быстрый доступ на новой вкладке' },
    look:     { t: 'Оформление', s: 'Тема, акцент и эффекты' },
    search:   { t: 'Поиск', s: 'Поисковая система и подсказки' },
    general:  { t: 'Общие', s: 'Запуск и вкладки' },
    privacy:  { t: 'Приватность', s: 'История и данные сайтов' },
    about:    { t: 'О браузере', s: 'Версия, экспорт и импорт настроек' }
  };

  window.AeroSettings = {
    render: function (container, ctx) {
      ctx = ctx || {};
      var c = Store.get();
      container.innerHTML = '';

      var page = el('div', 'settings-page');
      var layout = el('div', 'settings-layout');

      /* ── sidebar ── */
      var side = el('div', 'settings-side');
      side.appendChild(el('div', 'settings-side-title', 'Настройки'));
      var nav = el('nav', 'snav');
      nav.setAttribute('aria-label', 'Разделы настроек');

      var state = { section: ctx.section || 'general' };

      var content = el('div', 'settings-content');

      function renderSection() {
        content.innerHTML = '';
        var head = el('div', 'sc-head');
        var h = SECTION_HEADS[state.section] || SECTION_HEADS.general;
        head.appendChild(el('h1', null, h.t));
        head.appendChild(el('p', null, h.s));
        content.appendChild(head);

        var body = el('div', 'settings-section');
        content.appendChild(body);
        var fn = SECTIONS[state.section] || SECTIONS.general;
        fn(body, rerender);
        content.scrollTop = 0;
        function rerender() {
          renderSection();
          if (ctx.onSettingsChanged) ctx.onSettingsChanged();
        }
      }

      TABS.forEach(function (t) {
        var b = el('button', 'snav-item' + (state.section === t.id ? ' on' : ''));
        b.type = 'button';
        b.appendChild(svgWrap(t.svg));
        b.appendChild(el('span', null, t.name));
        b.addEventListener('click', function () {
          state.section = t.id;
          nav.querySelectorAll('.snav-item').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          renderSection();
        });
        nav.appendChild(b);
      });

      side.appendChild(nav);
      layout.appendChild(side);
      layout.appendChild(content);
      page.appendChild(layout);
      container.appendChild(page);
      page.classList.add('view-entrance');
      renderSection();
    }
  };

  var SECTIONS = {
    /* ─── Стартовая страница: делегируется в AeroWidgetsSettings ─── */
    start: function (sec, rerender) {
      window.AeroWidgetsSettings.render(sec, {
        refresh: rerender,
        compact: true
      });
    },

    /* ─── Оформление ─── */
    look: function (sec, rerender) {
      var g1 = group('Тема');
      var segT = seg([
        { value: 'dark', label: 'Тёмная' },
        { value: 'light', label: 'Светлая' },
        { value: 'auto', label: 'Авто' }
      ], Store.get().theme, function (v) {
        Store.update({ theme: v }); Store.applyTheme(); rerender();
      });
      var rT = row('Режим оформления', '«Авто» следует настройкам системы', segT);
      g1.body.appendChild(rT);
      sec.appendChild(g1.wrap);

      var g2 = group('Акцентный цвет');
      var acc = el('div', 'accent-row');
      acc.style.padding = '14px 16px';
      Object.keys(Store.accents).forEach(function (k) {
        var b = el('button', 'acc-swatch' + (Store.get().accent === k ? ' sel' : ''));
        b.type = 'button';
        b.style.background = Store.accents[k].dark;
        b.title = { safari: 'Safari', orange: 'Оранжевый', green: 'Зелёный', pink: 'Розовый', graphite: 'Графитовый' }[k] || k;
        b.setAttribute('aria-label', 'Акцент: ' + b.title);
        b.addEventListener('click', function () {
          Store.update({ accent: k });
          Store.applyTheme();
          acc.querySelectorAll('.acc-swatch').forEach(function (x) { x.classList.remove('sel'); });
          b.classList.add('sel');
          rerender();
        });
        acc.appendChild(b);
      });
      g2.body.appendChild(acc);
      sec.appendChild(g2.wrap);

      var g3 = group('Эффекты');
      g3.body.appendChild(row('Интенсивность стекла', 'Сила размытия liquid glass', seg([
        { value: 'low', label: 'Низкая' },
        { value: 'medium', label: 'Средняя' },
        { value: 'high', label: 'Высокая' },
        { value: 'off', label: 'Выкл' }
      ], Store.get().glass, function (v) { Store.update({ glass: v }); Store.applyTheme(); rerender(); })));
      g3.body.appendChild(row('Анимации', 'Плавные переходы и эффекты', toggleBtn(Store.get().animations, function (v) {
        Store.update({ animations: v }); Store.applyTheme();
      })));
      sec.appendChild(g3.wrap);
    },

    /* ─── Поиск ─── */
    search: function (sec, rerender) {
      var g1 = group('Поисковая система');
      Object.keys(Store.engines).forEach(function (k) {
        var e = Store.engines[k];
        var on = Store.get().searchEngine === k;
        var r = el('div', 'sc-row');
        r.style.cursor = 'pointer';
        r.setAttribute('role', 'radio');
        r.setAttribute('aria-checked', on ? 'true' : 'false');
        var l = el('div', 'sc-main');
        l.appendChild(el('div', 'sc-label', e.name));
        l.appendChild(el('div', 'sc-sub', e.domain));
        r.appendChild(l);
        var mark = el('span', 'seg');
        var mb = el('button', on ? 'on' : '', on ? 'Выбран' : 'Выбрать');
        mb.type = 'button';
        mark.appendChild(mb);
        r.appendChild(mark);
        r.addEventListener('click', function () {
          Store.update({ searchEngine: k });
          rerender();
        });
        g1.body.appendChild(r);
      });
      sec.appendChild(g1.wrap);

      var g2 = group('Подсказки');
      g2.body.appendChild(row('Предлагать историю и ссылки', 'В адресной строке', toggleBtn(Store.get().suggestHistory, function (v) { Store.update({ suggestHistory: v }); })));
      sec.appendChild(g2.wrap);
    },

    /* ─── Общие ─── */
    general: function (sec, rerender) {
      var g1 = group('Запуск');
      g1.body.appendChild(row('Открывать новую вкладку при запуске', 'Стартовая страница вместо восстановления сессии', toggleBtn(Store.get().homeOnStartup !== false, function (v) { Store.update({ homeOnStartup: v }); })));
      sec.appendChild(g1.wrap);

      var g2 = group('Вкладки');
      g2.body.appendChild(row('Компактные вкладки', 'Заголовок виден только на активной вкладке', toggleBtn(Store.get().compactTabs, function (v) {
        Store.update({ compactTabs: v });
        document.documentElement.setAttribute('data-compact-tabs', v ? 'on' : 'off');
      })));
      sec.appendChild(g2.wrap);
    },

    /* ─── Приватность ─── */
    privacy: function (sec, rerender) {
      var g1 = group('История');
      g1.body.appendChild(row('Сохранять историю посещений', 'Используется для подсказок в адресной строке', toggleBtn(Store.get().keepHistory, function (v) { Store.update({ keepHistory: v }); })));
      var bHist = el('button', 'btn-danger', 'Очистить');
      bHist.type = 'button';
      bHist.addEventListener('click', function () {
        Store.history.clear();
        if (window.AeroUI && window.AeroUI.toast) window.AeroUI.toast('История очищена');
        rerender();
      });
      g1.body.appendChild(row('История браузера', 'Хранится локально на этом устройстве', bHist));
      sec.appendChild(g1.wrap);

      var g2 = group('Данные сайтов');
      var bData = el('button', 'btn-danger', 'Очистить');
      bData.type = 'button';
      bData.addEventListener('click', function () {
        if (window.electronAPI && window.electronAPI.clearBrowsingData) {
          window.electronAPI.clearBrowsingData().then(function (ok) {
            if (window.AeroUI && window.AeroUI.toast) window.AeroUI.toast(ok ? 'Данные сайтов очищены' : 'Не удалось очистить');
          });
        } else {
          if (window.AeroUI && window.AeroUI.toast) window.AeroUI.toast('Доступно только в приложении Aero');
        }
      });
      g2.body.appendChild(row('Кэш, cookies, localStorage', 'Настройки Aero не будут затронуты', bData));
      g2.body.appendChild(row('Очищать данные при закрытии', 'Кэш удаляется при выходе из браузера', toggleBtn(Store.get().clearOnExit, function (v) { Store.update({ clearOnExit: v }); })));
      sec.appendChild(g2.wrap);
    },

    /* ─── О браузере ─── */
    about: function (sec, rerender) {
      var card = el('div', 'sc-group about-card');
      var logo = el('div', 'about-logo');
      var img = el('img');
      img.src = 'icon.png';
      img.alt = 'Aero';
      logo.appendChild(img);
      card.appendChild(logo);
      var info = el('div');
      info.appendChild(el('div', 'about-name', 'Aero'));
      info.appendChild(el('div', 'about-ver', 'Версия ' + (window.AeroUI && window.AeroUI.version ? window.AeroUI.version : '2.3.20')));
      info.appendChild(el('div', 'about-line',
        'Интерфейс в стиле Safari 27 (Golden Gate / macOS Tahoe).\n' +
        'Движок: ' + (navigator.userAgent.indexOf('Firefox') !== -1 ? 'Gecko' : 'Chromium') +
        ' · Рендеринг: ' + (window.electronAPI ? 'webview (Chromium)' : 'iframe (веб-режим)') + '.\n' +
        'Aero не связана с Apple Inc. Safari — торговая марка Apple.'));
      card.appendChild(info);
      sec.appendChild(card);

      var g = group('Данные и резервные копии');
      var bExp = el('button', 'nt-btn', 'Экспорт');
      bExp.type = 'button';
      bExp.addEventListener('click', function () {
        var blob = new Blob([Store.exportJSON()], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'aero-settings.json';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        if (window.AeroUI && window.AeroUI.toast) window.AeroUI.toast('Настройки экспортированы');
      });
      g.body.appendChild(row('Экспорт настроек', 'Скачать файл конфигурации JSON', bExp));

      var fileIn = el('input');
      fileIn.type = 'file'; fileIn.accept = 'application/json'; fileIn.style.display = 'none';
      var bImp = el('button', 'nt-btn', 'Импорт');
      bImp.type = 'button';
      bImp.addEventListener('click', function () { fileIn.click(); });
      fileIn.addEventListener('change', function () {
        var f = fileIn.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            Store.importJSON(String(reader.result));
            Store.applyTheme();
            document.documentElement.setAttribute('data-compact-tabs', Store.get().compactTabs ? 'on' : 'off');
            if (window.AeroUI && window.AeroUI.toast) window.AeroUI.toast('Настройки импортированы');
            rerender();
          } catch (_) {
            if (window.AeroUI && window.AeroUI.toast) window.AeroUI.toast('Некорректный файл настроек');
          }
        };
        reader.readAsText(f);
      });
      g.body.appendChild(row('Импорт настроек', 'Загрузить конфигурацию из файла', bImp));
      g.body.appendChild(fileIn);
      sec.appendChild(g.wrap);
    }
  };
})();
