/**
 * Memeriksa pencocokan nama bank -> berkas logo.
 *
 * KENAPA BERKAS INI ADA
 * ---------------------
 * User mengetik nama banknya BEBAS. Kalau pencocokannya meleset, tidak
 * ada error apa pun: logonya cuma tidak muncul (atau, lebih buruk,
 * muncul logo bank yang salah di kartu rekening orang).
 *
 * Sudah terbukti perlu: daftar versi pertama memakai kunci seperti
 * BANKCENTRALASIA, padahal ringkasNamaBank() sudah membuang kata BANK di
 * awal — kunci itu MUSTAHIL cocok, dan tidak ada yang memberi tahu.
 * Ketahuan hanya lewat berkas ini.
 *
 * Tidak butuh browser maupun server. Jalankan setelah menyentuh
 * LOGO_BANK atau menambah berkas di assets/pembayaran/.
 *
 * PAKAI:  node tools/cek-logo-bank.js
 */
// Yang diuji adalah KODE SUNGGUHAN: daftar dan fungsinya diambil dari
// assets/render-undangan.js apa adanya, bukan disalin ke sini. Salinan
// akan menua diam-diam dan ujinya jadi tidak berarti.
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync('assets/render-undangan.js', 'utf8');

const mDaftar = /var LOGO_BANK = \{[\s\S]*?\n  \};/.exec(src);
const mFungsi = /function ringkasNamaBank\(nama\)\{[\s\S]*?\n  \}/.exec(src);
if (!mDaftar || !mFungsi) {
  console.error('Tidak bisa mengambil LOGO_BANK / ringkasNamaBank dari perender.');
  process.exit(1);
}
eval(mDaftar[0] + '\n' + mFungsi[0]);

// Ditulis seperti orang sungguhan mengetik: singkatan, nama panjang,
// huruf kecil, ada titik, ada "Bank", ada "PT", ada spasi berlebih.
const UJI = [
  ['BCA', 'bca'],
  ['Bank BCA', 'bca'],
  ['bank bca', 'bca'],
  ['B.C.A', 'bca'],
  ['  BCA  ', 'bca'],
  ['Bank Central Asia', 'bca'],
  ['PT Bank Central Asia', 'bca'],
  ['Mandiri', 'mandiri'],
  ['Bank Mandiri', 'mandiri'],
  ['BRI', 'bri'],
  ['Bank Rakyat Indonesia', 'bri'],
  ['BNI', 'bni'],
  ['bank negara indonesia', 'bni'],
  ['BSI', 'bsi'],
  ['Bank Syariah Indonesia', 'bsi'],
  ['CIMB', 'cimb'],
  ['CIMB Niaga', 'cimb'],
  ['Bank Permata', 'permata'],
  ['GoPay', 'gopay'],
  ['ShopeePay', 'shopeepay'],
  // Yang HARUS tidak ketemu: bank daerah & bank digital yang logonya
  // memang tidak kita punya. Perilaku benarnya adalah menyembunyikan
  // logo, bukan menampilkan logo bank lain.
  ['Bank Jago', null],
  ['SeaBank', null],
  ['Bank BJB', null],
  ['Blu by BCA Digital', null],
  ['', null]
];

let gagal = 0;
for (const [masuk, harap] of UJI) {
  const dapat = LOGO_BANK[ringkasNamaBank(masuk)] || null;
  const ok = dapat === harap;
  if (!ok) gagal++;
  console.log(
    (ok ? '  ok  ' : 'GAGAL ') +
    JSON.stringify(masuk).padEnd(28) + ' -> ' +
    String(dapat) + (ok ? '' : '   (harusnya ' + String(harap) + ')')
  );
}

// Setiap berkas yang dirujuk daftar HARUS benar-benar ada. Entri yang
// menunjuk berkas hilang tidak memberi error apa pun — logonya cuma
// tidak muncul, persis pola gagal-senyap yang dihindari project ini.
console.log('\nBerkas yang dirujuk:');
const unik = [...new Set(Object.values(LOGO_BANK))];
for (const berkas of unik) {
  const p = path.join('assets', 'pembayaran', berkas + '.svg');
  const ada = fs.existsSync(p);
  if (!ada) gagal++;
  console.log('  ' + (ada ? 'ok   ' : 'HILANG ') + p);
}

console.log('\n' + (gagal ? gagal + ' GAGAL.' : 'Semua lolos (' + UJI.length + ' masukan, ' + unik.length + ' berkas).'));
process.exit(gagal ? 1 : 0);
