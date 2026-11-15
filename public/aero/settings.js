/* Aero — Settings page (aero://settings): full-page, Safari-style window */
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
    t.addEventListener('click', function () { t.classList.toggle('on'); cb(t.classList.contains('on')); });
    return t;
  }
  function row(label, sub, control) {
    var r = el('div', 'field-row');
    var l = el('div');
    l.appendChild(el('div', 'field-label', label));
    if (sub) l.appendChild(el('div', 'field-sub', sub));
    r.appendChild(l);
    r.appendChild(control);
    return r;
  }
  function seg(options, current, cb) {
    var s = el('div', 'seg');
    options.forEach(function (o) {
      var b = el('button', o.value === current ? 'on' : '', o.label);
      b.addEventListener('click', function () {
        s.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        cb(o.value);
      });
      s.appendChild(b);
    });
    return s;
  }

  var TABS = [
    {
      id: 'general', name: 'Общие',
      svg: '<g fill="none" stroke="currentColor"><circle cx="8" cy="8" r="2.2" stroke-width="1.3"/><path stroke-width="1.3" stroke-linecap="round" d="M8 2.4v1.5M8 12.1v1.5M2.4 8h1.5M12.1 8h1.5M4.1 4.1l1.06 1.06M10.84 10.84l1.06 1.06M11.9 4.1l-1.06 1.06M5.16 10.84L4.1 11.9"/><circle cx="8" cy="8" r="5.1" stroke-width="1.1" opacity=".45"/></g>'
    },
    {
      id: 'look', name: 'Оформление',
      svg: '<path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" d="M10.6 2.6 A3.6 3.6 0 1 0 13.4 5.4 L8 11 A2.2 2.2 0 1 1 5 8 Z"/>'
    },
    {
      id: 'search', name: 'Поиск',
      svg: '<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="7" cy="7" r="4.3"/><path d="M10.3 10.3 L13.6 13.6"/></g>'
    },
    {
      id: 'widgets', name: 'Виджеты',
      svg: '<g fill="none" stroke="currentColor" stroke-width="1.25"><rect x="2.4" y="2.4" width="4.7" height="4.7" rx="1.3"/><rect x="8.9" y="2.4" width="4.7" height="4.7" rx="1.3"/><rect x="2.4" y="8.9" width="4.7" height="4.7" rx="1.3"/><rect x="8.9" y="8.9" width="4.7" height="4.7" rx="1.3"/></g>'
    },
    {
      id: 'privacy', name: 'Приватность',
      svg: '<path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" d="M8 1.5 L13 3.5 V7.5 C13 11 10.8 13.4 8 14.5 C5.2 13.4 3 11 3 7.5 V3.5 Z"/>'
    },
    {
      id: 'about', name: 'О браузере',
      svg: '<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="8" cy="8" r="6.4"/><path d="M8 7.2 L8 11.3 M8 4.7 v.2"/></g>'
    }
  ];

  window.AeroSettings = {
    render: function (container, ctx) {
      ctx = ctx || {};
      var c = Store.get();
      container.innerHTML = '';

      var page = el('div', 'settings-page');
      var win = el('div', 'settings-window');

      var head = el('div', 'settings-head');
      head.appendChild(el('h1', null, 'Настройки'));
      head.appendChild(el('p', null, 'Aero — браузер в стиле Safari 27 (Golden Gate)'));
      win.appendChild(head);

      var tabs = el('div', 'settings-tabs');
      var body = el('div', 'settings-body');

      var state = { section: ctx.section || 'general' };

      TABS.forEach(function (t) {
        var b = el('button', 'stab' + (state.section === t.id ? ' on' : ''));
        b.type = 'button';
        var NS = 'http://www.w3.org/2000/svg';
        var s = document.createElementNS(NS, 'svg');
        s.setAttribute('viewBox', '0 0 16 16');
        s.innerHTML = t.svg;
        b.appendChild(s);
        b.appendChild(el('span', null, t.name));
        b.addEventListener('click', function () {
          state.section = t.id;
          tabs.querySelectorAll('.stab').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          renderSection();
        });
        tabs.appendChild(b);
      });

      function renderSection() {
        body.innerHTML = '';
        var sec = el('div', 'settings-section');
        var fn = SECTIONS[state.section] || SECTIONS.general;
        fn(sec, rerender);
        body.appendChild(sec);
        body.scrollTop = 0;
        function rerender() {
          renderSection();
          if (ctx.onSettingsChanged) ctx.onSettingsChanged();
        }
      }

      var SECTIONS = {
        general: function (sec, rerender) {
          sec.appendChild(el('h2', null, 'Поисковая система по умолчанию'));
          var names = Object.keys(Store.engines);
          var cur = el('select', 'inp');
          names.forEach(function (k) {
            var o = el('option', null, Store.engines[k].name);
            o.value = k;
            cur.appendChild(o);
          });
          cur.value = c.searchEngine;
          cur.addEventListener('change', function () { Store.update({ searchEngine: cur.value }); rerender(); });
          sec.appendChild(row('Движок поиска', 'Используется в адресной строке и на новой вкладке', cur));

          sec.appendChild(el('h2', null, 'Запуск'));
          sec.appendChild(row('Открывать новую вкладку при запуске', 'Показывать страницу виджетов вместо восстановления сессии', toggleBtn(c.homeOnStartup !== false, function (v) { Store.update({ homeOnStartup: v }); })));

          sec.appendChild(el('h2', null, 'Вкладки'));
          sec.appendChild(row('Компактные вкладки', 'Заголовок виден только на активной вкладке — как в Safari', toggleBtn(c.compactTabs, function (v) {
            Store.update({ compactTabs: v });
            document.documentElement.setAttribute('data-compact-tabs', v ? 'on' : 'off');
          })));
        },

        look: function (sec, rerender) {
          sec.appendChild(el('h2', null, 'Тема'));
          sec.appendChild(el('p', 'hint', 'Тёмная тема включена по умолчанию. «Авто» следует системным настройкам Windows.'));
          sec.appendChild(row('Режим оформления', null, seg([
            { value: 'dark', label: 'Тёмная' },
            { value: 'light', label: 'Светлая' },
            { value: 'auto', label: 'Авто' }
          ], c.theme, function (v) { Store.update({ theme: v }); Store.applyTheme(); rerender(); })));

          sec.appendChild(el('h2', null, 'Акцентный цвет'));
          var acc = el('div', 'accent-row');
          Object.keys(Store.accents).forEach(function (k) {
            var b = el('button', 'acc-swatch' + (c.accent === k ? ' sel' : ''));
            b.type = 'button';
            b.style.background = Store.accents[k].dark;
            b.title = { safari: 'Safari', orange: 'Оранжевый', green: 'Зелёный', pink: 'Розовый', graphite: 'Графитовый' }[k] || k;
            b.addEventListener('click', function () {
              Store.update({ accent: k });
              Store.applyTheme();
              acc.querySelectorAll('.acc-swatch').forEach(function (x) { x.classList.remove('sel'); });
              b.classList.add('sel');
              rerender();
            });
            acc.appendChild(b);
          });
          sec.appendChild(acc);

          sec.appendChild(el('h2', null, 'Эффекты'));
          sec.appendChild(row('Интенсивность стекла', 'Сила размытия liquid glass', seg([
            { value: 'low', label: 'Низкая' },
            { value: 'medium', label: 'Средняя' },
            { value: 'high', label: 'Высокая' }
          ], c.glass, function (v) { Store.update({ glass: v }); Store.applyTheme(); })));
          sec.appendChild(row('Анимации', 'Плавные переходы вкладок и виджетов', toggleBtn(c.animations, function (v) {
            Store.update({ animations: v }); Store.applyTheme();
          })));
        },

        search: function (sec, rerender) {
          sec.appendChild(el('h2', null, 'Поисковые системы'));
          Object.keys(Store.engines).forEach(function (k) {
            var e = Store.engines[k];
            var r = el('div', 'field-row');
            r.style.cursor = 'pointer';
            var l = el('div');
            l.appendChild(el('div', 'field-label', e.name));
            l.appendChild(el('div', 'field-sub', e.domain));
            r.appendChild(l);
            r.appendChild(seg([{ value: k, label: c.searchEngine === k ? 'Выбран' : 'Выбрать' }], k === c.searchEngine ? k : '__none', function (v) {
              Store.update({ searchEngine: v });
              rerender();
            }));
            r.addEventListener('click', function () {
              Store.update({ searchEngine: k });
              rerender();
            });
            sec.appendChild(r);
          });
          sec.appendChild(el('h2', null, 'Подсказки'));
          sec.appendChild(row('Предлагать историю и ссылки', 'В адресной строке и на новой вкладке', toggleBtn(c.suggestHistory, function (v) { Store.update({ suggestHistory: v }); })));
        },

        widgets: function (sec, rerender) {
          sec.appendChild(el('h2', null, 'Виджеты новой вкладки'));
          sec.appendChild(el('p', 'hint', 'Фон, раскладка и все виджеты — как в отдельной панели настроек виджетов.'));
          var holder = el('div');
          sec.appendChild(holder);
          window.AeroWidgetsSettings.render(holder, {
            refresh: function () { if (ctx.onSettingsChanged) ctx.onSettingsChanged(); }
          });
        },

        privacy: function (sec, rerender) {
          sec.appendChild(el('h2', null, 'История'));
          sec.appendChild(row('Сохранять историю посещений', 'Используется для подсказок в адресной строке', toggleBtn(c.keepHistory, function (v) { Store.update({ keepHistory: v }); })));
          var bHist = el('button', 'btn-danger', 'Очистить историю');
          bHist.addEventListener('click', function () {
            Store.history.clear();
            if (window.AeroUI && window.AeroUI.toast) window.AeroUI.toast('История очищена');
            rerender();
          });
          var rowH = el('div', 'field-row');
          rowH.appendChild(Object.assign(el('div'), { innerHTML: '<div class="field-label">История браузера</div><div class="field-sub">Хранится локально на этом устройстве</div>' }));
          rowH.appendChild(bHist);
          sec.appendChild(rowH);

          sec.appendChild(el('h2', null, 'Данные сайтов'));
          var bData = el('button', 'btn-danger', 'Очистить кэш и данные сайтов');
          bData.addEventListener('click', function () {
            if (window.electronAPI && window.electronAPI.clearBrowsingData) {
              window.electronAPI.clearBrowsingData().then(function (ok) {
                if (window.AeroUI && window.AeroUI.toast) window.AeroUI.toast(ok ? 'Данные сайтов очищены' : 'Не удалось очистить');
              });
            } else {
              if (window.AeroUI && window.AeroUI.toast) window.AeroUI.toast('Доступно только в приложении Aero');
            }
          });
          var rowD = el('div', 'field-row');
          rowD.appendChild(Object.assign(el('div'), { innerHTML: '<div class="field-label">Кэш, cookies, localStorage</div><div class="field-sub">Данные Aero и настроек не будут затронуты</div>' }));
          rowD.appendChild(bData);
          sec.appendChild(rowD);

          sec.appendChild(el('h2', null, 'При выходе'));
          sec.appendChild(row('Очищать данные при закрытии', 'Кэш и данные сайтов удаляются при выходе', toggleBtn(c.clearOnExit, function (v) { Store.update({ clearOnExit: v }); })));
        },

        about: function (sec) {
          var card = el('div', 'about-card');
          var logo = el('div', 'about-logo');
          var img = el('img');
          img.src = 'icon.png';
          img.alt = 'Aero';
          logo.appendChild(img);
          card.appendChild(logo);
          var info = el('div');
          info.appendChild(el('div', 'about-name', 'Aero'));
          info.appendChild(el('div', 'about-ver', 'Версия ' + (window.AeroUI && window.AeroUI.version ? window.AeroUI.version : '2.3.12')));
          info.appendChild(el('div', 'about-line',
            'Интерфейс в стиле Safari 27 (Golden Gate / macOS Tahoe).\n' +
            'Движок: ' + (navigator.userAgent.indexOf('Firefox') !== -1 ? 'Gecko' : 'Chromium') +
            ' · Рендеринг: ' + (window.electronAPI ? 'webview (Chromium)' : 'iframe (веб-режим)') + '.\n' +
            'Aero не связана с Apple Inc. Safari — торговая марка Apple.'));
          info.appendChild(el('div', 'about-line', 'Сделано с любовью к деталям.'));
          card.appendChild(info);
          sec.appendChild(card);

          sec.appendChild(el('h2', null, 'Данные и резервные копии'));
          var r1 = el('div', 'field-row');
          var l1 = el('div');
          l1.appendChild(el('div', 'field-label', 'Экспорт настроек'));
          l1.appendChild(el('div', 'field-sub', 'Скачать файл конфигурации JSON'));
          r1.appendChild(l1);
          var bExp = el('button', 'nt-btn', 'Экспорт');
          bExp.addEventListener('click', function () {
            var blob = new Blob([Store.exportJSON()], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'aero-settings.json';
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
            if (window.AeroUI && window.AeroUI.toast) window.AeroUI.toast('Настройки экспортированы');
          });
          r1.appendChild(bExp);
          sec.appendChild(r1);

          var r2 = el('div', 'field-row');
          var l2 = el('div');
          l2.appendChild(el('div', 'field-label', 'Импорт настроек'));
          l2.appendChild(el('div', 'field-sub', 'Загрузить конфигурацию из файла'));
          r2.appendChild(l2);
          var fileIn = el('input');
          fileIn.type = 'file'; fileIn.accept = 'application/json'; fileIn.style.display = 'none';
          var bImp = el('button', 'nt-btn', 'Импорт');
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
          r2.appendChild(bImp);
          r2.appendChild(fileIn);
          sec.appendChild(r2);
        }
      };

      win.appendChild(tabs);
      win.appendChild(body);
      page.appendChild(win);
      container.appendChild(page);
      page.classList.add('view-entrance');
      renderSection();
    }
  };
})();
