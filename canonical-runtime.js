/*
 * Dieta V2 canonical runtime.
 * One owner for transport, auth, registration, session and app entry.
 * Cross-cutting features register explicit hooks instead of replacing globals.
 */

const APP_CONFIG = Object.freeze(window.__WCZ_APP_CONFIG__ || {});
const APP_VERSION = String(APP_CONFIG.versionName || '1.1.10');
const API = APP_CONFIG.endpoint('dieta-v2');
const AUTH = APP_CONFIG.endpoint('dieta-v2-auth');

const AppHooks = (() => {
  const buckets = new Map([
    ['beforeApi', []],
    ['afterApi', []],
    ['beforeCreateUser', []],
    ['beforeEnterApp', []],
    ['afterEnterApp', []],
    ['clearSession', []]
  ]);

  function on(type, name, handler) {
    if (!buckets.has(type)) throw new Error(`Nieznany hook aplikacji: ${type}`);
    if (typeof handler !== 'function') throw new Error(`Hook ${name || type} nie jest funkcją`);
    const list = buckets.get(type);
    if (list.some(item => item.name === name)) throw new Error(`Duplikat hooka ${type}:${name}`);
    list.push({ name: String(name || 'anonymous'), handler });
  }

  async function pipe(type, context) {
    let current = context;
    for (const item of buckets.get(type) || []) {
      const next = await item.handler(current);
      if (next === false) return false;
      if (next && typeof next === 'object') current = next;
    }
    return current;
  }

  async function emit(type, context = {}) {
    for (const item of buckets.get(type) || []) {
      const result = await item.handler(context);
      if (result === false) return false;
    }
    return true;
  }

  function emitSync(type, context = {}) {
    for (const item of buckets.get(type) || []) {
      try { item.handler(context); }
      catch (error) { console.error(`Dieta V2 hook failed: ${type}:${item.name}`, error); }
    }
  }

  return Object.freeze({ on, pipe, emit, emitSync });
})();

window.__WCZ_APP_HOOKS__ = AppHooks;
window.__WCZ_APP_CONFIG__ = APP_CONFIG;

async function post(url, payload = {}, file = null) {
  const options = { method: 'POST' };

  if (file) {
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => form.append(key, value));
    form.append('data', file, file.name || 'meal.jpg');
    options.body = form;
  } else {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(url, options);
  let data;
  try {
    data = await response.json();
  } catch (_) {
    throw new Error('Nieprawidłowa odpowiedź serwera.');
  }

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || data?.error || 'Błąd serwera.');
  }
  return data;
}

async function api(action, payload = {}, file = null) {
  if (!state.token) throw new Error('Brak przypisania instalacji.');

  const normalized = String(action || '').trim().toLowerCase();
  const prepared = await AppHooks.pipe('beforeApi', {
    action: normalized,
    payload: { ...payload },
    file
  });
  if (prepared === false) throw new Error('Operacja została anulowana.');

  const response = await post(
    API,
    {
      action: prepared.action,
      accessToken: state.token,
      ...prepared.payload
    },
    prepared.file
  );

  const completed = await AppHooks.pipe('afterApi', {
    ...prepared,
    response
  });
  return completed === false ? response : (completed?.response ?? response);
}

function rememberSession(accessToken, userId, displayName) {
  state.token = accessToken;
  state.profile = { userId, displayName };
  localStorage.setItem(TOKEN_KEY, state.token);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
  state.token = '';
  state.profile = null;
  state.analysis = null;
  AppHooks.emitSync('clearSession', {});
}

function openLogoutModal() {
  if (!state.token) return;
  show('logoutModal');
  document.body.classList.add('modal-open');
  setTimeout(() => $('logoutCancelBtn')?.focus(), 20);
}

function closeLogoutModal() {
  hide('logoutModal');
  document.body.classList.remove('modal-open');
}

async function logout() {
  if (!state.token) return;
  closeLogoutModal();
  loading(true, 'Wylogowuję…', 'Kończę sesję na tym urządzeniu.');
  try {
    await api('logout');
    clearSession();
    if ($('profileLogin')) $('profileLogin').value = '';
    if ($('profilePin')) $('profilePin').value = '';
    hide('app');
    $('authScreen')?.classList.remove('install-only');
    show('authScreen');
    toast('Wylogowano.');
  } catch (error) {
    toast(error?.message || 'Nie udało się wylogować.');
  } finally {
    loading(false);
  }
}

async function loadProfiles() {
  // Publiczna lista użytkowników została wycofana. Logowanie odbywa się loginem + PIN-em.
  state.profiles = [];
}

async function claimProfile() {
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
}

function registrationError(message, focusId = '') {
  const error = $('authError');
  if (error) {
    error.textContent = message;
    show('authError');
  }
  if (focusId) $(focusId)?.focus();
}

function validRecoveryEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

async function createUser() {
  hide('authError');

  const displayName = $('newName')?.value.trim() || '';
  const email = $('newEmail')?.value.trim().toLowerCase() || '';
  const accessPin = $('newPin')?.value.trim() || '';
  const water = Number($('newWater')?.value || 2500);

  if (displayName.length < 2) return registrationError('Podaj imię lub nazwę użytkownika.', 'newName');
  if (!validRecoveryEmail(email) || email.length > 254) return registrationError('Podaj poprawny adres e-mail.', 'newEmail');
  if (!/^\d{4,8}$/.test(accessPin)) return registrationError('PIN musi mieć 4–8 cyfr.', 'newPin');
  if (!Number.isFinite(water) || water < 500 || water > 10000) return registrationError('Dzienny cel wody musi mieścić się w zakresie 500–10000 ml.', 'newWater');

  let context = {
    displayName,
    email,
    accessPin,
    payload: {
      action: 'user_create',
      displayName,
      email,
      accessPin,
      dailyCalorieTarget: $('newCalories')?.value || 0,
      dailyProteinTarget: $('newProtein')?.value || 0,
      dailyCarbsTarget: $('newCarbs')?.value || 0,
      dailyFatTarget: $('newFat')?.value || 0,
      dailyWaterTargetMl: String(Math.round(water)),
      appVersion: APP_VERSION
    }
  };

  context = await AppHooks.pipe('beforeCreateUser', context);
  if (context === false) return;

  loading(true, 'Tworzę profil…', 'Zapisuję profil, adres odzyskiwania i cele dzienne.');
  try {
    const created = await post(API, context.payload);
    const userId = created.user?.userId;
    if (!userId) throw new Error('Nie udało się utworzyć profilu.');

    const auth = await post(AUTH, { login: userId, accessPin: context.accessPin });
    rememberSession(auth.accessToken, userId, created.user?.displayName || context.displayName);
    await enterApp();
  } catch (error) {
    registrationError(error?.message || 'Nie udało się utworzyć profilu.');
  } finally {
    loading(false);
  }
}

async function enterApp() {
  const allowed = await AppHooks.emit('beforeEnterApp', {});
  if (allowed === false) return;

  hide('authScreen');
  show('app');

  const name = state.profile?.displayName || 'Profil';
  $('profileName').textContent = name;
  $('profileAvatar').textContent = initials(name);

  try {
    await loadDashboard();
    await AppHooks.emit('afterEnterApp', {});
  } finally {
    hideSplash();
  }
}
