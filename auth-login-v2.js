/* Dieta V2: login bez publicznego pobierania listy użytkowników. */

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
