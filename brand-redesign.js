(() => {
  'use strict';

  const STYLE_ID = 'brandRedesignStyles';
  const POLISH_STYLE_ID = 'brandRedesignPolishStyles';
  const SPLASH_VAR = '--brand-splash-image';
  const PARTS = [
    './assets/static-splash-p1.txt?v=20260820-static1',
    './assets/static-splash-p2.txt?v=20260820-static1',
    './assets/static-splash-p3.txt?v=20260820-static1',
    './assets/static-splash-p4.txt?v=20260820-static1'
  ];

  function ensureStylesheet(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureStylesheets() {
    ensureStylesheet(STYLE_ID, './brand-redesign.css?v=20260820-brand1');
    ensureStylesheet(POLISH_STYLE_ID, './brand-redesign-polish.css?v=20260820-brand1');
  }

  async function loadBrandImage() {
    if (document.documentElement.style.getPropertyValue(SPLASH_VAR)) return;
    try {
      const chunks = await Promise.all(PARTS.map(async url => {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Nie udało się pobrać ${url}`);
        return response.text();
      }));
      document.documentElement.style.setProperty(
        SPLASH_VAR,
        `url("data:image/webp;base64,${chunks.join('')}")`
      );
    } catch (error) {
      console.warn('Brand mascot image unavailable:', error);
    }
  }

  function addMark(target) {
    if (!target || target.querySelector(':scope > .brand-monster-mark')) return;
    const mark = document.createElement('span');
    mark.className = 'brand-monster-mark';
    mark.setAttribute('aria-hidden', 'true');
    target.appendChild(mark);
  }

  function decorate() {
    ensureStylesheets();
    addMark(document.querySelector('#viewToday .calorie-card'));
    addMark(document.getElementById('analysisPanel'));
    addMark(document.querySelector('#viewProfile .profile-card'));

    const topBrand = document.querySelector('.topbar .eyebrow');
    if (topBrand) topBrand.textContent = 'Wiem co Żre-m z AI';
  }

  ensureStylesheets();
  loadBrandImage();
  decorate();

  new MutationObserver(() => decorate()).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
