'use strict';

/* ============================================================================
   Aera 2.0 — меню приложения и горячие клавиши.
   Все ускорители дублируются в рендерере ТОЛЬКО для веб-режима,
   чтобы на десктопе не сработать дважды.
   ============================================================================ */

const { Menu, dialog, app } = require('electron');
const state = require('./windowState');

function zoomBy(delta) {
  state.guestOp((g) => {
    const z = g.getZoomLevel();
    g.setZoomLevel(Math.min(5, Math.max(-3, z + delta)));
  });
}

function openDevTools() {
  state.guestOp((g) => {
    try { g.openDevTools({ mode: 'detach' }); } catch (e) { /* noop */ }
  });
}

function showAbout() {
  const w = state.getWin();
  if (!w) return;
  dialog.showMessageBox(w, {
    type: 'info',
    title: 'О Aera',
    message: 'Aera ' + app.getVersion(),
    detail: 'Полноценный браузер на движке Chromium.\n\nChromium ' + process.versions.chrome +
      '\nElectron ' + process.versions.electron + '\nNode ' + process.versions.node,
    buttons: ['Закрыть']
  });
}

function sendCmd(action) {
  state.sendToHost('cmd', action);
}

function buildMenu() {
  const template = [
    {
      label: 'Файл',
      submenu: [
        { label: 'Новая вкладка', accelerator: 'CmdOrCtrl+T', click: () => sendCmd('new-tab') },
        { label: 'Закрыть вкладку', accelerator: 'CmdOrCtrl+W', click: () => sendCmd('close-tab') },
        { label: 'Открыть закрытую вкладку', accelerator: 'CmdOrCtrl+Shift+T', click: () => sendCmd('reopen-tab') },
        { label: 'Новое окно инкогнито', accelerator: 'CmdOrCtrl+Shift+N', click: () => sendCmd('new-incognito') },
        { type: 'separator' },
        { label: 'Домашняя страница', accelerator: 'Alt+Home', click: () => sendCmd('home') },
        { type: 'separator' },
        { label: 'Выход', role: 'quit' }
      ]
    },
    {
      label: 'Правка',
      submenu: [
        { role: 'undo', label: 'Отменить' },
        { role: 'redo', label: 'Повторить' },
        { type: 'separator' },
        { role: 'cut', label: 'Вырезать' },
        { role: 'copy', label: 'Копировать' },
        { role: 'paste', label: 'Вставить' },
        { role: 'selectAll', label: 'Выбрать всё' }
      ]
    },
    {
      label: 'Вид',
      submenu: [
        { label: 'Обновить', accelerator: 'CmdOrCtrl+R', click: () => sendCmd('reload') },
        { label: 'Обновить (F5)', accelerator: 'F5', click: () => sendCmd('reload') },
        { type: 'separator' },
        { label: 'Найти на странице', accelerator: 'CmdOrCtrl+F', click: () => sendCmd('find') },
        { type: 'separator' },
        { label: 'Увеличить', accelerator: 'CmdOrCtrl+=', click: () => zoomBy(0.5) },
        { label: 'Уменьшить', accelerator: 'CmdOrCtrl+-', click: () => zoomBy(-0.5) },
        { label: 'Фактический размер', accelerator: 'CmdOrCtrl+0', click: () => state.guestOp((g) => g.setZoomLevel(0)) },
        { type: 'separator' },
        { label: 'Инструменты разработчика', accelerator: 'F12', click: () => openDevTools() },
        { label: 'Инструменты разработчика (Ctrl+Shift+I)', accelerator: 'CmdOrCtrl+Shift+I', click: () => openDevTools() },
        { type: 'separator' },
        { label: 'На весь экран', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'История',
      submenu: [
        { label: 'Назад', accelerator: 'Alt+Left', click: () => sendCmd('back') },
        { label: 'Вперёд', accelerator: 'Alt+Right', click: () => sendCmd('forward') },
        { type: 'separator' },
        { label: 'Открыть журнал истории', accelerator: 'CmdOrCtrl+Y', click: () => sendCmd('open-history') },
        { label: 'Загрузки', accelerator: 'CmdOrCtrl+J', click: () => sendCmd('open-downloads') },
        { label: 'Настройки', accelerator: 'CmdOrCtrl+,', click: () => sendCmd('open-settings') }
      ]
    },
    {
      label: 'Инструменты',
      submenu: [
        { label: 'Магазин расширений', accelerator: 'CmdOrCtrl+Shift+E', click: () => sendCmd('open-ext-store') },
        { label: 'Менеджер паролей', accelerator: 'CmdOrCtrl+Shift+P', click: () => sendCmd('open-passwords') },
        { type: 'separator' },
        { label: 'Блокировщик рекламы: вкл/выкл', click: () => sendCmd('toggle-adblock') }
      ]
    },
    {
      label: 'Вкладки и закладки',
      submenu: [
        { label: 'Следующая вкладка', accelerator: 'Ctrl+Tab', click: () => sendCmd('next-tab') },
        { label: 'Предыдущая вкладка', accelerator: 'Ctrl+Shift+Tab', click: () => sendCmd('prev-tab') },
        { type: 'separator' },
        { label: 'Добавить страницу в закладки', accelerator: 'CmdOrCtrl+D', click: () => sendCmd('bookmark') },
        { label: 'Показать панель закладок', accelerator: 'CmdOrCtrl+Shift+B', click: () => sendCmd('toggle-bookmarks') }
      ]
    },
    {
      label: 'Справка',
      submenu: [
        { label: 'О Aera', click: () => showAbout() }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { buildMenu, zoomBy, openDevTools, showAbout, sendCmd };
