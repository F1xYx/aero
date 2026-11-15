import ZAI from 'z-ai-web-dev-sdk';

const queries = [
  { q: 'Safari 27 macOS 27 Golden Gate design interface', num: 8, recency: 120 },
  { q: 'macOS 27 Golden Gate Safari redesign tab bar', num: 8, recency: 120 },
  { q: 'Safari 26 Tahoe Liquid Glass interface tab bar toolbar design', num: 8, recency: 400 },
  { q: 'Safari 26 tab groups borderless tabs animation liquid glass', num: 8, recency: 400 },
  { q: 'macOS Tahoe 26 Safari improvements bottom address bar glass', num: 8, recency: 400 }
];

const zai = await ZAI.create();

for (const { q, num, recency } of queries) {
  try {
    const res = await zai.functions.invoke('web_search', { query: q, num, recency_days: recency });
    console.log('\n=== QUERY: ' + q + ' ===');
    for (const r of res.slice(0, num)) {
      console.log('- [' + r.rank + '] ' + r.name + ' | ' + r.host_name + ' | ' + (r.date || ''));
      console.log('  URL: ' + r.url);
      console.log('  ' + String(r.snippet || '').replace(/\s+/g, ' ').slice(0, 400));
    }
  } catch (e) {
    console.log('QUERY FAILED: ' + q + ' :: ' + e.message);
  }
}
console.log('\nDONE');
