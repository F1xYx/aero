'use strict';

/* ============================================================================
   Aera 2.0 — stealth для webview-гостей.
   Каждый webview получает guest-preload (src/preload/guest.js), который
   выполняется в ГЛАВНОМ мире страницы до её скриптов: navigator.webdriver,
   plugins, languages, window.chrome — всё выглядит как у настоящего Chrome.
   Node-модули странице недоступны (guest.js удаляет require/process).
   ============================================================================ */

const { GUEST_PRELOAD } = require('./config');

function applyWebviewPreferences(webPreferences) {
  webPreferences.preload = GUEST_PRELOAD;
  webPreferences.contextIsolation = false;
  webPreferences.nodeIntegration = false;
  webPreferences.sandbox = false;
}

module.exports = { applyWebviewPreferences };
