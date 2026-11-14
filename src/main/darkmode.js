'use strict';

/* ============================================================================
   Aera 2.0 — тёмная тема сайтов (3 режима, без перезапуска).
   siteTheme:
     'system'     — сайты следуют теме системы (prefers-color-scheme);
     'force-dark' — ВСЕ сайты тёмные: подмена prefers-color-scheme + Chromium
                    перекрашивает сайты без собственной тёмной темы (Auto Dark);
     'light'      — сайты всегда светлые.
   Реализация: протокол отладчика (CDP) на каждый webview —
   Emulation.setEmulatedMedia + Emulation.setAutoDarkModeOverride.
   ============================================================================ */

const { nativeTheme, webContents } = require('electron');

let siteTheme = 'system';
const attached = new Set();

function desiredDark() {
  if (siteTheme === 'force-dark') return true;
  if (siteTheme === 'light') return false;
  return !!nativeTheme.shouldUseDarkColors;
}

function repaintWanted() {
  return siteTheme === 'force-dark';
}

function apply(wc) {
  if (!wc || wc.isDestroyed() || wc.getType() !== 'webview') return;
  try {
    const dbg = wc.debugger;
    if (!dbg.isAttached()) {
      dbg.attach('1.3');
      attached.add(wc.id);
      dbg.on('detach', () => { attached.delete(wc.id); });
    }
    if (!attached.has(wc.id)) return;
    dbg.sendCommand('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: desiredDark() ? 'dark' : 'light' }]
    }).catch(() => { /* noop */ });
    dbg.sendCommand('Emulation.setAutoDarkModeOverride', { enabled: repaintWanted() }).catch(() => { /* noop */ });
  } catch (e) { /* отладчик занят (открыт DevTools) — применится после закрытия */ }
}

function applyAll() {
  try {
    for (const wc of webContents.getAllWebContents()) apply(wc);
  } catch (e) { /* noop */ }
}

function setSiteTheme(v) {
  if (v !== 'system' && v !== 'force-dark' && v !== 'light') return;
  if (v === siteTheme) return;
  siteTheme = v;
  applyAll();
}

function init() {
  try { nativeTheme.on('updated', applyAll); } catch (e) { /* noop */ }
}

function guestBackground() {
  return nativeTheme.shouldUseDarkColors ? '#1c1c1e' : '#ffffff';
}

module.exports = { apply, applyAll, setSiteTheme, init, guestBackground, get siteTheme() { return siteTheme; } };
