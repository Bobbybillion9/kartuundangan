// POST /api/bayar/buat
//
// Membuatkan satu tagihan Midtrans Snap untuk satu undangan, lalu
// mengembalikan Snap token yang dipakai browser membuka popup pembayaran.
//
// Yang dipercaya dari klien HANYA satu hal: invitation_id. Selain itu
// semuanya ditentukan di sini —
//   * SIAPA pemanggilnya  -> dibuktikan dari token akses, bukan dari body
//   * BERAPA nominalnya   -> dari api/_lib/harga.js, bukan dari body
//   * PAKET apa           -> divalidasi terhadap katalog server
// Kalau salah satu dari tiga hal itu diambil dari body request, orang bisa
// membayar Rp1 untuk undangan milik orang lain.

const { ambilPaket } = require('../_lib/harga');
const { buatSnapToken } = require('../_lib/midtrans');
const { userDariToken, db } = require('../_lib/supabase');

function json(res, status, isi) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(status).send(JSON.stringify(isi));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { pesan: 'Metode tidak didukung.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const invitationId = String(body.invitation_id || '');
    const tierId = String(body.tier || 'standar');

    if (!/^[0-9a-f-]{36}$/i.test(invitationId)) {
      return json(res, 400, { pesan: 'Undangan tidak valid.' });
    }

    // 1. Siapa yang memanggil — dibuktikan, bukan diakui sendiri.
    const auth = req.headers.authorization || '';
    const user = await userDariToken(auth.replace(/^Bearer\s+/i, ''));
    if (!user) return json(res, 401, { pesan: 'Sesi login tidak valid. Silakan masuk lagi.' });

    // 2. Undangannya memang miliknya?
    const rows = await db('invitations?id=eq.' + invitationId + '&select=id,user_id,status,nama_pria_panggilan,nama_wanita_panggilan');
    const inv = Array.isArray(rows) ? rows[0] : null;
    if (!inv) return json(res, 404, { pesan: 'Undangan tidak ditemukan.' });
    if (inv.user_id !== user.id) {
      // Sengaja memakai 404, bukan 403: membedakan keduanya memberi tahu
      // penyerang bahwa undangan dengan id itu ada.
      return json(res, 404, { pesan: 'Undangan tidak ditemukan.' });
    }

    // 3. Sudah lunas? Jangan buat tagihan kedua.
    const lunas = await db('payments?invitation_id=eq.' + invitationId + '&status=eq.paid&select=id&limit=1');
    if (Array.isArray(lunas) && lunas.length) {
      return json(res, 409, { pesan: 'Undangan ini sudah dibayar.', sudah_dibayar: true });
    }

    // 4. Harga dari server.
    const paket = ambilPaket(tierId);
    if (!paket) return json(res, 400, { pesan: 'Paket ini belum tersedia untuk dibeli.' });

    // 5. order_id unik per percobaan. Midtrans menolak order_id yang
    //    berulang, jadi percobaan bayar kedua harus memakai id baru.
    const orderId = 'KU-' + invitationId.slice(0, 8) + '-' + Date.now().toString(36).toUpperCase();

    // 6. Catat dulu sebagai pending SEBELUM memanggil Midtrans. Kalau
    //    urutannya dibalik, ada celah waktu di mana user sudah membayar
    //    tapi kita belum punya barisnya, dan webhook datang ke baris yang
    //    tidak ada.
    await db('payments', {
      method: 'POST',
      body: {
        invitation_id: invitationId,
        amount: paket.harga,
        status: 'pending',
        tier: paket.id,
        order_id: orderId
      },
      prefer: 'return=minimal'
    });

    const nama = [inv.nama_pria_panggilan, inv.nama_wanita_panggilan].filter(Boolean).join(' & ') || 'Undangan';
    const token = await buatSnapToken({
      orderId: orderId,
      amount: paket.harga,
      item: { id: paket.id, nama: 'Undangan ' + paket.nama + ' — ' + nama },
      pelanggan: { email: user.email || undefined }
    });

    return json(res, 200, { token: token, order_id: orderId, jumlah: paket.harga });
  } catch (err) {
    // Pesan asli disimpan di log server saja; yang dikirim ke browser
    // sengaja umum supaya detail konfigurasi tidak ikut bocor.
    console.error('[bayar/buat]', err && err.message);
    return json(res, 500, { pesan: 'Gagal menyiapkan pembayaran. Coba lagi sebentar lagi.' });
  }
};
