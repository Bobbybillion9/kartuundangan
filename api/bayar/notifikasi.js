// POST /api/bayar/notifikasi
//
// Webhook Midtrans. Alamat ini didaftarkan di dasbor Midtrans
// (Settings > Configuration > Payment Notification URL) sebagai
// https://kartuundangan.link/api/bayar/notifikasi
//
// Endpoint ini terbuka ke internet dan TIDAK bisa mengandalkan sesi login —
// yang memanggilnya adalah server Midtrans, bukan browser user. Karena itu
// satu-satunya hal yang membedakan notifikasi asli dari orang yang menembak
// endpoint ini dengan JSON buatan sendiri adalah TANDA TANGAN. Tanpa
// verifikasi itu, siapa pun bisa menandai undangannya lunas dengan satu
// permintaan POST.
//
// Yang TIDAK dilakukan di sini: mengaktifkan undangan secara otomatis.
// Pengaktifan tetap lewat tombol di dashboard, karena alur itu memvalidasi
// kelengkapan data acara lebih dulu. Kalau pembayaran langsung
// mengaktifkan, undangan setengah terisi bisa tayang ke tamu.

const { tandaTanganSah, statusInternal } = require('../_lib/midtrans');
const { db } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Metode tidak didukung.');
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch (e) {
    res.status(400).send('Body tidak valid.');
    return;
  }

  try {
    if (!tandaTanganSah(body)) {
      console.warn('[bayar/notifikasi] tanda tangan tidak cocok, order_id:', body.order_id);
      res.status(403).send('Tanda tangan tidak sah.');
      return;
    }

    const orderId = String(body.order_id || '');
    if (!orderId) { res.status(400).send('order_id kosong.'); return; }

    const rows = await db('payments?order_id=eq.' + encodeURIComponent(orderId) + '&select=id,status,amount');
    const bayar = Array.isArray(rows) ? rows[0] : null;
    if (!bayar) {
      // Balas 200: kalau kita balas error, Midtrans akan mengulang terus
      // untuk order yang memang tidak pernah ada di sisi kita.
      console.warn('[bayar/notifikasi] order tidak dikenal:', orderId);
      res.status(200).send('OK');
      return;
    }

    // Nominal yang dikonfirmasi harus sama dengan yang kita catat. Kalau
    // berbeda, ada yang tidak beres — jangan tandai lunas.
    const dibayar = Math.round(Number(body.gross_amount || 0));
    if (dibayar !== Number(bayar.amount)) {
      console.error('[bayar/notifikasi] nominal tidak cocok', orderId, dibayar, bayar.amount);
      res.status(200).send('OK');
      return;
    }

    const statusBaru = statusInternal(body);

    // Sekali lunas tetap lunas. Midtrans bisa mengirim notifikasi susulan,
    // dan tanpa penjagaan ini sebuah notifikasi 'expire' yang datang
    // terlambat bisa mencabut pembayaran yang sudah sah.
    if (bayar.status === 'paid') {
      res.status(200).send('OK');
      return;
    }

    await db('payments?id=eq.' + bayar.id, {
      method: 'PATCH',
      body: {
        status: statusBaru,
        method: String(body.payment_type || '') || null,
        paid_at: statusBaru === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        notifikasi: body
      },
      prefer: 'return=minimal'
    });

    res.status(200).send('OK');
  } catch (err) {
    console.error('[bayar/notifikasi]', err && err.message);
    // 500 supaya Midtrans mengulang kirim — kegagalan sementara di sisi
    // kita tidak boleh membuat pembayaran yang sah hilang begitu saja.
    res.status(500).send('Gagal memproses notifikasi.');
  }
};
