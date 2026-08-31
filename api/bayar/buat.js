// POST /api/bayar/buat
//
// Membuatkan satu tagihan Midtrans Snap untuk satu undangan, lalu
// mengembalikan Snap token yang dipakai browser membuka popup pembayaran.
//
// Yang dipercaya dari klien HANYA satu hal: invitation_id. Selain itu
// semuanya ditentukan di sini —
//   * SIAPA pemanggilnya  -> dibuktikan dari token akses, bukan dari body
//   * BERAPA nominalnya   -> dari api/_lib/harga.js, bukan dari body
//   * PAKET apa           -> diturunkan dari TEMA undangannya sendiri
//                           (api/_lib/tema-tier.js), bukan dari body
// Kalau salah satu dari tiga hal itu diambil dari body request, orang bisa
// membayar Rp1 untuk undangan milik orang lain.
//
// Catatan soal paket: sampai 2026-08-31 hanya paket Standar yang bisa
// dibeli, jadi `tier` dari body cuma divalidasi terhadap katalog dan itu
// cukup — tidak ada paket lain untuk dipilih. Begitu paket Pro ikut
// dijual, `tier` dari body berarti pembeli tema Pro bisa mengirim
// tier:'standar' dan membayar Rp40.000 lebih murah. Field itu sekarang
// DIABAIKAN.

const { ambilPaket } = require('../_lib/harga');
const { tierUntukKategori } = require('../_lib/tema-tier');
const { buatSnapToken, JAM_KEDALUWARSA } = require('../_lib/midtrans');
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

    if (!/^[0-9a-f-]{36}$/i.test(invitationId)) {
      return json(res, 400, { pesan: 'Undangan tidak valid.' });
    }

    // 1. Siapa yang memanggil — dibuktikan, bukan diakui sendiri.
    const auth = req.headers.authorization || '';
    const user = await userDariToken(auth.replace(/^Bearer\s+/i, ''));
    if (!user) return json(res, 401, { pesan: 'Sesi login tidak valid. Silakan masuk lagi.' });

    // 2. Undangannya memang miliknya?
    const rows = await db('invitations?id=eq.' + invitationId + '&select=id,user_id,status,kategori_desain,nama_pria_panggilan,nama_wanita_panggilan');
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

    // 4. Paket DAN harga dari server. Paketnya diturunkan dari kategori
    //    tema yang dipakai undangan ini, bukan dari apa pun yang dikirim
    //    browser.
    const paket = ambilPaket(tierUntukKategori(inv.kategori_desain));
    if (!paket) return json(res, 400, { pesan: 'Paket ini belum tersedia untuk dibeli.' });

    // 4b. SUDAH PUNYA TAGIHAN YANG MASIH HIDUP? Pakai lagi, jangan buat baru.
    //
    //     Ini yang mencegah pembayaran ganda. Sebelumnya tiap klik tombol
    //     Bayar selalu membuat order baru, sehingga user yang membuka
    //     popup lalu menutupnya — tanpa jalan untuk kembali melihat nomor
    //     VA / QR-nya — terpaksa menekan Bayar lagi dan menumpuk tagihan
    //     menggantung. Lima baris pending untuk undangan yang sama pernah
    //     terjadi dalam sehari, dan risikonya bukan cuma berantakan: user
    //     bisa membayar DUA order berbeda untuk satu undangan.
    //
    //     Syarat memakai ulang sengaja ketat — nominal dan paketnya harus
    //     sama persis. Kalau harga berubah, tagihan lama tidak boleh
    //     dipakai lagi: yang ditagih harus yang berlaku sekarang.
    const hidup = await db(
      'payments?invitation_id=eq.' + invitationId +
      '&status=eq.pending' +
      '&amount=eq.' + paket.harga +
      '&tier=eq.' + encodeURIComponent(paket.id) +
      '&snap_token=not.is.null' +
      '&expired_at=gt.' + encodeURIComponent(new Date().toISOString()) +
      '&select=order_id,amount,snap_token,snap_redirect_url,expired_at' +
      '&order=created_at.desc&limit=1'
    );
    const lama = Array.isArray(hidup) ? hidup[0] : null;
    if (lama) {
      return json(res, 200, {
        token: lama.snap_token,
        redirect_url: lama.snap_redirect_url,
        order_id: lama.order_id,
        jumlah: lama.amount,
        dilanjutkan: true
      });
    }

    // 5. order_id unik per percobaan. Midtrans menolak order_id yang
    //    berulang, jadi tagihan yang benar-benar baru harus memakai id baru.
    const orderId = 'KU-' + invitationId.slice(0, 8) + '-' + Date.now().toString(36).toUpperCase();
    const kedaluwarsa = new Date(Date.now() + JAM_KEDALUWARSA * 3600 * 1000).toISOString();

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
        order_id: orderId,
        expired_at: kedaluwarsa
      },
      prefer: 'return=minimal'
    });

    const nama = [inv.nama_pria_panggilan, inv.nama_wanita_panggilan].filter(Boolean).join(' & ') || 'Undangan';
    const snap = await buatSnapToken({
      orderId: orderId,
      amount: paket.harga,
      item: { id: paket.id, nama: 'Undangan ' + paket.nama + ' — ' + nama },
      pelanggan: { email: user.email || undefined }
    });

    // 7. Simpan tokennya. Inilah yang membuat tagihan ini bisa DIBUKA LAGI
    //    nanti — tanpa langkah ini, user yang menutup popup kehilangan
    //    nomor VA / QR-nya selamanya dan terpaksa membuat tagihan baru.
    //    Kegagalan menyimpan di sini sengaja TIDAK membatalkan permintaan:
    //    tagihannya sudah sah di Midtrans dan user berhak membayarnya
    //    sekarang. Yang hilang cuma kemampuan melanjutkan nanti.
    try {
      await db('payments?order_id=eq.' + encodeURIComponent(orderId), {
        method: 'PATCH',
        body: { snap_token: snap.token, snap_redirect_url: snap.redirectUrl },
        prefer: 'return=minimal'
      });
    } catch (e) {
      console.error('[bayar/buat] gagal menyimpan snap_token untuk', orderId, e && e.message);
    }

    return json(res, 200, {
      token: snap.token,
      redirect_url: snap.redirectUrl,
      order_id: orderId,
      jumlah: paket.harga,
      dilanjutkan: false
    });
  } catch (err) {
    // Pesan asli disimpan di log server saja; yang dikirim ke browser
    // sengaja umum supaya detail konfigurasi tidak ikut bocor.
    console.error('[bayar/buat]', err && err.message);
    return json(res, 500, { pesan: 'Gagal menyiapkan pembayaran. Coba lagi sebentar lagi.' });
  }
};
