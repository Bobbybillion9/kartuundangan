/**
 * Menyiapkan aset ornamen untuk dipakai tema: memperkecil + mengubah ke WebP.
 *
 * KENAPA BERKAS INI ADA
 * ---------------------
 * Aset ornamen mentah ada di luar repo (folder OneDrive milik user) dan
 * BERAT: 23 MB seluruhnya, wax seal saja rata-rata 371 KB per keping untuk
 * gambar 500x500. Kalau dipakai apa adanya, satu tema dengan latar penuh +
 * empat ornamen sudut + wax seal bisa melewati 2 MB.
 *
 * Itu bukan angka teoretis. Undangan ini dibuka tamu di HP memakai kuota,
 * sering di tempat resepsi dengan sinyal buruk, dan tiga tema pertama
 * murni CSS/SVG sehingga terbuka seketika. Menambahkan tema yang butuh
 * 2 MB akan terasa seperti kemunduran justru pada tema yang paling mahal.
 *
 * Hasilnya di-commit ke repo (bukan dibangun saat deploy) karena project
 * ini memang tanpa build step — lihat CLAUDE.md.
 *
 * KENAPA LEWAT CHROME
 * -------------------
 * Tidak ada ImageMagick di mesin ini (`convert` yang ada di PATH itu alat
 * NTFS bawaan Windows), dan System.Drawing bawaan .NET — yang dipakai
 * tools/potret-tema.js — TIDAK bisa menulis WebP sama sekali. Yang sudah
 * tersedia dan bisa: mesin encoder di dalam Chrome, lewat
 * canvas.toDataURL('image/webp'). Chrome-nya sudah dipakai dua alat lain
 * di folder ini, jadi tidak ada prasyarat baru.
 *
 * Berkas sumbernya ada di luar repo sehingga tidak bisa disajikan server
 * statis project. Alat ini menyalakan server kecil sendiri di port acak
 * khusus selama proses berjalan, lalu mematikannya.
 *
 * PRASYARAT: Chrome headless dengan --remote-debugging-port=9222
 *
 * PAKAI:  node tools/siapkan-ornamen.js [nama-keluaran ...]
 *         tanpa argumen = semua
 *         --paksa   tulis ulang walau berkas tujuannya sudah ada
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const REPO = path.resolve(__dirname, '..');
const CDP = 'http://127.0.0.1:9222';

// Folder aset mentah milik user, di luar repo dan di luar git.
const SUMBER = path.join(
  process.env.USERPROFILE || require('os').homedir(),
  'OneDrive', 'Dokumen', 'Website Project', 'Kartuundangan Project',
  'FOTO UNTUK SAMPEL', 'ORNAMENT'
);

const TUJUAN_DIR = path.join(REPO, 'templates', '_ornamen');

// ============================================================
// DAFTAR ASET
// ------------------------------------------------------------
// Nama keluaran sengaja deskriptif (bukan nama tema), karena satu aset
// bisa dipakai beberapa tema. Nama sumbernya dipertahankan apa adanya
// supaya bisa ditelusuri balik ke folder user.
//
// "lebar" adalah lebar TARGET. Sumbernya tidak pernah diperbesar — kalau
// sumbernya lebih kecil, ukuran aslinya yang dipakai. Latar dibiarkan di
// lebar aslinya (~736px): memperbesar tidak menambah detail, cuma berat.
// ============================================================
const ORNAMEN = [
  // --- SEGEL LILIN PER TEMA PRO (2026-08-31) ---
  // Dua belas segel, satu untuk tiap tema berbayar, dipilih dari 31
  // berkas yang diunduh user. Dasar pemilihannya WARNA tema dan
  // LAMBANGNYA — bukan mana yang paling bagus sendirian: segel adalah
  // satu-satunya benda berbentuk di layar pertama, jadi kalau dua tema
  // memakai segel yang sama, dua layar pertamanya terbaca kembar.
  // pangkas WAJIB: berkas sumbernya punya margin transparan lebar, dan
  // background-size:contain akan memakai TINGGI kotak sehingga segelnya
  // menyusut jauh di dalam kotaknya sendiri.
  {
    keluaran: 'segel-pro-blanc.webp',
    sumber: 'WAX SEALS/WAX STAMPS (5).png',
    lebar: 260, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'emas bunga — putih-emas Blanc Royale'
  },
  {
    keluaran: 'segel-pro-noir.webp',
    sumber: 'WAX SEALS/WAX STAMPS (3).png',
    lebar: 260, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'hitam bermawar emas — hitam-emas Noir Dore'
  },
  {
    keluaran: 'segel-pro-bordeaux.webp',
    sumber: 'WAX SEALS/WAX STAMPS (27).png',
    lebar: 260, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'mawar merah tua bercincin ukir — burgundy Bordeaux'
  },
  {
    keluaran: 'segel-pro-zamrud.webp',
    sumber: 'WAX SEALS/WAX STAMPS (11).png',
    lebar: 260, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'hijau tua, bulan sabit & bintang emas — Nur Zamrud'
  },
  {
    keluaran: 'segel-pro-lazuardi.webp',
    sumber: 'WAX SEALS/WAX STAMPS (10).png',
    lebar: 260, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'merah tua, bulan sabit & bintang — Nur Lazuardi'
  },
  {
    keluaran: 'segel-pro-sakinah.webp',
    sumber: 'WAX SEALS/WAX STAMPS (6).png',
    lebar: 260, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'gading polos berbunga — Nur Sakinah'
  },
  {
    keluaran: 'segel-pro-shuangxi.webp',
    sumber: 'WAX SEALS/WAX STAMPS (31).png',
    lebar: 260, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'hati merah menyala — Shuangxi Merah'
  },
  {
    keluaran: 'segel-pro-giok.webp',
    sumber: 'WAX SEALS/WAX STAMPS (12).png',
    lebar: 260, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'giok kebiruan berbotani — Giok Langit'
  },
  {
    keluaran: 'segel-pro-tinta.webp',
    sumber: 'WAX SEALS/WAX STAMPS (22).png',
    lebar: 260, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'kerang emas, paling sunyi — Tinta Emas'
  },
  {
    keluaran: 'segel-pro-sekar.webp',
    sumber: 'WAX SEALS/WAX STAMPS (23).png',
    lebar: 260, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'cokelat sogan berbunga — Sekar Jagad'
  },
  {
    keluaran: 'segel-pro-pura.webp',
    sumber: 'WAX SEALS/WAX STAMPS (14).png',
    lebar: 260, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'terakota bermawar — Pura Bentar'
  },
  {
    keluaran: 'segel-pro-songket.webp',
    sumber: 'WAX SEALS/WAX STAMPS (9).png',
    lebar: 260, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'merah saga bermawar — Songket Saga'
  },
  // --- latar penuh ---
  {
    keluaran: 'latar-relief-halus.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/REGULAR/download (4).jpg',
    lebar: 736, mutu: 0.7,
    catatan: 'relief bunga putih rata, tanpa titik fokus — untuk latar halaman'
  },
  {
    keluaran: 'latar-plaster-daun.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/REGULAR/1046524032183404512.jpg',
    lebar: 736, mutu: 0.72,
    catatan: 'plaster pahatan daun, kontras kuat — untuk amplop & bidang kecil'
  },
  {
    keluaran: 'latar-bingkai-renda.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/REGULAR/893120169867625111.jpg',
    lebar: 736, mutu: 0.7,
    catatan: 'bingkai timbul bermotif renda, punya bidang kosong di tengah'
  },
  {
    keluaran: 'latar-hitam-emas.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/REGULAR/847239748695884284.jpg',
    lebar: 736, mutu: 0.72,
    catatan: 'hitam pekat dengan botani emas di tepi kiri — untuk tema malam'
  },
  {
    keluaran: 'latar-burgundy-kertas.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/REGULAR/872783602825743437.jpg',
    lebar: 675, mutu: 0.72,
    catatan: 'burgundy pekat dengan kertas bertepi sobek dan segel merah'
  },

  // --- ornamen sudut (transparan) ---
  {
    keluaran: 'sudut-baroque-a.webp',
    sumber: 'CORNER ORNAMENT/CORNER (3).png',
    lebar: 420, mutu: 0.88, alpha: true,
    catatan: 'sulur baroque emas, sudut kiri-atas; putar untuk sudut lain'
  },
  {
    keluaran: 'sudut-baroque-b.webp',
    sumber: 'CORNER ORNAMENT/CORNER (4).png',
    lebar: 420, mutu: 0.88, alpha: true,
    catatan: 'sulur baroque emas, lebih rapat'
  },
  {
    keluaran: 'sudut-bunga-emas.webp',
    sumber: 'CORNER ORNAMENT/CORNER (9).png',
    lebar: 420, mutu: 0.88, alpha: true,
    catatan: 'bunga emas bergaya ukiran, lebih lembut dari baroque'
  },

  // --- wax seal (transparan) ---
  {
    keluaran: 'segel-emas-bunga.webp',
    sumber: 'WAX SEALS/WAX STAMPS (4).png',
    lebar: 360, mutu: 0.9, alpha: true,
    catatan: 'segel emas bermotif bunga'
  },
  {
    keluaran: 'segel-gading.webp',
    sumber: 'WAX SEALS/WAX STAMPS (6).png',
    lebar: 360, mutu: 0.9, alpha: true,
    catatan: 'segel gading/krem, halus untuk tema terang'
  },
  {
    keluaran: 'segel-mawar-merah.webp',
    sumber: 'WAX SEALS/WAX STAMPS (27).png',
    lebar: 360, mutu: 0.9, alpha: true,
    catatan: 'segel merah bermotif mawar'
  },
  {
    keluaran: 'segel-mawar-hitam-emas.webp',
    sumber: 'WAX SEALS/WAX STAMPS (3).png',
    lebar: 360, mutu: 0.9, alpha: true,
    catatan: 'segel hitam dengan mawar emas'
  },
  // --- bingkai foto (transparan, DIWARNAI ULANG) ---
  {
    keluaran: 'bingkai-klasik-emas.webp',
    sumber: 'FRAME ORNAMENT/725361083777041375-removebg-preview.png',
    lebar: 500, mutu: 0.9, alpha: true,
    warnai: { gelap: '#7E611F', terang: '#E6CA8C' },
    catatan: 'bingkai garis klasik; sumbernya biru navy, diwarnai jadi emas'
  },

  // --- ornamen bebas (sudah emas, tinggal dikecilkan) ---
  {
    keluaran: 'bebas-bulu-emas.webp',
    sumber: 'FREE ORNAMENT/590534569878681499-removebg-preview.png',
    lebar: 260, mutu: 0.9, alpha: true,
    catatan: 'bulu tulis emas — untuk bagian Ucapan & Doa'
  },
  {
    keluaran: 'bebas-burung-emas.webp',
    sumber: 'FREE ORNAMENT/923449098695577728-removebg-preview.png',
    lebar: 360, mutu: 0.9, alpha: true,
    catatan: 'tiga burung emas terbang — untuk bagian Penutup'
  },
  {
    keluaran: 'bebas-jam-rococo.webp',
    sumber: 'FREE ORNAMENT/1030409589791219572-removebg-preview.png',
    lebar: 320, mutu: 0.9, alpha: true,
    catatan: 'jam rococo emas — untuk bagian Hitung Mundur'
  },

  // --- bingkai foto sungguhan (tengahnya BERLUBANG) ---
  // Bedanya dari bingkai-klasik-emas: yang ini bingkai ukiran bervolume
  // dengan lubang di tengah, jadi fotonya duduk DI DALAM bingkai dan
  // bingkainya terbaca sebagai benda tersendiri. Sudah diperiksa: kelima
  // titik contoh di bagian tengahnya beralpha 0, jadi foto di baliknya
  // benar-benar terlihat.
  {
    keluaran: 'bingkai-foto-emas.webp',
    sumber: 'CIRCLE.RECTANGLE FRAME ORNAMENT/Premium_Rectangle_Gold_Picture_Frame_Mockup_with_Ornate_Design-removebg-preview.png',
    lebar: 440, mutu: 0.9, alpha: true,
    catatan: 'bingkai ukiran emas 408x612, lubang tengah transparan'
  },
  {
    keluaran: 'karangan-bunga-emas.webp',
    sumber: 'CIRCLE.RECTANGLE FRAME ORNAMENT/Ақбота-removebg-preview.png',
    lebar: 420, mutu: 0.9, alpha: true,
    catatan: 'karangan bunga krem-emas melingkar berpita'
  },

  // --- lingkaran monogram & ikon acara ---
  {
    keluaran: 'monogram-lingkar-emas.webp',
    sumber: 'CIRCLE.RECTANGLE FRAME ORNAMENT/WEDDIN_1-removebg-preview.png',
    lebar: 420, mutu: 0.9, alpha: true,
    catatan: 'lingkaran emas bermahkota — latar monogram inisial'
  },
  {
    keluaran: 'ikon-cincin-emas.webp',
    sumber: 'FREE ORNAMENT/Elegant_Gold_Wedding_Ring_Set_Illustration-removebg-preview.png',
    lebar: 240, mutu: 0.9, alpha: true,
    catatan: 'sepasang cincin emas polos — ikon Akad Nikah'
  },
  {
    keluaran: 'ikon-gelas-emas.webp',
    sumber: 'FREE ORNAMENT/Watercolor_Floral_Champagne_Glasses_Clipart__Wedding_PNGs__300DPI_-removebg-preview.png',
    lebar: 240, mutu: 0.9, alpha: true,
    catatan: 'sepasang gelas berhias bunga krem — ikon Resepsi'
  },
  {
    keluaran: 'bebas-angsa-hati.webp',
    sumber: 'FREE ORNAMENT/26880929021432774-removebg-preview.png',
    // Dipangkas: gambar sumbernya punya margin transparan lebar, dan
    // dengan background-size:contain margin itu ikut dihitung sehingga
    // angsanya menyusut jauh di dalam kotaknya.
    lebar: 380, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'dua angsa berhadapan membentuk hati — penutup bagian galeri'
  },

  // --- garis pembatas (JPG berlatar putih, latarnya dibuang) ---
  {
    keluaran: 'garis-a.webp',
    sumber: 'LINE ORNAMENT/37647346881472345.jpg',
    lebar: 560, mutu: 0.92, alpha: true, hapusPutih: true, pangkas: true,
    catatan: 'garis tipis dengan sulur kecil di tengah — pembatas paling tenang'
  },
  {
    keluaran: 'garis-b.webp',
    sumber: 'LINE ORNAMENT/884816658062299109.jpg',
    lebar: 560, mutu: 0.92, alpha: true, hapusPutih: true, pangkas: true,
    catatan: 'sulur baroque penuh — pembatas paling ramai'
  },
  {
    keluaran: 'garis-c.webp',
    sumber: 'LINE ORNAMENT/Gold Line Divider Ornament, Divider, Line Dividers, Line PNG Transparent Clipart Image and PSD File for Free Download.jpg',
    lebar: 560, mutu: 0.92, alpha: true, hapusPutih: true, pangkas: true,
    catatan: 'garis halus bermotif tengah kecil — pembatas sedang'
  },
  {
    keluaran: 'garis-d.webp',
    sumber: 'LINE ORNAMENT/Яндекс Картинки_ поиск изображений в интернете, поиск по картинке.jpg',
    lebar: 560, mutu: 0.92, alpha: true, hapusPutih: true, pangkas: true,
    catatan: 'sulur baroque tebal & mengalir — pembatas untuk tema gelap'
  },

  // --- bingkai & lingkaran untuk tema kedua eropa-mewah ---
  {
    keluaran: 'bingkai-oval-emas.webp',
    sumber: 'CIRCLE.RECTANGLE FRAME ORNAMENT/Rámeček-removebg-preview.png',
    lebar: 440, mutu: 0.9, alpha: true,
    catatan: 'bingkai ukiran emas OVAL, lubang tengah transparan'
  },
  {
    keluaran: 'lingkar-sulur-emas.webp',
    sumber: 'CIRCLE.RECTANGLE FRAME ORNAMENT/ORNAME_1-removebg-preview.png',
    lebar: 420, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'lingkaran sulur emas halus — latar monogram tema gelap'
  },

  // --- aset tema ketiga eropa-mewah (Bordeaux) ---
  // Semuanya dipilih karena MAKNANYA di bagian tempat ia dipasang, bukan
  // karena bentuknya bagus. Dua tema sebelumnya sudah memakai habis empat
  // "ornamen bebas" yang ada; kalau Bordeaux memungut yang sama, tema
  // ketiga ini akan terbaca sebagai Noir Dore yang dicat merah.
  {
    keluaran: 'tirai-beludru-merah.webp',
    sumber: 'CORNER ORNAMENT/CORNER (8).png',
    lebar: 560, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'juntai tirai beludru merah — mahkota sampul & amplop Bordeaux'
  },
  {
    keluaran: 'sudut-sulur-krem.webp',
    sumber: 'CORNER ORNAMENT/CORNER (7).png',
    lebar: 420, mutu: 0.88, alpha: true,
    catatan: 'sulur emas krem mengalir — sudut lembar kertas, lebih ringan dari baroque'
  },
  {
    keluaran: 'bebas-anggur-merah.webp',
    sumber: 'FREE ORNAMENT/3940718419666726-removebg-preview.png',
    lebar: 300, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'dua gelas anggur MERAH bersulang — ikon Resepsi, sekaligus tanda tangan tema Bordeaux'
  },
  {
    keluaran: 'bebas-merpati-cincin.webp',
    sumber: 'FREE ORNAMENT/211174978693952-removebg-preview.png',
    lebar: 320, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'dua merpati mengangkat sepasang cincin — ikon Akad Nikah'
  },
  {
    keluaran: 'fleur-de-lis-emas.webp',
    sumber: 'FREE ORNAMENT/10625749120124463-removebg-preview.png',
    lebar: 200, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'fleur-de-lis emas — penanda tiap bagian Bordeaux (pengganti angka Romawi)'
  },
  {
    keluaran: 'bebas-dua-tangan.webp',
    sumber: 'FREE ORNAMENT/1125829606875863431-removebg-preview.png',
    lebar: 300, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'dua tangan saling meraih — bagian Pembuka'
  },
  {
    keluaran: 'bebas-kupu-emas.webp',
    sumber: 'FREE ORNAMENT/770045236280479891-removebg-preview.png',
    lebar: 340, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'kupu-kupu emas berhamburan naik — bagian Galeri'
  },
  {
    keluaran: 'mahkota-bunga-emas.webp',
    sumber: 'FREE ORNAMENT/957155727076148201-removebg-preview.png',
    lebar: 300, mutu: 0.9, alpha: true, pangkas: true,
    // Disiapkan untuk Bordeaux lalu TIDAK jadi dipakai: sesudah dilihat
    // hasilnya, mahkota ini bergaya gunungan/Jawa, bukan Eropa. Dibiarkan
    // di sini karena kategori "Adat Tradisional" nanti justru mencarinya.
    catatan: 'mahkota emas berbunga bergaya Jawa — untuk kategori Adat Tradisional, BUKAN eropa-mewah'
  },

  // --- aset kategori ISLAMI ---
  // Catatan yang menghemat waktu nanti: aset Islami di folder user
  // hampir semuanya BIRU NAVY, bukan emas. Ketiga bingkai di bawah
  // karena itu diwarnai ulang lewat `warnai` — jangan dicari padanan
  // emasnya di folder, tidak ada.
  {
    keluaran: 'arch-mihrab-emas.webp',
    sumber: 'FRAME ORNAMENT/997969598706653822-removebg-preview.png',
    lebar: 520, mutu: 0.9, alpha: true, pangkas: true,
    warnai: { gelap: '#7A5C1C', terang: '#E8CE90' },
    catatan: 'arch mihrab bermotif, sumbernya navy — bentuk pengatur tema Islami'
  },
  {
    keluaran: 'sudut-renda-islami.webp',
    sumber: 'FRAME ORNAMENT/984247693580936360-removebg-preview.png',
    lebar: 420, mutu: 0.88, alpha: true, pangkas: true,
    warnai: { gelap: '#7A5C1C', terang: '#E8CE90' },
    catatan: 'sudut renda geometris Islami, sumbernya navy — sudut sampul'
  },
  {
    keluaran: 'kubah-islami-emas.webp',
    sumber: 'FRAME ORNAMENT/427701295869465115-removebg-preview.png',
    lebar: 460, mutu: 0.88, alpha: true, pangkas: true,
    warnai: { gelap: '#7A5C1C', terang: '#E8CE90' },
    catatan: 'lengkung kubah bermotif titik, sumbernya navy — mahkota bagian'
  },
  {
    keluaran: 'latar-mihrab-lembut.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/ISLAMIC/292522938312851282.jpg',
    lebar: 700, mutu: 0.72,
    // Disiapkan untuk Nur Zamrud lalu tidak jadi dipakai: temanya
    // memakai jaring girih yang digambar SVG, dan dua latar bermotif
    // bertumpuk saling berebut. Dibiarkan karena tema Islami ke-2/ke-3
    // (yang tidak memakai girih) justru mencarinya. BUKAN aset yatim.
    catatan: 'siluet arch mihrab pada kertas bertekstur — cadangan untuk tema Islami berikutnya, belum dipakai'
  },
  {
    keluaran: 'segel-bulan-hijau.webp',
    sumber: 'WAX SEALS/WAX STAMPS (11).png',
    lebar: 340, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'segel lilin hijau tua bermotif bulan sabit & bintang'
  },
  {
    keluaran: 'lingkar-kaligrafi-emas.webp',
    sumber: 'CIRCLE.RECTANGLE FRAME ORNAMENT/Myriam_Campo_-removebg-preview.png',
    lebar: 420, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'lingkaran emas tipis berjuntai sapuan kaligrafis — latar monogram Islami'
  },

  // --- batch unduhan Pinterest, 2026-08-30 (tools/unduh-ornamen.js) ---
  // Sumbernya di subfolder "UNDUHAN CLAUDE". Lima di antaranya PNG
  // beralpha utuh (langsung `alpha:true`); tiga sisanya JPEG berlatar
  // putih sehingga butuh `hapusLatarPucat`.
  {
    keluaran: 'bintang-navy-emas.webp',
    sumber: 'UNDUHAN CLAUDE/bintang-navy-emas.png',
    lebar: 460, mutu: 0.9, alpha: true, hapusLatarPucat: true, pangkas: true,
    catatan: 'medali bintang delapan navy bertabur bintang, tepi emas — tanda tangan tema Islami navy'
  },
  {
    keluaran: 'bintang-hijau-emas.webp',
    sumber: 'UNDUHAN CLAUDE/bintang-hijau-emas.png',
    lebar: 460, mutu: 0.9, alpha: true, hapusLatarPucat: true, pangkas: true,
    catatan: 'medali bintang delapan hijau zamrud bertepi emas'
  },
  {
    keluaran: 'arch-mihrab-polos.webp',
    sumber: 'UNDUHAN CLAUDE/arch-mihrab-polos.png',
    lebar: 420, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'garis arch mihrab polos tanpa motif — lebih ringan dari arch-mihrab-emas'
  },
  {
    keluaran: 'tepi-kisi-emas.webp',
    sumber: 'UNDUHAN CLAUDE/tepi-kisi-emas.png',
    lebar: 420, mutu: 0.9, alpha: true, hapusLatarPucat: true, pangkas: true,
    catatan: 'tepi kisi geometris emas bertepi lengkung — pembatas bidang'
  },
  {
    keluaran: 'garis-islami-emas.webp',
    sumber: 'UNDUHAN CLAUDE/garis-islami-emas.jpg',
    lebar: 520, mutu: 0.9, alpha: true, hapusLatarPucat: true, pangkas: true,
    catatan: 'pembatas mendatar arabesque emas — kategori Islami belum punya pembatas sendiri'
  },
  {
    keluaran: 'lingkar-medali-emas.webp',
    sumber: 'UNDUHAN CLAUDE/lingkar-medali-emas.jpg',
    lebar: 420, mutu: 0.9, alpha: true, hapusLatarPucat: true, pangkas: true,
    catatan: 'medali lingkar emas bertengah kosong — bingkai monogram'
  },
  {
    keluaran: 'sudut-geometris-emas.webp',
    sumber: 'UNDUHAN CLAUDE/sudut-geometris-emas.jpg',
    lebar: 420, mutu: 0.88, alpha: true, hapusLatarPucat: true, pangkas: true,
    catatan: 'sudut kisi geometris emas — sudut sampul tema Islami'
  },

  // --- kategori CHINESE (unduhan Pinterest, 2026-08-30) ---
  {
    keluaran: 'xi-ganda-emas.webp',
    sumber: 'UNDUHAN CLAUDE/xi-ganda-emas.png',
    lebar: 420, mutu: 0.9, alpha: true, hapusLatarGelap: true, pangkas: true,
    catatan: 'aksara 囍 (shuangxi/kebahagiaan ganda) emas — lambang paling khas pernikahan Tionghoa'
  },
  {
    keluaran: 'awan-cina-emas.webp',
    sumber: 'UNDUHAN CLAUDE/awan-cina-emas.jpg',
    lebar: 560, mutu: 0.9, alpha: true, hapusLatarPucat: true, pangkas: true,
    catatan: 'motif awan (yun wen) emas mendatar — motif keberuntungan klasik Tionghoa'
  },
  {
    keluaran: 'lentera-cina-emas.webp',
    sumber: 'UNDUHAN CLAUDE/lentera-cina-emas.png',
    lebar: 300, mutu: 0.9, alpha: true, hapusLatarPucat: true, pangkas: true,
    catatan: 'lentera gantung emas berumbai — sumbernya cuma 360px, jangan dipakai lebih besar dari ~200px'
  },
  {
    keluaran: 'peoni-emas.webp',
    sumber: 'UNDUHAN CLAUDE/peoni-emas.jpg',
    lebar: 380, mutu: 0.9, alpha: true, hapusLatarPucat: true, pangkas: true,
    catatan: 'bunga peoni emas — bunga pernikahan Tionghoa, lambang kemakmuran'
  },
  {
    keluaran: 'garis-cina-emas.webp',
    sumber: 'UNDUHAN CLAUDE/garis-cina-emas.jpg',
    lebar: 520, mutu: 0.92, alpha: true, hapusPutih: true, pangkas: true,
    // hapusPutih, BUKAN hapusLatarPucat: garisnya sangat tipis dan
    // latarnya putih rata. hapusPutih mengurai balik campuran tintanya
    // sehingga garis tetap pekat; kunci kejenuhan akan memudarkannya.
    catatan: 'pembatas mendatar tipis bergaya Tionghoa'
  },
    {
    keluaran: 'lingkar-awan-emas.webp',
    sumber: 'UNDUHAN CLAUDE/lingkar-awan-emas.png',
    lebar: 420, mutu: 0.9, alpha: true, hapusLatarPucat: true, pangkas: true,
    catatan: 'lingkaran emas beraksen awan — bingkai monogram tema Tionghoa'
  },
  {
    keluaran: 'bingkai-merah-lentera.webp',
    sumber: 'UNDUHAN CLAUDE/bingkai-merah-lentera.jpg',
    lebar: 440, mutu: 0.9, alpha: true, hapusLatarPucat: true, pangkas: true,
    catatan: 'bingkai bundar merah bergantung lentera — merah pekat, aman dikunci kejenuhan'
  },

  // --- kategori ADAT TRADISIONAL ---
  // Semuanya dari folder user yang sudah lama ada tapi belum pernah
  // terpakai. Cek folder ini lebih dulu sebelum mengunduh apa pun untuk
  // kategori adat — isinya jauh lebih cocok daripada hasil pencarian.
  {
    keluaran: 'latar-wayang-pasangan.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/TRADITIONAL/download (5).jpg',
    lebar: 720, mutu: 0.74,
    // Nama berkas sumbernya TIDAK menggambarkan isinya sama sekali —
    // sudah salah sekali di sini. Selalu lihat hasilnya sebelum memberi
    // nama keluaran.
    catatan: 'siluet sepasang tokoh wayang berlatar jingga hangat'
  },
  {
    keluaran: 'latar-candi-bentar.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/TRADITIONAL/1096978421764286181.jpg',
    lebar: 720, mutu: 0.74,
    catatan: 'gerbang candi bentar Bali berlatar biru malam — sampul tema Bali'
  },
  {
    keluaran: 'latar-gunungan-emas.webp',
    sumber: 'BACKGROUND FULL ORNAMENT/TRADITIONAL/Gradient paper design with tribal puppet….jpg',
    lebar: 720, mutu: 0.74,
    catatan: 'sepasang gunungan wayang berlatar emas hangat berawan — sampul tema Jawa'
  },
  {
    keluaran: 'bebas-gunungan-emas.webp',
    sumber: 'FREE ORNAMENT/292311832084344705-removebg-preview.png',
    lebar: 320, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'gunungan wayang emas berlubang — lambang pembuka pertunjukan, ikon tema Jawa'
  },
  {
    keluaran: 'bebas-ornamen-bali.webp',
    sumber: 'FREE ORNAMENT/ornamen_bali-removebg-preview.png',
    lebar: 340, mutu: 0.9, alpha: true, pangkas: true,
    catatan: 'ornamen ukir Bali emas melingkar — ikon tema Bali'
  }
];

// ============================================================
// Server sementara untuk berkas sumber
// ============================================================
// Chrome tidak boleh membaca file:// dari halaman yang di-evaluate, dan
// berkas sumbernya di luar root server statis project — jadi alat ini
// menyajikan foldernya sendiri selama proses berjalan.
// Server ini juga menyajikan satu halaman kosong di "/", dan Chrome
// DINAVIGASI ke sana lebih dulu. Alasannya bukan kerapian: dari halaman
// about:blank, gambar dari server ini terhitung lintas-origin, canvas-nya
// jadi tercemar, dan toDataURL() melempar SecurityError. Dengan halaman
// dan gambar berasal dari origin yang sama, persoalan itu tidak ada.
function nyalakanServer(akar) {
  const TIPE = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif'
  };
  return new Promise((res, rej) => {
    const srv = http.createServer((req, resp) => {
      const rel = decodeURIComponent(req.url.split('?')[0].slice(1));
      if (rel === '') {
        resp.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        resp.end('<!doctype html><title>siapkan-ornamen</title>');
        return;
      }
      const p = path.join(akar, rel);
      if (!p.startsWith(akar)) { resp.writeHead(403); resp.end(); return; }
      fs.readFile(p, (err, data) => {
        if (err) { resp.writeHead(404); resp.end(); return; }
        resp.writeHead(200, {
          'content-type': TIPE[path.extname(p).toLowerCase()] || 'application/octet-stream',
          'access-control-allow-origin': '*'
        });
        resp.end(data);
      });
    });
    srv.on('error', rej);
    srv.listen(0, '127.0.0.1', () => res({ srv, port: srv.address().port }));
  });
}

async function cdp() {
  const r = await fetch(CDP + '/json/new?about:blank', { method: 'PUT' });
  const t = await r.json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0;
  const nunggu = new Map();
  await new Promise(res => (ws.onopen = res));
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && nunggu.has(m.id)) { nunggu.get(m.id)(m); nunggu.delete(m.id); }
  };
  const kirim = (metode, params) => new Promise(res => {
    const n = ++id; nunggu.set(n, res);
    ws.send(JSON.stringify({ id: n, method: metode, params: params || {} }));
  });
  return { kirim, tutup: async () => { ws.close(); await fetch(CDP + '/json/close/' + t.id); } };
}

// Dijalankan di dalam Chrome: memuat gambar, menggambarnya ke canvas pada
// ukuran target, lalu mengembalikan hasil WebP sebagai base64.
function skripUbah(url, lebarTarget, mutu, alpha, warnai, hapusPutih, pangkas, hapusLatarPucat, hapusLatarGelap) {
  return `(async () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('gambar gagal dimuat'));
      img.src = ${JSON.stringify(url)};
    });
    // Tidak pernah memperbesar: memperbesar cuma menambah berat tanpa
    // menambah detail, dan pada ornamen justru memperlihatkan tepi kasar.
    const skala = Math.min(1, ${lebarTarget} / img.naturalWidth);
    let w = Math.round(img.naturalWidth * skala);
    let h = Math.round(img.naturalHeight * skala);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    // Aset tak-transparan diberi alas putih dulu: tanpa itu, JPEG sumber
    // yang punya tepi tipis bisa menghasilkan pinggiran gelap di WebP.
    if (!${!!alpha} && !${!!hapusPutih} && !${!!hapusLatarPucat} && !${!!hapusLatarGelap}) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
    g.drawImage(img, 0, 0, w, h);
    // Membuang LATAR PUTIH. Seluruh berkas LINE ORNAMENT berupa JPG
    // dengan latar putih pekat — dipakai apa adanya, tiap pembatas akan
    // jadi balok putih di atas kertas krem.
    //
    // Bukan sekadar "putih jadi transparan": tinta pada JPG sudah
    // TERCAMPUR dengan latar putihnya, jadi kalau hanya alpha yang
    // diubah, garisnya ikut memudar dan tepinya berkabut. Di sini
    // campurannya diurai balik — alpha diambil dari seberapa jauh
    // piksel itu dari putih, lalu warna aslinya dipulihkan dengan
    // membagi balik proporsi campurannya.
    if (${JSON.stringify(!!hapusPutih)}) {
      const dp = g.getImageData(0, 0, w, h);
      const q = dp.data;
      for (let i = 0; i < q.length; i += 4) {
        const kanalTerendah = Math.min(q[i], q[i+1], q[i+2]);
        const a = 1 - (kanalTerendah / 255);
        if (a < 0.03) { q[i+3] = 0; continue; }
        for (let k = 0; k < 3; k++) {
          const asli = (q[i+k] - 255 * (1 - a)) / a;
          q[i+k] = Math.max(0, Math.min(255, Math.round(asli)));
        }
        q[i+3] = Math.round(Math.min(1, a * 1.15) * 255);
      }
      g.putImageData(dp, 0, 0);
    }

    // --- hapusLatarPucat: kunci berbasis KEJENUHAN, bukan kecerahan ---
    // Untuk berkas hasil unduhan Pinterest (lihat tools/unduh-ornamen.js).
    // Bedanya dari hapusPutih di atas, dan kenapa keduanya perlu ada:
    //
    //   hapusPutih      -> latar PUTIH RATA. Ia mengurai balik campuran
    //                      tinta dengan putih, jadi garis tipis tetap
    //                      pekat dan tepinya tidak berkabut.
    //   hapusLatarPucat -> latar PUCAT TAPI TIDAK RATA, khususnya papan
    //                      catur transparansi yang ikut terpanggang saat
    //                      Pinterest menyimpan ulang gambar jadi JPEG.
    //
    // Papan catur itu putih DAN abu-muda berselang-seling. Kunci berbasis
    // kecerahan tidak bisa memisahkannya dari ornamen tanpa ikut memakan
    // sorotan terang di dalam ornamennya. Kunci kejenuhan bisa: ornamennya
    // berwarna (emas/hijau/biru), latarnya netral.
    //
    // Ambangnya sengaja TAJAM. Versi pertama memakai ramp landai dan kotak
    // abu-muda (terang ~0,92) masih menyisakan alpha ~65 — tidak terlihat
    // di atas kertas krem, tapi muncul jelas sebagai hantu kotak-kotak
    // begitu ornamennya dipakai di tema gelap. Periksa hasilnya di latar
    // GELAP, bukan cuma di latar terang.
    if (${JSON.stringify(!!hapusLatarPucat)}) {
      const dq = g.getImageData(0, 0, w, h);
      const u = dq.data;
      for (let i = 0; i < u.length; i += 4) {
        const maks = Math.max(u[i], u[i+1], u[i+2]);
        const min  = Math.min(u[i], u[i+1], u[i+2]);
        const jenuh = maks === 0 ? 0 : (maks - min) / maks;
        const terang = maks / 255;
        if (jenuh < 0.18) {
          const t = (0.88 - terang) / 0.28;   // 1 di 0,60; 0 di 0,88
          const s = jenuh / 0.18;
          u[i+3] = Math.round(255 * Math.max(0, Math.min(1, Math.max(t, s * s))));
        }
      }
      g.putImageData(dq, 0, 0);
    }

    // --- hapusLatarGelap: cermin dari hapusLatarPucat ---
    // Untuk ornamen emas/terang yang sumbernya di atas latar HITAM.
    // Kunci kejenuhan yang sama, hanya sisi kecerahannya dibalik: yang
    // dibuang piksel GELAP dan tak berwarna, bukan yang terang.
    //
    // Perlu ada karena hapusLatarPucat tidak bisa dipakai di sini sama
    // sekali — hitam punya kecerahan RENDAH, jadi rumus di atas justru
    // menandainya OPAK. Sudah terjadi: dua ornamen Tionghoa keluar
    // dengan kotak hitam pekat mengelilinginya, dan itu baru kelihatan
    // setelah hasilnya dilihat, bukan dari log yang semuanya "berhasil".
    if (${JSON.stringify(!!hapusLatarGelap)}) {
      const dr = g.getImageData(0, 0, w, h);
      const v = dr.data;
      for (let i = 0; i < v.length; i += 4) {
        const maks = Math.max(v[i], v[i+1], v[i+2]);
        const min  = Math.min(v[i], v[i+1], v[i+2]);
        const jenuh = maks === 0 ? 0 : (maks - min) / maks;
        const terang = maks / 255;
        if (jenuh < 0.20) {
          const t = (terang - 0.12) / 0.28;   // 0 di 0,12; 1 di 0,40
          const s = jenuh / 0.20;
          v[i+3] = Math.round(255 * Math.max(0, Math.min(1, Math.max(t, s * s))));
        }
      }
      g.putImageData(dr, 0, 0);
    }
    // Pewarnaan ulang. Sebagian aset bagus bentuknya tapi salah
    // warnanya untuk tema yang dituju — bingkai klasik tipis itu biru
    // navy, padahal temanya emas. Diwarnai DI SINI, bukan lewat rantai
    // filter CSS saat runtime: hasilnya pasti, tidak membebani HP tamu,
    // dan tidak bergantung pada dukungan filter di browser mana pun.
    //
    // Cara kerjanya: alpha DIPERTAHANKAN apa adanya — itu yang menyimpan
    // bentuk dan tepi halus garisnya. Yang diganti cuma RGB, jadi
    // gradasi dari gelap ke terang mengikuti KEPEKATAN tinta aslinya:
    // garis tebal jadi emas tua, sapuan tipis jadi emas muda. Mengganti
    // RGB dengan satu warna rata membuat hasilnya terlihat seperti
    // stiker, bukan seperti tinta.
    if (${JSON.stringify(!!warnai)}) {
      const W = ${JSON.stringify(warnai || {})};
      const hx = (v) => [parseInt(v.slice(1,3),16), parseInt(v.slice(3,5),16), parseInt(v.slice(5,7),16)];
      const cGelap = hx(W.gelap), cTerang = hx(W.terang);
      const dat = g.getImageData(0, 0, w, h);
      const px = dat.data;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i+3] === 0) continue;
        const L = (0.299*px[i] + 0.587*px[i+1] + 0.114*px[i+2]) / 255;
        const t = 1 - L;
        px[i]   = Math.round(cTerang[0] + (cGelap[0]-cTerang[0]) * t);
        px[i+1] = Math.round(cTerang[1] + (cGelap[1]-cTerang[1]) * t);
        px[i+2] = Math.round(cTerang[2] + (cGelap[2]-cTerang[2]) * t);
      }
      g.putImageData(dat, 0, 0);
    }
    // Membuang MARGIN TRANSPARAN di keempat sisi.
    //
    // Kenapa perlu: ornamen garis pembatas datang sebagai gambar persegi
    // yang sebagian besar isinya ruang kosong — garisnya cuma sejalur
    // tipis di tengah. Dipakai apa adanya dengan background-size:contain,
    // yang menentukan skalanya adalah TINGGI kotak, jadi pembatas selebar
    // 250px menyusut jadi sekitar 60px dan nyaris tidak terlihat.
    // Sesudah dipangkas, perbandingan gambarnya menjadi benar-benar
    // memanjang dan contain memakai lebarnya.
    if (${!!pangkas}) {
      const dq = g.getImageData(0, 0, w, h);
      const qq = dq.data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (qq[((y * w) + x) * 4 + 3] > 8) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      if (x1 >= x0 && y1 >= y0) {
        const lw = x1 - x0 + 1, lh = y1 - y0 + 1;
        const potong = g.getImageData(x0, y0, lw, lh);
        c.width = lw; c.height = lh;
        g.putImageData(potong, 0, 0);
        w = lw; h = lh;
      }
    }
    const url2 = c.toDataURL('image/webp', ${mutu});
    if (url2.indexOf('data:image/webp') !== 0) throw new Error('Chrome ini tidak menulis WebP');
    return JSON.stringify({ w: w, h: h, b64: url2.split(',')[1] });
  })()`;
}

(async () => {
  const arg = process.argv.slice(2);
  const paksa = arg.includes('--paksa');
  const diminta = arg.filter(a => !a.startsWith('--'));

  if (!fs.existsSync(SUMBER)) {
    console.error('Folder aset mentah tidak ditemukan:\n  ' + SUMBER);
    process.exit(1);
  }
  try { await fetch(CDP + '/json/version'); } catch (e) {
    console.error('Chrome dengan --remote-debugging-port=9222 tidak ditemukan.');
    process.exit(1);
  }
  if (!fs.existsSync(TUJUAN_DIR)) fs.mkdirSync(TUJUAN_DIR, { recursive: true });

  const daftar = diminta.length
    ? ORNAMEN.filter(o => diminta.includes(o.keluaran) || diminta.includes(o.keluaran.replace(/\.webp$/, '')))
    : ORNAMEN;
  if (!daftar.length) {
    console.error('Tidak ada aset yang cocok. Tersedia:\n  ' + ORNAMEN.map(o => o.keluaran).join('\n  '));
    process.exit(1);
  }

  const { srv, port } = await nyalakanServer(SUMBER);
  const { kirim, tutup } = await cdp();
  await kirim('Page.enable');
  await kirim('Runtime.enable');
  // Navigasi dulu ke server sementara supaya gambar jadi satu origin
  // dengan halamannya — lihat catatan di nyalakanServer().
  await kirim('Page.navigate', { url: 'http://127.0.0.1:' + port + '/' });
  await new Promise(r => setTimeout(r, 500));

  let totalAsli = 0, totalBaru = 0, gagal = 0;
  for (const o of daftar) {
    const asli = path.join(SUMBER, o.sumber);
    const tujuan = path.join(TUJUAN_DIR, o.keluaran);
    if (!fs.existsSync(asli)) {
      console.log('  ! ' + o.keluaran + ' — sumber tidak ada: ' + o.sumber);
      gagal++; continue;
    }
    if (fs.existsSync(tujuan) && !paksa) {
      console.log('  = ' + o.keluaran + ' (sudah ada, lewati — pakai --paksa untuk menulis ulang)');
      continue;
    }
    const url = 'http://127.0.0.1:' + port + '/' + o.sumber.split('/').map(encodeURIComponent).join('/');
    const res = await kirim('Runtime.evaluate', {
      expression: skripUbah(url, o.lebar, o.mutu, o.alpha, o.warnai, o.hapusPutih, o.pangkas, o.hapusLatarPucat, o.hapusLatarGelap),
      awaitPromise: true, returnByValue: true
    });
    if (res.result && res.result.exceptionDetails) {
      const d = res.result.exceptionDetails;
      console.log('  ! ' + o.keluaran + ' — ' + ((d.exception || {}).description || d.text));
      gagal++; continue;
    }
    const info = JSON.parse(res.result.result.value);
    const buf = Buffer.from(info.b64, 'base64');
    fs.writeFileSync(tujuan, buf);
    const kbAsli = fs.statSync(asli).size / 1024;
    const kbBaru = buf.length / 1024;
    totalAsli += kbAsli; totalBaru += kbBaru;
    console.log('  ' + o.keluaran.padEnd(30) +
      info.w + 'x' + info.h +
      '  ' + Math.round(kbAsli) + ' KB -> ' + Math.round(kbBaru) + ' KB' +
      '  (-' + Math.round((1 - kbBaru / kbAsli) * 100) + '%)');
  }

  await tutup();
  srv.close();

  if (totalAsli) {
    console.log('\nTotal: ' + Math.round(totalAsli) + ' KB -> ' + Math.round(totalBaru) + ' KB' +
                '  (-' + Math.round((1 - totalBaru / totalAsli) * 100) + '%)');
  }
  console.log(gagal ? gagal + ' aset GAGAL.' : 'Selesai.');
  process.exit(gagal ? 1 : 0);
})();
