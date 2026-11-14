'use strict';

/* ============================================================================
   Aera 2.0 — флаги движка Chromium.
   Применяются ДО app.ready: скорость (GPU-растеризация, zero-copy,
   декодирование видео на GPU, процесс на сайт), низкое потребление ОЗУ
   и скрытие следов автоматизации (anti-bot).
   ============================================================================ */

const { app } = require('electron');

function append(name, value) {
  try { app.commandLine.appendSwitch(name, value); } catch (e) { /* noop */ }
}

function applyBootFlags(settings) {
  const s = settings || {};

  // Аппаратное ускорение можно отключить в настройках (вступает в силу после перезапуска).
  if (s.hwAccel === false) {
    try { app.disableHardwareAcceleration(); } catch (e) { /* noop */ }
  }

  // Anti-bot: сайты (в первую очередь Google) не должны видеть признак автоматизации.
  append('disable-blink-features', 'AutomationControlled');

  // Тёмная тема сайтов: функция нужна, чтобы Emulation.setAutoDarkModeOverride
  // мог мгновенно включать/выключать перекраску без перезапуска браузера.
  append('enable-features', 'WebContentsForceDark');

  // --- скорость рендеринга ---
  append('enable-gpu-rasterization');
  append('enable-zero-copy');
  append('ignore-gpu-blocklist');
  append('enable-accelerated-video-decode');

  // --- низкое потребление ОЗУ: процесс на сайт, ограничение числа рендереров ---
  append('process-per-site');
  append('renderer-process-limit', '6');
  // Ограничение кучи V8 в рендерерах: сайты не могут съесть всю ОЗУ.
  // 512 МБ на процесс — безопасный минимум, при котором тяжёлые SPA не падают.
  append('js-flags', '--max-old-space-size=512');

  // --- отклик вкладок и кэш ---
  append('disable-renderer-backgrounding');
  append('disk-cache-size', '157286400');
  append('disable-features', 'CalculateNativeWinOcclusion');

  // --- фоновый мусор движка: синк, компоненты, метрика, пинги ---
  append('disable-background-networking');
  append('disable-component-update');
  append('disable-sync');
  append('metrics-recording-only');
  append('no-pings');
}

module.exports = { applyBootFlags };
