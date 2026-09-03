// Isi contoh untuk halaman PRATINJAU tema.
//
// Masalah yang dipecahkan: templates/pratinjau.html memuat berkas tema
// APA ADANYA (lihat komentar di sana — tanpa invitation_id, populateSlots
// tidak pernah dipanggil). Artinya calon pembeli yang menekan "Pratinjau"
// melihat undangan dengan seluruh slot fotonya kosong dan tombol musiknya
// mati — bukan gambaran yang adil tentang hasil akhirnya.
//
// Berkas contohnya ada di templates/_demo/<nama-tema>/ — SATU SET PER
// TEMA, bukan satu set dipakai bertiga. Tiap tema punya nuansa warna
// sendiri, dan set foto yang sama membuat dua dari tiga pratinjau terlihat
// bertabrakan dengan desainnya sendiri: foto luar ruang bernuansa hijau di
// Emerald Dusk yang gelap, atau foto berlatar gelap di Ivory Gold yang
// krem. Nama temanya dibaca dari alamat halaman (lihat namaTema()), jadi
// menambah tema baru tidak perlu menyentuh berkas ini.
//
// Kalau sebuah berkas belum ada, slot itu dibiarkan seperti semula — jadi
// selama berkasnya belum lengkap, pratinjau tetap tampil seperti
// sebelumnya, tidak pernah rusak.
//
// AMAN UNTUK UNDANGAN SUNGGUHAN. Berkas ini hanya berjalan di dalam
// dokumen tema, dan setiap penerapannya diperiksa ulang terhadap penanda
// window.__KU_DATA_ASLI. assets/render-undangan.js menyalakan penanda itu
// SEBELUM mengisi slot, jadi begitu ada data asli — termasuk undangan
// yang memang tidak punya foto — isi contoh ini tidak akan pernah
// menimpanya, sekalipun gambar contohnya baru selesai dimuat belakangan.
(function () {

  // Nama tema = nama folder tempat index.html tema ini berada, mis.
  // /templates/elegan-klasik/sage-rose/index.html -> "sage-rose".
  // Dibaca dari alamat, bukan ditulis di tiap tema, supaya tema baru
  // cukup menaruh foto di templates/_demo/<nama-folder-nya>/ tanpa
  // menyentuh satu baris kode pun.
  function namaTema() {
    var potong = window.location.pathname.split('/').filter(Boolean);
    // Buang nama berkasnya (index.html) kalau memang ada di alamat.
    if (potong.length && potong[potong.length - 1].indexOf('.') !== -1) potong.pop();
    return potong.length ? potong[potong.length - 1] : '';
  }

  var tema = namaTema();
  if (!tema) return;
  var BASIS = '../../_demo/' + tema + '/';

  // Nama berkas yang dicari. Ubah di sini kalau nama berkasnya berbeda.
  var FOTO = {
    foto_utama: 'utama.webp',
    foto_pria: 'pria.webp',
    foto_wanita: 'wanita.webp',
    foto_galeri_1: 'galeri-1.webp',
    foto_galeri_2: 'galeri-2.webp',
    foto_galeri_3: 'galeri-3.webp',
    foto_galeri_4: 'galeri-4.webp',
    foto_galeri_5: 'galeri-5.webp',
    foto_galeri_6: 'galeri-6.webp'
  };
  var SAMPUL = 'sampul.webp';

  // Musik contoh: TIGA berkas untuk lima belas tema.
  //
  // Sampai 2026-09-04 tiap tema menyimpan musik.mp3-nya sendiri — 15
  // berkas, 15,8 MB, padahal isinya cuma tiga lagu berbeda (dicek dengan
  // md5: 5 tema memakai lagu yang sama, 3 tema lagu kedua, 7 tema lagu
  // ketiga). 12,7 MB di antaranya duplikat murni yang ikut di setiap
  // clone dan setiap deploy.
  //
  // Peta ini disengaja EKSPLISIT, bukan ditebak dari kategori: tema baru
  // yang lupa didaftarkan tetap dapat MUSIK_BAWAAN, jadi tidak ada
  // pratinjau yang kehilangan tombol musiknya diam-diam. Kalau suatu
  // saat sebuah tema perlu lagunya sendiri, taruh berkasnya di
  // templates/_demo/_musik/ dan tunjuk di sini.
  var MUSIK_DIR = '../../_demo/_musik/';
  var MUSIK_TEMA = {
    'emerald-dusk': 'musik-1.mp3',
    'giok-langit': 'musik-1.mp3',
    'noir-dore': 'musik-1.mp3',
    'shuangxi-merah': 'musik-1.mp3',
    'tinta-emas': 'musik-1.mp3',
    'blanc-royale': 'musik-2.mp3',
    'bordeaux': 'musik-2.mp3',
    'ivory-gold': 'musik-2.mp3',
    'nur-lazuardi': 'musik-3.mp3',
    'nur-sakinah': 'musik-3.mp3',
    'nur-zamrud': 'musik-3.mp3',
    'pura-bentar': 'musik-3.mp3',
    'sage-rose': 'musik-3.mp3',
    'sekar-jagad': 'musik-3.mp3',
    'songket-saga': 'musik-3.mp3'
  };
  var MUSIK_BAWAAN = 'musik-3.mp3';

  function dataAsliSudahMasuk() {
    return window.__KU_DATA_ASLI === true;
  }

  // Memuat gambar dulu, baru dipasang. Urutan ini disengaja: memasang src
  // langsung ke slot berarti ikon "gambar rusak" bawaan browser sempat
  // terlihat setiap kali berkasnya belum ada.
  function kalauGambarAda(url, saatAda) {
    var uji = new Image();
    uji.onload = function () { if (!dataAsliSudahMasuk()) saatAda(); };
    uji.onerror = function () { /* berkasnya belum ada — biarkan apa adanya */ };
    uji.src = url;
  }

  function isiSlotFoto(slot, berkas) {
    var wadah = document.querySelector('[data-slot="' + slot + '"]');
    var img = wadah && wadah.querySelector('img');
    if (!img) return;
    var url = BASIS + berkas;

    // Slot yang di-lazy TIDAK BOLEH lewat kalauGambarAda().
    //
    // Penguji Image() di atas mengunduh gambarnya SENDIRI. Untuk slot
    // biasa itu tidak apa-apa, tapi untuk enam foto galeri yang sejak
    // 2026-09-04 memakai loading="lazy", akibatnya seluruh gunanya
    // hilang tanpa jejak: atributnya terpasang, tapi keenam fotonya
    // tetap terunduh saat halaman dibuka — cuma oleh penguji, bukan
    // oleh <img>-nya. Terukur di Chrome: 1,3 MB tetap terunduh
    // sebelum digulir sedikit pun.
    //
    // Jalur di bawah memasang src langsung ke <img> slotnya. Dua hal
    // yang harus benar bersamaan di sini:
    //
    //   1. display TIDAK boleh tetap 'none'. Gambar display:none tidak
    //      punya kotak, tidak pernah bersinggungan dengan layar, dan
    //      karena itu browser TIDAK PERNAH memuatnya — fotonya tidak
    //      akan muncul selamanya.
    //   2. tapi ia juga belum boleh terlihat, supaya ikon "gambar
    //      rusak" tidak sempat menimpa keadaan kosong rancangan tema.
    //
    // Keduanya dipenuhi dengan opacity:0 — ada kotaknya (lazy bekerja),
    // tidak terlihat apa pun (tidak ada ikon rusak), dan keadaan kosong
    // tema tetap tampak di belakangnya sampai fotonya benar-benar tiba.
    if (img.loading === 'lazy') {
      img.style.display = '';
      img.style.opacity = '0';
      img.addEventListener('load', function () {
        if (dataAsliSudahMasuk()) return;
        img.style.opacity = '';
      });
      img.addEventListener('error', function () {
        img.removeAttribute('src');
        img.style.display = 'none';
        img.style.opacity = '';
      });
      img.src = url;
      return;
    }

    kalauGambarAda(url, function () {
      img.src = url;
      img.style.display = '';
    });
  }

  function isiSampul() {
    var cover = document.getElementById('cover');
    if (!cover) return;
    var url = BASIS + SAMPUL;
    kalauGambarAda(url, function () {
      cover.style.setProperty('--foto-sampul', 'url("' + url + '")');
      cover.classList.add('has-sampul');
    });
  }

  function isiMusik() {
    var audio = document.getElementById('bgMusic');
    var tombol = document.getElementById('musicBtn');
    if (!audio) return;
    var url = MUSIK_DIR + (MUSIK_TEMA[tema] || MUSIK_BAWAAN);

    // Berkas audio tidak bisa "diuji" dengan Image(), jadi dipasang lalu
    // ditarik lagi kalau ternyata tidak bisa dimuat. Tombolnya baru
    // ditampilkan setelah metadata benar-benar terbaca — kalau tidak,
    // tombol musik muncul untuk berkas yang tidak ada dan menekannya
    // tidak menghasilkan apa-apa.
    audio.addEventListener('loadedmetadata', function () {
      if (dataAsliSudahMasuk()) return;
      if (tombol) tombol.style.display = '';
    });
    audio.addEventListener('error', function () {
      // Penjagaan yang sama seperti di atas, dan di sini justru paling
      // penting: peristiwa 'error' bisa datang SETELAH data asli masuk,
      // dan tanpa penjagaan ini ia akan mematikan tombol musik pada
      // undangan sungguhan yang justru punya lagu.
      if (dataAsliSudahMasuk()) return;
      audio.removeAttribute('src');
      if (tombol) tombol.style.display = 'none';
    });

    audio.preload = 'metadata';
    audio.src = url;
  }

  function jalan() {
    if (dataAsliSudahMasuk()) return;
    Object.keys(FOTO).forEach(function (slot) { isiSlotFoto(slot, FOTO[slot]); });
    isiSampul();
    isiMusik();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', jalan);
  } else {
    jalan();
  }
})();
