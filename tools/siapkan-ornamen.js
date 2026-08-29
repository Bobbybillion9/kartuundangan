/**
 * Menyiapkan aset ornamen untuk dipakai tema: memperkecil + mengubah ke WebP.
 *
 * KENAPA BERKAS INI ADA
 * ---------------------
 * Aset ornamen mentah ada di luar repo (folder OneDrive milik user) dan
 * BERAT: 23 MB seluruhnya, wax seal saja rata-rata 371 KB per keping untuk
 * gambar 500x500. Kalau dipakai apa adanya, satu tema dengan latar penuh +
 * empat ornamen sudut + wax seal bisa melewati 2 MB.
 *
 * Itu bukan angka teoretis. Undangan ini dibuka tamu di HP memakai kuota,
 * sering di tempat resepsi dengan sinyal buruk, dan tiga tema pertama
 * murni CSS/SVG sehingga terbuka seketika. Menambahkan tema yang butuh
 * 2 MB akan terasa seperti kemunduran justru pada tema yang paling mahal.
 *
 * Hasilnya di-commit ke repo (bukan dibangun saat deploy) karena project
 * ini memang tanpa build step — lihat CLAUDE.md.
 *
 * KENAPA LEWAT CHROME
 * -------------------
 * Tidak ada ImageMagick di mesin ini (`convert` yang ada di PATH itu alat
 * NTFS bawaan Windows), dan System.Drawing bawaan .NET — yang dipakai
 * tools/potret-tema.js — TIDAK bisa menulis WebP sama sekali. Yang sudah
 * tersedia dan bisa: mesin encoder di dalam Chrome, lewat
 * canvas.toDataURL('image/webp'). Chrome-nya sudah dipakai dua alat lain
 * di folder ini, jadi tidak ada prasyarat baru.
 *
 * Berkas sumbernya ada di luar repo sehingga tidak bisa disajikan server
 * statis project. Alat ini menyalakan server kecil sendiri di port acak
 * khusus selama proses berjalan, lalu mematikannya.
 *
 * PRASYARAT: Chrome headless dengan --remote-debugging-port=9222
 *
 * PAKAI:  node tools/siapkan-ornamen.js [nama-keluaran ...]
 *         tanpa argumen = semua
 *         --paksa   tulis ulang walau berkas tujuannya sudah ada
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const REPO = path.resolve(__dirname, '..');
const CDP = 'http://127.0.0.1:9222';

// Folder aset mentah milik user, di luar repo dan di luar git.
const SUMBER = path.join(
  process.env.USERPROFILE || require('os').homedir(),
  'OneDrive', 'Dokumen', 'Website Project', 'Kartuundangan Project',
  'FOTO UNTUK SAMPEL', 'ORNAMENT'
);

const TUJUAN_DIR = path.join(REPO, 'templates', '_ornamen');

// ============================================================
// DAFTAR ASET
// ------------------------------------------------------------
// Nama keluaran sengaja deskriptif (bukan nama tema), karena satu aset
// bisa dipakai beberapa tema. Nama sumbernya dipertahankan apa adanya
// supaya bisa ditelusuri balik ke folder user.
//
// "lebar" adalah lebar TARGET. Sumbernya tidak pernah diperbesar — kalau
// sumbernya lebih kecil, ukuran aslinya yang dipakai. Latar dibiarkan di
// lebar aslinya (~736px): memperbesar tidak menambah detail, cuma berat.
// ============================================================
const ORNAMEN = [
  // --- latar penuh ---
  {
    keluaran: 'latar-relief-halus.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/REGULAR/download (4).jpg',
    lebar: 736, mutu: 0.7,
    catatan: 'relief bunga putih rata, tanpa titik fokus — untuk latar halaman'
  },
  {
    keluaran: 'latar-plaster-daun.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/REGULAR/1046524032183404512.jpg',
    lebar: 736, mutu: 0.72,
    catatan: 'plaster pahatan daun, kontras kuat — untuk amplop & bidang kecil'
  },
  {
    keluaran: 'latar-bingkai-renda.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/REGULAR/893120169867625111.jpg',
    lebar: 736, mutu: 0.7,
    catatan: 'bingkai timbul bermotif renda, punya bidang kosong di tengah'
  },
  {
    keluaran: 'latar-hitam-emas.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/REGULAR/847239748695884284.jpg',
    lebar: 736, mutu: 0.72,
    catatan: 'hitam pekat dengan botani emas di tepi kiri — untuk tema malam'
  },
  {
    keluaran: 'latar-burgundy-kertas.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/REGULAR/872783602825743437.jpg',
    lebar: 675, mutu: 0.72,
    catatan: 'burgundy pekat dengan kertas bertepi sobek dan segel merah'
  },

  // --- ornamen sudut (transparan) ---
  {
    keluaran: 'sudut-baroque-a.webp',
    sumber: 'CORNER ORNAMENT/CORNER (3).png',
    lebar: 420, mutu: 0.88, alpha: true,
    catatan: 'sulur baroque emas, sudut kiri-atas; putar untuk sudut lain'
  },
  {
    keluaran: 'sudut-baroque-b.webp',
    sumber: 'CORNER ORNAMENT/CORNER (4).png',
    lebar: 420, mutu: 0.88, alpha: true,
    catatan: 'sulur baroque emas, lebih rapat'
  },
  {
    keluaran: 'sudut-bunga-emas.webp',
    sumber: 'CORNER ORNAMENT/CORNER (9).png',
    lebar: 420, mutu: 0.88, alpha: true,
    catatan: 'bunga emas bergaya ukiran, lebih lembut dari baroque'
  },

  // --- wax seal (transparan) ---
  {
    keluaran: 'segel-emas-bunga.webp',
    sumber: 'WAX SEALS/WAX STAMPS (4).png',
    lebar: 360, mutu: 0.9, alpha: true,
    catatan: 'segel emas bermotif bunga'
  },
  {
    keluaran: 'segel-gading.webp',
    sumber: 'WAX SEALS/WAX STAMPS (6).png',
    lebar: 360, mutu: 0.9, alpha: true,
    catatan: 'segel gading/krem, halus untuk tema terang'
  },
  {
    keluaran: 'segel-mawar-merah.webp',
    sumber: 'WAX SEALS/WAX STAMPS (27).png',
    lebar: 360, mutu: 0.9, alpha: true,
    catatan: 'segel merah bermotif mawar'
  },
  {
    keluaran: 'segel-mawar-hitam-emas.webp',
    sumber: 'WAX SEALS/WAX STAMPS (3).png',
    lebar: 360, mutu: 0.9, alpha: true,
    catatan: 'segel hitam dengan mawar emas'
  },
  // --- bingkai foto (transparan, DIWARNAI ULANG) ---
  {
    keluaran: 'bingkai-klasik-emas.webp',
    sumber: 'FRAME ORNAMENT/725361083777041375-removebg-preview.png',
    lebar: 500, mutu: 0.9, alpha: true,
    warnai: { gelap: '#7E611F', terang: '#E6CA8C' },
    catatan: 'bingkai garis klasik; sumbernya biru navy, diwarnai jadi emas'
  },

  // --- ornamen bebas (sudah emas, tinggal dikecilkan) ---
  {
    keluaran: 'bebas-bulu-emas.webp',
    sumber: 'FREE ORNAMENT/590534569878681499-removebg-preview.png',
    lebar: 260, mutu: 0.9, alpha: true,
    catatan: 'bulu tulis emas — untuk bagian Ucapan & Doa'
  },
  {
    keluaran: 'bebas-burung-emas.webp',
    sumber: 'FREE ORNAMENT/923449098695577728-removebg-preview.png',
    lebar: 360, mutu: 0.9, alpha: true,
    catatan: 'tiga burung emas terbang — untuk bagian Penutup'
  },
  {
    keluaran: 'bebas-jam-rococo.webp',
    sumber: 'FREE ORNAMENT/1030409589791219572-removebg-preview.png',
    lebar: 320, mutu: 0.9, alpha: true,
    catatan: 'jam rococo emas — untuk bagian Hitung Mundur'
  }
];

// ============================================================
// Server sementara untuk berkas sumber
// ============================================================
// Chrome tidak boleh membaca file:// dari halaman yang di-evaluate, dan
// berkas sumbernya di luar root server statis project — jadi alat ini
// menyajikan foldernya sendiri selama proses berjalan.
// Server ini juga menyajikan satu halaman kosong di "/", dan Chrome
// DINAVIGASI ke sana lebih dulu. Alasannya bukan kerapian: dari halaman
// about:blank, gambar dari server ini terhitung lintas-origin, canvas-nya
// jadi tercemar, dan toDataURL() melempar SecurityError. Dengan halaman
// dan gambar berasal dari origin yang sama, persoalan itu tidak ada.
function nyalakanServer(akar) {
  const TIPE = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif'
  };
  return new Promise((res, rej) => {
    const srv = http.createServer((req, resp) => {
      const rel = decodeURIComponent(req.url.split('?')[0].slice(1));
      if (rel === '') {
        resp.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        resp.end('<!doctype html><title>siapkan-ornamen</title>');
        return;
      }
      const p = path.join(akar, rel);
      if (!p.startsWith(akar)) { resp.writeHead(403); resp.end(); return; }
      fs.readFile(p, (err, data) => {
        if (err) { resp.writeHead(404); resp.end(); return; }
        resp.writeHead(200, {
          'content-type': TIPE[path.extname(p).toLowerCase()] || 'application/octet-stream',
          'access-control-allow-origin': '*'
        });
        resp.end(data);
      });
    });
    srv.on('error', rej);
    srv.listen(0, '127.0.0.1', () => res({ srv, port: srv.address().port }));
  });
}

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

// Dijalankan di dalam Chrome: memuat gambar, menggambarnya ke canvas pada
// ukuran target, lalu mengembalikan hasil WebP sebagai base64.
function skripUbah(url, lebarTarget, mutu, alpha, warnai) {
  return `(async () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('gambar gagal dimuat'));
      img.src = ${JSON.stringify(url)};
    });
    // Tidak pernah memperbesar: memperbesar cuma menambah berat tanpa
    // menambah detail, dan pada ornamen justru memperlihatkan tepi kasar.
    const skala = Math.min(1, ${lebarTarget} / img.naturalWidth);
    const w = Math.round(img.naturalWidth * skala);
    const h = Math.round(img.naturalHeight * skala);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    // Aset tak-transparan diberi alas putih dulu: tanpa itu, JPEG sumber
    // yang punya tepi tipis bisa menghasilkan pinggiran gelap di WebP.
    if (!${!!alpha}) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
    g.drawImage(img, 0, 0, w, h);
    // Pewarnaan ulang. Sebagian aset bagus bentuknya tapi salah
    // warnanya untuk tema yang dituju — bingkai klasik tipis itu biru
    // navy, padahal temanya emas. Diwarnai DI SINI, bukan lewat rantai
    // filter CSS saat runtime: hasilnya pasti, tidak membebani HP tamu,
    // dan tidak bergantung pada dukungan filter di browser mana pun.
    //
    // Cara kerjanya: alpha DIPERTAHANKAN apa adanya — itu yang menyimpan
    // bentuk dan tepi halus garisnya. Yang diganti cuma RGB, jadi
    // gradasi dari gelap ke terang mengikuti KEPEKATAN tinta aslinya:
    // garis tebal jadi emas tua, sapuan tipis jadi emas muda. Mengganti
    // RGB dengan satu warna rata membuat hasilnya terlihat seperti
    // stiker, bukan seperti tinta.
    if (${JSON.stringify(!!warnai)}) {
      const W = ${JSON.stringify(warnai || {})};
      const hx = (v) => [parseInt(v.slice(1,3),16), parseInt(v.slice(3,5),16), parseInt(v.slice(5,7),16)];
      const cGelap = hx(W.gelap), cTerang = hx(W.terang);
      const dat = g.getImageData(0, 0, w, h);
      const px = dat.data;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i+3] === 0) continue;
        const L = (0.299*px[i] + 0.587*px[i+1] + 0.114*px[i+2]) / 255;
        const t = 1 - L;
        px[i]   = Math.round(cTerang[0] + (cGelap[0]-cTerang[0]) * t);
        px[i+1] = Math.round(cTerang[1] + (cGelap[1]-cTerang[1]) * t);
        px[i+2] = Math.round(cTerang[2] + (cGelap[2]-cTerang[2]) * t);
      }
      g.putImageData(dat, 0, 0);
    }
    const url2 = c.toDataURL('image/webp', ${mutu});
    if (url2.indexOf('data:image/webp') !== 0) throw new Error('Chrome ini tidak menulis WebP');
    return JSON.stringify({ w: w, h: h, b64: url2.split(',')[1] });
  })()`;
}

(async () => {
  const arg = process.argv.slice(2);
  const paksa = arg.includes('--paksa');
  const diminta = arg.filter(a => !a.startsWith('--'));

  if (!fs.existsSync(SUMBER)) {
    console.error('Folder aset mentah tidak ditemukan:\n  ' + SUMBER);
    process.exit(1);
  }
  try { await fetch(CDP + '/json/version'); } catch (e) {
    console.error('Chrome dengan --remote-debugging-port=9222 tidak ditemukan.');
    process.exit(1);
  }
  if (!fs.existsSync(TUJUAN_DIR)) fs.mkdirSync(TUJUAN_DIR, { recursive: true });

  const daftar = diminta.length
    ? ORNAMEN.filter(o => diminta.includes(o.keluaran) || diminta.includes(o.keluaran.replace(/\.webp$/, '')))
    : ORNAMEN;
  if (!daftar.length) {
    console.error('Tidak ada aset yang cocok. Tersedia:\n  ' + ORNAMEN.map(o => o.keluaran).join('\n  '));
    process.exit(1);
  }

  const { srv, port } = await nyalakanServer(SUMBER);
  const { kirim, tutup } = await cdp();
  await kirim('Page.enable');
  await kirim('Runtime.enable');
  // Navigasi dulu ke server sementara supaya gambar jadi satu origin
  // dengan halamannya — lihat catatan di nyalakanServer().
  await kirim('Page.navigate', { url: 'http://127.0.0.1:' + port + '/' });
  await new Promise(r => setTimeout(r, 500));

  let totalAsli = 0, totalBaru = 0, gagal = 0;
  for (const o of daftar) {
    const asli = path.join(SUMBER, o.sumber);
    const tujuan = path.join(TUJUAN_DIR, o.keluaran);
    if (!fs.existsSync(asli)) {
      console.log('  ! ' + o.keluaran + ' — sumber tidak ada: ' + o.sumber);
      gagal++; continue;
    }
    if (fs.existsSync(tujuan) && !paksa) {
      console.log('  = ' + o.keluaran + ' (sudah ada, lewati — pakai --paksa untuk menulis ulang)');
      continue;
    }
    const url = 'http://127.0.0.1:' + port + '/' + o.sumber.split('/').map(encodeURIComponent).join('/');
    const res = await kirim('Runtime.evaluate', {
      expression: skripUbah(url, o.lebar, o.mutu, o.alpha, o.warnai),
      awaitPromise: true, returnByValue: true
    });
    if (res.result && res.result.exceptionDetails) {
      const d = res.result.exceptionDetails;
      console.log('  ! ' + o.keluaran + ' — ' + ((d.exception || {}).description || d.text));
      gagal++; continue;
    }
    const info = JSON.parse(res.result.result.value);
    const buf = Buffer.from(info.b64, 'base64');
    fs.writeFileSync(tujuan, buf);
    const kbAsli = fs.statSync(asli).size / 1024;
    const kbBaru = buf.length / 1024;
    totalAsli += kbAsli; totalBaru += kbBaru;
    console.log('  ' + o.keluaran.padEnd(30) +
      info.w + 'x' + info.h +
      '  ' + Math.round(kbAsli) + ' KB -> ' + Math.round(kbBaru) + ' KB' +
      '  (-' + Math.round((1 - kbBaru / kbAsli) * 100) + '%)');
  }

  await tutup();
  srv.close();

  if (totalAsli) {
    console.log('\nTotal: ' + Math.round(totalAsli) + ' KB -> ' + Math.round(totalBaru) + ' KB' +
                '  (-' + Math.round((1 - totalBaru / totalAsli) * 100) + '%)');
  }
  console.log(gagal ? gagal + ' aset GAGAL.' : 'Selesai.');
  process.exit(gagal ? 1 : 0);
})();
