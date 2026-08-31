/* Google UMP privacy options entry point for Android. */
(function setupPrivacyOptions() {
  const BUTTON_ID = 'adPrivacyOptionsBtn';
  const PANEL_ID = 'adPrivacyOptionsPanel';

  function bridge() {
    const value = window.AndroidMonetization;
    if (!value || typeof value.isPrivacyOptionsRequired !== 'function' || typeof value.showPrivacyOptions !== 'function') {
      return null;
    }
    return value;
  }

  function ensurePanel() {
    const profile = document.getElementById('viewProfile');
    if (!profile) return null;

    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'panel glass-card';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="panel-heading compact">
        <span class="panel-icon" aria-hidden="true">🔒</span>
        <div>
          <h3>Prywatność reklam</h3>
          <p>Zmień swoją decyzję dotyczącą danych używanych do wyświetlania reklam.</p>
        </div>
      </div>
      <button id="${BUTTON_ID}" class="secondary" type="button">Ustawienia prywatności reklam</button>
    `;

    profile.appendChild(panel);
    panel.querySelector(`#${BUTTON_ID}`)?.addEventListener('click', () => {
      try {
        bridge()?.showPrivacyOptions();
      } catch (error) {
        console.error('Nie udało się otworzyć ustawień prywatności reklam.', error);
      }
    });
    return panel;
  }

  function setRequired(required) {
    const panel = ensurePanel();
    if (!panel) return;
    panel.hidden = !required;
  }

  function refresh() {
    const nativeBridge = bridge();
    if (!nativeBridge) {
      setRequired(false);
      return;
    }
    try {
      setRequired(Boolean(nativeBridge.isPrivacyOptionsRequired()));
    } catch (error) {
      console.error('Nie udało się odczytać statusu ustawień prywatności reklam.', error);
      setRequired(false);
    }
  }

  window.__wczPrivacyOptionsAvailability = required => setRequired(Boolean(required));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh, { once: true });
  } else {
    refresh();
  }

  // UMP może zakończyć odczyt konfiguracji chwilę po uruchomieniu WebView.
  setTimeout(refresh, 1200);
  setTimeout(refresh, 3000);
})();
