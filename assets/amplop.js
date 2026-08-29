// Tahap AMPLOP + WAX SEAL — dipakai bersama tema-tema berornamen.
//
// Alur undangan jadi tiga tahap, bukan dua:
//   1. amplop tersegel wax  -> ditekan tamu
//   2. sampul (#cover)      -> tahap yang sudah ada, tidak berubah
//   3. isi undangan
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

    kartu.append(badan, tutup, segel, tombol, petunjuk);
    bungkus.appendChild(kartu);
    return { bungkus: bungkus, tombol: tombol };
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

    function buka() {
      if (selesai) return;
      selesai = true;
      el.classList.add('amplop-buka');
      // Tutup dulu terbuka (0,72s), baru seluruh amplop menyingkir.
      setTimeout(function () { el.classList.add('amplop-pergi'); }, 620);
      // Dibuang dari DOM, bukan cuma disembunyikan: elemen fixed
      // seukuran layar yang tertinggal bisa menelan sentuhan tamu di
      // halaman berikutnya kalau suatu saat pointer-events-nya lolos.
      setTimeout(bereskan, 1250);
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
