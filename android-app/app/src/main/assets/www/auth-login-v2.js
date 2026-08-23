/* Dieta V2: login bez publicznego pobierania listy użytkowników + poprawka rejestracji z akceptacją regulaminu. */

loadProfiles = async function () {
  hide('authError');
};

claimProfile = async function () {
  hide('authError');

  const login = $('profileLogin')?.value.trim() || '';
  const accessPin = $('profilePin')?.value.trim() || '';

  if (!login || !accessPin) {
    $('authError').textContent = 'Wpisz imię lub login oraz PIN.';
    show('authError');
    return;
  }

  if (!/^\d{4,8}$/.test(accessPin)) {
    $('authError').textContent = 'Nieprawidłowe imię/login lub PIN.';
    show('authError');
    return;
  }

  loading(
    true,
    'Loguję…',
    'Weryfikuję dane logowania.'
  );

  try {
    const data = await post(
      AUTH,
      {
        login,
        accessPin
      }
    );

    rememberSession(
      data.accessToken,
      data.userId,
      data.displayName || login || data.userId
    );

    await enterApp();
  } catch (e) {
    $('authError').textContent = 'Nieprawidłowe imię/login lub PIN.';
    show('authError');
  } finally {
    loading(false);
  }
};

/*
  RC3 registration fix:
  init() binds createUserBtn before legal-consents.js is evaluated, so the
  original handler could send user_create without the mandatory legal fields.
  Override createUser here (before init runs) so the bound handler always
  validates the checkbox and sends the accepted terms metadata.
*/
{
  const baseCreateUser = createUser;
  createUser = async function rc3CreateUser(...args) {
    const checkbox = document.getElementById('registrationTermsCheck');
    if (checkbox && checkbox.checked !== true) {
      const error = document.getElementById('authError');
      if (error) {
        error.textContent = 'Aby utworzyć profil, zaakceptuj Regulamin aplikacji i potwierdź, że masz ukończone 18 lat.';
        error.classList.remove('hidden');
      }
      checkbox.focus();
      return;
    }

    const originalPost = post;
    post = async function rc3RegistrationPost(url, payload = {}, file = null) {
      if (url === API && payload?.action === 'user_create') {
        payload = {
          ...payload,
          termsAccepted: true,
          termsVersion: '2026-08-22-v2',
          appVersion: '1.2.0-rc3'
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
}
