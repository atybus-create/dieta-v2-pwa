(() => {
  'use strict';

  const TERMS_VERSION = '2026-08-22-v1';
  const AI_CONSENT_VERSION = '2026-08-22-v1';
  const PRIVACY_VERSION = '2026-08-22-v1';
  const APP_VERSION = '1.1.2';
  const CONSENTS_API = API.replace(/\/dieta-v2$/, '/dieta-v2-consents');
  const AI_ACTIONS = new Set(['analyze_text', 'analyze_photo', 'ingredient_search']);
  let consentState = { loaded: false, termsAccepted: false, aiConsentAccepted: false };
  let termsPromise = null;
  let aiPromise = null;

  function injectStyles() {
    if (document.getElementById('legalConsentStyles')) return;
    const style = document.createElement('style');
    style.id = 'legalConsentStyles';
    style.textContent = `
      .legal-check{display:flex!important;align-items:flex-start;gap:10px;margin:14px 0 4px!important;padding:13px 14px;border:1px solid rgba(112,235,218,.18);border-radius:14px;background:rgba(112,235,218,.05);font-weight:600!important;line-height:1.42}
      .legal-check input{width:20px!important;height:20px!important;min-width:20px;margin:1px 0 0!important;accent-color:#49d8c5}
      .legal-link{border:0;background:transparent;color:#74eadb;font:inherit;font-weight:800;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:0}
      .legal-note{margin:10px 0 4px;color:#9db3b4;font-size:13px;line-height:1.45}
      .legal-overlay{position:fixed;inset:0;z-index:13000;display:grid;place-items:center;padding:18px;background:rgba(2,8,11,.9);backdrop-filter:blur(10px)}
      .legal-overlay.hidden{display:none!important}
      .legal-card{width:min(94vw,520px);max-height:min(88vh,760px);overflow:auto;box-sizing:border-box;padding:22px;border-radius:24px;border:1px solid rgba(112,235,218,.22);background:linear-gradient(145deg,#102027,#081318);box-shadow:0 30px 95px rgba(0,0,0,.56);color:#edf7f6}
      .legal-card h2{margin:4px 0 10px;font-size:25px;line-height:1.15}.legal-card p{color:#aec2c3;line-height:1.5}.legal-card ul{padding-left:21px;color:#c9d9d8;line-height:1.55}
      .legal-actions{display:grid;gap:9px;margin-top:18px}.legal-primary,.legal-secondary,.legal-danger{min-height:48px;border-radius:14px;padding:11px 14px;font:inherit;font-weight:850;cursor:pointer}
      .legal-primary{border:0;color:#061316;background:linear-gradient(135deg,#72f5df,#22c9d6)}.legal-primary:disabled{opacity:.45;cursor:not-allowed}
      .legal-secondary{border:1px solid rgba(160,200,202,.2);color:#d7e5e5;background:#112027}.legal-danger{border:1px solid rgba(244,91,91,.45);color:#ffd2d2;background:rgba(244,91,91,.1)}
      .legal-error{color:#ff9ca6!important;font-weight:750}.legal-status{font-size:13px;color:#8ca7a8!important;margin:9px 0 0!important}
      .legal-panel{border-color:rgba(112,235,218,.2)!important}.legal-panel-actions{display:grid;gap:9px}.legal-panel-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid rgba(180,210,210,.1)}.legal-panel-row:last-child{border-bottom:0}.legal-pill{font-size:12px;font-weight:850;padding:5px 9px;border-radius:999px;background:rgba(112,235,218,.1);color:#8ff0e4}.legal-pill.off{background:rgba(244,91,91,.1);color:#ffb6bd}
      .ai-estimate-note{margin:12px 0;padding:10px 12px;border-radius:12px;border:1px solid rgba(112,235,218,.15);background:rgba(112,235,218,.045);color:#a9c1c0;font-size:12px;line-height:1.45}
      .legal-frame{width:100%;height:min(66vh,640px);border:0;border-radius:14px;background:#071014}
      @media(max-width:520px){.legal-overlay{padding:9px}.legal-card{padding:18px;border-radius:20px}.legal-panel-row{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function openDocument() {
    injectStyles();
    let overlay = document.getElementById('termsDocumentModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'termsDocumentModal';
      overlay.className = 'legal-overlay hidden';
      overlay.innerHTML = `<div class="legal-card" style="width:min(96vw,760px)"><h2>Regulamin aplikacji</h2><p class="legal-status">Wersja ${TERMS_VERSION}</p><iframe class="legal-frame" src="./regulamin.html?v=${encodeURIComponent(TERMS_VERSION)}" title="Regulamin aplikacji"></iframe><div class="legal-actions"><button id="termsDocumentClose" class="legal-secondary" type="button">Zamknij</button></div></div>`;
      document.body.appendChild(overlay);
      document.getElementById('termsDocumentClose').onclick = () => overlay.classList.add('hidden');
    }
    overlay.classList.remove('hidden');
  }

  function openPrivacyDocument() {
    injectStyles();
    let overlay = document.getElementById('privacyDocumentModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'privacyDocumentModal';
      overlay.className = 'legal-overlay hidden';
      overlay.innerHTML = `<div class="legal-card" style="width:min(96vw,760px)"><h2>Polityka prywatności</h2><p class="legal-status">Wersja ${PRIVACY_VERSION}</p><iframe class="legal-frame" src="./polityka-prywatnosci.html?v=${encodeURIComponent(PRIVACY_VERSION)}" title="Polityka prywatności"></iframe><div class="legal-actions"><button id="privacyDocumentClose" class="legal-secondary" type="button">Zamknij</button></div></div>`;
      document.body.appendChild(overlay);
      document.getElementById('privacyDocumentClose').onclick = () => overlay.classList.add('hidden');
    }
    overlay.classList.remove('hidden');
  }

  async function consentRequest(action, extra = {}) {
    if (!state?.token) throw new Error('Brak aktywnej sesji.');
    return post(CONSENTS_API, {
      action,
      accessToken: state.token,
      appVersion: APP_VERSION,
      source: 'android',
      ...extra
    });
  }

  async function refreshConsents() {
    if (!state?.token) {
      consentState = { loaded: true, termsAccepted: false, aiConsentAccepted: false };
      return consentState;
    }
    const data = await consentRequest('consents_get');
    consentState = {
      loaded: true,
      termsAccepted: data?.termsAccepted === true,
      aiConsentAccepted: data?.aiConsentAccepted === true,
      currentTermsVersion: data?.currentTermsVersion || TERMS_VERSION,
      currentAiConsentVersion: data?.currentAiConsentVersion || AI_CONSENT_VERSION
    };
    updateLegalPanel();
    return consentState;
  }

  function termsModal() {
    injectStyles();
    let overlay = document.getElementById('termsAcceptanceModal');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'termsAcceptanceModal';
    overlay.className = 'legal-overlay hidden';
    overlay.innerHTML = `<div class="legal-card" role="dialog" aria-modal="true" aria-labelledby="termsAcceptTitle"><div class="section-kicker">Wymagana akceptacja</div><h2 id="termsAcceptTitle">Regulamin aplikacji</h2><p>Przed dalszym korzystaniem z aplikacji zapoznaj się z aktualnym Regulaminem.</p><ul><li>wyniki AI są szacunkowe i mogą zawierać błędy,</li><li>aplikacja nie jest wyrobem medycznym,</li><li>profil nieaktywny przez co najmniej 180 dni może zostać usunięty podczas cotygodniowego sprawdzenia,</li><li>profil możesz również trwale usunąć samodzielnie po potwierdzeniu PIN-em.</li></ul><button id="termsReadFull" class="legal-link" type="button">Przeczytaj pełny Regulamin</button><p class="legal-note">Informacje o przetwarzaniu danych znajdziesz w <button id="termsPrivacyOpen" class="legal-link" type="button">Polityce prywatności</button>.</p><label class="legal-check"><input id="termsAcceptCheck" type="checkbox"><span>Akceptuję Regulamin aplikacji w wersji ${TERMS_VERSION}.</span></label><p id="termsAcceptError" class="legal-error hidden"></p><div class="legal-actions"><button id="termsAcceptBtn" class="legal-primary" type="button" disabled>Akceptuję i przechodzę dalej</button></div></div>`;
    document.body.appendChild(overlay);
    const check = document.getElementById('termsAcceptCheck');
    const button = document.getElementById('termsAcceptBtn');
    check.onchange = () => { button.disabled = !check.checked; };
    document.getElementById('termsReadFull').onclick = openDocument;
    document.getElementById('termsPrivacyOpen').onclick = openPrivacyDocument;
    return overlay;
  }

  async function ensureCurrentTerms() {
    if (!state?.token) return true;
    try {
      const status = await refreshConsents();
      if (status.termsAccepted) return true;
    } catch (error) {
      console.warn('Nie udało się sprawdzić Regulaminu:', error);
    }
    if (termsPromise) return termsPromise;
    termsPromise = new Promise(resolve => {
      const overlay = termsModal();
      const check = document.getElementById('termsAcceptCheck');
      const button = document.getElementById('termsAcceptBtn');
      const error = document.getElementById('termsAcceptError');
      check.checked = false;
      button.disabled = true;
      error.classList.add('hidden');
      overlay.classList.remove('hidden');
      button.onclick = async () => {
        if (!check.checked) return;
        button.disabled = true;
        button.textContent = 'Zapisuję…';
        try {
          await consentRequest('consent_accept', { consentType: 'terms', consentVersion: TERMS_VERSION, accepted: true });
          consentState.termsAccepted = true;
          overlay.classList.add('hidden');
          resolve(true);
          termsPromise = null;
        } catch (e) {
          error.textContent = e?.message || 'Nie udało się zapisać akceptacji Regulaminu.';
          error.classList.remove('hidden');
          button.disabled = false;
        } finally {
          button.textContent = 'Akceptuję i przechodzę dalej';
        }
      };
    });
    return termsPromise;
  }

  function aiModal() {
    injectStyles();
    let overlay = document.getElementById('aiConsentModal');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'aiConsentModal';
    overlay.className = 'legal-overlay hidden';
    overlay.innerHTML = `<div class="legal-card" role="dialog" aria-modal="true" aria-labelledby="aiConsentTitle"><div class="section-kicker">Analiza z wykorzystaniem AI</div><h2 id="aiConsentTitle">Zanim uruchomimy analizę</h2><p>Aby rozpoznać posiłek, przesłane zdjęcie lub opis jest przekazywany do naszego backendu i może zostać przekazany do zewnętrznej usługi AI (Google Gemini) w celu wykonania analizy.</p><ul><li>wynik jest szacunkiem i może zawierać błędy,</li><li>sprawdź składniki oraz ilości przed zapisaniem,</li><li>aplikacja nie zastępuje lekarza ani dietetyka.</li></ul><p class="legal-note">Szczegóły znajdziesz w <button id="aiPrivacyOpen" class="legal-link" type="button">Polityce prywatności</button>.</p><label class="legal-check"><input id="aiConsentCheck" type="checkbox"><span>Zgadzam się na przetwarzanie przesyłanych zdjęć, opisów i danych związanych z żywieniem w celu wykonania analizy AI.</span></label><p id="aiConsentError" class="legal-error hidden"></p><div class="legal-actions"><button id="aiConsentAccept" class="legal-primary" type="button" disabled>Zgadzam się i rozpocznij analizę</button><button id="aiConsentCancel" class="legal-secondary" type="button">Nie teraz</button></div></div>`;
    document.body.appendChild(overlay);
    const check = document.getElementById('aiConsentCheck');
    const button = document.getElementById('aiConsentAccept');
    check.onchange = () => { button.disabled = !check.checked; };
    document.getElementById('aiPrivacyOpen').onclick = openPrivacyDocument;
    return overlay;
  }

  async function ensureAiConsent() {
    if (!state?.token) throw new Error('Brak aktywnej sesji.');
    if (!consentState.loaded) {
      try { await refreshConsents(); } catch (_) {}
    }
    if (consentState.aiConsentAccepted) return true;
    if (aiPromise) return aiPromise;
    aiPromise = new Promise(resolve => {
      const overlay = aiModal();
      const check = document.getElementById('aiConsentCheck');
      const button = document.getElementById('aiConsentAccept');
      const cancel = document.getElementById('aiConsentCancel');
      const error = document.getElementById('aiConsentError');
      check.checked = false;
      button.disabled = true;
      error.classList.add('hidden');
      overlay.classList.remove('hidden');
      cancel.onclick = () => {
        overlay.classList.add('hidden');
        aiPromise = null;
        resolve(false);
      };
      button.onclick = async () => {
        if (!check.checked) return;
        button.disabled = true;
        button.textContent = 'Zapisuję…';
        try {
          await consentRequest('consent_accept', { consentType: 'ai_processing', consentVersion: AI_CONSENT_VERSION, accepted: true });
          consentState.aiConsentAccepted = true;
          overlay.classList.add('hidden');
          updateLegalPanel();
          aiPromise = null;
          resolve(true);
        } catch (e) {
          error.textContent = e?.message || 'Nie udało się zapisać zgody.';
          error.classList.remove('hidden');
          button.disabled = false;
        } finally {
          button.textContent = 'Zgadzam się i rozpocznij analizę';
        }
      };
    });
    return aiPromise;
  }

  function ensureRegistrationTerms() {
    if (document.getElementById('registrationTermsCheck')) return;
    const create = document.getElementById('createUserBtn');
    if (!create) return;
    const label = document.createElement('label');
    label.className = 'legal-check';
    label.innerHTML = `<input id="registrationTermsCheck" type="checkbox"><span>Akceptuję <button id="registrationTermsOpen" class="legal-link" type="button">Regulamin aplikacji</button>.</span>`;
    create.insertAdjacentElement('beforebegin', label);
    const note = document.createElement('p');
    note.className = 'legal-note';
    note.innerHTML = `Przed utworzeniem profilu zapoznaj się także z <button id="registrationPrivacyOpen" class="legal-link" type="button">Polityką prywatności</button>.`;
    label.insertAdjacentElement('afterend', note);
    document.getElementById('registrationTermsOpen').onclick = event => { event.preventDefault(); openDocument(); };
    document.getElementById('registrationPrivacyOpen').onclick = event => { event.preventDefault(); openPrivacyDocument(); };
  }

  function updateLegalPanel() {
    const badge = document.getElementById('aiConsentBadge');
    if (badge) {
      badge.textContent = consentState.aiConsentAccepted ? 'Aktywna' : 'Nieaktywna';
      badge.classList.toggle('off', !consentState.aiConsentAccepted);
    }
    const toggle = document.getElementById('aiConsentManage');
    if (toggle) toggle.textContent = consentState.aiConsentAccepted ? 'Wycofaj zgodę AI' : 'Włącz analizę AI';
  }

  function ensureSettingsPanel() {
    if (document.getElementById('legalPrivacyPanel')) return;
    const theme = document.getElementById('themePanel');
    if (!theme) return;
    const panel = document.createElement('div');
    panel.id = 'legalPrivacyPanel';
    panel.className = 'panel glass-card legal-panel';
    panel.innerHTML = `<div class="panel-heading compact"><div><h3>Prywatność i zgody</h3><p>Dokumenty i ustawienia związane z prywatnością oraz analizą AI.</p></div></div><div class="legal-panel-actions"><div class="legal-panel-row"><div><strong>Regulamin</strong><div class="legal-status">Wersja ${TERMS_VERSION}</div></div><button id="settingsTermsOpen" class="legal-secondary" type="button">Otwórz</button></div><div class="legal-panel-row"><div><strong>Polityka prywatności</strong><div class="legal-status">Wersja ${PRIVACY_VERSION}</div></div><button id="settingsPrivacyOpen" class="legal-secondary" type="button">Otwórz</button></div><div class="legal-panel-row"><div><strong>Analiza AI</strong><div><span id="aiConsentBadge" class="legal-pill off">Nieaktywna</span></div></div><button id="aiConsentManage" class="legal-secondary" type="button">Włącz analizę AI</button></div></div>`;
    theme.insertAdjacentElement('afterend', panel);
    document.getElementById('settingsTermsOpen').onclick = openDocument;
    document.getElementById('settingsPrivacyOpen').onclick = openPrivacyDocument;
    document.getElementById('aiConsentManage').onclick = async () => {
      if (consentState.aiConsentAccepted) {
        if (!window.confirm('Wycofać zgodę na analizę AI? Po wycofaniu zdjęcia, tekst i wyszukiwanie składników wymagające AI będą zablokowane.')) return;
        try {
          await consentRequest('consent_withdraw', { consentType: 'ai_processing', consentVersion: AI_CONSENT_VERSION, accepted: false });
          consentState.aiConsentAccepted = false;
          updateLegalPanel();
          toast('Zgoda na analizę AI została wycofana.');
        } catch (e) { toast(e?.message || 'Nie udało się wycofać zgody.'); }
      } else {
        await ensureAiConsent();
      }
    };
    updateLegalPanel();
  }

  function ensureEstimateNote() {
    if (document.getElementById('aiEstimateNote')) return;
    const save = document.getElementById('saveMealBtn');
    if (!save) return;
    const note = document.createElement('div');
    note.id = 'aiEstimateNote';
    note.className = 'ai-estimate-note';
    note.textContent = 'Analiza AI jest szacunkiem. Sprawdź składniki i ilości przed zapisaniem.';
    save.insertAdjacentElement('beforebegin', note);
  }

  function setAuthError(text) {
    const el = document.getElementById('authError');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
  }

  const baseCreateUser = createUser;
  createUser = async function legalAwareCreateUser(...args) {
    ensureRegistrationTerms();
    const checked = document.getElementById('registrationTermsCheck')?.checked === true;
    if (!checked) {
      setAuthError('Aby utworzyć profil, zaakceptuj Regulamin aplikacji.');
      document.getElementById('registrationTermsCheck')?.focus();
      return;
    }
    const originalPost = post;
    post = async function legalCreatePost(url, payload = {}, file = null) {
      if (url === API && payload?.action === 'user_create') {
        payload = { ...payload, termsAccepted: true, termsVersion: TERMS_VERSION, appVersion: APP_VERSION };
      }
      return originalPost(url, payload, file);
    };
    try { return await baseCreateUser(...args); }
    finally { post = originalPost; }
  };

  const baseApi = api;
  api = async function legalAwareApi(action, payload = {}, file = null) {
    const normalized = String(action || '').trim().toLowerCase();
    if (AI_ACTIONS.has(normalized)) {
      const allowed = await ensureAiConsent();
      if (!allowed) throw new Error('Analiza AI nie została uruchomiona.');
    }
    return baseApi(action, payload, file);
  };

  const baseEnterApp = enterApp;
  enterApp = async function legalAwareEnterApp(...args) {
    const accepted = await ensureCurrentTerms();
    if (!accepted) return;
    const result = await baseEnterApp(...args);
    ensureSettingsPanel();
    ensureEstimateNote();
    try { await refreshConsents(); } catch (_) {}
    return result;
  };

  const baseClearSession = clearSession;
  clearSession = function legalAwareClearSession(...args) {
    consentState = { loaded: false, termsAccepted: false, aiConsentAccepted: false };
    termsPromise = null;
    aiPromise = null;
    return baseClearSession(...args);
  };

  function initLegal() {
    injectStyles();
    ensureRegistrationTerms();
    ensureSettingsPanel();
    ensureEstimateNote();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLegal, { once: true }); else initLegal();
})();
