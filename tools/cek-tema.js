/**
 * Pemeriksa kesesuaian tema.
 *
 * KENAPA BERKAS INI ADA
 * ---------------------
 * Sebuah tema bukan cuma "halaman yang bagus". Ia harus memenuhi KONTRAK
 * yang tidak tertulis di mana pun kecuali di dalam kode yang memakainya:
 *
 *   assets/render-undangan.js  mencari [data-slot="..."] tertentu, sembilan
 *                              slot foto yang masing-masing membungkus satu
 *                              <img>, sederet id formulir, dan dua fungsi
 *                              global (buatMonogram, mulaiHitungMundur)
 *   assets/demo-template.js    mencari #cover, #bgMusic, #musicBtn, dan
 *                              berkas contoh di templates/_demo/<tema>/
 *   tools/potret-tema.js       menunggu #cover.has-sampul
 *   assets/theme-templates.js  harus mendaftarkan folder temanya
 *
 * Kalau satu mata rantai itu putus, TIDAK ADA yang melempar error. Slot
 * yang salah nama cuma tidak terisi; <img> yang lupa dipasang cuma
 * membuat fotonya hilang; id formulir yang berbeda cuma membuat kiriman
 * tamu tidak pernah sampai. Semuanya tampak "hampir benar" di layar.
 *
 * Pola itu sudah terjadi berkali-kali dengan baru TIGA tema, dan
 * pemeriksaannya selama ini manual. Rencananya tema akan ditambah banyak;
 * pada saat itu pemeriksaan manual pasti jebol. Berkas ini menggantikannya.
 *
 * JALANKAN SETIAP KALI:
 *   - menambah tema baru (WAJIB, sebelum ditawarkan ke pelanggan)
 *   - mengubah markup/CSS sebuah tema
 *   - mengubah assets/render-undangan.js atau assets/demo-template.js
 *
 * PRASYARAT untuk pemeriksaan DOM (bagian berkas jalan tanpa keduanya):
 *   1. server statis lokal di http://localhost:5500 dari root repo
 *   2. Chrome headless dengan --remote-debugging-port=9222
 *
 * PAKAI:  node tools/cek-tema.js [nama-tema ...]   (tanpa argumen = semua)
 *         --rinci    tampilkan juga pemeriksaan yang lolos
 *         --berkas   lewati pemeriksaan DOM (tidak butuh Chrome)
 *
 * KELUAR dengan kode 1 kalau ada satu saja pemeriksaan yang GAGAL, supaya
 * bisa dipakai sebagai gerbang sebelum commit.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const SERVER = 'http://localhost:5500';
const CDP = 'http://127.0.0.1:9222';

// ============================================================
// KONTRAK
// ============================================================
// Daftar di bawah ini adalah salinan dari apa yang benar-benar dicari
// assets/render-undangan.js. Salinan selalu bisa menua — karena itu
// cocokkanKontrakDenganPerender() di bawah membaca ulang berkas perender
// dan mengadu isinya dengan daftar ini. Kalau perender mulai memakai slot
// baru dan daftar ini tidak ikut diperbarui, alat ini yang berteriak
// duluan, bukan pelanggan.

// Slot teks yang diisi setSlotText()/dibaca querySelector() di perender.
const SLOT_TEKS = [
  'nama_tamu',
  'nama_pria_panggilan', 'nama_wanita_panggilan',
  'nama_pria_lengkap', 'nama_wanita_lengkap',
  'orangtua_pria', 'orangtua_wanita',
  'tanggal_akad', 'tanggal_resepsi', 'tanggal_acara',
  'waktu_akad', 'waktu_resepsi',
  'lokasi_nama', 'lokasi_alamat', 'lokasi_maps_url',
  'tanggal_hitung_mundur',
  'kalimat_pembuka', 'kalimat_penutup',
  'nama_bank_1', 'no_rekening_1', 'pemilik_rekening_1',
  'nama_bank_2', 'no_rekening_2', 'pemilik_rekening_2'
];

// Slot foto: masing-masing WAJIB membungkus satu <img>, karena
// setSlotFoto() memasang src ke <img> di dalamnya — bukan ke wadahnya.
const SLOT_FOTO = [
  'foto_utama', 'foto_pria', 'foto_wanita',
  'foto_galeri_1', 'foto_galeri_2', 'foto_galeri_3',
  'foto_galeri_4', 'foto_galeri_5', 'foto_galeri_6'
];

// Slot yang dipakai tema sendiri tapi TIDAK disentuh perender. Didaftarkan
// supaya jelas ini disengaja, bukan slot yang salah ketik.
const SLOT_MILIK_TEMA = ['kalimat_hadiah', 'musik_url'];

// Slot yang DIISI perender tapi TIDAK diwajibkan ada. Tema yang tidak
// menyediakannya sama sekali tidak terpengaruh — setLogoBank() diam saja
// kalau elemennya tidak ketemu. Ini disengaja: tiga tema elegan-klasik
// yang sudah tayang tidak boleh berubah tampilannya gara-gara fitur baru.
const SLOT_OPSIONAL = ['logo_bank_1', 'logo_bank_2'];

// id yang dicari langsung di dokumen.
const ID_DOKUMEN = [
  { id: 'cover',      tag: null,    oleh: 'setFotoSampul() & potret-tema.js' },
  { id: 'openBtn',    tag: null,    oleh: 'tombol buka undangan' },
  { id: 'musicBtn',   tag: null,    oleh: 'populateSlots() & demo-template.js' },
  { id: 'bgMusic',    tag: 'AUDIO', oleh: 'populateSlots() & demo-template.js' },
  { id: 'ucapanList', tag: null,    oleh: 'daftar ucapan tamu' }
];

// id yang dicari DI DALAM sebuah form (form.querySelector('#...')).
// Letaknya penting: elemen yang benar ada tapi duduk di luar <form> akan
// terbaca null oleh perender — dan itu gagal tanpa suara.
const ISI_FORM = {
  rsvpForm: [
    '#rsvpMsg', '#fieldJumlahTamu', '#rsvpJumlah', '#rsvpNama',
    'input[name="pihak"]', 'input[name="kehadiran"]', 'button[type="submit"]'
  ],
  ucapanForm: [
    '#ucapanMsg', '#ucapanNama', '#ucapanPesan', 'button[type="submit"]'
  ],
  hadiahForm: [
    '#hadiahMsg', '#hadiahNama', '#hadiahPesan', '#buktiTransferInput',
    '#uploadDropzone', '#uploadPreview', '#uploadPreviewImg',
    '#uploadFilename', '#uploadRemoveBtn', 'button[type="submit"]'
  ]
};

// Token warna yang WAJIB didefinisikan tema di :root.
//
// applyPalette() di render-undangan.js menyuntikkan `:root{}` berisi
// persis nama-nama ini sesuai palet pilihan user (kolom data.palet).
// Tema yang menulis warnanya langsung alih-alih lewat token akan tampak
// baik-baik saja — sampai user mengganti palet dan TIDAK ADA yang berubah.
// Sebagian palet juga GELAP (sapphire-dusk, onyx-gold, ...): di sana
// --ivory jadi hampir hitam dan --ink jadi hampir putih, jadi warna yang
// dipatok mati bukan cuma tidak ikut berubah, tapi berbalik jadi tak
// terbaca.
const TOKEN_PALET = [
  'ivory', 'paper', 'card',
  'ink', 'ink-mid', 'ink-soft',
  'gold', 'gold-dark', 'gold-tint',
  'line', 'line-soft'
];

// Berkas contoh yang dicari demo-template.js di templates/_demo/<tema>/.
// WebP sejak 2026-09-04 (tools/kompres-demo.js): 16,6 MB -> 11,7 MB untuk
// 150 berkas, tanpa satu piksel pun diubah ukurannya. Daftar ini HARUS
// sama persis dengan peta FOTO/SAMPUL di assets/demo-template.js —
// kalau ketinggalan, kegagalannya senyap: kalauGambarAda() memang
// dirancang mendiamkan berkas yang tidak ada, jadi yang terlihat cuma
// pratinjau dengan slot kosong tanpa satu pun pesan galat.
const BERKAS_DEMO = [
  'sampul.webp', 'utama.webp', 'pria.webp', 'wanita.webp',
  'galeri-1.webp', 'galeri-2.webp', 'galeri-3.webp',
  'galeri-4.webp', 'galeri-5.webp', 'galeri-6.webp'
];

// Musik contoh TIDAK ada di sini lagi. Sejak 2026-09-04 ketiga lagunya
// dipakai bersama dari templates/_demo/_musik/ (dulu 15 salinan dari 3
// berkas, 12,7 MB duplikat murni), dan yang menentukan tema mana memakai
// yang mana adalah peta MUSIK_TEMA di assets/demo-template.js. Yang
// diperiksa di bawah karena itu bukan lagi "ada berkas musik.mp3 di
// folder tema", melainkan "berkas yang ditunjuk peta itu benar ada".
const MUSIK_DIR = ['templates', '_demo', '_musik'];

// Peta MUSIK_TEMA dibaca langsung dari sumbernya supaya alat ini tidak
// bisa memeriksa versi yang sudah usang. Kalau bentuk petanya berubah dan
// tidak terbaca lagi, yang terjadi bukan diam — pemeriksaannya melaporkan
// tema yang tidak terdaftar, dan itu terlihat.
let _petaMusik = null;
function petaMusik() {
  if (_petaMusik) return _petaMusik;
  _petaMusik = {};
  const src = fs.readFileSync(path.join(REPO, 'assets', 'demo-template.js'), 'utf8');
  const blok = /var\s+MUSIK_TEMA\s*=\s*\{([\s\S]*?)\}/.exec(src);
  if (blok) {
    const re = /'([^']+)'\s*:\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(blok[1]))) _petaMusik[m[1]] = m[2];
  }
  return _petaMusik;
}

// ============================================================
// Pengumpul hasil
// ============================================================
function laporan() {
  const baris = [];
  return {
    baris,
    ok:    (label, detail) => baris.push({ status: 'ok',    label, detail }),
    gagal: (label, detail) => baris.push({ status: 'gagal', label, detail }),
    ingat: (label, detail) => baris.push({ status: 'ingat', label, detail })
  };
}

// ============================================================
// Menemukan tema
// ============================================================
// Ditelusuri dari struktur folder, bukan dari daftar kategori yang ditulis
// tangan — supaya kategori baru langsung ikut terperiksa tanpa berkas ini
// perlu diubah.
function semuaTema() {
  const akar = path.join(REPO, 'templates');
  const hasil = [];
  for (const kat of fs.readdirSync(akar, { withFileTypes: true })) {
    if (!kat.isDirectory() || kat.name.startsWith('_')) continue;
    for (const tema of fs.readdirSync(path.join(akar, kat.name), { withFileTypes: true })) {
      if (!tema.isDirectory()) continue;
      hasil.push({
        nama: tema.name,
        kategori: kat.name,
        id: kat.name + '/' + tema.name,
        dir: path.join(akar, kat.name, tema.name)
      });
    }
  }
  return hasil;
}

// Katalog dibaca sebagai teks lalu dievaluasi: berkasnya menempel ke
// window dan tidak bisa di-require begitu saja dari Node.
function bacaKatalog() {
  const src = fs.readFileSync(path.join(REPO, 'assets', 'theme-templates.js'), 'utf8');
  const m = /window\.THEME_TEMPLATES\s*=\s*(\[[\s\S]*?\n\];)/.exec(src);
  if (!m) return null;
  try { return eval('(' + m[1].replace(/;$/, '') + ')'); } catch (e) { return null; }
}

// ============================================================
// Menjaga kontrak di berkas ini tetap sama dengan perender
// ============================================================
function cocokkanKontrakDenganPerender(lap) {
  const src = fs.readFileSync(path.join(REPO, 'assets', 'render-undangan.js'), 'utf8');

  const dipakaiTeks = new Set();
  const dipakaiFoto = new Set();
  let m;
  // Koma penutup itu wajib ada di pola. Tanpanya, potongan string dari
  // penggabungan `setSlotFoto(doc, 'foto_galeri_' + (g + 1), ...)` ikut
  // tertangkap sebagai slot bernama "foto_galeri_" yang tidak pernah ada.
  const reTeks = /setSlotText\(\s*doc\s*,\s*'([a-z0-9_]+)'\s*,/g;
  while ((m = reTeks.exec(src))) dipakaiTeks.add(m[1]);
  const reFoto = /setSlotFoto\(\s*doc\s*,\s*'([a-z0-9_]+)'\s*,/g;
  while ((m = reFoto.exec(src))) dipakaiFoto.add(m[1]);
  const reLogo = /setLogoBank\(\s*doc\s*,\s*'([a-z0-9_]+)'\s*,/g;
  while ((m = reLogo.exec(src))) dipakaiTeks.add(m[1]);
  const reQuery = /\[data-slot="([a-z0-9_]+)"\]/g;
  while ((m = reQuery.exec(src))) dipakaiTeks.add(m[1]);

  // foto_galeri_N dibangun dengan penggabungan string di dalam loop, jadi
  // tidak tertangkap regex di atas — dimaklumi secara eksplisit.
  if (/setSlotFoto\(doc, 'foto_galeri_' \+/.test(src)) {
    for (let i = 1; i <= 6; i++) dipakaiFoto.add('foto_galeri_' + i);
  }

  const kontrak = new Set([...SLOT_TEKS, ...SLOT_FOTO, ...SLOT_OPSIONAL]);
  const asing = [...dipakaiTeks, ...dipakaiFoto].filter(s => !kontrak.has(s));
  if (asing.length) {
    lap.gagal('kontrak di cek-tema.js sudah menua',
      'assets/render-undangan.js memakai slot yang tidak terdaftar di sini: ' +
      asing.join(', ') + '. Tambahkan ke SLOT_TEKS/SLOT_FOTO, lalu jalankan lagi.');
  } else {
    lap.ok('kontrak sama dengan assets/render-undangan.js');
  }

  const tidakDipakai = [...kontrak].filter(s => !dipakaiTeks.has(s) && !dipakaiFoto.has(s));
  if (tidakDipakai.length) {
    lap.ingat('slot diwajibkan tapi tidak dipakai perender', tidakDipakai.join(', '));
  }
}

// ============================================================
// Bagian 1 — pemeriksaan berkas (tanpa browser)
// ============================================================
function periksaBerkas(tema, katalog, lap) {
  const rel = p => path.relative(REPO, p).replace(/\\/g, '/');
  const ada = p => fs.existsSync(p);

  const indexHtml = path.join(tema.dir, 'index.html');
  const styleCss  = path.join(tema.dir, 'style.css');
  const thumb     = path.join(tema.dir, 'assets', 'thumbnail.jpg');
  const hero      = path.join(REPO, 'assets', 'hero', tema.nama + '.jpg');
  const demoDir   = path.join(REPO, 'templates', '_demo', tema.nama);

  for (const [label, berkas] of [['index.html', indexHtml], ['style.css', styleCss]]) {
    ada(berkas) ? lap.ok(label + ' ada') : lap.gagal(label + ' tidak ada', rel(berkas));
  }
  if (!ada(indexHtml)) return;

  const html = fs.readFileSync(indexHtml, 'utf8');
  const css  = ada(styleCss) ? fs.readFileSync(styleCss, 'utf8') : '';

  // --- katalog ---
  const entri = katalog && katalog.find(t => t.id === tema.id);
  if (!entri) {
    lap.gagal('belum terdaftar di THEME_TEMPLATES',
      'tambahkan entri ber-id "' + tema.id + '" di assets/theme-templates.js — ' +
      'tanpa itu tema tidak muncul di halaman depan MAUPUN di dashboard');
  } else {
    lap.ok('terdaftar di THEME_TEMPLATES sebagai "' + entri.name + '"');
    if (!entri.thumb || !ada(path.join(REPO, entri.thumb))) {
      lap.gagal('thumb di katalog menunjuk berkas yang tidak ada', String(entri.thumb));
    }
    for (const wajib of ['name', 'kategori', 'desc', 'ringkas']) {
      if (!entri[wajib]) lap.gagal('entri katalog kehilangan "' + wajib + '"');
    }
  }

  // --- gambar hasil potret ---
  ada(thumb) ? lap.ok('thumbnail.jpg ada')
             : lap.gagal('thumbnail.jpg tidak ada', 'jalankan: node tools/potret-tema.js ' + tema.nama);
  ada(hero)  ? lap.ok('assets/hero/' + tema.nama + '.jpg ada')
             : lap.ingat('tidak ada gambar hero',
                 'hero sengaja memuat tiga tema pilihan saja — abaikan kalau tema ini memang bukan salah satunya');

  // --- berkas contoh pratinjau ---
  if (!ada(demoDir)) {
    lap.gagal('templates/_demo/' + tema.nama + '/ tidak ada',
      'tanpa itu pratinjau tema tampil dengan SEMUA slot foto kosong');
  } else {
    const kurang = BERKAS_DEMO.filter(b => !ada(path.join(demoDir, b)));
    kurang.length
      ? lap.gagal('berkas contoh kurang ' + kurang.length + '/' + BERKAS_DEMO.length, kurang.join(', '))
      : lap.ok('berkas contoh pratinjau lengkap (' + BERKAS_DEMO.length + ')');
  }

  // --- musik contoh (dipakai bersama, lihat catatan di MUSIK_DIR) ---
  //
  // Petanya dibaca dari assets/demo-template.js, BUKAN disalin ke sini.
  // Salinan daftar adalah cara paling pasti supaya alat ini suatu saat
  // memeriksa hal yang sudah tidak benar lagi.
  {
    const berkasMusik = petaMusik()[tema.nama];
    if (!berkasMusik) {
      lap.ingat('tema ini belum terdaftar di MUSIK_TEMA',
        'ia akan memakai MUSIK_BAWAAN — tidak rusak, tapi lagunya mungkin bukan yang kamu maksud');
    } else if (!ada(path.join(REPO, ...MUSIK_DIR, berkasMusik))) {
      lap.gagal('musik contoh tidak ada: ' + berkasMusik,
        'MUSIK_TEMA di assets/demo-template.js menunjuk berkas yang tidak ada di templates/_demo/_musik/');
    } else {
      lap.ok('musik contoh ada (' + berkasMusik + ')');
    }
  }

  // --- potret basi ---
  // Sumber apa pun yang lebih baru dari potretnya berarti potret itu
  // memotret versi lama. Ini persisnya bug yang membuat garis putih Sage
  // Rose tetap terlihat di halaman depan berjam-jam setelah diperbaiki.
  // Statusnya PERINGATAN, bukan gagal: sesudah `git clone`, seluruh berkas
  // punya waktu ubah yang sama dan perbandingannya jadi tidak berarti.
  const sumber = [indexHtml, styleCss].concat(
    ada(demoDir) ? fs.readdirSync(demoDir).map(b => path.join(demoDir, b)) : []
  ).filter(ada);
  const terbaru = Math.max.apply(null, sumber.map(p => fs.statSync(p).mtimeMs));
  for (const [label, gambar] of [['thumbnail.jpg', thumb], ['hero ' + tema.nama + '.jpg', hero]]) {
    if (!ada(gambar)) continue;
    const umur = fs.statSync(gambar).mtimeMs;
    if (terbaru - umur > 60000) {
      const pemicu = sumber.filter(p => fs.statSync(p).mtimeMs > umur).map(rel);
      lap.ingat(label + ' kemungkinan basi',
        'lebih tua dari: ' + pemicu.slice(0, 4).join(', ') +
        (pemicu.length > 4 ? ' (+' + (pemicu.length - 4) + ' lagi)' : '') +
        ' — jalankan: node tools/potret-tema.js ' + tema.nama);
    } else {
      lap.ok(label + ' lebih baru dari sumbernya');
    }
  }

  // --- demo-template.js dimuat ---
  /demo-template\.js/.test(html)
    ? lap.ok('memuat assets/demo-template.js')
    : lap.gagal('tidak memuat assets/demo-template.js',
        'pratinjau tema ini akan tampil dengan slot foto kosong');

  // --- slot foto WAJIB dikirim kosong ---
  // Aturan di CLAUDE.md: foto contoh tidak boleh dipanggang ke dalam
  // markup tema. Dulu sage-rose & ivory-gold melanggarnya, dan setiap
  // calon pembeli yang menekan "Pratinjau" melihat foto anjing bertuliskan
  // "Foto Mempelai Pria".
  const imgSlot = html.match(/<img[^>]*data-rv="img"[^>]*>/g) || [];
  const berSrc = imgSlot.filter(t => /\ssrc\s*=/.test(t));
  if (berSrc.length) {
    lap.gagal(berSrc.length + ' slot foto memanggang foto ke dalam markup',
      'hapus atribut src-nya — foto contoh tempatnya di templates/_demo/' + tema.nama + '/');
  } else {
    lap.ok('slot foto dikirim kosong (' + imgSlot.length + ' <img>)');
  }

  // --- token palet ---
  // Aturannya BUKAN "harus mendefinisikan kesebelas token". Tema yang
  // memang tidak memakai --gold-tint tidak rugi apa-apa dengan tidak
  // mendefinisikannya (sage-rose & emerald-dusk begitu, dan itu wajar).
  // Yang berbahaya justru sebaliknya: token yang DIPAKAI tapi tidak
  // didefinisikan. Di halaman pratinjau mandiri tidak ada palet yang
  // disuntikkan, jadi var(--token) itu tidak menghasilkan apa-apa —
  // temanya rusak di etalase, tapi terlihat benar pada undangan yang
  // kebetulan sudah punya palet.
  const root = /:root\s*\{([\s\S]*?)\}/.exec(css);
  if (!root) {
    lap.gagal('style.css tidak punya blok :root',
      'di sanalah token palet didefinisikan; tanpa itu pratinjau mandiri kehilangan seluruh warnanya');
  } else {
    const dipakaiTanpaDefinisi = TOKEN_PALET.filter(t =>
      new RegExp('var\\(\\s*--' + t + '\\b').test(css) &&
      !new RegExp('--' + t + '\\s*:').test(root[1]));
    dipakaiTanpaDefinisi.length
      ? lap.gagal(dipakaiTanpaDefinisi.length + ' token palet dipakai tapi tidak didefinisikan',
          dipakaiTanpaDefinisi.map(t => '--' + t).join(', ') +
          ' — di pratinjau mandiri (tanpa palet) warnanya kosong')
      : lap.ok('semua token palet yang dipakai sudah didefinisikan di :root');
  }

  // --- sampul full-bleed ---
  // setFotoSampul() cuma mengirim --foto-sampul + class .has-sampul; kalau
  // style.css tema tidak punya aturan yang memakainya, foto sampul tidak
  // pernah muncul dan tidak ada satu pun pesan error.
  (/--foto-sampul/.test(css) && /\.has-sampul/.test(css))
    ? lap.ok('style.css memakai --foto-sampul & .has-sampul')
    : lap.gagal('style.css tidak memakai --foto-sampul/.has-sampul',
        'foto sampul tidak akan pernah tampil; lihat blok "FOTO SAMPUL FULL-BLEED" di tema lain');

  // --- variabel modul bersama yang WAJIB disetel tema ---
  //
  // Dua modul (foto-penuh.css & acara-lokasi.css) mengambil seluruh
  // rupanya dari variabel milik tema, dan keduanya punya nilai bawaan
  // yang MASUK AKAL — persegi polos, pelat putih. Itu justru yang
  // berbahaya: tema yang lupa menyetelnya tidak error, tidak kosong,
  // dan tidak terlihat rusak. Ia cuma diam-diam kehilangan bentuk
  // yang membedakannya dari sebelas tema lain, dan yang menyadarinya
  // pertama kali adalah calon pembeli.
  //
  // Diperiksa terhadap SELURUH berkas, bukan cuma blok :root pertama:
  // variabel-variabel ini ditulis di blok :root tersendiri di bagian
  // bawah style.css, dan regex :root di atas hanya menangkap yang
  // pertama.
  const modul = [
    {
      berkas: 'foto-penuh.css',
      wajib: ['--fp-bentuk', '--fp-rasio', '--fp-galeri-bentuk',
              '--fp-hero-bentuk', '--fp-hero-rasio', '--fp-kaki', '--fp-kosong'],
      akibat: 'foto mempelai/galeri/utama kehilangan bentuk khas temanya, ' +
              'dan kaki gradasinya berakhir di warna yang salah'
    },
    {
      berkas: 'acara-lokasi.css',
      wajib: ['--kal-label', '--kal-judul-font', '--kal-judul-ukuran'],
      akibat: 'lembar bulannya tampil dengan pelat & penanda bawaan, ' +
              'sama persis dengan tema lain yang juga lupa menyetelnya'
    }
  ];
  for (const m of modul) {
    if (!html.includes('assets/' + m.berkas)) continue;
    const kurang = m.wajib.filter(v => !new RegExp(v.replace(/-/g, '\\-') + '\\s*:').test(css));
    kurang.length
      ? lap.gagal(m.berkas + ': ' + kurang.length + ' variabel tema belum disetel',
          kurang.join(', ') + ' — ' + m.akibat)
      : lap.ok(m.berkas + ': variabel tema lengkap');
  }
}

// Arah sebaliknya: katalog yang menunjuk folder yang tidak ada.
function periksaKatalogYatim(katalog, daftarTema, lap) {
  if (!katalog) { lap.gagal('THEME_TEMPLATES tidak bisa dibaca'); return; }
  const punyaFolder = new Set(daftarTema.map(t => t.id));
  const yatim = katalog.filter(t => !punyaFolder.has(t.id));
  yatim.length
    ? lap.gagal(yatim.length + ' entri katalog tanpa folder',
        yatim.map(t => t.id).join(', ') + ' — kartunya tampil, tapi "Pratinjau" membuka halaman kosong')
    : lap.ok('semua entri THEME_TEMPLATES punya folder (' + katalog.length + ')');
}

// ============================================================
// Bagian 2 — pemeriksaan DOM di browser sungguhan
// ============================================================
async function cdp() {
  const r = await fetch(CDP + '/json/new?about:blank', { method: 'PUT' });
  const t = await r.json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0;
  const nunggu = new Map();
  const peristiwa = [];
  await new Promise(res => (ws.onopen = res));
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && nunggu.has(m.id)) { nunggu.get(m.id)(m); nunggu.delete(m.id); }
    else if (m.method) peristiwa.push(m);
  };
  const kirim = (metode, params) => new Promise(res => {
    const n = ++id; nunggu.set(n, res);
    ws.send(JSON.stringify({ id: n, method: metode, params: params || {} }));
  });
  return { kirim, peristiwa, tutup: async () => { ws.close(); await fetch(CDP + '/json/close/' + t.id); } };
}

// Dijalankan DI DALAM dokumen tema. Mengembalikan larik hasil, supaya tiap
// pemeriksaan duduk sedekat mungkin dengan DOM yang diperiksanya.
function skripPemeriksa(kontrak) {
  return `(() => {
  const K = ${JSON.stringify(kontrak)};
  const h = [];
  const ok = (l, d) => h.push({ status: 'ok', label: l, detail: d });
  const gagal = (l, d) => h.push({ status: 'gagal', label: l, detail: d });

  // --- slot teks ---
  const hilang = K.slotTeks.filter(s => !document.querySelector('[data-slot="' + s + '"]'));
  hilang.length
    ? gagal(hilang.length + ' slot teks hilang', hilang.join(', '))
    : ok('semua slot teks ada (' + K.slotTeks.length + ')');

  // --- slot foto + <img> di dalamnya ---
  const tanpaSlot = [], tanpaImg = [];
  K.slotFoto.forEach(s => {
    const w = document.querySelector('[data-slot="' + s + '"]');
    if (!w) tanpaSlot.push(s);
    else if (!w.querySelector('img')) tanpaImg.push(s);
  });
  if (tanpaSlot.length) gagal(tanpaSlot.length + ' slot foto hilang', tanpaSlot.join(', '));
  if (tanpaImg.length) gagal(tanpaImg.length + ' slot foto tanpa <img> di dalamnya',
    tanpaImg.join(', ') + ' — setSlotFoto() memasang src ke <img>, jadi slot tanpa <img> diam saja');
  if (!tanpaSlot.length && !tanpaImg.length) ok(K.slotFoto.length + ' slot foto lengkap & masing-masing punya <img>');

  // --- slot yang tidak dikenal ---
  const dikenal = new Set([].concat(K.slotTeks, K.slotFoto, K.slotMilikTema, K.slotOpsional));
  const asing = [...new Set([...document.querySelectorAll('[data-slot]')]
    .map(e => e.getAttribute('data-slot')))].filter(s => !dikenal.has(s));
  if (asing.length) gagal(asing.length + ' data-slot tidak dikenal', asing.join(', ') +
    ' — nama slot yang salah ketik tidak pernah terisi dan tidak pernah memberi error');

  // --- id dokumen ---
  let idGagal = 0;
  K.idDokumen.forEach(d => {
    const el = document.getElementById(d.id);
    if (!el) { idGagal++; gagal('#' + d.id + ' tidak ada', 'dibutuhkan ' + d.oleh); }
    else if (d.tag && el.tagName !== d.tag) {
      idGagal++;
      gagal('#' + d.id + ' bukan <' + d.tag.toLowerCase() + '>', 'ditemukan <' + el.tagName.toLowerCase() + '>');
    }
  });
  if (!idGagal) ok('id dokumen lengkap (' + K.idDokumen.length + ')');

  // --- isi formulir ---
  Object.keys(K.isiForm).forEach(idForm => {
    const form = document.getElementById(idForm);
    if (!form) { gagal('#' + idForm + ' tidak ada', 'formulir tamu tidak akan pernah tersambung'); return; }
    if (form.tagName !== 'FORM') { gagal('#' + idForm + ' bukan <form>', 'ditemukan <' + form.tagName.toLowerCase() + '>'); return; }
    const kurang = K.isiForm[idForm].filter(sel => !form.querySelector(sel));
    if (kurang.length) {
      const adaDiLuar = kurang.filter(sel => document.querySelector(sel));
      gagal('#' + idForm + ' kekurangan ' + kurang.length + ' elemen', kurang.join(', ') +
        (adaDiLuar.length ? ' — ' + adaDiLuar.join(', ') + ' ADA tapi di LUAR <form>, sedangkan perender mencarinya di dalam' : ''));
    } else ok('#' + idForm + ' lengkap (' + K.isiForm[idForm].length + ' elemen)');
  });

  // --- pill-group ---
  // initPillGroupUmum() mencari input[type=hidden] lewat parentElement.
  const pill = document.querySelectorAll('.pill-group');
  const pillRusak = [...pill].filter(g =>
    !(g.parentElement && g.parentElement.querySelector('input[type="hidden"]')));
  pillRusak.length
    ? gagal(pillRusak.length + ' .pill-group tanpa input hidden bersaudara',
        'pilihan tamu (pihak/kehadiran) tidak akan pernah ikut terkirim')
    : ok(pill.length + ' .pill-group tersambung ke input hidden');

  // --- kartu hadiah ---
  const kartu = document.querySelectorAll('.gift-card');
  if (kartu.length < 2) gagal('cuma ada ' + kartu.length + ' .gift-card', 'perender mengisi dua rekening');
  else {
    const tanpaSalin = [...kartu].filter(k => !k.querySelector('.btn-copy')).length;
    tanpaSalin ? gagal(tanpaSalin + ' .gift-card tanpa .btn-copy', 'nomor rekening sungguhan tidak dipasang ke tombol salin')
               : ok(kartu.length + ' .gift-card, masing-masing punya .btn-copy');
  }

  // --- lokasi_maps_url harus <a> ---
  const maps = document.querySelector('[data-slot="lokasi_maps_url"]');
  if (maps && maps.tagName !== 'A') gagal('lokasi_maps_url bukan <a>',
    'perender memasang href padanya; <' + maps.tagName.toLowerCase() + '> mengabaikannya');
  else if (maps) ok('lokasi_maps_url berupa <a>');

  // CATATAN, supaya tidak ditambahkan lagi: sempat ada pemeriksaan yang
  // mensyaratkan .section-lead di dalam #ucapanList, dan itu SALAH.
  // .section-lead di sana dibuat perender sendiri (buatPesanUcapan) sebagai
  // keadaan "Belum ada ucapan", bukan sesuatu yang tema harus sediakan —
  // dan ucapan contoh milik tema toh sudah dibuang oleh
  // ucapanList.innerHTML = '' sebelum daftar aslinya digambar. Yang benar-
  // benar dituntut dari tema cuma keberadaan #ucapanList (lihat ID_DOKUMEN).

  // --- dua fungsi global ---
  ['buatMonogram', 'mulaiHitungMundur'].forEach(f => {
    typeof window[f] === 'function'
      ? ok('window.' + f + '() tersedia')
      : gagal('window.' + f + '() tidak ada',
          'perender memanggilnya setelah mengisi data; tanpa itu ' +
          (f === 'buatMonogram' ? 'monogram tetap memakai inisial contoh' : 'hitung mundur tetap ke tanggal contoh'));
  });

  // --- monogram benar-benar berubah ---
  // Diuji dari PERILAKU, bukan dari id tertentu: dua tema memakai
  // #monoLetterA/B, satu memakai .mono-a/.mono-b. Yang penting hurufnya
  // ikut berubah, bukan caranya.
  if (typeof window.buatMonogram === 'function') {
    document.querySelectorAll('[data-slot="nama_pria_panggilan"]').forEach(e => e.textContent = 'Zulfikar');
    document.querySelectorAll('[data-slot="nama_wanita_panggilan"]').forEach(e => e.textContent = 'Qorina');
    try {
      window.buatMonogram();
      const teks = [...document.querySelectorAll('body *')]
        .filter(e => e.children.length === 0)
        .map(e => e.textContent.trim());
      const adaZ = teks.indexOf('Z') !== -1, adaQ = teks.indexOf('Q') !== -1;
      (adaZ && adaQ)
        ? ok('buatMonogram() memakai inisial dari data (Z & Q)')
        : gagal('buatMonogram() tidak mengubah monogram',
            'nama diganti Zulfikar & Qorina, tapi ' +
            (!adaZ && !adaQ ? 'huruf Z maupun Q' : (!adaZ ? 'huruf Z' : 'huruf Q')) +
            ' tidak muncul di mana pun — pada undangan sungguhan monogram akan menampilkan inisial contoh');
    } catch (e) { gagal('buatMonogram() melempar error', String((e && e.message) || e)); }
  }

  // --- hitung mundur benar-benar jalan ---
  if (typeof window.mulaiHitungMundur === 'function') {
    const target = new Date(Date.now() + 3 * 86400000 + 3600000).toISOString();
    try {
      window.mulaiHitungMundur(target);
      const angka = ['cdDays', 'cdHours', 'cdMinutes', 'cdSeconds']
        .map(id => { const e = document.getElementById(id); return e ? e.textContent.trim() : null; });
      const kosong = angka.filter(a => !a || !/^\\d+$/.test(a));
      kosong.length
        ? gagal('mulaiHitungMundur() tidak mengisi angka',
            'cdDays/cdHours/cdMinutes/cdSeconds terbaca: ' + JSON.stringify(angka))
        : ok('mulaiHitungMundur() mengisi hitung mundur (' + angka.join(':') + ')');
      // Tanggal kosong harus ditangani, bukan membuat halaman meledak.
      window.mulaiHitungMundur('');
      ok('mulaiHitungMundur("") ditangani tanpa error');
    } catch (e) { gagal('mulaiHitungMundur() melempar error', String((e && e.message) || e)); }
  }

  // --- sampul: --foto-sampul benar-benar dipakai CSS ---
  // Diuji sungguhan, bukan dengan mencari teks di style.css: aturannya bisa
  // saja ada tapi menyasar elemen yang salah.
  const cover = document.getElementById('cover');
  if (cover) {
    const baca = () => [...cover.querySelectorAll('*'), cover]
      .map(e => getComputedStyle(e).backgroundImage).join('|');
    const sebelum = baca();
    cover.style.setProperty('--foto-sampul',
      'url("data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==")');
    cover.classList.add('has-sampul');
    baca() !== sebelum
      ? ok('#cover.has-sampul benar-benar memakai --foto-sampul')
      : gagal('#cover.has-sampul tidak mengubah apa pun',
          'foto sampul yang diunggah user tidak akan pernah tampil, dan potret-tema.js akan menunggu selamanya');
  }

  // --- tahap amplop + wax seal (opsional per tema) ---
  // Diperiksa HANYA kalau tema memuat assets/amplop.js. Modul itu membaca
  // seluruh tampilannya dari variabel --amplop-* milik tema; variabel yang
  // lupa disetel tidak memberi error, cuma menghasilkan amplop polos tanpa
  // segel — dan segel lilin itulah yang dijual.
  if (K.pakaiAmplop) {
    const amp = document.getElementById('amplop');
    if (!amp) {
      gagal('#amplop tidak terbentuk',
        'tema memuat assets/amplop.js tapi amplopnya tidak ada di DOM — periksa path skripnya');
    } else {
      const segel = amp.querySelector('.amplop-segel');
      const badan = amp.querySelector('.amplop-badan');
      const gs = segel ? getComputedStyle(segel).backgroundImage : 'none';
      const gb = badan ? getComputedStyle(badan).backgroundImage : 'none';
      gs && gs !== 'none'
        ? ok('amplop: wax seal terpasang')
        : gagal('amplop tanpa wax seal', 'setel --amplop-segel di :root tema; tanpa itu amplopnya polos');
      gb && gb !== 'none'
        ? ok('amplop: tekstur kertas terpasang')
        : gagal('amplop tanpa tekstur kertas', 'setel --amplop-kertas di :root tema');
      if (!amp.querySelector('.amplop-tombol')) gagal('amplop tanpa tombol buka');
      // Nama tamu di muka amplop harus ikut terisi perender.
      if (!amp.querySelector('[data-slot="nama_tamu"]')) {
        gagal('amplop tidak punya slot nama_tamu', 'nama tamu tidak akan tampil di muka amplop');
      }
      typeof (window.__KU_AMPLOP || {}).lewati === 'function'
        ? ok('amplop: window.__KU_AMPLOP.lewati() tersedia')
        : gagal('window.__KU_AMPLOP.lewati() tidak ada',
            'tools/potret-tema.js memakainya untuk melewati amplop; tanpa itu kartu tema jadi gambar amplop');
    }
  }

  // --- palet benar-benar mengubah tampilan ---
  // Token yang cuma ADA di :root belum tentu DIPAKAI. Di sini palet
  // ditimpa persis seperti applyPalette() melakukannya, lalu warna
  // sungguhan sebelum/sesudah dibandingkan. Kalau tidak ada yang bergerak,
  // tema itu menulis warnanya mati dan fitur ganti palet tidak berfungsi
  // untuknya — tanpa satu pun pesan error.
  const contoh = [document.body].concat([...document.querySelectorAll('body *')].slice(0, 300));
  const warna = () => contoh.map(e => {
    const s = getComputedStyle(e);
    return s.backgroundColor + ' ' + s.color + ' ' + s.borderTopColor;
  }).join('|');
  const warnaSebelum = warna();
  const gaya = document.createElement('style');
  gaya.textContent = ':root{' + K.tokenPalet
    .map((t, i) => '--' + t + ':rgb(' + (i * 20 + 7) + ',' + (i * 7 + 3) + ',' + (255 - i * 20) + ')')
    .join(';') + '}';
  document.head.appendChild(gaya);
  warna() !== warnaSebelum
    ? ok('palet: menimpa token di :root benar-benar mengubah warna')
    : gagal('palet: menimpa token di :root tidak mengubah apa pun',
        'tema ini menulis warnanya langsung, bukan lewat var(--token) — user mengganti palet dan tidak ada yang berubah; pada palet GELAP hasilnya malah jadi tak terbaca');
  gaya.remove();

  return h;
})()`;
}

async function periksaDom(tema, lap) {
  // Tahap amplop bersifat opsional: hanya tema yang memuat assets/amplop.js
  // yang diperiksa kontraknya.
  const pakaiAmplop = /amplop.js/.test(fs.readFileSync(path.join(tema.dir, 'index.html'), 'utf8'));
  const { kirim, peristiwa, tutup } = await cdp();
  try {
    await kirim('Page.enable');
    await kirim('Runtime.enable');
    await kirim('Log.enable');
    await kirim('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true
    });
    await kirim('Page.navigate', { url: SERVER + '/templates/' + tema.id + '/index.html' });

    // Menunggu skrip tema selesai jalan, bukan menunggu durasi tetap.
    let siap = false;
    for (let i = 0; i < 40 && !siap; i++) {
      await new Promise(r => setTimeout(r, 250));
      const res = await kirim('Runtime.evaluate', {
        expression: "document.readyState === 'complete'", returnByValue: true
      });
      siap = !!(res.result && res.result.result && res.result.result.value);
    }
    if (!siap) { lap.gagal('halaman tidak selesai dimuat dalam 10 detik'); return; }

    // Beri kesempatan demo-template.js memasang foto contoh — bukan syarat
    // lolos, tapi membuat pemeriksaan error konsol di bawah bermakna.
    await new Promise(r => setTimeout(r, 1200));

    const res = await kirim('Runtime.evaluate', {
      expression: skripPemeriksa({
        slotTeks: SLOT_TEKS, slotFoto: SLOT_FOTO, slotMilikTema: SLOT_MILIK_TEMA,
        slotOpsional: SLOT_OPSIONAL,
        idDokumen: ID_DOKUMEN, isiForm: ISI_FORM, tokenPalet: TOKEN_PALET,
        pakaiAmplop: pakaiAmplop
      }),
      returnByValue: true
    });
    if (res.result && res.result.exceptionDetails) {
      lap.gagal('pemeriksa DOM gagal dijalankan',
        String(res.result.exceptionDetails.text ||
               (res.result.exceptionDetails.exception || {}).description));
      return;
    }
    for (const b of (res.result.result.value || [])) lap.baris.push(b);

    // --- error konsol & gambar gagal dimuat ---
    // favicon.ico disaring: halaman tema memang tidak punya favicon sendiri
    // (ia selalu tampil di dalam iframe), jadi 404-nya derau tetap, bukan
    // cacat tema.
    const galat = peristiwa
      .filter(p => p.method === 'Log.entryAdded' && p.params.entry.level === 'error')
      .filter(p => !/favicon\.ico/.test(p.params.entry.url || ''))
      .map(p => p.params.entry.text +
        (p.params.entry.url ? ' (' + p.params.entry.url.replace(SERVER, '') + ')' : ''));
    const lempar = peristiwa
      .filter(p => p.method === 'Runtime.exceptionThrown')
      .map(p => ((p.params.exceptionDetails.exception || {}).description) || p.params.exceptionDetails.text);
    lempar.length
      ? lap.gagal(lempar.length + ' error JavaScript saat memuat', lempar.slice(0, 3).join(' | '))
      : lap.ok('tidak ada error JavaScript saat memuat');
    // Berkas tema yang 404 BUKAN sekadar peringatan. Gambar yang tidak
    // ketemu tidak menampilkan apa pun dan tidak menghentikan apa pun —
    // temanya cuma tampil "agak kosong", persis pola gagal-senyap yang
    // jadi alasan alat ini dibuat. Sudah terjadi sekali: url() di dalam
    // custom property diselesaikan relatif terhadap berkas CSS yang
    // MEMAKAINYA, bukan yang menulisnya, sehingga dua ornamen mendarat di
    // path yang salah.
    const hilang = galat.filter(t => /404/.test(t) && /\/(templates|assets)\//.test(t));
    const lain = galat.filter(t => hilang.indexOf(t) === -1);
    if (hilang.length) {
      lap.gagal(hilang.length + ' berkas tema tidak ditemukan (404)',
        hilang.slice(0, 4).join(' | ') + ' — periksa path-nya; gambar yang 404 hilang tanpa pesan apa pun di layar');
    }
    if (lain.length) lap.ingat(lain.length + ' pesan error di konsol', lain.slice(0, 4).join(' | '));

    // --- ORNAMEN PEMBATAS BENAR-BENAR MENGGAMBAR ---
    //
    // Pembatas antar bagian digambar sebagai <svg> inline dengan
    // atribut d yang ditulis tangan. Satu huruf salah di dalam d TIDAK
    // melempar galat apa pun: SVG-nya tetap ada di DOM, ukurannya tetap
    // benar, dan yang tergambar cuma tidak ada. Pada halaman sepanjang
    // undangan, satu pembatas kosong di tengah gulungan tidak akan
    // terlihat sampai ada yang menggulir sampai ke sana.
    //
    // Ditambahkan 2026-09-03, saat delapan belas ornamen pembatas baru
    // ditulis untuk ketiga tema Elegan Klasik.
    //
    // getBBox() WAJIB dipanggil sesudah sampul dibuka: selama sampul
    // terkunci .reveal-after-cover masih display:none, dan getBBox()
    // pada pohon display:none mengembalikan nol untuk SEMUANYA — hasil
    // palsu yang melaporkan setiap pembatas rusak.
    // Isi undangan dibuka dengan MENYUNTIK CSS, bukan dengan menekan
    // tombol sampul. Percobaan pertama menekan #openBtn lalu menunggu
    // 900 ms, dan itu memberi LIMA kegagalan palsu: tiga tema Eropa
    // Mewah menaruh #openBtn di balik tahap amplop sehingga tombolnya
    // belum ada saat ditekan, dan dua tema lain sekadar belum selesai
    // beranimasi. Pemeriksaan geometri tidak boleh bergantung pada
    // animasi — yang diukur bentuk, bukan waktu.
    await kirim('Runtime.evaluate', {
      expression: "(function(){var g=document.createElement('style');" +
        "g.textContent='#amplop{display:none!important}.reveal-after-cover{display:block!important;" +
        "opacity:1!important;transform:none!important}body.cover-locked .reveal-after-cover{display:block!important}';" +
        "document.head.appendChild(g);" +
        "document.querySelectorAll('[data-reveal]').forEach(function(e){e.classList.add('in-view');});})()"
    });
    await new Promise(r => setTimeout(r, 400));
    const orn = await kirim('Runtime.evaluate', {
      expression: "(function(){var kosong=[],n=0;" +
        "document.querySelectorAll('.divider-ornament').forEach(function(sv){n++;var isi=0;" +
        // Sebagian tema memakai <svg class=divider-ornament> sekadar
        // sebagai KOTAK pembawa background-image, lalu menyembunyikan
        // isinya (.divider-ornament path{display:none}). Di situ
        // 'tidak ada geometri di dalam' justru yang benar, dan
        // menghitungnya sebagai cacat memberi kegagalan palsu — sudah
        // terjadi pada tiga tema Eropa Mewah saat pemeriksaan ini
        // pertama ditulis. Ornamen dianggap kosong hanya kalau ia
        // tidak menggambar apa pun DENGAN CARA MANA PUN.
        "var bg=getComputedStyle(sv).backgroundImage;if(bg&&bg!=='none')isi++;" +
        "sv.querySelectorAll('path,circle,ellipse').forEach(function(el){" +
        "try{var b=el.getBBox();if(b.width>1&&b.height>0.5)isi++;}catch(e){}});" +
        "if(!isi)kosong.push((sv.getAttribute('class')||'').replace('divider-ornament','').trim()||'(tanpa kelas)');});" +
        "return JSON.stringify({n:n,kosong:kosong});})()",
      returnByValue: true
    });
    try {
      const o = JSON.parse((orn.result.result || {}).value || '{"n":0,"kosong":[]}');
      if (o.n === 0) {
        lap.ingat('tidak ada .divider-ornament', 'tema ini memakai bentuk pembatas lain — lewati');
      } else if (o.kosong.length) {
        lap.gagal(o.kosong.length + ' dari ' + o.n + ' ornamen pembatas tidak menggambar apa pun',
          [...new Set(o.kosong)].join(', ') + ' — periksa atribut d pada <svg>-nya; d yang salah tidak melempar galat');
      } else {
        lap.ok(o.n + ' ornamen pembatas semuanya menggambar');
      }
    } catch (e) {
      lap.ingat('pemeriksaan ornamen pembatas tidak bisa dibaca', String(e.message || e));
    }
  } finally {
    await tutup();
  }
}

// ============================================================
// Cetak
// ============================================================
const IKON = { ok: '  ok  ', gagal: 'GAGAL ', ingat: 'ingat ' };

function cetak(judul, lap, rinci) {
  const gagal = lap.baris.filter(b => b.status === 'gagal');
  const ingat = lap.baris.filter(b => b.status === 'ingat');
  const ok    = lap.baris.filter(b => b.status === 'ok');

  const ringkas = ok.length + ' lolos' +
    (ingat.length ? ', ' + ingat.length + ' perlu diingat' : '') +
    (gagal.length ? ', ' + gagal.length + ' GAGAL' : '');
  console.log('\n' + (gagal.length ? 'x ' : 'v ') + judul + '  --  ' + ringkas);

  for (const b of (rinci ? lap.baris : gagal.concat(ingat))) {
    console.log('   [' + IKON[b.status] + '] ' + b.label);
    if (b.detail) console.log('            ' + b.detail);
  }
  return gagal.length;
}

// ============================================================
(async () => {
  const arg = process.argv.slice(2);
  const rinci = arg.includes('--rinci');
  const hanyaBerkas = arg.includes('--berkas');
  const diminta = arg.filter(a => !a.startsWith('--'));

  const daftar = semuaTema();
  const tema = diminta.length
    ? daftar.filter(t => diminta.includes(t.nama) || diminta.includes(t.id))
    : daftar;
  if (!tema.length) {
    console.error('Tidak ada tema yang cocok. Tersedia: ' + daftar.map(t => t.nama).join(', '));
    process.exit(1);
  }

  const katalog = bacaKatalog();
  let totalGagal = 0;

  const lapUmum = laporan();
  cocokkanKontrakDenganPerender(lapUmum);
  periksaKatalogYatim(katalog, daftar, lapUmum);
  totalGagal += cetak('Kontrak & katalog', lapUmum, rinci);

  let pakaiBrowser = !hanyaBerkas;
  if (pakaiBrowser) {
    try { await fetch(SERVER + '/'); }
    catch (e) {
      console.error('\n! Server lokal di ' + SERVER + ' tidak menjawab — pemeriksaan DOM DILEWATI.');
      pakaiBrowser = false;
    }
  }
  if (pakaiBrowser) {
    try { await fetch(CDP + '/json/version'); }
    catch (e) {
      console.error('\n! Chrome dengan --remote-debugging-port=9222 tidak ditemukan — pemeriksaan DOM DILEWATI.');
      pakaiBrowser = false;
    }
  }

  for (const t of tema) {
    const lap = laporan();
    periksaBerkas(t, katalog, lap);
    if (pakaiBrowser) await periksaDom(t, lap);
    totalGagal += cetak(t.id, lap, rinci);
  }

  if (!pakaiBrowser && !hanyaBerkas) {
    console.log('\nCatatan: bagian terpenting (kontrak DOM) TIDAK dijalankan.');
    console.log('Nyalakan server statis & Chrome headless, lalu ulangi.');
  }
  console.log('\n' + (totalGagal ? totalGagal + ' pemeriksaan GAGAL.' : 'Semua pemeriksaan lolos.'));
  process.exit(totalGagal ? 1 : 0);
})();
