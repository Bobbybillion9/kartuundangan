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
    useBtn.className = 'btn btn-ghost';
    useBtn.disabled = true;
    useBtn.setAttribute('aria-disabled', 'true');
    var useLabel = document.createElement('span');
    useLabel.textContent = 'Gunakan';
    var useBadge = document.createElement('span');
    useBadge.className = 'badge';
    useBadge.textContent = 'Segera Hadir';
    useBtn.append(useLabel, useBadge);

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
})();
