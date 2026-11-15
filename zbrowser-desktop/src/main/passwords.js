'use strict';

/* ============================================================================
   Aera 2.1 — менеджер паролей.
   ----------------------------------------------------------------------------
   Хранилище: userData/passwords.json. Пароли шифруются Electron safeStorage
   (Windows: DPAPI — привязано к учётной записи пользователя, другие
   пользователи и копии файла пароли не раскрывают).
   Возможности:
     • сохранение пар (site + username + password) вручную и при вводе на сайтах;
     • автозаполнение через контекстное меню webview;
     • генератор криптостойких паролей;
     • поиск, обновление, удаление.
   ============================================================================ */

const fs = require('fs');
const crypto = require('crypto');
const { safeStorage } = require('electron');
const store = require('./config');

const FILE = 'passwords.json';
let cache = null;

/* ---------- низкоуровневое ---------- */

function encAvailable() {
  try { return safeStorage && safeStorage.isEncryptionAvailable(); } catch (e) { return false; }
}

function encryptPlain(plain) {
  if (!encAvailable()) return { enc: false, data: String(plain) };
  try {
    return { enc: true, data: safeStorage.encryptString(String(plain)).toString('base64') };
  } catch (e) {
    return { enc: false, data: String(plain) };
  }
}

function decryptEntry(field) {
  if (!field || typeof field.data !== 'string') return '';
  if (field.enc !== true) return field.data;
  try {
    return safeStorage.decryptString(Buffer.from(field.data, 'base64'));
  } catch (e) { return ''; }
}

function load() {
  if (cache) return cache;
  let data = null;
  try { data = JSON.parse(fs.readFileSync(store.userDataFile(FILE), 'utf8')); } catch (e) { data = null; }
  if (!data || typeof data !== 'object' || !Array.isArray(data.entries)) data = { entries: [] };
  cache = data;
  return cache;
}

function save() {
  try {
    fs.writeFileSync(store.userDataFile(FILE), JSON.stringify(cache, null, 1), { mode: 0o600 });
  } catch (e) { /* диск недоступен — живём в памяти до перезапуска */ }
}

function hostOf(site) {
  try { return new URL(String(site)).hostname.replace(/^www\./i, '').toLowerCase(); } catch (e) {
    return String(site || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./i, '');
  }
}

/* ---------- публичный API ---------- */

/** Список без самих паролей (для UI). */
function list() {
  const { entries } = load();
  return entries.map((e) => ({
    id: e.id,
    site: e.site,
    username: e.username,
    ts: e.ts || 0,
    encrypted: !!(e.pass && e.pass.enc)
  }));
}

function findForSite(site) {
  const host = hostOf(site);
  if (!host) return [];
  const { entries } = load();
  return entries.filter((e) => e.site === host || host.endsWith('.' + e.site) || e.site.endsWith('.' + host));
}

function upsert({ site, username, password }) {
  const host = hostOf(site);
  const pass = String(password == null ? '' : password);
  if (!host || !pass) return { ok: false, error: 'Нужны сайт и пароль' };
  const { entries } = load();
  const user = String(username || '').trim();
  const existing = entries.find((e) => e.site === host && e.username === user);
  const sealed = encryptPlain(pass);
  if (existing) {
    existing.pass = sealed;
    existing.ts = Date.now();
  } else {
    entries.push({
      id: 'pw-' + crypto.randomBytes(6).toString('hex'),
      site: host,
      username: user,
      pass: sealed,
      ts: Date.now()
    });
  }
  save();
  return { ok: true, saved: true, site: host };
}

function remove(id) {
  const { entries } = load();
  const i = entries.findIndex((e) => e.id === id);
  if (i < 0) return { ok: false, error: 'Запись не найдена' };
  entries.splice(i, 1);
  save();
  return { ok: true };
}

/** Расшифровка одного пароля (для автозаполнения / кнопки «показать»). */
function reveal(id) {
  const { entries } = load();
  const e = entries.find((x) => x.id === id);
  if (!e) return { ok: false, error: 'Запись не найдена' };
  return { ok: true, site: e.site, username: e.username, password: decryptEntry(e.pass) };
}

/** Генератор пароля: буквы+цифры+символы без визуально двусмысленных. */
function generate(length) {
  const len = Math.min(64, Math.max(8, Number(length) || 16));
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*-_=+';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  // гарантированно по символу каждого класса
  const classes = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%^&*-_=+'];
  for (let i = 0; i < classes.length; i++) {
    const pos = (bytes[i] % len);
    out = out.slice(0, pos) + classes[i][bytes[i + 4] % classes[i].length] + out.slice(pos + 1);
  }
  return { ok: true, password: out };
}

module.exports = { list, findForSite, upsert, remove, reveal, generate, hostOf };
