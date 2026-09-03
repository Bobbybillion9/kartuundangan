/**
 * kompres-foto.js — mengecilkan foto DI BROWSER sebelum diunggah.
 *
 * KENAPA BERKAS INI ADA
 * ---------------------
 * Sampai 2026-09-03 setiap foto masuk ke Storage APA ADANYA; yang ada
 * cuma pemeriksaan ukuran <= 5 MB. Hasilnya terukur di produksi: 60
 * gambar berjumlah 21,9 MB (rata-rata 365 KB, terbesar 3,9 MB), dan satu
 * undangan nyata sendirian sudah 22,4 MB. Itu yang diunduh TAMU lewat
 * kuota seluler sebelum ia sempat membaca nama mempelai.
 *
 * Padahal undangannya tidak pernah selebar itu: .invitation dibatasi
 * 460 px CSS, jadi bahkan pada layar 3x DPI foto selebar 1.400-1.600 px
 * sudah lebih tajam daripada yang bisa ditampilkan layarnya. Piksel
 * selebihnya dibayar tamu tanpa pernah terlihat.
 *
 * YANG DIJAGA DI SINI
 * -------------------
 * 1. TIDAK PERNAH memperbesar. Foto yang sudah kecil dibiarkan pada
 *    ukurannya; menaikkannya cuma menambah berat tanpa menambah detail.
 * 2. TIDAK PERNAH memperburuk. Kalau hasil kompresi ternyata lebih besar
 *    daripada berkas aslinya (sering terjadi pada WebP/JPEG yang memang
 *    sudah dioptimalkan), yang dipakai kembali berkas ASLINYA.
 * 3. TIDAK PERNAH menghalangi. Kalau apa pun di sini gagal — codec tidak
 *    ada, gambar tidak bisa didekode, kanvas ternoda — fungsinya
 *    mengembalikan berkas asli dan unggahan tetap jalan. Foto yang besar
 *    jauh lebih baik daripada foto yang gagal diunggah.
 * 4. Penurunan skala BERTAHAP (dibagi dua berulang). Satu lompatan
 *    drawImage dari 4.000 px ke 1.600 px membuang piksel begitu saja dan
 *    hasilnya berkerut di garis rambut dan renda; dibagi dua berulang,
 *    tiap langkah merata-ratakan tetangganya dan tepinya tetap halus.
 *    Inilah yang membedakan "diperkecil" dari "pecah".
 *
 * NAMESPACE: SENGAJA `window.KUFoto`, BUKAN `window.KU`.
 * auth-core.js MENIMPA window.KU seluruhnya (bukan menambah ke dalamnya),
 * jadi apa pun yang dititipkan ke KU sebelum ia dimuat akan hilang tanpa
 * pesan galat — yang terlihat cuma "kompresi diam-diam tidak jalan".
 */
(function () {
  'use strict';

  // Sisi terpanjang target, per jenis slot. Angkanya diturunkan dari
  // lebar tayang nyata (.invitation maks 460 px CSS) dikali 3 untuk layar
  // 3x DPI, lalu dibulatkan ke atas supaya masih ada ruang untuk
  // zoom/lightbox:
  //
  //   sampul  1800  full-bleed, satu-satunya foto yang mengisi layar
  //                 penuh dan yang paling lama dipandang
  //   tunggal 1600  foto utama & foto mempelai
  //   galeri  1600  bisa dibuka besar, jadi tidak lebih kecil dari tunggal
  //   bukti   1400  bukti transfer: cuma perlu terbaca nominalnya
  var SISI_MAKS = { sampul: 1800, tunggal: 1600, galeri: 1600, bukti: 1400 };

  // 0.86 adalah titik di mana WebP masih tidak terbedakan dari sumbernya
  // pada foto (bukan pada garis/teks). Diturunkan bertahap HANYA kalau
  // hasilnya masih di atas TARGET_BYTE, dan tidak pernah di bawah
  // MUTU_MIN — lebih baik berkas 600 KB yang bersih daripada 300 KB yang
  // berblok-blok di gradasi kulit dan langit.
  var MUTU_AWAL = 0.86;
  var MUTU_MIN = 0.72;
  var TARGET_BYTE = 400 * 1024;

  // Batas berkas MASUKAN. Bukan batas hasil: yang ini cuma menjaga HP
  // kelas bawah dari mendekode berkas raksasa sampai tabnya mati. Foto
  // HP paling besar sekalipun (48 MP HEIC/JPEG) ada di bawah ini.
  var MASUKAN_MAKS = 25 * 1024 * 1024;

  var TIPE_DIDUKUNG = ['image/jpeg', 'image/png', 'image/webp'];

  // Hasil deteksi codec di-cache: canvas.toBlob dipanggil sekali saja
  // untuk mengetahuinya, bukan sekali per foto.
  var dukungWebp = null;

  function deteksiWebp() {
    if (dukungWebp !== null) return Promise.resolve(dukungWebp);
    return new Promise(function (res) {
      try {
        var c = document.createElement('canvas');
        c.width = 2; c.height = 2;
        c.toBlob(function (b) {
          // Browser yang tidak bisa mengekode WebP TIDAK melempar galat:
          // ia diam-diam mengembalikan PNG. Jadi yang diperiksa tipe
          // blob-nya, bukan ada/tidaknya blob.
          dukungWebp = !!(b && b.type === 'image/webp');
          res(dukungWebp);
        }, 'image/webp', 0.8);
      } catch (e) { dukungWebp = false; res(false); }
    });
  }

  // Dekode lewat <img>, BUKAN createImageBitmap.
  //
  // Alasannya orientasi EXIF: foto potret dari HP disimpan mendatar plus
  // tanda "putar 90°". <img> menerapkan tanda itu sendiri di semua
  // browser modern (image-orientation:from-image adalah nilai bawaan),
  // sementara createImageBitmap baru menerapkannya kalau opsi
  // imageOrientation didukung — dan di browser yang mengabaikannya,
  // kegagalannya SENYAP: fotonya terunggah miring 90 derajat.
  function muatGambar(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      var selesai = false;
      var batas = setTimeout(function () {
        if (selesai) return;
        selesai = true;
        URL.revokeObjectURL(url);
        rej(new Error('gambar terlalu lama didekode'));
      }, 20000);
      img.onload = function () {
        if (selesai) return;
        selesai = true;
        clearTimeout(batas);
        URL.revokeObjectURL(url);
        if (!img.naturalWidth || !img.naturalHeight) return rej(new Error('dimensi gambar kosong'));
        res(img);
      };
      img.onerror = function () {
        if (selesai) return;
        selesai = true;
        clearTimeout(batas);
        URL.revokeObjectURL(url);
        rej(new Error('gambar gagal dimuat'));
      };
      img.src = url;
    });
  }

  function kanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // Turun skala BERTAHAP: dibagi dua sampai satu langkah terakhir tersisa.
  // Lihat catatan (4) di kepala berkas — inilah bagian yang menjaga foto
  // tidak "pecah" saat diperkecil dari 4.000 px.
  function gambarBertahap(img, targetW, targetH) {
    var w = img.naturalWidth, h = img.naturalHeight;
    var sumber = img;
    while (w / 2 > targetW) {
      w = Math.max(targetW, Math.round(w / 2));
      h = Math.max(targetH, Math.round(h / 2));
      var antara = kanvas(w, h);
      var ga = antara.getContext('2d');
      ga.imageSmoothingEnabled = true;
      ga.imageSmoothingQuality = 'high';
      ga.drawImage(sumber, 0, 0, w, h);
      sumber = antara;
    }
    var akhir = kanvas(targetW, targetH);
    var g = akhir.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(sumber, 0, 0, targetW, targetH);
    return akhir;
  }

  function keBlob(canvas, tipe, mutu) {
    return new Promise(function (res, rej) {
      canvas.toBlob(function (b) {
        if (!b) return rej(new Error('kanvas gagal dikodekan'));
        res(b);
      }, tipe, mutu);
    });
  }

  function gantiEkstensi(nama, ext) {
    var dasar = (nama || 'foto').replace(/\.[a-z0-9]+$/i, '');
    // Nama berkas ikut jadi bagian path Storage pada foto galeri, jadi
    // karakter di luar daftar ini dibuang di sini, bukan nanti.
    dasar = dasar.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 60) || 'foto';
    return dasar + '.' + ext;
  }

  /**
   * kompres(file, opts) -> Promise<hasil>
   *
   *   opts.jenis  'sampul' | 'tunggal' | 'galeri' | 'bukti'  (default 'tunggal')
   *   opts.sisiMaks  menimpa SISI_MAKS kalau perlu
   *
   * hasil = {
   *   file,      berkas yang HARUS diunggah (hasil kompresi ATAU aslinya)
   *   dikompres, true kalau file berbeda dari masukan
   *   asli,      ukuran byte masukan
   *   akhir,     ukuran byte keluaran
   *   alasan     kenapa tidak dikompres (kalau dikompres=false)
   * }
   *
   * TIDAK PERNAH menolak (reject). Kegagalan apa pun dikembalikan sebagai
   * hasil dengan dikompres=false — lihat catatan (3) di kepala berkas.
   */
  async function kompres(file, opts) {
    opts = opts || {};
    var hasilAsli = {
      file: file, dikompres: false,
      asli: file ? file.size : 0, akhir: file ? file.size : 0,
      alasan: ''
    };
    if (!file) { hasilAsli.alasan = 'tidak ada berkas'; return hasilAsli; }
    if (TIPE_DIDUKUNG.indexOf(file.type) === -1) { hasilAsli.alasan = 'tipe tidak didukung'; return hasilAsli; }
    if (file.size > MASUKAN_MAKS) { hasilAsli.alasan = 'berkas terlalu besar untuk dikompres'; return hasilAsli; }

    try {
      var pakaiWebp = await deteksiWebp();
      var tipeKeluar = pakaiWebp ? 'image/webp' : 'image/jpeg';
      var ext = pakaiWebp ? 'webp' : 'jpg';

      var img = await muatGambar(file);
      var sisiMaks = opts.sisiMaks || SISI_MAKS[opts.jenis] || SISI_MAKS.tunggal;
      var skala = Math.min(1, sisiMaks / Math.max(img.naturalWidth, img.naturalHeight));
      var w = Math.max(1, Math.round(img.naturalWidth * skala));
      var h = Math.max(1, Math.round(img.naturalHeight * skala));

      var c = gambarBertahap(img, w, h);

      // Mutu diturunkan bertahap HANYA selama hasilnya masih di atas
      // target. Tiga percobaan sudah cukup: dari 0.86 turun 0.07 tiap
      // langkah, percobaan ketiga sudah menyentuh MUTU_MIN.
      var mutu = MUTU_AWAL;
      var blob = await keBlob(c, tipeKeluar, mutu);
      var percobaan = 0;
      while (blob.size > TARGET_BYTE && mutu > MUTU_MIN && percobaan < 3) {
        mutu = Math.max(MUTU_MIN, mutu - 0.07);
        blob = await keBlob(c, tipeKeluar, mutu);
        percobaan++;
      }

      // Foto yang memang sudah ramping (mis. WebP hasil kompresi ini yang
      // diunggah ulang) tidak diutak-atik lagi.
      if (blob.size >= file.size) {
        hasilAsli.alasan = 'hasil kompresi tidak lebih kecil';
        return hasilAsli;
      }

      var berkas;
      var nama = gantiEkstensi(file.name, ext);
      try {
        berkas = new File([blob], nama, { type: tipeKeluar, lastModified: Date.now() });
      } catch (e) {
        // Safari lama tidak punya konstruktor File. Blob juga diterima
        // Storage; yang perlu ditambal cuma .name supaya pemanggilnya
        // tetap bisa menurunkan ekstensi dari situ.
        berkas = blob;
        try { berkas.name = nama; } catch (e2) {}
      }

      return { file: berkas, dikompres: true, asli: file.size, akhir: blob.size, alasan: '' };
    } catch (err) {
      hasilAsli.alasan = (err && err.message) || 'kompresi gagal';
      return hasilAsli;
    }
  }

  // "1,2 MB" / "340 KB" — dipakai di pesan status supaya user melihat
  // kompresinya bekerja, bukan cuma menunggu tanpa penjelasan.
  function ukuranTerbaca(byte) {
    if (!byte && byte !== 0) return '';
    if (byte < 1024) return byte + ' B';
    if (byte < 1024 * 1024) return Math.round(byte / 1024) + ' KB';
    return (byte / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
  }

  window.KUFoto = {
    kompres: kompres,
    ukuranTerbaca: ukuranTerbaca,
    SISI_MAKS: SISI_MAKS,
    MASUKAN_MAKS: MASUKAN_MAKS,
    TIPE_DIDUKUNG: TIPE_DIDUKUNG
  };
})();
