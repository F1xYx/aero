'use strict';

/* ============================================================================
   Aera 2.0 — панель настроек: заполнение, обработчики, «о программе».
   ============================================================================ */

(function () {
  const A = window.Aera;
  const el = A.el;
  const drawer = el.settingsDrawer;

  /** Закрашивает пройденную часть слайдера через CSS-переменную --fill. */
  function paintRangeFill(input) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const v = Number(input.value) || min;
    const pct = ((v - min) / (max - min)) * 100;
    input.style.setProperty('--fill', pct + '%');
  }
  A.paintRangeFill = paintRangeFill;

  A.settingsUI = {
    fill() {
      drawer.querySelectorAll('#segTheme button').forEach((b) => {
        b.classList.toggle('active', b.dataset.v === A.settings.theme);
      });
      drawer.querySelectorAll('#setSiteTheme button').forEach((b) => {
        b.classList.toggle('active', b.dataset.v === (A.settings.siteTheme || 'system'));
      });
      drawer.querySelectorAll('#segStartup button').forEach((b) => {
        b.classList.toggle('active', b.dataset.v === (A.settings.startup || 'restore'));
      });
      drawer.querySelectorAll('#accentDots .dot').forEach((d) => {
        d.classList.toggle('active', d.dataset.v === A.settings.accent);
      });
      const glass = document.getElementById('setGlass');
      if (glass) glass.checked = A.settings.glass !== false;
      const anim = document.getElementById('setAnimations');
      if (anim) anim.checked = !!A.settings.animations;
      const scaleInput = document.getElementById('setUiScale');
      if (scaleInput) {
        scaleInput.value = String(A.settings.uiScale);
        paintRangeFill(scaleInput);
        document.getElementById('uiScaleVal').textContent = Math.round((Number(A.settings.uiScale) || 1) * 100) + '%';
      }
      const zoomInput = document.getElementById('setPageZoom');
      if (zoomInput) {
        zoomInput.value = String(A.settings.pageZoom);
        paintRangeFill(zoomInput);
        document.getElementById('pageZoomVal').textContent = Math.round((Number(A.settings.pageZoom) || 1) * 100) + '%';
      }
      drawer.querySelectorAll('#wallpapers .wp').forEach((w) => {
        w.classList.toggle('active', w.dataset.v === A.settings.wallpaper);
      });
      drawer.querySelectorAll('#engineOpts .eng-chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.v === A.settings.engine);
      });
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
    }
  };
  const fill = A.settingsUI.fill;

  /* ============================ обработчики ============================ */
  drawer.querySelectorAll('#segTheme button').forEach((b) => {
    b.addEventListener('click', () => {
      A.settings.theme = b.dataset.v;
      A.saveSettings();
      A.applyTheme();
      fill();
    });
  });

  drawer.querySelectorAll('#setSiteTheme button').forEach((b) => {
    b.addEventListener('click', () => {
      A.settings.siteTheme = b.dataset.v;
      A.saveSettings();
      A.applySiteDark();
      fill();
      A.toast(b.dataset.v === 'force-dark'
        ? 'Все сайты будут тёмными'
        : b.dataset.v === 'light'
          ? 'Сайты всегда светлые'
          : 'Сайты следуют теме системы');
    });
  });

  drawer.querySelectorAll('#segStartup button').forEach((b) => {
    b.addEventListener('click', () => {
      A.settings.startup = b.dataset.v;
      A.saveSettings();
      fill();
    });
  });

  drawer.querySelectorAll('#accentDots .dot').forEach((d) => {
    d.addEventListener('click', () => {
      A.settings.accent = d.dataset.v;
      A.saveSettings();
      A.applyAccent();
      fill();
      A.broadcastNewtab({ __zaeraaccent: A.settings.accent });
    });
  });

  const glassInput = document.getElementById('setGlass');
  if (glassInput) {
    glassInput.addEventListener('change', (e) => {
      A.settings.glass = e.target.checked ? 'high' : false;
      A.saveSettings();
      A.applyGlass();
      /* синхронизируем в основной Store — data-glass и парящий хром
         применяются к окну даже после перезапуска */
      try { if (window.AeroStore && AeroStore.update) AeroStore.update({ glass: A.settings.glass }); } catch (err) { /* noop */ }
      A.toast(e.target.checked ? 'Стекло включено' : 'Стекло выключено');
    });
  }

  const animInput = document.getElementById('setAnimations');
  if (animInput) {
    animInput.addEventListener('change', (e) => {
      A.settings.animations = e.target.checked;
      A.saveSettings();
      A.applyAnimations();
      A.toast(e.target.checked ? 'Анимации включены' : 'Анимации выключены');
    });
  }

  const scaleInput = document.getElementById('setUiScale');
  if (scaleInput) {
    scaleInput.addEventListener('input', (e) => {
      A.settings.uiScale = A.clamp(Number(e.target.value) || 1, 0.8, 1.3);
      document.getElementById('uiScaleVal').textContent = Math.round(A.settings.uiScale * 100) + '%';
      paintRangeFill(e.target);
      A.saveSettings();
      A.applyUiScale();
    });
  }

  const zoomInput = document.getElementById('setPageZoom');
  if (zoomInput) {
    zoomInput.addEventListener('input', (e) => {
      A.settings.pageZoom = A.clamp(Number(e.target.value) || 1, 0.5, 2);
      document.getElementById('pageZoomVal').textContent = Math.round(A.settings.pageZoom * 100) + '%';
      paintRangeFill(e.target);
      A.saveSettings();
      A.applyPageZoom();
    });
  }

  const homeInput = document.getElementById('setHome');
  if (homeInput) {
    homeInput.addEventListener('change', () => {
      let v = String(homeInput.value || '').trim();
      if (!v || /(^|\/)newtab\.html([?#].*)?$/i.test(v)) v = 'newtab.html';
      A.settings.home = v;
      A.saveSettings();
      A.syncPreconnect();
      A.toast('Домашняя страница обновлена');
    });
  }

  drawer.querySelectorAll('#wallpapers .wp').forEach((w) => {
    w.addEventListener('click', () => {
      if (w.dataset.v === 'custom' && !A.LS.get('zwallpaper', null)) {
        document.getElementById('wpFile').click();
        return;
      }
      A.settings.wallpaper = w.dataset.v;
      A.saveSettings();
      fill();
      A.applyWallpaper();
      A.broadcastNewtab({ __zaerawallpaper: A.settings.wallpaper });
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
          A.settings.wallpaper = 'custom';
          A.saveSettings();
          fill();
          A.applyWallpaper();
          A.broadcastNewtab({ __zaerawallpaper: 'custom' });
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
      A.settings.wallpaper = 'sunset';
      A.saveSettings();
      fill();
      A.applyWallpaper();
      A.broadcastNewtab({ __zaerawallpaper: 'sunset' });
      A.toast('Фото сброшено — пресет «Закат»');
    });
  }

  drawer.querySelectorAll('#engineOpts .eng-chip').forEach((c) => {
    c.addEventListener('click', () => {
      A.settings.engine = c.dataset.v;
      A.saveSettings();
      fill();
      A.addr.syncAddressUI();
      A.syncPreconnect();
      A.broadcastNewtab({ __zaeraengine: A.settings.engine });
      A.toast('Поисковик: ' + A.engine().name);
    });
  });

  const bindSwitch = (id, key, after) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('change', (e) => {
      A.settings[key] = e.target.checked;
      A.saveSettings();
      if (after) after(e.target.checked);
    });
  };

  bindSwitch('setSuggest', 'suggest');
  bindSwitch('setNewtabAfter', 'newtabAfterActive');
  bindSwitch('setDblClose', 'dblCloseTab');
  bindSwitch('setWheelTabs', 'wheelTabs');
  bindSwitch('setShowBookmarks', 'showBookmarks', () => A.bookmarks.render());
  bindSwitch('setDownloadsAsk', 'downloadsAsk', () => A.applyDownloadsAsk());
  bindSwitch('setSaveHistory', 'saveHistory', (v) => A.toast(v ? 'История сохраняется' : 'История не сохраняется'));
  bindSwitch('setAdBlock', 'adBlock', (v) => {
    A.applyAdBlock();
    A.toast(v ? 'Реклама и трекеры блокируются' : 'Блокировка рекламы выключена');
  });
  bindSwitch('setHwAccel', 'hwAccel', (v) => A.pushSettingsNow());
  bindSwitch('setHibernate', 'hibernate');

  /* ---- центр защиты ---- */
  bindSwitch('setHttpsOnly', 'httpsOnly', (v) => {
    A.pushSettingsNow();
    A.toast(v ? 'HTTPS-only включён — небезопасные сайты переезжают на https' : 'HTTPS-only выключен');
  });
  bindSwitch('setDnt', 'dnt', (v) => {
    A.pushSettingsNow();
    A.toast(v ? 'Сайтам отправляется Do Not Track' : 'Do Not Track выключен');
  });
  bindSwitch('setTightReferrer', 'tightReferrer', (v) => {
    A.pushSettingsNow();
    A.toast(v ? 'Адрес источника больше не утекает сторонним сайтам' : 'Передача адреса источника включена');
  });
  bindSwitch('setBlock3p', 'block3p', (v) => {
    A.pushSettingsNow();
    A.toast(v ? 'Сторонние cookie блокируются' : 'Сторонние cookie разрешены');
  });

  const protectAllBtn = document.getElementById('btnProtectAll');
  if (protectAllBtn) {
    protectAllBtn.addEventListener('click', () => {
      A.settings.adBlock = true;
      A.settings.httpsOnly = true;
      A.settings.dnt = true;
      A.settings.tightReferrer = true;
      A.settings.block3p = true;
      A.saveSettings();
      A.pushSettingsNow();
      A.applyAdBlock();
      fill();
      A.broadcastNewtab({ __zaerasecurity: true });
      A.toast('Максимальная защита включена');
    });
  }

  const openDl = document.getElementById('setOpenDownloads');
  if (openDl) {
    openDl.addEventListener('click', async () => {
      if (A.DESKTOP) {
        try {
          const ok = await window.zdesktop.openDownloadsFolder();
          if (!ok) A.toast('Не удалось открыть папку', 'warn');
        } catch (e) { /* noop */ }
      } else {
        A.toast('Доступно только в приложении', 'warn');
      }
    });
  }

  /* Очистка данных — с подтверждением. */
  let clearDataArmed = null;
  const btnClearData = document.getElementById('btnClearData');
  if (btnClearData) {
    btnClearData.addEventListener('click', async () => {
      if (clearDataArmed) {
        clearTimeout(clearDataArmed);
        clearDataArmed = null;
        btnClearData.classList.remove('armed');
        btnClearData.textContent = 'Очистить';
        await doClearBrowsingData();
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

  async function doClearBrowsingData() {
    let ok = true;
    if (A.DESKTOP) {
      try { ok = !!(await window.zdesktop.clearBrowsingData()); } catch (e) { ok = false; }
    }
    A.LS.set('zhistory', []);
    A.LS.set('zsession', { tabs: [], active: 0 });
    if (A.WEB) {
      try { await fetch('/api/history', { method: 'DELETE' }); } catch (e) { /* noop */ }
    }
    A.history.render(el.histSearch.value);
    A.toast(ok ? 'Данные браузера очищены' : 'Не удалось очистить часть данных', ok ? 'ok' : 'warn');
  }

  /* ============================ о программе + сборки ============================ */
  A.settingsUI.fillAbout = async function () {
    const vEl = document.getElementById('aboutVersion');
    const eEl = document.getElementById('aboutEngine');
    if (A.DESKTOP) {
      if (vEl) vEl.textContent = 'Aera ' + A.VERSION;
      try {
        const info = await window.zdesktop.info();
        if (eEl) eEl.textContent = 'Chromium ' + info.chrome + ' · Electron ' + info.electron + ' · Node ' + info.node;
        if (vEl) vEl.textContent = 'Aera ' + info.version;
      } catch (err) {
        if (eEl) eEl.textContent = 'Движок Chromium (Electron)';
      }
    } else {
      if (vEl) vEl.textContent = 'Aera ' + A.VERSION + ' — веб-версия (песочница)';
      if (eEl) eEl.textContent = 'Движок — ваш браузер';
      loadDlBuilds();
    }
  };

  async function loadDlBuilds() {
    const box = document.getElementById('dlBlock');
    if (!box) return;
    box.textContent = '';
    let builds = [];
    try {
      const r = await fetch('/api/desktop-builds');
      const j = await r.json();
      builds = Array.isArray(j.builds) ? j.builds : [];
    } catch (e) { /* нет ответа — заглушка */ }

    const title = document.createElement('div');
    title.className = 'dl-title';
    title.textContent = 'Скачать Aera для Windows';
    box.appendChild(title);

    if (!builds.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Сборки пока недоступны — загляните позже.';
      box.appendChild(empty);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'dl-btns';
    const setup = builds.find((b) => b.kind === 'setup');
    const portable = builds.find((b) => b.kind === 'portable');
    const mk = (b, label, primary) => {
      if (!b) return;
      const a = document.createElement('a');
      a.className = 'btn' + (primary ? ' primary dl-btn' : ' dl-btn');
      a.href = b.url;
      a.setAttribute('download', b.file || '');
      const name = document.createElement('span');
      name.textContent = label;
      const size = document.createElement('span');
      size.className = 'dl-size';
      size.textContent = (Number(b.sizeMb) || 0) + ' МБ';
      a.appendChild(name);
      a.appendChild(size);
      wrap.appendChild(a);
    };
    mk(setup, 'Установщик', true);
    mk(portable, 'Портативная', false);
    box.appendChild(wrap);
  }

})();
