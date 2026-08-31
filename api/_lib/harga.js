// Sumber harga versi SERVER.
//
// assets/pricing-plans.js adalah katalog untuk ditampilkan di browser, dan
// apa pun yang ada di browser bisa diubah pemakainya. Nominal yang benar-
// benar ditagih harus datang dari sini, tidak pernah dari permintaan klien.
// Kalau api/bayar/buat.js menerima "amount" dari body request, siapa pun
// bisa membayar Rp1 lalu mendapat undangan aktif.
//
// Sejak ada DUA paket yang bisa dibeli, "paket mana" sama rawannya dengan
// "berapa nominalnya" — dan karena itu juga tidak lagi diambil dari body.
// Paketnya diturunkan dari tema undangan yang bersangkutan; lihat
// api/_lib/tema-tier.js.
//
// Angka di sini WAJIB dijaga sama dengan assets/pricing-plans.js. Keduanya
// tidak bisa berbagi berkas karena yang satu dimuat sebagai <script> di
// browser (menempel ke window) dan yang satu lagi modul CommonJS di
// serverless function, sementara project ini sengaja tanpa build step.
// Kalau harga berubah, ubah di DUA tempat.

const PAKET = {
  standar: {
    id: 'standar',
    nama: 'Standar',
    harga: 49000,
    // Hanya paket yang benar-benar bisa dibeli yang boleh ada di sini
    // dengan tersedia:true. Permintaan pembayaran untuk paket yang belum
    // ada langsung ditolak, bukan diproses diam-diam.
    tersedia: true
  },
  pro: {
    id: 'pro',
    nama: 'Pro',
    harga: 89000,
    // Dibuka 2026-08-31 bersamaan dengan dua belas tema di kategori
    // Eropa Mewah, Islami, Chinese, dan Adat Tradisional. Undangan yang
    // memakai tema di kategori itu ditagih paket ini.
    tersedia: true
  }
};

function ambilPaket(id) {
  const p = PAKET[String(id || '').toLowerCase()];
  if (!p || !p.tersedia) return null;
  return p;
}

module.exports = { PAKET, ambilPaket };
