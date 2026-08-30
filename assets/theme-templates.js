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
  },
  {
    id: 'eropa-mewah/blanc-royale',
    name: 'Blanc Royale',
    kategori: 'Eropa Mewah',
    desc: 'Kertas relief putih bercetak timbul dengan ukiran emas antik di keempat sudut sampul. Dibuka dari amplop bersegel lilin emas terlebih dahulu, baru sampulnya, baru undangannya.',
    ringkas: 'Relief putih & ukiran emas · dibuka dari amplop bersegel',
    thumb: 'templates/eropa-mewah/blanc-royale/assets/thumbnail.jpg'
  },
  {
    id: 'eropa-mewah/noir-dore',
    name: 'Noir Dore',
    kategori: 'Eropa Mewah',
    desc: 'Undangan resepsi malam: kertas hitam pekat berdaun emas, foto utama berbentuk medali bulat, mempelai dalam bingkai ukiran oval, dan rangkaian acara yang menurun pada satu garis emas.',
    ringkas: 'Hitam & emas malam · medali bulat & bingkai oval',
    thumb: 'templates/eropa-mewah/noir-dore/assets/thumbnail.jpg'
  },
  {
    id: 'eropa-mewah/bordeaux',
    name: 'Bordeaux',
    kategori: 'Eropa Mewah',
    desc: 'Undangan yang dibaca seperti surat lama bersegel lilin merah: lembar demi lembar kertas krem bertepi sobek di atas bidang beludru burgundy, foto dipasang berpenjepit sudut emas, acara berupa kartu tiket, dan hitung mundur di atas empat perangko.',
    ringkas: 'Burgundy & kertas sobek · surat bersegel lilin',
    thumb: 'templates/eropa-mewah/bordeaux/assets/thumbnail.jpg'
  },
  {
    id: 'islami/nur-zamrud',
    name: 'Nur Zamrud',
    kategori: 'Islami',
    desc: 'Undangan pernikahan Muslim dengan kertas gading, geometri emas, dan lengkung mihrab: dibuka dari sepasang daun pintu, memuat basmalah dan QS. Ar-Rum 21, dengan rangkaian acara di atas satu bidang zamrud pekat.',
    ringkas: 'Gading & zamrud · lengkung mihrab & geometri emas',
    thumb: 'templates/islami/nur-zamrud/assets/thumbnail.jpg'
  },
  {
    id: 'islami/nur-lazuardi',
    name: 'Nur Lazuardi',
    kategori: 'Islami',
    desc: 'Undangan pernikahan Muslim bernuansa malam: biru lazuardi pekat bertabur bintang emas, semua bukaan foto berbentuk oktagon, dan medali bintang delapan yang membesar saat sampul dibuka.',
    ringkas: 'Lazuardi malam & emas · oktagon & bintang delapan',
    thumb: 'templates/islami/nur-lazuardi/assets/thumbnail.jpg'
  },
  {
    id: 'islami/nur-sakinah',
    name: 'Nur Sakinah',
    kategori: 'Islami',
    desc: 'Undangan pernikahan Muslim yang tenang dan lapang: marmer gading, tanah liat hangat, kisi mashrabiya, dan semua bukaan foto berpuncak kubah membulat. Sampulnya terbelah diagonal saat dibuka.',
    ringkas: 'Gading & tanah liat · kisi mashrabiya & kubah',
    thumb: 'templates/islami/nur-sakinah/assets/thumbnail.jpg'
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

  // Baris penanda kecil. Isinya tinggal kategori.
  //
  // Penanda "N undangan aktif" DIBUANG atas permintaan user. Angka itu
  // memang menarik dilihat dari sisi pemilik usaha, tapi di kartu tema ia
  // memakan baris penuh untuk sesuatu yang tidak membantu orang memilih
  // tema — dan di HP baris itu justru menutupi foto yang sedang dijual.
  // Kalau angkanya masih ingin dipantau, tempatnya panel admin, bukan
  // etalase. RPC hitung_pemakai_tema() dibiarkan hidup di database.
  var tags = document.createElement('div');
  tags.className = 'tpl-tags';

  var tagKategori = document.createElement('span');
  tagKategori.className = 'tpl-tag tpl-tag-kategori';
  tagKategori.textContent = t.kategori;
  tags.appendChild(tagKategori);

  var aksi = document.createElement('div');
  aksi.className = 'tpl-aksi';

  // Pratinjau. Di layar lebar bertuliskan "Pratinjau"; di HP menyusut jadi
  // tombol bundar berikon mata saja (lihat .tpl-btn-lihat di style.css).
  // Alasannya ruang: dua tombol bertumpuk memakan hampir sepertiga tinggi
  // kartu, padahal yang dijual kartu ini adalah fotonya. Ikon mata sudah
  // jamak dipahami sebagai "lihat", dan teksnya tetap ada untuk pembaca
  // layar lewat aria-label.
  var lihat = document.createElement('a');
  lihat.className = 'tpl-btn tpl-btn-kaca tpl-btn-lihat';
  lihat.href = base + 'templates/pratinjau.html?tema=' + encodeURIComponent(t.id);
  lihat.target = '_blank';
  lihat.rel = 'noopener';
  var teksLihat = (opts.tombolLihat && opts.tombolLihat.teks) || 'Pratinjau';
  lihat.setAttribute('aria-label', teksLihat + ' tema ' + t.name);
  lihat.title = teksLihat;
  lihat.innerHTML =
    '<svg class="tpl-ikon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/>' +
    '<circle cx="12" cy="12" r="2.6"/></svg>' +
    '<span class="tpl-btn-teks"></span>';
  lihat.querySelector('.tpl-btn-teks').textContent = teksLihat;

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
