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
  }
  showView('desain');

  viewLinks.forEach(function(a){
    a.addEventListener('click', function(){
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
  });
  renderProfileNav(KU.getSession());

  // ---------------- Template Tema (grid) ----------------
  // Data statis untuk sekarang — tinggal tambah entri di sini begitu
  // template lain selesai dibuat. "id" harus sama dengan path folder
  // relatif di dalam templates/ (boleh bertingkat, mis. "kategori/nama")
  // supaya link Pratinjau (templates/pratinjau.html?tema=id) dan
  // thumbnail-nya tetap benar. "kategori" dipakai untuk pengelompokan
  // tampilan di grid, terpisah dari struktur folder fisiknya.
  var THEME_TEMPLATES = [
    {
      id: 'elegan-klasik/sage-rose',
      name: 'Sage Rose',
      kategori: 'Elegan Klasik',
      desc: 'Nuansa dusty rose & sage yang lembut, foto utama berbentuk kubah, dan monogram bertinta emas yang menggambar diri saat dibuka.',
      thumb: 'templates/elegan-klasik/sage-rose/assets/thumbnail.jpg'
    },
    {
      id: 'elegan-klasik/ivory-gold',
      name: 'Ivory Gold',
      kategori: 'Elegan Klasik',
      desc: 'Nuansa ivory & emas tua yang formal, motif garis tipis cincin bertaut dan hati kecil, dan tirai emas yang terbuka ke atas saat undangan dibuka.',
      thumb: 'templates/elegan-klasik/ivory-gold/assets/thumbnail.jpg'
    },
    {
      id: 'elegan-klasik/emerald-dusk',
      name: 'Emerald Dusk',
      kategori: 'Elegan Klasik',
      desc: 'Nuansa resepsi malam: latar hijau zamrud pekat, emas berkilau lembut, dan sampul yang menyingkap dari gelap lewat cahaya hangat yang melebar dari tengah.',
      thumb: 'templates/elegan-klasik/emerald-dusk/assets/thumbnail.jpg'
    }
  ];

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
  var wsTabNames = ['isi-data', 'desain', 'pratinjau', 'bagikan'];

  var paletteTemplateName = document.getElementById('paletteTemplateName');
  var paletteGrid = document.getElementById('paletteGrid');
  var paletteMsg = document.getElementById('paletteMsg');

  var pratinjauFrame = document.getElementById('pratinjauFrame');
  var pratinjauEditBtn = document.getElementById('pratinjauEditBtn');

  var currentInvitation = null;
  var currentTemplateMeta = null;

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

  function populateForm(inv){
    FORM_FIELDS.forEach(function(f){
      var el = wsForm.elements[f];
      if (!el) return;
      el.value = (inv && inv[f] != null) ? inv[f] : '';
    });
    showWsSaveMsg('');
  }

  function showWorkspaceView(){
    views.forEach(function(v){
      document.getElementById('view-' + v).classList.remove('active');
    });
    document.getElementById('view-workspace').classList.add('active');
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

  function openWorkspace(invitation, template){
    currentInvitation = invitation;
    currentTemplateMeta = template;
    wsKategori.textContent = template.kategori;
    wsNamaDesain.textContent = template.name;
    populateForm(invitation);
    renderPaletteGrid();
    showWsTab(invitation.last_active_tab || 'isi-data', false);
    showWorkspaceView();
  }

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

  if (wsBackBtn) wsBackBtn.addEventListener('click', function(){ showView('tema'); });

  wsTabButtons.forEach(function(b){
    b.addEventListener('click', function(){ showWsTab(b.dataset.tab, true); });
  });

  if (pratinjauEditBtn) pratinjauEditBtn.addEventListener('click', function(){ showWsTab('isi-data', true); });

  if (wsForm) {
    wsForm.addEventListener('submit', async function(e){
      e.preventDefault();
      if (!currentInvitation) return;
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
      showWsSaveMsg('Tersimpan!', 'ok');
    });
  }
})();
