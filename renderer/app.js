'use strict';

/* ============================================================================
   Aera 2.0 — точка входа рендерера: порядок загрузки модулей задаёт
   index.html, здесь — только запуск.
   ============================================================================ */

(function () {
  const A = window.Aera;

  function boot() {
    /* Применяем внешний вид до первого кадра. */
    A.applyAll();
    A.syncPreconnect();

    /* Данные и панели. */
    A.bookmarks.render();
    A.settingsUI.fill();
    A.paintRangeFill(document.getElementById('setUiScale'));
    A.paintRangeFill(document.getElementById('setPageZoom'));
    A.settingsUI.fillAbout();
    A.extensionsUI.init();
    A.passwordsUI.init();
    A.adblockStatsUI.init();

    if (A.WEB) {
      A.bookmarks.loadWeb();
      A.history.fetchWeb(true);
    } else {
      /* settings.json главнее localStorage — подтягиваем и применяем. */
      A.syncRemoteSettings();
    }

    /* Восстановление сессии (загружается только активная вкладка)
       или одна свежая вкладка. */
    let restored = false;
    if (A.settings.startup === 'restore') {
      restored = A.tabs.restoreSession();
    }
    if (!restored) {
      A.tabs.newTab();
      setTimeout(A.addr.focusAddress, 150);
    }
    A.tabs.renderTabs();
    A.updateDockCount();
  }

  boot();
})();
