/**
 * Memeriksa ketiga data DNS yang dibutuhkan Resend, dan menjelaskan APA
 * yang salah kalau belum benar.
 *
 * KENAPA BERKAS INI ADA
 * ---------------------
 * Tombol "Verify DNS Records" di Resend cuma memberi merah atau hijau. Ia
 * tidak memberi tahu bahwa subdomainmu tertulis dobel, bahwa kunci DKIM-nya
 * terpotong saat disalin, atau bahwa datanya sebenarnya sudah benar dan
 * kamu cuma perlu menunggu. Ketiga hal itu terlihat sama persis dari sisi
 * pemakai: merah. Jadi orang menebak, mengubah-ubah datanya, dan justru
 * mengulang hitungan waktu penyebaran dari nol.
 *
 * Berkas ini membaca DNS-nya sendiri dan menyebut masalahnya dengan nama.
 *
 * Dibaca lewat DNS-over-HTTPS ke Google & Cloudflare, BUKAN lewat resolver
 * komputer ini. Alasannya: resolver lokal menyimpan jawaban lama, jadi
 * sesudah kamu memperbaiki sesuatu ia bisa tetap melaporkan yang lama
 * selama berjam-jam — dan itu persis jenis kebingungan yang mau dihindari.
 * Dua penyedia dipakai sekaligus supaya ketahuan kalau datanya baru
 * menyebar sebagian.
 *
 * PAKAI:  node tools/cek-dns-email.js [domain]
 *         tanpa argumen = kartuundangan.link
 */
const DOMAIN = process.argv[2] || 'kartuundangan.link';

const PENYEDIA = [
  { nama: 'Google',     url: 'https://dns.google/resolve' },
  { nama: 'Cloudflare', url: 'https://cloudflare-dns.com/dns-query' }
];

async function tanya(penyedia, nama, tipe) {
  const u = penyedia.url + '?name=' + encodeURIComponent(nama) + '&type=' + tipe;
  try {
    const r = await fetch(u, { headers: { accept: 'application/dns-json' } });
    if (!r.ok) return { gagal: 'HTTP ' + r.status };
    const d = await r.json();
    // Status 3 = NXDOMAIN (nama tidak ada sama sekali).
    return {
      nxdomain: d.Status === 3,
      jawaban: (d.Answer || [])
        .filter(a => a.type === (tipe === 'MX' ? 15 : 16))
        .map(a => String(a.data).replace(/^"|"$/g, '').replace(/" "/g, ''))
    };
  } catch (e) {
    return { gagal: (e && e.message) || 'gagal' };
  }
}

async function periksa(label, nama, tipe, uji) {
  const hasil = [];
  for (const p of PENYEDIA) hasil.push({ p: p.nama, ...(await tanya(p, nama, tipe)) });

  // Jawaban dari kedua penyedia DISATUKAN sebagai himpunan unik, bukan
  // ditumpuk. Versi pertama alat ini menumpuknya, lalu melaporkan "ADA
  // LEBIH DARI SATU baris SPF" untuk satu data SPF yang benar — karena
  // Google dan Cloudflare sama-sama mengembalikannya. Kesalahan yang
  // persis seperti yang alat ini dibuat untuk mencegah: sinyal palsu yang
  // membuat orang mengubah data yang sebenarnya sudah benar.
  const semuaJawaban = [...new Set(hasil.flatMap(h => h.jawaban || []))];
  const adaDiSemua = hasil.every(h => (h.jawaban || []).length > 0);
  const adaDiSebagian = semuaJawaban.length > 0 && !adaDiSemua;

  console.log('\n' + label);
  console.log('  nama   : ' + nama);
  console.log('  tipe   : ' + tipe);

  if (semuaJawaban.length === 0) {
    console.log('  hasil  : BELUM ADA');
    console.log('  artinya: data ini belum terbaca publik. Dua kemungkinan —');
    console.log('           (a) belum dimasukkan di Dynadot, atau');
    console.log('           (b) baru dimasukkan dan belum menyebar (tunggu 15-60 menit).');
    console.log('           Jangan ubah-ubah datanya sambil menunggu; itu mengulang hitungannya.');
    return false;
  }

  semuaJawaban.forEach(j => console.log('  isi    : ' + j));
  if (adaDiSebagian) {
    console.log('  catatan: baru terbaca di sebagian penyedia — masih menyebar, tunggu sebentar.');
  }

  const masalah = uji(semuaJawaban);
  if (masalah.length) {
    console.log('  hasil  : ADA MASALAH');
    masalah.forEach(m => console.log('           - ' + m));
    return false;
  }
  console.log('  hasil  : BENAR');
  return true;
}

// Kesalahan paling sering di Dynadot: kolom Subdomain diisi nama lengkap,
// sehingga Dynadot menambahkan nama domainnya lagi di belakang.
function cekDobel(nilai, domain) {
  const d = domain.replace('.', '\\.');
  return new RegExp(d + '\\.' + d, 'i').test(nilai) ? [nilai + ' mengandung nama domain DUA KALI'] : [];
}

(async () => {
  console.log('Memeriksa data DNS email untuk: ' + DOMAIN);
  console.log('(dibaca lewat DNS-over-HTTPS, bukan resolver komputer ini)');

  const namaKirim = 'send.' + DOMAIN;
  const namaDkim = 'resend._domainkey.' + DOMAIN;

  // Nama yang dobel diperiksa lebih dulu, karena kalau itu yang terjadi,
  // nama yang BENAR akan melaporkan "belum ada" dan orang menyimpulkan
  // datanya belum masuk — padahal sudah masuk, cuma di alamat yang salah.
  const dobel = await tanya(PENYEDIA[0], 'send.' + DOMAIN + '.' + DOMAIN, 'MX');
  if ((dobel.jawaban || []).length) {
    console.log('\n!! KETEMU DATA DI ALAMAT YANG SALAH');
    console.log('   send.' + DOMAIN + '.' + DOMAIN + ' ternyata ADA isinya.');
    console.log('   Artinya di Dynadot kolom Subdomain diisi nama lengkap.');
    console.log('   Perbaiki: isi "send" saja, bukan "send.' + DOMAIN + '".');
  }

  const ok = [];

  ok.push(await periksa('1. MX untuk pengiriman', namaKirim, 'MX', function (nilai) {
    const m = [];
    const punyaSes = nilai.some(v => /amazonses\.com/i.test(v));
    if (!punyaSes) m.push('tidak menunjuk ke feedback-smtp...amazonses.com');
    nilai.forEach(v => m.push(...cekDobel(v, DOMAIN)));
    return m;
  }));

  ok.push(await periksa('2. TXT SPF', namaKirim, 'TXT', function (nilai) {
    const m = [];
    const spf = nilai.filter(v => /^v=spf1/i.test(v));
    if (!spf.length) m.push('tidak ada baris yang diawali "v=spf1"');
    if (spf.length > 1) m.push('ADA LEBIH DARI SATU baris SPF — hanya boleh satu, sisanya membuat SPF gagal total');
    if (spf.length === 1 && !/amazonses\.com/i.test(spf[0])) m.push('tidak memuat include:amazonses.com');
    return m;
  }));

  ok.push(await periksa('3. TXT DKIM', namaDkim, 'TXT', function (nilai) {
    const m = [];
    const dkim = nilai.find(v => /p=/i.test(v));
    if (!dkim) m.push('tidak ada bagian "p=" — kuncinya tidak terbaca');
    else {
      const kunci = (dkim.match(/p=([A-Za-z0-9+/=]*)/) || [])[1] || '';
      // Kunci DKIM RSA 1024-bit ~216 karakter, 2048-bit ~392. Jauh di
      // bawah itu berarti tersalin sebagian — penyebab paling sering,
      // dan paling sulit dilihat dengan mata karena tetap "terlihat panjang".
      if (kunci.length < 150) m.push('kunci hanya ' + kunci.length + ' karakter — kemungkinan besar TERPOTONG saat disalin');
      if (/\s/.test(dkim.replace(/^v=DKIM1;?\s*/i, '').replace(/;\s*/g, ';'))) {
        m.push('ada spasi di dalam kunci — biasanya ikut terbawa saat menyalin');
      }
    }
    return m;
  }));

  const beres = ok.every(Boolean);
  console.log('\n' + '-'.repeat(58));
  console.log(beres
    ? 'SEMUA BENAR. Tekan "Verify DNS Records" di Resend sekarang.'
    : 'BELUM SIAP. Perbaiki yang ditandai di atas, lalu jalankan lagi.');
  console.log('-'.repeat(58));
  process.exit(beres ? 0 : 1);
})();
