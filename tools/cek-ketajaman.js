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

/* AMBANG KHUSUS LATAR AMPLOP.
   ---------------------------------------------------------------
   Latar amplop punya tuntutan yang secara geometris TIDAK BISA
   dipenuhi pustaka aset milik user, dan itu bukan kesalahan tema mana
   pun. Ia satu-satunya gambar yang harus menutup layar 390x844 penuh
   dengan background-size:cover, sedangkan SELURUH folder latar user
   berhenti di lebar 736 px. Akibatnya, dengan sumber setegak apa pun:

     sumber 736x1308  -> dilukis 475 px  -> rasio 1,55
     sumber 736x1104  -> dilukis 563 px  -> rasio 1,31
     sumber 700x1024  -> dilukis 577 px  -> rasio 1,21

   Ketiganya sudah memakai lebar ASLI sumbernya; menaikkan `lebar` di
   siapkan-ornamen.js tidak berpengaruh sama sekali karena skrip itu
   tidak pernah memperbesar. Satu-satunya perbaikan sungguhan adalah
   berkas sumber yang lebih besar, yang belum ada.

   Ambangnya 1,20 dan bukan sekadar "dimatikan": nilai itu masih
   menangkap kegagalan yang SUNGGUH terlihat. latar-gunungan-emas.webp
   — yang dikeluhkan user pada 2026-09-03 karena buram — berada di
   0,49, jadi ia tetap akan berteriak di ambang ini. Yang tidak lagi
   dilaporkan cuma selisih antara 1,21 dan 1,60, yang sepenuhnya
   ditentukan tinggi berkas sumbernya. */
const AMBANG_AMPLOP = 1.2;
const REPO = path.join(__dirname, '..');

/* Pengecualian, masing-masing dengan alasannya. Sebuah aset boleh masuk
   sini HANYA kalau kelembutannya memang tidak terbaca sebagai cacat —
   bukan karena perbaikannya merepotkan. */
/* Tiap baris di sini WAJIB punya alasan yang bisa diperiksa ulang,
   dan alasan itu harus benar. Pada 2026-09-03 daftar ini memuat
   latar-gunungan-emas.webp dengan alasan "latar tekstur pada ukuran
   aslinya" — padahal ia sumber MENDATAR 626x417 yang dilukis pada
   rasio 0,49 dan benar-benar buram. User yang menemukannya, bukan
   alat ini. Pengecualian yang alasannya tidak pernah diperiksa adalah
   cara sebuah cacat bertahan berbulan-bulan. */
const DIKECUALIKAN = {
  'latar-plaster-daun.webp': 'latar tekstur, dilukis pada ukuran aslinya; sumbernya cuma 675px dan skrip ornamen tidak pernah memperbesar. Tekstur rata tidak punya tepi tajam yang bisa terlihat lunak.',
  'latar-relief-halus.webp': 'sama: latar tekstur pada ukuran aslinya.',
  'latar-burgundy-kertas.webp': 'sama: latar tekstur pada ukuran aslinya.',
  'latar-mihrab-lembut.webp': 'sama: latar tekstur pada ukuran aslinya.',
  /* Dipakai HANYA sebagai tekstur di bawah selubung 0,82-0,90 di
     section#pembuka Sekar Jagad, jadi yang terlihat cuma 10-18% dari
     gambarnya. Sumbernya "Background Thanks.jpg" 600x1076 — ukuran
     ASLINYA, dan berkas terkecil di folder TRADITIONAL milik user —
     sehingga pada layar 390 selebar-lebarnya ia dilukis 390 px dan
     rasionya mentok di 1,54. Beda dengan latar-gunungan-emas yang dulu
     salah dikecualikan di sini: yang itu gambar berfokus pada 0,49,
     bukan tekstur pada 1,54. */
  'latar-jawa-wayang-gading.webp': 'tekstur di bawah selubung .82-.90; sumbernya 600 px, itu ukuran aslinya — 1,54 adalah langit-langitnya.',
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
  /* Memisah nilai CSS berlapis pada koma TERLUAR saja. split(',')
     biasa tidak bisa dipakai: satu lapis gradasi mengandung koma di
     dalam kurungnya sendiri, dan memotongnya di situ menghasilkan
     lapis palsu yang tidak lagi sejajar dengan daftar ukurannya. */
  function pisahLapis(v){
    var out = [], dalam = 0, buf = '';
    for (var i = 0; i < v.length; i++){
      var ch = v[i];
      if (ch === '(') dalam++;
      else if (ch === ')') dalam--;
      if (ch === ',' && dalam === 0){ out.push(buf.trim()); buf = ''; }
      else buf += ch;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }
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
    /* Satu catatan per LAPIS, bukan satu per elemen.
       Sebelumnya seluruh backgroundImage dicatat dengan SATU nilai
       backgroundSize apa adanya, dan begitu sebuah tema memakai latar
       berlapis (mis. "linear-gradient(...), url(ornamen)") nilai itu
       jadi "cover, cover" — yang tidak pernah sama dengan 'cover',
       sehingga terlukis() jatuh ke cabang terakhirnya dan
       mengembalikan UKURAN ASLI berkasnya. Rasionya lalu selalu 1,00
       dan asetnya dilaporkan GAGAL walau sebenarnya dilukis tajam.
       Itu jawaban yang SALAH, bukan sekadar terlewat — dan alat yang
       salah lebih berbahaya daripada alat yang diam. */
    var lapisGambar = pisahLapis(bi);
    var lapisUkuran = pisahLapis(s.backgroundSize);
    for (var L = 0; L < lapisGambar.length; L++) {
      var mm = lapisGambar[L].match(/_ornamen\\/([^"')]+)/);
      if (!mm) continue;
      hasil.push({
        berkas: [mm[1]],
        w: Math.round(w), h: Math.round(h),
        /* CSS mengulang daftar background-size secara siklis kalau
           jumlahnya lebih sedikit daripada jumlah lapis gambarnya. */
        size: lapisUkuran.length ? lapisUkuran[L % lapisUkuran.length] : 'auto',
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (pseudo || '')
      });
    }
  }
  var semua = document.querySelectorAll('*');
  for (var i = 0; i < semua.length; i++){ baca(semua[i], null); baca(semua[i], '::before'); baca(semua[i], '::after'); }
  return JSON.stringify(hasil);
})()`;

/* Versi AMBIL yang dibatasi ke pohon #amplop. Dipakai pada putaran
   kedua, saat halaman dimuat TANPA ?amplop=lewat. Dibatasi supaya
   ornamen badan undangan tidak terhitung dua kali — pada putaran itu
   sebagian memang masih terlihat di belakang amplop. */
const AMBIL_AMPLOP = AMBIL.replace(
  "var semua = document.querySelectorAll('*');",
  "var akarAmplop = document.getElementById('amplop');" +
  "var semua = akarAmplop ? akarAmplop.querySelectorAll('*') : [];" +
  "if (akarAmplop) { baca(akarAmplop, null); baca(akarAmplop, '::before'); baca(akarAmplop, '::after'); }");

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
  const hasil = JSON.parse(r.result.value);

  /* PUTARAN KEDUA: TAHAP AMPLOP.
     Putaran pertama memuat halaman dengan ?amplop=lewat — harus,
     karena tanpa itu seluruh isi undangan bersembunyi di balik sampul
     (.reveal-after-cover display:none) dan tidak satu pun ornamennya
     bisa diukur. Akibatnya latar AMPLOP tidak pernah terukur sama
     sekali: ia hanya ada ketika parameter itu TIDAK dipakai.

     Itu bukan celah teoretis. latar-gunungan-emas.webp dilukis pada
     rasio 0,49 selama berminggu-minggu — hampir tiga kali lebih buruk
     daripada apa pun yang pernah dilaporkan alat ini — dan yang
     akhirnya menemukannya user, bukan alat ini. Latar amplop justru
     yang PALING mudah salah: ia satu-satunya yang harus menutup layar
     penuh 390x844, jadi tuntutan resolusinya paling berat.

     Karena itu tema dimuat sekali lagi tanpa parameter, dan yang
     diambil cuma ornamen di dalam #amplop. */
  const url2 = 'http://localhost:5500/templates/' + tema + '/index.html';
  const selesai2 = new Promise((res) => {
    const on = (ev) => { let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.method === 'Page.loadEventFired') { ws.removeEventListener('message', on); res(); } };
    ws.addEventListener('message', on);
  });
  await c('Page.navigate', { url: url2 }); await selesai2;
  await new Promise((res) => setTimeout(res, 1600));
  const r2 = await c('Runtime.evaluate', { expression: AMBIL_AMPLOP, returnByValue: true });
  for (const u of JSON.parse(r2.result.value)) { u.amplop = true; hasil.push(u); }

  ws.close(); await fetch(CDP + '/json/close/' + tgt.id);
  return hasil;
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
          /* d.amplop ikut dibawa: penilaiannya memakai ambang yang
             berbeda, dan tanpa field ini bendera itu hilang di agregasi. */
          per[nama] = { nama, rasio, dw: Math.round(dw), dh: Math.round(dh), iw, ih, tema: t, sel: d.sel, amplop: !!d.amplop };
      }
    }
  }

  const urut = Object.values(per).sort((a, b) => a.rasio - b.rasio);
  let gagal = 0;
  console.log('rasio = piksel berkas per piksel CSS, pada pemakaian TERBESAR aset itu');
  console.log('ambang: ' + AMBANG.toFixed(2) + '\n');
  for (const u of urut) {
    const kecuali = DIKECUALIKAN[u.nama];
    /* Latar amplop dinilai dengan ambangnya sendiri — alasannya di
       kepala berkas ini. */
    const ambang = u.amplop ? AMBANG_AMPLOP : AMBANG;
    const buruk = u.rasio < ambang && !kecuali;
    if (buruk) gagal++;
    if (!buruk && !rinci && !(kecuali && u.rasio < ambang)) continue;
    const tanda = buruk ? '[GAGAL]' : (kecuali ? '[kecuali]' : '[  ok  ]');
    console.log(tanda + ' ' + u.rasio.toFixed(2).padStart(5) + '  ' + u.nama);
    console.log('         berkas ' + u.iw + 'x' + u.ih + ', dilukis ' + u.dw + 'x' + u.dh +
                ' di ' + u.tema + ' (' + u.sel + ')');
    if (kecuali) console.log('         ' + kecuali);
    else if (buruk) console.log('         periksa ukuran ASLI sumbernya dulu: kalau berkas ini sudah selebar sumbernya,'
                                + ' menaikkan `lebar` di siapkan-ornamen.js TIDAK berpengaruh (skrip itu tidak pernah'
                                + ' memperbesar) — yang bisa cuma mengecilkan kotaknya di CSS atau mengganti sumbernya'
                                + (u.amplop ? '  [latar amplop]' : ''));
  }
  for (const h of hilang) {
    gagal++;
    console.log('[GAGAL] berkas tidak ada: ' + h.nama + '  dirujuk ' + h.tema + ' (' + h.sel + ')');
  }

  console.log('\n' + urut.length + ' aset ornamen dipakai; ' +
    (gagal ? gagal + ' perlu diperbaiki.' : 'semuanya cukup tajam.'));
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(1); });
