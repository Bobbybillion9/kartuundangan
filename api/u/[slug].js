// Vercel Serverless Function untuk rute publik /u/[slug] (lihat
// vercel.json: rewrite "/u/:slug" -> "/api/u/:slug", URL di address bar
// tamu tetap /u/[slug]).
//
// Kenapa function ini ada (bukan cukup file statis undangan.html saja):
// undangan.html mengambil & menampilkan data undangan sepenuhnya lewat
// JavaScript di browser. Itu sempurna untuk pengunjung manusia, tapi
// bot pratinjau link (WhatsApp, Telegram, Facebook, dst.) TIDAK
// menjalankan JavaScript — mereka cuma membaca tag <meta> dari HTML
// mentah hasil satu kali GET. Supaya link yang dibagikan ke WhatsApp
// menampilkan judul/deskripsi/foto yang benar per-undangan, kita perlu
// hasil server-side sekali ini saja, khusus untuk bot semacam itu.
//
// Jadi function ini bercabang berdasar User-Agent:
// - Bot pratinjau link dikenali -> ambil beberapa kolom non-sensitif
//   lewat REST API Supabase (bukan SDK, supaya tidak perlu dependensi
//   npm sama sekali) dan balas HTML kecil berisi meta tag Open Graph
//   yang sesuai.
// - Pengunjung biasa -> diteruskan apa adanya ke isi undangan.html
//   statis; pengambilan data & render sesungguhnya tetap terjadi di
//   browser seperti biasa (function ini SAMA SEKALI tidak memanggil
//   Supabase untuk jalur ini, supaya kunjungan manusia tetap satu
//   request statis yang cepat).

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ebjwjnxunedjftgzzbch.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qUFa64f8yhx_3dYYwaP3Aw_kHD6JvuA';

// Gambar cadangan untuk pratinjau link. Dipakai kalau pasangan belum
// mengunggah foto utama — tanpa ini, tautan yang mereka sebar ke
// WhatsApp muncul sebagai kartu polos tanpa gambar sama sekali, yang
// terbaca seperti link rusak justru di saat tamu memutuskan mau
// membukanya atau tidak.
const OG_IMAGE_CADANGAN = 'https://kartuundangan.link/assets/og-image.jpg';

// Daftar bot pratinjau link yang diketahui TIDAK menjalankan JavaScript
// saat mengambil tautan (dicocokkan sebagai substring User-Agent, huruf
// kecil). Googlebot sengaja tidak dimasukkan karena Googlebot modern
// menjalankan JavaScript, sehingga lebih baik dapat halaman aslinya.
const CRAWLER_UA_PATTERNS = [
  'whatsapp', 'facebookexternalhit', 'facebot', 'twitterbot', 'telegrambot',
  'linkedinbot', 'slackbot', 'discordbot', 'pinterest', 'skypeuripreview',
  'redditbot', 'embedly', 'quora link preview', 'outbrain', 'nuzzel',
  'bitlybot', 'iframely', 'vkshare', 'w3c_validator'
];

function isLinkPreviewBot(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  return CRAWLER_UA_PATTERNS.some((p) => ua.indexOf(p) !== -1);
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function formatTanggalIndo(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
}

function metaShell({ title, description, image, url }) {
  return '<!doctype html><html lang="id"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + escapeHtml(title) + '</title>' +
    '<meta name="description" content="' + escapeHtml(description) + '">' +
    '<meta name="robots" content="noindex, nofollow">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:title" content="' + escapeHtml(title) + '">' +
    '<meta property="og:description" content="' + escapeHtml(description) + '">' +
    (image ? '<meta property="og:image" content="' + escapeHtml(image) + '">' : '') +
    '<meta property="og:url" content="' + escapeHtml(url) + '">' +
    '<meta name="twitter:card" content="' + (image ? 'summary_large_image' : 'summary') + '">' +
    '</head><body></body></html>';
}

module.exports = async function handler(req, res) {
  const slug = req.query.slug;
  const publicUrl = 'https://kartuundangan.link/u/' + encodeURIComponent(slug || '');

  if (!isLinkPreviewBot(req.headers['user-agent'])) {
    const html = fs.readFileSync(path.join(process.cwd(), 'undangan.html'), 'utf8');
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.status(200).send(html);
    return;
  }

  try {
    const fields = 'nama_pria_panggilan,nama_wanita_panggilan,tanggal_akad,tanggal_resepsi,lokasi_nama,foto_utama_url';
    const apiUrl = SUPABASE_URL + '/rest/v1/invitations?slug=eq.' + encodeURIComponent(slug || '') +
      '&status=eq.aktif&select=' + fields;
    const r = await fetch(apiUrl, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
    });
    const rows = await r.json();
    const inv = Array.isArray(rows) ? rows[0] : null;

    if (!inv) {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.status(200).send(metaShell({
        title: 'Undangan Tidak Ditemukan — Kartu Undangan',
        description: 'Alamat undangan ini tidak valid atau sudah tidak tersedia.',
        image: OG_IMAGE_CADANGAN,
        url: publicUrl
      }));
      return;
    }

    const namaPria = inv.nama_pria_panggilan || 'Mempelai Pria';
    const namaWanita = inv.nama_wanita_panggilan || 'Mempelai Wanita';
    const tanggal = formatTanggalIndo(inv.tanggal_resepsi || inv.tanggal_akad);
    const deskripsi = [tanggal, inv.lokasi_nama].filter(Boolean).join(' · ') || 'Undangan pernikahan digital.';

    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.status(200).send(metaShell({
      title: namaPria + ' & ' + namaWanita + ' — Undangan Pernikahan',
      description: deskripsi,
      image: inv.foto_utama_url || OG_IMAGE_CADANGAN,
      url: publicUrl
    }));
  } catch (err) {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.status(200).send(metaShell({
      title: 'Kartu Undangan',
      description: 'Undangan pernikahan digital.',
      image: OG_IMAGE_CADANGAN,
      url: publicUrl
    }));
  }
};
