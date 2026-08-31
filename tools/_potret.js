/**
 * Potret satu URL ke PNG lewat Chrome headless (CDP), untuk PEMERIKSAAN
 * MATA saat mengerjakan desain. Bukan pengganti tools/potret-tema.js —
 * yang itu menulis aset yang di-commit; yang ini cuma alat lihat.
 *
 * PRASYARAT: server lokal :5500 dan Chrome headless :9222 sudah jalan.
 *
 * PAKAI:
 *   node tools/_potret.js <url> <keluaran.png> [opsi]
 *
 * Opsi (key=value):
 *   w=390 h=844        viewport
 *   skala=2            deviceScaleFactor
 *   penuh=1            potret seluruh tinggi halaman
 *   sel="#id"          potong ke satu elemen (paling sering dipakai)
 *   y=1200             gulirkan ke posisi ini dulu
 *   tunggu=1200        jeda ms sesudah load
 *   js="..."           ekspresi yang dijalankan sebelum memotret
 *
 * Catatan yang sudah pernah menggigit (lihat memori project_jebakan_teknis):
 *  - semua tema memakai html{scroll-behavior:smooth}; menggulir secara
 *    programatik tanpa mematikannya membuat halaman cuma merayap. Skrip
 *    ini memaksa scrollBehavior='auto' lebih dulu.
 *  - loading="lazy" membuat gambar di bawah lipatan tidak pernah dimuat
 *    saat memotret di luar viewport. Skrip ini memaksanya 'eager'.
 */
const fs = require('fs');

const CDP = 'http://127.0.0.1:9222';

async function daftarTarget() {
  const r = await fetch(CDP + '/json/list');
  return r.json();
}

function kirim(ws, id, method, params) {
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      let d;
      try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.id !== id) return;
      ws.removeEventListener('message', onMsg);
      if (d.error) reject(new Error(method + ': ' + d.error.message));
      else resolve(d.result);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
}

async function main() {
  const [url, keluaran, ...rest] = process.argv.slice(2);
  if (!url || !keluaran) {
    console.error('pakai: node tools/_potret.js <url> <keluaran.png> [w=390 h=844 ...]');
    process.exit(2);
  }
  const opsi = {};
  rest.forEach((r) => {
    const i = r.indexOf('=');
    if (i > 0) opsi[r.slice(0, i)] = r.slice(i + 1);
  });

  const w = Number(opsi.w || 390);
  const h = Number(opsi.h || 844);
  const skala = Number(opsi.skala || 2);
  const tunggu = Number(opsi.tunggu || 1400);

  // Tab baru per potret: memakai ulang tab yang sama membuat state tema
  // sebelumnya (kelas .in-view, sampul yang sudah dibuka) terbawa.
  const buat = await fetch(CDP + '/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' });
  const target = await buat.json();

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res) => ws.addEventListener('open', res));

  let id = 0;
  const c = (m, p) => kirim(ws, ++id, m, p);

  await c('Page.enable');
  await c('Runtime.enable');
  await c('Emulation.setDeviceMetricsOverride', {
    width: w, height: h, deviceScaleFactor: skala, mobile: true
  });

  const selesai = new Promise((res) => {
    const onMsg = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.method === 'Page.loadEventFired') { ws.removeEventListener('message', onMsg); res(); }
    };
    ws.addEventListener('message', onMsg);
  });
  await c('Page.navigate', { url });
  await selesai;
  await new Promise((r) => setTimeout(r, tunggu));

  await c('Runtime.evaluate', {
    expression: "document.documentElement.style.scrollBehavior='auto';" +
      "document.querySelectorAll('img').forEach(function(i){if(i.loading==='lazy'){i.loading='eager';if(i.src)i.src=i.src;}});"
  });

  if (opsi.js) {
    await c('Runtime.evaluate', { expression: opsi.js, awaitPromise: true });
    await new Promise((r) => setTimeout(r, 500));
  }

  if (opsi.y) {
    // Digulirkan bertahap: IntersectionObserver di tiap tema baru memberi
    // .in-view kalau section-nya benar-benar pernah melewati viewport.
    // Melompat langsung ke posisi akhir membuat section di antaranya
    // tetap tersembunyi dan potretnya keluar sebagai lembar kosong.
    const tujuan = Number(opsi.y);
    for (let p = 0; p <= tujuan; p += Math.max(200, Math.floor(h * 0.7))) {
      await c('Runtime.evaluate', { expression: 'window.scrollTo(0,' + p + ')' });
      await new Promise((r) => setTimeout(r, 120));
    }
    await c('Runtime.evaluate', { expression: 'window.scrollTo(0,' + tujuan + ')' });
    await new Promise((r) => setTimeout(r, 900));
  }

  const params = { format: 'png', captureBeyondViewport: true };
  if (opsi.sel) {
    // Potong ke satu elemen. Tanpa ini, captureBeyondViewport memotret
    // SELURUH tinggi halaman apa pun posisi gulirnya — halaman depan
    // repo ini 10.000px, dan hasilnya tidak terbaca sama sekali.
    const kotak = await c('Runtime.evaluate', {
      expression: "(function(){var e=document.querySelector(" + JSON.stringify(opsi.sel) +
        ");if(!e)return null;var r=e.getBoundingClientRect();return JSON.stringify({x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height});})()",
      returnByValue: true
    });
    if (!kotak.result.value) throw new Error('elemen tidak ketemu: ' + opsi.sel);
    const k = JSON.parse(kotak.result.value);
    params.clip = { x: Math.max(0, k.x - 8), y: Math.max(0, k.y - 8), width: k.width + 16, height: Math.min(k.height + 16, 20000), scale: Number(opsi.skala || 1) };
  } else if (opsi.penuh) {
    const m = await c('Page.getLayoutMetrics');
    const tinggi = Math.min(Math.ceil(m.cssContentSize.height), 30000);
    params.clip = { x: 0, y: 0, width: w, height: tinggi, scale: 1 };
  }
  const shot = await c('Page.captureScreenshot', params);
  fs.writeFileSync(keluaran, Buffer.from(shot.data, 'base64'));

  ws.close();
  await fetch(CDP + '/json/close/' + target.id);
  console.log('tersimpan: ' + keluaran);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
