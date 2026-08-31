/**
 * Menjalankan satu ekspresi JS di dalam SETIAP tema, lalu mencetak
 * hasilnya per tema. Untuk memeriksa apakah sebuah cacat yang ditemukan
 * di satu tema menular ke tema sekerangka — sebelas tema dibuat dengan
 * menyalin kerangka, jadi satu cacat gampang ada di beberapa tema
 * sekaligus, dan memeriksanya satu per satu dengan mata terlalu lambat.
 *
 * PRASYARAT: server lokal :5500 dan Chrome headless :9222.
 * PAKAI: node tools/_periksa.js "<ekspresi js>"
 */
const TEMA = [
  'elegan-klasik/sage-rose', 'elegan-klasik/ivory-gold', 'elegan-klasik/emerald-dusk',
  'eropa-mewah/blanc-royale', 'eropa-mewah/noir-dore', 'eropa-mewah/bordeaux',
  'islami/nur-zamrud', 'islami/nur-lazuardi', 'islami/nur-sakinah',
  'cina/shuangxi-merah', 'cina/giok-langit', 'cina/tinta-emas',
  'adat/sekar-jagad', 'adat/pura-bentar', 'adat/songket-saga'
];

const CDP = 'http://127.0.0.1:9222';

function kirim(ws, id, method, params) {
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.id !== id) return;
      ws.removeEventListener('message', onMsg);
      if (d.error) reject(new Error(method + ': ' + d.error.message));
      else resolve(d.result);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
}

async function periksa(tema, ekspresi) {
  const buat = await fetch(CDP + '/json/new?about:blank', { method: 'PUT' });
  const target = await buat.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const c = (m, p) => kirim(ws, ++id, m, p);
  await c('Page.enable');
  await c('Runtime.enable');
  await c('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const selesai = new Promise((res) => {
    const onMsg = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.method === 'Page.loadEventFired') { ws.removeEventListener('message', onMsg); res(); }
    };
    ws.addEventListener('message', onMsg);
  });
  await c('Page.navigate', { url: 'http://localhost:5500/templates/' + tema + '/index.html?amplop=lewat' });
  await selesai;
  await new Promise((r) => setTimeout(r, 900));
  const hasil = await c('Runtime.evaluate', { expression: ekspresi, returnByValue: true });
  ws.close();
  await fetch(CDP + '/json/close/' + target.id);
  return hasil.result && hasil.result.value;
}

(async () => {
  const ekspresi = process.argv[2];
  if (!ekspresi) { console.error('pakai: node tools/_periksa.js "<ekspresi>"'); process.exit(2); }
  for (const t of TEMA) {
    try {
      const v = await periksa(t, ekspresi);
      console.log(t.padEnd(28) + ' ' + JSON.stringify(v));
    } catch (e) {
      console.log(t.padEnd(28) + ' ERROR ' + e.message);
    }
  }
})();
