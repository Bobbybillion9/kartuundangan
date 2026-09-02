/**
 * cek-ketajaman.js — memeriksa apakah ADA ornamen yang dipakai LEBIH BESAR
 * daripada berkasnya, di kelima belas tema sekaligus.
 *
 * KENAPA ALAT INI ADA
 * -------------------
 * 2026-09-02 user menulis: "saya menemukan ornamen yang terlihat sangat
 * buram (bad quality image)". Ia benar, dan sebabnya bisa dihitung:
 * berkasnya 480x237 sementara CSS melukisnya selebar 352px — jadi pada HP
 * 2x DPI ia sudah diperbesar 1,5 kali dan pada 3x lebih dari dua kali.
 *
 * Kesalahan seperti itu GAGAL SENYAP dalam arti yang paling buruk: tidak
 * ada error, gambarnya tetap muncul, dan di layar laptop 1x developer
 * hasilnya terlihat baik-baik saja. Yang melihatnya pertama kali adalah
 * user di HP-nya — atau calon pembeli.
 *
 * Ia juga gampang muncul kembali tanpa ada yang menyentuh gambarnya:
 * cukup satu ornamen dibesarkan di CSS, atau satu aset dipakai ulang oleh
 * tema baru pada ukuran yang lebih besar.
 *
 * YANG DIUKUR
 * -----------
 * Rasio = piksel BERKAS per piksel CSS pada pemakaian TERBESAR aset itu di
 * seluruh tema. Diambil dari getComputedStyle elemen DAN kedua
 * pseudo-element-nya — hampir semua ornamen di repo ini digambar sebagai
 * ::before/::after, jadi memeriksa elemen saja akan melewatkan hampir
 * semuanya. background-size contain/cover/persen ikut dihitung.
 *
 *   < 1,00  diperbesar walau di layar 1x        -> GAGAL
 *   < 1,60  tidak cukup untuk HP 2x             -> GAGAL
 *   >= 1,60 diterima
 *
 * Ambangnya 1,60 dan bukan 2,00 dengan alasan: sumber ornamen milik user
 * memang kebanyakan 360-500 px, jadi 2,00 akan menolak aset yang sudah
 * dipakai pada ukuran wajar dan tidak bisa diperbaiki dengan cara apa pun
 * selain mengganti asetnya. 1,60 menangkap kasus yang benar-benar terlihat
 * (garis-d ada di 1,36) tanpa memaksa mengganti aset yang baik-baik saja.
 *
 * DIKECUALIKAN, dan tiap pengecualian ada alasannya di DIKECUALIKAN[] —
 * bukan daftar "yang belum sempat diperbaiki".
 *
 * PRASYARAT: server lokal :5500 + Chrome headless :9222 (sama seperti
 * cek-tema.js dan potret-tema.js).
 *
 * PAKAI:  node tools/cek-ketajaman.js          ringkas, keluar 1 kalau gagal
 *         node tools/cek-ketajaman.js --rinci  tampilkan semua aset
 */
const fs = require('fs');
const path = require('path');

const CDP = 'http://127.0.0.1:9222';
const AMBANG = 1.6;
const REPO = path.join(__dirname, '..');

/* Pengecualian, masing-masing dengan alasannya. Sebuah aset boleh masuk
   sini HANYA kalau kelembutannya memang tidak terbaca sebagai cacat —
   bukan karena perbaikannya merepotkan. */
const DIKECUALIKAN = {
  'latar-plaster-daun.webp': 'latar tekstur, dilukis pada ukuran aslinya; sumbernya cuma 675px dan skrip ornamen tidak pernah memperbesar. Tekstur rata tidak punya tepi tajam yang bisa terlihat lunak.',
  'latar-relief-halus.webp': 'sama: latar tekstur pada ukuran aslinya.',
  'latar-burgundy-kertas.webp': 'sama: latar tekstur pada ukuran aslinya.',
  'latar-candi-bentar.webp': 'sama: latar tekstur pada ukuran aslinya.',
  'latar-mihrab-lembut.webp': 'sama: latar tekstur pada ukuran aslinya.',
  'latar-gunungan-emas.webp': 'sama: latar tekstur pada ukuran aslinya.',
  'arch-mihrab-polos.webp': 'dipakai HANYA sebagai bayangan lengkung beropasitas .14-.16 di belakang teks. Pada opasitas segitu tepinya memang tidak terbaca, dan sumbernya (360x360) sudah dipakai habis.'
};

function kirim(ws, id, method, params) {
  return new Promise((res, rej) => {
    const on = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result); }
    };
    ws.addEventListener('message', on);
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
}

/* Ukuran asli berkas dibaca dari header sendiri. Project ini tanpa
   package manager, jadi tidak ada pustaka pembaca dimensi yang bisa
   dipasang. WebP di sini semuanya VP8X (beralpha), tapi ketiga ragamnya
   tetap ditangani supaya alat ini tidak diam-diam melewatkan berkas. */
function dimensi(file) {
  const b = fs.readFileSync(file);
  if (b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP') {
    const t = b.slice(12, 16).toString('ascii');
    if (t === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (t === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (t === 'VP8L') {
      const b0 = b[21], b1 = b[22], b2 = b[23], b3 = b[24];
      return [1 + (((b1 & 0x3f) << 8) | b0), 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))];
    }
  }
  if (b[0] === 0x89 && b[1] === 0x50) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
        return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return [0, 0];
}

const AMBIL = `(function(){
  var hasil = [];
  function baca(el, pseudo){
    var s = getComputedStyle(el, pseudo);
    var bi = s.backgroundImage;
    if (!bi || bi.indexOf('_ornamen/') < 0) return;
    /* content:none berarti pseudo-element-nya TIDAK dibuat. Tanpa
       pemeriksaan ini, ornamen yang sudah dimatikan sebuah tema tetap
       terhitung dipakai — dan alat ini akan menuntut perbaikan untuk
       gambar yang tidak pernah tampil. */
    if (pseudo && s.content === 'none') return;
    var w = parseFloat(s.width), h = parseFloat(s.height);
    if (!(w > 0) || !(h > 0)) return;
    var m = bi.match(/_ornamen\\/([^"')]+)/g) || [];
    hasil.push({
      berkas: m.map(function(x){ return x.replace('_ornamen/',''); }),
      w: Math.round(w), h: Math.round(h),
      size: s.backgroundSize,
      sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (pseudo || '')
    });
  }
  var semua = document.querySelectorAll('*');
  for (var i = 0; i < semua.length; i++){ baca(semua[i], null); baca(semua[i], '::before'); baca(semua[i], '::after'); }
  return JSON.stringify(hasil);
})()`;

/* Berapa CSS px gambar itu SUNGGUH dilukis, sesudah background-size. */
function terlukis(kotakW, kotakH, iw, ih, size) {
  if (size === 'contain' || size === 'cover') {
    const s = size === 'contain' ? Math.min(kotakW / iw, kotakH / ih) : Math.max(kotakW / iw, kotakH / ih);
    return [iw * s, ih * s];
  }
  const bag = size.split(' ');
  const nilai = (v, basis) => {
    if (v === undefined || v === 'auto') return null;
    if (v.endsWith('%')) return basis * parseFloat(v) / 100;
    if (v.endsWith('px')) return parseFloat(v);
    return null;
  };
  let w = nilai(bag[0], kotakW), h = nilai(bag[1], kotakH);
  if (w === null && h === null) return [iw, ih];   // background-size:auto
  if (w === null) w = h * iw / ih;
  if (h === null) h = w * ih / iw;
  return [w, h];
}

async function periksaTema(tema) {
  const url = 'http://localhost:5500/templates/' + tema + '/index.html?amplop=lewat';
  const buat = await fetch(CDP + '/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' });
  const tgt = await buat.json();
  const ws = new WebSocket(tgt.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const c = (m, p) => kirim(ws, ++id, m, p);
  await c('Page.enable'); await c('Runtime.enable');
  await c('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const selesai = new Promise((r) => {
    const on = (ev) => { let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.method === 'Page.loadEventFired') { ws.removeEventListener('message', on); r(); } };
    ws.addEventListener('message', on);
  });
  await c('Page.navigate', { url }); await selesai;
  await new Promise((r) => setTimeout(r, 1800));
  await c('Runtime.evaluate', {
    expression: "document.documentElement.style.scrollBehavior='auto';var b=document.getElementById('openBtn');if(b)b.click();"
  });
  await new Promise((r) => setTimeout(r, 1200));
  /* Digulirkan sampai habis: ornamen di bagian yang belum pernah masuk
     viewport masih menunggu IntersectionObserver, dan getComputedStyle
     pada section yang belum .in-view bisa mengembalikan ukuran lain. */
  const m0 = await c('Page.getLayoutMetrics');
  for (let p = 0; p <= Math.ceil(m0.cssContentSize.height); p += 500) {
    await c('Runtime.evaluate', { expression: 'window.scrollTo(0,' + p + ')' });
    await new Promise((r) => setTimeout(r, 40));
  }
  await new Promise((r) => setTimeout(r, 400));
  const r = await c('Runtime.evaluate', { expression: AMBIL, returnByValue: true });
  ws.close(); await fetch(CDP + '/json/close/' + tgt.id);
  return JSON.parse(r.result.value);
}

(async () => {
  const rinci = process.argv.includes('--rinci');
  const temaDir = path.join(REPO, 'templates');
  const tema = [];
  for (const kat of fs.readdirSync(temaDir)) {
    if (kat.startsWith('_') || !fs.statSync(path.join(temaDir, kat)).isDirectory()) continue;
    for (const nm of fs.readdirSync(path.join(temaDir, kat))) {
      if (fs.existsSync(path.join(temaDir, kat, nm, 'index.html'))) tema.push(kat + '/' + nm);
    }
  }

  const per = {};   // nama berkas -> pemakaian paling menuntut
  const hilang = [];
  for (const t of tema) {
    for (const d of await periksaTema(t)) {
      for (const nama of d.berkas) {
        const f = path.join(REPO, 'templates', '_ornamen', nama);
        if (!fs.existsSync(f)) { hilang.push({ tema: t, nama, sel: d.sel }); continue; }
        const [iw, ih] = dimensi(f);
        const [dw, dh] = terlukis(d.w, d.h, iw, ih, d.size);
        const rasio = Math.min(iw / dw, ih / dh);
        if (!per[nama] || rasio < per[nama].rasio)
          per[nama] = { nama, rasio, dw: Math.round(dw), dh: Math.round(dh), iw, ih, tema: t, sel: d.sel };
      }
    }
  }

  const urut = Object.values(per).sort((a, b) => a.rasio - b.rasio);
  let gagal = 0;
  console.log('rasio = piksel berkas per piksel CSS, pada pemakaian TERBESAR aset itu');
  console.log('ambang: ' + AMBANG.toFixed(2) + '\n');
  for (const u of urut) {
    const kecuali = DIKECUALIKAN[u.nama];
    const buruk = u.rasio < AMBANG && !kecuali;
    if (buruk) gagal++;
    if (!buruk && !rinci && !(kecuali && u.rasio < AMBANG)) continue;
    const tanda = buruk ? '[GAGAL]' : (kecuali ? '[kecuali]' : '[  ok  ]');
    console.log(tanda + ' ' + u.rasio.toFixed(2).padStart(5) + '  ' + u.nama);
    console.log('         berkas ' + u.iw + 'x' + u.ih + ', dilukis ' + u.dw + 'x' + u.dh +
                ' di ' + u.tema + ' (' + u.sel + ')');
    if (kecuali) console.log('         ' + kecuali);
    else if (buruk) console.log('         perbesar berkasnya (tools/siapkan-ornamen.js, naikkan `lebar`) ATAU kecilkan kotaknya di CSS');
  }
  for (const h of hilang) {
    gagal++;
    console.log('[GAGAL] berkas tidak ada: ' + h.nama + '  dirujuk ' + h.tema + ' (' + h.sel + ')');
  }

  console.log('\n' + urut.length + ' aset ornamen dipakai; ' +
    (gagal ? gagal + ' perlu diperbaiki.' : 'semuanya cukup tajam.'));
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(1); });
