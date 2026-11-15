import ZAI from 'z-ai-web-dev-sdk';

const zai = await ZAI.create();

const pages = [
  'https://support.apple.com/en-us/127257',
  'https://www.macstories.net/stories/macos-27-golden-gate-the-macstories-overview/'
];

for (const url of pages) {
  try {
    console.log('\n########## PAGE: ' + url);
    const res = await zai.functions.invoke('page_reader', { url });
    console.log('TITLE: ' + (res.data?.title || ''));
    const html = String(res.data?.html || '');
    // strip tags crudely
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    // find Safari-related sections
    const idxs = [];
    const re = /[Ss]afari/g;
    let m;
    while ((m = re.exec(text)) && idxs.length < 40) idxs.push(m.index);
    const seen = new Set();
    for (const i of idxs) {
      const chunk = text.slice(Math.max(0, i - 200), i + 500);
      const key = chunk.slice(80, 160);
      if (seen.has(key)) continue;
      seen.add(key);
      console.log('---');
      console.log(chunk);
    }
  } catch (e) {
    console.log('PAGE FAILED: ' + url + ' :: ' + e.message);
  }
}
console.log('\nDONE');
