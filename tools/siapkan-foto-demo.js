/**
 * Menyusun SATU SET foto contoh pratinjau (templates/_demo/<tema>/).
 *
 * KENAPA BERKAS INI ADA
 * ---------------------
 * Tiap tema butuh 11 berkas dengan nama tetap — sampul, utama, pria,
 * wanita, galeri-1..6, musik. Sebelumnya set itu disiapkan tangan dari
 * folder foto milik user, dan begitu kategori baru muncul (Tionghoa,
 * Bali) foto yang ada tidak lagi cocok: memasang pasangan berhijab di
 * tema Tionghoa merah bukan sekadar kurang rapi, itu melawan janji
 * temanya sendiri.
 *
 * DUA HAL YANG DIKERJAKAN ALAT INI, DAN KENAPA
 *
 * 1. MEMPERKECIL. Foto sumber sering 3800px dan 1,4 MB. Halaman
 *    pratinjau memuat 9 foto sekaligus; tanpa dikecilkan, satu
 *    pratinjau bisa belasan MB.
 *
 * 2. MEMOTONG foto mempelai DARI SATU foto pasangan. Ini yang paling
 *    berguna: mencari dua potret perorangan dari pasangan yang SAMA
 *    hampir mustahil, dan memakai dua orang berbeda untuk "mempelai
 *    pria" dan "mempelai wanita" langsung terlihat salah. Memotong
 *    separuh kiri dan separuh kanan dari satu foto pasangan
 *    menghasilkan dua potret yang pasti orang yang sama.
 *    Potongannya dari SEPERTIGA ATAS, bukan tengah — pada foto orang,
 *    memotong dari tengah memenggal kepala.
 *
 * PRASYARAT: Chrome headless dengan --remote-debugging-port=9222
 *
 * PAKAI:  node tools/siapkan-foto-demo.js resep.json
 *
 * Bentuk resep.json:
 *   {
 *     "tema": "shuangxi-merah",
 *     "sumberDir": "<path folder berisi foto sumber>",
 *     "musikDari": "emerald-dusk",          // set yang musiknya disalin
 *     "berkas": {
 *       "sampul":   { "dari": "cina-sampul.jpg" },
 *       "sampul2":  { "dari": "x.png", "kotak": [0.1, 0, 0.78, 1] },
 *       "utama":    { "dari": "cina-pasangan.jpg" },
 *       "pria":     { "dari": "cina-pasangan.jpg", "potong": "kanan" },
 *       "wanita":   { "dari": "cina-pasangan.jpg", "potong": "kiri" },
 *       "galeri-1": { "dari": "cina-galeri-1.jpg" }
 *     }
 *   }
 *
 * "kotak" (pilihan): [x, y, lebar, tinggi] dalam PECAHAN 0..1 dari
 * ukuran sumbernya, dipotong SEBELUM diperkecil. Ada karena foto stok
 * sering membawa kolom aksara atau tanda air di kedua tepinya —
 * pada foto sampul Tionghoa, dua kolom teks vertikal milik fotografer
 * berdiri persis di tempat undangan ini menaruh inskripsinya sendiri,
 * dan hasilnya dua tulisan bertumpuk yang tidak ada hubungannya.
 * Memperbesar foto lewat CSS bukan gantinya: itu akan ikut memotong
 * foto milik SETIAP pasangan yang memakai tema ini, bukan cuma yang
 * contoh.
 *
 * Yang sudah dipakai: sampul Tinta Emas, dari MEMPELAI/"CHINESSE
 * STYLE (1).png", kotak [0.12, 0, 0.71, 1] — membuang kolom aksara
 * di kedua tepi berikut tanda air fotografernya.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const REPO = path.resolve(__dirname, '..');
const CDP = 'http://127.0.0.1:9222';

// Lebar target per jenis berkas. Foto mempelai lebih kecil karena di
// semua tema ia tampil paling kecil (dua kolom bersebelahan).
const LEBAR = { sampul: 900, utama: 900, pria: 640, wanita: 640, galeri: 800 };
const MUTU = 0.82;

function sambung(ws) {
  return new Promise((res, rej) => { const s = new WebSocket(ws); s.onopen = () => res(s); s.onerror = rej; });
}
function kirim(s, id, m, p) {
  return new Promise(res => {
    const d = e => { const x = JSON.parse(e.data); if (x.id === id) { s.removeEventListener('message', d); res(x.result); } };
    s.addEventListener('message', d); s.send(JSON.stringify({ id, method: m, params: p }));
  });
}

function skrip(nama, lebarTarget, mutu, potong, kotak) {
  return `(async()=>{
    const img = new Image();
    img.src = ${JSON.stringify('/' + encodeURIComponent(nama))};
    await img.decode();
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

    // Kotak potong manual, dalam pecahan ukuran sumber. Dijalankan
    // LEBIH DULU supaya "potong kiri/kanan" di bawah bekerja pada
    // bidang yang sudah dibersihkan tepinya, bukan pada foto asli.
    const kotak = ${JSON.stringify(kotak || null)};
    if (kotak) {
      sx = Math.round(img.naturalWidth * kotak[0]);
      sy = Math.round(img.naturalHeight * kotak[1]);
      sw = Math.round(img.naturalWidth * kotak[2]);
      sh = Math.round(img.naturalHeight * kotak[3]);
    }

    // Potong separuh kiri/kanan untuk foto mempelai.
    //
    // Potongannya DIMASUKKAN KE DALAM, tidak menempel ke tepi gambar.
    // Percobaan pertama mengambil 46% dari tepi paling luar, dan
    // hasilnya kedua wajah terdorong ke pinggir bingkai lalu terpotong
    // — karena pada foto pasangan, kedua orangnya berdiri BERDEKATAN di
    // sekitar tengah, bukan di tepi. Sekarang jendelanya digeser 6% ke
    // dalam dari tepi luar, jadi wajahnya jatuh mendekati tengah.
    //
    // Tingginya diambil dari SEPERTIGA ATAS, bukan tengah: pada foto
    // orang, memotong dari tengah memenggal kepala.
    if (${JSON.stringify(!!potong)}) {
      const bx = sx, by = sy, bw = sw, bh = sh;
      sw = Math.round(bw * 0.46);
      sx = bx + (${JSON.stringify(potong)} === 'kanan'
        ? Math.round(bw * 0.48)
        : Math.round(bw * 0.06));
      if (sx + sw > bx + bw) sx = bx + bw - sw;
      sh = Math.min(bh, Math.round(sw * 4 / 3));
      sy = by + Math.round(bh * 0.13);
      if (sy + sh > by + bh) sy = by + bh - sh;
    }

    const skala = Math.min(1, ${lebarTarget} / sw);
    const w = Math.round(sw * skala), h = Math.round(sh * skala);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    // Latar putih WAJIB: sumber ber-alpha yang digambar langsung ke
    // JPEG akan jadi hitam.
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    return c.toDataURL('image/jpeg', ${mutu});
  })()`;
}

(async () => {
  const berkasResep = process.argv[2];
  if (!berkasResep || !fs.existsSync(berkasResep)) {
    console.error('Pakai: node tools/siapkan-foto-demo.js resep.json');
    process.exit(1);
  }
  const resep = JSON.parse(fs.readFileSync(berkasResep, 'utf8'));
  const tujuanDir = path.join(REPO, 'templates', '_demo', resep.tema);
  fs.mkdirSync(tujuanDir, { recursive: true });

  const srv = http.createServer((q, r) => {
    const nama = decodeURIComponent(q.url.slice(1));
    // Halaman kosong untuk '/' — Chrome dinavigasikan ke sini lebih dulu
    // supaya gambar yang dimuat berikutnya SE-ORIGIN dengan halamannya.
    // Tanpa penjaga ini, '/' mengarah ke folder sumbernya dan server
    // mencoba membaca sebuah DIREKTORI sebagai berkas (EISDIR).
    if (!nama) {
      r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return r.end('<!doctype html><meta charset=utf-8><title>siapkan-foto-demo</title>');
    }
    const f = path.join(resep.sumberDir, nama);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    // Jenis dari EKSTENSI, bukan dipatok 'image/jpeg'. Folder foto milik
    // user berisi .png sebanyak .jpg, dan menyajikan PNG dengan label
    // JPEG berarti bergantung pada penebakan jenis oleh browser —
    // penebakan yang mati begitu ada satu header aneh, dan matinya
    // senyap: gambarnya cuma tidak pernah selesai decode.
    var jenis = /[.]png$/i.test(nama) ? 'image/png'
              : /[.]webp$/i.test(nama) ? 'image/webp'
              : 'image/jpeg';
    r.writeHead(200, { 'content-type': jenis });
    fs.createReadStream(f).pipe(r);
  });

  srv.listen(0, async () => {
    const port = srv.address().port;
    const t = await (await fetch(CDP + '/json/new?about:blank', { method: 'PUT' })).json();
    const s = await sambung(t.webSocketDebuggerUrl);
    let n = 0; const cdp = (m, p) => kirim(s, ++n, m, p);
    await cdp('Page.enable'); await cdp('Runtime.enable');
    // WAJIB navigasi ke server sendiri: dari about:blank gambarnya
    // terhitung lintas-origin, canvas tercemar, toDataURL melempar.
    await cdp('Page.navigate', { url: `http://127.0.0.1:${port}/` });
    await new Promise(r => setTimeout(r, 800));

    console.log('Tema: ' + resep.tema);
    for (const [keluaran, o] of Object.entries(resep.berkas)) {
      const jenis = keluaran.startsWith('galeri') ? 'galeri' : keluaran;
      const lebar = LEBAR[jenis] || 800;
      const hasil = await cdp('Runtime.evaluate', {
        expression: skrip(o.dari, lebar, MUTU, o.potong, o.kotak),
        awaitPromise: true, returnByValue: true
      });
      const dataUrl = hasil.result && hasil.result.value;
      if (!dataUrl || dataUrl.indexOf('data:image') !== 0) {
        console.log(`  x ${keluaran}  GAGAL (sumber: ${o.dari})`);
        continue;
      }
      const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
      fs.writeFileSync(path.join(tujuanDir, keluaran + '.jpg'), buf);
      console.log(`  + ${keluaran}.jpg  ${Math.round(buf.length / 1024)} KB` +
                  (o.potong ? `  (dipotong ${o.potong} dari ${o.dari})` : ''));
    }

    // Musik disalin dari set lain — lagu instrumental tidak terikat
    // budaya seperti foto, jadi tidak perlu dicarikan sendiri.
    if (resep.musikDari) {
      const asal = path.join(REPO, 'templates', '_demo', resep.musikDari, 'musik.mp3');
      if (fs.existsSync(asal)) {
        fs.copyFileSync(asal, path.join(tujuanDir, 'musik.mp3'));
        console.log(`  + musik.mp3  (disalin dari ${resep.musikDari})`);
      } else {
        console.log(`  x musik.mp3 TIDAK ADA di set ${resep.musikDari}`);
      }
    }

    s.close();
    await fetch(CDP + '/json/close/' + t.id);
    srv.close();
    console.log('Selesai.');
    process.exit(0);
  });
})();
