'use strict';
/* Тест Ахо-Корасика из adblock.js: сравнение с наивной indexOf-семантикой. */

function acNode(ch) { return { ch, child: null, sib: null, fail: null, out: false }; }
function acChild(n, c) {
  let k = n.child;
  while (k && k.ch !== c) k = k.sib;
  return k;
}
function acBuild(patterns) {
  const root = acNode(0);
  root.fail = null;
  for (let pi = 0; pi < patterns.length; pi++) {
    const p = patterns[pi];
    let node = root;
    for (let i = 0; i < p.length; i++) {
      const c = p.charCodeAt(i);
      let kid = node.child;
      while (kid && kid.ch !== c) kid = kid.sib;
      if (!kid) { kid = acNode(c); kid.sib = node.child; node.child = kid; }
      node = kid;
    }
    node.out = true;
  }
  const q = [];
  for (let k = root.child; k; k = k.sib) { k.fail = root; q.push(k); }
  for (let qi = 0; qi < q.length; qi++) {
    const n = q[qi];
    for (let k = n.child; k; k = k.sib) {
      let f = n.fail;
      while (f && !acChild(f, k.ch)) f = f.fail;
      k.fail = f ? acChild(f, k.ch) : root;
      if (k.fail === k) k.fail = root;
      if (k.fail !== root && k.fail.out) k.out = true;
      q.push(k);
    }
  }
  return root;
}
function acMatch(root, hay) {
  let node = root;
  for (let i = 0; i < hay.length; i++) {
    const c = hay.charCodeAt(i);
    while (node !== root && !acChild(node, c)) node = node.fail;
    const k = acChild(node, c);
    node = k || root;
    if (node.out) return true;
  }
  return false;
}

/* ---- тесты ---- */
const patterns = [
  '-ad-300-', '&adtype=', '/ads/', 'banner', 'track', 'pixel.',
  'analytics.js', 'doubleclick', 'googletagmanager', '/pagead/', 'adserver',
  'popunder', 'clickid', 'aff_id=', 'utmal', 'yandex_metric', 'com/ad/'
];
const root = acBuild(patterns);

const haystacks = [
  '/page/ad/banner_300x250', '/articles/2026/the-best-of', '/ads?id=5',
  'https://x.com/pagead/js', '/pagead/', 'https://cdn.site/analytics.js?v=2',
  '/pixel.gif?uid=7', '/news.html', 'tr/drugstore', 'clickid=99&aff_id=42',
  'utmal=zzz', '/com/ad/', 'doubleclick.net/x', 'googletagmanager/gtm.js',
  'no-match-here-at-all'
];

let fails = 0;
for (const h of haystacks) {
  const naive = patterns.some(p => h.indexOf(p) >= 0);
  const ac = acMatch(root, h);
  if (naive !== ac) { fails++; console.log('MISMATCH', h, 'naive=' + naive, 'ac=' + ac); }
}

/* перекрытия и суффиксные выходы (шаблон — суффикс другого) */
const p2 = ['abcd', 'bcd', 'cde', 'abc'];
const r2 = acBuild(p2);
const checks2 = [['xabcdy', true], ['zbcde', true], ['qabc', true], ['zzz', false]];
for (const [h, expect] of checks2) {
  const naive = p2.some(p => h.indexOf(p) >= 0);
  const ac = acMatch(r2, h);
  if (ac !== expect || naive !== expect) { fails++; console.log('MISMATCH2', h, expect, 'naive=' + naive, 'ac=' + ac); }
}

/* производительность: 20k паттернов, 10k проходов */
const big = [];
for (let i = 0; i < 20000; i++) big.push('ad-' + i.toString(36) + '-slot' + i);
const t0 = process.hrtime.bigint();
const bigRoot = acBuild(big);
const buildMs = Number(process.hrtime.bigint() - t0) / 1e6;
const hay = '/some/page/path/with/segments?query=1&x=' + 'y'.repeat(40);
const t1 = process.hrtime.bigint();
let hits = 0;
for (let i = 0; i < 10000; i++) { if (acMatch(bigRoot, hay)) hits++; }
const matchMs = Number(process.hrtime.bigint() - t1) / 1e6;
console.log('build(20k)=' + buildMs.toFixed(1) + 'ms  10k matches=' + matchMs.toFixed(1) + 'ms hits=' + hits);
console.log(fails === 0 ? 'ALL CORRECTNESS TESTS PASSED' : 'FAILURES: ' + fails);
