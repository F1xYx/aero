'use strict';

/* ============================================================================
   Aera 2.0 — guest-preload (stealth).
   Выполняется В ГЛАВНОМ мире каждой webview-страницы ДО её скриптов:
   navigator.webdriver=false, честные plugins/languages, window.chrome,
   Permissions.query и WebGL — как у настоящего Google Chrome.
   В конце удаляет из главного мира остатки Node (require/process), чтобы
   страница не получила доступ к движку.
   ============================================================================ */

(function () {
  try {
    const nav = window.navigator;

    /* navigator.webdriver -> false */
    try { delete nav.webdriver; } catch (e) { /* noop */ }
    try {
      Object.defineProperty(nav, 'webdriver', {
        get: function () { return false; },
        configurable: true
      });
    } catch (e) { /* noop */ }

    /* языки как у настоящего Chrome */
    try {
      Object.defineProperty(nav, 'languages', {
        get: function () { return ['ru-RU', 'ru', 'en-US', 'en']; },
        configurable: true
      });
    } catch (e) { /* noop */ }
    try {
      Object.defineProperty(nav, 'language', {
        get: function () { return 'ru-RU'; },
        configurable: true
      });
    } catch (e) { /* noop */ }

    /* правдоподобные plugins/mimeTypes (PDF-пятёрка Chrome) */
    const pluginData = [
      { name: 'PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer', mime: 'application/pdf' },
      { name: 'Chrome PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer', mime: 'application/pdf' },
      { name: 'Chromium PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer', mime: 'application/pdf' },
      { name: 'Microsoft Edge PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer', mime: 'application/pdf' },
      { name: 'WebKit built-in PDF', description: 'Portable Document Format', filename: 'internal-pdf-viewer', mime: 'application/pdf' }
    ];

    function makePlugin(p) {
      const mime = { type: p.mime, suffixes: 'pdf', description: p.description };
      const plugin = {
        name: p.name,
        description: p.description,
        filename: p.filename,
        length: 1,
        0: mime
      };
      mime.enabledPlugin = plugin;
      plugin.item = function (i) { return i === 0 ? mime : null; };
      plugin.namedItem = function (n) { return n === p.mime ? mime : null; };
      return plugin;
    }

    const plugins = pluginData.map(makePlugin);
    const mimes = plugins.map(function (pl) { return pl[0]; });
    plugins.item = function (i) { return plugins[i] || null; };
    plugins.namedItem = function (n) {
      for (let i = 0; i < plugins.length; i++) {
        if (plugins[i].name === n) return plugins[i];
      }
      return null;
    };
    mimes.item = function (i) { return mimes[i] || null; };
    mimes.namedItem = function (n) {
      for (let i = 0; i < mimes.length; i++) {
        if (mimes[i].type === n) return mimes[i];
      }
      return null;
    };

    try {
      Object.defineProperty(nav, 'plugins', { get: function () { return plugins; }, configurable: true });
    } catch (e) { /* noop */ }
    try {
      Object.defineProperty(nav, 'mimeTypes', { get: function () { return mimes; }, configurable: true });
    } catch (e) { /* noop */ }

    /* window.chrome как у настоящего Chrome */
    try {
      if (!window.chrome) window.chrome = {};
      if (!window.chrome.runtime) window.chrome.runtime = {};
      if (!window.chrome.app) {
        window.chrome.app = {
          isInstalled: false,
          InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
          RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
          getDetails: function () { return null; },
          installState: function () { return 'not_installed'; }
        };
      }
    } catch (e) { /* noop */ }

    /* Permissions.query('notifications') — как в Chrome */
    try {
      const origQuery = window.Permissions && window.Permissions.prototype && window.Permissions.prototype.query;
      if (origQuery) {
        window.Permissions.prototype.query = function (desc) {
          if (desc && desc.name === 'notifications') {
            return Promise.resolve({
              state: window.Notification ? window.Notification.permission : 'prompt',
              name: 'notifications',
              onchange: null
            });
          }
          return origQuery.call(this, desc);
        };
      }
    } catch (e) { /* noop */ }

    /* WebGL vendor/renderer без признаков headless/свифтшейдера */
    try {
      const patchGL = function (proto) {
        if (!proto || !proto.getParameter) return;
        const orig = proto.getParameter;
        proto.getParameter = function (p) {
          if (p === 37445) return 'Intel Inc.';          // UNMASKED_VENDOR_WEBGL
          if (p === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
          return orig.call(this, p);
        };
      };
      if (window.WebGLRenderingContext) patchGL(window.WebGLRenderingContext.prototype);
      if (window.WebGL2RenderingContext) patchGL(window.WebGL2RenderingContext.prototype);
    } catch (e) { /* noop */ }
  } catch (e) { /* любая ошибка stealth не должна ломать страницу */ }

  /* ==================================================================
     МЕНЕДЖЕР ПАРОЛЕЙ: перехват отправки форм с паролем.
     ВАЖНО: выполняется ДО удаления require — потом ipcRenderer взять
     неоткуда. Сама ссылка живёт в замыкании, сайт её не видит.
     ================================================================== */
  try {
    const { ipcRenderer } = require('electron');

    function guessUsername(form, passInput) {
      try {
        const allInputs = Array.prototype.slice.call(form.querySelectorAll('input'));
        const inputs = allInputs.filter(function (inp) {
          const t = (inp.getAttribute('type') || 'text').toLowerCase();
          return t === 'email' || t === 'text' || t === 'tel';
        });
        // ближайший по DOM к полю пароля
        let best = null;
        let bestDist = Infinity;
        const passIdx = allInputs.indexOf(passInput);
        for (const inp of inputs) {
          if (inp === passInput || inp.disabled) continue;
          const name = (inp.name || inp.id || '').toLowerCase();
          if (/(pass|pwd|captcha|search)/.test(name)) continue;
          const dist = Math.abs(allInputs.indexOf(inp) - passIdx);
          if (dist < bestDist) { bestDist = dist; best = inp; }
        }
        return best ? String(best.value || '') : '';
      } catch (e) { return ''; }
    }

    document.addEventListener('submit', function (ev) {
      try {
        const form = ev.target;
        if (!form || !form.querySelectorAll) return;
        const passInput = form.querySelector('input[type="password"]');
        if (!passInput || !passInput.value) return;
        ipcRenderer.sendToHost('pw-capture', {
          url: String(window.location.href || ''),
          username: guessUsername(form, passInput),
          password: String(passInput.value || '')
        });
      } catch (e) { /* не ломаем отправку формы */ }
    }, true); // capture: ловим и формы, перехватывающие submit
  } catch (e) { /* ipcRenderer недоступен — работаем без менеджера паролей */ }

  /* Прячем остатки Node из главного мира страницы */
  try {
    const NODE_KEYS = ['require', 'module', 'exports', 'process', 'Buffer', 'global', 'setImmediate', 'clearImmediate'];
    for (let i = 0; i < NODE_KEYS.length; i++) {
      const k = NODE_KEYS[i];
      try { delete window[k]; } catch (e) {
        try { window[k] = undefined; } catch (e2) { /* noop */ }
      }
    }
  } catch (e) { /* noop */ }
})();
