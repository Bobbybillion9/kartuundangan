// Koridor Hero — dua rel kartu undangan yang melaju dari kejauhan ke arah
// pembaca. Port vanilla dari komponen React "ImageStreamHero"; React di sana
// cuma pembungkus, efeknya sendiri murni CSS 3D + @keyframes yang dihitung.
//
// Cara kerjanya: perspektif mengerjakan dua hal sekaligus yang terlihat
// seperti dua animasi terpisah. Saat z sebuah kartu membesar, ia jadi lebih
// besar DAN posisi x-nya di layar melebar menjauhi titik hilang, karena
// proyeksi menskalakan posisi dan ukuran dengan faktor yang sama.
//
// Tiga hal membentuknya, masing-masing menambal satu cacat tertentu:
//
// 1. Kedalaman ditulis sebagai UKURAN TAMPAK, secara geometris — tiap kartu
//    berukuran rasio tetap lebih besar dari yang di belakangnya. Kalau
//    rentang z dibagi rata, kartu-kartu terdepan malah saling merenggang
//    karena proyeksinya meledak di ujung sana.
// 2. Rel membuka lebar di bentangan awal lalu menahan (fan > 1). Pembukaan
//    itu mengimbangi pertumbuhan yang masih lambat di kejauhan, sehingga
//    pita kartu meninggalkan pusat sebagai bidang datar, menekuk sekali,
//    baru lari diagonal. Rel yang sejajar memproyeksikan kerucut lurus
//    tanpa tekukan sama sekali.
// 3. Kedua ujung daur tidak pernah tampak di layar. Kartu mati setelah tepi
//    dalamnya lewat 50cqw, aman dari tepi wadah. Dan ia lahir MENYEBERANGI
//    sumbu — railBirth bernilai negatif, jadi kartu terbaru mulai dari sisi
//    seberang lalu menyapu balik lewat tengah. Itu menyumbat lubang di
//    pusat: sumbu selalu tertutup, dan kartu baru mendarat di belakang
//    kartu yang sudah menutupinya sehingga tidak perlu fade-in. Kalau ia
//    lahir di sisinya sendiri, ada lubang di titik tengah yang berkedip
//    terbuka sekali tiap daur.
//
// Semua panjang memakai satuan cqw (persen dari lebar wadah), jadi seluruh
// koridor menjaga proporsinya di ukuran layar berapa pun.
(function () {
  'use strict';

  var BAWAAN = {
    perspective: 30,   // kekuatan proyeksi; makin kecil makin dramatis
    cardWidth: 18,
    cardHeight: 25,
    cardRadius: 0.6,
    birthHeight: 2.6,  // tinggi tampak saat kartu lahir di kejauhan
    exitHeight: 46,    // tinggi tampak saat kartu meninggalkan layar
    railBirth: -11,    // negatif: lahir menyeberang sumbu (lihat catatan 3)
    railExit: 44,
    fan: 3.3,          // >1 = membuka lebih awal lalu menahan
    turnBirth: 6,
    turnExit: 28,
    stops: 24          // jumlah keyframe untuk menelusuri kurva
  };

  // Cetak satu set @keyframes yang benar-benar menelusuri kurva di atas,
  // bukan interpolasi linier antara dua titik ujung.
  function buatKeyframes(arah, nama, p) {
    var langkah = [];
    for (var s = 0; s <= p.stops; s++) {
      var u = s / p.stops;
      // Geometris dalam ukuran tampak, supaya rasio antar kartu tetap dan
      // pitanya utuh di kedua ujung.
      var skala = (p.birthHeight / p.cardHeight) *
        Math.pow(p.exitHeight / p.birthHeight, u);
      var z = p.perspective * (1 - 1 / skala);
      var rel = p.railExit - (p.railExit - p.railBirth) * Math.pow(1 - u, p.fan);
      var putar = p.turnBirth + (p.turnExit - p.turnBirth) * u;
      langkah.push(
        (u * 100).toFixed(2) + '%{transform:translate3d(' +
        (arah * rel).toFixed(2) + 'cqw,0,' + z.toFixed(2) + 'cqw) rotateY(' +
        (-arah * putar).toFixed(2) + 'deg)}'
      );
    }
    return '@keyframes ' + nama + '{' + langkah.join('') + '}';
  }

  function bangunKoridor(wadah) {
    var gambar = [];
    try {
      gambar = JSON.parse(wadah.getAttribute('data-gambar') || '[]');
    } catch (e) { gambar = []; }
    if (!gambar.length) return;

    var p = {};
    for (var k in BAWAAN) p[k] = BAWAAN[k];
    // Izinkan penyetelan per elemen lewat data-path='{"fan":2.5}'
    try {
      var timpa = JSON.parse(wadah.getAttribute('data-path') || '{}');
      for (var t in timpa) if (t in p) p[t] = timpa[t];
    } catch (e2) { /* pakai bawaan */ }

    var jumlahKartu = parseInt(wadah.getAttribute('data-kartu'), 10) || 9;
    var durasi = parseFloat(wadah.getAttribute('data-durasi')) || 18;
    var sumbu = parseFloat(wadah.getAttribute('data-sumbu')) || 55;

    var uid = 'kor' + Math.random().toString(36).slice(2, 8);
    var kanan = uid + 'r', kiri = uid + 'l', kelasKartu = uid + 'c';

    var style = document.createElement('style');
    style.textContent =
      buatKeyframes(1, kanan, p) + buatKeyframes(-1, kiri, p) +
      // Dijeda, bukan dimatikan: tiap kartu sudah dijatuhkan di tengah
      // perjalanan lewat delay negatif, jadi ia membeku sebagai gambar diam
      // yang utuh alih-alih menumpuk di sumbu.
      '@media(prefers-reduced-motion:reduce){.' + kelasKartu +
      '{animation-play-state:paused}}';
    wadah.appendChild(style);

    var panggung = document.createElement('div');
    panggung.className = 'koridor-panggung';
    panggung.setAttribute('aria-hidden', 'true');
    panggung.style.perspective = p.perspective + 'cqw';
    panggung.style.perspectiveOrigin = '50% ' + sumbu + '%';

    var lapis = document.createElement('div');
    lapis.className = 'koridor-lapis';

    [kanan, kiri].forEach(function (nama) {
      for (var i = 0; i < jumlahKartu; i++) {
        // Kedua rel menelusuri urutan yang sama, jadi sisi kiri mencerminkan
        // sisi kanan di tiap kedalaman.
        var g = gambar[i % gambar.length];
        var kartu = document.createElement('div');
        kartu.className = 'koridor-kartu ' + kelasKartu;
        kartu.style.cssText =
          'width:' + p.cardWidth + 'cqw;height:' + p.cardHeight + 'cqw;' +
          'margin-left:' + (-p.cardWidth / 2) + 'cqw;' +
          'margin-top:' + (-p.cardHeight / 2) + 'cqw;' +
          'top:' + sumbu + '%;' +
          'border-radius:' + p.cardRadius + 'cqw;' +
          'animation:' + nama + ' ' + durasi + 's linear infinite;' +
          // Delay negatif menjatuhkan tiap kartu di tengah perjalanan, jadi
          // koridornya sudah penuh sejak frame pertama.
          'animation-delay:' + (-(i * durasi) / jumlahKartu) + 's;';

        var img = document.createElement('img');
        img.src = g.src;
        img.alt = '';
        img.loading = i < 3 ? 'eager' : 'lazy';
        img.decoding = 'async';
        img.draggable = false;
        kartu.appendChild(img);
        lapis.appendChild(kartu);
      }
    });

    panggung.appendChild(lapis);
    wadah.insertBefore(panggung, wadah.firstChild);
    wadah.classList.add('koridor-siap');
  }

  function mulai() {
    var daftar = document.querySelectorAll('[data-koridor]');
    for (var i = 0; i < daftar.length; i++) bangunKoridor(daftar[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    mulai();
  }
})();
