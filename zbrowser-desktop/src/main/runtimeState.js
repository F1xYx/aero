'use strict';

/* ============================================================================
   Aera 2.2 — runtime-флаги главного процесса (живое состояние).
   ============================================================================ */

let adBlock = true;
let downloadsAsk = false;

/* Центр защиты (2.2): по умолчанию включены безопасные надстройки. */
let httpsOnly = true;
let dnt = true;
let tightReferrer = true;
let block3p = false;

function setAdBlock(v) { adBlock = !!v; }
function isAdBlock() { return adBlock; }
function setDownloadsAsk(v) { downloadsAsk = !!v; }
function isDownloadsAsk() { return downloadsAsk; }

function setHttpsOnly(v) { httpsOnly = !!v; }
function isHttpsOnly() { return httpsOnly; }
function setDnt(v) { dnt = !!v; }
function isDnt() { return dnt; }
function setTightReferrer(v) { tightReferrer = !!v; }
function isTightReferrer() { return tightReferrer; }
function setBlock3p(v) { block3p = !!v; }
function isBlock3p() { return block3p; }

module.exports = {
  setAdBlock, isAdBlock, setDownloadsAsk, isDownloadsAsk,
  setHttpsOnly, isHttpsOnly,
  setDnt, isDnt,
  setTightReferrer, isTightReferrer,
  setBlock3p, isBlock3p
};
