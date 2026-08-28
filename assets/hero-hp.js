/* ==========================================================================
   Hero mockup HP — pemutar sampul tema.
   --------------------------------------------------------------------------
   Markupnya ditulis lengkap di index.html, bukan dibangun di sini. Itu
   disengaja: sampul pertama adalah gambar terbesar di halaman (LCP), dan
   kalau ia baru dibuat setelah JS jalan, browser tidak bisa mulai memuatnya
   lebih awal. Berkas ini hanya memutar apa yang sudah ada — kalau JS gagal
   dimuat sekalipun, pengunjung tetap melihat satu sampul utuh di dalam HP.
   ========================================================================== */
(function () {
  var panggung = document.querySelector('[data-hero-hp]');
  if (!panggung) return;

  var slides = Array.prototype.slice.call(panggung.querySelectorAll('.hp-slide'));
  if (slides.length < 2) return;

  var bingkai   = panggung.querySelector('.hp-bingkai');
  var cahaya    = panggung.querySelector('.hp-cahaya');
  var elNama    = panggung.querySelector('.hp-nama');
  var wadahTitik= panggung.querySelector('.hp-titik');
  var sampingKi = panggung.querySelector('.hp-samping-kiri img');
  var sampingKa = panggung.querySelector('.hp-samping-kanan img');

  var JEDA = 4600;
  var aktif = 0;
  var timer = null;

  var hemat = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------- titik navigasi ----------------
  var titik = slides.map(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Tampilkan tema ' + (s.dataset.nama || (i + 1)));
    b.addEventListener('click', function () {
      henti();
      ke(i, i > aktif ? 1 : -1);
      mulai();
    });
    wadahTitik.appendChild(b);
    return b;
  });

  // ---------------- perpindahan ----------------
  function ke(baru, arah) {
    if (baru === aktif) return;
    var lama = aktif;
    aktif = (baru + slides.length) % slides.length;

    slides.forEach(function (s, i) {
      if (i === aktif) s.dataset.pos = 'aktif';
      else if (i === lama) s.dataset.pos = arah > 0 ? 'sebelum' : 'sesudah';
      // Slide lain diparkir di sisi tempat ia akan MASUK, bukan dibiarkan
      // di posisi terakhirnya. Tanpa ini, slide yang dilewati muncul dari
      // arah yang salah begitu tiba gilirannya.
      else s.dataset.pos = arah > 0 ? 'sesudah' : 'sebelum';
    });

    // Sentakan bingkai mengikuti arah geseran, lalu kembali tegak.
    if (bingkai && !hemat) {
      var kelas = arah > 0 ? 'geser-kiri' : 'geser-kanan';
      bingkai.classList.add(kelas);
      setTimeout(function () { bingkai.classList.remove(kelas); }, 380);
    }

    if (cahaya) cahaya.style.setProperty('--hp-warna', slides[aktif].dataset.warna || '#9CAE96');
    panggung.style.setProperty('--hp-warna', slides[aktif].dataset.warna || '#9CAE96');

    // Nama diganti saat tidak terlihat, supaya tidak terbaca berganti
    // huruf di tengah transisi.
    if (elNama) {
      elNama.classList.add('tukar');
      setTimeout(function () {
        elNama.textContent = slides[aktif].dataset.nama || '';
        elNama.classList.remove('tukar');
      }, hemat ? 0 : 300);
    }

    titik.forEach(function (b, i) {
      b.setAttribute('aria-current', i === aktif ? 'true' : 'false');
    });

    isiSamping();
  }

  // Kartu samping menampilkan tema tetangga. Karena keduanya kabur dan
  // tipis, gambarnya boleh diganti langsung tanpa transisi — pergantiannya
  // tidak terlihat, dan itu menghindari dua elemen tambahan yang harus
  // ikut dianimasikan.
  function isiSamping() {
    var n = slides.length;
    if (sampingKa) {
      var sesudah = slides[(aktif + 1) % n].querySelector('img');
      if (sesudah) sampingKa.src = sesudah.currentSrc || sesudah.src;
    }
    if (sampingKi) {
      var sebelum = slides[(aktif - 1 + n) % n].querySelector('img');
      if (sebelum) sampingKi.src = sebelum.currentSrc || sebelum.src;
    }
  }

  function maju()  { ke(aktif + 1, 1); }
  function mundur(){ ke(aktif - 1, -1); }

  // ---------------- pemutaran otomatis ----------------
  function mulai() {
    // Tidak diputar sendiri kalau pengunjung meminta gerakan dikurangi,
    // atau kalau tabnya sedang tidak dilihat.
    if (hemat || document.hidden) return;
    henti();
    timer = setInterval(maju, JEDA);
  }
  function henti() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  panggung.addEventListener('mouseenter', henti);
  panggung.addEventListener('mouseleave', mulai);
  panggung.addEventListener('focusin', henti);
  panggung.addEventListener('focusout', mulai);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) henti(); else mulai();
  });

  // ---------------- geser dengan jari ----------------
  // Di HP, memutar sendiri saja tidak cukup: begitu orang melihat sesuatu
  // bergerak, refleksnya adalah mencoba menggesernya.
  var mulaiX = null, mulaiY = null, arahTegak = false;
  var layar = panggung.querySelector('.hp-layar');

  if (layar) {
    layar.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      mulaiX = e.touches[0].clientX;
      mulaiY = e.touches[0].clientY;
      arahTegak = false;
      henti();
    }, { passive: true });

    layar.addEventListener('touchmove', function (e) {
      if (mulaiX === null) return;
      var dx = e.touches[0].clientX - mulaiX;
      var dy = e.touches[0].clientY - mulaiY;
      // Begitu jelas gerakannya ke atas/bawah, jangan rebut gulirannya —
      // hero ini berada tepat di jalur orang menggulir halaman.
      if (!arahTegak && Math.abs(dy) > Math.abs(dx)) arahTegak = true;
    }, { passive: true });

    layar.addEventListener('touchend', function (e) {
      if (mulaiX === null) return;
      var dx = (e.changedTouches[0] ? e.changedTouches[0].clientX : mulaiX) - mulaiX;
      if (!arahTegak && Math.abs(dx) > 40) { dx < 0 ? maju() : mundur(); }
      mulaiX = mulaiY = null;
      mulai();
    }, { passive: true });
  }

  // ---------------- keadaan awal ----------------
  slides.forEach(function (s, i) { s.dataset.pos = i === 0 ? 'aktif' : 'sesudah'; });
  titik.forEach(function (b, i) { b.setAttribute('aria-current', i === 0 ? 'true' : 'false'); });
  panggung.style.setProperty('--hp-warna', slides[0].dataset.warna || '#9CAE96');
  if (elNama) elNama.textContent = slides[0].dataset.nama || '';
  isiSamping();
  mulai();
})();
