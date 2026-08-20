(() => {
  'use strict';

  const RECOVERY_API = 'https://n8n-pi.taild8d05f.ts.net/webhook/dieta-v2-recovery';
  const STYLE_ID = 'account-recovery-styles';
  const RESET_MODAL_ID = 'pinRecoveryModal';
  const EMAIL_MODAL_ID = 'requiredEmailModal';

  const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .recovery-link{width:100%;margin-top:10px;border:0;background:transparent;color:#72f5df;font:inherit;font-weight:800;cursor:pointer;padding:10px;text-align:center}
      .recovery-link:hover,.recovery-link:focus-visible{color:#a8fff1;outline:none}
      .recovery-overlay{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:18px;background:rgba(2,8,11,.9);backdrop-filter:blur(12px)}
      .recovery-overlay.hidden{display:none!important}
      .recovery-card{width:min(460px,100%);box-sizing:border-box;padding:24px;border-radius:26px;border:1px solid rgba(114,245,223,.2);background:linear-gradient(145deg,#102027,#081318);box-shadow:0 28px 90px rgba(0,0,0,.55);color:#edf7f6}
      .recovery-card h2{margin:4px 0 9px;font-size:25px;line-height:1.15}.recovery-card p{margin:0 0 18px;color:#9fb8bb;line-height:1.5}
      .recovery-card label{display:grid;gap:7px;margin-top:13px;font-size:13px;font-weight:750;color:#cfe1e1}
      .recovery-card input{width:100%;box-sizing:border-box;border-radius:14px;border:1px solid rgba(180,220,220,.18);background:#071116;color:#edf7f6;padding:13px 14px;font:inherit;outline:none}
      .recovery-card input:focus{border-color:rgba(114,245,223,.55);box-shadow:0 0 0 3px rgba(114,245,223,.08)}
      .recovery-actions{display:grid;gap:9px;margin-top:18px}.recovery-primary,.recovery-secondary{min-height:50px;border-radius:15px;padding:12px 16px;font:inherit;font-weight:850;cursor:pointer}
      .recovery-primary{border:0;color:#061316;background:linear-gradient(135deg,#72f5df,#22c9d6)}.recovery-secondary{border:1px solid rgba(160,200,202,.18);color:#c6d8d9;background:#112027}
      .recovery-status{margin-top:14px!important;font-size:14px}.recovery-status.error{color:#ff9ca6}.recovery-status.ok{color:#91f2df}
      .required-email-note{margin:8px 0 0!important;font-size:12px;color:#799698!important}
      .recovery-lock{overflow:hidden!important}
      @media(max-width:480px){.recovery-overlay{padding:10px}.recovery-card{padding:20px;border-radius:22px}}
    `;
    document.head.appendChild(style);
  }

  function ensureRegistrationEmail() {
    if (document.getElementById('newEmail')) return;
    const newName = document.getElementById('newName');
    const label = newName?.closest('label');
    if (!label) return;
    const emailLabel = document.createElement('label');
    emailLabel.innerHTML = `
      Adres e-mail
      <input id="newEmail" type="email" maxlength="254" autocomplete="email" placeholder="np. imie@gmail.com" required>
    `;
    label.insertAdjacentElement('afterend', emailLabel);
  }

  function ensureForgotButton() {
    if (document.getElementById('forgotPinBtn')) return;
    const loginButton = document.getElementById('claimProfileBtn');
    if (!loginButton) return;
    const button = document.createElement('button');
    button.id = 'forgotPinBtn';
    button.type = 'button';
    button.className = 'recovery-link';
    button.textContent = 'Nie pamiętam PIN-u';
    button.onclick = () => openRecoveryRequest();
    loginButton.insertAdjacentElement('afterend', button);
  }

  function ensureRecoveryModal() {
    let overlay = document.getElementById(RESET_MODAL_ID);
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = RESET_MODAL_ID;
    overlay.className = 'recovery-overlay hidden';
    overlay.innerHTML = `
      <div class="recovery-card" role="dialog" aria-modal="true" aria-labelledby="recoveryTitle">
        <div class="section-kicker">Odzyskiwanie dostępu</div>
        <h2 id="recoveryTitle">Nie pamiętam PIN-u</h2>
        <p id="recoveryIntro">Podaj adres e-mail przypisany do konta. Wyślemy link do ustawienia nowego PIN-u.</p>
        <div id="recoveryRequestFields">
          <label>Adres e-mail<input id="recoveryEmail" type="email" maxlength="254" autocomplete="email" placeholder="adres@email.pl"></label>
        </div>
        <div id="recoveryConfirmFields" class="hidden">
          <label>Nowy PIN<input id="recoveryNewPin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password" placeholder="4–8 cyfr"></label>
          <label>Powtórz PIN<input id="recoveryRepeatPin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password" placeholder="Powtórz PIN"></label>
        </div>
        <p id="recoveryStatus" class="recovery-status hidden"></p>
        <div class="recovery-actions">
          <button id="recoverySubmit" class="recovery-primary" type="button">Wyślij link</button>
          <button id="recoveryBack" class="recovery-secondary" type="button">Wróć do logowania</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('recoveryBack').onclick = closeRecovery;
    return overlay;
  }

  function setRecoveryStatus(text, kind = '') {
    const el = document.getElementById('recoveryStatus');
    if (!el) return;
    el.textContent = text || '';
    el.className = `recovery-status ${kind}`.trim();
    el.classList.toggle('hidden', !text);
  }

  function openRecoveryRequest() {
    ensureRecoveryModal();
    document.getElementById('recoveryTitle').textContent = 'Nie pamiętam PIN-u';
    document.getElementById('recoveryIntro').textContent = 'Podaj adres e-mail przypisany do konta. Wyślemy link do ustawienia nowego PIN-u.';
    document.getElementById('recoveryRequestFields').classList.remove('hidden');
    document.getElementById('recoveryConfirmFields').classList.add('hidden');
    const submit = document.getElementById('recoverySubmit');
    submit.textContent = 'Wyślij link';
    submit.onclick = requestReset;
    setRecoveryStatus('');
    document.getElementById(RESET_MODAL_ID).classList.remove('hidden');
    document.body.classList.add('recovery-lock');
    setTimeout(() => document.getElementById('recoveryEmail')?.focus(), 20);
  }

  function openRecoveryConfirm(token) {
    ensureRecoveryModal();
    document.getElementById('recoveryTitle').textContent = 'Ustaw nowy PIN';
    document.getElementById('recoveryIntro').textContent = 'Wpisz nowy PIN. Link jest jednorazowy i wygasa po 20 minutach.';
    document.getElementById('recoveryRequestFields').classList.add('hidden');
    document.getElementById('recoveryConfirmFields').classList.remove('hidden');
    const submit = document.getElementById('recoverySubmit');
    submit.textContent = 'Ustaw nowy PIN';
    submit.onclick = () => confirmReset(token);
    setRecoveryStatus('');
    document.getElementById(RESET_MODAL_ID).classList.remove('hidden');
    document.body.classList.add('recovery-lock');
    document.getElementById('startSplash')?.classList.add('hidden');
    setTimeout(() => document.getElementById('recoveryNewPin')?.focus(), 20);
  }

  function closeRecovery() {
    document.getElementById(RESET_MODAL_ID)?.classList.add('hidden');
    document.body.classList.remove('recovery-lock');
    const url = new URL(window.location.href);
    if (url.searchParams.has('resetToken')) {
      url.searchParams.delete('resetToken');
      history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  }

  async function requestReset() {
    const email = String(document.getElementById('recoveryEmail')?.value || '').trim().toLowerCase();
    if (!validEmail(email)) {
      setRecoveryStatus('Podaj poprawny adres e-mail.', 'error');
      return;
    }
    const button = document.getElementById('recoverySubmit');
    button.disabled = true;
    button.textContent = 'Wysyłam…';
    try {
      const data = await post(RECOVERY_API, { action: 'request_reset', email });
      setRecoveryStatus(data.message || 'Jeżeli konto istnieje, wysłaliśmy wiadomość z linkiem.', 'ok');
    } catch (error) {
      setRecoveryStatus(error?.message || 'Nie udało się wysłać wiadomości.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Wyślij link';
    }
  }

  async function confirmReset(token) {
    const pin = String(document.getElementById('recoveryNewPin')?.value || '').trim();
    const repeat = String(document.getElementById('recoveryRepeatPin')?.value || '').trim();
    if (!/^\d{4,8}$/.test(pin)) {
      setRecoveryStatus('PIN musi mieć 4–8 cyfr.', 'error');
      return;
    }
    if (pin !== repeat) {
      setRecoveryStatus('Podane PIN-y nie są identyczne.', 'error');
      return;
    }
    const button = document.getElementById('recoverySubmit');
    button.disabled = true;
    button.textContent = 'Zapisuję…';
    try {
      const data = await post(RECOVERY_API, { action: 'confirm_reset', token, newPin: pin });
      clearSession();
      setRecoveryStatus(data.message || 'PIN został zmieniony. Zaloguj się ponownie.', 'ok');
      button.classList.add('hidden');
      const back = document.getElementById('recoveryBack');
      back.textContent = 'Przejdź do logowania';
      back.onclick = () => {
        closeRecovery();
        document.getElementById('app')?.classList.add('hidden');
        document.getElementById('authScreen')?.classList.remove('hidden');
      };
    } catch (error) {
      setRecoveryStatus(error?.message || 'Link jest nieprawidłowy albo wygasł.', 'error');
    } finally {
      button.disabled = false;
      if (!button.classList.contains('hidden')) button.textContent = 'Ustaw nowy PIN';
    }
  }

  function ensureEmailModal() {
    let overlay = document.getElementById(EMAIL_MODAL_ID);
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = EMAIL_MODAL_ID;
    overlay.className = 'recovery-overlay hidden';
    overlay.innerHTML = `
      <div class="recovery-card" role="dialog" aria-modal="true" aria-labelledby="requiredEmailTitle">
        <div class="section-kicker">Bezpieczeństwo konta</div>
        <h2 id="requiredEmailTitle">Uzupełnij adres e-mail</h2>
        <p>Adres jest wymagany do odzyskania dostępu, jeśli zapomnisz PIN-u.</p>
        <label>Adres e-mail<input id="requiredEmail" type="email" maxlength="254" autocomplete="email" placeholder="adres@email.pl"></label>
        <p class="required-email-note">Adres nie będzie wyświetlany innym użytkownikom.</p>
        <p id="requiredEmailStatus" class="recovery-status hidden"></p>
        <div class="recovery-actions"><button id="requiredEmailSave" class="recovery-primary" type="button">Zapisz adres e-mail</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function setEmailStatus(text, kind = '') {
    const el = document.getElementById('requiredEmailStatus');
    if (!el) return;
    el.textContent = text || '';
    el.className = `recovery-status ${kind}`.trim();
    el.classList.toggle('hidden', !text);
  }

  async function requireEmailIfMissing(settingsData = null) {
    if (!state.token) return true;
    let data = settingsData;
    try {
      if (!data) data = await api('settings_get');
    } catch (_) {
      return true;
    }
    if (!data?.emailRequired) return true;

    ensureEmailModal();
    document.getElementById(EMAIL_MODAL_ID).classList.remove('hidden');
    document.body.classList.add('recovery-lock');
    document.getElementById('app')?.classList.add('hidden');
    const input = document.getElementById('requiredEmail');
    const save = document.getElementById('requiredEmailSave');
    setEmailStatus('');

    return await new Promise(resolve => {
      save.onclick = async () => {
        const email = String(input?.value || '').trim().toLowerCase();
        if (!validEmail(email)) {
          setEmailStatus('Podaj poprawny adres e-mail.', 'error');
          return;
        }
        save.disabled = true;
        save.textContent = 'Zapisuję…';
        try {
          const s = data.settings || {};
          await api('settings_update', {
            dailyCalorieTarget: s.dailyCalorieTarget ?? 0,
            dailyProteinTarget: s.dailyProteinTarget ?? 0,
            dailyCarbsTarget: s.dailyCarbsTarget ?? 0,
            dailyFatTarget: s.dailyFatTarget ?? 0,
            email
          });
          document.getElementById(EMAIL_MODAL_ID).classList.add('hidden');
          document.body.classList.remove('recovery-lock');
          resolve(true);
        } catch (error) {
          setEmailStatus(error?.message || 'Nie udało się zapisać adresu.', 'error');
        } finally {
          save.disabled = false;
          save.textContent = 'Zapisz adres e-mail';
        }
      };
    });
  }

  const baseEnterApp = enterApp;
  enterApp = async function recoveryAwareEnterApp() {
    const settingsData = await api('settings_get');
    const ok = await requireEmailIfMissing(settingsData);
    if (!ok) return;
    await baseEnterApp();
  };

  claimProfile = async function recoveryAwareClaimProfile() {
    hide('authError');
    const login = $('profileLogin')?.value.trim() || '';
    const accessPin = $('profilePin')?.value.trim() || '';
    if (!login || !/^\d{4,8}$/.test(accessPin)) {
      $('authError').textContent = 'Nieprawidłowe imię/login lub PIN.';
      show('authError');
      return;
    }
    loading(true, 'Loguję…', 'Weryfikuję dane logowania.');
    try {
      const data = await post(AUTH, { login, accessPin });
      rememberSession(data.accessToken, data.userId, data.displayName || login || data.userId);
      await enterApp();
    } catch (_) {
      $('authError').textContent = 'Nieprawidłowe imię/login lub PIN.';
      show('authError');
    } finally {
      loading(false);
    }
  };

  createUser = async function recoveryAwareCreateUser() {
    hide('authError');
    const displayName = $('newName')?.value.trim() || '';
    const email = $('newEmail')?.value.trim().toLowerCase() || '';
    const accessPin = $('newPin')?.value.trim() || '';
    if (displayName.length < 2) {
      $('authError').textContent = 'Podaj imię lub nazwę użytkownika.';
      show('authError');
      return;
    }
    if (!validEmail(email)) {
      $('authError').textContent = 'Podaj poprawny adres e-mail.';
      show('authError');
      return;
    }
    if (!/^\d{4,8}$/.test(accessPin)) {
      $('authError').textContent = 'PIN musi mieć 4–8 cyfr.';
      show('authError');
      return;
    }
    const payload = {
      action: 'user_create', displayName, email, accessPin,
      dailyCalorieTarget: $('newCalories').value,
      dailyProteinTarget: $('newProtein').value,
      dailyCarbsTarget: $('newCarbs').value,
      dailyFatTarget: $('newFat').value
    };
    loading(true, 'Tworzę profil…', 'Zapisuję profil, adres odzyskiwania i cele dzienne.');
    try {
      const created = await post(API, payload);
      const userId = created.user?.userId;
      if (!userId) throw new Error('Nie udało się utworzyć profilu.');
      const auth = await post(AUTH, { login: userId, accessPin });
      rememberSession(auth.accessToken, userId, created.user?.displayName || displayName);
      await enterApp();
    } catch (error) {
      $('authError').textContent = error?.message || 'Nie udało się utworzyć profilu.';
      show('authError');
    } finally {
      loading(false);
    }
  };

  function bindHandlers() {
    injectStyles();
    ensureRegistrationEmail();
    ensureForgotButton();
    ensureRecoveryModal();
    ensureEmailModal();
    if ($('claimProfileBtn')) $('claimProfileBtn').onclick = claimProfile;
    if ($('createUserBtn')) $('createUserBtn').onclick = createUser;

    const resetToken = new URLSearchParams(window.location.search).get('resetToken');
    if (resetToken) {
      openRecoveryConfirm(resetToken);
      return;
    }

    if (state.token) {
      requireEmailIfMissing().then(ok => {
        if (ok && document.getElementById('app')?.classList.contains('hidden')) {
          document.getElementById('app')?.classList.remove('hidden');
        }
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindHandlers, { once: true });
  else bindHandlers();
})();
