// Paket harga satu undangan ditentukan oleh TEMA yang dipakainya.
//
// Kenapa di server, dan kenapa dari kategori:
//
// Sebelum ini, api/bayar/buat.js menerima `tier` dari body request dan
// hanya memvalidasinya terhadap katalog. Selama cuma satu paket yang
// bisa dibeli, itu tidak berbahaya — tidak ada paket lain untuk dipilih.
// Begitu paket Pro ikut dijual, membiarkan `tier` datang dari browser
// berarti pembeli tema Pro bisa mengirim tier:'standar' dan membayar
// Rp49.000 untuk tema Rp89.000. Persis kelas kesalahan yang sudah
// dicegah untuk `amount` di berkas itu, cuma pintu masuk yang berbeda.
//
// Dipetakan dari KATEGORI, bukan daftar 15 nama tema, supaya tema ke-16
// di kategori yang sudah ada langsung ikut harga yang benar tanpa perlu
// ada yang ingat memperbarui berkas ini. Yang harus diingat cuma kalau
// ada KATEGORI baru.
//
// Pasangan tampilannya ada di assets/theme-templates.js (field `tier`
// per tema). Keduanya sengaja tidak berbagi berkas: yang satu modul
// CommonJS di serverless function, yang satu <script> di browser, dan
// project ini tanpa build step — sama seperti pasangan
// assets/pricing-plans.js / api/_lib/harga.js.

// Kategori yang masuk paket Standar. Sisanya Pro.
//
// Sengaja daftar-yang-murah, bukan daftar-yang-mahal: kategori baru yang
// lupa didaftarkan akan jatuh ke Pro (menagih lebih), bukan ke Standar
// (menagih kurang). Kalau salah satu harus terjadi, yang bisa
// diperbaiki dengan mengembalikan uang lebih baik daripada yang berarti
// tema premium terjual di bawah harga tanpa ada yang tahu.
const KATEGORI_STANDAR = ['Elegan Klasik'];

// Undangan lama yang kategorinya kosong / tidak dikenal dianggap
// Standar. Baris-baris itu dibuat saat cuma ada tiga tema Elegan
// Klasik, jadi Standar memang harga yang benar untuknya — dan menagih
// pelanggan lama lebih mahal karena perubahan katalog jelas salah.
function tierUntukKategori(kategori) {
  const k = String(kategori || '').trim();
  if (!k) return 'standar';
  return KATEGORI_STANDAR.indexOf(k) >= 0 ? 'standar' : 'pro';
}

module.exports = { KATEGORI_STANDAR, tierUntukKategori };
