// KALENDER ACARA + DENAH LOKASI — modul bersama DUA BELAS TEMA PRO.
//
// KENAPA BERKAS INI ADA
// ---------------------
// Sampai 2026-08-31 bagian Akad Nikah / Resepsi di semua tema berupa
// tiga baris teks kecil ("Sabtu, 14 Maret 2026" / "08.00 WIB"), dan
// bagian lokasi berupa dua baris teks plus satu tombol. Keduanya terbaca
// seperti isian formulir, bukan seperti undangan — padahal tanggal dan
// tempat adalah dua hal yang benar-benar dicari tamu.
//
// KENAPA SEKARANG LEMBAR BULAN PENUH, BUKAN LEMBAR SOBEK
// ------------------------------------------------------
// Percobaan pertama menggambar tanggalnya sebagai LEMBAR KALENDER SOBEK
// (pita bulan, angka besar, nama hari). User menolaknya dan mengirim
// tujuh gambar acuan; ketujuhnya bentuknya sama, dan bukan lembar sobek:
// KISI SATU BULAN PENUH, dengan hari-H ditandai — dilingkari, dihati,
// atau dicoret pena. Itu memang bentuk "save the date" yang dikenal
// orang, dan ia mengatakan sesuatu yang lembar sobek tidak katakan:
// hari-H diletakkan di antara hari-hari biasa di sekitarnya, sehingga
// tamu langsung melihat itu hari apa dan minggu ke berapa.
//
// Kisinya HARUS dihitung, tidak bisa ditulis di markup: letak tanggal 1
// pada baris pertama berbeda tiap bulan, dan jumlah harinya juga. Itu
// sebabnya seluruh isi kalender dibangun di sini.
//
// Kelima belas tema TIDAK memakainya lagi — hanya dua belas tema PRO.
// Ketiga tema Elegan Klasik (paket Standar) dikembalikan ke rupa
// sebelumnya atas permintaan user dan tidak memuat berkas ini.
//
// KENAPA TANGGALNYA DIURAI DI SINI, BUKAN DI render-undangan.js
// ------------------------------------------------------------
// render-undangan.js mengisi [data-slot] dengan SATU string jadi
// ("Sabtu, 14 Maret 2026"). Menambah slot baru untuk hari/tanggal/bulan
// berarti mengubah kontrak yang dipakai kelima belas tema DAN
// tools/cek-tema.js — dan tema yang terlewat akan gagal tanpa suara,
// pola bug yang paling sering memakan waktu di project ini.
//
// Jadi kontraknya tidak disentuh sama sekali. Kalender membaca teks yang
// SUDAH ditulis perender ke elemen slotnya, lalu menguraikannya. Elemen
// slotnya sendiri tetap ada di DOM (disembunyikan secara visual, tetap
// terbaca pembaca layar), jadi baik perender maupun pemeriksa tema tidak
// melihat perubahan apa pun.
//
// Diamati dengan MutationObserver, bukan dipanggil sekali: perender
// mengisi slot secara asinkron sesudah undangannya diambil dari
// database, dan halaman pratinjau me-render ulang iframe yang sama
// berkali-kali. Sekali jalan saat DOMContentLoaded akan selalu
// mendapat tanggal contoh.
(function () {
  'use strict';

  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
               'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Kolom pertama MINGGU, mengikuti kalender cetak Indonesia. Sengaja
  // sama di kedua belas tema: memindah awal pekan ke Senin pada
  // sebagian tema akan membuat dua undangan yang tanggalnya sama
  // memperlihatkan kisi yang berbeda, dan yang salah baca bukan
  // desainernya melainkan tamunya.
  var HARI_PANJANG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var HARI_PENDEK  = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  var HARI_HURUF   = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

  // "Sabtu, 14 Maret 2026" -> { hari, tgl, bulan, bulanIdx, tahun }
  //
  // Sengaja permisif: kalau tanggalnya belum diisi user, perender
  // menulis "Tanggal belum diisi", dan yang benar untuk kalimat itu
  // adalah TIDAK menggambar kalender apa pun — kisi satu bulan yang
  // isinya karangan lebih menyesatkan daripada satu baris jujur.
  function uraiTanggal(teks) {
    var s = String(teks || '').trim();
    var m = /^([A-Za-z]+),\s*(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})$/.exec(s);
    if (!m) return null;
    var idx = -1;
    for (var i = 0; i < BULAN.length; i++) {
      if (BULAN[i].toLowerCase() === m[3].toLowerCase()) { idx = i; break; }
    }
    if (idx < 0) return null;
    var tgl = parseInt(m[2], 10);
    var tahun = parseInt(m[4], 10);
    if (!(tgl >= 1 && tgl <= 31)) return null;
    return { hari: m[1], tgl: tgl, bulan: BULAN[idx], bulanIdx: idx, tahun: tahun };
  }

  function el(tag, kelas, teks) {
    var n = document.createElement(tag);
    if (kelas) n.className = kelas;
    if (teks != null) n.textContent = teks;
    return n;
  }

  // Nama kolom hari: satu huruf atau tiga huruf, dipilih TEMA lewat
  // --kal-label. Satu huruf terbaca lebih tenang tapi ambigu (Senin dan
  // Sabtu sama-sama "S"), tiga huruf lebih jelas tapi lebih ramai — dua
  // pilihan yang sama benarnya, jadi dipakai sebagai satu sumbu lagi
  // yang membedakan kalender antar tema.
  function labelHari(kal) {
    var v = '';
    try {
      v = getComputedStyle(kal).getPropertyValue('--kal-label').trim();
    } catch (e) { /* biarkan bawaan */ }
    return v === '1' ? HARI_HURUF : HARI_PENDEK;
  }

  function bangunKisi(kal, d) {
    var kisi = el('div', 'kal-kisi');
    kisi.setAttribute('aria-hidden', 'true');

    var kepala = el('div', 'kal-kepala');
    kepala.append(
      el('span', 'kal-judul-bulan', d.bulan),
      el('span', 'kal-judul-tahun', String(d.tahun))
    );
    kisi.appendChild(kepala);

    var petak = el('div', 'kal-petak');

    var nama = labelHari(kal);
    for (var h = 0; h < 7; h++) {
      petak.appendChild(el('span', 'kal-nama-hari', nama[h]));
    }

    // getDay() memakai zona waktu lokal, dan itu justru yang benar di
    // sini: yang dihitung tanggal kalender, bukan sebuah titik waktu.
    var pertama = new Date(d.tahun, d.bulanIdx, 1).getDay();
    var jumlahHari = new Date(d.tahun, d.bulanIdx + 1, 0).getDate();
    var jumlahHariLalu = new Date(d.tahun, d.bulanIdx, 0).getDate();

    // Tanggal bulan sebelum & sesudahnya ikut ditulis, diredupkan.
    // Kisi yang sudut-sudutnya kosong terbaca seperti kalender yang
    // gagal dimuat; kalender cetak sungguhan selalu mengisinya.
    for (var i = 0; i < pertama; i++) {
      petak.appendChild(el('span', 'kal-sel kal-luar',
        String(jumlahHariLalu - pertama + 1 + i)));
    }
    for (var t = 1; t <= jumlahHari; t++) {
      var sel = el('span', 'kal-sel', String(t));
      if (t === d.tgl) {
        sel.className = 'kal-sel kal-tandai';
        // Angka hari-H dibungkus supaya penanda (lingkaran, hati,
        // belah ketupat) bisa duduk DI BELAKANGNYA lewat ::before
        // tanpa menutupi angkanya.
        sel.textContent = '';
        sel.appendChild(el('span', 'kal-tandai-angka', String(t)));
      }
      petak.appendChild(sel);
    }
    var sisa = (7 - ((pertama + jumlahHari) % 7)) % 7;
    for (var s = 1; s <= sisa; s++) {
      petak.appendChild(el('span', 'kal-sel kal-luar', String(s)));
    }

    kisi.appendChild(petak);

    var kaki = el('p', 'kal-kaki', d.hari + ', ' + d.tgl + ' ' + d.bulan + ' ' + d.tahun);
    kisi.appendChild(kaki);

    return kisi;
  }

  function teksSlot(kal) {
    var s = kal.querySelector('.kal-sumber');
    return s ? String(s.textContent || '').trim() : '';
  }

  // Akad dan resepsi hampir selalu pada HARI YANG SAMA, dan dua kisi
  // satu bulan yang isinya identik, bertumpuk, bukan sekadar boros
  // ruang: yang kedua tidak menambah satu keterangan pun, sementara
  // mata pembacanya terlanjur berhenti membandingkan keduanya mencari
  // beda yang tidak ada. Kalender karena itu digambar penuh pada
  // kemunculan PERTAMA sebuah tanggal; kemunculan berikutnya cukup
  // satu baris.
  //
  // Dibandingkan lewat teks slotnya, bukan lewat objek tanggal: kalau
  // salah satunya belum diisi, keduanya bukan "tanggal yang sama".
  function tanggalUlang(kal) {
    var teksku = teksSlot(kal);
    if (!teksku) return false;
    var daftar = document.querySelectorAll('[data-kalender]');
    for (var i = 0; i < daftar.length; i++) {
      if (daftar[i] === kal) return false;
      if (teksSlot(daftar[i]) === teksku) return true;
    }
    return false;
  }

  function isiKalender(kal) {
    var sumber = kal.querySelector('.kal-sumber');
    if (!sumber) return;
    var d = uraiTanggal(sumber.textContent);

    // Bangun ulang seluruhnya. Menyunting kisi lama di tempat berarti
    // harus tahu berapa sel yang perlu ditambah/dibuang saat bulannya
    // berubah — dan kisi 42 sel bukan sesuatu yang mahal dibuat ulang.
    var lama = kal.querySelector('.kal-kisi');
    if (lama) lama.parentNode.removeChild(lama);
    var lamaKosong = kal.querySelector('.kal-belum');
    if (lamaKosong) lamaKosong.parentNode.removeChild(lamaKosong);
    var lamaRingkas = kal.querySelector('.kal-ringkas');
    if (lamaRingkas) lamaRingkas.parentNode.removeChild(lamaRingkas);

    if (!d) {
      kal.classList.add('kal-kosong');
      var p = el('p', 'kal-belum', 'Tanggal belum diisi');
      p.setAttribute('aria-hidden', 'true');
      kal.appendChild(p);
      return;
    }

    kal.classList.remove('kal-kosong');

    if (tanggalUlang(kal)) {
      kal.classList.add('kal-ulang');
      var ringkas = el('p', 'kal-ringkas',
        d.hari + ', ' + d.tgl + ' ' + d.bulan + ' ' + d.tahun);
      ringkas.setAttribute('aria-hidden', 'true');
      kal.appendChild(ringkas);
      return;
    }

    kal.classList.remove('kal-ulang');
    kal.appendChild(bangunKisi(kal, d));
  }

  function segarkanSemua(akar) {
    var daftar = (akar || document).querySelectorAll('[data-kalender]');
    for (var i = 0; i < daftar.length; i++) isiKalender(daftar[i]);
  }

  function pasang() {
    segarkanSemua(document);

    var daftar = document.querySelectorAll('[data-kalender]');
    for (var i = 0; i < daftar.length; i++) {
      (function (kal) {
        var sumber = kal.querySelector('.kal-sumber');
        if (!sumber) return;
        // characterData + subtree: setSlotText() memakai .textContent,
        // yang mengganti seluruh anak elemennya — jadi yang berubah bisa
        // childList ATAU characterData tergantung isi sebelumnya.
        //
        // Diamati HANYA elemen sumbernya, bukan .kal — kalau .kal yang
        // diamati, penulisan kisi oleh isiKalender() sendiri akan
        // memicu observer-nya lagi dan berputar tanpa henti.
        // Menyegarkan SEMUANYA, bukan cuma kalender yang berubah:
        // status "tanggal ulang" sebuah kalender ditentukan kalender
        // di ATASNYA, jadi mengubah tanggal akad harus ikut mengubah
        // rupa kartu resepsi.
        new MutationObserver(function () { segarkanSemua(document); })
          .observe(sumber, { childList: true, characterData: true, subtree: true });
      })(daftar[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pasang);
  } else {
    pasang();
  }
})();
