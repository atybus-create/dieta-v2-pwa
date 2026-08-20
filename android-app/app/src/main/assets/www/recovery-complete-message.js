(() => {
  'use strict';

  function stripResetToken() {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('resetToken')) return;
      url.searchParams.delete('resetToken');
      history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch (_) {
      // Brak akcji jest bezpieczniejszy niż przekierowanie.
    }
  }

  function showNeutralCompletion() {
    const status = document.getElementById('recoveryStatus');
    if (!status || status.dataset.neutralCompletion === '1') return;

    const text = String(status.textContent || '').trim().toLowerCase();
    if (!text.includes('pin został zmieniony')) return;

    status.dataset.neutralCompletion = '1';
    status.textContent = 'PIN został zmieniony. Wróć do aplikacji i zaloguj się ponownie nowym PIN-em.';
    status.classList.remove('error', 'hidden');
    status.classList.add('ok');

    const title = document.getElementById('recoveryTitle');
    const intro = document.getElementById('recoveryIntro');
    const requestFields = document.getElementById('recoveryRequestFields');
    const confirmFields = document.getElementById('recoveryConfirmFields');
    const submit = document.getElementById('recoverySubmit');
    const back = document.getElementById('recoveryBack');

    if (title) title.textContent = 'PIN został zmieniony';
    if (intro) intro.textContent = 'Możesz zamknąć tę kartę. Wróć do aplikacji i zaloguj się ponownie.';
    requestFields?.classList.add('hidden');
    confirmFields?.classList.add('hidden');
    submit?.classList.add('hidden');
    back?.classList.add('hidden');

    stripResetToken();
  }

  function observeRecoveryStatus() {
    const status = document.getElementById('recoveryStatus');
    if (!status) {
      setTimeout(observeRecoveryStatus, 50);
      return;
    }

    const observer = new MutationObserver(showNeutralCompletion);
    observer.observe(status, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class']
    });

    showNeutralCompletion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeRecoveryStatus, { once: true });
  } else {
    observeRecoveryStatus();
  }
})();
