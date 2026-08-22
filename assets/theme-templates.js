// Katalog Template Tema — satu-satunya sumber data ini, dipakai bareng
// oleh grid Template Tema (assets/dashboard.js) dan halaman publik tamu
// (undangan.html) untuk menerjemahkan kategori_desain+nama_desain milik
// satu invitation balik ke folder template aslinya di templates/.
// "id" harus sama dengan path folder relatif di dalam templates/ (boleh
// bertingkat, mis. "kategori/nama") supaya link Pratinjau
// (templates/pratinjau.html?tema=id) dan thumbnail-nya tetap benar.
// "kategori" dipakai untuk pengelompokan tampilan di grid, terpisah
// dari struktur folder fisiknya.
window.THEME_TEMPLATES = [
  {
    id: 'elegan-klasik/sage-rose',
    name: 'Sage Rose',
    kategori: 'Elegan Klasik',
    desc: 'Nuansa dusty rose & sage yang lembut, foto utama berbentuk kubah, dan monogram bertinta emas yang menggambar diri saat dibuka.',
    thumb: 'templates/elegan-klasik/sage-rose/assets/thumbnail.jpg'
  },
  {
    id: 'elegan-klasik/ivory-gold',
    name: 'Ivory Gold',
    kategori: 'Elegan Klasik',
    desc: 'Nuansa ivory & emas tua yang formal, motif garis tipis cincin bertaut dan hati kecil, dan tirai emas yang terbuka ke atas saat undangan dibuka.',
    thumb: 'templates/elegan-klasik/ivory-gold/assets/thumbnail.jpg'
  },
  {
    id: 'elegan-klasik/emerald-dusk',
    name: 'Emerald Dusk',
    kategori: 'Elegan Klasik',
    desc: 'Nuansa resepsi malam: latar hijau zamrud pekat, emas berkilau lembut, dan sampul yang menyingkap dari gelap lewat cahaya hangat yang melebar dari tengah.',
    thumb: 'templates/elegan-klasik/emerald-dusk/assets/thumbnail.jpg'
  }
];
