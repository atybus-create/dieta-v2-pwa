(() => {
  'use strict';

  const TERMS_VERSION = '2026-08-22-v2';
  const APP_VERSION = '1.1.4-test';
  const basePost = post;

  post = async function registrationAwarePost(url, payload = {}, file = null) {
    const action = String(payload?.action || '').trim().toLowerCase();

    if (url === API && action === 'user_create') {
      const accepted = document.getElementById('registrationTermsCheck')?.checked === true;

      if (!accepted) {
        throw new Error('Aby utworzyć profil, zaakceptuj Regulamin aplikacji i potwierdź, że masz ukończone 18 lat.');
      }

      payload = {
        ...payload,
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
        appVersion: APP_VERSION
      };
    }

    return basePost(url, payload, file);
  };
})();
