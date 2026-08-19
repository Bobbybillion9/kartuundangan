(function(){
  var themeBtn = document.getElementById('themeBtn');
  var sun = document.getElementById('iconSun');
  var moon = document.getElementById('iconMoon');
  try {
    var saved = localStorage.getItem('ku-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme','dark');
    }
  } catch(e){}
  function syncIcon(){
    var t = document.documentElement.getAttribute('data-theme');
    sun.style.display = t === 'dark' ? 'none' : 'block';
    moon.style.display = t === 'dark' ? 'block' : 'none';
  }
  syncIcon();
  themeBtn.addEventListener('click', function(){
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('ku-theme', next); } catch(e){}
    syncIcon();
  });

  var drawer = document.getElementById('drawer');
  document.getElementById('burgerBtn').addEventListener('click', function(){
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  function closeIt(){
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.getElementById('closeDrawer').addEventListener('click', closeIt);
  Array.prototype.forEach.call(drawer.querySelectorAll('a'), function(a){
    a.addEventListener('click', closeIt);
  });

  var sw = document.getElementById('planSwitch');
  var satuan = document.getElementById('planSatuan');
  var subs = document.getElementById('planSubs');
  var lblS = document.getElementById('lblSatuan');
  var lblB = document.getElementById('lblSubs');
  sw.addEventListener('click', function(){
    var on = sw.classList.toggle('on');
    satuan.style.display = on ? 'none' : 'block';
    subs.style.display = on ? 'block' : 'none';
    lblS.classList.toggle('active', !on);
    lblB.classList.toggle('active', on);
  });

  var hero = document.querySelector('.hero');
  var sticky = document.getElementById('stickyCta');
  window.addEventListener('scroll', function(){
    var b = hero.getBoundingClientRect().bottom;
    if (b < 0 && window.innerWidth <= 960) sticky.classList.add('show');
    else sticky.classList.remove('show');
  }, {passive:true});

  var track = document.getElementById('sliderTrack');
  var viewport = document.querySelector('.slider-viewport');
  var dotsWrap = document.getElementById('sliderDots');
  var prevBtn = document.getElementById('sliderPrev');
  var nextBtn = document.getElementById('sliderNext');
  var slides = Array.prototype.slice.call(track.children);
  var slideCount = slides.length;
  var activeSlide = 0;

  slides.forEach(function(_, i){
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'slider-dot';
    dot.setAttribute('aria-label', 'Ke slide ' + (i + 1));
    dot.addEventListener('click', function(){ goToSlide(i); });
    dotsWrap.appendChild(dot);
  });
  var dots = Array.prototype.slice.call(dotsWrap.children);

  function renderSlider(){
    slides.forEach(function(s, i){
      var diff = (i - activeSlide + slideCount) % slideCount;
      var pos = diff === 0 ? 'active' : diff === 1 ? 'next' : diff === slideCount - 1 ? 'prev' : 'hidden';
      s.dataset.pos = pos;
    });
    dots.forEach(function(d, i){ d.classList.toggle('active', i === activeSlide); });
  }
  function goToSlide(i){
    activeSlide = (i + slideCount) % slideCount;
    renderSlider();
  }
  function nextSlide(){ goToSlide(activeSlide + 1); }
  function prevSlide(){ goToSlide(activeSlide - 1); }

  prevBtn.addEventListener('click', prevSlide);
  nextBtn.addEventListener('click', nextSlide);

  var touchStartX = null;
  var touchCurrentX = null;
  viewport.addEventListener('touchstart', function(e){
    touchStartX = touchCurrentX = e.touches[0].clientX;
  }, {passive:true});
  viewport.addEventListener('touchmove', function(e){
    touchCurrentX = e.touches[0].clientX;
  }, {passive:true});
  viewport.addEventListener('touchend', function(){
    if (touchStartX === null || touchCurrentX === null) return;
    var dx = touchCurrentX - touchStartX;
    if (Math.abs(dx) > 40) { dx < 0 ? nextSlide() : prevSlide(); }
    touchStartX = touchCurrentX = null;
  });

  renderSlider();
})();
