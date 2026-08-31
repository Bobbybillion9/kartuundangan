// Tahap AMPLOP + SURAT TERBUKA — dipakai bersama oleh 12 tema berbayar.
//
// Alur undangan jadi tiga tahap, bukan dua:
//   1. amplop tersegel wax  -> ditekan tamu
//      1a. segel pecah, tutup terbuka
//      1b. SURAT NAIK KELUAR dari dalam amplop, lalu membesar
//   2. sampul (#cover)      -> tahap yang sudah ada, tidak berubah
//   3. isi undangan
//
// Langkah 1b ditambahkan 2026-08-31 atas permintaan user. Sebelumnya
// amplop cuma membuka tutupnya lalu memudar — yang secara gerakan
// berhenti di tengah kalimat: ada amplop dibuka, tapi tidak pernah ada
// yang keluar darinya. Suratnya sekarang benar-benar naik, membawa nama
// mempelai dan tanggalnya, baru membesar menjadi sampul.
//
// KENAPA MARKUP-NYA DIBUAT DI SINI, BUKAN DITULIS DI TIAP index.html
// -------------------------------------------------------------------
// Pola bug yang paling sering memakan waktu di project ini adalah
// "kodenya ada, satu mata rantai tidak tersambung, gagalnya senyap".
// Kalau markup amplop disalin ke tiap tema, satu perbaikan harus
// ditempel ulang ke semua tema, dan tema yang terlewat tidak akan
// memberi error apa pun — cuma amplop yang perilakunya beda sendiri.
// Dengan dibuat di sini, semua tema mustahil menyimpang.
//
// CARA TEMA MEMAKAINYA
// --------------------
//   <link rel="stylesheet" href="../../../assets/amplop.css">
//   <script src="../../../assets/amplop.js" defer></script>
// lalu setel variabel --amplop-* di :root milik tema (lihat amplop.css).
// Tidak ada konfigurasi lewat JS.
//
// KONTRAK YANG TIDAK BOLEH DIRUSAK
// --------------------------------
// Berkas ini hanya MENAMBAH satu lapis di atas segalanya. Ia tidak
// menyentuh #cover, #openBtn, body.cover-locked, maupun openCover()
// milik tema — assets/render-undangan.js dan tools/cek-tema.js masih
// mengandalkan semuanya persis seperti sebelumnya.
(function () {

  // Halaman yang TIDAK boleh menampilkan amplop:
  // - pratinjau tema di dashboard/etalase: calon pembeli menekan
  //   "Pratinjau" untuk melihat DESAINNYA, bukan untuk membuka amplop
  //   dulu. Satu lapis tambahan di sana cuma jadi penghalang.
  // - potret otomatis (tools/potret-tema.js): kalau amplop tampil,
  //   setiap kartu tema jadi gambar amplop yang mirip semua, bukan
  //   sampul temanya.
  // Keduanya menandai diri lewat query string pada iframe/halaman.
  function dilewati() {
    try {
      var q = new URLSearchParams(window.location.search);
      if (q.get('amplop') === 'lewat') return true;
      // Di dalam iframe pratinjau, halaman induknya yang membawa penanda.
      if (window.parent !== window) {
        var qp = new URLSearchParams(window.parent.location.search);
        if (qp.get('amplop') === 'lewat') return true;
      }
    } catch (e) {
      // Induk berbeda origin — tidak bisa dibaca, dan itu bukan alasan
      // untuk menyembunyikan amplop. Biarkan tampil.
    }
    return false;
  }

  function buatAmplop() {
    var bungkus = document.createElement('div');
    bungkus.id = 'amplop';
    bungkus.setAttribute('role', 'dialog');
    bungkus.setAttribute('aria-label', 'Amplop undangan');

    var kartu = document.createElement('div');
    kartu.className = 'amplop-kartu';

    var badan = document.createElement('div');
    badan.className = 'amplop-badan';

    // Nama tamu di muka amplop. data-slot="nama_tamu" sengaja dipakai
    // ulang: setSlotText() di render-undangan.js memakai querySelectorAll,
    // jadi slot ini terisi bersamaan dengan yang di sampul tanpa satu
    // baris kode tambahan di sana.
    var tulisan = document.createElement('div');
    tulisan.className = 'amplop-tulisan';
    var kepada = document.createElement('p');
    kepada.className = 'amplop-kepada';
    kepada.textContent = 'Kepada Yth.';
    var nama = document.createElement('p');
    nama.className = 'amplop-nama-tamu';
    nama.setAttribute('data-slot', 'nama_tamu');
    nama.textContent = 'Tamu Undangan';
    tulisan.append(kepada, nama);
    badan.appendChild(tulisan);

    // ---- SURAT DI DALAM AMPLOP ----
    // Duduk di BELAKANG muka amplop (z-index lebih rendah), jadi tidak
    // terlihat sama sekali sebelum dibuka. Isinya memakai data-slot yang
    // sama dengan sampul: setSlotText() di render-undangan.js memakai
    // querySelectorAll, jadi surat ini ikut terisi data asli tanpa satu
    // baris tambahan di sana.
    var surat = document.createElement('div');
    surat.className = 'amplop-surat';
    surat.setAttribute('aria-hidden', 'true');

    var suratIsi = document.createElement('div');
    suratIsi.className = 'amplop-surat-isi';

    var hiasAtas = document.createElement('span');
    hiasAtas.className = 'amplop-surat-hias amplop-surat-hias-atas';

    var suratEyebrow = document.createElement('p');
    suratEyebrow.className = 'amplop-surat-eyebrow';
    suratEyebrow.textContent = 'Undangan Pernikahan';

    // Inisial dihitung di sini, BUKAN lewat buatMonogram() milik tema.
    // Dua tema memakai id #monoLetterA/B dan satu memakai kelas
    // .mono-a/.mono-b; menumpang salah satunya berarti surat ini diam-diam
    // gagal di tema yang memakai cara satunya lagi, tanpa error.
    var inisial = document.createElement('p');
    inisial.className = 'amplop-surat-inisial';
    var iniA = document.createElement('span'); iniA.className = 'amplop-ini-huruf amplop-ini-a'; iniA.textContent = 'A';
    var iniAmp = document.createElement('span'); iniAmp.className = 'amplop-ini-amp'; iniAmp.textContent = '&';
    var iniB = document.createElement('span'); iniB.className = 'amplop-ini-huruf amplop-ini-b'; iniB.textContent = 'S';
    inisial.append(iniA, iniAmp, iniB);

    var suratNama = document.createElement('p');
    suratNama.className = 'amplop-surat-nama';
    var namaA = document.createElement('span'); namaA.setAttribute('data-slot', 'nama_pria_panggilan'); namaA.textContent = 'Andi';
    var namaAmp = document.createElement('span'); namaAmp.className = 'amplop-surat-amp'; namaAmp.textContent = '&';
    var namaB = document.createElement('span'); namaB.setAttribute('data-slot', 'nama_wanita_panggilan'); namaB.textContent = 'Sarah';
    suratNama.append(namaA, namaAmp, namaB);

    var suratTanggal = document.createElement('p');
    suratTanggal.className = 'amplop-surat-tanggal';
    suratTanggal.setAttribute('data-slot', 'tanggal_acara');
    suratTanggal.textContent = 'Sabtu, 14 Maret 2026';

    var hiasBawah = document.createElement('span');
    hiasBawah.className = 'amplop-surat-hias amplop-surat-hias-bawah';

    suratIsi.append(hiasAtas, suratEyebrow, inisial, suratNama, suratTanggal, hiasBawah);
    surat.appendChild(suratIsi);

    var tutup = document.createElement('div');
    tutup.className = 'amplop-tutup';

    var segel = document.createElement('div');
    segel.className = 'amplop-segel';

    var tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = 'amplop-tombol';
    tombol.setAttribute('aria-label', 'Buka amplop undangan');

    var petunjuk = document.createElement('p');
    petunjuk.className = 'amplop-petunjuk';
    petunjuk.textContent = 'Ketuk untuk membuka';

    // Urutan penambahan tidak menentukan tumpukannya — z-index di
    // amplop.css yang menentukan. Surat sengaja ditambahkan sebelum
    // badan supaya urutan DOM-nya pun sejalan dengan urutan visualnya.
    kartu.append(surat, badan, tutup, segel, tombol, petunjuk);
    bungkus.appendChild(kartu);
    return { bungkus: bungkus, tombol: tombol, surat: surat, iniA: iniA, iniB: iniB };
  }

  var sudahJalan = false;

  function pasang() {
    if (sudahJalan) return;
    sudahJalan = true;

    if (dilewati()) { window.__KU_AMPLOP = { lewati: function () {} }; return; }

    var bagian = buatAmplop();
    var el = bagian.bungkus;
    document.body.appendChild(el);
    document.body.classList.add('amplop-terkunci');

    var selesai = false;

    function bereskan() {
      document.body.classList.remove('amplop-terkunci');
      if (el.parentNode) el.parentNode.removeChild(el);
    }

    // Inisial surat diambil dari slot nama yang sudah terisi data asli
    // saat tamu menekan — bukan saat halaman dimuat. render-undangan.js
    // mengisi slotnya secara asinkron sesudah undangannya diambil dari
    // database, jadi membacanya lebih awal akan mendapat "Andi & Sarah".
    function hurufPertama(slot, cadangan) {
      var n = document.querySelector('.amplop-surat [data-slot="' + slot + '"]');
      var teks = (n && n.textContent ? n.textContent : '').trim();
      return teks ? teks.charAt(0).toUpperCase() : cadangan;
    }

    function segarkanInisial() {
      if (!bagian.iniA || !bagian.iniB) return;
      bagian.iniA.textContent = hurufPertama('nama_pria_panggilan', 'A');
      bagian.iniB.textContent = hurufPertama('nama_wanita_panggilan', 'S');
    }

    // Empat babak, dan jedanya bukan angka asal: tiap babak menunggu
    // babak sebelumnya benar-benar selesai, kalau tidak gerakannya
    // bertumpuk dan terbaca sebagai kedutan, bukan sebagai satu adegan.
    //   0 ms     segel pecah (.34s) + tutup terbuka (.72s)
    //   700 ms   surat naik keluar dari amplop (.95s)
    //   1750 ms  surat membesar ke arah pembaca + layar memudar
    //   2500 ms  dibuang dari DOM
    function buka() {
      if (selesai) return;
      selesai = true;
      segarkanInisial();
      el.classList.add('amplop-buka');
      setTimeout(function () { el.classList.add('amplop-keluar'); }, 700);
      setTimeout(function () { el.classList.add('amplop-pergi'); }, 1750);
      // Dibuang dari DOM, bukan cuma disembunyikan: elemen fixed
      // seukuran layar yang tertinggal bisa menelan sentuhan tamu di
      // halaman berikutnya kalau suatu saat pointer-events-nya lolos.
      setTimeout(bereskan, 2500);
    }

    bagian.tombol.addEventListener('click', buka);

    // Jalan keluar untuk alat & keadaan darurat: melewati animasi dan
    // langsung membuang amplopnya. Dipakai tools/potret-tema.js.
    window.__KU_AMPLOP = {
      buka: buka,
      lewati: function () { selesai = true; bereskan(); }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pasang);
  } else {
    pasang();
  }
})();
