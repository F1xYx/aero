'use strict';

/* ============================================================================
   Aera 2.3 — отдельное окно настроек (рендерер).
   ----------------------------------------------------------------------------
   Собственная страница settings.html в отдельном BrowserWindow: тот же
   дизайн-код (style.css), те же секции, но:
   • изменения уходят в главный процесс ТОЧЕЧНЫМИ патчами (settings:patch) и
     мгновенно применяются в главном окне через settings-sync;
   • «Расширения» — полноценный магазин Chrome Web Store (каталог, живой
     поиск, установка по ID с прогрессом, менеджер установленных);
   • «Пароли» — полноценный менеджер (список, поиск, правка, генератор);
   • работает поверх полноэкранного сайта — окно всегда доступно.
   Веб-превью (без zdesktop): служебные разделы показывают подсказки.
   ============================================================================ */

(function () {
  const A = window.Aera;
  const z = window.zdesktop || null;

  /* ============================ тосты ============================ */
  const toastsEl = document.getElementById('toasts');

  A.toast = function (msg, kind) {
    const k = kind || 'ok';
    if (!toastsEl) return;
    const item = document.createElement('div');
    item.className = 'toast' + (k === 'warn' ? ' t-warn' : '');
    const icon = document.createElement('span');
    icon.className = 't-icon';
    icon.innerHTML = k === 'warn' ? A.SVG.alert : A.SVG.check;
    const text = document.createElement('span');
    text.className = 't-text';
    text.textContent = String(msg || '');
    const line = document.createElement('span');
    line.className = 't-line';
    item.appendChild(icon);
    item.appendChild(text);
    item.appendChild(line);
    toastsEl.appendChild(item);
    while (toastsEl.children.length > 4) toastsEl.firstChild.remove();
    requestAnimationFrame(() => requestAnimationFrame(() => item.classList.add('show')));
    setTimeout(() => {
      item.classList.remove('show');
      setTimeout(() => { try { item.remove(); } catch (e) { /* noop */ } }, 340);
    }, 3500);
  };

  /* ============================ тема окна ============================ */
  function applyTheme() {
    const t = A.settings.theme === 'system' || A.settings.theme === 'dark' || A.settings.theme === 'light'
      ? A.settings.theme : 'light';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute('data-accent', A.settings.accent || 'azure');

    const wp = A.WALLPAPERS.includes(A.settings.wallpaper) ? A.settings.wallpaper : 'sunset';
    document.body.className = 'settings-page wp-' + (wp === 'custom' ? 'custom' : wp);
    if (wp === 'custom') {
      let data = null;
      try { data = A.LS.get('zwallpaper', null); } catch (e) { data = null; }
      if (data) document.body.style.setProperty('--wp-img', 'url("' + data + '")');
    } else {
      document.body.style.removeProperty('--wp-img');
    }
    updateCustomChip();
  }

  function updateCustomChip() {
    const chip = document.getElementById('wpCustomChip');
    if (!chip) return;
    let data = null;
    try { data = A.LS.get('zwallpaper', null); } catch (e) { data = null; }
    chip.style.backgroundImage = data ? 'url("' + data + '")' : 'none';
    chip.classList.toggle('img-set', !!data);
  }

  A.applyTheme = applyTheme;
  /* Единая точка применения изменений, приходящих по settings-sync
     (обработчик в 01-settings.js вызывает A.applyAll в обоих окнах). */
  A.applyAll = function () { applyTheme(); fill(); };

  /* ============================ заполнение контролов ============================ */
  function r2(v) { return Math.round(Number(v) * 100) / 100; }

  function fillSeg(idc, value) {
    const box = document.getElementById(idc);
    if (!box) return;
    const isNum = typeof value === 'number';
    box.querySelectorAll('button').forEach((b) => {
      const ok = isNum ? r2(b.dataset.v) === r2(value) : b.dataset.v === value;
      b.classList.toggle('active', ok);
    });
  }

  function fill() {
    fillSeg('segTheme', A.settings.theme);
    fillSeg('setSiteTheme', A.settings.siteTheme || 'system');
    fillSeg('segStartup', A.settings.startup || 'restore');
    fillSeg('segUiScale', A.settings.uiScale);
    fillSeg('segPageZoom', A.settings.pageZoom);
    document.querySelectorAll('#accentDots .dot').forEach((d) => {
      d.classList.toggle('active', d.dataset.v === A.settings.accent);
    });
    const glass = document.getElementById('setGlass');
    if (glass) glass.checked = A.settings.glass !== false;
    const anim = document.getElementById('setAnimations');
    if (anim) anim.checked = !!A.settings.animations;
    document.querySelectorAll('#wallpapers .wp-tile').forEach((w) => {
      w.classList.toggle('active', w.dataset.v === A.settings.wallpaper);
    });
    const eng = document.getElementById('setEngine');
    if (eng) eng.value = A.settings.engine;
    const map = {
      setSuggest: 'suggest',
      setNewtabAfter: 'newtabAfterActive',
      setDblClose: 'dblCloseTab',
      setWheelTabs: 'wheelTabs',
      setShowBookmarks: 'showBookmarks',
      setDownloadsAsk: 'downloadsAsk',
      setSaveHistory: 'saveHistory',
      setAdBlock: 'adBlock',
      setHwAccel: 'hwAccel',
      setHibernate: 'hibernate',
      setHttpsOnly: 'httpsOnly',
      setDnt: 'dnt',
      setTightReferrer: 'tightReferrer',
      setBlock3p: 'block3p'
    };
    Object.keys(map).forEach((idc) => {
      const input = document.getElementById(idc);
      if (input) input.checked = !!A.settings[map[idc]];
    });
    const home = document.getElementById('setHome');
    if (home && document.activeElement !== home) home.value = A.settings.home || 'newtab.html';
    updateCustomChip();
  }

  A.settingsUI = { fill };

  /* ============================ сохранение ============================ */
  /** Точечное сохранение: только изменённый ключ уходит в settings.json.
      Главный процесс разошлёт settings-sync обоим окнам. */
  function saveKey(key, value) {
    A.settings[key] = value;
    A.LS.set('zsettings', A.settings);
    if (z && z.settingsPatch) {
      try { z.settingsPatch({ [key]: value }); } catch (e) { /* noop */ }
  }
  }

  function saveAll() {
    A.LS.set('zsettings', A.settings);
    if (z && z.settingsPatch) {
      try { z.settingsPatch(JSON.parse(JSON.stringify(A.settings))); } catch (e) { /* noop */ }
    }
  }

  /* ============================ разделы ============================ */
  function showSection(secId) {
    const pane = document.getElementById(secId);
    if (!pane) return;
    const navBtn = document.querySelector('#setNav button[data-sec="' + secId + '"]');
    document.querySelectorAll('#setNav button[data-sec]').forEach((b) => {
      const on = b === navBtn;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    document.querySelectorAll('.set-pane').forEach((p) => {
      p.classList.toggle('on', p.id === secId);
    });
    const content = document.getElementById('setContent');
    if (content) content.scrollTop = 0;
  }

  document.getElementById('setNav').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-sec]');
    if (!btn) return;
    showSection(btn.dataset.sec);
  });

  /* ============================ окно: кнопки и Esc ============================ */
  function updateMaxIcon(max) {
    const btn = document.getElementById('stMax');
    if (!btn) return;
    btn.innerHTML = max
      ? '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1.5" y="3.5" width="7" height="7" rx="1.4"/><path d="M4 3.5V3a1.5 1.5 0 0 1 1.5-1.5H9A1.5 1.5 0 0 1 10.5 3v3.5A1.5 1.5 0 0 1 9 8h-.5"/></svg>'
      : '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1.5" y="1.5" width="9" height="9" rx="1.6"/></svg>';
  }

  if (z) {
    const stMin = document.getElementById('stMin');
    const stMax = document.getElementById('stMax');
    const stClose = document.getElementById('stClose');
    stMin.addEventListener('click', () => z.minimizeSettingsWindow());
    stMax.addEventListener('click', () => z.toggleMaxSettingsWindow());
    stClose.addEventListener('click', () => z.closeSettingsWindow());
    z.on('settings-win-state', (st) => updateMaxIcon(!!(st && st.maximized)));
    z.isMaxSettingsWindow().then((m) => updateMaxIcon(!!m)).catch(() => { /* noop */ });
    z.on('settings-win:show-section', (secId) => { if (typeof secId === 'string') showSection(secId); });
  } else {
    document.getElementById('stWincontrols').classList.add('hidden');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && z) {
      e.preventDefault();
      z.closeSettingsWindow();
    }
  });

  /* ============================ внешний вид ============================ */
  const bindSeg = (idc, apply) => {
    const box = document.getElementById(idc);
    if (!box) return;
    box.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        apply(b.dataset.v);
        fill();
      });
    });
  };

  bindSeg('segTheme', (v) => { saveKey('theme', v); applyTheme(); });
  bindSeg('setSiteTheme', (v) => {
    saveKey('siteTheme', v);
    A.toast(v === 'force-dark' ? 'Все сайты будут тёмными' : v === 'light' ? 'Сайты всегда светлые' : 'Сайты следуют теме системы');
  });
  bindSeg('segStartup', (v) => saveKey('startup', v));
  bindSeg('segUiScale', (v) => saveKey('uiScale', A.clamp(Number(v) || 1, 0.8, 1.3)));
  bindSeg('segPageZoom', (v) => saveKey('pageZoom', A.clamp(Number(v) || 1, 0.5, 2)));

  document.querySelectorAll('#accentDots .dot').forEach((d) => {
    d.addEventListener('click', () => {
      saveKey('accent', d.dataset.v);
      applyTheme();
      fill();
    });
  });

  const glassInput = document.getElementById('setGlass');
  if (glassInput) glassInput.addEventListener('change', (e) => {
    saveKey('glass', e.target.checked);
    A.toast(e.target.checked ? 'Стекло включено' : 'Стекло выключено');
  });

  const animInput = document.getElementById('setAnimations');
  if (animInput) animInput.addEventListener('change', (e) => {
    saveKey('animations', e.target.checked);
    A.toast(e.target.checked ? 'Анимации включены' : 'Анимации выключены');
  });

  const homeInput = document.getElementById('setHome');
  if (homeInput) homeInput.addEventListener('change', () => {
    let v = String(homeInput.value || '').trim();
    if (!v || /(^|\/)newtab\.html([?#].*)?$/i.test(v)) v = 'newtab.html';
    saveKey('home', v);
    A.toast('Домашняя страница обновлена');
  });

  /* --- обои --- */
  document.querySelectorAll('#wallpapers .wp-tile').forEach((w) => {
    w.addEventListener('click', () => {
      if (w.dataset.v === 'custom' && !A.LS.get('zwallpaper', null)) {
        document.getElementById('wpFile').click();
        return;
      }
      saveKey('wallpaper', w.dataset.v);
      applyTheme();
      fill();
      A.toast('Обои обновлены');
    });
  });

  const uploadBtn = document.getElementById('setUploadWp');
  if (uploadBtn) uploadBtn.addEventListener('click', () => document.getElementById('wpFile').click());

  const wpFile = document.getElementById('wpFile');
  if (wpFile) {
    wpFile.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const scale = Math.min(1, 1920 / (img.width || 1), 1200 / (img.height || 1));
          const w = Math.max(1, Math.round((img.width || 1) * scale));
          const h = Math.max(1, Math.round((img.height || 1) * scale));
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          let data = c.toDataURL('image/jpeg', 0.85);
          try {
            localStorage.setItem('zwallpaper', JSON.stringify(data));
          } catch (quotaErr) {
            const c2 = document.createElement('canvas');
            c2.width = Math.round(w * 0.62);
            c2.height = Math.round(h * 0.62);
            c2.getContext('2d').drawImage(img, 0, 0, c2.width, c2.height);
            data = c2.toDataURL('image/jpeg', 0.8);
            try {
              localStorage.setItem('zwallpaper', JSON.stringify(data));
            } catch (err2) {
              A.toast('Фото слишком большое для сохранения', 'warn');
              return;
            }
          }
          saveKey('wallpaper', 'custom');
          applyTheme();
          fill();
          A.toast('Обои обновлены — ваше фото');
        } catch (err) {
          A.toast('Не удалось обработать фото', 'warn');
        } finally {
          URL.revokeObjectURL(objectUrl);
          e.target.value = '';
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        e.target.value = '';
        A.toast('Файл не похож на изображение', 'warn');
      };
      img.src = objectUrl;
    });
  }

  const resetWp = document.getElementById('setResetWp');
  if (resetWp) {
    resetWp.addEventListener('click', () => {
      if (A.settings.wallpaper !== 'custom') {
        A.toast('Сейчас используются пресетные обои');
        return;
      }
      A.LS.remove('zwallpaper');
      saveKey('wallpaper', 'sunset');
      applyTheme();
      fill();
      A.toast('Фото сброшено — пресет «Закат»');
    });
  }

  /* --- поисковая система --- */
  const engSel = document.getElementById('setEngine');
  if (engSel) {
    engSel.addEventListener('change', () => {
      saveKey('engine', engSel.value);
      fill();
      A.toast('Поисковик изменён');
    });
  }

  /* --- переключатели --- */
  const bindSwitch = (id, key, after) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('change', (e) => {
      saveKey(key, e.target.checked);
      if (after) after(e.target.checked);
    });
  };

  bindSwitch('setSuggest', 'suggest');
  bindSwitch('setNewtabAfter', 'newtabAfterActive');
  bindSwitch('setDblClose', 'dblCloseTab');
  bindSwitch('setWheelTabs', 'wheelTabs');
  bindSwitch('setShowBookmarks', 'showBookmarks');
  bindSwitch('setDownloadsAsk', 'downloadsAsk');
  bindSwitch('setSaveHistory', 'saveHistory', (v) => A.toast(v ? 'История сохраняется' : 'История не сохраняется'));
  bindSwitch('setAdBlock', 'adBlock', (v) => A.toast(v ? 'Реклама и трекеры блокируются' : 'Блокировка рекламы выключена'));
  bindSwitch('setHwAccel', 'hwAccel', () => A.toast('Изменение применится после перезапуска Aera'));
  bindSwitch('setHibernate', 'hibernate');
  bindSwitch('setHttpsOnly', 'httpsOnly', (v) => A.toast(v ? 'HTTPS-only включён' : 'HTTPS-only выключен'));
  bindSwitch('setDnt', 'dnt', (v) => A.toast(v ? 'Сайтам отправляется Do Not Track' : 'Do Not Track выключен'));
  bindSwitch('setTightReferrer', 'tightReferrer', (v) => A.toast(v ? 'Адрес источника больше не утекает сторонним сайтам' : 'Передача адреса источника включена'));
  bindSwitch('setBlock3p', 'block3p', (v) => A.toast(v ? 'Сторонние cookie блокируются' : 'Сторонние cookie разрешены'));

  const protectAllBtn = document.getElementById('btnProtectAll');
  if (protectAllBtn) {
    protectAllBtn.addEventListener('click', () => {
      const on = !(A.settings.adBlock && A.settings.httpsOnly && A.settings.dnt && A.settings.tightReferrer && A.settings.block3p);
      A.settings.adBlock = on;
      A.settings.httpsOnly = on;
      A.settings.dnt = on;
      A.settings.tightReferrer = on;
      A.settings.block3p = on;
      saveAll();
      fill();
      A.toast(on ? 'Защита включена' : 'Защита отключена', on ? 'ok' : 'info');
    });
  }

  /* --- приватность: очистка данных --- */
  let clearDataArmed = null;
  const btnClearData = document.getElementById('btnClearData');
  if (btnClearData) {
    btnClearData.addEventListener('click', async () => {
      if (clearDataArmed) {
        clearTimeout(clearDataArmed);
        clearDataArmed = null;
        btnClearData.classList.remove('armed');
        btnClearData.textContent = 'Очистить';
        let ok = true;
        if (z) {
          try { ok = !!(await z.clearBrowsingData()); } catch (e) { ok = false; }
        }
        A.LS.set('zhistory', []);
        A.LS.set('zsession', { tabs: [], active: 0 });
        A.toast(ok ? 'Данные браузера очищены' : 'Не удалось очистить часть данных', ok ? 'ok' : 'warn');
        return;
      }
      btnClearData.classList.add('armed');
      btnClearData.textContent = 'Точно очистить?';
      clearDataArmed = setTimeout(() => {
        clearDataArmed = null;
        btnClearData.classList.remove('armed');
        btnClearData.textContent = 'Очистить';
      }, 4000);
    });
  }

  const openPw = document.getElementById('setOpenPasswords');
  if (openPw) openPw.addEventListener('click', () => showSection('secPasswords'));

  const openDl = document.getElementById('setOpenDownloads');
  if (openDl) {
    openDl.addEventListener('click', async () => {
      if (!z) { A.toast('Доступно только в приложении', 'warn'); return; }
      try {
        const ok = await z.openDownloadsFolder();
        if (!ok) A.toast('Не удалось открыть папку', 'warn');
      } catch (e) { /* noop */ }
    });
  }

  /* --- о программе --- */
  async function fillAbout() {
    const vEl = document.getElementById('aboutVersion');
    const eEl = document.getElementById('aboutEngine');
    if (z) {
      if (vEl) vEl.textContent = 'Версия ' + A.VERSION;
      try {
        const info = await z.info();
        if (eEl) eEl.textContent = 'Chromium ' + info.chrome + ' · Electron ' + info.electron + ' · Node ' + info.node;
        if (vEl) vEl.textContent = 'Версия ' + info.version;
      } catch (err) {
        if (eEl) eEl.textContent = 'Движок Chromium (Electron)';
      }
    } else {
      if (vEl) vEl.textContent = 'Версия ' + A.VERSION + ' — предпросмотр';
      if (eEl) eEl.textContent = 'Движок — ваш браузер';
    }
  }

  const ghBtn = document.getElementById('btnAboutGitHub');
  if (ghBtn) {
    ghBtn.addEventListener('click', () => {
      if (z) {
        try { z.openExternal('https://github.com/F1xYx/aera'); return; } catch (e) { /* noop */ }
      }
      try { window.open('https://github.com/F1xYx/aera', '_blank'); } catch (e) { /* noop */ }
    });
  }

  let resetArmed = null;
  const resetBtn = document.getElementById('btnResetSettings');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (resetArmed) {
        clearTimeout(resetArmed);
        resetArmed = null;
        resetBtn.classList.remove('armed');
        resetBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Сбросить настройки';
        A.settings = Object.assign({}, A.DEFAULT_SETTINGS);
        saveAll();
        applyTheme();
        fill();
        A.toast('Настройки сброшены к стандартным', 'ok');
        return;
      }
      resetBtn.classList.add('armed');
      resetBtn.textContent = 'Точно сбросить?';
      resetArmed = setTimeout(() => {
        resetArmed = null;
        resetBtn.classList.remove('armed');
        resetBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Сбросить настройки';
      }, 4000);
    });
  }

  /* ============================ статистика блокировщика ============================ */
  let lastBlockedCount = -1;
  function applyAdblockStats(data) {
    const countEl = document.getElementById('adblockBlocked');
    const topEl = document.getElementById('adblockTop');
    if (!countEl && !topEl) return;
    const blocked = data && Number(data.blocked) || 0;
    if (countEl && blocked !== lastBlockedCount) {
      countEl.textContent = blocked >= 1000 ? (blocked / 1000).toFixed(1) + 'K' : String(blocked);
      lastBlockedCount = blocked;
    }
    if (topEl) {
      const top = (data && Array.isArray(data.top) && data.top.length)
        ? 'Топ: ' + data.top.slice(0, 3).map((t) => t.host + ' (' + t.count + ')').join(', ')
        : 'Заблокированных запросов пока нет — откройте любой сайт';
      topEl.textContent = top;
    }
  }

  /* ============================ МЕНЕДЖЕР РАСШИРЕНИЙ ============================ */
  let extItems = [];

  function renderExtensions() {
    const box = document.getElementById('extList');
    if (!box) return;
    box.textContent = '';
    if (!extItems.length) {
      const empty = document.createElement('div');
      empty.className = 'ext-empty muted';
      empty.textContent = 'Расширений пока нет. Установите из магазина выше или загрузите папку с manifest.json.';
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
      ver.textContent = (ext.version ? 'v' + ext.version : '') + (ext.enabled === false ? ' · выключено' : '');
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
        try { await z.extensionToggle(ext.id); } catch (e) { /* noop */ }
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
        try { await z.extensionRemove(ext.id); } catch (e) { /* noop */ }
      });
      row.appendChild(del);

      box.appendChild(row);
    });
  }

  async function refreshExtensions() {
    if (!z) return;
    try {
      const j = await z.extensionsList();
      extItems = (j && Array.isArray(j.items)) ? j.items : [];
    } catch (e) { extItems = []; }
    renderExtensions();
    updateStoreButtons();
  }

  /* ============================ МАГАЗИН РАСШИРЕНИЙ ============================ */
  const storeGrid = document.getElementById('extStoreGrid');
  const storeStatus = document.getElementById('extStoreStatus');
  const storeSearchInput = document.getElementById('extStoreSearch');
  const storeIdInput = document.getElementById('extStoreId');
  const storeIdBtn = document.getElementById('extStoreInstallBtn');
  const installing = new Set();
  let storeSeq = 0;
  let lastStoreItems = [];

  const PHASE_LABELS = {
    download: 'Скачивание…',
    unpack: 'Распаковка…',
    load: 'Подключение…',
    done: 'Установлено'
  };

  function esc(s) { return String(s == null ? '' : s); }

  function isExtInstalled(cwsId) {
    return extItems.some((x) => x.id === cwsId || (x.cwsId && x.cwsId === cwsId));
  }

  function updateStoreButtons() {
    if (!storeGrid) return;
    storeGrid.querySelectorAll('.store-item[data-ext-id]').forEach((row) => {
      const id = row.dataset.extId;
      const btn = row.querySelector('.store-install');
      if (!btn || !id) return;
      if (installing.has(id)) {
        const item = lastStoreItems.find((x) => x.id === id);
        btn.textContent = (item && item.progressLabel) || 'Установка…';
        btn.disabled = true;
      } else if (isExtInstalled(id)) {
        btn.textContent = 'Установлено';
        btn.disabled = true;
      } else {
        btn.textContent = 'Установить';
        btn.disabled = false;
      }
    });
  }

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

  /* Живые иконки: карточки без картинки получают настоящую из CWS (og:image). */
  const iconCache = new Map();
  async function enrichStoreIcons(items) {
    if (!z) return;
    const pending = items.filter((it) => it.id && !it.icon && !iconCache.has(it.id));
    if (!pending.length) return;
    let idx = 0;
    const workers = Array.from({ length: Math.min(4, pending.length) }, async () => {
      while (idx < pending.length) {
        const item = pending[idx++];
        let url = null;
        try {
          const d = await z.extensionStoreDetail(item.id);
          url = (d && d.ok && d.ext && d.ext.icon) || null;
        } catch (e) { url = null; }
        iconCache.set(item.id, url);
        if (url) applyIconToDom(item.id, url);
      }
    });
    await Promise.all(workers);
  }

  function applyIconToDom(id, url) {
    if (!storeGrid) return;
    const row = storeGrid.querySelector('.store-item[data-ext-id="' + id + '"]');
    if (!row) return;
    const box = row.querySelector('.store-icon');
    if (!box || box.querySelector('img')) return;
    const item = lastStoreItems.find((x) => x.id === id);
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {
      img.remove();
      box.textContent = ((item && item.name) || '?').slice(0, 1).toUpperCase();
    };
    box.textContent = '';
    box.appendChild(img);
  }

  function withCachedIcons(items) {
    return (items || []).map((it) =>
      (!it.icon && it.id && iconCache.has(it.id))
        ? Object.assign({}, it, { icon: iconCache.get(it.id) })
        : it
    );
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
      row.dataset.extId = item.id || '';

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
      if (isExtInstalled(item.id)) { btn.textContent = 'Установлено'; btn.disabled = true; }
      if (installing.has(item.id)) { btn.textContent = (item && item.progressLabel) || 'Установка…'; btn.disabled = true; }
      btn.addEventListener('click', async () => {
        if (!z || installing.has(item.id)) return;
        installing.add(item.id);
        btn.disabled = true;
        btn.textContent = 'Установка…';
        try {
          const res = await z.extensionStoreInstall(item.id);
          if (res && res.ok) {
            A.toast('«' + ((res.ext && res.ext.name) || item.name) + '» установлено');
            notifyReloadNeeded();
          } else A.toast((res && res.error) || 'Ошибка установки', 'warn');
        } catch (e) {
          A.toast('Ошибка установки расширения', 'warn');
        } finally {
          installing.delete(item.id);
          refreshExtensions();
        }
      });
      row.appendChild(btn);
      storeGrid.appendChild(row);
    });
  }

  function notifyReloadNeeded() {
    A.toast('Обновите открытые сайты в браузере (Ctrl+R), чтобы расширение заработало');
  }

  async function loadStoreCatalog() {
    if (!z || !storeGrid) return;
    try {
      const j = await z.extensionStoreCatalog();
      lastStoreItems = withCachedIcons((j && Array.isArray(j.items)) ? j.items : []);
      renderStore(lastStoreItems, 'Каталог «Выбор Aera» · живой поиск по Chrome Web Store');
      enrichStoreIcons(lastStoreItems).catch(() => { /* noop */ });
    } catch (e) {
      renderStore([], 'Каталог недоступен');
    }
  }

  const runStoreSearch = A.debounce(async (q) => {
    if (!z || !storeGrid) return;
    const query = String(q || '').trim();
    const seq = ++storeSeq;
    if (!query) { loadStoreCatalog(); return; }
    storeStatus.textContent = 'Поиск «' + query + '» в Chrome Web Store…';
    try {
      const j = await z.extensionStoreSearch(query, 12);
      if (seq !== storeSeq) return;
      lastStoreItems = withCachedIcons((j && Array.isArray(j.items)) ? j.items : []);
      renderStore(lastStoreItems,
        j && j.offline
          ? 'Нет связи с Chrome Web Store — показан встроенный каталог'
          : 'Результаты Chrome Web Store · установка в один клик');
      enrichStoreIcons(lastStoreItems).catch(() => { /* noop */ });
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
      if (isExtInstalled(id)) {
        A.toast('Это расширение уже установлено');
        return;
      }
      installing.add(id);
      storeIdBtn.disabled = true;
      storeIdBtn.textContent = 'Установка…';
      try {
        const res = await z.extensionStoreInstall(id);
        if (res && res.ok) {
          A.toast('Расширение «' + ((res.ext && res.ext.name) || id) + '» установлено');
          storeIdInput.value = '';
          notifyReloadNeeded();
        } else {
          A.toast((res && res.error) || 'Ошибка установки', 'warn');
        }
      } catch (e) {
        A.toast('Ошибка установки расширения', 'warn');
      } finally {
        installing.delete(id);
        storeIdBtn.disabled = false;
        storeIdBtn.textContent = 'Установить по ID';
        refreshExtensions();
      }
    });
  }

  /* ============================ МЕНЕДЖЕР ПАРОЛЕЙ ============================ */
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
          const r = await z.pwReveal(p.id);
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
          const r = await z.pwReveal(p.id);
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
          const r = await z.pwReveal(p.id);
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
          await z.pwRemove(p.id);
          refreshPasswords();
          A.toast('Запись удалена');
        } catch (e) { /* noop */ }
      });
      row.appendChild(del);

      pwListBox.appendChild(row);
    });
  }

  async function refreshPasswords() {
    if (!z || !pwListBox) return;
    try {
      const j = await z.pwList();
      renderPasswords((j && Array.isArray(j.items)) ? j.items : []);
    } catch (e) { /* noop */ }
  }

  function passwordsInit() {
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
          const r = await z.pwGenerate(16);
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
            const r = await z.pwAdd(site, String(userI.value || '').trim(), pass);
            if (r && r.ok) {
              await z.pwRemove(old);
              pwEditingId = null;
              addBtn.textContent = 'Сохранить';
              A.toast('Запись для ' + (r.site || site) + ' обновлена');
              siteI.value = ''; userI.value = ''; passI.value = ''; passI.type = 'password';
              refreshPasswords();
            } else {
              A.toast((r && r.error) || 'Не удалось обновить', 'warn');
            }
            return;
          }
          const r = await z.pwAdd(site, String(userI.value || '').trim(), pass);
          if (r && r.ok) {
            A.toast('Пароль для ' + (r.site || site) + ' сохранён');
            siteI.value = ''; userI.value = ''; passI.value = ''; passI.type = 'password';
            refreshPasswords();
          } else {
            A.toast((r && r.error) || 'Не удалось сохранить', 'warn');
          }
        } catch (e) { /* noop */ }
      });
    }
  }

  /* ============================ синхронизация ============================ */
  if (z && z.on) {
    z.on('extensions-changed', () => refreshExtensions());
    z.on('extension-install-progress', (p) => {
      if (!p || !p.id || !lastStoreItems.length) return;
      const item = lastStoreItems.find((x) => x.id === p.id);
      if (!item) return;
      item.progressLabel = PHASE_LABELS[p.phase] || 'Установка…';
      updateStoreButtons();
    });
    z.on('adblock-stats', applyAdblockStats);
  }

  /* ============================ запуск ============================ */
  applyTheme();
  fill();
  fillAbout();

  if (z) {
    /* settings.json главнее localStorage — подтягиваем актуальные значения. */
    z.settingsGet().then((remote) => {
      if (!remote || typeof remote !== 'object') return;
      const before = JSON.stringify(A.settings);
      Object.keys(remote).forEach((k) => {
        if (k === 'exts') return;
        if (remote[k] !== undefined) A.settings[k] = remote[k];
      });
      if (JSON.stringify(A.settings) !== before) {
        A.LS.set('zsettings', A.settings);
        applyTheme();
        fill();
      }
    }).catch(() => { /* noop */ });

    refreshExtensions();
    passwordsInit();
    refreshPasswords();
    loadStoreCatalog();
    try { z.adblockStats().then(applyAdblockStats).catch(() => { /* noop */ }); } catch (e) { /* noop */ }
  } else {
    const st = document.getElementById('extStoreStatus');
    if (st) st.textContent = 'Предпросмотр: установка расширений доступна в приложении Aera для Windows';
  }

  /* Раздел из хэша (#secExtensions) — открытие сразу на нужной секции. */
  const hash = String(location.hash || '').replace('#', '');
  if (hash) setTimeout(() => showSection(hash), 60);

})();
