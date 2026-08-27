(function(){
  var overlay = document.getElementById('authOverlay');
  var closeBtn = document.getElementById('authClose');
  var authTitle = document.getElementById('authTitle');
  var authSub = document.getElementById('authSub');
  var authLegal = document.getElementById('authLegal');
  var authTabs = document.getElementById('authTabs');
  var tabLoginBtn = document.getElementById('tabLoginBtn');
  var tabSignupBtn = document.getElementById('tabSignupBtn');
  var googleBtn = document.getElementById('googleBtn');
  var modalDivider = document.getElementById('modalDivider');
  var msg = document.getElementById('authMsg');

  var loginForm = document.getElementById('loginForm');
  var loginEmail = document.getElementById('loginEmail');
  var loginPassword = document.getElementById('loginPassword');
  var loginBtn = document.getElementById('loginBtn');
  var forgotLink = document.getElementById('forgotLink');
  var toSignup = document.getElementById('toSignup');
  var toSignupLink = document.getElementById('toSignupLink');

  var signupForm = document.getElementById('signupForm');
  var signupEmail = document.getElementById('signupEmail');
  var signupPassword = document.getElementById('signupPassword');
  var signupBtn = document.getElementById('signupBtn');
  var toLogin = document.getElementById('toLogin');
  var toLoginLink = document.getElementById('toLoginLink');

  var signupVerifyForm = document.getElementById('signupVerifyForm');
  var signupEmailLabel = document.getElementById('signupEmailLabel');
  var signupCode = document.getElementById('signupCode');
  var signupVerifyBtn = document.getElementById('signupVerifyBtn');
  var signupVerifyBackBtn = document.getElementById('signupVerifyBackBtn');

  var forgotForm = document.getElementById('forgotForm');
  var forgotEmail = document.getElementById('forgotEmail');
  var forgotBtn = document.getElementById('forgotBtn');
  var forgotBackBtn = document.getElementById('forgotBackBtn');

  var recoveryForm = document.getElementById('recoveryForm');
  var recoveryPassword = document.getElementById('recoveryPassword');
  var recoveryPassword2 = document.getElementById('recoveryPassword2');
  var recoveryBtn = document.getElementById('recoveryBtn');

  var navAccountBtn = document.getElementById('navAccountBtn');
  var navAccountMenu = document.getElementById('navAccountMenu');
  var menuProfilBtn = document.getElementById('menuProfilBtn');
  var menuBantuanLink = document.getElementById('menuBantuanLink');
  var menuKeluarBtn = document.getElementById('menuKeluarBtn');

  var drawerLoginBtn = document.getElementById('drawerLoginBtn');
  var drawerProfilBtn = document.getElementById('drawerProfilBtn');
  var drawerAvatar = document.getElementById('drawerAvatar');
  var drawerKeluarBtn = document.getElementById('drawerKeluarBtn');

  var profileView = document.getElementById('profileView');
  var profileName = document.getElementById('profileName');
  var profileNameSaveBtn = document.getElementById('profileNameSaveBtn');
  var profileEmail = document.getElementById('profileEmail');
  var profileBadges = document.getElementById('profileBadges');
  var profilePasswordToggleBtn = document.getElementById('profilePasswordToggleBtn');
  var profileLogoutBtn = document.getElementById('profileLogoutBtn');

  var allForms = [loginForm, signupForm, signupVerifyForm, forgotForm, recoveryForm, profileView];

  var views = {
    login:        { title:'Masuk ke akunmu', sub:'', showTabs:true,  showGoogle:true,  form:loginForm,        switchEl:toSignup, focus:loginEmail },
    signup:       { title:'Buat akun baru',  sub:'', showTabs:true,  showGoogle:true,  form:signupForm,       switchEl:toLogin,  focus:signupEmail },
    signupVerify: { title:'Verifikasi email', sub:'Masukkan kode 6 digit yang kami kirim ke emailmu.', showTabs:false, showGoogle:false, form:signupVerifyForm, switchEl:null, focus:signupCode },
    forgot:       { title:'Lupa kata sandi?', sub:'Masukkan email akunmu, kami kirim link untuk reset kata sandi.', showTabs:false, showGoogle:false, form:forgotForm, switchEl:null, focus:forgotEmail },
    recovery:     { title:'Buat Kata Sandi Baru', sub:'Masukkan kata sandi baru untuk akunmu.', showTabs:false, showGoogle:false, form:recoveryForm, switchEl:null, focus:recoveryPassword },
    profile:      { title:'Profil kamu', sub:'', showTabs:false, showGoogle:false, form:profileView, switchEl:null, focus:null }
  };

  function showMsg(text, type){
    msg.textContent = text || '';
    msg.className = 'auth-msg' + (type ? ' ' + type : '');
  }

  var currentView = 'login';

  function showView(name){
    currentView = name;
    var v = views[name];
    authTitle.textContent = v.title;
    authSub.textContent = v.sub;
    allForms.forEach(function(f){ f.style.display = (f === v.form) ? 'block' : 'none'; });
    toSignup.style.display = (v.switchEl === toSignup) ? 'block' : 'none';
    toLogin.style.display = (v.switchEl === toLogin) ? 'block' : 'none';
    authTabs.style.display = v.showTabs ? 'flex' : 'none';
    googleBtn.style.display = v.showGoogle ? 'flex' : 'none';
    modalDivider.style.display = v.showGoogle ? 'flex' : 'none';
    authLegal.style.display = (name === 'login' || name === 'signup') ? 'block' : 'none';
    tabLoginBtn.classList.toggle('active', name === 'login');
    tabSignupBtn.classList.toggle('active', name === 'signup');
    showMsg('');
  }

  function resetForms(){
    allForms.forEach(function(f){ if (f.tagName === 'FORM') f.reset(); });
    document.querySelectorAll('.pw-toggle').forEach(function(btn){
      var input = document.getElementById(btn.dataset.target);
      if (input) input.type = 'password';
      btn.classList.remove('is-visible');
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Tampilkan kata sandi');
    });
  }

  function initPasswordToggles(){
    document.querySelectorAll('.pw-toggle').forEach(function(btn){
      btn.addEventListener('click', function(){
        var input = document.getElementById(btn.dataset.target);
        if (!input) return;
        var toText = input.type === 'password';
        input.type = toText ? 'text' : 'password';
        btn.classList.toggle('is-visible', toText);
        btn.setAttribute('aria-pressed', String(toText));
        btn.setAttribute('aria-label', toText ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      });
    });
  }
  initPasswordToggles();

  function openModal(view){
    resetForms();
    var name = view || 'login';
    showView(name);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function(){ if (views[name].focus) views[name].focus.focus(); }, 50);
  }
  function closeModal(){
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function makeBadge(text){
    var span = document.createElement('span');
    span.className = 'badge';
    span.textContent = text;
    return span;
  }

  function renderProfile(){
    var session = KU.getSession();
    if (!session) return;
    var user = session.user;
    profileName.value = user.user_metadata.full_name || '';
    profileEmail.textContent = user.email || '';

    var identities = user.identities || [];
    var hasGoogle = identities.some(function(i){ return i.provider === 'google'; });
    var hasPw = KU.hasPasswordIdentity(session);

    profileBadges.innerHTML = '';
    if (hasGoogle) profileBadges.appendChild(makeBadge('Google'));
    if (hasPw) profileBadges.appendChild(makeBadge('Email'));

    profilePasswordToggleBtn.textContent = hasPw ? 'Ganti Kata Sandi' : 'Atur Kata Sandi';
  }

  function openProfileModal(){
    openModal('profile');
    renderProfile();
  }

  closeBtn.addEventListener('click', closeModal);
  KU.registerEscapeHandler(function(){
    if (overlay.classList.contains('open')) closeModal();
    return false;
  });

  tabLoginBtn.addEventListener('click', function(){ showView('login'); loginEmail.focus(); });
  tabSignupBtn.addEventListener('click', function(){ showView('signup'); signupEmail.focus(); });
  toSignupLink.addEventListener('click', function(e){ e.preventDefault(); showView('signup'); signupEmail.focus(); });
  toLoginLink.addEventListener('click', function(e){ e.preventDefault(); showView('login'); loginEmail.focus(); });

  googleBtn.addEventListener('click', async function(){
    showMsg('Mengalihkan ke Google...');
    googleBtn.disabled = true;
    views[currentView].form.style.display = 'none';
    var res = await KU.sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (res.error) {
      views[currentView].form.style.display = 'block';
      googleBtn.disabled = false;
      showMsg(res.error.message, 'err');
    }
  });

  loginForm.addEventListener('submit', async function(e){
    e.preventDefault();
    var email = loginEmail.value.trim();
    var password = loginPassword.value;
    loginBtn.disabled = true;
    showMsg('Memproses...');
    var res = await KU.sb.auth.signInWithPassword({ email: email, password: password });
    loginBtn.disabled = false;
    if (res.error) { showMsg('Email atau kata sandi salah. Kalau kamu daftar lewat Google, coba tombol "Lanjutkan dengan Google" di atas.', 'err'); return; }
    showMsg('Berhasil masuk!', 'ok');
    setTimeout(closeModal, 700);
  });

  forgotLink.addEventListener('click', function(e){
    e.preventDefault();
    forgotEmail.value = loginEmail.value.trim();
    showView('forgot');
    forgotEmail.focus();
  });

  forgotBackBtn.addEventListener('click', function(){
    showView('login');
    loginEmail.focus();
  });

  forgotForm.addEventListener('submit', async function(e){
    e.preventDefault();
    var email = forgotEmail.value.trim();
    forgotBtn.disabled = true;
    showMsg('Mengirim...');
    var res = await KU.sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    forgotBtn.disabled = false;
    if (res.error) { showMsg(res.error.message, 'err'); return; }
    showMsg('Cek email kamu untuk link reset kata sandi.', 'ok');
  });

  signupForm.addEventListener('submit', async function(e){
    e.preventDefault();
    var email = signupEmail.value.trim();
    var password = signupPassword.value;
    signupBtn.disabled = true;
    showMsg('Memproses...');
    var res = await KU.sb.auth.signUp({ email: email, password: password });
    var alreadyRegistered = (res.error && /registered|exists/i.test(res.error.message)) ||
      (!res.error && res.data && res.data.user && Array.isArray(res.data.user.identities) && res.data.user.identities.length === 0);
    if (res.error && !alreadyRegistered) {
      signupBtn.disabled = false;
      showMsg(res.error.message, 'err');
      return;
    }
    if (alreadyRegistered) {
      signupBtn.disabled = false;
      showMsg('Email ini sudah terdaftar. Silakan gunakan menu Masuk.', 'err');
      return;
    }
    signupBtn.disabled = false;
    signupEmailLabel.textContent = email;
    showView('signupVerify');
    showMsg('Kode terkirim, cek emailmu.', 'ok');
    setTimeout(function(){ signupCode.focus(); }, 50);
  });

  signupVerifyBackBtn.addEventListener('click', function(){
    showView('signup');
    signupEmail.focus();
  });

  signupVerifyForm.addEventListener('submit', async function(e){
    e.preventDefault();
    var email = signupEmailLabel.textContent;
    var code = signupCode.value.trim();
    if (code.length !== 6) { showMsg('Masukkan 6 digit kode dari email.', 'err'); return; }
    signupVerifyBtn.disabled = true;
    showMsg('Memverifikasi...');
    var res = await KU.sb.auth.verifyOtp({ email: email, token: code, type: 'signup' });
    signupVerifyBtn.disabled = false;
    if (res.error) { showMsg(res.error.message, 'err'); return; }
    showMsg('Berhasil! Kamu sudah masuk.', 'ok');
    setTimeout(closeModal, 700);
  });

  recoveryForm.addEventListener('submit', async function(e){
    e.preventDefault();
    var p1 = recoveryPassword.value;
    var p2 = recoveryPassword2.value;
    if (p1.length < 6) { showMsg('Kata sandi minimal 6 karakter.', 'err'); return; }
    if (p1 !== p2) { showMsg('Konfirmasi kata sandi tidak sama.', 'err'); return; }
    recoveryBtn.disabled = true;
    showMsg('Menyimpan...');
    var res = await KU.sb.auth.updateUser({ password: p1, data: { has_password: true } });
    recoveryBtn.disabled = false;
    if (res.error) { showMsg(res.error.message, 'err'); return; }
    showMsg('Kata sandi berhasil diperbarui!', 'ok');
    setTimeout(function(){ showView('login'); }, 1200);
  });

  function applySession(session){
    var loggedIn = !!session;
    var label = loggedIn ? (session.user.email || session.user.user_metadata.full_name || 'Akun') : null;

    Array.prototype.forEach.call(document.querySelectorAll('a.nav-login-plain'), function(a){
      a.textContent = loggedIn ? label : 'Masuk';
      a.dataset.mode = loggedIn ? 'signout' : 'login';
      a.title = loggedIn ? 'Klik untuk keluar' : '';
    });

    drawerLoginBtn.style.display = loggedIn ? 'none' : '';
    drawerProfilBtn.style.display = loggedIn ? 'block' : 'none';
    if (loggedIn) drawerAvatar.textContent = KU.getInitial(session);
    drawerKeluarBtn.style.display = loggedIn ? 'block' : 'none';

    Array.prototype.forEach.call(document.querySelectorAll('a.nav-signup'), function(a){
      a.dataset.mode = loggedIn ? 'signout' : 'signup';
      a.style.display = loggedIn ? 'none' : '';
    });

    // CTA di badan halaman TIDAK disembunyikan seperti .nav-signup —
    // menghilangkannya menyisakan bagian yang timpang (judul ajakan tanpa
    // tombol, bilah sticky tanpa aksi). Yang salah cuma katanya: menyuruh
    // "Daftar" orang yang jelas-jelas sudah masuk. Jadi labelnya ditukar,
    // dan klik-nya sudah diarahkan ke app.html oleh listener di bawah.
    Array.prototype.forEach.call(document.querySelectorAll('.cta-daftar'), function(a){
      if (!a.dataset.labelTamu) a.dataset.labelTamu = a.textContent;
      a.textContent = loggedIn ? (a.dataset.labelMasuk || a.dataset.labelTamu) : a.dataset.labelTamu;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.cta-daftar-teks'), function(p){
      if (!p.dataset.teksTamu) p.dataset.teksTamu = p.textContent;
      p.textContent = loggedIn ? (p.dataset.teksMasuk || p.dataset.teksTamu) : p.dataset.teksTamu;
    });
  }

  document.addEventListener('click', async function(e){
    var toggle = e.target.closest('#navAccountBtn');
    if (toggle) {
      e.preventDefault();
      if (toggle.dataset.mode === 'account') {
        navAccountMenu.classList.toggle('open');
      } else {
        openModal('login');
      }
      return;
    }
    var a = e.target.closest('a[href="#masuk"], a[href="#daftar"]');
    if (a) {
      e.preventDefault();
      if (a.dataset.mode === 'signout') { if (await KU.confirmLogout()) KU.sb.auth.signOut(); return; }
      if (a.getAttribute('href') === '#daftar' && KU.getSession()) {
        // Sudah masuk: CTA di badan halaman ("Lanjut ke dashboard")
        // membawanya ke beranda dashboard, tempat draf yang sudah ada
        // terlihat. Yang masih menuju pemilih tema hanya tombol yang
        // memang berjanji begitu — mis. "Pilih Paket" di bagian Harga.
        window.location.href = a.classList.contains('cta-daftar') ? 'app.html' : 'app.html?view=tema';
        return;
      }
      openModal(a.getAttribute('href') === '#masuk' ? 'login' : 'signup');
      return;
    }
  });

  menuProfilBtn.addEventListener('click', function(){
    navAccountMenu.classList.remove('open');
    openProfileModal();
  });
  menuBantuanLink.addEventListener('click', function(){
    navAccountMenu.classList.remove('open');
  });
  menuKeluarBtn.addEventListener('click', async function(){
    navAccountMenu.classList.remove('open');
    if (!(await KU.confirmLogout())) return;
    KU.sb.auth.signOut();
  });

  drawerProfilBtn.addEventListener('click', function(e){ e.preventDefault(); openProfileModal(); });
  drawerKeluarBtn.addEventListener('click', async function(e){
    e.preventDefault();
    if (!(await KU.confirmLogout())) return;
    KU.sb.auth.signOut();
  });

  profileNameSaveBtn.addEventListener('click', async function(){
    var name = profileName.value.trim();
    profileNameSaveBtn.disabled = true;
    showMsg('Menyimpan...');
    var res = await KU.sb.auth.updateUser({ data: { full_name: name } });
    profileNameSaveBtn.disabled = false;
    if (res.error) { showMsg(res.error.message, 'err'); return; }
    showMsg('Nama tersimpan.', 'ok');
  });

  profilePasswordToggleBtn.addEventListener('click', async function(){
    var session = KU.getSession();
    if (!session) return;
    profilePasswordToggleBtn.disabled = true;
    showMsg('Mengirim...');
    var res = await KU.sb.auth.resetPasswordForEmail(session.user.email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    profilePasswordToggleBtn.disabled = false;
    if (res.error) { showMsg(res.error.message, 'err'); return; }
    showMsg('Link reset kata sandi sudah dikirim ke emailmu.', 'ok');
  });

  profileLogoutBtn.addEventListener('click', async function(){
    if (!(await KU.confirmLogout())) return;
    closeModal();
    KU.sb.auth.signOut();
  });

  // #masuk (dipakai guard redirect app.html -- lihat assets/dashboard.js
  // dan PENDING_TEMPLATE_KEY di bawah untuk pola balik-setelah-masuk
  // yang sama) -- buka modal Masuk otomatis begitu halaman ini dibuka.
  if (window.location.hash === '#masuk') {
    openModal('login');
    window.history.replaceState(null, '', window.location.pathname);
  }

  function hasRecoveryParams(){
    var hash = window.location.hash || '';
    var search = window.location.search || '';
    return /type=recovery/.test(hash) || /type=recovery/.test(search);
  }
  if (hasRecoveryParams()) {
    openModal('recovery');
    window.history.replaceState(null, '', window.location.pathname);
  }

  document.addEventListener('ku:authevent', function(e){
    if (e.detail.event === 'PASSWORD_RECOVERY') openModal('recovery');
  });
  document.addEventListener('ku:session', function(e){
    applySession(e.detail.session);
  });

  // ---------------- Metode pembayaran di footer ----------------
  // Tiap chip mencoba memuat logo dari assets/pembayaran/ — .svg dulu,
  // lalu .png — dan kalau dua-duanya tidak ada, jatuh ke nama metodenya
  // sebagai teks. Jadi footer tidak pernah terlihat rusak walaupun berkas
  // logonya belum lengkap, dan begitu berkasnya ditaruh di folder itu,
  // logonya langsung muncul tanpa mengubah kode apa pun.
  //
  // Daftarnya harus cocok dengan KANAL_AKTIF di api/_lib/midtrans.js —
  // mengiklankan metode yang tidak muncul di popup adalah cara tercepat
  // kehilangan kepercayaan tepat di detik orang mau bayar. Nama-nama bank
  // di bawah semuanya tercakup oleh kanal 'bank_transfer' dan 'echannel'.
  var METODE_BAYAR = [
    { nama: 'QRIS', berkas: 'qris' },
    { nama: 'GoPay', berkas: 'gopay' },
    { nama: 'ShopeePay', berkas: 'shopeepay' },
    { nama: 'BCA', berkas: 'bca' },
    { nama: 'BNI', berkas: 'bni' },
    { nama: 'BRI', berkas: 'bri' },
    { nama: 'Mandiri', berkas: 'mandiri' },
    { nama: 'Permata', berkas: 'permata' },
    { nama: 'CIMB Niaga', berkas: 'cimb' },
    { nama: 'BSI', berkas: 'bsi' }
  ];

  function renderMetodeBayar(){
    var list = document.getElementById('payList');
    if (!list) return;
    list.innerHTML = '';

    METODE_BAYAR.forEach(function(m){
      var li = document.createElement('li');
      li.className = 'pay-chip';

      var teks = document.createElement('span');
      teks.className = 'pay-teks';
      teks.textContent = m.nama;

      var img = document.createElement('img');
      img.alt = m.nama;
      img.loading = 'lazy';
      img.className = 'pay-logo-img';
      // Dicoba .svg dulu; sekali gagal, ganti ke .png; gagal lagi berarti
      // berkasnya memang belum ada — gambarnya dibuang, teksnya bertahan.
      var sudahCobaPng = false;
      img.addEventListener('error', function(){
        if (!sudahCobaPng) {
          sudahCobaPng = true;
          img.src = 'assets/pembayaran/' + m.berkas + '.png';
          return;
        }
        img.remove();
        teks.classList.add('tampil');
      });
      img.addEventListener('load', function(){ teks.classList.remove('tampil'); });
      img.src = 'assets/pembayaran/' + m.berkas + '.svg';

      // Teks dipasang lebih dulu dan baru disembunyikan kalau gambarnya
      // benar-benar berhasil dimuat. Urutan ini disengaja: kalau gambarnya
      // gagal, tidak ada satu momen pun chip-nya kosong.
      teks.classList.add('tampil');
      li.append(img, teks);
      list.appendChild(li);
    });
  }
  renderMetodeBayar();

  // ---------------- Tema (section landing) ----------------
  // Katalog & thumbnail dipusatkan di assets/theme-templates.js (satu-
  // satunya sumber, dipakai bareng app.html) — di sini cuma menata kartu
  // & menyambungkan Preview/Gunakan ke jalur yang sama dipakai dashboard.
  var landingThemeGrid = document.getElementById('landingThemeGrid');
  var PENDING_TEMPLATE_KEY = 'ku-pending-template';
  // Sama polanya dengan PENDING_TEMPLATE_KEY di atas, tapi diisi oleh
  // guard redirect app.html (assets/dashboard.js) saat pengunjung
  // anonim membuka dashboard langsung -- ke situ juga tempatnya balik
  // begitu berhasil masuk (lihat listener 'ku:session' di bawah).
  var PENDING_RETURN_KEY = 'ku-pending-return';

  // Harga paket yang benar-benar bisa dibeli, diambil dari katalog
  // assets/pricing-plans.js. Dipakai kartu tema supaya angkanya tidak
  // pernah berbeda dari section Harga di halaman yang sama.
  function hargaPaketStandar(){
    var daftar = (window.PRICING_PLANS && window.PRICING_PLANS.satuan) || [];
    for (var i = 0; i < daftar.length; i++) {
      if (daftar[i].tersedia) return daftar[i].harga;
    }
    return 0;
  }

  // Kartu tema dibangun perender bersama di assets/theme-templates.js —
  // halaman ini dan tab Template Tema di dashboard dulu punya salinan
  // markup masing-masing dan sempat berbeda tanpa alasan.
  function renderLandingThemeCard(t){
    return window.renderThemeCard(t, {
      harga: hargaPaketStandar(),
      tombolLihat: { teks: 'Pratinjau' },
      tombolPakai: { teks: 'Gunakan Tema' },
      kelasPakai: 'landing-tpl-use-btn'
    });
  }

  function renderLandingThemeGrid(){
    if (!landingThemeGrid || !window.THEME_TEMPLATES) return;
    landingThemeGrid.innerHTML = '';
    window.THEME_TEMPLATES.forEach(function(t){ landingThemeGrid.appendChild(renderLandingThemeCard(t)); });
    window.isiPemakaiTema(landingThemeGrid);
  }
  renderLandingThemeGrid();

  // ---------------- Harga ----------------
  // Katalog paket dipusatkan di assets/pricing-plans.js (dipakai juga
  // oleh tab Harga di dashboard) — lihat file itu untuk mengubah harga
  // atau daftar fitur. Tombol "Pilih Paket" Standar pakai href="#daftar"
  // biasa supaya lewat jalur modal masuk/daftar yang sama seperti tombol
  // CTA lain di halaman ini (lihat listener document 'click' di bawah).
  function renderPilihStandarBtn(){
    var a = document.createElement('a');
    a.className = 'btn btn-primary btn-block';
    a.href = '#daftar';
    a.textContent = 'Pilih Paket';
    return a;
  }

  function renderPricingSection(){
    var satuanGrid = document.getElementById('planSatuanGrid');
    var subsGrid = document.getElementById('planSubsGrid');
    if (!satuanGrid || !subsGrid || !window.PRICING_PLANS) return;
    satuanGrid.innerHTML = '';
    window.PRICING_PLANS.satuan.forEach(function(p){
      satuanGrid.appendChild(window.renderPriceCard(p, p.tersedia ? renderPilihStandarBtn : null));
    });
    subsGrid.innerHTML = '';
    window.PRICING_PLANS.berlangganan.forEach(function(p){
      subsGrid.appendChild(window.renderPriceCard(p));
    });
  }
  renderPricingSection();

  // Login butuh keluar dari index.html ke app.html (workspace editor
  // ada di sana) — kalau belum masuk, tema pilihan disimpan dulu di
  // sessionStorage supaya begitu modal login berhasil, kita lanjutkan
  // otomatis ke app.html?gunakan=<id> alih-alih membuang pilihannya.
  if (landingThemeGrid) {
    landingThemeGrid.addEventListener('click', function(e){
      var btn = e.target.closest('.landing-tpl-use-btn');
      if (!btn) return;
      if (KU.getSession()) {
        window.location.href = 'app.html?gunakan=' + encodeURIComponent(btn.dataset.id);
        return;
      }
      try { sessionStorage.setItem(PENDING_TEMPLATE_KEY, btn.dataset.id); } catch (e2) {}
      openModal('login');
    });
  }

  document.addEventListener('ku:session', function(e){
    if (!e.detail.session) return;

    var returnTo;
    try { returnTo = sessionStorage.getItem(PENDING_RETURN_KEY); } catch (e3) { returnTo = null; }
    if (returnTo) {
      try { sessionStorage.removeItem(PENDING_RETURN_KEY); } catch (e3) {}
      window.location.href = returnTo;
      return;
    }

    var pendingId;
    try { pendingId = sessionStorage.getItem(PENDING_TEMPLATE_KEY); } catch (e2) { pendingId = null; }
    if (!pendingId) return;
    try { sessionStorage.removeItem(PENDING_TEMPLATE_KEY); } catch (e2) {}
    window.location.href = 'app.html?gunakan=' + encodeURIComponent(pendingId);
  });
})();
