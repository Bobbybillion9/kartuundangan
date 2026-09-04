/**
 * impor-foto-demo.js — memasukkan foto mempelai dari folder user ke
 * templates/_demo/<tema>/ sebagai WebP.
 *
 * KENAPA ALAT INI ADA
 * -------------------
 * Foto demo sebelumnya ditaruh tangan, dan akibatnya ketahuan 2026-09-04:
 * `galeri-6` di tema Islami ternyata foto MEMPELAI WANITA SENDIRIAN.
 * Galeri undangan pernikahan mestinya foto BERDUA — foto sendiri sudah
 * punya slotnya di bagian mempelai. Kesalahan seperti itu tidak akan
 * pernah dilaporkan alat mana pun; ia hanya terlihat kalau ada yang
 * memandang lembar kontaknya.
 *
 * Karena itu petanya EKSPLISIT di bawah, satu baris per slot, dan boleh
 * dibaca ulang kapan saja: tema mana memakai foto mana, dan kenapa.
 *
 * ATURAN YANG DIPEGANG (lihat memori "Aturan bobot & aset tema"):
 *   - TIDAK PERNAH memperbesar. Sumber Islami cuma 617-736 px; kalau
 *     dipaksa 800 px, yang bertambah cuma berat dan tepi yang lunak.
 *   - WebP mutu 0,82, sama dengan tools/kompres-demo.js.
 *   - Sisi terpanjang dibatasi 1200 px — foto galeri tidak pernah tampil
 *     lebih besar dari itu di undangan selebar 460 px CSS.
 *
 * PRASYARAT: Chrome headless di :9222 (encoder-nya, sama seperti
 * siapkan-ornamen.js). Server statis :5500 TIDAK diperlukan — alat ini
 * menyalakan server sementaranya sendiri untuk folder sumber.
 *
 * PAKAI:
 *   node tools/impor-foto-demo.js --coba      # hitung saja
 *   node tools/impor-foto-demo.js             # tulis
 *   node tools/impor-foto-demo.js nur-zamrud  # satu tema saja
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

const REPO = path.resolve(__dirname, '..');
const CDP = 'http://127.0.0.1:9222';
const SUMBER = path.join(
  process.env.USERPROFILE || os.homedir(),
  'OneDrive', 'Dokumen', 'Website Project', 'Kartuundangan Project',
  'FOTO UNTUK SAMPEL', 'MEMPELAI'
);

const MUTU = 0.82;
const SISI_MAKS = 1200;

/* PETA: tema -> slot -> berkas sumber.
 *
 * Ketiga tema Islami memakai kumpulan yang sama tapi URUTAN DAN PILIHAN
 * yang berbeda — tiga galeri yang terasa tiga sesi foto berbeda, bukan
 * satu set yang ditempel tiga kali. Masing-masing memakai 6 dari 7 foto
 * berdua yang tersedia, dan yang dilewati berbeda-beda.
 *
 * Foto (1).png dan (2).png di folder sumber adalah potret SENDIRI —
 * tempatnya di slot pria/wanita, BUKAN di galeri. Sengaja tidak ada di
 * peta ini supaya tidak masuk galeri lagi.
 */
const PETA = {
  'nur-zamrud': {
    // Zamrud hijau: dibuka dengan yang paling intim (dahi bertemu di
    // latar putih), lalu melebar ke serambi masjid.
    foto_galeri_1: 'ISLAMIC STYLE (1).jpg',
    foto_galeri_2: 'ISLAMIC STYLE (3).jpg',
    foto_galeri_3: 'ISLAMIC STYLE (5).jpg',
    foto_galeri_4: 'ISLAMIC STYLE (7).jpg',
    foto_galeri_5: 'ISLAMIC STYLE (2).jpg',
    foto_galeri_6: 'ISLAMIC STYLE (6).jpg'
  },
  'nur-lazuardi': {
    // Lazuardi navy bergerbang: mulai dari cium tangan di koridor, dan
    // menutup dengan siluet kubah — sejalan dengan gerbangnya sendiri.
    foto_galeri_1: 'ISLAMIC STYLE (2).jpg',
    foto_galeri_2: 'ISLAMIC STYLE (4).jpg',
    foto_galeri_3: 'ISLAMIC STYLE (6).jpg',
    foto_galeri_4: 'ISLAMIC STYLE (1).jpg',
    foto_galeri_5: 'ISLAMIC STYLE (7).jpg',
    foto_galeri_6: 'ISLAMIC STYLE (3).jpg'
  },
  'nur-sakinah': {
    // Sakinah hangat: urutan yang paling banyak cahaya sore dan buket.
    foto_galeri_1: 'ISLAMIC STYLE (3).jpg',
    foto_galeri_2: 'ISLAMIC STYLE (5).jpg',
    foto_galeri_3: 'ISLAMIC STYLE (7).jpg',
    foto_galeri_4: 'ISLAMIC STYLE (4).jpg',
    foto_galeri_5: 'ISLAMIC STYLE (1).jpg',
    foto_galeri_6: 'ISLAMIC STYLE (2).jpg'
  }
};

// Nama berkas keluaran per slot — HARUS sama dengan peta FOTO di
// assets/demo-template.js dan BERKAS_DEMO di tools/cek-tema.js.
const NAMA_KELUARAN = {
  foto_utama: 'utama.webp',
  foto_pria: 'pria.webp',
  foto_wanita: 'wanita.webp',
  foto_galeri_1: 'galeri-1.webp',
  foto_galeri_2: 'galeri-2.webp',
  foto_galeri_3: 'galeri-3.webp',
  foto_galeri_4: 'galeri-4.webp',
  foto_galeri_5: 'galeri-5.webp',
  foto_galeri_6: 'galeri-6.webp',
  sampul: 'sampul.webp'
};

function server(akarMentah) {
  // path.resolve WAJIB: dijalankan dari Git Bash, argumen folder bisa
  // datang bercampur pemisah ("C:\Users\X/OneDrive/..."), sementara
  // path.join menghasilkan backslash semua — penjaga startsWith() lalu
  // selalu false dan SEMUA berkas dijawab 403.
  const akar = path.resolve(akarMentah);
  return new Promise(res => {
    const srv = http.createServer((req, resp) => {
      // Halaman kosong ini WAJIB dijawab 200 dengan badan HTML.
      // Kalau ia 404 (badan kosong), Chrome tetap di about:blank yang
      // origin-nya opaque, gambarnya jadi lintas-origin, kanvasnya
      // ternoda, dan toDataURL melempar SecurityError. Gejalanya
      // menyesatkan: yang gagal terlihat seperti pengekodean WebP-nya.
      if (req.url.split('?')[0] === '/__kosong') {
        resp.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return resp.end('<!doctype html><title>impor</title>');
      }
      const nama = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '');
      const p = path.join(akar, nama);
      if (!p.startsWith(akar)) { resp.writeHead(403); return resp.end(); }
      fs.readFile(p, (err, data) => {
        if (err) { resp.writeHead(404); return resp.end(); }
        const e = path.extname(p).toLowerCase();
        resp.writeHead(200, { 'Content-Type': e === '.png' ? 'image/png' : e === '.webp' ? 'image/webp' : 'image/jpeg' });
        resp.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => res({ srv, port: srv.address().port }));
  });
}

async function cdp() {
  const r = await fetch(CDP + '/json/new?about:blank', { method: 'PUT' });
  const t = await r.json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const nunggu = new Map();
  await new Promise(res => (ws.onopen = res));
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && nunggu.has(m.id)) { nunggu.get(m.id)(m); nunggu.delete(m.id); } };
  const kirim = (metode, params) => new Promise(res => { const n = ++id; nunggu.set(n, res); ws.send(JSON.stringify({ id: n, method: metode, params: params || {} })); });
  return { kirim, tutup: async () => { ws.close(); await fetch(CDP + '/json/close/' + t.id); } };
}

// Dijalankan DI DALAM Chrome. Penurunan skala bertahap (dibagi dua)
// seperti assets/kompres-foto.js: satu lompatan drawImage dari 1288 ke
// 1200 tidak masalah, tapi alat ini juga dipakai untuk sumber besar.
function skrip(url, sisiMaks, mutu) {
  return `(async () => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('gagal dimuat'));
      img.src = ${JSON.stringify(url)};
    });
    const skala = Math.min(1, ${sisiMaks} / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * skala));
    const h = Math.max(1, Math.round(img.naturalHeight * skala));
    function kanvas(a, b) { const c = document.createElement('canvas'); c.width = a; c.height = b; return c; }
    let sw = img.naturalWidth, sh = img.naturalHeight, sumber = img;
    while (sw / 2 > w) {
      sw = Math.max(w, Math.round(sw / 2));
      sh = Math.max(h, Math.round(sh / 2));
      const a = kanvas(sw, sh); const g = a.getContext('2d');
      g.imageSmoothingQuality = 'high'; g.drawImage(sumber, 0, 0, sw, sh); sumber = a;
    }
    const c = kanvas(w, h); const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    // Alas putih: sumber JPEG tak-transparan, dan tanpa alas tepi tipis
    // bisa menghasilkan pinggiran gelap di WebP.
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.drawImage(sumber, 0, 0, w, h);
    const d = c.toDataURL('image/webp', ${mutu});
    if (d.indexOf('data:image/webp') !== 0) throw new Error('Chrome ini tidak bisa mengekode WebP');
    return JSON.stringify({ w, h, asli: img.naturalWidth + 'x' + img.naturalHeight, data: d.split(',')[1] });
  })()`;
}

(async () => {
  const arg = process.argv.slice(2);
  const COBA = arg.includes('--coba');
  const diminta = arg.filter(a => !a.startsWith('--'));

  if (!fs.existsSync(SUMBER)) { console.error('Folder sumber tidak ada:\n  ' + SUMBER); process.exit(1); }
  try { await fetch(CDP + '/json/version'); } catch (e) {
    console.error('Chrome dengan --remote-debugging-port=9222 tidak ditemukan.'); process.exit(1);
  }

  const tema = Object.keys(PETA).filter(t => !diminta.length || diminta.includes(t));
  if (!tema.length) { console.error('Tema tidak ada di PETA. Tersedia: ' + Object.keys(PETA).join(', ')); process.exit(1); }

  // Semua berkas sumber diperiksa DULU: kalau ada satu yang salah nama,
  // lebih baik berhenti sebelum ada folder yang separuh tertimpa.
  const hilang = [];
  for (const t of tema) for (const slot of Object.keys(PETA[t])) {
    if (!fs.existsSync(path.join(SUMBER, PETA[t][slot]))) hilang.push(t + '/' + slot + ' -> ' + PETA[t][slot]);
  }
  if (hilang.length) { console.error('Berkas sumber tidak ditemukan:\n  ' + hilang.join('\n  ')); process.exit(1); }

  const { srv, port } = await server(SUMBER);
  const c = await cdp();
  await c.kirim('Page.navigate', { url: 'http://127.0.0.1:' + port + '/__kosong' });
  await new Promise(r => setTimeout(r, 600));

  let asli = 0, baru = 0, gagal = 0;
  for (const t of tema) {
    const dir = path.join(REPO, 'templates', '_demo', t);
    if (!fs.existsSync(dir)) { console.error('  x folder demo tidak ada: ' + dir); gagal++; continue; }
    console.log(t);
    for (const slot of Object.keys(PETA[t])) {
      const berkas = PETA[t][slot];
      const keluaran = NAMA_KELUARAN[slot];
      if (!keluaran) { console.error('  x slot tidak dikenal: ' + slot); gagal++; continue; }
      const url = 'http://127.0.0.1:' + port + '/' + encodeURIComponent(berkas);
      const res = await c.kirim('Runtime.evaluate', { expression: skrip(url, SISI_MAKS, MUTU), awaitPromise: true, returnByValue: true });
      const v = res.result && res.result.result;
      if (!v || v.type !== 'string') {
        console.error('  x ' + keluaran + ' — ' + ((res.result && res.result.exceptionDetails && ((res.result.exceptionDetails.exception||{}).description || res.result.exceptionDetails.text)) || 'gagal'));
        gagal++; continue;
      }
      const o = JSON.parse(v.value);
      const buf = Buffer.from(o.data, 'base64');
      const tujuan = path.join(dir, keluaran);
      const ukLama = fs.existsSync(tujuan) ? fs.statSync(tujuan).size : 0;
      asli += ukLama; baru += buf.length;
      console.log('  ' + keluaran.padEnd(14) + berkas.padEnd(24) + o.asli + ' -> ' + o.w + 'x' + o.h +
        '  ' + Math.round(ukLama / 1024) + 'K -> ' + Math.round(buf.length / 1024) + 'K');
      if (!COBA) fs.writeFileSync(tujuan, buf);
    }
  }
  await c.tutup(); srv.close();

  console.log('');
  console.log('mutu ' + MUTU + ', sisi maks ' + SISI_MAKS + ' — ' + Math.round(asli / 1024) + ' KB -> ' + Math.round(baru / 1024) + ' KB' + (gagal ? ', ' + gagal + ' gagal' : ''));
  if (COBA) console.log('(--coba: tidak ada berkas yang ditulis)');
  else console.log('Sesudah ini: node tools/potret-tema.js <tema> kalau sampulnya ikut berubah, lalu node tools/cek-tema.js');
  process.exit(gagal ? 1 : 0);
})();
