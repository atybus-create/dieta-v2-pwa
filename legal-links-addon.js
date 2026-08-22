(() => {
  'use strict';

  const DOC_REVISION = '20260822-www2';

  function openLegalResource({ id, title, src }) {
    let overlay = document.getElementById(id);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = id;
      overlay.className = 'legal-overlay hidden';
      overlay.innerHTML = `<div class="legal-card" style="width:min(96vw,760px)"><h2>${title}</h2><iframe class="legal-frame" src="${src}?v=${DOC_REVISION}" title="${title}"></iframe><div class="legal-actions"><button class="legal-secondary" type="button" data-close-legal>Close</button></div></div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('[data-close-legal]').onclick = () => overlay.classList.add('hidden');
    }
    overlay.classList.remove('hidden');
  }

  function addRows() {
    const panel = document.getElementById('legalPrivacyPanel');
    const actions = panel?.querySelector('.legal-panel-actions');
    if (!actions || document.getElementById('settingsDeleteAccountOpen')) return false;

    const aiRow = document.getElementById('aiConsentManage')?.closest('.legal-panel-row');
    const deletionRow = document.createElement('div');
    deletionRow.className = 'legal-panel-row';
    deletionRow.innerHTML = `<div><strong>Usunięcie konta i danych</strong><div class="legal-status">Instrukcja usunięcia oraz zasada 180 dni</div></div><button id="settingsDeleteAccountOpen" class="legal-secondary" type="button">Otwórz</button>`;

    const contactRow = document.createElement('div');
    contactRow.className = 'legal-panel-row';
    contactRow.innerHTML = `<div><strong>Kontakt i pomoc</strong><div class="legal-status">Wsparcie dla użytkowników aplikacji</div></div><button id="settingsContactOpen" class="legal-secondary" type="button">Otwórz</button>`;

    if (aiRow) {
      aiRow.insertAdjacentElement('beforebegin', deletionRow);
      aiRow.insertAdjacentElement('beforebegin', contactRow);
    } else {
      actions.append(deletionRow, contactRow);
    }

    document.getElementById('settingsDeleteAccountOpen').onclick = () => openLegalResource({
      id: 'deleteAccountDocumentModal',
      title: 'Usunięcie konta i danych',
      src: './usun-konto.html'
    });
    document.getElementById('settingsContactOpen').onclick = () => openLegalResource({
      id: 'contactDocumentModal',
      title: 'Kontakt i pomoc',
      src: './kontakt.html'
    });
    return true;
  }

  function init() {
    if (addRows()) return;
    const observer = new MutationObserver(() => {
      if (addRows()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();