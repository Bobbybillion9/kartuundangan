// Pembantu Midtrans yang dipakai bersama oleh api/bayar/buat.js dan
// api/bayar/notifikasi.js.
//
// Sengaja tanpa SDK: project ini tidak punya build step maupun dependensi
// npm sama sekali (lihat CLAUDE.md), dan yang dibutuhkan dari Midtrans cuma
// dua hal — satu panggilan REST dan satu verifikasi tanda tangan. Keduanya
// muat dalam beberapa baris memakai fetch dan crypto bawaan Node.

const crypto = require('crypto');

// MIDTRANS_SERVER_KEY adalah RAHASIA. Hanya boleh hidup sebagai environment
// variable di Vercel, tidak pernah di berkas yang terkirim ke browser dan
// tidak pernah masuk git.
function serverKey() {
  const k = process.env.MIDTRANS_SERVER_KEY;
  if (!k) throw new Error('MIDTRANS_SERVER_KEY belum diset di environment');
  return k;
}

// Lingkungan ditentukan EKSPLISIT lewat MIDTRANS_PRODUCTION, dengan
// sandbox sebagai bawaan.
//
// Sempat dicoba menurunkannya dari awalan kunci ("SB-" = sandbox) supaya
// tidak ada variabel yang bisa salah setel. Itu KELIRU: dasbor Sandbox
// Midtrans (dashboard.sandbox.midtrans.com) sekarang mengeluarkan kunci
// TANPA awalan SB- — dipastikan langsung dari halaman Access Key sebuah
// akun Sandbox sungguhan. Dokumentasi yang menyebut awalan SB- sudah
// usang. Menebak lingkungan dari bentuk kunci berarti mengirim transaksi
// sandbox ke server produksi, dan itu justru kesalahan yang paling mahal.
//
// Bawaannya sandbox: kalau variabel ini lupa diisi, yang terjadi paling
// buruk adalah transaksi uji, bukan tagihan sungguhan ke orang.
function produksi() {
  return String(process.env.MIDTRANS_PRODUCTION || '').toLowerCase() === 'true';
}

function baseSnap() {
  return produksi()
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
}

function authHeader() {
  // Midtrans memakai Basic auth: server key sebagai username, sandi kosong.
  return 'Basic ' + Buffer.from(serverKey() + ':').toString('base64');
}

// Kanal pembayaran yang boleh muncul di popup Snap, BERURUTAN — Snap
// menampilkannya persis dalam urutan daftar ini, jadi yang paling murah
// buat kita ditaruh paling atas.
//
// Kenapa dibatasi, bukan dibiarkan menampilkan semuanya:
//
// 1. Biaya. Harga jual satu undangan Rp49.000, dan sebagian kanal
//    memotong nominal TETAP, bukan persentase — di harga segini itu
//    menggigit paling dalam:
//      QRIS       ±0,7%              -> sisa ±Rp48.650
//      e-wallet   ±2%                -> sisa ±Rp48.000
//      VA/transfer ±Rp4.000 flat     -> sisa ±Rp45.000
//      kartu      ±2,9% + Rp2.000    -> sisa ±Rp45.600   (dimatikan)
//      minimarket ±Rp5.000 flat      -> sisa ±Rp44.000   (dimatikan)
//    Angka di atas kisaran; yang mengikat tetap halaman Pricing Midtrans.
// 2. Paylater (akulaku/kredivo) tidak masuk akal untuk barang Rp49.000.
// 3. Makin panjang daftar pilihan, makin banyak orang berhenti di layar
//    pembayaran tanpa memilih apa pun.
//
// Kode kanalnya ditentukan Midtrans dan TIDAK boleh ditebak — 'qris'
// (nama yang dipakai Core API) bukan nilai yang sah di sini, yang benar
// 'other_qris'. Salah satu huruf saja membuat kanalnya diam-diam tidak
// muncul. Daftar resminya: docs.midtrans.com -> Request Body JSON
// Parameter -> enabled_payments.
//
// 'bank_transfer' adalah alias yang mencakup seluruh VA bank sekaligus,
// jadi kalau nanti ada bank baru diaktifkan di dasbor Midtrans, ia ikut
// tanpa perlu mengubah berkas ini. 'echannel' (Mandiri Bill Payment)
// jenisnya terpisah dari alias itu, jadi harus disebut sendiri.
//
// Mau menambah OVO/DANA? Keduanya sah ('ovo', 'dana') tapi baru muncul
// kalau kanalnya memang sudah diaktifkan di akun Midtrans.
const KANAL_AKTIF = [
  'other_qris',   // QRIS — bisa dipindai SEMUA e-wallet & m-banking
  'gopay',
  'shopeepay',
  'bank_transfer', // seluruh VA bank (BCA, BNI, BRI, Permata, CIMB, dll)
  'echannel'       // Mandiri Bill Payment
];

/**
 * Minta Snap token untuk satu transaksi.
 * Nominal dan order_id WAJIB sudah ditentukan pemanggil di sisi server.
 */
async function buatSnapToken({ orderId, amount, item, pelanggan }) {
  const res = await fetch(baseSnap(), {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': authHeader()
    },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      item_details: [{ id: item.id, price: amount, quantity: 1, name: item.nama }],
      customer_details: pelanggan,
      // Batasi kanal yang ditampilkan — lihat KANAL_AKTIF di atas untuk
      // alasannya. Ditentukan di sini, bukan lewat Snap Preferences di
      // dasbor Midtrans, supaya pilihannya ikut terbaca di kode dan tidak
      // diam-diam berubah kalau ada yang mengutak-atik setelan dasbor.
      enabled_payments: KANAL_AKTIF,
      // Kedaluwarsa supaya order menggantung tidak menumpuk selamanya.
      expiry: { unit: 'hours', duration: 24 }
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    const detail = (data.error_messages && data.error_messages.join('; ')) ||
                   data.status_message || ('HTTP ' + res.status);
    throw new Error('Midtrans menolak permintaan: ' + detail);
  }
  return data.token;
}

/**
 * Verifikasi tanda tangan notifikasi Midtrans.
 *
 * Ini satu-satunya hal yang membedakan notifikasi asli dari orang yang
 * menembak endpoint webhook kita dengan JSON buatan sendiri. Tanpa
 * pemeriksaan ini, siapa pun bisa menandai undangannya lunas hanya dengan
 * satu permintaan POST.
 *
 * Rumusnya ditetapkan Midtrans: SHA512(order_id + status_code +
 * gross_amount + server_key).
 */
function tandaTanganSah(body) {
  const diterima = String(body.signature_key || '');
  if (!diterima) return false;
  const bahan = String(body.order_id || '') +
                String(body.status_code || '') +
                String(body.gross_amount || '') +
                serverKey();
  const dihitung = crypto.createHash('sha512').update(bahan).digest('hex');
  // Perbandingan waktu-tetap: perbandingan biasa membocorkan posisi
  // karakter pertama yang berbeda lewat selisih waktu.
  const a = Buffer.from(dihitung, 'utf8');
  const b = Buffer.from(diterima, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Terjemahkan status Midtrans ke status internal kita.
 * Midtrans punya banyak kombinasi; yang kita pedulikan hanya tiga keadaan.
 */
function statusInternal(body) {
  const t = String(body.transaction_status || '').toLowerCase();
  const fraud = String(body.fraud_status || '').toLowerCase();

  if (t === 'capture') {
    // Kartu kredit: 'capture' baru benar-benar lunas kalau lolos saringan
    // fraud. 'challenge' berarti menunggu tinjauan manual — belum boleh
    // dianggap lunas.
    return fraud === 'accept' ? 'paid' : 'pending';
  }
  if (t === 'settlement') return 'paid';
  if (t === 'pending') return 'pending';
  if (t === 'deny' || t === 'cancel' || t === 'expire' || t === 'failure') return 'failed';
  return 'pending';
}

module.exports = { buatSnapToken, tandaTanganSah, statusInternal, produksi };
