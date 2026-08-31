// Helper edit teks untuk skrip perubahan berkas di repo ini.
//
// Ada karena beberapa berkas di repo ini BERCAMPUR akhiran barisnya:
// satu blok CRLF, blok lain LF (assets/style.css sudah membuktikannya).
// Pencocokan string mentah karena itu gagal tanpa sebab yang kelihatan —
// blok satu baris cocok, blok banyak baris tidak, dan tidak ada pesan
// yang menjelaskan kenapa.
//
// ganti() mencocokkan dengan regex yang membolehkan \r?\n di tiap batas
// baris, lalu menulis pengganti memakai akhiran baris yang SAMA dengan
// potongan yang ditemukannya, supaya berkasnya tidak jadi makin campur.
const fs = require('fs');

function esc(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function polaBaris(teks) {
  return teks.split('\n').map(esc).join('\r?\n');
}

function ganti(isi, dari, ke, label) {
  const re = new RegExp(polaBaris(dari));
  const m = isi.match(re);
  if (!m) throw new Error('TIDAK KETEMU: ' + (label || dari.slice(0, 60)));
  const crlf = m[0].includes('\r\n');
  const keAkhir = crlf ? ke.replace(/\n/g, '\r\n') : ke;
  return isi.slice(0, m.index) + keAkhir + isi.slice(m.index + m[0].length);
}

// pasangan: [[dari, ke, label], ...] — dijalankan berurutan.
function gantiBerkas(path, pasangan) {
  let isi = fs.readFileSync(path, 'utf8');
  pasangan.forEach(function (p) { isi = ganti(isi, p[0], p[1], p[2]); });
  fs.writeFileSync(path, isi);
  console.log('OK ' + path + ' (' + pasangan.length + ' ubahan)');
}

// Sisipkan sesudah potongan penanda, tanpa menghapus apa pun.
function sisipSesudah(isi, penanda, tambahan, label) {
  return ganti(isi, penanda, penanda + tambahan, label);
}

module.exports = { ganti, gantiBerkas, sisipSesudah };
