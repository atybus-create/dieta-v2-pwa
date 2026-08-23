/* Dieta V2: login bez publicznego pobierania listy użytkowników + kompletna rejestracja profilu. */

loadProfiles = async function () {
  hide('authError');
};

claimProfile = async function () {
  hide('authError');
  const login = $('profileLogin')?.value.trim() || '';
  const accessPin = $('profilePin')?.value.trim() || '';
  if (!login || !accessPin || !/^\d{4,8}$/.test(accessPin)) {
    $('authError').textContent = !login || !accessPin ? 'Wpisz imię lub login oraz PIN.' : 'Nieprawidłowe imię/login lub PIN.';
    show('authError');
    return;
  }
  loading(true, 'Loguję…', 'Weryfikuję dane logowania.');
  try {
    const data = await post(AUTH, { login, accessPin });
    rememberSession(data.accessToken, data.userId, data.displayName || login || data.userId);
    await enterApp();
  } catch (e) {
    $('authError').textContent = 'Nieprawidłowe imię/login lub PIN.';
    show('authError');
  } finally { loading(false); }
};

/* RC5: rejestracja jest samodzielna i wysyła wszystkie pola wymagane przez aktywny backend. */
createUser = async function rc5CreateUser() {
  hide('authError');
  const displayName = $('newName')?.value.trim() || '';
  const email = $('newEmail')?.value.trim() || '';
  const accessPin = $('newPin')?.value.trim() || '';
  const checkbox = document.getElementById('registrationTermsCheck');
  if (displayName.length < 2) { $('authError').textContent='Podaj imię lub nazwę użytkownika.'; show('authError'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('authError').textContent='Podaj poprawny adres e-mail.'; show('authError'); return; }
  if (!/^\d{4,8}$/.test(accessPin)) { $('authError').textContent='PIN musi mieć 4–8 cyfr.'; show('authError'); return; }
  if (!checkbox || checkbox.checked !== true) { $('authError').textContent='Aby utworzyć profil, zaakceptuj Regulamin aplikacji i potwierdź, że masz ukończone 18 lat.'; show('authError'); checkbox?.focus(); return; }
  const payload={action:'user_create',displayName,email,accessPin,dailyCalorieTarget:$('newCalories')?.value||'2000',dailyProteinTarget:$('newProtein')?.value||'120',dailyCarbsTarget:$('newCarbs')?.value||'220',dailyFatTarget:$('newFat')?.value||'70',dailyWaterTargetMl:$('newWater')?.value||'2500',termsAccepted:true,termsVersion:'2026-08-23-v3',appVersion:'1.2.0-rc5'};
  loading(true,'Tworzę profil…','Zapisuję profil, cele dzienne i przypisuję urządzenie.');
  try {
    const created=await post(API,payload);
    const userId=created.user?.userId;
    if(!userId) throw new Error('Nie udało się utworzyć profilu.');
    const auth=await post(AUTH,{userId,accessPin});
    rememberSession(auth.accessToken,userId,created.user?.displayName||displayName);
    await enterApp();
  } catch(e) { $('authError').textContent=e?.message||'Nie udało się utworzyć profilu.'; show('authError'); }
  finally { loading(false); }
};
