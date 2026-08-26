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
    if (name === 'home') renderHomeView();
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

  // Guard: app.html adalah dashboard privat, bukan halaman yang boleh
  // ditampilkan ke pengunjung anonim (lihat laporan bug "menu Masuk
  // tidak berfungsi"). Begitu status sesi diketahui pasti, belum pernah
  // masuk -> lempar ke index.html, buka modal Masuk di sana, lalu balik
  // ke app.html (lewat sessionStorage, pola sama seperti
  // PENDING_TEMPLATE_KEY di assets/app.js) setelah berhasil.
  // authGuardDone mencegah redirectToLogin() dan jalur SIGNED_OUT di
  // bawah berebut menentukan tujuan -- auth-core.js selalu memicu
  // 'ku:authevent' SIGNED_OUT lebih dulu secara sinkron sebelum
  // 'ku:session', jadi jalur logout selalu menang duluan untuk kasus
  // itu.
  var authGuardDone = false;
  function redirectToLogin(){
    if (authGuardDone) return;
    authGuardDone = true;
    try { sessionStorage.setItem('ku-pending-return', window.location.pathname + window.location.search); } catch (e2) {}
    window.location.href = 'index.html#masuk';
  }

  // baru saja keluar (event SIGNED_OUT) -> lempar ke halaman depan biasa
  // TANPA modal Masuk, karena user memang baru sengaja keluar.
  document.addEventListener('ku:authevent', function(e){
    if (e.detail.event === 'SIGNED_OUT' && !authGuardDone) {
      authGuardDone = true;
      window.location.href = 'index.html';
    }
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

  // Ditandai true begitu 'ku:session' sempat tertangkap, supaya jaring
  // pengaman di akhir file tahu render awalnya sudah dikerjakan dan
  // tidak perlu mengulang query yang sama. Lihat komentar di sana.
  var sesiSudahDirender = false;

  document.addEventListener('ku:session', function(e){
    if (!e.detail.session) { redirectToLogin(); return; }
    sesiSudahDirender = true;
    renderProfileNav(e.detail.session);
    if (document.getElementById('view-desain').classList.contains('active')) renderDesainView();
    if (document.getElementById('view-home').classList.contains('active')) renderHomeView();
    handlePendingGunakan();
  });
  // Sesi bisa saja sudah selesai di-resolve SEBELUM baris ini jalan
  // (jeda pemuatan antar <script> memberi waktu promise getSession() di
  // auth-core.js selesai lebih dulu -- lihat komentar senada di
  // handlePendingGunakan() di bawah), jadi 'ku:session' di atas bisa
  // saja sudah lewat dan tidak pernah tertangkap DI SINI juga. Beda
  // dengan handlePendingGunakan() yang aman diam saja kalau kelewat,
  // guard ini harus tetap jalan -- makanya dicek juga sinkron di sini,
  // tapi HANYA kalau resolusinya sudah pasti selesai
  // (KU.isSessionResolved()) supaya user yang sebetulnya sudah login
  // tapi sesinya belum sempat di-resolve tidak ikut kelempar.
  if (KU.isSessionResolved() && !KU.getSession()) redirectToLogin();
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
  // guard di atas sudah keburu melempar ke index.html#masuk duluan
  // (dengan app.html?gunakan=... ini persis tersimpan sebagai tujuan
  // balik), jadi baris ini praktis tidak pernah jalan dalam keadaan
  // belum login -- dibiarkan sebagai jaga-jaga saja.
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
    if (res.limitReached) { showTemaMsg('Kamu sudah punya ' + MAKS_DRAFT + ' undangan berstatus Draf. Hapus salah satu draft dulu, atau aktifkan salah satunya, sebelum membuat yang baru.', 'err'); return; }
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
    // Gerbang pembayaran di database (trigger jaga_aktivasi_berbayar) juga
    // memakai kode 23514. Pesannya sudah ditulis ramah dan spesifik di sisi
    // database, jadi diteruskan apa adanya alih-alih ditimpa pesan umum
    // "format tidak sesuai" yang justru membingungkan.
    if (err.code === '23514') {
      if (msg.indexOf('belum dibayar') !== -1) return err.message;
      return 'Ada data yang tidak sesuai format. Periksa kembali isian kamu.';
    }
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

  // Dipakai saat undangan dihapus: cari semua file foto miliknya di
  // Storage lewat listing folder (bukan lewat kolom foto_*_url/
  // foto_galeri di DB) supaya file yatim — mis. foto lama yang gagal
  // dibersihkan saat "Ganti" — ikut kebersih, bukan cuma yang sedang
  // tercatat aktif dipakai.
  async function daftarPathFotoInvitation(uid, invId){
    var basePrefix = uid + '/' + invId;
    var errors = [];
    var paths = [];

    var top = await KU.sb.storage.from(FOTO_BUCKET).list(basePrefix, { limit: 1000 });
    if (top.error) errors.push(top.error);
    else (top.data || []).forEach(function(item){
      if (item.name !== 'galeri') paths.push(basePrefix + '/' + item.name);
    });

    var sub = await KU.sb.storage.from(FOTO_BUCKET).list(basePrefix + '/galeri', { limit: 1000 });
    if (sub.error) errors.push(sub.error);
    else (sub.data || []).forEach(function(item){ paths.push(basePrefix + '/galeri/' + item.name); });

    return { paths: paths, errors: errors };
  }

  async function hapusSemuaFotoInvitation(uid, invId){
    var listed = await daftarPathFotoInvitation(uid, invId);
    var errors = listed.errors.slice();
    if (!listed.paths.length) return { errors: errors };
    var rem = await KU.sb.storage.from(FOTO_BUCKET).remove(listed.paths);
    if (rem.error) errors.push(rem.error);
    return { errors: errors };
  }

  // ---------------- Hadiah / bukti transfer (bucket Storage privat
  // "bukti-transfer") ---------------- Beda dari FOTO_BUCKET: path-nya
  // cuma [invitation_id]/[nama-file] (tanpa prefix user_id) karena tamu
  // anonim yang mengunggah tidak tahu/tidak boleh tahu user_id pemilik
  // -- lihat scratch_migration_hadiah.sql untuk RLS-nya.
  var BUKTI_TRANSFER_BUCKET = 'bukti-transfer';

  async function hapusSemuaBuktiTransferInvitation(invId){
    var list = await KU.sb.storage.from(BUKTI_TRANSFER_BUCKET).list(invId, { limit: 1000 });
    if (list.error) return { errors: [list.error] };
    var paths = (list.data || []).map(function(item){ return invId + '/' + item.name; });
    if (!paths.length) return { errors: [] };
    var rem = await KU.sb.storage.from(BUKTI_TRANSFER_BUCKET).remove(paths);
    return { errors: rem.error ? [rem.error] : [] };
  }

  // Undangan 'aktif' tidak dihitung — cuma draft yang dibatasi, supaya
  // orang tidak numpuk draft coba-coba tanpa pernah menyelesaikannya.
  var MAKS_DRAFT = 3;

  async function ensureDraftForTemplate(t){
    var session = KU.getSession();
    var uid = session.user.id;

    var existing = await KU.sb.from('invitations').select('*')
      .eq('user_id', uid).eq('status', 'draft')
      .order('created_at', { ascending: false });
    if (existing.error) return { error: existing.error };
    var drafts = existing.data || [];

    // Kalau template ini sudah punya draft berjalan, pakai lagi yang
    // itu (ganti-ganti template pada draft yang sama), bukan bikin
    // duplikat draft untuk template yang identik.
    var sameTemplate = drafts.filter(function(row){
      return row.kategori_desain === t.kategori && row.nama_desain === t.name;
    })[0];
    if (sameTemplate) return { data: sameTemplate };

    if (drafts.length >= MAKS_DRAFT) return { limitReached: true };

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
  var hadiahAdminList = document.getElementById('hadiahAdminList');
  var hadiahEmptyMsg = document.getElementById('hadiahEmptyMsg');
  var hadiahTotalBadge = document.getElementById('hadiahTotalBadge');
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

  // ---------------- Unggah Musik Latar ----------------
  // Menumpang bucket FOTO_BUCKET, bukan bucket sendiri: policy bucket itu
  // mencocokkan segmen pertama path ke auth.uid() dan tidak membatasi tipe
  // maupun ukuran berkas, jadi audio ikut tercakup tanpa policy baru.
  // Bucket-nya juga sudah publik — memang harus, karena tamu perlu bisa
  // memutar lagunya langsung dari undangan.
  var TIPE_MUSIK_VALID = ['audio/mpeg', 'audio/mp3'];
  var UKURAN_MUSIK_MAKS = 8 * 1024 * 1024;

  function validasiFileMusik(file){
    if (!file) return 'Berkas tidak valid.';
    // Sebagian browser mengirim type kosong untuk .mp3 (mis. saat file
    // diseret dari aplikasi tertentu), jadi ekstensi dipakai sebagai
    // cadangan supaya berkas yang sah tidak ikut ditolak.
    var tipeOk = TIPE_MUSIK_VALID.indexOf(file.type) !== -1 || /\.mp3$/i.test(file.name || '');
    if (!tipeOk) return 'Format lagu harus MP3.';
    if (file.size > UKURAN_MUSIK_MAKS) return 'Ukuran lagu maksimal 8 MB. Coba pakai berkas yang lebih kecil.';
    return null;
  }

  function friendlyMusikError(err){
    var msg = ((err && err.message) || '').toLowerCase();
    if (msg.indexOf('failed to fetch') !== -1 || msg.indexOf('network') !== -1) {
      return 'Gagal terhubung ke server. Periksa koneksi internetmu lalu coba lagi.';
    }
    if (msg.indexOf('exceed') !== -1 || msg.indexOf('too large') !== -1 || msg.indexOf('maximum allowed size') !== -1) {
      return 'Ukuran lagu maksimal 8 MB. Coba pakai berkas yang lebih kecil.';
    }
    return 'Gagal mengunggah lagu. Silakan coba lagi.';
  }

  async function unggahMusik(file){
    var pesan = validasiFileMusik(file);
    if (pesan) return { error: pesan };
    var session = KU.getSession();
    if (!session || !currentInvitation) return { error: 'Sesi login sudah berakhir. Silakan muat ulang halaman.' };
    var path = session.user.id + '/' + currentInvitation.id + '/musik.mp3';
    var pathLama = pathDariPublicUrl(currentInvitation.musik_url);
    var up = await KU.sb.storage.from(FOTO_BUCKET).upload(path, file, { upsert: true, contentType: 'audio/mpeg' });
    if (up.error) return { error: friendlyMusikError(up.error) };
    var urlBaru = publicUrlFoto(path);
    var res = await KU.sb.from('invitations').update({ musik_url: urlBaru }).eq('id', currentInvitation.id).select().single();
    if (res.error) {
      await KU.sb.storage.from(FOTO_BUCKET).remove([path]);
      return { error: friendlyErrorMessage(res.error) };
    }
    currentInvitation = res.data;
    // Path lagu selalu sama (musik.mp3, upsert), jadi berkas lama praktis
    // selalu tertimpa; pembersihan ini cuma jaga-jaga kalau URL lama
    // ternyata menunjuk ke path berbeda.
    if (pathLama && pathLama !== path) KU.sb.storage.from(FOTO_BUCKET).remove([pathLama]).then(function(){});
    return { data: urlBaru };
  }

  async function hapusMusik(){
    if (!currentInvitation) return { error: 'Sesi login sudah berakhir. Silakan muat ulang halaman.' };
    var pathLama = pathDariPublicUrl(currentInvitation.musik_url);
    var res = await KU.sb.from('invitations').update({ musik_url: null }).eq('id', currentInvitation.id).select().single();
    if (res.error) return { error: friendlyErrorMessage(res.error) };
    currentInvitation = res.data;
    if (pathLama) KU.sb.storage.from(FOTO_BUCKET).remove([pathLama]).then(function(){});
    return { data: true };
  }

  function setupMusik(){
    var input = document.getElementById('input_musik_url');
    var zone = document.getElementById('zone_musik_url');
    var preview = document.getElementById('preview_musik_url');
    var audio = document.getElementById('audio_musik_url');
    var statusEl = document.getElementById('status_musik_url');
    if (!input || !zone || !preview || !audio) return { tampilkan: function(){} };

    function tampilkanStatus(text, type){
      if (!statusEl) return;
      statusEl.textContent = text || '';
      statusEl.className = 'foto-upload-status' + (type ? ' ' + type : '');
    }

    function tampilkan(url){
      if (url) {
        audio.src = url;
        preview.hidden = false;
        zone.hidden = true;
      } else {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        preview.hidden = true;
        zone.hidden = false;
      }
    }

    async function prosesFile(file){
      if (!file) return;
      zone.classList.add('disabled');
      tampilkanStatus('Mengunggah...');
      var hasil = await unggahMusik(file);
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
      prosesFile(e.dataTransfer.files && e.dataTransfer.files[0]);
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
        var ok = await KU.confirmAction({ title: 'Hapus Musik', text: 'Yakin mau menghapus musik latar undangan ini?', okText: 'Ya, Hapus' });
        if (!ok) return;
        tampilkanStatus('Menghapus...');
        var hasil = await hapusMusik();
        if (hasil.error) { tampilkanStatus(hasil.error, 'err'); return; }
        tampilkan(null);
        tampilkanStatus('');
      }
    });

    return { tampilkan: tampilkan };
  }

  var musikCtrl = setupMusik();

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
    musikCtrl.tampilkan(inv ? inv.musik_url : null);
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
    if (deactivateBtn) deactivateBtn.style.display = isAktif ? 'inline-flex' : 'none';
    // Tombol aktifkan/bayar diputuskan terpisah karena bergantung status
    // pembayaran, yang perlu ditanya ke server dulu.
    if (activateBtn) activateBtn.style.display = isAktif ? 'none' : 'inline-flex';
    if (!isAktif) segarkanStatusBayar();

    renderBagikanShare(currentInvitation);
  }

  // ---------------- Pembayaran (Midtrans Snap) ----------------
  // Harga paket yang bisa dibeli, dari katalog assets/pricing-plans.js.
  // Ini hanya untuk DITAMPILKAN — nominal yang benar-benar ditagih
  // ditentukan ulang di server (api/_lib/harga.js) dan tidak pernah
  // diambil dari browser.
  function hargaPaketStandar(){
    var daftar = (window.PRICING_PLANS && window.PRICING_PLANS.satuan) || [];
    for (var i = 0; i < daftar.length; i++) {
      if (daftar[i].tersedia) return daftar[i].harga;
    }
    return 0;
  }

  var bayarBtn = document.getElementById('bayarBtn');
  var bayarNota = document.getElementById('bayarNota');
  var sudahDibayar = false;

  function tampilkanNota(teks){
    if (!bayarNota) return;
    bayarNota.textContent = teks || '';
    bayarNota.style.display = teks ? '' : 'none';
  }

  // Menentukan tombol mana yang tampil untuk undangan berstatus draf.
  // Sumber kebenarannya fungsi database undangan_sudah_dibayar(), sama
  // dengan yang dipakai trigger penjaga — supaya tombol tidak pernah
  // menjanjikan sesuatu yang akan ditolak database.
  async function segarkanStatusBayar(){
    if (!currentInvitation || !activateBtn || !bayarBtn) return;
    activateBtn.style.display = 'none';
    bayarBtn.style.display = 'none';
    tampilkanNota('Memeriksa status pembayaran...');

    // Pertanyaan pertama: apakah pembayaran memang sedang diwajibkan?
    // Saklarnya ada di database (pembayaran_diwajibkan()), sama dengan yang
    // dipakai trigger penjaga. Kalau UI memakai sumber kebenaran sendiri,
    // akan ada keadaan di mana tombolnya menuntut bayar padahal database
    // tidak mewajibkan — atau sebaliknya, menjanjikan aktivasi yang akan
    // ditolak. Keduanya membingungkan dan keduanya bisa dihindari dengan
    // bertanya ke tempat yang sama.
    var wajib = await KU.sb.rpc('pembayaran_diwajibkan');
    if (wajib.error || wajib.data !== true) {
      activateBtn.style.display = 'inline-flex';
      tampilkanNota('');
      return;
    }

    var res = await KU.sb.rpc('undangan_sudah_dibayar', { p_invitation_id: currentInvitation.id });
    sudahDibayar = !res.error && res.data === true;

    if (sudahDibayar) {
      activateBtn.style.display = 'inline-flex';
      tampilkanNota('Pembayaran sudah lunas. Undangan siap diaktifkan.');
    } else {
      bayarBtn.style.display = 'inline-flex';
      // Harga dibaca dari katalog PRICING_PLANS, tidak ditulis ulang di
      // sini. Angka yang di-hardcode akan diam-diam berbeda dari tab Harga
      // begitu harganya berubah — dan yang membacanya adalah orang yang
      // sedang memutuskan mau membayar atau tidak.
      tampilkanNota('Undangan bisa dibuat dan dilihat gratis. Pembayaran Rp' +
        window.formatRupiah(hargaPaketStandar()) + ' sekali bayar hanya diperlukan saat mengaktifkannya untuk tamu.');
    }
  }

  function muatSnapSekali(){
    // Skrip Snap dimuat saat dibutuhkan, bukan di setiap kunjungan
    // dashboard: mayoritas sesi tidak pernah menyentuh pembayaran.
    if (window.snap) return Promise.resolve(true);
    var clientKey = window.KU_MIDTRANS_CLIENT_KEY || '';
    if (!clientKey) return Promise.resolve(false);
    // Lingkungan ditentukan eksplisit, TIDAK ditebak dari bentuk kunci:
    // dasbor Sandbox Midtrans mengeluarkan kunci tanpa awalan SB-, jadi
    // bentuk kunci sandbox dan produksi tidak bisa dibedakan. Lihat
    // catatan lengkapnya di api/_lib/midtrans.js.
    var produksi = window.KU_MIDTRANS_PRODUCTION === true;
    return new Promise(function(resolve){
      var s = document.createElement('script');
      s.src = produksi
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js';
      s.setAttribute('data-client-key', clientKey);
      s.onload = function(){ resolve(!!window.snap); };
      s.onerror = function(){ resolve(false); };
      document.head.appendChild(s);
    });
  }

  if (bayarBtn) {
    bayarBtn.addEventListener('click', async function(){
      if (!currentInvitation) return;

      // Kelengkapan data diperiksa SEBELUM menagih. Membiarkan orang
      // membayar lalu baru diberi tahu datanya kurang adalah urutan yang
      // paling menyebalkan dari sisi pengguna.
      var missing = getMissingRequiredFields(currentInvitation);
      if (missing.length) {
        renderActivateChecklist(missing);
        showStatusMsg('Lengkapi dulu data yang kurang di tab Isi Data sebelum membayar.', 'err');
        return;
      }
      renderActivateChecklist([]);

      bayarBtn.disabled = true;
      showStatusMsg('Menyiapkan pembayaran...');

      var sesi = KU.getSession();
      if (!sesi) { bayarBtn.disabled = false; showStatusMsg('Sesi login sudah berakhir. Muat ulang halaman.', 'err'); return; }

      var hasil;
      try {
        var r = await fetch('/api/bayar/buat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sesi.access_token },
          body: JSON.stringify({ invitation_id: currentInvitation.id, tier: 'standar' })
        });
        hasil = await r.json();
        if (!r.ok) throw new Error(hasil && hasil.pesan ? hasil.pesan : 'Gagal menyiapkan pembayaran.');
      } catch (e) {
        bayarBtn.disabled = false;
        showStatusMsg(e.message || 'Gagal menyiapkan pembayaran.', 'err');
        return;
      }

      var siap = await muatSnapSekali();
      bayarBtn.disabled = false;
      if (!siap || !window.snap) {
        showStatusMsg('Gagal memuat halaman pembayaran. Periksa koneksi internetmu lalu coba lagi.', 'err');
        return;
      }

      showStatusMsg('');
      window.snap.pay(hasil.token, {
        onSuccess: function(){ selesaiBayar('Pembayaran berhasil! Sekarang undanganmu bisa diaktifkan.'); },
        // Transfer bank/VA sering baru lunas beberapa menit kemudian, dan
        // yang menandai lunas adalah webhook, bukan callback ini.
        onPending: function(){ selesaiBayar('Pembayaran sedang diproses. Halaman ini akan memperbarui sendiri begitu dana masuk.'); },
        onError: function(){ showStatusMsg('Pembayaran gagal. Silakan coba lagi.', 'err'); },
        onClose: function(){ showStatusMsg('Pembayaran dibatalkan. Kamu bisa mencobanya lagi kapan saja.'); }
      });
    });
  }

  async function selesaiBayar(pesan){
    showStatusMsg(pesan, 'ok');
    // Jeda singkat memberi webhook waktu tiba sebelum kita bertanya.
    await new Promise(function(r){ setTimeout(r, 2500); });
    await segarkanStatusBayar();
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

  // Bukti transfer disimpan sebagai PATH di bucket privat "bukti-
  // transfer" (bukan URL publik -- bucket-nya memang tidak public),
  // jadi dibuka lewat signed URL yang berlaku 5 menit, dibuat saat
  // tombol "Lihat Bukti Transfer" diklik -- bukan didaftar ulang untuk
  // semua baris sekaligus (boros & signed URL bisa kedaluwarsa sebelum
  // sempat diklik).
  function buatHadiahAdminItem(row){
    var item = document.createElement('div');
    item.className = 'ucapan-admin-item';

    var body = document.createElement('div');
    body.className = 'ucapan-admin-body';
    var head = document.createElement('div');
    head.className = 'ucapan-admin-head';
    var nama = document.createElement('span');
    nama.className = 'ucapan-admin-name';
    nama.textContent = row.nama_pengirim;
    var waktu = document.createElement('span');
    waktu.className = 'ucapan-admin-time';
    waktu.textContent = formatWaktuSingkat(row.created_at);
    head.appendChild(nama);
    head.appendChild(waktu);
    body.appendChild(head);

    if (row.pesan) {
      var teks = document.createElement('p');
      teks.className = 'ucapan-admin-text';
      teks.textContent = row.pesan;
      body.appendChild(teks);
    }

    if (row.bukti_url) {
      var lihatBtn = document.createElement('button');
      lihatBtn.type = 'button';
      lihatBtn.className = 'btn btn-outline btn-sm hadiah-bukti-btn';
      lihatBtn.textContent = 'Lihat Bukti Transfer';
      lihatBtn.addEventListener('click', async function(){
        // Tab dibuka SEKARANG, selagi klik user masih dianggap "hangat"
        // oleh browser. Kalau menunggu createSignedUrl() selesai dulu,
        // izin dari klik itu bisa keburu kedaluwarsa (makin mungkin di
        // koneksi lambat) dan popup-nya diblokir.
        //
        // Sengaja tanpa opsi 'noopener': dengan opsi itu window.open
        // SELALU mengembalikan null, jadi mustahil membedakan "berhasil"
        // dari "diblokir" — dan kode lama diam saja saat diblokir,
        // menyisakan tombol yang seolah rusak. Keamanannya digantikan
        // opener = null di bawah, yang efeknya sama.
        var tab = window.open('', '_blank');
        if (tab) tab.opener = null;

        lihatBtn.disabled = true;
        var res = await KU.sb.storage.from(BUKTI_TRANSFER_BUCKET).createSignedUrl(row.bukti_url, 300);
        lihatBtn.disabled = false;

        if (res.error || !res.data) {
          if (tab) tab.close();
          showTamuMsg('Gagal membuka bukti transfer: ' + friendlyErrorMessage(res.error), 'err');
          return;
        }
        if (tab) {
          tab.location.replace(res.data.signedUrl);
        } else {
          showTamuMsg('Bukti transfer gagal dibuka karena popup diblokir browser. Izinkan popup untuk situs ini, lalu coba lagi.', 'err');
        }
      });
      body.appendChild(lihatBtn);
    }

    var hapusBtn = document.createElement('button');
    hapusBtn.type = 'button';
    hapusBtn.className = 'ucapan-admin-delete';
    hapusBtn.setAttribute('aria-label', 'Hapus catatan hadiah dari ' + row.nama_pengirim);
    hapusBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>';
    hapusBtn.addEventListener('click', async function(){
      var ok = await KU.confirmAction({ title: 'Hapus Catatan Hadiah', text: 'Catatan hadiah dari "' + row.nama_pengirim + '" beserta bukti transfernya akan dihapus permanen.', okText: 'Ya, Hapus' });
      if (!ok) return;
      hapusBtn.disabled = true;
      if (row.bukti_url) await KU.sb.storage.from(BUKTI_TRANSFER_BUCKET).remove([row.bukti_url]);
      var res = await KU.sb.from('hadiah').delete().eq('id', row.id);
      if (res.error) {
        showTamuMsg('Gagal menghapus catatan hadiah: ' + friendlyErrorMessage(res.error), 'err');
        hapusBtn.disabled = false;
        return;
      }
      item.remove();
      if (hadiahTotalBadge) hadiahTotalBadge.textContent = hadiahAdminList.children.length + ' pengirim';
      if (hadiahAdminList && !hadiahAdminList.children.length && hadiahEmptyMsg) hadiahEmptyMsg.style.display = '';
    });

    item.appendChild(body);
    item.appendChild(hapusBtn);
    return item;
  }

  function renderHadiahAdminList(daftar){
    if (!hadiahAdminList) return;
    hadiahAdminList.innerHTML = '';
    var kosong = daftar.length === 0;
    if (hadiahEmptyMsg) hadiahEmptyMsg.style.display = kosong ? '' : 'none';
    daftar.forEach(function(row){ hadiahAdminList.appendChild(buatHadiahAdminItem(row)); });
    if (hadiahTotalBadge) hadiahTotalBadge.textContent = daftar.length + ' pengirim';
  }

  // ---------------- Link Personal per Tamu ----------------
  var tamuAddForm = document.getElementById('tamuAddForm');
  var tamuNamaInput = document.getElementById('tamuNamaInput');
  var tamuAddBtn = document.getElementById('tamuAddBtn');
  var tamuList = document.getElementById('tamuList');
  var tamuListMsg = document.getElementById('tamuListMsg');
  var tamuEmptyMsg = document.getElementById('tamuEmptyMsg');
  var daftarTamu = [];

  function showTamuListMsg(text, type){
    if (!tamuListMsg) return;
    tamuListMsg.textContent = text || '';
    tamuListMsg.className = 'workspace-msg' + (type ? ' ' + type : '');
  }

  // Kode link personal. Huruf/angka acak dari crypto — bukan urutan
  // tebakan, supaya tamu tidak bisa mengintip undangan tamu lain hanya
  // dengan mengubah angka di URL. Karakter dibatasi ke [a-z0-9] agar
  // aman disalin lewat WhatsApp tanpa perlu encoding.
  function buatKodeTamu(){
    var huruf = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var acak = new Uint8Array(10);
    (window.crypto || window.msCrypto).getRandomValues(acak);
    var out = '';
    for (var i = 0; i < acak.length; i++) out += huruf[acak[i] % huruf.length];
    return out;
  }

  function linkTamu(kode){
    if (!currentInvitation || !currentInvitation.slug) return null;
    return PUBLIC_BASE_URL + '/u/' + currentInvitation.slug + '?tamu=' + kode;
  }

  function renderDaftarTamu(){
    if (!tamuList) return;
    tamuList.innerHTML = '';
    if (tamuEmptyMsg) tamuEmptyMsg.style.display = daftarTamu.length ? 'none' : '';

    daftarTamu.forEach(function(t){
      var row = document.createElement('div');
      row.className = 'tamu-row';
      row.dataset.id = t.id;

      var info = document.createElement('div');
      info.className = 'tamu-info';

      var nama = document.createElement('span');
      nama.className = 'tamu-nama';
      nama.textContent = t.name;

      var status = document.createElement('span');
      status.className = 'tamu-status';
      if (t.opened_at) {
        status.textContent = 'Sudah dibuka ' + formatWaktuSingkat(t.opened_at);
        status.classList.add('is-opened');
      } else {
        status.textContent = 'Belum dibuka';
      }
      info.append(nama, status);

      var aksi = document.createElement('div');
      aksi.className = 'tamu-aksi';

      var url = linkTamu(t.code);
      var salinBtn = document.createElement('button');
      salinBtn.type = 'button';
      salinBtn.className = 'btn btn-ghost btn-sm';
      salinBtn.textContent = 'Salin Link';
      if (!url) {
        // Slug baru ada setelah undangan diaktifkan, jadi sebelum itu
        // link personalnya belum bisa dirakit sama sekali.
        salinBtn.disabled = true;
        salinBtn.title = 'Aktifkan undangan dulu supaya alamatnya terbentuk.';
      } else {
        salinBtn.addEventListener('click', function(){
          navigator.clipboard.writeText(url).then(function(){
            salinBtn.textContent = 'Tersalin!';
            setTimeout(function(){ salinBtn.textContent = 'Salin Link'; }, 1600);
            tandaiDibagikan(t);
          }, function(){
            showTamuListMsg('Gagal menyalin link. Salin manual: ' + url, 'err');
          });
        });
      }

      var waBtn = document.createElement('a');
      waBtn.className = 'btn btn-ghost btn-sm';
      waBtn.textContent = 'WhatsApp';
      if (!url) {
        waBtn.setAttribute('aria-disabled', 'true');
        waBtn.classList.add('is-disabled');
      } else {
        var pesan = 'Kepada Yth. ' + t.name + ',\n\nDengan penuh sukacita kami mengundangmu ke pernikahan kami. Detail lengkapnya ada di undangan berikut:\n' + url;
        waBtn.href = 'https://wa.me/?text=' + encodeURIComponent(pesan);
        waBtn.target = '_blank';
        waBtn.rel = 'noopener';
        waBtn.addEventListener('click', function(){ tandaiDibagikan(t); });
      }

      var hapusBtn = document.createElement('button');
      hapusBtn.type = 'button';
      hapusBtn.className = 'btn btn-ghost btn-sm';
      hapusBtn.textContent = 'Hapus';
      hapusBtn.addEventListener('click', function(){ hapusTamu(t); });

      aksi.append(salinBtn, waBtn, hapusBtn);
      row.append(info, aksi);
      tamuList.appendChild(row);
    });
  }

  function formatWaktuSingkat(iso){
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  // Dicatat diam-diam saat link disalin/dikirim — tidak perlu memberi
  // umpan balik, karena yang penting bagi mempelai cuma "sudah pernah
  // dibagikan atau belum". Kegagalannya sengaja diabaikan supaya tidak
  // mengganggu aksi utama (menyalin link) yang sudah berhasil.
  function tandaiDibagikan(t){
    if (t.shared_at) return;
    t.shared_at = new Date().toISOString();
    KU.sb.from('guests').update({ shared_at: t.shared_at }).eq('id', t.id).then(function(){});
  }

  async function tambahTamu(nama){
    if (!currentInvitation) return;
    var kode = buatKodeTamu();
    var res = await KU.sb.from('guests').insert({
      invitation_id: currentInvitation.id,
      name: nama,
      code: kode
    }).select().single();
    if (res.error) { showTamuListMsg('Gagal menambah tamu: ' + friendlyErrorMessage(res.error), 'err'); return; }
    daftarTamu.unshift(res.data);
    renderDaftarTamu();
    showTamuListMsg('');
  }

  async function hapusTamu(t){
    var ok = await KU.confirmAction({
      title: 'Hapus Tamu',
      text: 'Hapus "' + t.name + '" dari daftar? Link personal yang sudah terlanjur dibagikan ke tamu ini akan berhenti berfungsi.',
      okText: 'Ya, Hapus'
    });
    if (!ok) return;
    var res = await KU.sb.from('guests').delete().eq('id', t.id);
    if (res.error) { showTamuListMsg('Gagal menghapus tamu: ' + friendlyErrorMessage(res.error), 'err'); return; }
    daftarTamu = daftarTamu.filter(function(x){ return x.id !== t.id; });
    renderDaftarTamu();
    showTamuListMsg('');
  }

  if (tamuAddForm) {
    tamuAddForm.addEventListener('submit', async function(e){
      e.preventDefault();
      var nama = (tamuNamaInput.value || '').trim();
      if (!nama) { showTamuListMsg('Nama tamu tidak boleh kosong.', 'err'); return; }
      tamuAddBtn.disabled = true;
      showTamuListMsg('Menambahkan...');
      await tambahTamu(nama);
      tamuAddBtn.disabled = false;
      tamuNamaInput.value = '';
      tamuNamaInput.focus();
    });
  }

  async function loadTamuTab(){
    if (!currentInvitation) return;
    showTamuMsg('Memuat data tamu...');
    var rsvpRes = await KU.sb.from('rsvp').select('*').eq('invitation_id', currentInvitation.id).order('created_at', { ascending: false });
    var ucapanRes = await KU.sb.from('ucapan').select('*').eq('invitation_id', currentInvitation.id).order('created_at', { ascending: false });
    var hadiahRes = await KU.sb.from('hadiah').select('*').eq('invitation_id', currentInvitation.id).order('created_at', { ascending: false });
    var guestsRes = await KU.sb.from('guests').select('*').eq('invitation_id', currentInvitation.id).order('created_at', { ascending: false });

    if (rsvpRes.error || ucapanRes.error || hadiahRes.error) {
      showTamuMsg('Gagal memuat data tamu: ' + friendlyErrorMessage(rsvpRes.error || ucapanRes.error || hadiahRes.error), 'err');
      return;
    }
    renderRsvpSummaryDanTabel(rsvpRes.data || []);
    renderUcapanAdminList(ucapanRes.data || []);
    renderHadiahAdminList(hadiahRes.data || []);

    // Daftar tamu dipisahkan dari tiga di atas: kalau bagian ini gagal,
    // RSVP/ucapan/hadiah yang sudah berhasil dimuat tetap ditampilkan.
    if (guestsRes.error) {
      showTamuListMsg('Gagal memuat daftar tamu: ' + friendlyErrorMessage(guestsRes.error), 'err');
    } else {
      daftarTamu = guestsRes.data || [];
      renderDaftarTamu();
      showTamuListMsg('');
    }
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
    wsForm.addEventListener('input', function(e){
      // Input file (foto utama/pria/wanita, galeri, musik latar) ikut
      // memicu 'input' saat berkas dipilih, padahal semuanya menyimpan
      // langsung ke DB begitu selesai diunggah — di luar tombol Simpan.
      // Tanpa pengecualian ini, mengunggah foto membuat formulir
      // dianggap "belum disimpan", lalu user diadang peringatan
      // kehilangan perubahan padahal tidak ada yang tertinggal.
      if (e.target && e.target.type === 'file') return;
      wsFormDirty = true;
    });
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
  var desainDeleteMsg = document.getElementById('desainDeleteMsg');
  var createInvitationBtn = document.getElementById('createInvitationBtn');

  function findTemplateMetaForInvitation(inv){
    return THEME_TEMPLATES.filter(function(t){
      return t.kategori === inv.kategori_desain && t.name === inv.nama_desain;
    })[0] || null;
  }

  function tampilkanPesanHapus(el, text, type){
    if (!el) return;
    el.textContent = text || '';
    el.className = 'workspace-msg' + (type ? ' ' + type : '');
  }

  // Dipakai bareng oleh kartu undangan di Home dan di Desain Kamu —
  // satu-satunya jalur hapus supaya konfirmasi, pembersihan foto
  // Storage, dan pesan hasilnya konsisten di kedua tempat.
  async function hapusUndanganDenganKonfirmasi(inv, msgEl, onDeleted){
    var namaLabel = invitationDisplayName(inv);
    var isAktif = inv.status === 'aktif';
    var text = isAktif
      ? 'Undangan "' + namaLabel + '" akan dihapus permanen. Link publiknya langsung mati, dan semua data RSVP serta ucapan yang sudah masuk ikut terhapus — tidak bisa dikembalikan.'
      : 'Undangan "' + namaLabel + '" akan dihapus permanen dan tidak bisa dikembalikan.';
    var ok = await KU.confirmAction({
      title: 'Hapus Undangan "' + namaLabel + '"?',
      text: text,
      okText: 'Ya, Hapus Permanen'
    });
    if (!ok) return;

    tampilkanPesanHapus(msgEl, 'Menghapus...', '');
    var session = KU.getSession();
    var uid = session.user.id;

    var fotoRes = await hapusSemuaFotoInvitation(uid, inv.id);
    var buktiRes = await hapusSemuaBuktiTransferInvitation(inv.id);
    var res = await KU.sb.from('invitations').delete().eq('id', inv.id);
    if (res.error) {
      tampilkanPesanHapus(msgEl, 'Gagal menghapus undangan: ' + friendlyErrorMessage(res.error), 'err');
      return;
    }

    var storageErrors = fotoRes.errors.concat(buktiRes.errors);
    if (storageErrors.length) {
      tampilkanPesanHapus(msgEl, 'Undangan "' + namaLabel + '" sudah dihapus, tapi ada file (foto/bukti transfer) yang gagal dibersihkan dari storage. Data undangan sudah aman terhapus; hubungi admin kalau storage perlu dibersihkan manual.', 'err');
    } else {
      tampilkanPesanHapus(msgEl, 'Undangan "' + namaLabel + '" berhasil dihapus.', 'ok');
    }
    if (onDeleted) onDeleted();
  }

  function buatTombolHapusUndangan(inv, msgEl, onDeleted){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ucapan-admin-delete';
    btn.setAttribute('aria-label', 'Hapus undangan ' + invitationDisplayName(inv));
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>';
    btn.addEventListener('click', function(){ hapusUndanganDenganKonfirmasi(inv, msgEl, onDeleted); });
    return btn;
  }

  function buildDesainInvitationCard(inv, tpl){
    desainInvitationCard.innerHTML = '';
    desainInvitationCard.classList.add('invitation-card');

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

    var hapusBtn = buatTombolHapusUndangan(inv, desainDeleteMsg, function(){ renderDesainView(); });

    desainInvitationCard.append(hapusBtn, eyebrow, title, row);
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

  // ---------------- Harga ----------------
  // Katalog paket dipusatkan di assets/pricing-plans.js (dipakai juga
  // oleh section Harga di index.html) — lihat file itu untuk mengubah
  // harga atau daftar fitur.
  var hargaSatuanGrid = document.getElementById('hargaSatuanGrid');
  var hargaSubsGrid = document.getElementById('hargaSubsGrid');
  var hargaMsg = document.getElementById('hargaMsg');
  var hargaPlanSwitch = document.getElementById('hargaPlanSwitch');
  var hargaPlanSatuan = document.getElementById('hargaPlanSatuan');
  var hargaPlanSubs = document.getElementById('hargaPlanSubs');
  var hargaLblSatuan = document.getElementById('hargaLblSatuan');
  var hargaLblSubs = document.getElementById('hargaLblSubs');

  function showHargaMsg(text, type){
    if (!hargaMsg) return;
    hargaMsg.textContent = text || '';
    hargaMsg.className = 'workspace-msg' + (type ? ' ' + type : '');
  }

  // Belum ada gerbang pembayaran (Midtrans) — tombol "Pilih Paket" untuk
  // sekarang membawa user ke tab Bagikan pada undangan yang sedang
  // dikerjakan, tempat tombol "Aktifkan Undangan" berada (gratis untuk
  // saat ini) dan tempat gerbang bayar akan dipasang nanti. Kalau user
  // belum pernah membuat undangan sama sekali, arahkan dulu ke Template
  // Tema supaya ada yang bisa diaktifkan.
  async function pilihPaketStandar(){
    var session = KU.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    showHargaMsg('Menyiapkan...');
    var res = await KU.sb.from('invitations').select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(1);
    var inv = (!res.error && res.data && res.data.length) ? res.data[0] : null;
    var tpl = inv ? findTemplateMetaForInvitation(inv) : null;
    showHargaMsg('');
    if (!inv || !tpl) {
      showView('tema');
      showTemaMsg('Pilih tema dulu untuk mulai membuat undangan — paket Standar bisa diaktifkan dari tab Bagikan setelah itu.');
      return;
    }
    openWorkspace(inv, tpl);
    showWsTab('bagikan', true);
  }

  function renderHargaPilihBtn(){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary btn-block';
    btn.textContent = 'Pilih Paket';
    btn.addEventListener('click', pilihPaketStandar);
    return btn;
  }

  function renderHargaSection(){
    if (!hargaSatuanGrid || !hargaSubsGrid || !window.PRICING_PLANS) return;
    hargaSatuanGrid.innerHTML = '';
    window.PRICING_PLANS.satuan.forEach(function(p){
      hargaSatuanGrid.appendChild(window.renderPriceCard(p, p.tersedia ? renderHargaPilihBtn : null));
    });
    hargaSubsGrid.innerHTML = '';
    window.PRICING_PLANS.berlangganan.forEach(function(p){
      hargaSubsGrid.appendChild(window.renderPriceCard(p));
    });
  }
  renderHargaSection();

  if (hargaPlanSwitch) {
    hargaPlanSwitch.addEventListener('click', function(){
      var on = hargaPlanSwitch.classList.toggle('on');
      hargaPlanSatuan.style.display = on ? 'none' : 'block';
      hargaPlanSubs.style.display = on ? 'block' : 'none';
      hargaLblSatuan.classList.toggle('active', !on);
      hargaLblSubs.classList.toggle('active', on);
    });
  }

  // ---------------- Home (beranda) ----------------
  // Beranda cuma ringkasan cepat (sapaan, daftar undangan, angka RSVP/
  // ucapan) — pengelolaan penuh satu undangan tetap di "Desain Kamu" +
  // workspace, supaya tidak ada dua tempat yang mengerjakan hal sama.
  var homeGreeting = document.getElementById('homeGreeting');
  var homeCreateBtn = document.getElementById('homeCreateBtn');
  var homeEmptyState = document.getElementById('homeEmptyState');
  var homeEmptyCreateBtn = document.getElementById('homeEmptyCreateBtn');
  var homeInvitationList = document.getElementById('homeInvitationList');
  var homeMsg = document.getElementById('homeMsg');

  function greetingName(session){
    var name = (session.user.user_metadata && session.user.user_metadata.full_name || '').trim();
    return name || session.user.email || 'Kamu';
  }

  function renderHomeGreeting(){
    if (!homeGreeting) return;
    var session = KU.getSession();
    homeGreeting.textContent = session ? ('Halo, ' + greetingName(session)) : 'Halo!';
  }

  function buildHomeStatTile(num, label){
    var tile = document.createElement('div');
    tile.className = 'stat-tile';
    var n = document.createElement('span');
    n.className = 'stat-num';
    n.textContent = String(num);
    var l = document.createElement('span');
    l.className = 'stat-label';
    l.textContent = label;
    tile.append(n, l);
    return tile;
  }

  async function buildHomeInvitationCard(inv){
    var tpl = findTemplateMetaForInvitation(inv) || { kategori: inv.kategori_desain || '', name: inv.nama_desain || '' };
    var card = document.createElement('div');
    card.className = 'profile-block invitation-card';
    card.appendChild(buatTombolHapusUndangan(inv, homeMsg, function(){ renderHomeView(); }));

    var eyebrow = document.createElement('span');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = [tpl.kategori, tpl.name].filter(Boolean).join(' · ');

    var title = document.createElement('h3');
    title.textContent = invitationDisplayName(inv);

    var statusRow = document.createElement('div');
    statusRow.className = 'status-row';
    var badge = document.createElement('span');
    badge.className = 'badge' + (inv.status === 'aktif' ? ' badge-aktif' : '');
    badge.textContent = inv.status === 'aktif' ? 'Aktif' : 'Draf';
    var lanjutBtn = document.createElement('button');
    lanjutBtn.type = 'button';
    lanjutBtn.className = 'btn btn-primary btn-sm';
    lanjutBtn.textContent = 'Lanjutkan Mengedit';
    lanjutBtn.addEventListener('click', function(){ openWorkspace(inv, tpl); });
    statusRow.append(badge, lanjutBtn);

    card.append(eyebrow, title, statusRow);

    if (inv.status === 'aktif' && inv.slug) {
      var link = document.createElement('a');
      link.href = PUBLIC_BASE_URL + '/u/' + inv.slug;
      link.target = '_blank';
      link.rel = 'noopener';
      link.className = 'home-public-link';
      link.textContent = PUBLIC_BASE_URL.replace(/^https?:\/\//, '') + '/u/' + inv.slug;
      card.appendChild(link);
    }

    if (inv.status === 'aktif') {
      var rsvpRes = await KU.sb.from('rsvp').select('id', { count: 'exact', head: true })
        .eq('invitation_id', inv.id).eq('kehadiran', 'hadir');
      var ucapanRes = await KU.sb.from('ucapan').select('id', { count: 'exact', head: true })
        .eq('invitation_id', inv.id);
      var hadirCount = (!rsvpRes.error && rsvpRes.count != null) ? rsvpRes.count : 0;
      var ucapanCount = (!ucapanRes.error && ucapanRes.count != null) ? ucapanRes.count : 0;

      var statRow = document.createElement('div');
      statRow.className = 'stat-row home-stat-row';
      statRow.append(
        buildHomeStatTile(hadirCount, 'Konfirmasi Hadir'),
        buildHomeStatTile(ucapanCount, 'Ucapan Masuk')
      );
      card.appendChild(statRow);
    }

    return card;
  }

  async function renderHomeView(){
    renderHomeGreeting();
    if (!homeInvitationList) return;
    homeInvitationList.innerHTML = '';
    var session = KU.getSession();
    if (!session) { if (homeEmptyState) homeEmptyState.style.display = 'none'; return; }

    var res = await KU.sb.from('invitations').select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    var list = (!res.error && res.data) ? res.data : [];

    if (!list.length) {
      if (homeEmptyState) homeEmptyState.style.display = '';
      return;
    }
    if (homeEmptyState) homeEmptyState.style.display = 'none';
    for (var i = 0; i < list.length; i++) {
      homeInvitationList.appendChild(await buildHomeInvitationCard(list[i]));
    }
  }

  if (homeCreateBtn) homeCreateBtn.addEventListener('click', function(){ showView('tema'); });
  if (homeEmptyCreateBtn) homeEmptyCreateBtn.addEventListener('click', function(){ showView('tema'); });

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
      if (res.limitReached) { showTemaMsg('Kamu sudah punya ' + MAKS_DRAFT + ' undangan berstatus Draf. Hapus salah satu draft dulu, atau aktifkan salah satunya, sebelum membuat yang baru.', 'err'); return; }
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

  // ---------------- Jaring pengaman render awal ----------------
  // showView('desain') di awal file jalan SEBELUM sesi selesai
  // di-resolve, jadi renderDesainView() waktu itu masuk cabang
  // "belum login" dan memasang layar "Belum ada undangan". Biasanya
  // event 'ku:session' menyusul dan merender ulang — tapi kalau sesi
  // sudah selesai di-resolve sebelum listener di atas sempat terpasang
  // (jeda pemuatan antar <script>; balapan yang sama sudah dicatat di
  // komentar guard login), event itu tidak pernah tertangkap dan
  // layarnya tidak pernah diperbaiki. Akibatnya user yang sebenarnya
  // punya undangan melihat "Belum ada undangan" — seolah karyanya
  // hilang — sampai dia pindah view lalu kembali.
  //
  // Ditaruh di akhir file, bukan di sebelah listener-nya, karena
  // renderDesainView()/renderHomeView() memakai variabel elemen yang
  // baru di-cache jauh di bawah; dipanggil lebih awal keduanya cuma
  // akan langsung return tanpa melakukan apa-apa.
  if (!sesiSudahDirender && KU.isSessionResolved() && KU.getSession()) {
    if (document.getElementById('view-desain').classList.contains('active')) renderDesainView();
    if (document.getElementById('view-home').classList.contains('active')) renderHomeView();
    handlePendingGunakan();
  }
})();
