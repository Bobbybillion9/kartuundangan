// KALENDER ACARA + DENAH LOKASI — modul bersama kelima belas tema.
//
// KENAPA BERKAS INI ADA
// ---------------------
// Sampai 2026-08-31 bagian Akad Nikah / Resepsi di semua tema berupa
// tiga baris teks kecil ("Sabtu, 14 Maret 2026" / "08.00 WIB"), dan
// bagian lokasi berupa dua baris teks plus satu tombol. Keduanya terbaca
// seperti isian formulir, bukan seperti undangan — padahal tanggal dan
// tempat adalah dua hal yang benar-benar dicari tamu, dan ruang di
// sekelilingnya justru lapang. User menyebutnya "terlalu generic".
//
// Sekarang tanggalnya digambar sebagai LEMBAR KALENDER SOBEK dan
// lokasinya sebagai DENAH BERKOMPAS. Bentuknya di assets/acara-lokasi.css;
// berkas ini cuma mengisi angkanya.
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

  // "Sabtu, 14 Maret 2026" -> { hari, tgl, bulan, tahun }
  //
  // Sengaja permisif: kalau tanggalnya belum diisi user, perender
  // menulis "Tanggal belum diisi", dan yang benar untuk kalimat itu
  // adalah kalender kosong bertanda tanya — bukan kalender berisi
  // potongan kata yang salah.
  function uraiTanggal(teks) {
    var s = String(teks || '').trim();
    var m = /^([A-Za-z]+),\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(s);
    if (!m) return null;
    return { hari: m[1], tgl: m[2], bulan: m[3], tahun: m[4] };
  }

  function isiKalender(kal) {
    var sumber = kal.querySelector('.kal-sumber');
    if (!sumber) return;
    var d = uraiTanggal(sumber.textContent);

    function tulis(sel, nilai) {
      var el = kal.querySelector(sel);
      if (el) el.textContent = nilai;
    }

    if (!d) {
      // Tanggal belum diisi. Lembarnya tetap digambar — kalau
      // disembunyikan, kartu acaranya jadi berlubang dan pemilik
      // undangan mengira temanya rusak.
      kal.classList.add('kal-kosong');
      tulis('.kal-bulan', '—');
      tulis('.kal-tgl', '?');
      tulis('.kal-hari', 'Belum diisi');
      tulis('.kal-tahun', '');
      return;
    }

    kal.classList.remove('kal-kosong');
    tulis('.kal-bulan', d.bulan);
    tulis('.kal-tgl', d.tgl);
    tulis('.kal-hari', d.hari);
    tulis('.kal-tahun', d.tahun);
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
        new MutationObserver(function () { isiKalender(kal); })
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
