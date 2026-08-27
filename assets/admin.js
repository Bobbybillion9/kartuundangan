// Panel Admin (admin.html).
//
// Halaman ini TIDAK menjaga dirinya sendiri. Yang menjaga data adalah
// pemeriksaan is_admin(auth.uid()) di dalam tiap fungsi database yang
// dipanggil di bawah — sudah diuji: dipanggil sebagai anonim lewat REST
// publik, ketiganya membalas 42501 "Akses ditolak", bukan data.
// Pengalihan di sini hanya kenyamanan.
(function () {

  var adminMsg = document.getElementById('adminMsg');
  var adminIsi = document.getElementById('adminIsi');
  var adminSub = document.getElementById('adminSub');
  var adminTiles = document.getElementById('adminTiles');
  var barisUndangan = document.getElementById('barisUndangan');
  var barisBayar = document.getElementById('barisBayar');
  var hitungUndangan = document.getElementById('hitungUndangan');
  var hitungBayar = document.getElementById('hitungBayar');
  var muatUlangBtn = document.getElementById('muatUlangBtn');

  function pesan(teks, tipe) {
    if (!adminMsg) return;
    adminMsg.textContent = teks || '';
    adminMsg.className = 'workspace-msg' + (tipe ? ' ' + tipe : '');
  }

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

  function sel(teks, kelas) {
    var td = document.createElement('td');
    if (kelas) td.className = kelas;
    td.textContent = teks == null || teks === '' ? '—' : String(teks);
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

  // Baris pembayaran "menunggu" yang sudah lewat kedaluwarsa sebenarnya
  // sudah mati. Dihitung di sini, sama seperti di dashboard — kalau
  // ditampilkan apa adanya, panel ini akan menghitung tagihan mati
  // sebagai pesanan yang masih berjalan.
  function statusBayarTampil(r) {
    if (r.status === 'pending' && r.kedaluwarsa && new Date(r.kedaluwarsa).getTime() <= Date.now()) return 'expired';
    return r.status;
  }

  var LABEL_BAYAR = {
    paid: { teks: 'Lunas', kelas: 'ok' },
    pending: { teks: 'Menunggu', kelas: 'warn' },
    failed: { teks: 'Gagal', kelas: 'err' },
    expired: { teks: 'Kedaluwarsa', kelas: '' }
  };

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
    adminTiles.innerHTML = '';
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
      adminTiles.appendChild(d);
    });
  }

  function renderUndangan(daftar) {
    barisUndangan.innerHTML = '';
    hitungUndangan.textContent = daftar.length + ' baris';
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
      barisUndangan.appendChild(tr);
    });
  }

  function renderBayar(daftar) {
    barisBayar.innerHTML = '';
    hitungBayar.textContent = daftar.length + ' baris';
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
      barisBayar.appendChild(tr);
    });
  }

  async function muat() {
    pesan('Memuat data…');
    var hasil = await Promise.all([
      KU.sb.rpc('admin_ringkasan'),
      KU.sb.rpc('admin_daftar_undangan'),
      KU.sb.rpc('admin_daftar_pembayaran')
    ]);

    var gagal = hasil.filter(function (h) { return h.error; })[0];
    if (gagal) {
      // 42501 = ditolak database karena bukan admin. Dibedakan dari
      // gangguan biasa: yang satu berarti "kamu memang tidak berhak",
      // yang lain berarti "coba lagi".
      if (gagal.error.code === '42501') {
        pesan('Akun ini bukan admin, jadi panel ini tidak bisa dibuka.', 'err');
        setTimeout(function () { window.location.replace('app.html'); }, 1800);
        return;
      }
      pesan('Gagal memuat data: ' + gagal.error.message, 'err');
      return;
    }

    renderTiles(hasil[0].data || {});
    renderUndangan(hasil[1].data || []);
    renderBayar(hasil[2].data || []);

    var sesi = KU.getSession();
    adminSub.textContent = 'Masuk sebagai ' + ((sesi && sesi.user && sesi.user.email) || 'admin') +
      ' · diperbarui ' + tanggal(new Date().toISOString());
    adminIsi.hidden = false;
    pesan('');
  }

  function mulai(session) {
    if (!session) {
      // Pola yang sama dengan app.html: simpan tujuannya supaya setelah
      // masuk user kembali ke sini, bukan terdampar di beranda.
      try { sessionStorage.setItem('ku-pending-return', 'admin.html'); } catch (e) {}
      window.location.replace('index.html#masuk');
      return;
    }
    muat();
  }

  document.addEventListener('ku:session', function (e) { mulai(e.detail.session); });
  // Sesi bisa sudah selesai di-resolve sebelum listener di atas terpasang
  // (jeda pemuatan antar <script>), jadi keadaan sekarang ikut diperiksa —
  // tapi hanya kalau resolusinya memang sudah pasti selesai.
  if (KU.isSessionResolved()) mulai(KU.getSession());

  if (muatUlangBtn) muatUlangBtn.addEventListener('click', muat);

})();
