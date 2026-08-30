/**
 * Mengunduh aset ornamen yang sudah DIPILIH dari Pinterest, satu per satu
 * dengan jeda seperti orang menelusuri.
 *
 * KENAPA BERKAS INI ADA
 * ---------------------
 * Aset ornamen sebelumnya dikumpulkan user satu-satu dengan tangan, dan
 * itu memakan waktunya. Alat ini memindahkan bagian mekanisnya ke sini —
 * TAPI dengan dua batasan yang disengaja:
 *
 *   1. Alat ini TIDAK mencari. Ia cuma mengunduh daftar URL yang sudah
 *      dipilih lebih dulu (dengan mata, lewat browser). Pemilihan aset
 *      adalah penilaian rasa, dan itu tidak boleh diotomatiskan.
 *   2. Jeda antar unduhan 5-10 detik, ACAK. Bukan basa-basi: mengambil
 *      puluhan berkas beruntun dari satu akun adalah cara tercepat
 *      membuat akun Pinterest user kena batasan. Yang menanggung
 *      akibatnya akun user, bukan skrip ini.
 *
 * DUA HAL YANG BARU KETAHUAN SETELAH DICOBA, DAN MENGHEMAT WAKTU:
 *
 *   - Pinterest menyimpan berkas aslinya sebagai JPEG, apa pun format
 *     unggahan aslinya. Menebak `.png` pada URL /originals/ membalas 403.
 *     Artinya ALPHA SELALU HILANG, termasuk pada pin yang di layar
 *     terlihat transparan.
 *   - Pin yang "terlihat transparan" itu sebenarnya tangkapan layar dari
 *     PNG transparan, jadi papan catur abu-putihnya ikut terpanggang jadi
 *     piksel sungguhan. Membuangnya butuh kunci berbasis KEJENUHAN warna,
 *     bukan kecerahan — lihat opsi `hapusLatarPucat` di siapkan-ornamen.js.
 *
 * Hasil unduhan masuk ke folder aset milik user (di luar repo), subfolder
 * "UNDUHAN CLAUDE", supaya seluruh pustaka ornamen tetap di satu tempat
 * dan siapkan-ornamen.js bekerja tanpa perlu diubah.
 *
 * PAKAI:
 *   node tools/unduh-ornamen.js daftar.json
 *
 * Bentuk daftar.json:
 *   [ { "nama": "arabesque-sudut-emas", "url": "https://i.pinimg.com/originals/../..jpg" }, ... ]
 *
 * JALUR /originals/ SERING 403, dan itu normal — bukan tanda diblokir.
 * Pinterest tidak menyimpan setiap pin di jalur itu. Karena itu alat ini
 * mencoba beberapa jalur berurutan dari yang paling besar:
 *   originals(.jpg) -> originals(.png) -> 1200x -> 736x -> 564x
 * Percobaan gagal TIDAK dihitung sebagai unduhan dan tidak diberi jeda
 * penuh — yang dijeda adalah antar-ASET, bukan antar-percobaan.
 *
 * "nama" dipakai apa adanya sebagai nama berkas (tanpa ekstensi) — jadi
 * beri nama yang deskriptif sejak awal. Nama berpola ID mentah adalah
 * alasan folder aset lama sulit ditelusuri.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const TUJUAN = path.join(
  process.env.USERPROFILE || require('os').homedir(),
  'OneDrive', 'Dokumen', 'Website Project', 'Kartuundangan Project',
  'FOTO UNTUK SAMPEL', 'ORNAMENT', 'UNDUHAN CLAUDE'
);

const JEDA_MIN = 5000;
const JEDA_MAKS = 10000;

// User-Agent browser sungguhan. Tanpa ini sebagian CDN membalas 403.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';

function tidur(ms) { return new Promise(r => setTimeout(r, ms)); }

function unduh(url, tujuan) {
  return new Promise((selesai, gagal) => {
    https.get(url, { headers: { 'User-Agent': UA, 'Referer': 'https://www.pinterest.com/' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return gagal(new Error('HTTP ' + res.statusCode));
      }
      const potongan = [];
      res.on('data', d => potongan.push(d));
      res.on('end', () => {
        const buf = Buffer.concat(potongan);
        fs.writeFileSync(tujuan, buf);
        selesai(buf.length);
      });
    }).on('error', gagal);
  });
}

/**
 * Format ditentukan dari ISI berkas, bukan dari ekstensi di URL.
 *
 * INI TEMUAN YANG MENGUBAH SEGALANYA, jangan dihapus: Pinterest
 * menyajikan berkas PNG di URL yang berakhiran `.jpg`. Percobaan pertama
 * memakai ekstensi URL apa adanya, sehingga PNG beralpha tersimpan
 * bernama .jpg — pembaca dimensinya gagal (0x0), dan yang lebih parah,
 * saya sempat menyimpulkan "Pinterest selalu membuang alpha" lalu nyaris
 * menjalankan seluruh aset lewat penghapus latar yang tidak diperlukan.
 * Kenyataannya sebagian besar pin ornamen memang PNG utuh beralpha.
 *
 * Aturannya sekarang: baca magic bytes, simpan dengan ekstensi yang
 * BENAR, dan laporkan formatnya — karena format menentukan apakah aset
 * itu butuh `hapusLatarPucat` di siapkan-ornamen.js atau tidak.
 */
function periksaGambar(buf) {
  // PNG: 89 50 4E 47 0D 0A 1A 0A, lalu IHDR pada offset 16.
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504E47) {
    return { format: 'png', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // JPEG: cari marker SOF.
  if (buf.length > 4 && buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i < buf.length - 8) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return { format: 'jpg', h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return { format: 'jpg', w: 0, h: 0 };
  }
  return { format: null, w: 0, h: 0 };
}

(async () => {
  const berkasDaftar = process.argv[2];
  if (!berkasDaftar || !fs.existsSync(berkasDaftar)) {
    console.error('Pakai: node tools/unduh-ornamen.js daftar.json');
    process.exit(1);
  }
  const daftar = JSON.parse(fs.readFileSync(berkasDaftar, 'utf8'));
  fs.mkdirSync(TUJUAN, { recursive: true });

  console.log('Tujuan: ' + TUJUAN);
  console.log(daftar.length + ' aset, jeda 5-10 detik antar unduhan.\n');

  let berhasil = 0, gagal = 0, kecil = 0;

  for (let i = 0; i < daftar.length; i++) {
    const o = daftar[i];
    const sementara = path.join(TUJUAN, '.sementara-unduh');

    if (fs.existsSync(path.join(TUJUAN, o.nama + '.png')) ||
        fs.existsSync(path.join(TUJUAN, o.nama + '.jpg'))) {
      console.log(`  = ${o.nama} (sudah ada, lewati)`);
      continue;
    }

    // Rantai jalur, dari yang paling besar. Lihat catatan di kepala berkas.
    const m = o.url.match(/i\.pinimg\.com\/[^/]+\/(.+)\.(jpg|png)$/);
    const kandidat = m
      ? [
          `https://i.pinimg.com/originals/${m[1]}.jpg`,
          `https://i.pinimg.com/originals/${m[1]}.png`,
          `https://i.pinimg.com/1200x/${m[1]}.jpg`,
          `https://i.pinimg.com/736x/${m[1]}.jpg`,
          `https://i.pinimg.com/564x/${m[1]}.jpg`
        ]
      : [o.url];

    let sukses = false;
    for (const url of kandidat) {
      try {
        const ukuran = await unduh(url, sementara);
        const d = periksaGambar(fs.readFileSync(sementara));
        if (!d.format) { fs.unlinkSync(sementara); continue; }

        const tujuan = path.join(TUJUAN, o.nama + '.' + d.format);
        fs.renameSync(sementara, tujuan);

        const jalur = (url.match(/pinimg\.com\/([^/]+)\//) || [])[1];
        const catatanKecil = (d.w && d.w < 400) ? '  <-- KECIL, periksa sebelum dipakai' : '';
        if (catatanKecil) kecil++;
        // Format ikut dilaporkan: PNG berarti alpha kemungkinan besar utuh
        // dan aset bisa langsung dipakai `alpha:true`; JPG berarti alpha
        // sudah hilang dan aset butuh `hapusLatarPucat`.
        console.log(`  + ${o.nama}  ${d.w}x${d.h}  ${d.format.toUpperCase()}  ` +
                    `${Math.round(ukuran / 1024)} KB  [${jalur}]${catatanKecil}`);
        berhasil++;
        sukses = true;
        break;
      } catch (e) {
        try { fs.unlinkSync(sementara); } catch (_) {}
      }
    }
    if (!sukses) {
      console.log(`  x ${o.nama}  GAGAL di semua jalur`);
      gagal++;
    }

    // Jeda hanya di ANTARA unduhan, bukan sesudah yang terakhir.
    if (i < daftar.length - 1) {
      const jeda = JEDA_MIN + Math.floor(Math.random() * (JEDA_MAKS - JEDA_MIN));
      await tidur(jeda);
    }
  }

  console.log(`\nSelesai: ${berhasil} berhasil, ${gagal} gagal` +
              (kecil ? `, ${kecil} beresolusi rendah (periksa sebelum dipakai)` : '') + '.');
})();
