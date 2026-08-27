// Katalog Paket Harga — satu-satunya sumber data harga & fitur paket,
// dipakai bareng oleh section Harga di halaman depan (index.html, lewat
// assets/app.js) dan tab Harga di dashboard (app.html, lewat
// assets/dashboard.js). Sama seperti window.THEME_TEMPLATES dipakai
// bareng untuk katalog tema (lihat assets/theme-templates.js) — ubah
// harga atau daftar fitur di sini saja, jangan tulis ulang di kedua
// halaman.
//
// "tersedia: true" cuma untuk paket yang benar-benar bisa dibeli sekarang.
// Midtrans sudah tersambung dan gerbang pembayarannya menyala, jadi paket
// bertanda tersedia benar-benar akan menagih.
// Paket lain ditandai "Segera Hadir" dan tombolnya nonaktif supaya
// tidak menjual sesuatu yang belum benar-benar ada.
window.PRICING_PLANS = {
  satuan: [
    {
      id: 'standar',
      nama: 'Standar',
      deskripsi: 'Semua yang dibutuhkan untuk satu acara',
      harga: 49000,
      tersedia: true,
      fitur: [
        'Undangan digital, pilihan 3 desain',
        'Pilihan palet warna',
        'Foto mempelai & galeri foto',
        'Hitung mundur hari-H',
        'Peta lokasi acara',
        'Konfirmasi kehadiran (RSVP)',
        'Ucapan & doa dari tamu',
        'Informasi tanda kasih',
        'Link pribadi yang bisa dibagikan'
      ]
    },
    {
      id: 'pro',
      nama: 'Pro',
      deskripsi: 'Untuk yang ingin tampil lebih personal',
      harga: 89000,
      tersedia: false,
      fitur: [
        'Semua fitur Standar',
        'Tanpa watermark Kartu Undangan',
        'Musik latar undangan',
        'Link personal per tamu',
        'Dukungan prioritas via WhatsApp'
      ]
    },
    {
      id: 'premium',
      nama: 'Premium',
      deskripsi: 'Semua fitur terbuka, tanpa batas',
      harga: 139000,
      tersedia: false,
      fitur: [
        'Semua fitur Pro',
        'Galeri foto tanpa batas',
        'Custom font & warna tema',
        'Cerita perjalanan kalian (love story)',
        'Link streaming / video acara'
      ]
    }
  ],
  berlangganan: [
    {
      id: 'sub-1bulan',
      nama: '1 Bulan',
      deskripsi: 'Untuk coba-coba dulu skala kecil',
      harga: 150000,
      per: '/bulan',
      tersedia: false,
      fitur: ['Semua fitur Premium', 'Undangan tanpa batas jumlah', 'Custom domain', 'Export undangan cetak']
    },
    {
      id: 'sub-6bulan',
      nama: '6 Bulan',
      deskripsi: 'Paling hemat untuk WO yang aktif',
      harga: 750000,
      per: '/6 bulan',
      tersedia: false,
      fitur: ['Semua fitur Premium', 'Undangan tanpa batas jumlah', 'Custom domain', 'Export undangan cetak']
    },
    {
      id: 'sub-1tahun',
      nama: '1 Tahun',
      deskripsi: 'Harga per bulan paling murah',
      harga: 1450000,
      per: '/tahun',
      tersedia: false,
      fitur: ['Semua fitur Premium', 'Undangan tanpa batas jumlah', 'Custom domain', 'Export undangan cetak']
    }
  ]
};

window.formatRupiah = function formatRupiah(n){
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// DOM untuk satu kartu harga (dipakai identik di index.html & app.html
// lewat CSS .price-card yang sama). Paket tersedia=true diberi border
// aksen tanpa pita — tombolnya sendiri sudah cukup menandakan "ini yang
// bisa dibeli". Paket tersedia=false diberi pita "Segera Hadir" dan
// tombol nonaktif, supaya tidak ada yang mengira bisa langsung bayar.
//
// renderAvailableAction(plan) opsional: dipanggil HANYA untuk paket
// yang tersedia, mengembalikan elemen tombol/link aksinya sendiri —
// index.html dan dashboard arahkan tombol ini ke tempat berbeda
// (lihat assets/app.js & assets/dashboard.js), jadi tidak dipusatkan
// di sini.
window.renderPriceCard = function renderPriceCard(plan, renderAvailableAction){
  var card = document.createElement('div');
  card.className = 'price-card' + (plan.tersedia ? ' popular' : ' soon');

  if (!plan.tersedia) {
    var badge = document.createElement('span');
    badge.className = 'pop-badge badge-soon';
    badge.textContent = 'Segera Hadir';
    card.appendChild(badge);
  }

  var name = document.createElement('div');
  name.className = 'tier-name';
  name.textContent = plan.nama;

  var desc = document.createElement('p');
  desc.className = 'tier-desc';
  desc.textContent = plan.deskripsi;

  var amount = document.createElement('div');
  amount.className = 'price-amount';
  var cur = document.createElement('span');
  cur.className = 'cur';
  cur.textContent = 'Rp';
  var num = document.createElement('span');
  num.className = 'num';
  num.textContent = window.formatRupiah(plan.harga);
  amount.append(cur, num);
  if (plan.per) {
    var per = document.createElement('span');
    per.className = 'per';
    per.textContent = plan.per;
    amount.appendChild(per);
  }

  var featList = document.createElement('ul');
  featList.className = 'feat-list';
  plan.fitur.forEach(function(text){
    var li = document.createElement('li');
    var icon = document.createElement('span');
    icon.className = 'ico-yes';
    icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    li.append(icon, document.createTextNode(text));
    featList.appendChild(li);
  });

  var action;
  if (plan.tersedia && renderAvailableAction) {
    action = renderAvailableAction(plan);
  } else {
    action = document.createElement('button');
    action.type = 'button';
    action.className = 'btn btn-ghost btn-block';
    action.disabled = true;
    action.textContent = 'Segera Hadir';
  }

  card.append(name, desc, amount, featList, action);
  return card;
};
