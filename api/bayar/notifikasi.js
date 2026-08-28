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

const { tandaTanganSah, statusInternal, batalkanTagihan } = require('../_lib/midtrans');
const { db, emailPengguna } = require('../_lib/supabase');
const { kirimEmail, suratKuitansi } = require('../_lib/email');

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

    const rows = await db('payments?order_id=eq.' + encodeURIComponent(orderId) + '&select=id,status,amount,invitation_id,method,paid_at');
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

    // Sudah lunas? Matikan tagihan lain yang masih menggantung untuk
    // undangan yang SAMA.
    //
    // Tanpa ini, nomor VA dan QR yang terlanjur terbit tetap bisa dibayar
    // sampai 24 jam ke depan. Sudah terbukti terjadi di pengujian: satu
    // undangan punya 1 tagihan lunas DAN 4 tagihan menggantung sekaligus.
    // Kalau salah satunya ikut dibayar, itu pembayaran kedua untuk barang
    // yang sama — uang masuk, tidak ada yang didapat, dan kita yang harus
    // mengembalikan.
    //
    // Pembersihan ini sengaja tidak boleh menggagalkan balasan webhook:
    // membalas error membuat Midtrans mengirim ulang notifikasi
    // pembayaran yang sudah sah, dan itu jauh lebih merepotkan.
    if (statusBaru === 'paid' && bayar.invitation_id) {
      try {
        const menggantung = await db(
          'payments?invitation_id=eq.' + bayar.invitation_id +
          '&status=eq.pending&order_id=neq.' + encodeURIComponent(orderId) +
          '&select=id,order_id'
        );
        for (const t of (Array.isArray(menggantung) ? menggantung : [])) {
          await batalkanTagihan(t.order_id);
          await db('payments?id=eq.' + t.id, {
            method: 'PATCH',
            body: { status: 'failed', updated_at: new Date().toISOString() },
            prefer: 'return=minimal'
          });
        }
      } catch (e) {
        console.error('[bayar/notifikasi] gagal membersihkan tagihan menggantung', orderId, e && e.message);
      }
    }

    // Kuitansi ke pembeli.
    //
    // Dijalankan PALING AKHIR dan dibungkus try/catch sendiri, dengan
    // alasan yang sama seperti pembersihan tagihan di atas: kegagalan
    // mengirim email tidak boleh membuat webhook membalas error. Kalau
    // membalas error, Midtrans mengirim ulang notifikasinya dan
    // pembayaran yang SUDAH tercatat lunas ikut diproses berulang — jauh
    // lebih merepotkan daripada satu kuitansi yang tidak sampai.
    //
    // Selama RESEND_API_KEY belum diset, kirimEmail() diam saja dan
    // mengembalikan alasannya. Jadi kode ini aman tayang lebih dulu
    // sebelum akun emailnya siap.
    if (statusBaru === 'paid' && bayar.invitation_id) {
      try {
        const inv = await db('invitations?id=eq.' + bayar.invitation_id +
          '&select=user_id,nama_pria_panggilan,nama_wanita_panggilan');
        const u = Array.isArray(inv) ? inv[0] : null;
        if (u) {
          const tujuan = await emailPengguna(u.user_id);
          const pasangan = [u.nama_pria_panggilan, u.nama_wanita_panggilan]
            .filter(Boolean).join(' & ') || 'undanganmu';
          const surat = suratKuitansi({
            pasangan: pasangan,
            orderId: orderId,
            jumlah: bayar.amount,
            metode: String(body.payment_type || '') || null,
            waktuLunas: new Date().toISOString()
          });
          const hasil = await kirimEmail({
            ke: tujuan,
            subjek: surat.subjek,
            html: surat.html,
            teks: surat.teks
          });
          if (!hasil.terkirim) {
            console.warn('[bayar/notifikasi] kuitansi tidak terkirim', orderId, hasil.alasan);
          }
        }
      } catch (e) {
        console.error('[bayar/notifikasi] gagal mengirim kuitansi', orderId, e && e.message);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[bayar/notifikasi]', err && err.message);
    // 500 supaya Midtrans mengulang kirim — kegagalan sementara di sisi
    // kita tidak boleh membuat pembayaran yang sah hilang begitu saja.
    res.status(500).send('Gagal memproses notifikasi.');
  }
};
