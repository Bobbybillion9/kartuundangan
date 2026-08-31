// Tahap AMPLOP LAYAR PENUH + SURAT TERBUKA — dipakai 12 tema berbayar.
//
// Alur undangan jadi tiga tahap, bukan dua:
//   1. amplop tersegel wax, MEMENUHI LAYAR -> ditekan tamu
//      1a. segel pecah, tutup amplop terbuka ke belakang
//      1b. SURAT NAIK dari bawah menutupi amplop, lalu membesar
//   2. sampul (#cover) -> tahap yang sudah ada, tidak berubah
//   3. isi undangan
//
// KENAPA LAYAR PENUH (diubah 2026-08-31 atas permintaan user)
// -----------------------------------------------------------
// Versi sebelumnya menampilkan amplop sebagai KARTU KECIL yang melayang
// di tengah bidang gelap. Itu terbaca sebagai gambar amplop di dalam
// aplikasi, bukan sebagai amplop yang sedang dipegang. User mengirim
// foto acuan: satu layar HP penuh berisi kertas berornamen, segel lilin
// di tengahnya, dan tulisan "Tap to open" di bawah — tidak ada bingkai,
// tidak ada latar, tidak ada kartu. Itu yang dibuat di sini.
//
// Konsekuensinya bukan cuma ukuran: begitu amplopnya seukuran layar,
// yang "keluar" dari amplop juga harus seukuran layar. Suratnya karena
// itu naik dari tepi bawah dan MENUTUPI amplopnya, bukan menyembul dari
// sebuah saku.
//
// KENAPA MARKUP-NYA DIBUAT DI SINI, BUKAN DITULIS DI TIAP index.html
// -------------------------------------------------------------------
// Pola bug yang paling sering memakan waktu di project ini adalah
// "kodenya ada, satu mata rantainya tidak tersambung, gagalnya senyap".
// Kalau markup amplop disalin ke 12 tema, satu perbaikan harus ditempel
// ulang 12 kali, dan tema yang terlewat tidak akan memberi error apa pun
// — cuma amplop yang perilakunya beda sendiri.
//
// CARA TEMA MEMAKAINYA
// --------------------
//   <link rel="stylesheet" href="../../../assets/amplop.css">
//   <script src="../../../assets/amplop.js" defer></script>
// lalu setel variabel --amplop-* dan --surat-* di :root milik tema
// (daftarnya di amplop.css). Tidak ada konfigurasi lewat JS.
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

  function el(tag, kelas, teks) {
    var n = document.createElement(tag);
    if (kelas) n.className = kelas;
    if (teks != null) n.textContent = teks;
    return n;
  }

  function buatAmplop() {
    var bungkus = el('div');
    bungkus.id = 'amplop';
    bungkus.setAttribute('role', 'dialog');
    bungkus.setAttribute('aria-label', 'Amplop undangan');

    // ---- badan amplop: kertas seukuran layar ----
    // WAJIB tetap bernama .amplop-badan dan tetap memakai
    // --amplop-kertas: tools/cek-tema.js memastikan elemen ini benar-
    // benar punya tekstur, karena amplop polos adalah kegagalan yang
    // tidak memberi error apa pun.
    var badan = el('div', 'amplop-badan');

    // Garis lipatan. Inilah yang membuat selembar kertas terbaca sebagai
    // AMPLOP: dua garis turun dari sudut atas dan dua garis naik dari
    // sudut bawah, semuanya bertemu di titik segel.
    // preserveAspectRatio="none" supaya garisnya selalu menemui sudut
    // layar berapa pun rasionya; vector-effect menjaga tebal garisnya
    // tidak ikut teregang.
    badan.innerHTML =
      '<svg class="amplop-lipat" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0 0L50 50L100 0" vector-effect="non-scaling-stroke"/>' +
      '<path d="M0 100L50 50L100 100" vector-effect="non-scaling-stroke"/>' +
      '</svg>';

    // ---- tutup amplop: segitiga separuh atas yang terlipat ke belakang ----
    var tutup = el('div', 'amplop-tutup');
    tutup.setAttribute('aria-hidden', 'true');

    // ---- surat di dalam amplop ----
    // Isinya memakai data-slot yang sama dengan sampul: setSlotText() di
    // render-undangan.js memakai querySelectorAll, jadi surat ini ikut
    // terisi data asli tanpa satu baris tambahan di sana.
    var surat = el('div', 'amplop-surat');
    surat.setAttribute('aria-hidden', 'true');
    var suratIsi = el('div', 'amplop-surat-isi');

    var hiasAtas = el('span', 'amplop-surat-hias amplop-surat-hias-atas');
    var suratEyebrow = el('p', 'amplop-surat-eyebrow', 'Undangan Pernikahan');

    var inisialSurat = el('p', 'amplop-surat-inisial');
    var siA = el('span', 'amplop-ini-huruf amplop-ini-a', 'A');
    var siAmp = el('span', 'amplop-ini-amp', '&');
    var siB = el('span', 'amplop-ini-huruf amplop-ini-b', 'S');
    inisialSurat.append(siA, siAmp, siB);

    var suratNama = el('p', 'amplop-surat-nama');
    var namaA = el('span', null, 'Andi'); namaA.setAttribute('data-slot', 'nama_pria_panggilan');
    var namaAmp = el('span', 'amplop-surat-amp', '&');
    var namaB = el('span', null, 'Sarah'); namaB.setAttribute('data-slot', 'nama_wanita_panggilan');
    suratNama.append(namaA, namaAmp, namaB);

    var suratTanggal = el('p', 'amplop-surat-tanggal', 'Sabtu, 14 Maret 2026');
    suratTanggal.setAttribute('data-slot', 'tanggal_acara');

    var hiasBawah = el('span', 'amplop-surat-hias amplop-surat-hias-bawah');

    suratIsi.append(hiasAtas, suratEyebrow, inisialSurat, suratNama, suratTanggal, hiasBawah);
    surat.appendChild(suratIsi);

    // ---- isi muka amplop ----
    var isi = el('div', 'amplop-isi');

    // Halo redup di belakang segel. Ditempel di dalam .amplop-isi, bukan
    // di badan amplop, supaya ia berada DI ATAS tutup — kalau di bawah,
    // separuh atasnya tertutup tutup amplop dan yang tersisa terbaca
    // sebagai setengah lingkaran, bukan sebagai cahaya.
    var halo = el('div', 'amplop-halo');
    halo.setAttribute('aria-hidden', 'true');

    // Nama tamu di sepertiga atas, tempat alamat ditulis pada amplop
    // sungguhan. data-slot="nama_tamu" sengaja dipakai ulang: perender
    // mengisinya bersamaan dengan yang di sampul.
    var tulisan = el('div', 'amplop-tulisan');
    var kepada = el('p', 'amplop-kepada', 'Kepada Yth.');
    var nama = el('p', 'amplop-nama-tamu', 'Tamu Undangan');
    nama.setAttribute('data-slot', 'nama_tamu');
    tulisan.append(kepada, nama);

    var segel = el('div', 'amplop-segel');
    segel.setAttribute('aria-hidden', 'true');

    // Inisial mempelai TIDAK ditaruh di atas segelnya. Kedua belas segel
    // yang dipilih user sudah punya lambangnya sendiri (mawar, bulan
    // sabit, kerang), dan huruf di atasnya cuma jadi dua benda yang
    // berebut satu lingkaran kecil. Inisialnya duduk di bawah segel,
    // tepat di tempat tulisan tangan ada pada amplop acuan.
    var inisial = el('p', 'amplop-inisial');
    var iniA = el('span', 'amplop-ini-huruf amplop-ini-a', 'A');
    var iniAmp = el('span', 'amplop-ini-amp', '&');
    var iniB = el('span', 'amplop-ini-huruf amplop-ini-b', 'S');
    inisial.append(iniA, iniAmp, iniB);

    var judul = el('p', 'amplop-judul', 'Undangan Pernikahan');
    var petunjuk = el('p', 'amplop-petunjuk', 'Ketuk untuk membuka');

    isi.append(halo, tulisan, segel, inisial, judul, petunjuk);

    var tombol = el('button', 'amplop-tombol');
    tombol.type = 'button';
    tombol.setAttribute('aria-label', 'Buka amplop undangan');

    bungkus.append(badan, surat, tutup, isi, tombol);
    return {
      bungkus: bungkus, tombol: tombol,
      huruf: [iniA, iniB, siA, siB]
    };
  }

  var sudahJalan = false;

  function pasang() {
    if (sudahJalan) return;
    sudahJalan = true;

    if (dilewati()) { window.__KU_AMPLOP = { lewati: function () {} }; return; }

    var bagian = buatAmplop();
    var elAmplop = bagian.bungkus;
    document.body.appendChild(elAmplop);
    document.body.classList.add('amplop-terkunci');

    var selesai = false;

    function bereskan() {
      document.body.classList.remove('amplop-terkunci');
      if (elAmplop.parentNode) elAmplop.parentNode.removeChild(elAmplop);
    }

    // Inisial diambil dari slot nama yang sudah terisi data asli saat
    // tamu menekan — bukan saat halaman dimuat. render-undangan.js
    // mengisi slotnya secara asinkron sesudah undangannya diambil dari
    // database, jadi membacanya lebih awal akan mendapat "Andi & Sarah".
    //
    // Dihitung di sini, BUKAN lewat buatMonogram() milik tema: dua tema
    // memakai id #monoLetterA/B dan satu memakai kelas .mono-a/.mono-b,
    // jadi menumpang salah satunya berarti diam-diam gagal di tema yang
    // memakai cara satunya lagi, tanpa error apa pun.
    function hurufPertama(slot, cadangan) {
      var n = document.querySelector('#amplop [data-slot="' + slot + '"]');
      var teks = (n && n.textContent ? n.textContent : '').trim();
      return teks ? teks.charAt(0).toUpperCase() : cadangan;
    }

    function segarkanInisial() {
      var a = hurufPertama('nama_pria_panggilan', 'A');
      var b = hurufPertama('nama_wanita_panggilan', 'S');
      bagian.huruf.forEach(function (n) {
        if (n.classList.contains('amplop-ini-a')) n.textContent = a;
        else n.textContent = b;
      });
    }

    // Empat babak, dan jedanya bukan angka asal: tiap babak menunggu
    // babak sebelumnya benar-benar selesai, kalau tidak gerakannya
    // bertumpuk dan terbaca sebagai kedutan, bukan sebagai satu adegan.
    //   0 ms     segel pecah (.4s) + tutup terlipat ke belakang (.85s)
    //   820 ms   surat naik dari tepi bawah menutupi amplop (.95s)
    //   1900 ms  surat membesar ke arah pembaca + layar memudar
    //   2650 ms  dibuang dari DOM
    function buka() {
      if (selesai) return;
      selesai = true;
      segarkanInisial();
      elAmplop.classList.add('amplop-buka');
      setTimeout(function () { elAmplop.classList.add('amplop-keluar'); }, 820);
      setTimeout(function () { elAmplop.classList.add('amplop-pergi'); }, 1900);
      // Dibuang dari DOM, bukan cuma disembunyikan: elemen fixed
      // seukuran layar yang tertinggal bisa menelan sentuhan tamu di
      // halaman berikutnya kalau suatu saat pointer-events-nya lolos.
      setTimeout(bereskan, 2650);
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
