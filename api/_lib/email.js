// Pengiriman email transaksional lewat Resend.
//
// Dipanggil REST-nya langsung dengan fetch, bukan SDK — project ini
// sengaja tanpa dependensi npm sama sekali (lihat CLAUDE.md).
//
// ATURAN PALING PENTING DI BERKAS INI: mengirim email TIDAK BOLEH
// menggagalkan apa pun. Kuitansi dikirim dari webhook Midtrans, dan kalau
// pengirimannya melempar error, webhook membalas 500, Midtrans mengirim
// ulang notifikasinya, dan pembayaran yang sudah sah jadi ikut kacau
// hanya karena layanan email sedang bermasalah. Jadi setiap fungsi di
// sini MENGEMBALIKAN kegagalan, tidak pernah melemparnya.
//
// Kalau RESEND_API_KEY belum diset, seluruh modul ini diam dan
// mengembalikan { terkirim:false, alasan:'belum disetel' }. Itu disengaja:
// kodenya boleh tayang lebih dulu sebelum akun email siap, tanpa merusak
// apa pun.

const API = 'https://api.resend.com/emails';

// Alamat pengirim WAJIB dari domain yang sudah diverifikasi di Resend.
// Gmail biasa tidak bisa dipakai: Gmail menolak surat yang mengaku berasal
// dari @gmail.com tapi dikirim server lain, dan suratnya berakhir di spam.
// Alamat balasan tetap kotak masuk sungguhan supaya balasan pelanggan
// tidak jatuh ke lubang hitam.
function pengirim() {
  return process.env.EMAIL_PENGIRIM || 'Kartu Undangan <noreply@kartuundangan.link>';
}
function alamatBalas() {
  return process.env.EMAIL_BALAS || 'kartuundanganofficial@gmail.com';
}

// Alamat balasan yang salah ketik TIDAK BOLEH menggagalkan seluruh email.
//
// Sudah terjadi: EMAIL_BALAS salah diisi, Resend menolak permintaannya
// utuh, dan email uji gagal total. Di email uji itu cuma merepotkan — tapi
// pada kuitansi sungguhan, artinya pelanggan yang sudah membayar TIDAK
// menerima bukti apa pun, gara-gara satu kolom kenyamanan yang salah
// ketik. Kuitansinya jauh lebih penting daripada tombol Balas-nya.
//
// Jadi kalau alamatnya jelas-jelas tidak sah, ia DIBUANG dan emailnya
// tetap dikirim. Balasan pelanggan memang jadi tidak terarah, dan itu
// dicatat di log — tapi surat yang sampai tanpa alamat balasan jauh lebih
// baik daripada surat yang tidak pernah sampai.
//
// Sengaja tidak memakai regex ketat: yang dijaga cuma bentuk yang mustahil
// benar (tanpa @, ada spasi, domain tanpa titik). Menolak alamat sah yang
// tidak biasa justru menciptakan masalah yang sama dari arah sebaliknya.
function alamatBalasSah() {
  const a = String(alamatBalas() || '').trim();
  if (!a) return null;
  if (/\s/.test(a)) return null;
  const bagian = a.split('@');
  if (bagian.length !== 2) return null;
  if (!bagian[0] || !bagian[1].includes('.')) return null;
  return a;
}

/**
 * Kirim satu email. TIDAK PERNAH melempar.
 * @returns {Promise<{terkirim:boolean, id?:string, alasan?:string}>}
 */
async function kirimEmail({ ke, subjek, html, teks }) {
  const kunci = process.env.RESEND_API_KEY;
  if (!kunci) return { terkirim: false, alasan: 'RESEND_API_KEY belum disetel' };
  if (!ke) return { terkirim: false, alasan: 'alamat tujuan kosong' };

  const balas = alamatBalasSah();
  if (!balas) {
    console.warn('[email] EMAIL_BALAS tidak sah, dikirim tanpa alamat balasan:',
                 JSON.stringify(process.env.EMAIL_BALAS || ''));
  }

  try {
    const muatan = {
      from: pengirim(),
      to: [ke],
      subject: subjek,
      html: html,
      text: teks
    };
    // Hanya disertakan kalau memang sah — Resend menolak SELURUH
    // permintaan kalau kolom ini ada tapi isinya bukan alamat.
    if (balas) muatan.reply_to = balas;

    const r = await fetch(API, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + kunci,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(muatan)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return { terkirim: false, alasan: (data && data.message) || ('HTTP ' + r.status) };
    }
    return { terkirim: true, id: data.id };
  } catch (e) {
    return { terkirim: false, alasan: (e && e.message) || 'gagal tak terduga' };
  }
}

// ---------------------------------------------------------------------
// Kerangka HTML email.
//
// Email BUKAN halaman web. Klien email (Gmail, Outlook, Apple Mail)
// membuang <style> di <head>, tidak mendukung flexbox/grid, dan sebagian
// mengabaikan properti CSS modern. Jadi di sini semua pakai <table> dan
// gaya inline — bukan karena kuno, tapi karena itu satu-satunya yang
// terbaca sama di semua klien. Jangan "rapikan" jadi div+flex.
// ---------------------------------------------------------------------
const TINTA = '#3B322A';
const TINTA_LIRIH = '#7A6E60';
const AKSEN = '#A9754C';
const GARIS = '#E9DFCF';
const KERTAS = '#FAF8F4';

function rupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}

// payment_type dari Midtrans datang sebagai kode mentah ("qris",
// "bank_transfer", "echannel"). Itu istilah internal, dan kuitansi bukan
// tempatnya — orang yang membuka emailnya harus mengenali apa yang barusan
// ia pakai. Kode yang tidak dikenal dilewatkan apa adanya, bukan diganti
// "Lainnya": lebih baik menampilkan istilah asing daripada menyembunyikan
// informasi yang mungkin dibutuhkan saat menghubungi bank.
const LABEL_METODE = {
  qris: 'QRIS',
  other_qris: 'QRIS',
  gopay: 'GoPay',
  shopeepay: 'ShopeePay',
  bank_transfer: 'Transfer bank (Virtual Account)',
  echannel: 'Mandiri Bill Payment',
  credit_card: 'Kartu debit/kredit',
  cstore: 'Gerai retail'
};
function namaMetode(kode) {
  if (!kode) return null;
  return LABEL_METODE[String(kode).toLowerCase()] || String(kode);
}

function tanggalIndo(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return '';
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
}

function baris(label, nilai, tebal) {
  return '<tr>' +
    '<td style="padding:9px 0;font-size:14px;color:' + TINTA_LIRIH + ';border-bottom:1px solid ' + GARIS + ';">' + label + '</td>' +
    '<td style="padding:9px 0;font-size:14px;color:' + TINTA + ';text-align:right;border-bottom:1px solid ' + GARIS + ';' +
    (tebal ? 'font-weight:600;' : '') + '">' + nilai + '</td>' +
    '</tr>';
}

function kerangka(judul, isiHtml) {
  return '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + judul + '</title></head>' +
    '<body style="margin:0;padding:0;background:' + KERTAS + ';">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + KERTAS + ';padding:28px 12px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid ' + GARIS + ';border-radius:14px;">' +
    '<tr><td style="padding:26px 28px 0;">' +
    '<div style="font-family:Georgia,serif;font-size:19px;color:' + TINTA + ';">Kartu <span style="color:' + AKSEN + ';font-style:italic;">Undangan</span></div>' +
    '</td></tr>' +
    isiHtml +
    '<tr><td style="padding:20px 28px 26px;border-top:1px solid ' + GARIS + ';">' +
    '<p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:' + TINTA_LIRIH + ';">' +
    'Email ini dikirim otomatis dari kartuundangan.link. Ada pertanyaan? Balas saja email ini.' +
    '</p></td></tr>' +
    '</table></td></tr></table></body></html>';
}

/**
 * Kuitansi setelah pembayaran lunas.
 *
 * Nomor pesanan sengaja ditaruh paling menonjol: Syarat & Ketentuan
 * bagian 4 meminta pelanggan MENYERTAKAN nomor itu saat mengajukan
 * pengembalian dana, dan sampai email ini ada, satu-satunya tempat ia
 * bisa menemukannya adalah dashboard. Sekarang nomornya ada di kotak
 * masuknya sendiri — itu inti gunanya kuitansi.
 */
function suratKuitansi({ pasangan, orderId, jumlah, metode, waktuLunas }) {
  const judul = 'Pembayaran diterima';
  const isi =
    '<tr><td style="padding:18px 28px 0;">' +
    '<h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:22px;font-weight:normal;color:' + TINTA + ';">Pembayaran diterima</h1>' +
    '<p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:14px;line-height:1.65;color:' + TINTA_LIRIH + ';">' +
    'Terima kasih. Pembayaran untuk undangan <strong style="color:' + TINTA + ';">' + pasangan + '</strong> sudah kami terima.' +
    '</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;border-top:1px solid ' + GARIS + ';">' +
    baris('Nomor pesanan', '<span style="font-family:Consolas,monospace;">' + orderId + '</span>', true) +
    baris('Jumlah', rupiah(jumlah), true) +
    baris('Metode', namaMetode(metode) || '—') +
    baris('Tanggal', tanggalIndo(waktuLunas)) +
    '</table>' +
    '<p style="margin:18px 0 0;font-family:Arial,sans-serif;font-size:13px;line-height:1.65;color:' + TINTA_LIRIH + ';">' +
    'Simpan nomor pesanan di atas. Nomor itu yang diminta kalau kamu perlu menghubungi kami tentang pembayaran ini.' +
    '</p>' +
    '</td></tr>' +
    // Langkah berikutnya ditulis eksplisit karena pembayaran TIDAK
    // mengaktifkan undangan secara otomatis — aktivasi tetap lewat tombol
    // dashboard yang memeriksa kelengkapan data lebih dulu. Tanpa kalimat
    // ini, orang mengira sudah selesai lalu heran link-nya belum hidup.
    '<tr><td style="padding:20px 28px 0;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + KERTAS + ';border:1px solid ' + GARIS + ';border-radius:10px;">' +
    '<tr><td style="padding:16px 18px;">' +
    '<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:' + TINTA + ';">Satu langkah lagi</p>' +
    '<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:' + TINTA_LIRIH + ';">' +
    'Undanganmu belum otomatis aktif. Buka dashboard, lalu tekan <strong style="color:' + TINTA + ';">Aktifkan Undangan</strong> — kami periksa dulu kelengkapan datanya supaya tidak ada undangan setengah jadi yang tersebar ke tamu.' +
    '</p>' +
    '<a href="https://kartuundangan.link/app.html" style="display:inline-block;background:' + AKSEN + ';color:#FFFFFF;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:11px 22px;border-radius:999px;">Buka Dashboard</a>' +
    '</td></tr></table>' +
    '</td></tr>' +
    '<tr><td style="padding:20px 28px 22px;"></td></tr>';

  const teks =
    'Pembayaran diterima\n\n' +
    'Pembayaran untuk undangan ' + pasangan + ' sudah kami terima.\n\n' +
    'Nomor pesanan : ' + orderId + '\n' +
    'Jumlah        : ' + rupiah(jumlah) + '\n' +
    'Metode        : ' + (namaMetode(metode) || '-') + '\n' +
    'Tanggal       : ' + tanggalIndo(waktuLunas) + '\n\n' +
    'Simpan nomor pesanan di atas — itu yang diminta kalau kamu perlu menghubungi kami tentang pembayaran ini.\n\n' +
    'SATU LANGKAH LAGI: undanganmu belum otomatis aktif. Buka dashboard lalu tekan "Aktifkan Undangan".\n' +
    'https://kartuundangan.link/app.html\n\n' +
    'Ada pertanyaan? Balas saja email ini.';

  return {
    subjek: 'Pembayaran diterima — ' + pasangan + ' (' + orderId + ')',
    html: kerangka(judul, isi),
    teks: teks
  };
}

module.exports = { kirimEmail, suratKuitansi, rupiah, tanggalIndo, namaMetode };
