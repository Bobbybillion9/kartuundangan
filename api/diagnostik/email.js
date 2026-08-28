// GET/POST /api/diagnostik/email
//
// Alat untuk MEMBUKTIKAN setelan email sudah aktif, tanpa harus menunggu
// pembayaran sungguhan.
//
//   GET  -> melaporkan environment variable mana yang SUDAH terisi
//   POST -> mengirim satu email uji ke alamat admin yang memanggilnya
//
// Kenapa ini perlu: environment variable di Vercel baru berlaku setelah
// deploy baru, dan dari luar TIDAK ADA cara melihat apakah ia sudah
// terbaca. Tanpa endpoint ini, satu-satunya cara menguji adalah membayar
// sungguhan lalu berharap kuitansinya datang — dan kalau tidak datang,
// tidak ada yang memberi tahu apakah penyebabnya kunci yang belum masuk,
// domain yang belum terverifikasi, atau kode yang salah.
//
// HANYA UNTUK ADMIN. Endpoint ini menyebutkan bagian dari susunan
// infrastruktur, dan email uji yang bisa dipicu siapa saja adalah alat
// spam gratis. Pemeriksaannya memakai RPC saya_admin() yang memeriksa
// haknya DI DATABASE — sama seperti panel admin, bukan dengan menebak
// dari sisi browser.
//
// TIDAK PERNAH mengembalikan nilai kuncinya, hanya ada/tidaknya. Kunci
// API yang bocor lewat endpoint diagnostik tetap kunci yang bocor.

const { userDariToken, URL_SUPABASE, db, emailPengguna } = require('../_lib/supabase');
const { kirimEmail, suratKuitansi } = require('../_lib/email');

async function apakahAdmin(accessToken) {
  try {
    const r = await fetch(URL_SUPABASE + '/rest/v1/rpc/saya_admin', {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const user = await userDariToken(token);
  if (!user) { res.status(401).json({ pesan: 'Harus masuk lebih dulu.' }); return; }
  if (!(await apakahAdmin(token))) { res.status(403).json({ pesan: 'Khusus admin.' }); return; }

  // Hanya ADA/TIDAK, tidak pernah nilainya.
  const setelan = {
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    EMAIL_PENGIRIM: process.env.EMAIL_PENGIRIM || '(pakai bawaan)',
    EMAIL_BALAS: process.env.EMAIL_BALAS || '(pakai bawaan)'
  };

  if (req.method === 'GET') {
    res.status(200).json({ setelan: setelan, siap: setelan.RESEND_API_KEY });
    return;
  }

  if (req.method !== 'POST') { res.status(405).json({ pesan: 'Metode tidak didukung.' }); return; }

  let badan = {};
  try { badan = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch (e) { badan = {}; }

  // ---- Contoh KUITANSI, memakai data undangan sungguhan ----
  //
  // Kuitansi asli hanya terkirim saat webhook Midtrans menandai sebuah
  // pembayaran lunas. Sampai ada penjualan pertama, seluruh jalur itu
  // belum pernah dilalui satu kali pun — padahal yang bisa salah di
  // dalamnya banyak: undangan tidak terbaca, email pemilik tidak
  // ketemu, atau surat gagal disusun.
  //
  // Mode ini menjalankan JALUR YANG SAMA PERSIS dengan webhook (baca
  // undangan -> cari email pemilik -> susun kuitansi -> kirim), hanya
  // pemicunya diganti. Yang tersisa belum teruji tinggal satu hal:
  // apakah webhook memanggilnya — dan itu terbukti sendiri pada
  // penjualan pertama.
  if (badan.jenis === 'kuitansi') {
    const inv = await db('invitations?user_id=eq.' + user.id +
      '&select=id,user_id,nama_pria_panggilan,nama_wanita_panggilan&order=created_at.desc&limit=1');
    const u = Array.isArray(inv) ? inv[0] : null;
    if (!u) { res.status(404).json({ pesan: 'Belum ada undangan di akun ini untuk dijadikan contoh.' }); return; }

    // Email pemilik dicari lewat jalur yang sama dengan webhook, bukan
    // dipakai langsung dari sesi — supaya kalau emailPengguna() yang
    // bermasalah, ketahuan DI SINI, bukan nanti saat ada uang masuk.
    const tujuan = await emailPengguna(u.user_id);
    if (!tujuan) {
      res.status(500).json({ pesan: 'Email pemilik undangan tidak terbaca (emailPengguna gagal).' });
      return;
    }

    const pasangan = [u.nama_pria_panggilan, u.nama_wanita_panggilan].filter(Boolean).join(' & ') || 'undanganmu';
    const surat = suratKuitansi({
      pasangan: pasangan,
      orderId: 'CONTOH-' + new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      jumlah: 49000,
      metode: 'qris',
      waktuLunas: new Date().toISOString()
    });

    const hasil = await kirimEmail({
      ke: tujuan,
      // Ditandai CONTOH di subjek supaya tidak pernah tertukar dengan
      // kuitansi sungguhan di kotak masuk.
      subjek: '[CONTOH] ' + surat.subjek,
      html: surat.html,
      teks: surat.teks
    });
    res.status(hasil.terkirim ? 200 : 500).json({
      setelan: setelan, hasil: hasil, tujuan: tujuan,
      undangan: pasangan, catatan: 'Ini contoh — memakai data undangan sungguhan, tapi nomor pesanannya karangan.'
    });
    return;
  }

  // Email uji sengaja dikirim ke alamat PEMANGGILNYA sendiri, bukan ke
  // alamat yang dikirim lewat body. Kalau tujuannya bisa ditentukan
  // pemanggil, endpoint ini berubah jadi alat mengirim email atas nama
  // domain kita ke siapa pun.
  const hasil = await kirimEmail({
    ke: user.email,
    subjek: 'Uji kirim — Kartu Undangan',
    html: '<p style="font-family:Arial,sans-serif;font-size:15px;color:#3B322A;">' +
          'Email uji dari kartuundangan.link.<br><br>' +
          'Kalau surat ini sampai di <strong>Kotak Masuk</strong> (bukan Spam), ' +
          'berarti pengiriman email sudah benar-benar jalan: kunci API terbaca, ' +
          'domain terverifikasi, dan alamat pengirimnya diterima.<br><br>' +
          'Coba juga tekan Balas — tujuannya harus ke alamat resmi, bukan ke noreply.' +
          '</p>',
    teks: 'Email uji dari kartuundangan.link.\n\n' +
          'Kalau surat ini sampai di Kotak Masuk (bukan Spam), pengiriman email sudah jalan.\n' +
          'Coba tekan Balas — tujuannya harus ke alamat resmi, bukan noreply.'
  });

  res.status(hasil.terkirim ? 200 : 500).json({ setelan: setelan, hasil: hasil, tujuan: user.email });
};
