/**
 * kompres-demo.js — mengubah foto demo tiap tema dari JPEG ke WebP.
 *
 * KENAPA ALAT INI ADA
 * -------------------
 * templates/_demo/ adalah satu-satunya isi berat yang diunduh SETIAP
 * calon pembeli: templates/pratinjau.html merender tema apa adanya, dan
 * demo-template.js mengisi slot fotonya dari sana. Sepuluh foto per tema
 * dalam JPEG berjumlah 1,0-1,9 MB — dan itu sebelum ornamen dan CSS.
 *
 * Ukuran PIKSELNYA sudah benar dan sengaja tidak diubah di sini: 800-900
 * px untuk undangan yang lebarnya dibatasi 460 px CSS sudah tajam bahkan
 * di layar 3x DPI. Yang diubah cuma FORMATNYA — WebP pada mutu yang sama
 * rata-rata 35-45% lebih ringan daripada JPEG, tanpa ada piksel yang
 * hilang.
 *
 * KENAPA CHROME YANG MENGENKODE
 * -----------------------------
 * Sama seperti tools/siapkan-ornamen.js: tidak ada ImageMagick di sini,
 * dan System.Drawing bawaan Windows tidak bisa menulis WebP sama sekali.
 * canvas.toDataURL('image/webp') di Chrome adalah encoder yang tersedia.
 *
 * SESUDAH MENJALANKAN INI, `demo-template.js` HARUS IKUT DIUBAH.
 * Peta nama berkas di sana masih menyebut .jpg. Kalau tidak diubah,
 * kegagalannya SENYAP dalam bentuk yang paling menipu: kalauGambarAda()
 * memang dirancang mendiamkan berkas yang tidak ada, jadi yang terlihat
 * cuma pratinjau dengan slot foto kosong — tanpa satu pun pesan galat.
 *
 * PRASYARAT: server statis lokal di :5500 + Chrome headless di :9222,
 * sama seperti cek-tema.js dan potret-tema.js.
 *
 * Pemakaian:
 *   node tools/kompres-demo.js            # tulis hasilnya
 *   node tools/kompres-demo.js --coba     # cuma hitung, tidak menulis
 *   node tools/kompres-demo.js --mutu 0.8
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const DEMO = path.join(REPO, 'templates', '_demo');
const CDP = 'http://127.0.0.1:9222';
const BASE = 'http://localhost:5500';

const arg = process.argv.slice(2);
const COBA = arg.includes('--coba');
const MUTU = (() => {
  const i = arg.indexOf('--mutu');
  return i !== -1 && arg[i + 1] ? parseFloat(arg[i + 1]) : 0.86;
})();

async function cdp() {
  const r = await fetch(CDP + '/json/new?about:blank', { method: 'PUT' });
  const t = await r.json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0;
  const nunggu = new Map();
  await new Promise(res => (ws.onopen = res));
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && nunggu.has(m.id)) { nunggu.get(m.id)(m); nunggu.delete(m.id); }
  };
  const kirim = (metode, params) => new Promise(res => {
    const n = ++id; nunggu.set(n, res);
    ws.send(JSON.stringify({ id: n, method: metode, params: params || {} }));
  });
  return { kirim, tutup: async () => { ws.close(); await fetch(CDP + '/json/close/' + t.id); } };
}

// Dijalankan DI DALAM Chrome. Tidak ada penurunan skala di sini sama
// sekali — lihat catatan di kepala berkas: yang diubah cuma formatnya.
function skrip(url, mutu) {
  return `(async () => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('gagal dimuat'));
      img.src = ${JSON.stringify(url)};
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    // Alas putih: foto demo semuanya JPEG tak-transparan, dan tanpa alas
    // ini tepi yang tipis bisa menghasilkan pinggiran gelap di WebP.
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0);
    const d = c.toDataURL('image/webp', ${mutu});
    if (d.indexOf('data:image/webp') !== 0) throw new Error('Chrome ini tidak bisa mengekode WebP');
    return JSON.stringify({ w: img.naturalWidth, h: img.naturalHeight, data: d.split(',')[1] });
  })()`;
}

function kb(n) { return (n / 1024).toFixed(0) + ' KB'; }

(async () => {
  if (!fs.existsSync(DEMO)) { console.error('templates/_demo tidak ada'); process.exit(1); }

  // Berkas dikumpulkan dulu supaya jumlahnya diketahui sebelum satu pun
  // ditulis — kalau prasyaratnya tidak jalan, tidak ada yang terlanjur
  // separuh terkonversi.
  const daftar = [];
  for (const tema of fs.readdirSync(DEMO)) {
    const dir = path.join(DEMO, tema);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const berkas of fs.readdirSync(dir)) {
      if (!/\.jpe?g$/i.test(berkas)) continue;
      daftar.push({ tema, berkas, penuh: path.join(dir, berkas) });
    }
  }
  if (!daftar.length) { console.log('Tidak ada JPEG di templates/_demo — mungkin sudah dikonversi.'); return; }

  const uji = await fetch(BASE + '/templates/_demo/', { method: 'HEAD' }).catch(() => null);
  if (!uji) { console.error('Server statis :5500 tidak menjawab. Jalankan dulu server lokalnya.'); process.exit(1); }

  const c = await cdp();
  await c.kirim('Page.navigate', { url: BASE + '/templates/pratinjau.html' });
  await new Promise(r => setTimeout(r, 2000));

  let asli = 0, baru = 0, gagal = 0;
  let temaSekarang = '';
  for (const it of daftar) {
    const url = BASE + '/templates/_demo/' + it.tema + '/' + it.berkas;
    const res = await c.kirim('Runtime.evaluate', {
      expression: skrip(url, MUTU), awaitPromise: true, returnByValue: true
    });
    const v = res.result && res.result.result;
    if (!v || v.type !== 'string') {
      console.error('  x ' + it.tema + '/' + it.berkas + ' — ' +
        ((res.result && res.result.exceptionDetails && res.result.exceptionDetails.text) || 'gagal'));
      gagal++;
      continue;
    }
    const o = JSON.parse(v.value);
    const buf = Buffer.from(o.data, 'base64');
    const ukAsli = fs.statSync(it.penuh).size;
    asli += ukAsli;

    // WebP yang justru lebih besar tidak dipakai — terjadi pada foto
    // kecil yang JPEG-nya sudah sangat rapat.
    if (buf.length >= ukAsli) {
      baru += ukAsli;
      if (temaSekarang !== it.tema) { console.log(it.tema); temaSekarang = it.tema; }
      console.log('  = ' + it.berkas + ' dibiarkan JPEG (' + kb(ukAsli) + '; WebP-nya ' + kb(buf.length) + ')');
      continue;
    }
    baru += buf.length;
    if (temaSekarang !== it.tema) { console.log(it.tema); temaSekarang = it.tema; }
    console.log('  ' + it.berkas + ' ' + o.w + 'x' + o.h + '  ' + kb(ukAsli) + ' -> ' + kb(buf.length) +
      '  (-' + Math.round(100 - buf.length / ukAsli * 100) + '%)');
    if (!COBA) {
      fs.writeFileSync(it.penuh.replace(/\.jpe?g$/i, '.webp'), buf);
      fs.unlinkSync(it.penuh);
    }
  }
  await c.tutup();

  console.log('');
  console.log('mutu ' + MUTU + ' — ' + daftar.length + ' berkas: ' + kb(asli) + ' -> ' + kb(baru) +
    ' (-' + Math.round(100 - baru / asli * 100) + '%)' + (gagal ? ', ' + gagal + ' gagal' : ''));
  if (COBA) console.log('(--coba: tidak ada berkas yang ditulis)');
  else console.log('JANGAN LUPA: peta nama berkas di assets/demo-template.js harus ikut jadi .webp.');
})();
