/**
 * Memotret ulang SEMUA gambar statis yang diambil dari sampul tema.
 *
 * KENAPA BERKAS INI ADA
 * ---------------------
 * Ada dua gambar per tema yang bukan aset desain, melainkan POTRET dari
 * sampul tema itu sendiri:
 *
 *   templates/<kategori>/<tema>/assets/thumbnail.jpg  -> kartu tema
 *   assets/hero/<tema>.jpg                            -> mockup HP di hero
 *
 * Artinya setiap kali sampul sebuah tema berubah — CSS-nya, foto contohnya,
 * monogramnya — kedua gambar itu langsung basi, dan TIDAK ADA yang
 * memberi tahu. Gagalnya senyap dan tampak seperti bug yang sudah
 * diperbaiki tapi "masih muncul".
 *
 * Itu sudah benar-benar terjadi: garis putih di sampul Sage Rose sudah
 * diperbaiki di CSS dan hilang di undangan sungguhan, tapi masih terlihat
 * di halaman depan dan di kartu tema selama berjam-jam — karena yang
 * dilihat orang di sana adalah potret lama.
 *
 * JALANKAN SETIAP KALI:
 *   - CSS/markup sampul sebuah tema diubah
 *   - berkas di templates/_demo/<tema>/ diganti
 *   - tema baru ditambahkan
 *
 * PRASYARAT (dua-duanya harus sudah jalan):
 *   1. server statis lokal di http://localhost:5500 dari root repo
 *   2. Chrome headless dengan --remote-debugging-port=9222
 *      Catatan: --window-size TIDAK menentukan viewport di Windows (ada
 *      batas lebar jendela minimum), jadi ukurannya dipaksa lewat
 *      Emulation.setDeviceMetricsOverride, bukan lewat argumen.
 *
 * PAKAI:  node tools/potret-tema.js [nama-tema ...]
 *         tanpa argumen = semua tema
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const SERVER = 'http://localhost:5500';
const CDP = 'http://127.0.0.1:9222';

// Dua ukuran, dua tujuan. Lebar potret = lebar HP sungguhan; hasil
// akhirnya diperbesar 2x oleh deviceScaleFactor lalu diperkecil ke ukuran
// simpan di bawah.
// `tema` di sini adalah objek dari temaTersedia(): { nama, kategori, id }.
// Kategorinya ikut dibawa, bukan konstanta — dulu berkas ini mengunci
// 'elegan-klasik', sehingga tema di kategori baru akan memotret path yang
// tidak ada. Gagalnya senyap: yang muncul cuma folder assets/ kosong.
const KELUARAN = [
  {
    nama: 'thumbnail',
    viewport: { w: 390, h: 585 },          // rasio 2:3, kartu tema
    simpan: { w: 780, h: 1170, mutu: 84 },
    tujuan: t => path.join(REPO, 'templates', t.kategori, t.nama, 'assets', 'thumbnail.jpg')
  },
  {
    nama: 'hero HP',
    viewport: { w: 390, h: 844 },          // rasio HP sungguhan, mockup hero
    simpan: { w: 640, h: 1385, mutu: 82 },
    tujuan: t => path.join(REPO, 'assets', 'hero', t.nama + '.jpg')
  }
];

// Ditelusuri dari struktur folder supaya kategori baru langsung ikut
// terpotret tanpa berkas ini perlu diubah. Folder berawalan '_'
// (mis. templates/_demo) bukan kategori.
function temaTersedia() {
  const akar = path.join(REPO, 'templates');
  const hasil = [];
  for (const kat of fs.readdirSync(akar, { withFileTypes: true })) {
    if (!kat.isDirectory() || kat.name.startsWith('_')) continue;
    for (const t of fs.readdirSync(path.join(akar, kat.name), { withFileTypes: true })) {
      if (!t.isDirectory()) continue;
      hasil.push({ nama: t.name, kategori: kat.name, id: kat.name + '/' + t.name });
    }
  }
  return hasil;
}

async function cdp(url) {
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

async function potret(tema, keluaran) {
  const { kirim, tutup } = await cdp();
  await kirim('Page.enable');
  await kirim('Runtime.enable');
  await kirim('Emulation.setDeviceMetricsOverride', {
    width: keluaran.viewport.w, height: keluaran.viewport.h,
    deviceScaleFactor: 2, mobile: true
  });
  // ?amplop=lewat mematikan tahap amplop+wax seal (assets/amplop.js).
  // WAJIB di sini: kalau amplopnya tampil, ia menutupi seluruh layar dan
  // setiap kartu tema jadi gambar amplop — yang bentuknya nyaris sama
  // untuk semua tema, sehingga etalase kehilangan gunanya. Yang harus
  // dipotret adalah sampul temanya.
  await kirim('Page.navigate', {
    url: SERVER + '/templates/' + tema.id + '/index.html?amplop=lewat'
  });

  // Menunggu gambar benar-benar selesai, bukan menunggu durasi tetap:
  // sampul memuat foto contoh dari templates/_demo/, dan potret yang
  // diambil sebelum foto itu masuk menghasilkan sampul KOSONG — persis
  // kesalahan yang dulu membuat kartu tema menampilkan sampul hampa.
  let siap = false;
  for (let i = 0; i < 40 && !siap; i++) {
    await new Promise(r => setTimeout(r, 250));
    const res = await kirim('Runtime.evaluate', {
      expression: `(() => {
        if (document.readyState !== 'complete') return false;
        const cover = document.getElementById('cover');
        if (!cover) return false;
        // has-sampul dipasang demo-template.js SETELAH foto sampulnya
        // selesai dimuat, jadi ia penanda paling jujur bahwa sampulnya siap.
        if (!cover.classList.contains('has-sampul')) return false;
        // Gambar loading="lazy" (enam foto galeri tiap tema, sejak
        // 2026-09-04) DIKECUALIKAN. Yang di-lazy letaknya ribuan piksel
        // di bawah lipatan, jadi browser memang tidak akan pernah
        // memuatnya selama halaman ini tidak digulir — i.complete-nya
        // tetap false SELAMANYA. Tanpa pengecualian ini, tiap tema
        // menunggu 10 detik sampai batas waktu lalu dipotret dengan
        // peringatan palsu "sampul belum siap".
        return Array.from(document.images)
          .every(i => !i.src || i.complete || i.loading === 'lazy');
      })()`,
      returnByValue: true
    });
    siap = !!(res.result && res.result.result.value);
  }
  if (!siap) console.warn('  ! ' + tema.id + ': sampul belum siap setelah 10 detik, tetap dipotret');

  // Beri jeda pendek supaya animasi masuk sudah selesai — elemen yang
  // tertangkap di tengah transisi tampil setengah transparan.
  await new Promise(r => setTimeout(r, 900));

  const shot = await kirim('Page.captureScreenshot', { format: 'png' });
  const tmp = path.join(require('os').tmpdir(), 'ku-potret-' + tema.nama + '-' + Date.now() + '.png');
  fs.writeFileSync(tmp, Buffer.from(shot.result.data, 'base64'));
  await tutup();
  return tmp;
}

// Pengubahan ukuran & konversi ke JPEG dilakukan PowerShell + System.Drawing:
// tidak ada ImageMagick di mesin ini, dan `convert` yang ada di PATH itu
// alat NTFS bawaan Windows, bukan ImageMagick.
function keJpeg(sumber, tujuan, lebar, tinggi, mutu) {
  const dir = path.dirname(tujuan);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ps = `
    Add-Type -AssemblyName System.Drawing
    $asli = [System.Drawing.Image]::FromFile('${sumber.replace(/\\/g, '\\\\')}')
    $kanvas = New-Object System.Drawing.Bitmap(${lebar}, ${tinggi})
    $g = [System.Drawing.Graphics]::FromImage($kanvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($asli, 0, 0, ${lebar}, ${tinggi})
    $g.Dispose()
    $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $par = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $par.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]${mutu})
    $kanvas.Save('${tujuan.replace(/\\/g, '\\\\')}', $enc, $par)
    $kanvas.Dispose(); $asli.Dispose()
  `;
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'pipe' });
}

(async () => {
  const diminta = process.argv.slice(2);
  const semua = temaTersedia();
  const tema = diminta.length
    ? semua.filter(t => diminta.includes(t.nama) || diminta.includes(t.id))
    : semua;
  if (!tema.length) {
    console.error('Tidak ada tema yang cocok. Tersedia: ' + semua.map(t => t.nama).join(', '));
    process.exit(1);
  }

  // Gagal cepat kalau prasyaratnya belum jalan — lebih baik daripada
  // menghasilkan gambar kosong yang baru ketahuan setelah di-commit.
  try { await fetch(SERVER + '/'); } catch (e) {
    console.error('Server lokal di ' + SERVER + ' tidak menjawab. Nyalakan dulu.'); process.exit(1);
  }
  try { await fetch(CDP + '/json/version'); } catch (e) {
    console.error('Chrome dengan --remote-debugging-port=9222 tidak ditemukan.'); process.exit(1);
  }

  for (const t of tema) {
    console.log(t.id);
    for (const k of KELUARAN) {
      const png = await potret(t, k);
      const tujuan = k.tujuan(t);
      keJpeg(png, tujuan, k.simpan.w, k.simpan.h, k.simpan.mutu);
      fs.unlinkSync(png);
      const kb = Math.round(fs.statSync(tujuan).size / 1024);
      console.log('  ' + k.nama.padEnd(10) + ' -> ' + path.relative(REPO, tujuan).replace(/\\/g, '/') +
                  '  (' + k.simpan.w + 'x' + k.simpan.h + ', ' + kb + ' KB)');
    }
  }
  console.log('\nSelesai. Periksa hasilnya sebelum commit.');
  process.exit(0);
})();
