(() => {
  'use strict';

  const DAY_KEY = 'dietaV2LastDashboardDay';
  const PULL_THRESHOLD = 72;
  let refreshing = false;
  let tracking = false;
  let startY = 0;
  let pullDistance = 0;
  let midnightTimer = null;

  const localDay = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const appReady = () => Boolean(state?.token) && !document.getElementById('app')?.classList.contains('hidden');

  async function refreshCurrentView({ quiet = false } = {}) {
    if (refreshing || !appReady()) return;
    refreshing = true;

    try {
      const activeId = document.querySelector('.view.active')?.id || 'viewToday';

      if (activeId === 'viewFavorites' && typeof loadFavorites === 'function') {
        await loadFavorites();
      } else if (activeId === 'viewHistory' && typeof loadHistory === 'function') {
        await loadHistory();
      } else if (activeId === 'viewProfile' && typeof loadSettings === 'function') {
        await loadSettings();
      } else if (typeof loadDashboard === 'function') {
        await loadDashboard();
      }

      localStorage.setItem(DAY_KEY, localDay());
      if (!quiet && typeof toast === 'function') toast('Dane odświeżone');
    } catch (error) {
      if (!quiet && typeof toast === 'function') toast(error?.message || 'Nie udało się odświeżyć danych.');
    } finally {
      refreshing = false;
    }
  }

  async function refreshDashboardAfterDayChange() {
    if (!appReady()) return;

    const today = localDay();
    const previous = localStorage.getItem(DAY_KEY);
    if (previous === today) return;

    try {
      if (typeof loadDashboard === 'function') await loadDashboard();
      localStorage.setItem(DAY_KEY, today);
    } catch (error) {
      console.error('Dieta V2 midnight dashboard refresh failed', error);
    }
  }

  function scheduleMidnightCheck() {
    if (midnightTimer) clearTimeout(midnightTimer);

    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 2, 0);
    const delay = Math.max(1000, next.getTime() - now.getTime());

    midnightTimer = setTimeout(async () => {
      await refreshDashboardAfterDayChange();
      scheduleMidnightCheck();
    }, delay);
  }

  document.addEventListener('touchstart', event => {
    if (window.scrollY > 0 || !appReady() || refreshing || event.touches.length !== 1) {
      tracking = false;
      return;
    }

    startY = event.touches[0].clientY;
    pullDistance = 0;
    tracking = true;
  }, { passive: true });

  document.addEventListener('touchmove', event => {
    if (!tracking || event.touches.length !== 1) return;
    const currentY = event.touches[0].clientY;
    pullDistance = Math.max(0, currentY - startY);
    if (pullDistance > 10 && window.scrollY <= 0) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (!tracking) return;
    const shouldRefresh = pullDistance >= PULL_THRESHOLD && window.scrollY <= 0;
    tracking = false;
    pullDistance = 0;
    if (shouldRefresh) refreshCurrentView();
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    tracking = false;
    pullDistance = 0;
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshDashboardAfterDayChange();
  });

  window.addEventListener('pageshow', () => {
    refreshDashboardAfterDayChange();
  });

  window.addEventListener('focus', () => {
    refreshDashboardAfterDayChange();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scheduleMidnightCheck();
      setTimeout(refreshDashboardAfterDayChange, 1200);
    }, { once: true });
  } else {
    scheduleMidnightCheck();
    setTimeout(refreshDashboardAfterDayChange, 1200);
  }
})();

(() => {
  'use strict';

  const DOC_REVISION = '20260822-www2';

  function openLegalResource({ id, title, src }) {
    let overlay = document.getElementById(id);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = id;
      overlay.className = 'legal-overlay hidden';
      overlay.innerHTML = `<div class="legal-card" style="width:min(96vw,760px)"><h2>${title}</h2><iframe class="legal-frame" src="${src}?v=${DOC_REVISION}" title="${title}"></iframe><div class="legal-actions"><button class="legal-secondary" type="button" data-close-legal>Zamknij</button></div></div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('[data-close-legal]').onclick = () => overlay.classList.add('hidden');
    }
    overlay.classList.remove('hidden');
  }

  function addLegalSupportRows() {
    const panel = document.getElementById('legalPrivacyPanel');
    const actions = panel?.querySelector('.legal-panel-actions');
    if (!actions || document.getElementById('settingsDeleteAccountOpen')) return false;

    const aiRow = document.getElementById('aiConsentManage')?.closest('.legal-panel-row');
    const deletionRow = document.createElement('div');
    deletionRow.className = 'legal-panel-row';
    deletionRow.innerHTML = `<div><strong>Usunięcie konta i danych</strong><div class="legal-status">Instrukcja usunięcia oraz zasada 180 dni</div></div><button id="settingsDeleteAccountOpen" class="legal-secondary" type="button">Otwórz</button>`;

    const contactRow = document.createElement('div');
    contactRow.className = 'legal-panel-row';
    contactRow.innerHTML = `<div><strong>Kontakt i pomoc</strong><div class="legal-status">Wsparcie dla użytkowników aplikacji</div></div><button id="settingsContactOpen" class="legal-secondary" type="button">Otwórz</button>`;

    if (aiRow) {
      aiRow.insertAdjacentElement('beforebegin', deletionRow);
      aiRow.insertAdjacentElement('beforebegin', contactRow);
    } else {
      actions.append(deletionRow, contactRow);
    }

    document.getElementById('settingsDeleteAccountOpen').onclick = () => openLegalResource({
      id: 'deleteAccountDocumentModal',
      title: 'Usunięcie konta i danych',
      src: './usun-konto.html'
    });
    document.getElementById('settingsContactOpen').onclick = () => openLegalResource({
      id: 'contactDocumentModal',
      title: 'Kontakt i pomoc',
      src: './kontakt.html'
    });
    return true;
  }

  function initLegalSupportLinks() {
    if (addLegalSupportRows()) return;
    const observer = new MutationObserver(() => {
      if (addLegalSupportRows()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLegalSupportLinks, { once: true });
  else initLegalSupportLinks();
})();
