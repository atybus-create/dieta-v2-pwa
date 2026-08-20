(() => {
  'use strict';

  const STYLE_ID = 'brandRedesignStyles';
  const SPLASH_VAR = '--brand-splash-image';
  const PARTS = [
    './assets/static-splash-p1.txt?v=20260820-static1',
    './assets/static-splash-p2.txt?v=20260820-static1',
    './assets/static-splash-p3.txt?v=20260820-static1',
    './assets/static-splash-p4.txt?v=20260820-static1'
  ];

  function ensureStylesheet() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = './brand-redesign.css?v=20260820-brand1';
    document.head.appendChild(link);
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
    ensureStylesheet();
    addMark(document.querySelector('#viewToday .calorie-card'));
    addMark(document.getElementById('analysisPanel'));
    addMark(document.querySelector('#viewProfile .profile-card'));

    const topBrand = document.querySelector('.topbar .eyebrow');
    if (topBrand) topBrand.textContent = 'Wiem co Żre-m z AI';
  }

  ensureStylesheet();
  loadBrandImage();
  decorate();

  new MutationObserver(() => decorate()).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
