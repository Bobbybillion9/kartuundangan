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

  var BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  var LABEL_METODE = {
    qris: 'QRIS', gopay: 'GoPay', shopeepay: 'ShopeePay',
    bank_transfer: 'Transfer bank', echannel: 'Mandiri Bill',
    credit_card: 'Kartu', cstore: 'Minimarket', lainnya: 'Lainnya'
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

  // ---------------- grafik ----------------
  //
  // Digambar sebagai SVG langsung, tanpa pustaka: project ini memang tanpa
  // build step, dan yang dibutuhkan cuma batang, garis bantu, dan tooltip.
  //
  // Warnanya SATU rona aksen penuh untuk semua batang, bukan gradasi terang
  // ke gelap. Alasannya diukur, bukan selera: langkah aksen yang lebih muda
  // (#E3C6A6 dan #C99A6C) hanya mencapai kontras 1.63:1 dan 2.52:1 terhadap
  // permukaan kartu putih — di bawah 3:1, jadi batangnya nyaris lenyap.
  // Penekanan pada batang tertinggi dilakukan lewat LABEL LANGSUNG, bukan
  // lewat warna yang lebih pudar.

  var NS = 'http://www.w3.org/2000/svg';

  function svgEl(nama, atribut) {
    var e = document.createElementNS(NS, nama);
    Object.keys(atribut || {}).forEach(function (k) { e.setAttribute(k, atribut[k]); });
    return e;
  }

  function rupiahRingkas(n) {
    n = Number(n) || 0;
    if (n >= 1000000) return 'Rp' + (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'jt';
    if (n >= 1000) return 'Rp' + Math.round(n / 1000) + 'rb';
    return 'Rp' + n;
  }

  function kosong(teks) {
    var p = document.createElement('p');
    p.className = 'chart-kosong';
    p.textContent = teks;
    return p;
  }

  // Batang dengan ujung data membulat 4px, kakinya menempel garis dasar.
  function jalurBatang(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return 'M' + x + ',' + (y + h) +
      'V' + (y + r) +
      'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + (-r) +
      'h' + (w - 2 * r) +
      'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r +
      'V' + (y + h) + 'Z';
  }

  // Satu tooltip per wadah grafik, mengikuti kursor.
  function pasangTooltip(wadah) {
    var tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.hidden = true;
    wadah.appendChild(tip);

    wadah.addEventListener('mousemove', function (e) {
      var hit = e.target.closest ? e.target.closest('.chart-hit') : null;
      if (!hit) { tip.hidden = true; return; }
      tip.innerHTML = '';
      var j = document.createElement('strong');
      j.textContent = hit.dataset.judul;
      var i = document.createElement('span');
      i.textContent = hit.dataset.isi;
      tip.append(j, i);
      tip.hidden = false;
      var r = wadah.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      tip.style.left = Math.max(4, Math.min(r.width - tip.offsetWidth - 4, x - tip.offsetWidth / 2)) + 'px';
      tip.style.top = Math.max(4, y - tip.offsetHeight - 12) + 'px';
    });
    wadah.addEventListener('mouseleave', function () { tip.hidden = true; });
  }

  function renderChartBulanan(data) {
    var wadah = document.getElementById('chartBulanan');
    if (!wadah) return;
    wadah.innerHTML = '';

    var total = data.reduce(function (s, d) { return s + Number(d.nilai || 0); }, 0);
    var totalEl = document.getElementById('bulananTotal');
    if (totalEl) totalEl.textContent = total > 0 ? 'Total Rp' + window.formatRupiah(total) : '';

    if (!data.length || total === 0) {
      wadah.appendChild(kosong('Belum ada pembayaran lunas dalam 6 bulan terakhir.'));
      return;
    }

    var W = 640, H = 230, padKiri = 56, padKanan = 14, padAtas = 30, padBawah = 32;
    var plotW = W - padKiri - padKanan, plotH = H - padAtas - padBawah;
    var maks = Math.max.apply(null, data.map(function (d) { return Number(d.nilai || 0); }));
    // Dibulatkan ke atas supaya garis bantu teratas jatuh di angka bulat.
    var atas = Math.max(1, Math.ceil(maks / 25000) * 25000);
    var tertinggi = data.reduce(function (a, b) { return Number(b.nilai) > Number(a.nilai) ? b : a; }, data[0]);

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'chart-svg',
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': 'Grafik batang pendapatan enam bulan terakhir, total Rp' + window.formatRupiah(total)
    });

    // Garis bantu resesif: tugasnya membantu membaca tinggi, bukan ikut
    // bersaing dengan datanya.
    [0, 0.5, 1].forEach(function (f) {
      var y = padAtas + plotH - f * plotH;
      svg.appendChild(svgEl('line', { x1: padKiri, y1: y, x2: W - padKanan, y2: y, class: 'chart-grid' }));
      var t = svgEl('text', { x: padKiri - 12, y: y + 4, class: 'chart-tick', 'text-anchor': 'end' });
      t.textContent = f === 0 ? '0' : rupiahRingkas(atas * f);
      svg.appendChild(t);
    });

    var lebarSlot = plotW / data.length;
    var lebarBatang = Math.min(46, lebarSlot - 16);

    data.forEach(function (d, i) {
      var nilai = Number(d.nilai || 0);
      var h = atas ? (nilai / atas) * plotH : 0;
      var x = padKiri + i * lebarSlot + (lebarSlot - lebarBatang) / 2;
      var y = padAtas + plotH - h;
      var tgl = new Date(d.bulan + 'T00:00:00');
      var labelBulan = BULAN_PENDEK[tgl.getMonth()];

      if (h > 1) {
        svg.appendChild(svgEl('path', { d: jalurBatang(x, y, lebarBatang, h, 4), class: 'chart-bar' }));
      } else {
        // Bulan nol tetap diberi jejak tipis di garis dasar. Tanpa itu,
        // bulan tanpa pemasukan terlihat seolah datanya hilang, bukan nol.
        svg.appendChild(svgEl('rect', {
          x: x, y: padAtas + plotH - 2, width: lebarBatang, height: 2, rx: 1, class: 'chart-bar-nol'
        }));
      }

      // Label langsung HANYA di batang tertinggi. Angka di setiap batang
      // justru membuat semuanya sama-sama tidak terbaca.
      if (d === tertinggi && nilai > 0) {
        var lbl = svgEl('text', {
          x: x + lebarBatang / 2, y: y - 10, class: 'chart-label-langsung', 'text-anchor': 'middle'
        });
        lbl.textContent = 'Rp' + window.formatRupiah(nilai);
        svg.appendChild(lbl);
      }

      var sumbu = svgEl('text', { x: x + lebarBatang / 2, y: H - 10, class: 'chart-tick', 'text-anchor': 'middle' });
      sumbu.textContent = labelBulan;
      svg.appendChild(sumbu);

      // Sasaran hover selebar slot, bukan selebar batang — batang setipis
      // ini terlalu sulit dibidik, apalagi yang nilainya nol.
      var hit = svgEl('rect', {
        x: padKiri + i * lebarSlot, y: padAtas, width: lebarSlot, height: plotH, class: 'chart-hit'
      });
      hit.dataset.judul = labelBulan + ' ' + tgl.getFullYear();
      hit.dataset.isi = 'Rp' + window.formatRupiah(nilai) + ' - ' + d.pesanan + ' pesanan';
      svg.appendChild(hit);
    });

    wadah.appendChild(svg);
    pasangTooltip(wadah);
  }

  // Batang mendatar dengan nilainya ditulis di ujung baris. Nilainya selalu
  // terlihat, jadi pembacaannya tidak bergantung pada panjang batang maupun
  // pada warna.
  function renderBatangMendatar(wadahId, daftar, pesanKosong) {
    var wadah = document.getElementById(wadahId);
    if (!wadah) return;
    wadah.innerHTML = '';
    if (!daftar.length) { wadah.appendChild(kosong(pesanKosong)); return; }

    var maks = Math.max.apply(null, daftar.map(function (d) { return d.nilai; })) || 1;
    var ul = document.createElement('ul');
    ul.className = 'bar-list';

    daftar.forEach(function (d) {
      var li = document.createElement('li');

      var baris = document.createElement('div');
      baris.className = 'bar-baris';
      var nama = document.createElement('span');
      nama.className = 'bar-nama';
      nama.textContent = d.nama;
      var nilai = document.createElement('span');
      nilai.className = 'bar-nilai';
      nilai.textContent = d.teks;
      baris.append(nama, nilai);

      var rel = document.createElement('div');
      rel.className = 'bar-rel';
      var isi = document.createElement('div');
      isi.className = 'bar-isi';
      isi.style.width = Math.max(2, (d.nilai / maks) * 100) + '%';
      rel.appendChild(isi);

      li.append(baris, rel);
      if (d.ket) {
        var k = document.createElement('span');
        k.className = 'bar-ket';
        k.textContent = d.ket;
        li.appendChild(k);
      }
      ul.appendChild(li);
    });
    wadah.appendChild(ul);
  }

  function renderKonversi(k) {
    var wadah = document.getElementById('chartKonversi');
    if (!wadah) return;
    wadah.innerHTML = '';

    var dibuat = Number(k && k.dibuat) || 0;
    var dibayar = Number(k && k.dibayar) || 0;
    if (!dibuat) { wadah.appendChild(kosong('Belum ada undangan dari pelanggan.')); return; }

    var persen = Math.round((dibayar / dibuat) * 100);

    var box = document.createElement('div');
    box.className = 'konversi';

    var angka = document.createElement('p');
    angka.className = 'konversi-angka';
    angka.textContent = persen + '%';

    var rel = document.createElement('div');
    rel.className = 'bar-rel bar-rel-tebal';
    var isi = document.createElement('div');
    isi.className = 'bar-isi';
    isi.style.width = Math.max(2, persen) + '%';
    rel.appendChild(isi);

    var ket = document.createElement('p');
    ket.className = 'konversi-ket';
    ket.textContent = dibayar + ' dari ' + dibuat + ' undangan pelanggan sudah dibayar';

    var catatan = document.createElement('p');
    catatan.className = 'konversi-catatan';
    catatan.textContent = 'Undangan milik akun admin tidak ikut dihitung — akun itu memang tidak pernah ditagih.';

    box.append(angka, rel, ket, catatan);
    wadah.appendChild(box);
  }

  var IKON_AKTIVITAS = {
    bayar: 'M2 7h20M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
    rsvp: 'M20 6L9 17l-5-5',
    ucapan: 'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z'
  };

  function renderAktivitas(daftar) {
    var wadah = document.getElementById('adminAktivitas');
    if (!wadah) return;
    wadah.innerHTML = '';
    if (!daftar.length) { wadah.appendChild(kosong('Belum ada aktivitas.')); return; }

    daftar.slice(0, 8).forEach(function (a) {
      var item = document.createElement('div');
      item.className = 'aktivitas-item';

      var ik = document.createElement('span');
      ik.className = 'aktivitas-ikon ' + a.jenis;
      ik.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' +
        (IKON_AKTIVITAS[a.jenis] || '') + '"/></svg>';

      var teks = document.createElement('div');
      teks.className = 'aktivitas-teks';

      var judul = document.createElement('span');
      judul.className = 'aktivitas-judul';
      if (a.jenis === 'bayar') {
        var lbl = LABEL_BAYAR[a.status] ? LABEL_BAYAR[a.status].teks.toLowerCase() : a.status;
        judul.textContent = 'Pembayaran ' + lbl + ' - Rp' + window.formatRupiah(a.nilai || 0);
      } else if (a.jenis === 'rsvp') {
        judul.textContent = 'Konfirmasi kehadiran' + (a.detail ? ' - ' + a.detail : '');
      } else {
        judul.textContent = 'Ucapan baru';
      }

      var sub = document.createElement('span');
      sub.className = 'aktivitas-sub';
      sub.textContent = (a.pasangan || 'Undangan tanpa nama') + ' - ' + tanggal(a.pada);

      teks.append(judul, sub);
      item.append(ik, teks);
      wadah.appendChild(item);
    });
  }

  function renderHero(r, st) {
    var elNilai = document.getElementById('heroNilai');
    var elDelta = document.getElementById('heroPerubahan');
    var elKet = document.getElementById('heroKet');

    if (elNilai) elNilai.textContent = 'Rp' + window.formatRupiah(r.pendapatan || 0);

    var ini = Number(st.nilai_bulan_ini) || 0;
    var lalu = Number(st.nilai_bulan_lalu) || 0;

    if (elDelta) {
      // Persentase perubahan dari basis NOL tidak berarti apa-apa — "naik
      // tak hingga persen" bukan informasi. Kalau bulan lalu nol, penanda
      // perubahannya disembunyikan dan nominalnya saja yang bicara.
      if (lalu > 0) {
        var delta = Math.round(((ini - lalu) / lalu) * 100);
        elDelta.textContent = (delta >= 0 ? '+' : '') + delta + '% vs bulan lalu';
        elDelta.className = 'admin-delta ' + (delta >= 0 ? 'naik' : 'turun');
        elDelta.hidden = false;
      } else {
        elDelta.hidden = true;
      }
    }

    if (elKet) {
      elKet.textContent = ini > 0
        ? 'Rp' + window.formatRupiah(ini) + ' bulan ini'
        : 'Belum ada pemasukan bulan ini';
    }
  }

  function renderTiles(r) {
    var kartu = [
      { label: 'Undangan aktif', nilai: r.undangan_aktif },
      { label: 'Draf berjalan', nilai: r.undangan_draf },
      { label: 'Pembayaran lunas', nilai: r.bayar_lunas },
      { label: 'Menunggu bayar', nilai: r.bayar_menunggu },
      { label: 'Pengguna', nilai: r.pengguna },
      { label: 'Tamu terdaftar', nilai: r.tamu },
      { label: 'Konfirmasi hadir', nilai: r.rsvp },
      { label: 'Ucapan', nilai: r.ucapan }
    ];
    el.tiles.innerHTML = '';
    kartu.forEach(function (k) {
      var d = document.createElement('div');
      d.className = 'admin-tile';
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
      KU.sb.rpc('admin_daftar_pembayaran'),
      KU.sb.rpc('admin_statistik')
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

    var ringkas = hasil[0].data || {};
    var stat = hasil[3].data || {};

    renderHero(ringkas, stat);
    renderTiles(ringkas);
    renderChartBulanan(stat.bulanan || []);

    renderBatangMendatar('chartTema', (stat.tema || []).map(function (t) {
      return {
        nama: t.nama,
        nilai: t.total,
        teks: t.total + ' undangan',
        ket: t.aktif + ' aktif'
      };
    }), 'Belum ada undangan.');

    renderBatangMendatar('chartMetode', (stat.metode || []).map(function (m) {
      return {
        nama: LABEL_METODE[m.metode] || m.metode,
        nilai: m.jumlah,
        teks: m.jumlah + '×',
        ket: 'Rp' + window.formatRupiah(m.nilai)
      };
    }), 'Belum ada pembayaran lunas.');

    renderKonversi(stat.konversi);
    renderAktivitas(stat.aktivitas || []);

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
