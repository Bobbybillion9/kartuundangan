// Katalog Template Tema — satu-satunya sumber data ini, dipakai bareng
// oleh grid Template Tema (assets/dashboard.js) dan halaman publik tamu
// (undangan.html) untuk menerjemahkan kategori_desain+nama_desain milik
// satu invitation balik ke folder template aslinya di templates/.
// "id" harus sama dengan path folder relatif di dalam templates/ (boleh
// bertingkat, mis. "kategori/nama") supaya link Pratinjau
// (templates/pratinjau.html?tema=id) dan thumbnail-nya tetap benar.
// "kategori" dipakai untuk pengelompokan tampilan di grid, terpisah
// dari struktur folder fisiknya.
// "ringkas" adalah keterangan pendek yang ditulis DI ATAS foto di kartu
// tema — ruangnya cuma satu-dua baris, jadi isinya harus ciri yang
// membedakan tema ini dari dua tema lain, bukan kalimat pemasaran.
// "desc" yang panjang tetap dipakai sebagai tooltip kartu.
window.THEME_TEMPLATES = [
  {
    id: 'elegan-klasik/sage-rose',
    name: 'Sage Rose',
    kategori: 'Elegan Klasik',
    desc: 'Nuansa dusty rose & sage yang lembut, foto utama berbentuk kubah, dan monogram bertinta emas yang menggambar diri saat dibuka.',
    ringkas: 'Dusty rose & sage · sampul terbelah dua pintu',
    thumb: 'templates/elegan-klasik/sage-rose/assets/thumbnail.jpg'
  },
  {
    id: 'elegan-klasik/ivory-gold',
    name: 'Ivory Gold',
    kategori: 'Elegan Klasik',
    desc: 'Nuansa ivory & emas tua yang formal, motif garis tipis cincin bertaut dan hati kecil, dan tirai emas yang terbuka ke atas saat undangan dibuka.',
    ringkas: 'Ivory & emas tua · tirai yang terbuka ke atas',
    thumb: 'templates/elegan-klasik/ivory-gold/assets/thumbnail.jpg'
  },
  {
    id: 'elegan-klasik/emerald-dusk',
    name: 'Emerald Dusk',
    kategori: 'Elegan Klasik',
    desc: 'Nuansa resepsi malam: latar hijau zamrud pekat, emas berkilau lembut, dan sampul yang menyingkap dari gelap lewat cahaya hangat yang melebar dari tengah.',
    ringkas: 'Zamrud malam & emas · disingkap oleh cahaya',
    thumb: 'templates/elegan-klasik/emerald-dusk/assets/thumbnail.jpg'
  }
];

// ---------------------------------------------------------------------
// Kartu tema — satu perender dipakai bersama.
//
// Sebelumnya halaman depan (assets/app.js) dan tab Template Tema
// (assets/dashboard.js) punya perender kartu masing-masing dengan markup
// yang nyaris sama persis. Perbedaan kecil di antara keduanya (kelas
// tombol, ada/tidaknya harga) sempat membuat dua halaman menampilkan
// kartu yang tidak sama untuk tema yang sama. Sekarang keduanya memanggil
// fungsi ini; yang boleh berbeda hanya dikirim lewat opts.
//
// opts:
//   harga      : angka rupiah, atau null kalau kartunya tidak menampilkan harga
//   tombolPakai: { className, teks }  -- tombol "Gunakan"
//   tombolLihat: { className, teks }  -- tautan "Pratinjau"
//   basePath   : awalan path untuk thumb & link pratinjau ('' dari root)
window.renderThemeCard = function (t, opts) {
  opts = opts || {};
  var base = opts.basePath || '';

  // Kartu potret penuh gambar: fotonya mengisi seluruh kartu, dan seluruh
  // keterangan duduk DI ATAS foto di bagian bawah, dipisahkan dari
  // gambarnya oleh gradasi gelap yang menebal ke bawah.
  //
  // Gradasi itu bukan hiasan — itu yang membuat teks putih tetap terbaca
  // berapa pun terangnya sampul tema. Dua dari tiga tema bersampul terang,
  // jadi tanpa gradasi ini keterangannya hilang di tema Ivory Gold dan
  // Sage Rose. Sengaja pekat di kaki kartu (0.92) dan bening di kepala
  // kartu supaya desain temanya tetap terlihat utuh di bagian atas.
  var card = document.createElement('article');
  card.className = 'tpl-card';
  card.title = t.desc || '';

  var img = document.createElement('img');
  img.className = 'tpl-img';
  img.src = base + t.thumb;
  img.alt = 'Pratinjau tema ' + t.name;
  img.loading = 'lazy';

  var scrim = document.createElement('div');
  scrim.className = 'tpl-scrim';

  var isi = document.createElement('div');
  isi.className = 'tpl-isi';

  var baris = document.createElement('div');
  baris.className = 'tpl-baris';
  var nama = document.createElement('h3');
  nama.className = 'tpl-nama';
  nama.textContent = t.name;
  baris.appendChild(nama);
  if (opts.harga != null) {
    var harga = document.createElement('span');
    harga.className = 'tpl-harga';
    harga.textContent = 'Rp' + window.formatRupiah(opts.harga);
    baris.appendChild(harga);
  }

  var ringkas = document.createElement('p');
  ringkas.className = 'tpl-ringkas';
  ringkas.textContent = t.ringkas || t.desc || '';

  // Baris penanda kecil. Penanda pemakai diisi belakangan oleh
  // window.isiPemakaiTema() setelah angkanya datang dari database, dan
  // tetap tersembunyi kalau temanya belum dipakai siapa pun — "0 dipakai"
  // hanya mengiklankan bahwa temanya belum laku.
  var tags = document.createElement('div');
  tags.className = 'tpl-tags';

  var tagKategori = document.createElement('span');
  tagKategori.className = 'tpl-tag tpl-tag-kategori';
  tagKategori.textContent = t.kategori;
  tags.appendChild(tagKategori);

  var pakai = document.createElement('span');
  pakai.className = 'tpl-tag tpl-pakai';
  pakai.dataset.tema = t.name;
  pakai.hidden = true;
  tags.appendChild(pakai);

  var aksi = document.createElement('div');
  aksi.className = 'tpl-aksi';

  var lihat = document.createElement('a');
  lihat.className = 'tpl-btn tpl-btn-kaca';
  lihat.href = base + 'templates/pratinjau.html?tema=' + encodeURIComponent(t.id);
  lihat.target = '_blank';
  lihat.rel = 'noopener';
  lihat.textContent = (opts.tombolLihat && opts.tombolLihat.teks) || 'Pratinjau';

  var pakaiBtn = document.createElement('button');
  pakaiBtn.type = 'button';
  // opts.kelasPakai HANYA kelas fungsional (mis. landing-tpl-use-btn) —
  // kelas itulah yang dicari penangan klik di halaman masing-masing.
  // Gayanya ditentukan di sini, bukan dikirim dari pemanggil, supaya
  // kedua halaman mustahil tampil beda. Jangan menyaring kelas kiriman
  // dengan regex: percobaan pertama memakai \bbtn\b, dan itu ikut
  // memotong "btn" di dalam "landing-tpl-use-btn" sehingga tombolnya
  // berhenti berfungsi tanpa error apa pun.
  pakaiBtn.className = 'tpl-btn tpl-btn-utama ' + (opts.kelasPakai || '');
  pakaiBtn.dataset.id = t.id;
  pakaiBtn.textContent = (opts.tombolPakai && opts.tombolPakai.teks) || 'Gunakan';

  aksi.append(lihat, pakaiBtn);
  isi.append(baris, ringkas, tags, aksi);
  card.append(img, scrim, isi);
  return card;
};

// Mengisi penanda "sedang dipakai N undangan" di semua kartu tema yang
// sedang tampil.
//
// Angkanya dari RPC hitung_pemakai_tema() — cacah undangan berstatus
// 'aktif' per tema, agregat saja, tidak ada data pasangan yang ikut
// keluar. Kalau RPC-nya gagal atau sebuah tema belum dipakai siapa pun,
// penandanya tetap disembunyikan: "0 dipakai" di kartu tema hanya
// mengiklankan bahwa temanya belum laku.
window.isiPemakaiTema = function (root) {
  if (!window.KU || !KU.sb) return;
  var wadah = root || document;
  KU.sb.rpc('hitung_pemakai_tema').then(function (res) {
    if (res.error || !Array.isArray(res.data)) return;
    var peta = {};
    res.data.forEach(function (r) { peta[r.nama_desain] = Number(r.jumlah) || 0; });
    Array.prototype.forEach.call(wadah.querySelectorAll('.tpl-pakai'), function (el) {
      var n = peta[el.dataset.tema] || 0;
      if (!n) { el.hidden = true; return; }
      el.textContent = n + ' undangan aktif';
      el.hidden = false;
    });
  });
};
