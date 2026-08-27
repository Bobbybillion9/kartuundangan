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

  var card = document.createElement('article');
  card.className = 'tpl-card';
  card.title = t.desc || '';

  // ---- foto tema: satu kartu potret utuh, tidak dipotong setengah ----
  // Rasio 2:3 di sini sama persis dengan rasio thumbnail yang dihasilkan
  // (780x1170), jadi object-fit:cover praktis tidak memotong apa pun —
  // sampul tema terlihat penuh, bukan separuh.
  var shot = document.createElement('div');
  shot.className = 'tpl-shot';

  var img = document.createElement('img');
  img.src = base + t.thumb;
  img.alt = 'Pratinjau tema ' + t.name;
  img.loading = 'lazy';
  shot.appendChild(img);

  // Penanda pemakai: diisi belakangan oleh window.isiPemakaiTema() setelah
  // angkanya datang dari database. Disembunyikan sampai ada angkanya —
  // lebih baik tidak ada penanda daripada penanda kosong yang berkedip.
  var pakai = document.createElement('span');
  pakai.className = 'tpl-pakai';
  pakai.dataset.tema = t.name;
  pakai.hidden = true;
  shot.appendChild(pakai);

  var kaca = document.createElement('div');
  kaca.className = 'tpl-kaca';

  var baris = document.createElement('div');
  baris.className = 'tpl-kaca-baris';
  var nama = document.createElement('span');
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

  kaca.append(baris, ringkas);
  shot.appendChild(kaca);

  // ---- aksi di bawah foto ----
  var actions = document.createElement('div');
  actions.className = 'tpl-actions';

  var lihat = document.createElement('a');
  lihat.className = (opts.tombolLihat && opts.tombolLihat.className) || 'btn btn-ghost';
  lihat.href = base + 'templates/pratinjau.html?tema=' + encodeURIComponent(t.id);
  lihat.target = '_blank';
  lihat.rel = 'noopener';
  lihat.textContent = (opts.tombolLihat && opts.tombolLihat.teks) || 'Pratinjau';

  var pakaiBtn = document.createElement('button');
  pakaiBtn.type = 'button';
  pakaiBtn.className = (opts.tombolPakai && opts.tombolPakai.className) || 'btn btn-primary';
  pakaiBtn.dataset.id = t.id;
  pakaiBtn.textContent = (opts.tombolPakai && opts.tombolPakai.teks) || 'Gunakan';

  actions.append(lihat, pakaiBtn);
  card.append(shot, actions);
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
