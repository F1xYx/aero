'use strict';

/* ============================================================================
   Aera 2.0 — менеджер загрузок.
   Отслеживает каждую загрузку (прогресс, размер, путь, отмена) и толкает
   обновления в рендерер по каналу 'download-update'. Работает и для
   обычной сессии, и для инкогнито (install вызывается для каждой сессии).
   ============================================================================ */

const path = require('path');
const { app, shell } = require('electron');
const state = require('./windowState');

let ask = false;
let seq = 0;
const items = new Map(); // id -> { item, rec }

function safeName(name) {
  return String(name || 'file').replace(/[\\/:*?"<>|]/g, '_');
}

function push() {
  const w = state.getWin();
  if (!w || w.isDestroyed()) return;
  const list = [];
  for (const { rec } of items.values()) list.push(rec);
  try { w.webContents.send('download-update', list); } catch (e) { /* noop */ }
}

function hostToast(msg) {
  const w = state.getWin();
  if (w && !w.isDestroyed()) {
    try { w.webContents.send('download-toast', { msg }); } catch (e) { /* noop */ }
  }
}

function install(session) {
  session.on('will-download', (event, item) => {
    const id = 'dl-' + (++seq);
    if (!ask) {
      try {
        item.setSavePath(path.join(app.getPath('downloads'), safeName(item.getFilename())));
      } catch (e) { /* путь не задан — Electron сам покажет диалог сохранения */ }
    }
    const rec = {
      id,
      filename: item.getFilename(),
      url: item.getURL(),
      path: item.getSavePath() || null,
      size: item.getTotalBytes(),
      received: item.getReceivedBytes(),
      state: 'progressing',
      startedAt: Date.now()
    };
    items.set(id, { item, rec });
    push();
    hostToast('Загрузка началась: ' + rec.filename);

    item.on('updated', (e, st) => {
      rec.received = item.getReceivedBytes();
      rec.size = item.getTotalBytes();
      rec.path = item.getSavePath() || rec.path;
      rec.state = st === 'interrupted' ? 'interrupted' : 'progressing';
      push();
    });

    item.once('done', (e, st) => {
      rec.state = st; // completed | cancelled | interrupted
      rec.received = item.getReceivedBytes();
      rec.size = item.getTotalBytes();
      rec.path = item.getSavePath() || rec.path;
      push();
      if (st === 'completed') hostToast('Загрузка завершена: ' + rec.filename);
      else if (st === 'cancelled') hostToast('Загрузка отменена');
      else hostToast('Загрузка прервана');
    });
  });
}

function list() {
  const out = [];
  for (const { rec } of items.values()) out.push(rec);
  return out;
}

function openFile(id) {
  const e = items.get(id);
  if (!e || e.rec.state !== 'completed' || !e.rec.path) return false;
  try { shell.openPath(e.rec.path); return true; } catch (err) { return false; }
}

function showInFolder(id) {
  const e = items.get(id);
  if (!e || !e.rec.path) return false;
  try { shell.showItemInFolder(e.rec.path); return true; } catch (err) { return false; }
}

function cancel(id) {
  const e = items.get(id);
  if (!e || e.rec.state !== 'progressing') return false;
  try { e.item.cancel(); return true; } catch (err) { return false; }
}

function clearFinished() {
  for (const [id, e] of Array.from(items.entries())) {
    if (e.rec.state !== 'progressing') items.delete(id);
  }
  push();
}

function setAsk(v) { ask = !!v; }

module.exports = { install, list, openFile, showInFolder, cancel, clearFinished, setAsk };
