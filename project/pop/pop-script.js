/* ============================================================
   KEMETED SAVEUR — POP SODA scroll engine
   ============================================================ */
(function(){
  'use strict';
  const CFG = window.POP_CFG = window.POP_CFG || {};
  const cfg = (k,d)=> (CFG[k]!==undefined ? CFG[k] : d);

  /* nav scrolled */
  const nav = document.querySelector('.nav');
  const navScroll = ()=> nav.classList.toggle('scrolled', scrollY>40);
  addEventListener('scroll', navScroll, {passive:true}); navScroll();

  /* reveals — continuous, scroll-linked entrance instead of a one-shot CSS
     transition: opacity/translate track scroll progress directly, so the
     pace of the reveal follows the pace of the scroll (slow scroll = slow
     reveal). Locks its final inline state once fully in, like before, so a
     throttled frame never leaves an element half-hidden. */
  const reveals = [...document.querySelectorAll('.reveal')];
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const revealDelayPx = el => el.classList.contains('d4') ? 150
    : el.classList.contains('d3') ? 110
    : el.classList.contains('d2') ? 75
    : el.classList.contains('d1') ? 40 : 0;
  reveals.forEach(el => { el.style.transition = 'none'; });
  function checkReveals(){
    const start = innerHeight*0.92, end = innerHeight*0.5;
    for(const el of reveals){
      if(el.dataset.shown) continue;
      const top = el.getBoundingClientRect().top - revealDelayPx(el);
      const p = Math.min(1, Math.max(0, (start - top) / (start - end)));
      if (p <= 0) continue;
      const e = easeOutCubic(p);
      el.style.opacity = e;
      el.style.transform = p >= 1 ? 'none' : `translateY(${(1-e)*34}px) scale(${(0.95 + e*0.05).toFixed(3)})`;
      if (p >= 1) el.dataset.shown = '1';
    }
  }

  /* parallax blobs + any [data-parallax] */
  const plx = [...document.querySelectorAll('[data-parallax]')];
  const blobs = [...document.querySelectorAll('#blobs .blob')];
  function cachePlx(){ plx.forEach(el => { el._plxTop = el.getBoundingClientRect().top + scrollY; el._plxH = el.offsetHeight; }); }
  cachePlx();

  /* ---- lazy video loading: only fetch a clip once its section is close
     to the viewport, instead of every <video> competing for bandwidth on
     page load (that contention is what made clips feel slow to "trigger"). ---- */
  function ensureLoaded(vid){
    if (vid.dataset.src) {
      vid.src = vid.dataset.src;
      delete vid.dataset.src;
      vid.load();
    }
  }
  const lazyObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      ensureLoaded(e.target);
      lazyObs.unobserve(e.target);
    });
  }, {rootMargin: '800px 0px', threshold: 0.01});
  document.querySelectorAll('video[data-src]').forEach(vid => lazyObs.observe(vid));

  /* ---- loop vids (autoplay + boucle dès que visible) ---- */
  const loopVids = [...document.querySelectorAll('.loop-vid')];
  loopVids.forEach(vid => {
    vid.muted = true; vid.loop = true;
    vid.addEventListener('loadeddata', () => { if (vid.dataset.intersecting === '1') vid.play().catch(()=>{}); });
  });
  const loopObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const vid = e.target;
      vid.dataset.intersecting = e.isIntersecting ? '1' : '0';
      if (e.isIntersecting) { ensureLoaded(vid); vid.play().catch(()=>{}); }
      else vid.pause();
    });
  }, {threshold: 0.25});
  loopVids.forEach(vid => loopObs.observe(vid));

  /* ---- video scroll scrub (sections normales) ---- */
  const scrollVids = [];
  document.querySelectorAll('.scroll-vid').forEach(vid => {
    vid.muted = true;
    const section = vid.closest('section');
    if (section) scrollVids.push({ vid, section });
  });
  function scrubVideos(){
    const vh = innerHeight, sy = scrollY;
    scrollVids.forEach(({vid, section}) => {
      if (!vid.duration || isNaN(vid.duration)) return;
      const top = section.offsetTop, h = section.offsetHeight;
      const progress = Math.min(1, Math.max(0, (sy + vh - top) / (h + vh)));
      const t = progress * vid.duration;
      if (Math.abs(vid.currentTime - t) > 0.04) vid.currentTime = t;
    });
  }

  /* ---- vid-pin: sticky fullscreen scroll-scrub ---- */
  const vidPins = [...document.querySelectorAll('.vid-pin')];
  function scrubPins(){
    const sy = scrollY, vh = innerHeight;
    vidPins.forEach(section => {
      const vid = section.querySelector('video');
      const bar = section.querySelector('.vid-pin__bar');
      if (!vid || !vid.duration || isNaN(vid.duration)) return;
      const top = section.offsetTop;
      const scrollable = section.offsetHeight - vh;
      if (scrollable <= 0) return;
      const progress = Math.min(1, Math.max(0, (sy - top) / scrollable));
      const t = progress * vid.duration;
      if (Math.abs(vid.currentTime - t) > 0.04) vid.currentTime = t;
      if (bar) bar.style.width = (progress * 100) + '%';
    });
  }

  /* ---- smoothed scroll engine ----
     A persistent rAF loop lerps a `smoothY` value toward the real scroll
     position. Parallax/blobs read smoothY, so their motion keeps easing
     between scroll events instead of jumping in scroll-event-sized steps —
     this is what actually reads as "fluid" rather than mechanical. The loop
     self-stops once settled (no wasted frames while idle) and restarts on
     the next scroll. Video scrubbing stays on the raw position so pinned
     clips remain exactly locked to the scrollbar. */
  let smoothY = scrollY, looping = false;
  function frame(){
    const diff = scrollY - smoothY;
    smoothY += diff * 0.16;
    if (Math.abs(diff) < 0.4) smoothY = scrollY;

    const k = cfg('parallax',1);
    plx.forEach(el=>{
      const center = el._plxTop + el._plxH/2 - smoothY - innerHeight/2;
      const off = center/innerHeight;
      const sp = (parseFloat(el.dataset.parallax)||0.12) * k;
      el.style.translate = `0 ${(-off*sp*100).toFixed(2)}px`;
    });
    blobs.forEach((b,i)=>{ b.style.translate = `0 ${(-smoothY*(0.04+i*0.015)*k).toFixed(1)}px`; });
    checkReveals();
    scrubVideos();
    scrubPins();

    looping = Math.abs(scrollY - smoothY) > 0.05;
    if (looping) requestAnimationFrame(frame);
  }
  function kick(){ if(!looping){ looping = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', kick, {passive:true});
  addEventListener('resize', ()=>{ cachePlx(); frame(); }, {passive:true});
  addEventListener('load', ()=>{ cachePlx(); frame(); });
  frame(); setTimeout(()=>{ cachePlx(); frame(); }, 300);

  /* ---- frosted hover (galerie c-c bouteilles) ---- */
  document.querySelectorAll('.frost-wrap').forEach(wrap => {
    const topImg = wrap.querySelector('.frost-top');
    const grid   = wrap.querySelector('.frost-hover-grid');
    if (!topImg || !grid) return;
    const N = parseInt(grid.style.getPropertyValue('--max-a')) || 30;
    const r = (100 / N * 1.75).toFixed(1);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const el = document.createElement('i');
        const cx = ((x + 0.5) / N * 100).toFixed(2) + '%';
        const cy = ((y + 0.5) / N * 100).toFixed(2) + '%';
        el.addEventListener('mouseenter', () => {
          topImg.style.transition = 'clip-path 0.1s ease';
          topImg.style.clipPath = `circle(${r}% at ${cx} ${cy})`;
        });
        grid.appendChild(el);
      }
    }
    wrap.addEventListener('mouseleave', () => {
      topImg.style.transition = 'clip-path 0.35s ease';
      topImg.style.clipPath = 'circle(0% at 50% 50%)';
    });
  });

  /* ---- produits: hover color + bottle showcase ---- */
  const prodSec = document.getElementById('produits');
  const prodSceneImg = prodSec?.querySelector('.prod-scene__img');
  if (prodSec && prodSceneImg) {
    document.querySelectorAll('#produits .prod').forEach(card => {
      card.addEventListener('mouseenter', () => {
        prodSec.style.background = card.dataset.bg || '';
        prodSceneImg.style.filter = card.dataset.filter || '';
        prodSceneImg.src = card.dataset.img || '';
        prodSec.classList.add('prod-hover');
      });
      card.addEventListener('mouseleave', () => {
        prodSec.style.background = '';
        prodSec.classList.remove('prod-hover');
      });
    });
  }

  /* ---- gourmandise autoplay chain ---- */
  const gourVids = [...document.querySelectorAll('.gour-vid')];
  if (gourVids.length) {
    let gourTimer = null;

    function gourActivate(idx) {
      gourVids.forEach((v, i) => {
        const card = v.closest('.gour');
        card.classList.toggle('gour--playing', i === idx);
        let bar = card.querySelector('.gour-progress');
        if (!bar) {
          bar = document.createElement('div');
          bar.className = 'gour-progress';
          card.appendChild(bar);
        }
        if (i !== idx) { v.pause(); v.currentTime = 0; bar.style.width = '0%'; }
      });
    }

    function gourPlay(idx) {
      gourActivate(idx);
      const vid = gourVids[idx];
      const card = vid.closest('.gour');
      const bar = card.querySelector('.gour-progress');
      if (gourTimer) clearInterval(gourTimer);
      ensureLoaded(vid);
      const start = () => { vid.currentTime = 0; vid.play().catch(() => {}); };
      if (vid.readyState >= 2) start();
      else vid.addEventListener('loadeddata', start, { once: true });
      gourTimer = setInterval(() => {
        if (vid.duration) bar.style.width = (vid.currentTime / vid.duration * 100) + '%';
      }, 100);
      vid.onended = () => {
        clearInterval(gourTimer);
        gourPlay((idx + 1) % gourVids.length);
      };
    }

    const gourSection = document.getElementById('gourmandise');
    if (gourSection) {
      let gourStarted = false;
      const gourObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !gourStarted) {
          gourStarted = true;
          gourPlay(0);
        } else if (!entries[0].isIntersecting && gourStarted) {
          gourVids.forEach(v => v.pause());
          if (gourTimer) clearInterval(gourTimer);
          gourStarted = false;
        }
      }, { threshold: 0.25 });
      gourObs.observe(gourSection);
    }
  }

  /* product 3D tilt */
  document.querySelectorAll('.prod').forEach(card=>{
    card.addEventListener('mousemove', e=>{
      if(!cfg('tilt',true)) return;
      const r=card.getBoundingClientRect();
      const px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
      card.style.transform=`perspective(800px) rotateY(${px*9}deg) rotateX(${-py*9}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave',()=>{ card.style.transform=''; });
  });

  /* add-to-cart feedback (handled by cart.js below) — placeholder */

  const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
})();
