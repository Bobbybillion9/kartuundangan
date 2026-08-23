(function(){
  var SUPABASE_URL = 'https://ebjwjnxunedjftgzzbch.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_qUFa64f8yhx_3dYYwaP3Aw_kHD6JvuA';
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { flowType: 'implicit' }
  });

  var currentSession = null;
  // sb.auth.getSession() sering kali sudah selesai (dan sudah men-
  // dispatch 'ku:session' sekali) SEBELUM <script> halaman berikutnya
  // (mis. assets/dashboard.js) sempat memasang listadapternya sendiri --
  // dispatch pertama itu jadi tidak pernah tertangkap. Flag ini
  // membedakan "belum diketahui" dari "sudah dicek, memang tidak ada
  // sesi", supaya kode yang datang belakangan bisa mengecek sinkron
  // lewat KU.isSessionResolved()+KU.getSession() alih-alih cuma
  // mengandalkan event yang bisa saja sudah lewat.
  var sessionResolved = false;

  function getInitial(session){
    var name = (session.user.user_metadata && session.user.user_metadata.full_name || '').trim();
    var source = name || session.user.email || '';
    return source.charAt(0).toUpperCase() || '?';
  }

  function hasPasswordIdentity(session){
    var identities = session.user.identities || [];
    return identities.some(function(i){ return i.provider === 'email'; })
        || !!(session.user.user_metadata && session.user.user_metadata.has_password);
  }

  var confirmOverlay = document.getElementById('confirmOverlay');
  var confirmTitleEl = document.getElementById('confirmTitle');
  var confirmTextEl = document.getElementById('confirmText');
  var confirmOkBtn = document.getElementById('confirmOkBtn');
  var confirmCancelBtn = document.getElementById('confirmCancelBtn');
  var confirmCloseBtn = document.getElementById('confirmClose');

  // Modal konfirmasi Ya/Batal generik — dipakai logout dan aksi lain
  // yang perlu konfirmasi (mis. nonaktifkan undangan) lewat satu modal
  // yang sama, tinggal timpa judul/teks/label tombolnya.
  function confirmAction(opts){
    opts = opts || {};
    confirmTitleEl.textContent = opts.title || 'Konfirmasi';
    confirmTextEl.textContent = opts.text || '';
    confirmOkBtn.textContent = opts.okText || 'Ya';
    return new Promise(function(resolve){
      confirmOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      function cleanup(result){
        confirmOverlay.classList.remove('open');
        document.body.style.overflow = '';
        confirmOkBtn.removeEventListener('click', onOk);
        confirmCancelBtn.removeEventListener('click', onCancel);
        confirmCloseBtn.removeEventListener('click', onCancel);
        resolve(result);
      }
      function onOk(){ cleanup(true); }
      function onCancel(){ cleanup(false); }
      confirmOkBtn.addEventListener('click', onOk);
      confirmCancelBtn.addEventListener('click', onCancel);
      confirmCloseBtn.addEventListener('click', onCancel);
    });
  }

  function confirmLogout(){
    return confirmAction({ title: 'Konfirmasi Keluar', text: 'Yakin mau keluar dari akun ini?', okText: 'Ya, Keluar' });
  }

  var navAccountBtn = document.getElementById('navAccountBtn');
  var navAccountText = document.getElementById('navAccountText');
  var navAvatar = document.getElementById('navAvatar');
  var navAccountMenu = document.getElementById('navAccountMenu');

  function applySessionCore(session){
    currentSession = session;
    sessionResolved = true;
    var loggedIn = !!session;
    var label = loggedIn ? (session.user.email || session.user.user_metadata.full_name || 'Akun') : null;

    if (navAccountText) navAccountText.style.display = loggedIn ? 'none' : 'inline';
    if (navAvatar) {
      navAvatar.style.display = loggedIn ? 'inline-flex' : 'none';
      if (loggedIn) navAvatar.textContent = getInitial(session);
    }
    if (navAccountBtn) {
      navAccountBtn.title = loggedIn ? label : '';
      navAccountBtn.dataset.mode = loggedIn ? 'account' : 'login';
    }
    if (navAccountMenu) navAccountMenu.classList.remove('open');
  }

  document.addEventListener('click', function(e){
    if (navAccountMenu && !e.target.closest('#navAccount')) navAccountMenu.classList.remove('open');
  });

  var escapeHandlers = [];
  function registerEscapeHandler(fn){ escapeHandlers.push(fn); }

  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    if (confirmOverlay.classList.contains('open')) { confirmCancelBtn.click(); return; }
    for (var i = 0; i < escapeHandlers.length; i++) {
      if (escapeHandlers[i]()) return;
    }
    if (navAccountMenu) navAccountMenu.classList.remove('open');
  });

  function emitSession(session){
    document.dispatchEvent(new CustomEvent('ku:session', { detail: { session: session } }));
  }

  sb.auth.onAuthStateChange(function(event, session){
    applySessionCore(session);
    document.dispatchEvent(new CustomEvent('ku:authevent', { detail: { event: event, session: session } }));
    emitSession(session);
  });
  sb.auth.getSession().then(function(res){
    applySessionCore(res.data.session);
    emitSession(res.data.session);
  });

  window.KU = {
    sb: sb,
    getInitial: getInitial,
    hasPasswordIdentity: hasPasswordIdentity,
    confirmLogout: confirmLogout,
    confirmAction: confirmAction,
    getSession: function(){ return currentSession; },
    isSessionResolved: function(){ return sessionResolved; },
    registerEscapeHandler: registerEscapeHandler
  };
})();
