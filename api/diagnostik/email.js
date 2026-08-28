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

const { userDariToken, URL_SUPABASE } = require('../_lib/supabase');
const { kirimEmail } = require('../_lib/email');

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
