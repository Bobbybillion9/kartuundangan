// Logika mengisi template undangan (index.html tiap tema) dengan data
// asli satu invitation — dipakai bersama oleh tab Pratinjau workspace
// (templates/pratinjau.html) dan halaman publik tamu (undangan.html),
// supaya kedua tempat itu selalu menampilkan hasil yang identik dan
// perbaikan/logika baru cukup diubah di satu tempat ini.
(function(){

  // ---------------- Palet warna: token CSS lengkap per palet ----------------
  // Ditentukan lewat kolom invitations.data.palet (lihat tab Desain).
  // Disimpan terpisah dari daftar swatch ringkas di assets/dashboard.js
  // (yang cuma untuk kartu pilihan) karena di sini perlu nilai lengkap
  // untuk benar-benar menimpa custom property CSS template.
  var PALETTE_TOKENS = {
    'rose-gold-ivory':   { ivory:'#FBF3EE', paper:'#FFFBF9', card:'#FFFFFF', ink:'#2A2624', 'ink-mid':'#5C5049', 'ink-soft':'#948877', gold:'#C98F7B', 'gold-dark':'#A66B57', 'gold-tint':'#F3DED6', line:'#EAD3C8', 'line-soft':'#F1DFD6' },
    'platinum-ivory':    { ivory:'#F7F7F5', paper:'#FFFFFF', card:'#FFFFFF', ink:'#262626', 'ink-mid':'#55585C', 'ink-soft':'#8B8E92', gold:'#9BA0A6', 'gold-dark':'#767B82', 'gold-tint':'#E7E9EA', line:'#DCDFE1', 'line-soft':'#E9EBEC' },
    'champagne-bronze':  { ivory:'#F5EBDA', paper:'#FFFBF2', card:'#FFF9EF', ink:'#2A2118', 'ink-mid':'#5C4F3F', 'ink-soft':'#8F8168', gold:'#A9713D', 'gold-dark':'#7E5327', 'gold-tint':'#EAD4AE', line:'#DCC090', 'line-soft':'#E8D3AC' },
    'pearl-sage-gold':   { ivory:'#F5F3E9', paper:'#FFFEFA', card:'#FFFFFF', ink:'#262622', 'ink-mid':'#57564A', 'ink-soft':'#8C8A78', gold:'#A8926A', 'gold-dark':'#7F6C4C', 'gold-tint':'#E5E2CF', line:'#D9D6BE', 'line-soft':'#E7E4D2' },

    'dusty-lavender-sage': { ivory:'#FAF6F3', paper:'#FFFDFC', card:'#FFFFFF', ink:'#372F35', 'ink-mid':'#6C6068', 'ink-soft':'#9C919C', rose:'#B98CAE', 'rose-dark':'#916983', 'rose-tint':'#EFDDEA', sage:'#8E9483', 'sage-tint':'#E9ECDE', gold:'#AD9060', line:'#E5D9E2', 'line-soft':'#EFE5EC' },
    'terracotta-sage':     { ivory:'#FBF3EA', paper:'#FFFCF7', card:'#FFFFFF', ink:'#3A2F26', 'ink-mid':'#6E5B4C', 'ink-soft':'#9C8A78', rose:'#C4785A', 'rose-dark':'#9E5B41', 'rose-tint':'#F3DCD1', sage:'#8B9A76', 'sage-tint':'#E9EDDD', gold:'#BD9257', line:'#E9D9C7', 'line-soft':'#F1E5D8' },
    'powder-blue-sage':    { ivory:'#F6F8F6', paper:'#FDFEFD', card:'#FFFFFF', ink:'#333A3D', 'ink-mid':'#5D6467', 'ink-soft':'#8D9497', rose:'#8FA3B3', 'rose-dark':'#6C8494', 'rose-tint':'#DEE7EC', sage:'#8FA087', 'sage-tint':'#E5EBDF', gold:'#A9A17F', line:'#DCE3DE', 'line-soft':'#E9EDE6' },
    'antique-rose-gold':   { ivory:'#FAF3EC', paper:'#FFFCF8', card:'#FFFFFF', ink:'#362B24', 'ink-mid':'#6B5C4D', 'ink-soft':'#9B8B78', rose:'#B97C68', 'rose-dark':'#8E5A48', 'rose-tint':'#F0DCD2', sage:'#7E8A6C', 'sage-tint':'#E5E8D9', gold:'#BC9558', line:'#E7D9C8', 'line-soft':'#F0E5D9' },

    'sapphire-dusk':  { ivory:'#0B1B2A', paper:'#0E2032', card:'#16324A', ink:'#EDE7D8', 'ink-mid':'#C9C2AC', 'ink-soft':'#948C78', rose:'#D8BB6B', 'rose-dark':'#C29A44', 'rose-tint':'rgba(216,187,107,0.12)', sage:'#9AB0BE', 'sage-tint':'rgba(154,176,190,0.10)', gold:'#9C8536', champagne:'#F2E3DA', line:'rgba(216,187,107,0.22)', 'line-soft':'rgba(216,187,107,0.14)' },
    'burgundy-dusk':  { ivory:'#2A0F14', paper:'#2E1217', card:'#3D191F', ink:'#F0E3DD', 'ink-mid':'#CDB6AC', 'ink-soft':'#96796F', rose:'#D8A25B', 'rose-dark':'#B87F3D', 'rose-tint':'rgba(216,162,91,0.12)', sage:'#B98D8A', 'sage-tint':'rgba(185,141,138,0.10)', gold:'#8C5A2C', champagne:'#F0D9B0', line:'rgba(184,127,61,0.22)', 'line-soft':'rgba(184,127,61,0.14)' },
    'onyx-gold':      { ivory:'#151412', paper:'#1A1917', card:'#242220', ink:'#F1EDE4', 'ink-mid':'#C7C0B0', 'ink-soft':'#8D8778', rose:'#D8B463', 'rose-dark':'#B8934A', 'rose-tint':'rgba(216,180,99,0.12)', sage:'#8C9878', 'sage-tint':'rgba(140,152,120,0.10)', gold:'#8F6D28', champagne:'#F2E6C4', line:'rgba(200,164,90,0.20)', 'line-soft':'rgba(200,164,90,0.13)' },
    'teal-midnight':  { ivory:'#08201F', paper:'#0B2624', card:'#123330', ink:'#E7E9DE', 'ink-mid':'#BFC2AE', 'ink-soft':'#87897A', rose:'#CDAF63', 'rose-dark':'#B08F42', 'rose-tint':'rgba(205,175,99,0.12)', sage:'#8FBFAE', 'sage-tint':'rgba(143,191,174,0.10)', gold:'#93762A', champagne:'#EFE0AE', line:'rgba(147,118,42,0.22)', 'line-soft':'rgba(147,118,42,0.14)' }
  };

  function applyPalette(doc, paletId){
    var tokens = PALETTE_TOKENS[paletId];
    if (!tokens) return;
    var css = ':root{';
    Object.keys(tokens).forEach(function(k){ css += '--' + k + ':' + tokens[k] + ';'; });
    css += '}';
    var styleEl = doc.createElement('style');
    styleEl.textContent = css;
    doc.head.appendChild(styleEl);
  }

  // ---------------- Isi data-slot dengan data asli user ----------------
  function textOrPlaceholder(v, placeholder){
    var s = (v == null ? '' : String(v)).trim();
    return s === '' ? placeholder : s;
  }

  function formatTanggalIndo(iso){
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    var hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getDay()];
    var bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][d.getMonth()];
    return hari + ', ' + d.getDate() + ' ' + bulan + ' ' + d.getFullYear();
  }

  // Menangkap jam pertama yang berbentuk "8.00"/"08:00" dari teks bebas
  // waktu_akad (mis. "08.00 - selesai WIB") supaya hitung mundur bisa
  // presisi ke jam acara, bukan cuma ke awal hari. Kalau tidak ada pola
  // jam yang cocok, kembalikan null (pemanggil lalu pakai awal hari).
  function parseJamDariTeks(teks){
    var m = /(\d{1,2})[.:](\d{2})/.exec(String(teks || ''));
    if (!m) return null;
    var jam = parseInt(m[1], 10), menit = parseInt(m[2], 10);
    if (jam > 23 || menit > 59) return null;
    return (jam < 10 ? '0' + jam : jam) + ':' + (menit < 10 ? '0' + menit : menit) + ':00';
  }

  function setSlotText(doc, slot, value){
    var el = doc.querySelector('[data-slot="' + slot + '"]');
    if (el) el.textContent = value;
  }

  // Tiap slot foto (foto_utama, foto_pria, foto_wanita, foto_galeri_N)
  // membungkus satu <img> yang menutupi ikon placeholder di belakangnya
  // (posisinya absolute, lihat style.css tiap template) — jadi cukup
  // pasang/lepas src gambarnya, tidak perlu utak-atik ikon placeholder.
  function setSlotFoto(doc, slot, url){
    var container = doc.querySelector('[data-slot="' + slot + '"]');
    var img = container && container.querySelector('img');
    if (!img) return;
    if (url) { img.src = url; } else { img.removeAttribute('src'); }
  }

  function populateSlots(doc, inv){
    setSlotText(doc, 'nama_pria_panggilan', textOrPlaceholder(inv.nama_pria_panggilan, 'Nama Pria'));
    setSlotText(doc, 'nama_wanita_panggilan', textOrPlaceholder(inv.nama_wanita_panggilan, 'Nama Wanita'));
    setSlotText(doc, 'nama_pria_lengkap', textOrPlaceholder(inv.nama_pria_lengkap, 'Nama Lengkap Pria'));
    setSlotText(doc, 'nama_wanita_lengkap', textOrPlaceholder(inv.nama_wanita_lengkap, 'Nama Lengkap Wanita'));
    setSlotText(doc, 'orangtua_pria', textOrPlaceholder(inv.orangtua_pria, 'Putra dari Bapak ... dan Ibu ...'));
    setSlotText(doc, 'orangtua_wanita', textOrPlaceholder(inv.orangtua_wanita, 'Putri dari Bapak ... dan Ibu ...'));

    setSlotFoto(doc, 'foto_utama', inv.foto_utama_url);
    setSlotFoto(doc, 'foto_pria', inv.foto_pria_url);
    setSlotFoto(doc, 'foto_wanita', inv.foto_wanita_url);
    var galeri = Array.isArray(inv.foto_galeri) ? inv.foto_galeri : [];
    for (var g = 0; g < 6; g++) {
      setSlotFoto(doc, 'foto_galeri_' + (g + 1), galeri[g] || null);
    }

    var tglAkad = formatTanggalIndo(inv.tanggal_akad);
    var tglResepsi = formatTanggalIndo(inv.tanggal_resepsi);
    setSlotText(doc, 'tanggal_akad', tglAkad || 'Tanggal belum diisi');
    setSlotText(doc, 'tanggal_resepsi', tglResepsi || 'Tanggal belum diisi');
    setSlotText(doc, 'tanggal_acara', tglResepsi || tglAkad || 'Tanggal belum diisi');

    // Markup template menempelkan teks baku "— selesai" sebagai sibling
    // text node tepat setelah slot waktu_akad (lihat index.html tiap
    // tema) — kalau isian user sendiri sudah menyebut "selesai" di mana
    // pun (mis. "08.00 - selesai WIB"), teks baku itu dibuang dari DOM
    // langsung supaya tidak dobel. Menimpa isi slot-nya sendiri tidak
    // cukup karena teksnya di luar elemen data-slot.
    var waktuAkad = textOrPlaceholder(inv.waktu_akad, 'Waktu belum diisi');
    setSlotText(doc, 'waktu_akad', waktuAkad);
    if (/selesai/i.test(waktuAkad)) {
      var waktuAkadEl = doc.querySelector('[data-slot="waktu_akad"]');
      var sib = waktuAkadEl && waktuAkadEl.nextSibling;
      while (sib) {
        if (sib.nodeType === 3 && /selesai/i.test(sib.textContent)) {
          sib.textContent = sib.textContent.replace(/[-–—]?\s*selesai\.?/i, '');
          break;
        }
        sib = sib.nextSibling;
      }
    }
    setSlotText(doc, 'waktu_resepsi', textOrPlaceholder(inv.waktu_resepsi, 'Waktu belum diisi'));

    setSlotText(doc, 'lokasi_nama', textOrPlaceholder(inv.lokasi_nama, 'Nama lokasi belum diisi'));
    setSlotText(doc, 'lokasi_alamat', textOrPlaceholder(inv.lokasi_alamat, 'Alamat belum diisi'));
    var mapsEl = doc.querySelector('[data-slot="lokasi_maps_url"]');
    if (mapsEl) mapsEl.setAttribute('href', inv.lokasi_maps_url || '#');

    setSlotText(doc, 'kalimat_pembuka', textOrPlaceholder(inv.kalimat_pembuka, 'Kalimat pembuka belum diisi.'));
    setSlotText(doc, 'kalimat_penutup', textOrPlaceholder(inv.kalimat_penutup, 'Kalimat penutup belum diisi.'));

    var giftCards = doc.querySelectorAll('.gift-card');
    var card1 = giftCards[0], card2 = giftCards[1];
    setSlotText(doc, 'nama_bank_1', textOrPlaceholder(inv.nama_bank_1, 'Bank belum diisi'));
    setSlotText(doc, 'no_rekening_1', textOrPlaceholder(inv.no_rekening_1, '-'));
    setSlotText(doc, 'pemilik_rekening_1', textOrPlaceholder(inv.pemilik_rekening_1, 'Pemilik belum diisi'));
    if (card1 && inv.no_rekening_1) {
      var copyBtn1 = card1.querySelector('.btn-copy');
      if (copyBtn1) copyBtn1.setAttribute('data-copy', inv.no_rekening_1);
    }

    var isiBank2 = inv.nama_bank_2 || inv.no_rekening_2 || inv.pemilik_rekening_2;
    if (isiBank2) {
      setSlotText(doc, 'nama_bank_2', textOrPlaceholder(inv.nama_bank_2, 'Bank belum diisi'));
      setSlotText(doc, 'no_rekening_2', textOrPlaceholder(inv.no_rekening_2, '-'));
      setSlotText(doc, 'pemilik_rekening_2', textOrPlaceholder(inv.pemilik_rekening_2, 'Pemilik belum diisi'));
      if (card2 && inv.no_rekening_2) {
        var copyBtn2 = card2.querySelector('.btn-copy');
        if (copyBtn2) copyBtn2.setAttribute('data-copy', inv.no_rekening_2);
      }
    } else if (card2) {
      card2.style.display = 'none';
    }

    // Hitung mundur mengikuti tanggal_akad (bukan tanggal_resepsi) +
    // jam yang berhasil ditangkap dari teks waktu_akad. Kalau jamnya
    // tidak bisa dibaca, pakai awal hari (00:00) di tanggal itu supaya
    // tetap menghitung mundur ke hari yang benar. WIB (+07:00) dipakai
    // sebagai asumsi zona waktu acara.
    var cd = doc.querySelector('[data-slot="tanggal_hitung_mundur"]');
    var countdownIso = '';
    if (inv.tanggal_akad) {
      countdownIso = inv.tanggal_akad + 'T' + (parseJamDariTeks(inv.waktu_akad) || '00:00:00') + '+07:00';
      if (cd) cd.setAttribute('data-countdown-target', countdownIso);
    } else if (cd) {
      cd.removeAttribute('data-countdown-target');
    }
    return countdownIso;
  }

  // dipanggil sesudah populateSlots(): memicu ulang bagian template yang
  // sudah terlanjur jalan dengan data contoh saat iframe pertama kali
  // dimuat (monogram inisial & hitung mundur) — lihat komentar masing-
  // masing di script tiap template index.html.
  function terapkanKeFrame(frameWindow, countdownIso){
    if (frameWindow && frameWindow.buatMonogram) frameWindow.buatMonogram();
    if (frameWindow && frameWindow.mulaiHitungMundur) frameWindow.mulaiHitungMundur(countdownIso);
  }

  // ============================================================
  // RSVP & Ucapan: sambungkan form yang ada di tiap template ke tabel
  // rsvp/ucapan (lihat scratch_migration_rsvp_ucapan.sql). Dipanggil
  // HANYA dari undangan.html (halaman publik tamu) — bukan dari
  // templates/pratinjau.html, supaya pemilik yang sedang pratinjau
  // undangannya sendiri (yang biasanya masih berstatus draft) tidak
  // ketemu error "gagal kirim" gara-gara policy INSERT mensyaratkan
  // status 'aktif'. Di pratinjau, form-form ini sengaja dibiarkan
  // memakai perilaku demo bawaan tiap template (lihat <script> di
  // masing-masing index.html tema).
  //
  // Form aslinya (di tiap index.html tema) sudah punya listener submit
  // demo (console.log + tampilan lokal saja). Supaya tidak dobel jalan
  // bareng listener asli di sini, elemen form di-clone lalu ditukar ke
  // DOM (cloneNode tidak ikut membawa listener lama) sebelum listener
  // yang sungguhan dipasang — jadi tiap tema otomatis "tersambung"
  // tanpa perlu file index.html-nya sendiri diubah satu per satu.

  var PESAN_ERROR_UMUM = 'Terjadi kesalahan. Periksa koneksi internetmu, lalu coba lagi.';

  function formatWaktuRelatif(iso){
    var target = new Date(iso).getTime();
    if (isNaN(target)) return '';
    var diffDetik = Math.floor((Date.now() - target) / 1000);
    if (diffDetik < 60) return 'Baru saja';
    var diffMenit = Math.floor(diffDetik / 60);
    if (diffMenit < 60) return diffMenit + ' menit lalu';
    var diffJam = Math.floor(diffMenit / 60);
    if (diffJam < 24) return diffJam + ' jam lalu';
    var diffHari = Math.floor(diffJam / 24);
    if (diffHari < 7) return diffHari + ' hari lalu';
    var diffMinggu = Math.floor(diffHari / 7);
    if (diffMinggu < 5) return diffMinggu + ' minggu lalu';
    var diffBulan = Math.floor(diffHari / 30);
    if (diffBulan < 12) return diffBulan + ' bulan lalu';
    return Math.floor(diffHari / 365) + ' tahun lalu';
  }

  // Sama seperti initPillGroup di tiap template index.html — dipasang
  // ulang di sini karena clone form melepas listener lama.
  function initPillGroupUmum(group){
    var hiddenInput = group.parentElement.querySelector('input[type="hidden"]');
    var buttons = Array.prototype.slice.call(group.querySelectorAll('.pill-btn'));
    buttons.forEach(function(btn){
      btn.addEventListener('click', function(){
        buttons.forEach(function(b){ b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        hiddenInput.value = btn.dataset.value;
        hiddenInput.dispatchEvent(new Event('change'));
      });
    });
  }

  function kunciForm(form, msgEl, pesan){
    Array.prototype.slice.call(form.querySelectorAll('input, textarea, button')).forEach(function(el){ el.disabled = true; });
    msgEl.textContent = pesan;
    msgEl.className = 'form-msg ok';
  }

  function setupRsvpForm(doc, inv, sb){
    var formLama = doc.getElementById('rsvpForm');
    if (!formLama) return;
    var form = formLama.cloneNode(true);
    formLama.parentNode.replaceChild(form, formLama);

    var msgEl = form.querySelector('#rsvpMsg');
    var fieldJumlah = form.querySelector('#fieldJumlahTamu');
    var jumlahInput = form.querySelector('#rsvpJumlah');
    var namaInput = form.querySelector('#rsvpNama');
    var pihakInput = form.querySelector('input[name="pihak"]');
    var kehadiranInput = form.querySelector('input[name="kehadiran"]');
    var submitBtn = form.querySelector('button[type="submit"]');

    form.querySelectorAll('.pill-group').forEach(initPillGroupUmum);

    kehadiranInput.addEventListener('change', function(){
      var tidakHadir = kehadiranInput.value === 'tidak_hadir';
      fieldJumlah.classList.toggle('is-hidden', tidakHadir);
      if (tidakHadir) jumlahInput.value = '';
    });

    var storageKey = 'ku-rsvp-sent:' + inv.id;
    if (localStorage.getItem(storageKey)) {
      kunciForm(form, msgEl, 'Terima kasih, kamu sudah mengonfirmasi kehadiran untuk undangan ini sebelumnya.');
      return;
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var namaTamu = namaInput.value.trim();
      if (!namaTamu) {
        msgEl.textContent = 'Nama tamu wajib diisi ya.';
        msgEl.className = 'form-msg err';
        return;
      }
      if (!pihakInput.value || !kehadiranInput.value) {
        msgEl.textContent = 'Lengkapi dulu pilihan pihak dan kehadiran ya.';
        msgEl.className = 'form-msg err';
        return;
      }
      var kehadiran = kehadiranInput.value;
      var jumlahTamu = kehadiran === 'tidak_hadir' ? 0 : (parseInt(jumlahInput.value, 10) || 1);

      submitBtn.disabled = true;
      msgEl.textContent = 'Mengirim...';
      msgEl.className = 'form-msg';

      sb.from('rsvp').insert({
        invitation_id: inv.id,
        nama_tamu: namaTamu,
        pihak: pihakInput.value,
        kehadiran: kehadiran,
        jumlah_tamu: jumlahTamu
      }).then(function(res){
        if (res.error) {
          submitBtn.disabled = false;
          msgEl.textContent = PESAN_ERROR_UMUM;
          msgEl.className = 'form-msg err';
          return;
        }
        localStorage.setItem(storageKey, '1');
        kunciForm(form, msgEl, 'Terima kasih, konfirmasi kehadiranmu sudah kami terima!');
      }, function(){
        submitBtn.disabled = false;
        msgEl.textContent = PESAN_ERROR_UMUM;
        msgEl.className = 'form-msg err';
      });
    });
  }

  var UCAPAN_PER_HALAMAN = 10;

  function buatUcapanItem(doc, row){
    var item = doc.createElement('div');
    item.className = 'ucapan-item';
    var head = doc.createElement('div');
    head.className = 'ucapan-head';
    var name = doc.createElement('span');
    name.className = 'ucapan-name';
    name.textContent = row.nama;
    var time = doc.createElement('span');
    time.className = 'ucapan-time';
    time.textContent = formatWaktuRelatif(row.created_at);
    head.appendChild(name);
    head.appendChild(time);
    var text = doc.createElement('p');
    text.className = 'ucapan-text';
    text.textContent = row.pesan;
    item.appendChild(head);
    item.appendChild(text);
    return item;
  }

  function buatPesanUcapan(doc, teks){
    var p = doc.createElement('p');
    p.className = 'section-lead center';
    p.textContent = teks;
    return p;
  }

  function setupUcapanSection(doc, inv, sb){
    var ucapanList = doc.getElementById('ucapanList');
    var formLama = doc.getElementById('ucapanForm');
    if (!ucapanList || !formLama) return;

    var form = formLama.cloneNode(true);
    formLama.parentNode.replaceChild(form, formLama);
    var msgEl = form.querySelector('#ucapanMsg');
    var namaInput = form.querySelector('#ucapanNama');
    var pesanInput = form.querySelector('#ucapanPesan');
    var submitBtn = form.querySelector('button[type="submit"]');

    ucapanList.innerHTML = '';
    ucapanList.appendChild(buatPesanUcapan(doc, 'Memuat ucapan...'));

    var semua = [];
    var jumlahTampil = 0;
    var tombolLebih = null;

    function tampilkanBatch(){
      var batch = semua.slice(jumlahTampil, jumlahTampil + UCAPAN_PER_HALAMAN);
      batch.forEach(function(row){ ucapanList.appendChild(buatUcapanItem(doc, row)); });
      jumlahTampil += batch.length;
      if (tombolLebih) tombolLebih.style.display = jumlahTampil < semua.length ? '' : 'none';
    }

    function pasangTombolLebih(){
      if (tombolLebih) return;
      var wrap = doc.createElement('div');
      wrap.className = 'center';
      wrap.style.marginTop = 'var(--s3)';
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-outline';
      btn.textContent = 'Lihat lebih banyak';
      btn.addEventListener('click', tampilkanBatch);
      wrap.appendChild(btn);
      ucapanList.parentNode.insertBefore(wrap, ucapanList.nextSibling);
      tombolLebih = btn;
      tombolLebih.style.display = jumlahTampil < semua.length ? '' : 'none';
    }

    sb.from('ucapan').select('*').eq('invitation_id', inv.id).order('created_at', { ascending: false }).then(function(res){
      ucapanList.innerHTML = '';
      if (res.error) {
        ucapanList.appendChild(buatPesanUcapan(doc, 'Gagal memuat ucapan. Muat ulang halaman untuk mencoba lagi.'));
        return;
      }
      semua = res.data || [];
      if (semua.length === 0) {
        ucapanList.appendChild(buatPesanUcapan(doc, 'Belum ada ucapan. Jadilah yang pertama mengirimkan doa untuk kedua mempelai!'));
        return;
      }
      if (semua.length > UCAPAN_PER_HALAMAN) pasangTombolLebih();
      tampilkanBatch();
    }, function(){
      ucapanList.innerHTML = '';
      ucapanList.appendChild(buatPesanUcapan(doc, 'Gagal terhubung ke server. Periksa koneksi internetmu.'));
    });

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var nama = namaInput.value.trim();
      var pesan = pesanInput.value.trim();
      if (!nama || !pesan) {
        msgEl.textContent = 'Nama dan pesan wajib diisi ya.';
        msgEl.className = 'form-msg err';
        return;
      }
      submitBtn.disabled = true;
      msgEl.textContent = 'Mengirim...';
      msgEl.className = 'form-msg';

      sb.from('ucapan').insert({ invitation_id: inv.id, nama: nama, pesan: pesan }).select().single().then(function(res){
        submitBtn.disabled = false;
        if (res.error || !res.data) {
          msgEl.textContent = PESAN_ERROR_UMUM;
          msgEl.className = 'form-msg err';
          return;
        }
        semua.unshift(res.data);
        if (ucapanList.querySelector('.section-lead')) ucapanList.innerHTML = '';
        ucapanList.insertBefore(buatUcapanItem(doc, res.data), ucapanList.firstChild);
        jumlahTampil += 1;
        if (semua.length > UCAPAN_PER_HALAMAN) pasangTombolLebih();
        msgEl.textContent = 'Terima kasih atas ucapan dan doanya!';
        msgEl.className = 'form-msg ok';
        form.reset();
      }, function(){
        submitBtn.disabled = false;
        msgEl.textContent = PESAN_ERROR_UMUM;
        msgEl.className = 'form-msg err';
      });
    });
  }

  window.RenderUndangan = {
    applyPalette: applyPalette,
    populateSlots: populateSlots,
    terapkanKeFrame: terapkanKeFrame,
    setupRsvpForm: setupRsvpForm,
    setupUcapanSection: setupUcapanSection
  };
})();
