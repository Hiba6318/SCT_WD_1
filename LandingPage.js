/* Advanced nav script
   - Shrink on scroll, auto-hide, scrollspy via IntersectionObserver
   - Mobile off-canvas with focus trap
   - Keyboard navigation for top menu & submenu
   - Theme toggle persisted to localStorage
   - Debounce/throttle utilities
*/

(() => {
  // Utilities
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));

  function throttle(fn, wait=100){
    let last=0;
    return (...args) => {
      const now = Date.now();
      if(now - last >= wait){ last = now; fn(...args); }
    };
  }
  function debounce(fn, wait=120){
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
  }

  // Elements
  const header = qs('#siteHeader');
  const primaryNav = qs('#primaryNav');
  const menuLinks = qsa('.primary-nav .menu a');
  const sections = qsa('main section[id]');
  const hamb = qs('#hambToggle');
  const mobileNav = qs('#mobileNav');
  const mobileClose = qs('#mobileClose');
  const mobileInner = mobileNav && mobileNav.querySelector('.mobile-nav-inner');
  const mobileSubToggles = qsa('.mobile-sub-toggle');
  const themeToggle = qs('#themeToggle');
  const preloader = qs('#preloader');

  // State
  let lastScroll = window.scrollY;
  let ticking = false;

  // Prefers reduced motion check
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Preloader hide
  window.addEventListener('load', () => {
    if(preloader){
      preloader.style.opacity = '0';
      setTimeout(()=>preloader.remove(), 300);
    }
  });

  // Header shrink + auto-hide
  const handleScroll = throttle(() => {
    const y = window.scrollY;
    const delta = y - lastScroll;

    // shrink when scrolled past threshold
    if(y > 60) header.classList.add('shrunk'); else header.classList.remove('shrunk');

    // auto-hide on scroll down, show on scroll up
    if(y > 140 && delta > 8){
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }

    lastScroll = y <= 0 ? 0 : y;
  }, 80);
  window.addEventListener('scroll', handleScroll, {passive:true});

  // Smooth scroll with offset
  function smoothTo(targetEl){
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 72;
    const rect = targetEl.getBoundingClientRect();
    const top = window.scrollY + rect.top - navH + 8;
    window.scrollTo({top, behavior: reducedMotion ? 'auto' : 'smooth'});
  }

  // Internal links behavior
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if(!a) return;
    const href = a.getAttribute('href');
    if(href === '#' || href === '') return;
    const target = document.querySelector(href);
    if(!target) return;
    e.preventDefault();
    smoothTo(target);
    // close mobile if open
    closeMobile();
  });

  // IntersectionObserver scrollspy
  const linkById = {};
  menuLinks.forEach(a=> linkById[a.dataset.target || a.getAttribute('href').slice(1)] = a);

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        // remove active
        menuLinks.forEach(l => l.classList.remove('active'));
        const id = entry.target.id;
        const link = linkById[id];
        if(link) link.classList.add('active');
      }
    });
  }, {threshold: 0.28, rootMargin: '0px 0px -18% 0px'});
  sections.forEach(s => obs.observe(s));

  // Mobile off-canvas functions (with focus trap)
  let lastFocusedEl = null;
  function openMobile(){
    if(!mobileNav) return;
    mobileNav.classList.add('open');
    mobileNav.setAttribute('aria-hidden', 'false');
    hamb.setAttribute('aria-expanded','true');
    lastFocusedEl = document.activeElement;
    // focus first focusable in mobile
    const focusable = mobileNav.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if(focusable) focusable.focus();
    // trap focus
    document.addEventListener('focus', trapFocus, true);
    document.body.style.overflow = 'hidden';
  }
  function closeMobile(){
    if(!mobileNav) return;
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    hamb.setAttribute('aria-expanded','false');
    document.removeEventListener('focus', trapFocus, true);
    document.body.style.overflow = '';
    if(lastFocusedEl) lastFocusedEl.focus();
  }
  function trapFocus(e){
    if(!mobileNav.contains(e.target)){
      // keep focus inside
      const focusable = mobileNav.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if(focusable.length) focusable[0].focus();
      e.stopPropagation();
      e.preventDefault();
    }
  }
  if(hamb) hamb.addEventListener('click', () => {
    const open = hamb.getAttribute('aria-expanded') === 'true';
    if(open) closeMobile(); else openMobile();
  });
  if(mobileClose) mobileClose.addEventListener('click', closeMobile);

  // Close mobile on Escape
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
      closeMobile();
      // close any open submenu in desktop
      qsa('.has-submenu [aria-expanded="true"]').forEach(btn => btn.setAttribute('aria-expanded','false'));
    }
  });

  // Mobile sub toggles
  mobileSubToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.mobile-has-sub');
      parent.classList.toggle('open');
      const isOpen = parent.classList.contains('open');
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });

  // Desktop submenu keyboard support (open with Enter/Space, close with Escape)
  qsa('.has-submenu > a').forEach(trigger => {
    trigger.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        const expanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!expanded));
        // toggle display
        const submenu = trigger.parentElement.querySelector('.submenu');
        if(submenu) submenu.style.display = expanded ? 'none' : 'block';
      } else if(e.key === 'ArrowDown'){
        e.preventDefault();
        const submenu = trigger.parentElement.querySelector('.submenu');
        const first = submenu && submenu.querySelector('a');
        if(first) first.focus();
      }
    });
  });

  // Keyboard navigation for top-level menu (Left/Right)
  (function enableMenuArrowNav(){
    const topItems = qsa('.primary-nav .menu > li > a');
    topItems.forEach((a, idx) => {
      a.addEventListener('keydown', (e) => {
        if(e.key === 'ArrowRight'){
          e.preventDefault();
          const next = topItems[(idx+1) % topItems.length];
          next.focus();
        } else if(e.key === 'ArrowLeft'){
          e.preventDefault();
          const prev = topItems[(idx-1+topItems.length) % topItems.length];
          prev.focus();
        }
      });
    });
  })();

  // Theme toggle
  const THEME_KEY = 'site:theme';
  function setTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    themeToggle.setAttribute('aria-pressed', String(t === 'light'));
    localStorage.setItem(THEME_KEY, t);
  }
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });
  // initialize theme
  (function initTheme(){
    const saved = localStorage.getItem(THEME_KEY);
    if(saved) setTheme(saved);
    else {
      // try prefers-color-scheme
      const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      setTheme(prefers);
    }
  })();

  // Submenu hover: keep open while focused (accessibility)
  qsa('.has-submenu').forEach(item => {
    const trigger = item.querySelector('a');
    const submenu = item.querySelector('.submenu');
    if(!trigger || !submenu) return;
    trigger.addEventListener('focus', () => submenu.style.display = 'block');
    trigger.addEventListener('blur', () => setTimeout(()=> { if(!submenu.querySelector(':focus')) submenu.style.display='none' }, 100));
    submenu.addEventListener('focusin', () => submenu.style.display='block');
    submenu.addEventListener('focusout', () => setTimeout(()=> { if(!submenu.querySelector(':focus')) submenu.style.display='none' }, 100));
  });

  // Close mobile when clicking overlay area (outside inner)
  if(mobileNav){
    mobileNav.addEventListener('click', (e) => {
      if(e.target === mobileNav) closeMobile();
    });
  }

  // Update footer year
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // small accessibility: ensure :focus-visible like behavior
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Tab') document.documentElement.classList.add('user-is-tabbing');
  });

  // Performance note: debounce re-calculations on resize if needed
  window.addEventListener('resize', debounce(() => {
    // if mobile nav open, ensure width etc.
  }, 200));

})();
