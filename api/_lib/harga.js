// Sumber harga versi SERVER.
//
// assets/pricing-plans.js adalah katalog untuk ditampilkan di browser, dan
// apa pun yang ada di browser bisa diubah pemakainya. Nominal yang benar-
// benar ditagih harus datang dari sini, tidak pernah dari permintaan klien.
// Kalau api/bayar/buat.js menerima "amount" dari body request, siapa pun
// bisa membayar Rp1 lalu mendapat undangan aktif.
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
    // Hanya paket yang benar-benar bisa dibeli yang boleh ada di sini.
    // Pro/Premium/berlangganan masih "Segera Hadir" di katalog tampilan,
    // jadi sengaja TIDAK didaftarkan — supaya permintaan pembayaran untuk
    // paket yang belum ada langsung ditolak, bukan diproses diam-diam.
    tersedia: true
  }
};

function ambilPaket(id) {
  const p = PAKET[String(id || '').toLowerCase()];
  if (!p || !p.tersedia) return null;
  return p;
}

module.exports = { PAKET, ambilPaket };
