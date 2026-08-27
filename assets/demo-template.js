// Isi contoh untuk halaman PRATINJAU tema.
//
// Masalah yang dipecahkan: templates/pratinjau.html memuat berkas tema
// APA ADANYA (lihat komentar di sana — tanpa invitation_id, populateSlots
// tidak pernah dipanggil). Artinya calon pembeli yang menekan "Pratinjau"
// melihat undangan dengan seluruh slot fotonya kosong dan tombol musiknya
// mati — bukan gambaran yang adil tentang hasil akhirnya.
//
// Berkas contohnya ada di templates/_demo/ (dipakai bersama ketiga tema,
// bukan disalin tiga kali). Kalau sebuah berkas belum ada, slot itu
// dibiarkan seperti semula — jadi selama berkasnya belum lengkap,
// pratinjau tetap tampil seperti sebelumnya, tidak pernah rusak.
//
// AMAN UNTUK UNDANGAN SUNGGUHAN. Berkas ini hanya berjalan di dalam
// dokumen tema, dan setiap penerapannya diperiksa ulang terhadap penanda
// window.__KU_DATA_ASLI. assets/render-undangan.js menyalakan penanda itu
// SEBELUM mengisi slot, jadi begitu ada data asli — termasuk undangan
// yang memang tidak punya foto — isi contoh ini tidak akan pernah
// menimpanya, sekalipun gambar contohnya baru selesai dimuat belakangan.
(function () {

  var BASIS = '../../_demo/';

  // Nama berkas yang dicari. Ubah di sini kalau nama berkasnya berbeda.
  var FOTO = {
    foto_utama: 'utama.jpg',
    foto_pria: 'pria.jpg',
    foto_wanita: 'wanita.jpg',
    foto_galeri_1: 'galeri-1.jpg',
    foto_galeri_2: 'galeri-2.jpg',
    foto_galeri_3: 'galeri-3.jpg',
    foto_galeri_4: 'galeri-4.jpg',
    foto_galeri_5: 'galeri-5.jpg',
    foto_galeri_6: 'galeri-6.jpg'
  };
  var SAMPUL = 'sampul.jpg';
  var MUSIK = 'musik.mp3';

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
    var url = BASIS + MUSIK;

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
