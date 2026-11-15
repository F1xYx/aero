'use strict';

/* ============================================================================
   Aera 2.0 — разделяемое состояние главного процесса.
   Единственное окно браузера + последняя webview в фокусе.
   ============================================================================ */

let win = null;
let focusedGuest = null;

function getWin() { return win; }
function setWin(w) { win = w; }
function getFocusedGuest() { return focusedGuest; }
function setFocusedGuest(wc) { focusedGuest = wc; }

function sendToHost(channel, data) {
  const w = getWin();
  if (w && !w.isDestroyed()) {
    try { w.webContents.send(channel, data); } catch (e) { /* noop */ }
  }
}

function guestOp(fn) {
  const g = getFocusedGuest();
  if (g && !g.isDestroyed()) {
    try { fn(g); } catch (e) { /* noop */ }
  }
}

module.exports = { getWin, setWin, getFocusedGuest, setFocusedGuest, sendToHost, guestOp };
