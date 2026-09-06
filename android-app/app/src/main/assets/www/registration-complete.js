(() => {
  'use strict';

  const APP_VERSION = '1.1.8';

  function ensureRegistrationFields() {
    const details = document.getElementById('newUserDetails');
    const grid = details?.querySelector('.form-grid');
    if (!grid) return;

    if (!document.getElementById('newEmail')) {
      const label = document.createElement('label');
      label.innerHTML = 'E-mail do odzyskiwania dostępu<input id="newEmail" type="email" maxlength="254" autocomplete="email" placeholder="np. imie@email.pl">';
      const pin = document.getElementById('newPin')?.closest('label');
      if (pin) pin.insertAdjacentElement('afterend', label);
      else grid.prepend(label);
    }

    if (!document.getElementById('newWater')) {
      const label = document.createElement('label');
      label.innerHTML = 'Woda / dzień<div class="unit-input"><input id="newWater" type="number" min="500" max="10000" step="250" value="2500"><span>ml</span></div>';
      grid.appendChild(label);
    }
  }

  function showRegistrationError(message) {
    const error = document.getElementById('authError');
    if (!error) return;
    error.textContent = message;
    error.classList.remove('hidden');
  }

  const baseCreateUser = createUser;
  createUser = async function completeCreateUser(...args) {
    ensureRegistrationFields();

    const email = String(document.getElementById('newEmail')?.value || '').trim().toLowerCase();
    const water = Number(document.getElementById('newWater')?.value || 2500);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      showRegistrationError('Podaj poprawny adres e-mail do odzyskiwania dostępu.');
      return;
    }

    if (!Number.isFinite(water) || water < 500 || water > 10000) {
      showRegistrationError('Dzienny cel wody musi mieścić się w zakresie 500–10000 ml.');
      return;
    }

    const originalPost = post;
    post = async function completeRegistrationPost(url, payload = {}, file = null) {
      if (url === API && payload?.action === 'user_create') {
        payload = {
          ...payload,
          email,
          dailyWaterTargetMl: String(Math.round(water)),
          appVersion: APP_VERSION
        };
      }
      return originalPost(url, payload, file);
    };

    try {
      return await baseCreateUser(...args);
    } finally {
      post = originalPost;
    }
  };

  function init() {
    ensureRegistrationFields();
    const button = document.getElementById('createUserBtn');
    if (button) button.onclick = () => createUser();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
