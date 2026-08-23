(function(){
  try {
    var saved = localStorage.getItem('ku-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme','dark');
    }
  } catch(e){}

  var themeSwitch = document.getElementById('themeSwitch');
  var lblThemeLight = document.getElementById('lblThemeLight');
  var lblThemeDark = document.getElementById('lblThemeDark');

  function syncThemeSwitch(){
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeSwitch.classList.toggle('on', isDark);
    lblThemeLight.classList.toggle('active', !isDark);
    lblThemeDark.classList.toggle('active', isDark);
  }
  syncThemeSwitch();
  themeSwitch.addEventListener('click', function(){
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('ku-theme', next); } catch(e){}
    syncThemeSwitch();
  });

  var views = ['home', 'desain', 'tema', 'harga', 'profil'];
  var viewLinks = document.querySelectorAll('[data-view]');
  var sideNav = document.getElementById('sideNav');
  var tabbar = document.getElementById('tabbar');

  function movePill(name){
    var idx = views.indexOf(name);
    if (idx === -1) return;
    if (sideNav) sideNav.style.setProperty('--active-index', idx);
    if (tabbar) tabbar.style.setProperty('--active-index', idx);
  }

  function showView(name){
    if (views.indexOf(name) === -1) name = 'desain';
    views.forEach(function(v){
      document.getElementById('view-' + v).classList.toggle('active', v === name);
    });
    document.getElementById('view-workspace').classList.remove('active');
    viewLinks.forEach(function(a){
      a.classList.toggle('active', a.dataset.view === name);
    });
    movePill(name);
    if (name === 'desain') renderDesainView();
  }
  showView('desain');

  // ?view=tema (dipakai link "Tampilkan lebih banyak tema" di index.html)
  // buka langsung ke view itu, menimpa default 'desain' di atas.
  var initialViewParam = new URLSearchParams(window.location.search).get('view');
  if (initialViewParam && views.indexOf(initialViewParam) !== -1) showView(initialViewParam);

  viewLinks.forEach(function(a){
    a.addEventListener('click', async function(){
      if (!(await confirmLeaveWorkspace())) return;
      wsFormDirty = false;
      showView(a.dataset.view);
    });
  });

  var menuKeluarBtn = document.getElementById('menuKeluarBtn');
  menuKeluarBtn.addEventListener('click', async function(){
    if (!(await KU.confirmLogout())) return;
    KU.sb.auth.signOut();
  });

  var navEntries = [
    [document.getElementById('sideProfilIcon'), document.getElementById('sideAvatarBadge'), document.getElementById('sideProfilLabel')],
    [document.getElementById('tabProfilIcon'), document.getElementById('tabAvatarBadge'), document.getElementById('tabProfilLabel')]
  ];
  var profileAvatarBadge = document.getElementById('profileAvatarBadge');
  var profileDisplayName = document.getElementById('profileDisplayName');
  var profileEmailSub = document.getElementById('profileEmailSub');

  var profileNameInput = document.getElementById('profileNameInput');
  var profileNameSaveBtn = document.getElementById('profileNameSaveBtn');
  var profileEmail = document.getElementById('profileEmail');
  var profileBadges = document.getElementById('profileBadges');
  var profilePasswordToggleBtn = document.getElementById('profilePasswordToggleBtn');
  var profileMsg = document.getElementById('profileMsg');

  function showProfileMsg(text, type){
    profileMsg.textContent = text || '';
    profileMsg.className = 'profile-msg' + (type ? ' ' + type : '');
  }

  function makeBadge(text){
    var span = document.createElement('span');
    span.className = 'badge';
    span.textContent = text;
    return span;
  }

  function renderProfile(session){
    if (!session) {
      profileNameInput.value = '';
      profileEmail.textContent = '';
      profileBadges.innerHTML = '';
      profilePasswordToggleBtn.textContent = 'Ganti Kata Sandi';
      showProfileMsg('');
      return;
    }
    var user = session.user;
    profileNameInput.value = user.user_metadata.full_name || '';
    profileEmail.textContent = user.email || '';

    var identities = user.identities || [];
    var hasGoogle = identities.some(function(i){ return i.provider === 'google'; });
    var hasPw = KU.hasPasswordIdentity(session);

    profileBadges.innerHTML = '';
    if (hasGoogle) profileBadges.appendChild(makeBadge('Google'));
    if (hasPw) profileBadges.appendChild(makeBadge('Email'));

    profilePasswordToggleBtn.textContent = hasPw ? 'Ganti Kata Sandi' : 'Atur Kata Sandi';
  }

  function renderProfileNav(session){
    var loggedIn = !!session;
    var initial = loggedIn ? KU.getInitial(session) : '';
    var label = loggedIn ? 'Profil' : 'Masuk';
    var email = loggedIn ? (session.user.email || session.user.user_metadata.full_name || 'Akun') : 'Kamu belum masuk.';

    navEntries.forEach(function(entry){
      var icon = entry[0], badge = entry[1], labelEl = entry[2];
      if (!icon || !badge || !labelEl) return;
      icon.style.display = loggedIn ? 'none' : 'block';
      badge.style.display = loggedIn ? 'inline-flex' : 'none';
      if (loggedIn) badge.textContent = initial;
      labelEl.textContent = label;
    });

    if (profileAvatarBadge) profileAvatarBadge.textContent = initial || '?';
    if (profileDisplayName) profileDisplayName.textContent = loggedIn ? 'Akun Kamu' : 'Akun';
    if (profileEmailSub) profileEmailSub.textContent = email;

    renderProfile(session);
  }

  profileNameSaveBtn.addEventListener('click', async function(){
    var session = KU.getSession();
    if (!session) return;
    var name = profileNameInput.value.trim();
    profileNameSaveBtn.disabled = true;
    showProfileMsg('Menyimpan...');
    var res = await KU.sb.auth.updateUser({ data: { full_name: name } });
    profileNameSaveBtn.disabled = false;
    if (res.error) { showProfileMsg(res.error.message, 'err'); return; }
    showProfileMsg('Nama tersimpan.', 'ok');
  });

  profilePasswordToggleBtn.addEventListener('click', async function(){
    var session = KU.getSession();
    if (!session) return;
    profilePasswordToggleBtn.disabled = true;
    showProfileMsg('Mengirim...');
    var res = await KU.sb.auth.resetPasswordForEmail(session.user.email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    profilePasswordToggleBtn.disabled = false;
    if (res.error) { showProfileMsg(res.error.message, 'err'); return; }
    showProfileMsg('Link reset kata sandi sudah dikirim ke emailmu.', 'ok');
  });

  document.addEventListener('ku:session', function(e){
    renderProfileNav(e.detail.session);
    if (document.getElementById('view-desain').classList.contains('active')) renderDesainView();
    handlePendingGunakan();
  });
  renderProfileNav(KU.getSession());

  // ---------------- Template Tema (grid) ----------------
  // Katalog template dipusatkan di assets/theme-templates.js (dipakai
  // juga oleh undangan.html) — lihat file itu untuk menambah tema baru.
  var THEME_TEMPLATES = window.THEME_TEMPLATES;

  // ?gunakan=<id template> (dipakai tombol "Gunakan" di section Tema
  // index.html): begitu sesi login diketahui (event ku:session di atas
  // selalu terpicu sekali saat load, entah ada sesi atau tidak), buat
  // draft untuk template itu lalu langsung buka workspace-nya — persis
  // jalur yang dipakai tombol Gunakan pada grid Template Tema di bawah.
  // Kalau ternyata belum login (akses langsung tanpa lewat index.html),
  // parameter ini didiamkan saja — halaman ini memang tidak punya form
  // masuk sendiri.
  var pendingGunakanId = new URLSearchParams(window.location.search).get('gunakan');

  async function handlePendingGunakan(){
    if (!pendingGunakanId) return;
    var session = KU.getSession();
    if (!session) return;
    var id = pendingGunakanId;
    pendingGunakanId = null;
    history.replaceState(null, '', 'app.html');
    var t = THEME_TEMPLATES.filter(function(x){ return x.id === id; })[0];
    showView('tema');
    if (!t) return;
    showTemaMsg('Menyiapkan workspace...');
    var res = await ensureDraftForTemplate(t);
    if (res.error) { showTemaMsg('Gagal menyiapkan undangan: ' + friendlyErrorMessage(res.error), 'err'); return; }
    showTemaMsg('');
    openWorkspace(res.data, t);
  }
  // Sesi bisa saja sudah selesai di-resolve SEBELUM baris ini jalan
  // (jeda pemuatan antar <script> memberi waktu promise getSession()
  // di auth-core.js selesai lebih dulu), jadi event 'ku:session' di
  // atas bisa saja sudah lewat dan tidak pernah tertangkap. Makanya
  // dicoba juga langsung di sini pakai nilai sesi yang ada saat ini —
  // sama seperti renderProfileNav(KU.getSession()) di atas.
  handlePendingGunakan();

  function renderThemeTemplateCard(t){
    var card = document.createElement('article');
    card.className = 'tpl-card';

    var preview = document.createElement('div');
    preview.className = 'tpl-preview';
    var img = document.createElement('img');
    img.src = t.thumb;
    img.alt = 'Pratinjau ' + t.name;
    img.loading = 'lazy';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    preview.appendChild(img);

    var body = document.createElement('div');
    body.className = 'tpl-body';

    var row = document.createElement('div');
    row.className = 'tpl-row';
    var name = document.createElement('span');
    name.className = 'name';
    name.textContent = t.name;
    row.appendChild(name);

    var desc = document.createElement('p');
    desc.className = 'tpl-desc';
    desc.textContent = t.desc;

    var actions = document.createElement('div');
    actions.className = 'tpl-actions';

    var previewBtn = document.createElement('a');
    previewBtn.className = 'btn btn-outline';
    previewBtn.href = 'templates/pratinjau.html?tema=' + encodeURIComponent(t.id);
    previewBtn.target = '_blank';
    previewBtn.rel = 'noopener';
    previewBtn.textContent = 'Pratinjau';

    var useBtn = document.createElement('button');
    useBtn.type = 'button';
    useBtn.className = 'btn btn-ghost tpl-use-btn';
    useBtn.dataset.id = t.id;
    useBtn.textContent = 'Gunakan';

    actions.append(previewBtn, useBtn);
    body.append(row, desc, actions);
    card.append(preview, body);
    return card;
  }

  function renderThemeTemplateGrid(){
    var grid = document.getElementById('themeTemplateGrid');
    if (!grid) return;
    grid.innerHTML = '';
    THEME_TEMPLATES.forEach(function(t){ grid.appendChild(renderThemeTemplateCard(t)); });
  }
  renderThemeTemplateGrid();

  // ---------------- Workspace Editor ----------------
  var temaMsg = document.getElementById('temaMsg');
  var themeTemplateGrid = document.getElementById('themeTemplateGrid');

  function showTemaMsg(text, type){
    if (!temaMsg) return;
    temaMsg.textContent = text || '';
    temaMsg.className = 'workspace-msg' + (type ? ' ' + type : '');
  }

  function friendlyErrorMessage(err){
    if (!err) return 'Terjadi kesalahan. Silakan coba lagi.';
    var msg = (err.message || '').toLowerCase();
    if (msg.indexOf('failed to fetch') !== -1 || msg.indexOf('network') !== -1) {
      return 'Gagal terhubung ke server. Periksa koneksi internetmu lalu coba lagi.';
    }
    if (err.code === '23505') return 'Data ini sudah dipakai. Silakan pakai nilai lain.';
    if (err.code === '23514') return 'Ada data yang tidak sesuai format. Periksa kembali isian kamu.';
    return 'Gagal menyimpan data. Silakan coba lagi beberapa saat lagi.';
  }

  // ---------------- Unggah Foto (bucket Storage "foto-undangan") ----------------
  var FOTO_BUCKET = 'foto-undangan';
  var TIPE_FOTO_VALID = ['image/jpeg', 'image/png', 'image/webp'];
  var UKURAN_FOTO_MAKS = 5 * 1024 * 1024;

  function validasiFileFoto(file){
    if (!file) return 'File tidak valid.';
    if (TIPE_FOTO_VALID.indexOf(file.type) === -1) return 'Format file harus JPG, PNG, atau WEBP.';
    if (file.size > UKURAN_FOTO_MAKS) return 'Ukuran foto maksimal 5 MB. Coba perkecil dulu.';
    return null;
  }

  function friendlyStorageError(err){
    var msg = ((err && err.message) || '').toLowerCase();
    if (msg.indexOf('failed to fetch') !== -1 || msg.indexOf('network') !== -1) {
      return 'Gagal terhubung ke server. Periksa koneksi internetmu lalu coba lagi.';
    }
    if (msg.indexOf('exceed') !== -1 || msg.indexOf('too large') !== -1 || msg.indexOf('maximum allowed size') !== -1) {
      return 'Ukuran foto maksimal 5 MB. Coba perkecil dulu.';
    }
    return 'Gagal mengunggah foto. Silakan coba lagi.';
  }

  function extDariFile(file){
    var m = /\.([a-z0-9]+)$/i.exec(file.name || '');
    if (m) return m[1].toLowerCase();
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    return 'jpg';
  }

  // Path tunggal per slot (utama/pria/wanita) dipakai apa adanya (upsert)
  // supaya "Ganti" menimpa file yang sama kalau ekstensinya tidak
  // berubah; kalau ekstensi berubah, file lama tetap dibersihkan lewat
  // pathDariPublicUrl() di bawah sebelum menyimpan URL baru ke DB.
  function pathFotoTunggal(uid, invId, slotKey, file){
    return uid + '/' + invId + '/' + slotKey + '.' + extDariFile(file);
  }

  function pathFotoGaleri(uid, invId, file){
    return uid + '/' + invId + '/galeri/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + extDariFile(file);
  }

  function pathDariPublicUrl(url){
    if (!url) return null;
    var marker = '/object/public/' + FOTO_BUCKET + '/';
    var idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
  }

  function publicUrlFoto(path){
    var pub = KU.sb.storage.from(FOTO_BUCKET).getPublicUrl(path);
    // "?v=" cuma pemicu supaya browser & pratinjau selalu ambil versi
    // terbaru setelah foto diganti (path yang sama bisa balik dipakai
    // lewat upsert untuk foto tunggal), bukan dipakai balik oleh Storage.
    return pub.data.publicUrl + '?v=' + Date.now();
  }

  async function ensureDraftForTemplate(t){
    var session = KU.getSession();
    var uid = session.user.id;

    var existing = await KU.sb.from('invitations').select('*')
      .eq('user_id', uid).eq('status', 'draft')
      .order('created_at', { ascending: false }).limit(1);
    if (existing.error) return { error: existing.error };

    if (existing.data && existing.data.length) {
      var row = existing.data[0];
      if (row.kategori_desain !== t.kategori || row.nama_desain !== t.name) {
        var upd = await KU.sb.from('invitations')
          .update({ kategori_desain: t.kategori, nama_desain: t.name })
          .eq('id', row.id).select().single();
        if (upd.error) return { error: upd.error };
        return { data: upd.data };
      }
      return { data: row };
    }

    var ins = await KU.sb.from('invitations').insert({
      user_id: uid,
      status: 'draft',
      kategori_desain: t.kategori,
      nama_desain: t.name
    }).select().single();
    if (ins.error) return { error: ins.error };
    return { data: ins.data };
  }

  var FORM_FIELDS = [
    'nama_pria_panggilan', 'nama_wanita_panggilan', 'nama_pria_lengkap', 'nama_wanita_lengkap',
    'orangtua_pria', 'orangtua_wanita',
    'tanggal_akad', 'waktu_akad', 'tanggal_resepsi', 'waktu_resepsi',
    'lokasi_nama', 'lokasi_alamat', 'lokasi_maps_url',
    'kalimat_pembuka', 'kalimat_penutup',
    'nama_bank_1', 'no_rekening_1', 'pemilik_rekening_1',
    'nama_bank_2', 'no_rekening_2', 'pemilik_rekening_2'
  ];

  // Label dalam Bahasa Indonesia dipakai di ringkasan error saat Simpan
  // (mis. "Ada isian yang perlu diperbaiki: Link Google Maps, ...").
  var FIELD_LABELS = {
    tanggal_akad: 'Tanggal akad',
    tanggal_resepsi: 'Tanggal resepsi',
    lokasi_maps_url: 'Link Google Maps',
    no_rekening_1: 'Nomor rekening (Rekening 1)',
    no_rekening_2: 'Nomor rekening (Rekening 2)'
  };

  function validasiTanggal(v){
    if (!v) return null; // boleh kosong
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v + 'T00:00:00').getTime())) {
      return 'Tanggal tidak valid.';
    }
    return null;
  }

  function validasiMapsUrl(v){
    if (!v) return null; // boleh kosong
    var ok = false;
    try { var u = new URL(v); ok = (u.protocol === 'http:' || u.protocol === 'https:'); } catch (e) { ok = false; }
    if (!ok) return 'Harus berupa link, contoh: https://maps.google.com/...';
    return null;
  }

  function validasiRekening(v){
    if (!v) return null; // boleh kosong
    if (!/^[0-9]+$/.test(v)) return 'Nomor rekening hanya boleh berisi angka.';
    return null;
  }

  // Cuma field yang butuh validasi ekstra (di luar wajib/opsional biasa)
  // yang masuk daftar ini — field lain (nama, alamat, kalimat, dst) tidak
  // divalidasi format karena memang bebas isi apa saja.
  var FIELD_VALIDATORS = {
    tanggal_akad: validasiTanggal,
    tanggal_resepsi: validasiTanggal,
    lokasi_maps_url: validasiMapsUrl,
    no_rekening_1: validasiRekening,
    no_rekening_2: validasiRekening
  };

  // Divalidasi saat blur (keluar dari kolom) supaya user langsung tahu
  // ada yang salah, bukan cuma saat klik Simpan.
  function validasiField(nama){
    var el = wsForm && wsForm.elements[nama];
    var validator = FIELD_VALIDATORS[nama];
    if (!el || !validator) return true;
    var pesan = validator(el.value.trim());
    var fieldWrap = el.closest('.field');
    var errEl = document.getElementById('err_' + nama);
    if (fieldWrap) fieldWrap.classList.toggle('invalid', !!pesan);
    if (errEl) errEl.textContent = pesan || '';
    return !pesan;
  }

  function bersihkanSemuaFieldError(){
    Object.keys(FIELD_VALIDATORS).forEach(function(nama){
      var el = wsForm && wsForm.elements[nama];
      var fieldWrap = el && el.closest('.field');
      var errEl = document.getElementById('err_' + nama);
      if (fieldWrap) fieldWrap.classList.remove('invalid');
      if (errEl) errEl.textContent = '';
    });
  }

  function validasiSemuaField(){
    var namaTidakValid = [];
    Object.keys(FIELD_VALIDATORS).forEach(function(nama){
      if (!validasiField(nama)) namaTidakValid.push(nama);
    });
    return namaTidakValid;
  }

  // Palet warna per template — id template harus sama dengan id di
  // THEME_TEMPLATES. Setiap varian tetap dalam koridor karakter asli
  // template (sudah direview & disetujui): hanya suhu warna & logam
  // aksennya yang berbeda per varian, struktur token CSS asli utuh.
  var PALETTES = {
    'elegan-klasik/ivory-gold': [
      { id: 'rose-gold-ivory', name: 'Rose Gold Ivory', swatches: ['#FBF3EE', '#C98F7B', '#A66B57', '#F3DED6', '#2A2624'] },
      { id: 'platinum-ivory', name: 'Platinum Ivory', swatches: ['#F7F7F5', '#9BA0A6', '#767B82', '#E7E9EA', '#262626'] },
      { id: 'champagne-bronze', name: 'Champagne Bronze', swatches: ['#F5EBDA', '#A9713D', '#7E5327', '#EAD4AE', '#2A2118'] },
      { id: 'pearl-sage-gold', name: 'Pearl Sage Gold', swatches: ['#F5F3E9', '#A8926A', '#7F6C4C', '#E5E2CF', '#262622'] }
    ],
    'elegan-klasik/sage-rose': [
      { id: 'dusty-lavender-sage', name: 'Dusty Lavender Sage', swatches: ['#FAF6F3', '#B98CAE', '#916983', '#8E9483', '#372F35'] },
      { id: 'terracotta-sage', name: 'Terracotta Sage', swatches: ['#FBF3EA', '#C4785A', '#9E5B41', '#8B9A76', '#3A2F26'] },
      { id: 'powder-blue-sage', name: 'Powder Blue Sage', swatches: ['#F6F8F6', '#8FA3B3', '#6C8494', '#8FA087', '#333A3D'] },
      { id: 'antique-rose-gold', name: 'Antique Rose Gold', swatches: ['#FAF3EC', '#B97C68', '#8E5A48', '#7E8A6C', '#362B24'] }
    ],
    'elegan-klasik/emerald-dusk': [
      { id: 'sapphire-dusk', name: 'Sapphire Dusk', swatches: ['#0B1B2A', '#16324A', '#D8BB6B', '#F2E3DA', '#EDE7D8'] },
      { id: 'burgundy-dusk', name: 'Burgundy Dusk', swatches: ['#2A0F14', '#3D191F', '#D8A25B', '#F0D9B0', '#F0E3DD'] },
      { id: 'onyx-gold', name: 'Onyx Gold', swatches: ['#151412', '#242220', '#D8B463', '#F2E6C4', '#F1EDE4'] },
      { id: 'teal-midnight', name: 'Teal Midnight', swatches: ['#08201F', '#123330', '#CDAF63', '#EFE0AE', '#E7E9DE'] }
    ]
  };

  var wsBackBtn = document.getElementById('wsBackBtn');
  var wsKategori = document.getElementById('wsKategori');
  var wsNamaDesain = document.getElementById('wsNamaDesain');
  var wsTabs = document.getElementById('wsTabs');
  var wsTabButtons = wsTabs ? wsTabs.querySelectorAll('.ws-tab') : [];
  var wsForm = document.getElementById('wsForm');
  var wsSaveBtn = document.getElementById('wsSaveBtn');
  var wsSaveMsg = document.getElementById('wsSaveMsg');
  var wsTabNames = ['isi-data', 'desain', 'pratinjau', 'bagikan', 'tamu'];

  // Ditandai true tiap kali ada input di tab Isi Data yang belum
  // disimpan, dipakai confirmLeaveWorkspace() untuk menahan navigasi
  // keluar workspace (sidebar/tabbar/tombol kembali) sampai user
  // memastikan mau membuang perubahan itu.
  var wsFormDirty = false;

  var paletteTemplateName = document.getElementById('paletteTemplateName');
  var paletteGrid = document.getElementById('paletteGrid');
  var paletteMsg = document.getElementById('paletteMsg');

  var pratinjauFrame = document.getElementById('pratinjauFrame');
  var pratinjauEditBtn = document.getElementById('pratinjauEditBtn');

  var slugInput = document.getElementById('f_slug');
  var slugSaveBtn = document.getElementById('slugSaveBtn');
  var slugMsg = document.getElementById('slugMsg');
  var statusBadge = document.getElementById('statusBadge');
  var activateBtn = document.getElementById('activateBtn');
  var deactivateBtn = document.getElementById('deactivateBtn');
  var activateChecklist = document.getElementById('activateChecklist');
  var statusMsg = document.getElementById('statusMsg');
  var shareLockedBlock = document.getElementById('shareLockedBlock');
  var shareActiveBlock = document.getElementById('shareActiveBlock');
  var shareUrlInput = document.getElementById('shareUrlInput');
  var copyLinkBtn = document.getElementById('copyLinkBtn');
  var copyMsg = document.getElementById('copyMsg');
  var shareWaBtn = document.getElementById('shareWaBtn');

  var statHadir = document.getElementById('statHadir');
  var statTidakHadir = document.getElementById('statTidakHadir');
  var statJumlahTamu = document.getElementById('statJumlahTamu');
  var rsvpTableBody = document.getElementById('rsvpTableBody');
  var rsvpTable = document.getElementById('rsvpTable');
  var rsvpEmptyMsg = document.getElementById('rsvpEmptyMsg');
  var ucapanAdminList = document.getElementById('ucapanAdminList');
  var ucapanEmptyMsg = document.getElementById('ucapanEmptyMsg');
  var tamuMsg = document.getElementById('tamuMsg');

  // Domain publik tetap (bukan window.location.origin) karena halaman
  // publik /u/[slug] belum dibangun — link ini menunjuk ke domain final
  // situs, bukan host tempat workspace ini sedang dijalankan (mis. saat
  // diuji lewat localhost).
  var PUBLIC_BASE_URL = 'https://kartuundangan.link';

  var currentInvitation = null;
  var currentTemplateMeta = null;

  // ---------------- Unggah Foto: unggah/ganti/hapus foto tunggal ----------------
  // (utama/pria/wanita menyimpan langsung ke DB begitu selesai diunggah,
  // terpisah dari FORM_FIELDS/tombol Simpan — sama seperti pola Palet
  // Warna yang juga tersimpan seketika saat diklik.)
  async function unggahFotoTunggal(kolom, slotKey, file){
    var pesan = validasiFileFoto(file);
    if (pesan) return { error: pesan };
    var session = KU.getSession();
    if (!session || !currentInvitation) return { error: 'Sesi login sudah berakhir. Silakan muat ulang halaman.' };
    var uid = session.user.id;
    var path = pathFotoTunggal(uid, currentInvitation.id, slotKey, file);
    var pathLama = pathDariPublicUrl(currentInvitation[kolom]);
    var up = await KU.sb.storage.from(FOTO_BUCKET).upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) return { error: friendlyStorageError(up.error) };
    var urlBaru = publicUrlFoto(path);
    var payload = {};
    payload[kolom] = urlBaru;
    var res = await KU.sb.from('invitations').update(payload).eq('id', currentInvitation.id).select().single();
    if (res.error) {
      await KU.sb.storage.from(FOTO_BUCKET).remove([path]);
      return { error: friendlyErrorMessage(res.error) };
    }
    currentInvitation = res.data;
    if (pathLama && pathLama !== path) KU.sb.storage.from(FOTO_BUCKET).remove([pathLama]).then(function(){});
    return { data: urlBaru };
  }

  async function hapusFotoTunggal(kolom){
    if (!currentInvitation) return { error: 'Sesi login sudah berakhir. Silakan muat ulang halaman.' };
    var pathLama = pathDariPublicUrl(currentInvitation[kolom]);
    var payload = {};
    payload[kolom] = null;
    var res = await KU.sb.from('invitations').update(payload).eq('id', currentInvitation.id).select().single();
    if (res.error) return { error: friendlyErrorMessage(res.error) };
    currentInvitation = res.data;
    if (pathLama) KU.sb.storage.from(FOTO_BUCKET).remove([pathLama]).then(function(){});
    return { data: true };
  }

  function setupFotoTunggal(opts){
    var input = document.getElementById(opts.inputId);
    var zone = document.getElementById(opts.zoneId);
    var preview = document.getElementById(opts.previewId);
    var img = document.getElementById(opts.imgId);
    var statusEl = document.getElementById(opts.statusId);
    if (!input || !zone || !preview || !img) return { tampilkan: function(){} };

    function tampilkanStatus(text, type){
      if (!statusEl) return;
      statusEl.textContent = text || '';
      statusEl.className = 'foto-upload-status' + (type ? ' ' + type : '');
    }

    function tampilkan(url){
      if (url) {
        img.src = url;
        preview.hidden = false;
        zone.hidden = true;
      } else {
        img.removeAttribute('src');
        preview.hidden = true;
        zone.hidden = false;
      }
    }

    async function prosesFile(file){
      if (!file) return;
      zone.classList.add('disabled');
      tampilkanStatus('Mengunggah...');
      var hasil = await unggahFotoTunggal(opts.kolom, opts.slotKey, file);
      zone.classList.remove('disabled');
      if (hasil.error) { tampilkanStatus(hasil.error, 'err'); return; }
      tampilkan(hasil.data);
      tampilkanStatus('Tersimpan!', 'ok');
    }

    zone.addEventListener('click', function(){ input.click(); });
    zone.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', function(){ zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function(e){
      e.preventDefault();
      zone.classList.remove('dragover');
      var file = e.dataTransfer.files && e.dataTransfer.files[0];
      prosesFile(file);
    });
    input.addEventListener('change', function(){
      prosesFile(input.files && input.files[0]);
      input.value = '';
    });
    preview.addEventListener('click', async function(e){
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      if (btn.dataset.act === 'ganti') { input.click(); return; }
      if (btn.dataset.act === 'hapus') {
        var ok = await KU.confirmAction({ title: 'Hapus Foto', text: 'Yakin mau menghapus foto ini?', okText: 'Ya, Hapus' });
        if (!ok) return;
        tampilkanStatus('Menghapus...');
        var hasil = await hapusFotoTunggal(opts.kolom);
        if (hasil.error) { tampilkanStatus(hasil.error, 'err'); return; }
        tampilkan(null);
        tampilkanStatus('');
      }
    });

    return { tampilkan: tampilkan };
  }

  var fotoUtamaCtrl = setupFotoTunggal({
    kolom: 'foto_utama_url', slotKey: 'utama',
    inputId: 'input_foto_utama_url', zoneId: 'zone_foto_utama_url',
    previewId: 'preview_foto_utama_url', imgId: 'img_foto_utama_url', statusId: 'status_foto_utama_url'
  });
  var fotoPriaCtrl = setupFotoTunggal({
    kolom: 'foto_pria_url', slotKey: 'foto-pria',
    inputId: 'input_foto_pria_url', zoneId: 'zone_foto_pria_url',
    previewId: 'preview_foto_pria_url', imgId: 'img_foto_pria_url', statusId: 'status_foto_pria_url'
  });
  var fotoWanitaCtrl = setupFotoTunggal({
    kolom: 'foto_wanita_url', slotKey: 'foto-wanita',
    inputId: 'input_foto_wanita_url', zoneId: 'zone_foto_wanita_url',
    previewId: 'preview_foto_wanita_url', imgId: 'img_foto_wanita_url', statusId: 'status_foto_wanita_url'
  });

  // ---------------- Unggah Foto: galeri (banyak foto) ----------------
  var galeriInput = document.getElementById('galeriInput');
  var galeriZone = document.getElementById('galeriZone');
  var galeriHint = document.getElementById('galeriHint');
  var galeriGridUpload = document.getElementById('galeriGridUpload');
  var galeriStatus = document.getElementById('galeriStatus');
  var GALERI_MAKS = 6;

  function tampilkanGaleriStatus(text, type){
    if (!galeriStatus) return;
    galeriStatus.textContent = text || '';
    galeriStatus.className = 'foto-upload-status' + (type ? ' ' + type : '');
  }

  function renderGaleriGrid(){
    if (!galeriGridUpload) return;
    galeriGridUpload.innerHTML = '';
    var daftar = (currentInvitation && currentInvitation.foto_galeri) || [];
    daftar.forEach(function(url, i){
      var thumb = document.createElement('div');
      thumb.className = 'foto-galeri-thumb';
      var img = document.createElement('img');
      img.src = url;
      img.alt = 'Foto galeri ' + (i + 1);
      var hapusBtn = document.createElement('button');
      hapusBtn.type = 'button';
      hapusBtn.className = 'foto-galeri-remove';
      hapusBtn.dataset.index = String(i);
      hapusBtn.setAttribute('aria-label', 'Hapus foto ini');
      hapusBtn.innerHTML = '&times;';
      thumb.append(img, hapusBtn);
      galeriGridUpload.appendChild(thumb);
    });
    var penuh = daftar.length >= GALERI_MAKS;
    if (galeriZone) galeriZone.classList.toggle('disabled', penuh);
    if (galeriHint) {
      galeriHint.textContent = penuh
        ? 'Galeri sudah penuh (' + GALERI_MAKS + '/' + GALERI_MAKS + ' foto). Hapus salah satu untuk menambah yang baru.'
        : 'JPG, PNG, atau WEBP · maks 5 MB per foto · ' + daftar.length + '/' + GALERI_MAKS + ' foto';
    }
  }

  async function prosesFileGaleri(fileList){
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length || !currentInvitation) return;
    var daftarSekarang = currentInvitation.foto_galeri || [];
    var sisaSlot = GALERI_MAKS - daftarSekarang.length;
    if (sisaSlot <= 0) { tampilkanGaleriStatus('Galeri sudah penuh (' + GALERI_MAKS + '/' + GALERI_MAKS + ' foto).', 'err'); return; }

    var valid = [];
    var pesanTerakhir = '';
    for (var i = 0; i < files.length; i++) {
      if (valid.length >= sisaSlot) { pesanTerakhir = 'Hanya ' + sisaSlot + ' foto yang ditambahkan karena galeri maksimal ' + GALERI_MAKS + ' foto.'; break; }
      var err = validasiFileFoto(files[i]);
      if (err) { pesanTerakhir = files[i].name + ': ' + err; continue; }
      valid.push(files[i]);
    }
    if (!valid.length) { tampilkanGaleriStatus(pesanTerakhir || 'Tidak ada foto yang valid untuk diunggah.', 'err'); return; }

    galeriZone.classList.add('disabled');
    tampilkanGaleriStatus('Mengunggah ' + valid.length + ' foto...');
    var session = KU.getSession();
    var uid = session.user.id;
    var urlBaru = [];
    for (var j = 0; j < valid.length; j++) {
      var path = pathFotoGaleri(uid, currentInvitation.id, valid[j]);
      var up = await KU.sb.storage.from(FOTO_BUCKET).upload(path, valid[j], { contentType: valid[j].type });
      if (up.error) { pesanTerakhir = 'Gagal mengunggah salah satu foto: ' + friendlyStorageError(up.error); continue; }
      urlBaru.push(publicUrlFoto(path));
    }
    galeriZone.classList.remove('disabled');
    if (!urlBaru.length) { tampilkanGaleriStatus(pesanTerakhir || 'Gagal mengunggah foto.', 'err'); return; }

    var gabungan = daftarSekarang.concat(urlBaru);
    var res = await KU.sb.from('invitations').update({ foto_galeri: gabungan }).eq('id', currentInvitation.id).select().single();
    if (res.error) { tampilkanGaleriStatus('Gagal menyimpan: ' + friendlyErrorMessage(res.error), 'err'); return; }
    currentInvitation = res.data;
    renderGaleriGrid();
    tampilkanGaleriStatus(pesanTerakhir || 'Tersimpan!', pesanTerakhir ? 'err' : 'ok');
  }

  if (galeriZone && galeriInput) {
    galeriZone.addEventListener('click', function(){ galeriInput.click(); });
    galeriZone.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); galeriInput.click(); }
    });
    galeriZone.addEventListener('dragover', function(e){ e.preventDefault(); galeriZone.classList.add('dragover'); });
    galeriZone.addEventListener('dragleave', function(){ galeriZone.classList.remove('dragover'); });
    galeriZone.addEventListener('drop', function(e){
      e.preventDefault();
      galeriZone.classList.remove('dragover');
      prosesFileGaleri(e.dataTransfer.files);
    });
    galeriInput.addEventListener('change', function(){
      prosesFileGaleri(galeriInput.files);
      galeriInput.value = '';
    });
  }

  if (galeriGridUpload) {
    galeriGridUpload.addEventListener('click', async function(e){
      var btn = e.target.closest('.foto-galeri-remove');
      if (!btn || !currentInvitation) return;
      var idx = parseInt(btn.dataset.index, 10);
      var daftar = (currentInvitation.foto_galeri || []).slice();
      var url = daftar[idx];
      if (url === undefined) return;
      var ok = await KU.confirmAction({ title: 'Hapus Foto', text: 'Yakin mau menghapus foto ini dari galeri?', okText: 'Ya, Hapus' });
      if (!ok) return;
      daftar.splice(idx, 1);
      tampilkanGaleriStatus('Menghapus...');
      var res = await KU.sb.from('invitations').update({ foto_galeri: daftar }).eq('id', currentInvitation.id).select().single();
      if (res.error) { tampilkanGaleriStatus('Gagal menghapus: ' + friendlyErrorMessage(res.error), 'err'); return; }
      currentInvitation = res.data;
      renderGaleriGrid();
      tampilkanGaleriStatus('');
      var path = pathDariPublicUrl(url);
      if (path) KU.sb.storage.from(FOTO_BUCKET).remove([path]).then(function(){});
    });
  }

  function hydrateFotoWorkspace(inv){
    fotoUtamaCtrl.tampilkan(inv ? inv.foto_utama_url : null);
    fotoPriaCtrl.tampilkan(inv ? inv.foto_pria_url : null);
    fotoWanitaCtrl.tampilkan(inv ? inv.foto_wanita_url : null);
    renderGaleriGrid();
  }

  function showWsSaveMsg(text, type){
    if (!wsSaveMsg) return;
    wsSaveMsg.textContent = text || '';
    wsSaveMsg.className = 'ws-save-msg' + (type ? ' ' + type : '');
  }

  function showWsTab(tab, persist){
    if (wsTabNames.indexOf(tab) === -1) tab = 'isi-data';
    wsTabButtons.forEach(function(b){ b.classList.toggle('active', b.dataset.tab === tab); });
    wsTabNames.forEach(function(name){
      var panel = document.getElementById('wsPanel-' + name);
      if (panel) panel.classList.toggle('active', name === tab);
    });
    if (tab === 'pratinjau') loadPratinjauFrame();
    if (tab === 'bagikan') renderBagikanTab();
    if (tab === 'tamu') loadTamuTab();
    if (persist && currentInvitation && currentInvitation.last_active_tab !== tab) {
      currentInvitation.last_active_tab = tab;
      KU.sb.from('invitations').update({ last_active_tab: tab }).eq('id', currentInvitation.id).then(function(){});
    }
  }

  function loadPratinjauFrame(){
    if (!pratinjauFrame || !currentInvitation || !currentTemplateMeta) return;
    // parameter "_t" cuma pemicu reload penuh (bukan dipakai pratinjau.html)
    // supaya data terbaru selalu diambil ulang tiap kali tab ini dibuka,
    // bukan menampilkan hasil fetch lama dari kunjungan sebelumnya.
    pratinjauFrame.src = 'templates/pratinjau.html?tema=' + encodeURIComponent(currentTemplateMeta.id) +
      '&invitation_id=' + encodeURIComponent(currentInvitation.id) +
      '&_t=' + Date.now();
  }

  // ---------------- Tab Bagikan (slug, status, link) ----------------
  var DIACRITIC_RE = /[̀-ͯ]/g;
  function slugify(s){
    return (s || '').toString().toLowerCase()
      .normalize('NFD').replace(DIACRITIC_RE, '') // lepas diakritik
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function buildSlugBase(inv){
    var base = slugify([slugify(inv.nama_pria_panggilan), slugify(inv.nama_wanita_panggilan)].filter(Boolean).join('-'));
    return base || 'undangan';
  }

  // RLS invitations hanya mengizinkan SELECT baris milik sendiri, jadi
  // tidak bisa cek slug user lain lewat query — cara satu-satunya adalah
  // coba UPDATE dan tangkap error unique violation (23505) dari kolom
  // slug, lalu coba lagi dengan akhiran angka berikutnya.
  async function ensureUniqueSlug(base){
    for (var n = 1; n <= 30; n++){
      var trySlug = n === 1 ? base : base + '-' + n;
      var res = await KU.sb.from('invitations').update({ slug: trySlug }).eq('id', currentInvitation.id).select().single();
      if (!res.error) return { data: res.data };
      if (res.error.code !== '23505') return { error: res.error };
    }
    var fallback = base + '-' + Math.random().toString(36).slice(2, 6);
    var res2 = await KU.sb.from('invitations').update({ slug: fallback }).eq('id', currentInvitation.id).select().single();
    return res2.error ? { error: res2.error } : { data: res2.data };
  }

  async function autoGenerateSlugIfNeeded(){
    if (!currentInvitation || currentInvitation.slug) return;
    if (!currentInvitation.nama_pria_panggilan || !currentInvitation.nama_wanita_panggilan) return;
    var res = await ensureUniqueSlug(buildSlugBase(currentInvitation));
    if (res.error) return;
    currentInvitation = res.data;
  }

  function showSlugMsg(text, type){
    if (!slugMsg) return;
    slugMsg.textContent = text || '';
    slugMsg.className = 'ws-save-msg' + (type ? ' ' + type : '');
  }

  function showStatusMsg(text, type){
    if (!statusMsg) return;
    statusMsg.textContent = text || '';
    statusMsg.className = 'ws-save-msg' + (type ? ' ' + type : '');
  }

  function showCopyMsg(text, type){
    if (!copyMsg) return;
    copyMsg.textContent = text || '';
    copyMsg.className = 'ws-save-msg' + (type ? ' ' + type : '');
  }

  var REQUIRED_FOR_AKTIF = [
    { ok: function(inv){ return !!inv.nama_pria_panggilan; }, label: 'Nama panggilan pria' },
    { ok: function(inv){ return !!inv.nama_wanita_panggilan; }, label: 'Nama panggilan wanita' },
    { ok: function(inv){ return !!(inv.tanggal_akad || inv.tanggal_resepsi); }, label: 'Tanggal akad atau resepsi' },
    { ok: function(inv){ return !!inv.lokasi_nama; }, label: 'Nama lokasi acara' }
  ];

  function getMissingRequiredFields(inv){
    return REQUIRED_FOR_AKTIF.filter(function(r){ return !r.ok(inv); }).map(function(r){ return r.label; });
  }

  function renderActivateChecklist(missing){
    if (!activateChecklist) return;
    activateChecklist.innerHTML = '';
    missing.forEach(function(label){
      var li = document.createElement('li');
      li.textContent = label;
      activateChecklist.appendChild(li);
    });
    activateChecklist.style.display = missing.length ? 'block' : 'none';
  }

  function renderBagikanShare(inv){
    var isAktif = inv.status === 'aktif';
    if (shareLockedBlock) shareLockedBlock.style.display = isAktif ? 'none' : 'block';
    if (shareActiveBlock) shareActiveBlock.style.display = isAktif ? 'block' : 'none';
    if (!isAktif || !inv.slug) return;

    var url = PUBLIC_BASE_URL + '/u/' + inv.slug;
    if (shareUrlInput) shareUrlInput.value = url;

    var namaPria = inv.nama_pria_panggilan || '';
    var namaWanita = inv.nama_wanita_panggilan || '';
    var waText = 'Dengan penuh sukacita, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di pernikahan kami, ' +
      namaPria + ' & ' + namaWanita + '.\n\nInformasi lengkap acara dapat dilihat di:\n' + url;
    if (shareWaBtn) shareWaBtn.href = 'https://wa.me/?text=' + encodeURIComponent(waText);
  }

  async function renderBagikanTab(){
    if (!currentInvitation) return;
    renderActivateChecklist([]);
    showStatusMsg('');
    showSlugMsg('');
    showCopyMsg('');

    await autoGenerateSlugIfNeeded();

    if (slugInput) slugInput.value = currentInvitation.slug || '';

    var isAktif = currentInvitation.status === 'aktif';
    if (statusBadge) {
      statusBadge.textContent = isAktif ? 'Aktif' : 'Draf';
      statusBadge.classList.toggle('badge-aktif', isAktif);
    }
    if (activateBtn) activateBtn.style.display = isAktif ? 'none' : 'inline-flex';
    if (deactivateBtn) deactivateBtn.style.display = isAktif ? 'inline-flex' : 'none';

    renderBagikanShare(currentInvitation);
  }

  if (slugSaveBtn) {
    slugSaveBtn.addEventListener('click', async function(){
      if (!currentInvitation) return;
      var raw = (slugInput.value || '').trim().toLowerCase();
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw)) {
        showSlugMsg('Slug hanya boleh huruf kecil, angka, dan tanda hubung, tanpa spasi (mis. bagus-wulandari).', 'err');
        return;
      }
      slugSaveBtn.disabled = true;
      showSlugMsg('Menyimpan...');
      var res = await KU.sb.from('invitations').update({ slug: raw }).eq('id', currentInvitation.id).select().single();
      slugSaveBtn.disabled = false;
      if (res.error) {
        if (res.error.code === '23505') { showSlugMsg('Slug ini sudah dipakai orang lain. Coba slug lain.', 'err'); return; }
        showSlugMsg('Gagal menyimpan: ' + friendlyErrorMessage(res.error), 'err');
        return;
      }
      currentInvitation = res.data;
      slugInput.value = currentInvitation.slug || '';
      showSlugMsg('Tersimpan!', 'ok');
      renderBagikanShare(currentInvitation);
    });
  }

  if (activateBtn) {
    activateBtn.addEventListener('click', async function(){
      if (!currentInvitation) return;
      var missing = getMissingRequiredFields(currentInvitation);
      if (missing.length) {
        renderActivateChecklist(missing);
        showStatusMsg('Lengkapi dulu data yang kurang di tab Isi Data sebelum mengaktifkan undangan.', 'err');
        return;
      }
      renderActivateChecklist([]);
      activateBtn.disabled = true;
      showStatusMsg('Mengaktifkan...');

      if (!currentInvitation.slug) {
        var slugRes = await ensureUniqueSlug(buildSlugBase(currentInvitation));
        if (slugRes.error) {
          activateBtn.disabled = false;
          showStatusMsg('Gagal membuat alamat undangan: ' + friendlyErrorMessage(slugRes.error), 'err');
          return;
        }
        currentInvitation = slugRes.data;
        if (slugInput) slugInput.value = currentInvitation.slug || '';
      }

      var res = await KU.sb.from('invitations').update({ status: 'aktif' }).eq('id', currentInvitation.id).select().single();
      activateBtn.disabled = false;
      if (res.error) { showStatusMsg('Gagal mengaktifkan: ' + friendlyErrorMessage(res.error), 'err'); return; }
      currentInvitation = res.data;
      showStatusMsg('Undangan aktif! Sekarang bisa dibagikan ke tamu.', 'ok');
      renderBagikanTab();
    });
  }

  if (deactivateBtn) {
    deactivateBtn.addEventListener('click', async function(){
      if (!currentInvitation) return;
      var ok = await KU.confirmAction({
        title: 'Nonaktifkan Undangan?',
        text: 'Undangan akan kembali ke status Draf dan tamu tidak bisa membuka link-nya lagi sampai kamu aktifkan ulang.',
        okText: 'Ya, Nonaktifkan'
      });
      if (!ok) return;
      deactivateBtn.disabled = true;
      showStatusMsg('Menonaktifkan...');
      var res = await KU.sb.from('invitations').update({ status: 'draft' }).eq('id', currentInvitation.id).select().single();
      deactivateBtn.disabled = false;
      if (res.error) { showStatusMsg('Gagal menonaktifkan: ' + friendlyErrorMessage(res.error), 'err'); return; }
      currentInvitation = res.data;
      showStatusMsg('Undangan dinonaktifkan.', 'ok');
      renderBagikanTab();
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async function(){
      if (!shareUrlInput || !shareUrlInput.value) return;
      try {
        await navigator.clipboard.writeText(shareUrlInput.value);
        showCopyMsg('Link disalin!', 'ok');
      } catch (e) {
        try {
          shareUrlInput.select();
          document.execCommand('copy');
          showCopyMsg('Link disalin!', 'ok');
        } catch (e2) {
          showCopyMsg('Gagal menyalin otomatis. Salin manual dari kolom di atas.', 'err');
        }
      }
    });
  }

  // ---------------- Tab Tamu & Ucapan (RSVP + ucapan tamu, khusus pemilik) ----------------
  function showTamuMsg(text, type){
    if (!tamuMsg) return;
    tamuMsg.textContent = text || '';
    tamuMsg.className = 'ws-save-msg' + (type ? ' ' + type : '');
  }

  function formatWaktuSingkat(iso){
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    var bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var jam = String(d.getHours()).padStart(2, '0');
    var menit = String(d.getMinutes()).padStart(2, '0');
    return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear() + ', ' + jam + ':' + menit;
  }

  var PIHAK_LABEL = { pria: 'Pihak Pria', wanita: 'Pihak Wanita' };

  function renderRsvpSummaryDanTabel(daftar){
    var hadir = 0, tidakHadir = 0, jumlahTamu = 0;
    daftar.forEach(function(r){
      if (r.kehadiran === 'hadir') { hadir++; jumlahTamu += (r.jumlah_tamu || 0); }
      else if (r.kehadiran === 'tidak_hadir') { tidakHadir++; }
    });
    if (statHadir) statHadir.textContent = String(hadir);
    if (statTidakHadir) statTidakHadir.textContent = String(tidakHadir);
    if (statJumlahTamu) statJumlahTamu.textContent = String(jumlahTamu);

    if (!rsvpTableBody) return;
    rsvpTableBody.innerHTML = '';
    var kosong = daftar.length === 0;
    if (rsvpTable) rsvpTable.style.display = kosong ? 'none' : '';
    if (rsvpEmptyMsg) rsvpEmptyMsg.style.display = kosong ? '' : 'none';
    if (kosong) return;

    daftar.forEach(function(r){
      var tr = document.createElement('tr');

      var tdNama = document.createElement('td');
      tdNama.textContent = r.nama_tamu;
      tr.appendChild(tdNama);

      var tdPihak = document.createElement('td');
      tdPihak.textContent = PIHAK_LABEL[r.pihak] || '-';
      tr.appendChild(tdPihak);

      var tdKehadiran = document.createElement('td');
      var badge = document.createElement('span');
      badge.className = 'rsvp-badge ' + (r.kehadiran === 'hadir' ? 'rsvp-badge-hadir' : 'rsvp-badge-tidak');
      badge.textContent = r.kehadiran === 'hadir' ? 'Hadir' : 'Tidak Hadir';
      tdKehadiran.appendChild(badge);
      tr.appendChild(tdKehadiran);

      var tdJumlah = document.createElement('td');
      tdJumlah.textContent = String(r.jumlah_tamu || 0);
      tr.appendChild(tdJumlah);

      var tdWaktu = document.createElement('td');
      tdWaktu.textContent = formatWaktuSingkat(r.created_at);
      tr.appendChild(tdWaktu);

      rsvpTableBody.appendChild(tr);
    });
  }

  function buatUcapanAdminItem(row){
    var item = document.createElement('div');
    item.className = 'ucapan-admin-item';

    var body = document.createElement('div');
    body.className = 'ucapan-admin-body';
    var head = document.createElement('div');
    head.className = 'ucapan-admin-head';
    var nama = document.createElement('span');
    nama.className = 'ucapan-admin-name';
    nama.textContent = row.nama;
    var waktu = document.createElement('span');
    waktu.className = 'ucapan-admin-time';
    waktu.textContent = formatWaktuSingkat(row.created_at);
    head.appendChild(nama);
    head.appendChild(waktu);
    var teks = document.createElement('p');
    teks.className = 'ucapan-admin-text';
    teks.textContent = row.pesan;
    body.appendChild(head);
    body.appendChild(teks);

    var hapusBtn = document.createElement('button');
    hapusBtn.type = 'button';
    hapusBtn.className = 'ucapan-admin-delete';
    hapusBtn.setAttribute('aria-label', 'Hapus ucapan dari ' + row.nama);
    hapusBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>';
    hapusBtn.addEventListener('click', async function(){
      var ok = await KU.confirmAction({ title: 'Hapus Ucapan', text: 'Ucapan dari "' + row.nama + '" akan dihapus permanen.', okText: 'Ya, Hapus' });
      if (!ok) return;
      hapusBtn.disabled = true;
      var res = await KU.sb.from('ucapan').delete().eq('id', row.id);
      if (res.error) {
        showTamuMsg('Gagal menghapus ucapan: ' + friendlyErrorMessage(res.error), 'err');
        hapusBtn.disabled = false;
        return;
      }
      item.remove();
      if (ucapanAdminList && !ucapanAdminList.children.length && ucapanEmptyMsg) ucapanEmptyMsg.style.display = '';
    });

    item.appendChild(body);
    item.appendChild(hapusBtn);
    return item;
  }

  function renderUcapanAdminList(daftar){
    if (!ucapanAdminList) return;
    ucapanAdminList.innerHTML = '';
    var kosong = daftar.length === 0;
    if (ucapanEmptyMsg) ucapanEmptyMsg.style.display = kosong ? '' : 'none';
    daftar.forEach(function(row){ ucapanAdminList.appendChild(buatUcapanAdminItem(row)); });
  }

  async function loadTamuTab(){
    if (!currentInvitation) return;
    showTamuMsg('Memuat data tamu...');
    var rsvpRes = await KU.sb.from('rsvp').select('*').eq('invitation_id', currentInvitation.id).order('created_at', { ascending: false });
    var ucapanRes = await KU.sb.from('ucapan').select('*').eq('invitation_id', currentInvitation.id).order('created_at', { ascending: false });

    if (rsvpRes.error || ucapanRes.error) {
      showTamuMsg('Gagal memuat data tamu: ' + friendlyErrorMessage(rsvpRes.error || ucapanRes.error), 'err');
      return;
    }
    renderRsvpSummaryDanTabel(rsvpRes.data || []);
    renderUcapanAdminList(ucapanRes.data || []);
    showTamuMsg('');
  }

  function populateForm(inv){
    FORM_FIELDS.forEach(function(f){
      var el = wsForm.elements[f];
      if (!el) return;
      el.value = (inv && inv[f] != null) ? inv[f] : '';
    });
    bersihkanSemuaFieldError();
    showWsSaveMsg('');
    hydrateFotoWorkspace(inv);
    wsFormDirty = false;
  }

  if (wsForm) {
    Object.keys(FIELD_VALIDATORS).forEach(function(nama){
      var el = wsForm.elements[nama];
      if (el) el.addEventListener('blur', function(){ validasiField(nama); });
    });
    wsForm.addEventListener('input', function(){ wsFormDirty = true; });
  }

  // Dipanggil sebelum navigasi apa pun yang meninggalkan workspace
  // (sidebar/tabbar, tombol kembali). Kalau tab Isi Data belum
  // disimpan, tanya dulu lewat modal konfirmasi yang sama dipakai
  // logout/hapus, supaya perubahan tidak hilang tanpa sadar.
  function confirmLeaveWorkspace(){
    var workspaceOpen = document.getElementById('view-workspace').classList.contains('active');
    if (!workspaceOpen || !wsFormDirty) return Promise.resolve(true);
    return KU.confirmAction({
      title: 'Perubahan Belum Disimpan',
      text: 'Ada perubahan pada Isi Data yang belum disimpan. Yakin mau meninggalkan halaman ini? Perubahan akan hilang.',
      okText: 'Ya, Tinggalkan'
    });
  }

  window.addEventListener('beforeunload', function(e){
    if (document.getElementById('view-workspace').classList.contains('active') && wsFormDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  function showWorkspaceView(){
    views.forEach(function(v){
      document.getElementById('view-' + v).classList.remove('active');
    });
    document.getElementById('view-workspace').classList.add('active');
    // Workspace dianggap bagian dari "Desain Kamu" — sorot menu itu &
    // pindahkan pill supaya jelas posisi user saat sedang mengedit.
    viewLinks.forEach(function(a){ a.classList.toggle('active', a.dataset.view === 'desain'); });
    movePill('desain');
  }

  function showPaletteMsg(text, type){
    if (!paletteMsg) return;
    paletteMsg.textContent = text || '';
    paletteMsg.className = 'ws-save-msg' + (type ? ' ' + type : '');
  }

  function renderPaletteGrid(){
    if (!paletteGrid) return;
    paletteGrid.innerHTML = '';
    showPaletteMsg('');
    if (paletteTemplateName) paletteTemplateName.textContent = currentTemplateMeta ? currentTemplateMeta.name : '';
    var list = currentTemplateMeta ? (PALETTES[currentTemplateMeta.id] || []) : [];
    var activeId = currentInvitation && currentInvitation.data && currentInvitation.data.palet;
    list.forEach(function(p){
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'palette-card' + (p.id === activeId ? ' selected' : '');
      card.dataset.id = p.id;

      var sw = document.createElement('div');
      sw.className = 'palette-swatches';
      p.swatches.forEach(function(hex){
        var dot = document.createElement('span');
        dot.className = 'palette-swatch';
        dot.style.background = hex;
        sw.appendChild(dot);
      });

      var row = document.createElement('div');
      row.className = 'palette-name-row';
      var nm = document.createElement('span');
      nm.className = 'palette-name';
      nm.textContent = p.name;
      var check = document.createElement('span');
      check.className = 'palette-check';
      check.textContent = '✓';
      row.append(nm, check);

      card.append(sw, row);
      paletteGrid.appendChild(card);
    });
  }

  if (paletteGrid) {
    paletteGrid.addEventListener('click', async function(e){
      var btn = e.target.closest('.palette-card');
      if (!btn || !currentInvitation) return;
      var id = btn.dataset.id;
      var already = currentInvitation.data && currentInvitation.data.palet === id;
      if (already) return;
      Array.prototype.forEach.call(paletteGrid.querySelectorAll('.palette-card'), function(b){
        b.classList.toggle('selected', b === btn);
      });
      showPaletteMsg('Menyimpan...');
      var res = await KU.sb.from('invitations').update({ data: { palet: id } }).eq('id', currentInvitation.id).select().single();
      if (res.error) { showPaletteMsg('Gagal menyimpan: ' + friendlyErrorMessage(res.error), 'err'); return; }
      currentInvitation = res.data;
      showPaletteMsg('Tersimpan!', 'ok');
    });
  }

  // Header workspace menampilkan nama pasangan (bukan cuma nama
  // template) supaya jelas undangan mana yang sedang diedit, terutama
  // kalau nanti user punya lebih dari satu undangan.
  function invitationDisplayName(inv){
    var pria = inv && inv.nama_pria_panggilan;
    var wanita = inv && inv.nama_wanita_panggilan;
    if (pria && wanita) return pria + ' & ' + wanita;
    if (pria || wanita) return pria || wanita;
    return 'Undangan Baru';
  }

  function updateWsHeader(){
    if (!currentInvitation || !currentTemplateMeta) return;
    wsKategori.textContent = currentTemplateMeta.kategori + ' · ' + currentTemplateMeta.name;
    wsNamaDesain.textContent = invitationDisplayName(currentInvitation);
  }

  function openWorkspace(invitation, template){
    currentInvitation = invitation;
    currentTemplateMeta = template;
    updateWsHeader();
    populateForm(invitation);
    renderPaletteGrid();
    showWsTab(invitation.last_active_tab || 'isi-data', false);
    showWorkspaceView();
  }

  // ---------------- Desain Kamu (jalan pulang ke workspace) ----------------
  // "Desain Kamu" jadi hub untuk kembali ke undangan yang sedang
  // dikerjakan tanpa harus lewat grid Template Tema lagi.
  var desainEmptyState = document.getElementById('desainEmptyState');
  var desainContinueBlock = document.getElementById('desainContinueBlock');
  var desainInvitationCard = document.getElementById('desainInvitationCard');
  var createInvitationBtn = document.getElementById('createInvitationBtn');

  function findTemplateMetaForInvitation(inv){
    return THEME_TEMPLATES.filter(function(t){
      return t.kategori === inv.kategori_desain && t.name === inv.nama_desain;
    })[0] || null;
  }

  function buildDesainInvitationCard(inv, tpl){
    desainInvitationCard.innerHTML = '';

    var eyebrow = document.createElement('span');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = tpl.kategori + ' · ' + tpl.name;

    var title = document.createElement('h3');
    title.textContent = invitationDisplayName(inv);

    var row = document.createElement('div');
    row.className = 'status-row';
    var badge = document.createElement('span');
    badge.className = 'badge' + (inv.status === 'aktif' ? ' badge-aktif' : '');
    badge.textContent = inv.status === 'aktif' ? 'Aktif' : 'Draf';
    var lanjutBtn = document.createElement('button');
    lanjutBtn.type = 'button';
    lanjutBtn.className = 'btn btn-primary btn-sm';
    lanjutBtn.textContent = 'Lanjutkan Mengedit';
    lanjutBtn.addEventListener('click', function(){ openWorkspace(inv, tpl); });
    row.append(badge, lanjutBtn);

    desainInvitationCard.append(eyebrow, title, row);
  }

  async function renderDesainView(){
    if (!desainContinueBlock) return;
    var session = KU.getSession();
    if (!session) { desainEmptyState.style.display = ''; desainContinueBlock.style.display = 'none'; return; }

    var res = await KU.sb.from('invitations').select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(1);
    var inv = (!res.error && res.data && res.data.length) ? res.data[0] : null;
    var tpl = inv ? findTemplateMetaForInvitation(inv) : null;

    if (!inv || !tpl) {
      desainEmptyState.style.display = '';
      desainContinueBlock.style.display = 'none';
      return;
    }
    desainEmptyState.style.display = 'none';
    desainContinueBlock.style.display = '';
    buildDesainInvitationCard(inv, tpl);
  }

  if (createInvitationBtn) createInvitationBtn.addEventListener('click', function(){ showView('tema'); });

  if (themeTemplateGrid) {
    themeTemplateGrid.addEventListener('click', async function(e){
      var btn = e.target.closest('.tpl-use-btn');
      if (!btn) return;
      var t = THEME_TEMPLATES.filter(function(x){ return x.id === btn.dataset.id; })[0];
      if (!t) return;
      var session = KU.getSession();
      if (!session) { showTemaMsg('Kamu perlu masuk dulu untuk memilih tema ini.', 'err'); return; }
      btn.disabled = true;
      showTemaMsg('Menyiapkan workspace...');
      var res = await ensureDraftForTemplate(t);
      btn.disabled = false;
      if (res.error) { showTemaMsg('Gagal menyiapkan undangan: ' + friendlyErrorMessage(res.error), 'err'); return; }
      showTemaMsg('');
      openWorkspace(res.data, t);
    });
  }

  if (wsBackBtn) wsBackBtn.addEventListener('click', async function(){
    if (!(await confirmLeaveWorkspace())) return;
    wsFormDirty = false;
    showView('tema');
  });

  wsTabButtons.forEach(function(b){
    b.addEventListener('click', function(){ showWsTab(b.dataset.tab, true); });
  });

  if (pratinjauEditBtn) pratinjauEditBtn.addEventListener('click', function(){ showWsTab('isi-data', true); });

  if (wsForm) {
    wsForm.addEventListener('submit', async function(e){
      e.preventDefault();
      if (!currentInvitation) return;
      var namaTidakValid = validasiSemuaField();
      if (namaTidakValid.length) {
        var labelList = namaTidakValid.map(function(n){ return FIELD_LABELS[n] || n; });
        showWsSaveMsg('Ada isian yang perlu diperbaiki: ' + labelList.join(', ') + '.', 'err');
        var elPertama = wsForm.elements[namaTidakValid[0]];
        if (elPertama) {
          elPertama.scrollIntoView({ behavior: 'smooth', block: 'center' });
          elPertama.focus();
        }
        return;
      }
      wsSaveBtn.disabled = true;
      showWsSaveMsg('Menyimpan...');
      var payload = {};
      FORM_FIELDS.forEach(function(f){
        var el = wsForm.elements[f];
        var val = el ? el.value.trim() : '';
        payload[f] = val === '' ? null : val;
      });
      var res = await KU.sb.from('invitations').update(payload).eq('id', currentInvitation.id).select().single();
      wsSaveBtn.disabled = false;
      if (res.error) { showWsSaveMsg('Gagal menyimpan: ' + friendlyErrorMessage(res.error), 'err'); return; }
      currentInvitation = res.data;
      wsFormDirty = false;
      updateWsHeader();
      showWsSaveMsg('Tersimpan!', 'ok');
    });
  }
})();
