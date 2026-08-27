// Panel Admin — view "admin" di dalam app.html.
//
// Dulu ini halaman terpisah (admin.html). Digabung ke dashboard atas
// permintaan pemilik: dua halaman berarti dua kerangka, dua navigasi, dan
// dua tempat yang harus diperbarui setiap kali ada perubahan.
//
// DUA LAPIS YANG BERBEDA SIFATNYA — jangan tertukar:
//
//   1. KUNCI KATA SANDI di bawah ini adalah kunci TAMPILAN. Gunanya satu:
//      sesi yang sudah masuk saja tidak cukup untuk membuka data seluruh
//      pelanggan, jadi laptop yang ditinggal terbuka tidak langsung
//      membocorkan semuanya. Kuncinya disimpan di sessionStorage — hilang
//      begitu tab ditutup.
//
//   2. YANG BENAR-BENAR MENJAGA DATA adalah pemeriksaan is_admin(auth.uid())
//      di dalam tiap fungsi database (admin_ringkasan, admin_daftar_undangan,
//      admin_daftar_pembayaran). Sudah diuji sebagai anonim lewat REST
//      publik: ketiganya membalas 42501, bukan data.
//
// Kunci nomor 1 TIDAK menggantikan nomor 2. Orang yang memegang token sesi
// admin tetap bisa memanggil RPC-nya langsung tanpa lewat layar ini —
// yang dicegah kunci ini adalah orang yang duduk di depan layarmu.
window.KU_ADMIN = (function () {

  var KUNCI_SESSION = 'ku-admin-terbuka';
  // Umur kunci. Cukup panjang untuk sekali kerja, cukup pendek supaya tab
  // yang ditinggal seharian tidak tetap terbuka.
  var UMUR_MS = 30 * 60 * 1000;

  var el = {};
  function ambil(id) { return document.getElementById(id); }

  function siapkan() {
    if (el.siap) return;
    el = {
      siap: true,
      kunci: ambil('adminKunci'),
      form: ambil('adminKunciForm'),
      email: ambil('adminKunciEmail'),
      sandi: ambil('adminKunciSandi'),
      lihat: ambil('adminKunciLihat'),
      tombol: ambil('adminKunciBtn'),
      kunciMsg: ambil('adminKunciMsg'),
      isi: ambil('adminIsi'),
      msg: ambil('adminMsg'),
      sub: ambil('adminSub'),
      tiles: ambil('adminTiles'),
      barisUndangan: ambil('barisUndangan'),
      barisBayar: ambil('barisBayar'),
      hitungUndangan: ambil('hitungUndangan'),
      hitungBayar: ambil('hitungBayar'),
      muatUlang: ambil('muatUlangBtn'),
      kunciLagi: ambil('adminKunciLagiBtn')
    };

    if (el.form) el.form.addEventListener('submit', bukaKunci);
    if (el.muatUlang) el.muatUlang.addEventListener('click', muat);
    if (el.kunciLagi) el.kunciLagi.addEventListener('click', kunciLagi);
    // Pola tombol mata yang sama dengan modal masuk di index.html —
    // termasuk class .is-visible yang menukar ikon mata/mata-dicoret.
    // (Penangan .pw-toggle di assets/app.js hanya hidup di index.html,
    // jadi tidak ada yang bentrok di sini.)
    if (el.lihat) el.lihat.addEventListener('click', function () {
      var buka = el.sandi.type === 'password';
      el.sandi.type = buka ? 'text' : 'password';
      el.lihat.classList.toggle('is-visible', buka);
      el.lihat.setAttribute('aria-pressed', buka ? 'true' : 'false');
      el.lihat.setAttribute('aria-label', buka ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    });
  }

  function pesan(target, teks, tipe) {
    if (!target) return;
    target.textContent = teks || '';
    target.className = 'workspace-msg' + (tipe ? ' ' + tipe : '');
  }

  function terbuka() {
    try {
      var v = sessionStorage.getItem(KUNCI_SESSION);
      if (!v) return false;
      var data = JSON.parse(v);
      // Kunci diikat ke email yang membukanya. Kalau akunnya berganti di
      // tab yang sama, kunci lama tidak boleh ikut berlaku.
      var sesi = KU.getSession();
      var emailSekarang = sesi && sesi.user && sesi.user.email;
      if (!emailSekarang || data.email !== emailSekarang) return false;
      return Date.now() - data.pada < UMUR_MS;
    } catch (e) { return false; }
  }

  function tandaiTerbuka(email) {
    try {
      sessionStorage.setItem(KUNCI_SESSION, JSON.stringify({ email: email, pada: Date.now() }));
    } catch (e) {}
  }

  function kunciLagi() {
    try { sessionStorage.removeItem(KUNCI_SESSION); } catch (e) {}
    if (el.isi) el.isi.hidden = true;
    if (el.kunci) el.kunci.hidden = false;
    if (el.sandi) el.sandi.value = '';
    pesan(el.msg, '');
    pesan(el.kunciMsg, 'Panel dikunci lagi.');
  }

  async function bukaKunci(e) {
    e.preventDefault();
    var sesi = KU.getSession();
    if (!sesi) { pesan(el.kunciMsg, 'Sesi login sudah berakhir. Muat ulang halaman.', 'err'); return; }

    var emailDiisi = (el.email.value || '').trim().toLowerCase();
    var emailSesi = String((sesi.user && sesi.user.email) || '').toLowerCase();

    // Emailnya WAJIB email akun yang sedang masuk. Tanpa pemeriksaan ini,
    // mengisi email lain akan membuat signInWithPassword di bawah berpindah
    // akun diam-diam — bukan mengonfirmasi, melainkan login sebagai orang
    // lain di tab yang sedang dipakai.
    if (!emailDiisi || emailDiisi !== emailSesi) {
      pesan(el.kunciMsg, 'Email itu bukan email akun yang sedang masuk.', 'err');
      return;
    }

    el.tombol.disabled = true;
    pesan(el.kunciMsg, 'Memeriksa...');

    var res = await KU.sb.auth.signInWithPassword({ email: emailSesi, password: el.sandi.value });
    el.tombol.disabled = false;

    if (res.error) {
      pesan(el.kunciMsg, 'Kata sandi salah.', 'err');
      el.sandi.value = '';
      el.sandi.focus();
      return;
    }

    // Kata sandi terbukti benar. Kolomnya dikosongkan segera — tidak ada
    // alasan membiarkannya tertinggal di DOM setelah dipakai.
    el.sandi.value = '';
    tandaiTerbuka(emailSesi);
    pesan(el.kunciMsg, '');
    el.kunci.hidden = true;
    el.isi.hidden = false;
    muat();
  }

  // ---------------- perender ----------------

  function tanggal(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()];
    return d.getDate() + ' ' + bulan + ' ' + String(d.getFullYear()).slice(2) + ', ' +
      ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2);
  }

  var LABEL_METODE = {
    qris: 'QRIS', gopay: 'GoPay', shopeepay: 'ShopeePay',
    bank_transfer: 'Transfer bank', echannel: 'Mandiri Bill',
    credit_card: 'Kartu', cstore: 'Minimarket'
  };

  var LABEL_BAYAR = {
    paid: { teks: 'Lunas', kelas: 'ok' },
    pending: { teks: 'Menunggu', kelas: 'warn' },
    failed: { teks: 'Gagal', kelas: 'err' },
    expired: { teks: 'Kedaluwarsa', kelas: '' }
  };

  // Tagihan "menunggu" yang sudah lewat kedaluwarsa sebenarnya sudah mati.
  // Kalau ditampilkan apa adanya, panel ini menghitung tagihan mati sebagai
  // pesanan yang masih berjalan. Aturannya sama dengan di dashboard.
  function statusBayarTampil(r) {
    if (r.status === 'pending' && r.kedaluwarsa && new Date(r.kedaluwarsa).getTime() <= Date.now()) return 'expired';
    return r.status;
  }

  function sel(teks, kelas) {
    var td = document.createElement('td');
    if (kelas) td.className = kelas;
    td.textContent = (teks == null || teks === '') ? '—' : String(teks);
    return td;
  }

  function pil(teks, kelas) {
    var td = document.createElement('td');
    var s = document.createElement('span');
    s.className = 'admin-pil ' + (kelas || '');
    s.textContent = teks;
    td.appendChild(s);
    return td;
  }

  function renderTiles(r) {
    var kartu = [
      { label: 'Pendapatan', nilai: 'Rp' + window.formatRupiah(r.pendapatan || 0), utama: true },
      { label: 'Pembayaran lunas', nilai: r.bayar_lunas },
      { label: 'Menunggu bayar', nilai: r.bayar_menunggu },
      { label: 'Undangan aktif', nilai: r.undangan_aktif },
      { label: 'Draf', nilai: r.undangan_draf },
      { label: 'Pengguna', nilai: r.pengguna },
      { label: 'Tamu terdaftar', nilai: r.tamu },
      { label: 'Konfirmasi hadir', nilai: r.rsvp },
      { label: 'Ucapan', nilai: r.ucapan },
      { label: 'Tanda kasih', nilai: r.hadiah }
    ];
    el.tiles.innerHTML = '';
    kartu.forEach(function (k) {
      var d = document.createElement('div');
      d.className = 'admin-tile' + (k.utama ? ' utama' : '');
      var n = document.createElement('div');
      n.className = 'admin-tile-nilai';
      n.textContent = k.nilai;
      var l = document.createElement('div');
      l.className = 'admin-tile-label';
      l.textContent = k.label;
      d.append(n, l);
      el.tiles.appendChild(d);
    });
  }

  function renderUndangan(daftar) {
    el.barisUndangan.innerHTML = '';
    el.hitungUndangan.textContent = daftar.length + ' baris';
    daftar.forEach(function (u) {
      var tr = document.createElement('tr');
      tr.append(
        sel(u.pasangan || '(belum diisi)', 'admin-kuat'),
        pil(u.status === 'aktif' ? 'Aktif' : 'Draf', u.status === 'aktif' ? 'ok' : ''),
        sel(u.tema),
        pil(u.sudah_dibayar ? 'Lunas' : 'Belum', u.sudah_dibayar ? 'ok' : 'warn'),
        sel(u.jml_tamu), sel(u.jml_rsvp), sel(u.jml_ucapan),
        sel(u.pemilik, 'admin-lirih'),
        sel(tanggal(u.dibuat), 'admin-lirih')
      );
      var aksi = document.createElement('td');
      if (u.status === 'aktif' && u.slug) {
        var a = document.createElement('a');
        a.className = 'btn btn-ghost btn-sm';
        a.href = '/u/' + u.slug;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Buka';
        aksi.appendChild(a);
      }
      tr.appendChild(aksi);
      el.barisUndangan.appendChild(tr);
    });
  }

  function renderBayar(daftar) {
    el.barisBayar.innerHTML = '';
    el.hitungBayar.textContent = daftar.length + ' baris';
    daftar.forEach(function (p) {
      var st = statusBayarTampil(p);
      var label = LABEL_BAYAR[st] || { teks: st, kelas: '' };
      var tr = document.createElement('tr');
      tr.append(
        sel(p.order_id, 'admin-mono'),
        sel('Rp' + window.formatRupiah(p.jumlah), 'admin-kuat'),
        pil(label.teks, label.kelas),
        sel(p.metode ? (LABEL_METODE[p.metode] || p.metode) : null),
        sel(p.pasangan || '(belum diisi)'),
        sel(p.pemilik, 'admin-lirih'),
        sel(tanggal(p.dibuat), 'admin-lirih'),
        sel(tanggal(p.lunas_pada), 'admin-lirih')
      );
      el.barisBayar.appendChild(tr);
    });
  }

  async function muat() {
    pesan(el.msg, 'Memuat data...');
    var hasil = await Promise.all([
      KU.sb.rpc('admin_ringkasan'),
      KU.sb.rpc('admin_daftar_undangan'),
      KU.sb.rpc('admin_daftar_pembayaran')
    ]);

    var gagal = hasil.filter(function (h) { return h.error; })[0];
    if (gagal) {
      // 42501 = database menolak karena bukan admin. Dibedakan dari
      // gangguan biasa: yang satu berarti "kamu memang tidak berhak",
      // yang lain berarti "coba lagi".
      if (gagal.error.code === '42501') {
        pesan(el.msg, 'Akun ini bukan admin, jadi panel ini tidak bisa dibuka.', 'err');
        el.isi.hidden = true;
        return;
      }
      pesan(el.msg, 'Gagal memuat data: ' + gagal.error.message, 'err');
      return;
    }

    renderTiles(hasil[0].data || {});
    renderUndangan(hasil[1].data || []);
    renderBayar(hasil[2].data || []);

    var sesi = KU.getSession();
    el.sub.textContent = 'Masuk sebagai ' + ((sesi && sesi.user && sesi.user.email) || 'admin') +
      ' - diperbarui ' + tanggal(new Date().toISOString());
    pesan(el.msg, '');
  }

  // Dipanggil dashboard.js tiap kali view "admin" ditampilkan.
  function buka() {
    siapkan();
    if (terbuka()) {
      el.kunci.hidden = true;
      el.isi.hidden = false;
      muat();
    } else {
      el.isi.hidden = true;
      el.kunci.hidden = false;
      pesan(el.kunciMsg, '');
      // Email diisikan otomatis; yang harus diingat orangnya cuma kata
      // sandinya. Tetap wajib cocok dengan sesi yang sedang berjalan.
      var sesi = KU.getSession();
      if (el.email && sesi && sesi.user) el.email.value = sesi.user.email || '';
      if (el.sandi) el.sandi.value = '';
    }
  }

  return { buka: buka, kunciLagi: kunciLagi };
})();
