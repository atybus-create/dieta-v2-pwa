(() => {
  'use strict';

  const STYLE_ID = 'ai-confirm-modal-styles';
  const MODAL_ID = 'aiConfirmModal';

  let resolver = null;
  let previousFocus = null;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .ai-confirm-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(2, 8, 11, .78);
        -webkit-backdrop-filter: blur(12px);
        backdrop-filter: blur(12px);
        opacity: 0;
        visibility: hidden;
        transition: opacity .18s ease, visibility .18s ease;
      }

      .ai-confirm-overlay.is-open {
        opacity: 1;
        visibility: visible;
      }

      .ai-confirm-card {
        width: min(430px, 100%);
        border: 1px solid rgba(255, 112, 126, .22);
        border-radius: 28px;
        padding: 24px;
        color: #edf7f6;
        background:
          radial-gradient(circle at 50% 0%, rgba(255, 103, 120, .075), transparent 38%),
          linear-gradient(145deg, rgba(17, 34, 41, .99), rgba(8, 21, 26, .99));
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, .03),
          0 26px 80px rgba(0, 0, 0, .5),
          0 0 34px rgba(255, 92, 111, .06);
        transform: translateY(12px) scale(.975);
        transition: transform .2s cubic-bezier(.2, .8, .2, 1);
      }

      .ai-confirm-overlay.is-open .ai-confirm-card {
        transform: translateY(0) scale(1);
      }

      .ai-confirm-icon {
        width: 58px;
        height: 58px;
        display: grid;
        place-items: center;
        margin-bottom: 18px;
        border: 1px solid rgba(255, 112, 126, .18);
        border-radius: 18px;
        color: #ff7b88;
        background: rgba(255, 103, 120, .09);
        box-shadow: 0 0 26px rgba(255, 92, 111, .06);
      }

      .ai-confirm-icon svg {
        width: 27px;
        height: 27px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .ai-confirm-title {
        margin: 0;
        color: #f2f9f8;
        font-size: 24px;
        line-height: 1.15;
        font-weight: 850;
        letter-spacing: -.025em;
      }

      .ai-confirm-message {
        margin: 10px 0 0;
        color: #a9bec0;
        font-size: 16px;
        line-height: 1.5;
      }

      .ai-confirm-subject {
        color: #dce8e8;
        font-weight: 750;
      }

      .ai-confirm-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 24px;
      }

      .ai-confirm-button {
        min-height: 54px;
        border-radius: 16px;
        padding: 12px 14px;
        font: inherit;
        font-size: 16px;
        font-weight: 850;
        cursor: pointer;
        transition: transform .12s ease, filter .12s ease, border-color .12s ease;
        -webkit-tap-highlight-color: transparent;
      }

      .ai-confirm-button:active {
        transform: scale(.985);
      }

      .ai-confirm-cancel {
        border: 1px solid rgba(145, 183, 185, .18);
        color: #c4d5d6;
        background: rgba(14, 30, 36, .88);
      }

      .ai-confirm-cancel:hover,
      .ai-confirm-cancel:focus-visible {
        border-color: rgba(85, 234, 216, .32);
        outline: none;
      }

      .ai-confirm-delete {
        border: 0;
        color: #fff6f7;
        background: linear-gradient(135deg, #ff7d89, #ff5367);
        box-shadow: 0 10px 28px rgba(255, 83, 103, .18);
      }

      .ai-confirm-delete:hover,
      .ai-confirm-delete:focus-visible {
        filter: brightness(1.06);
        outline: none;
      }

      body.ai-confirm-lock {
        overflow: hidden !important;
      }

      @media (max-width: 390px) {
        .ai-confirm-card {
          padding: 21px;
          border-radius: 25px;
        }

        .ai-confirm-title {
          font-size: 22px;
        }

        .ai-confirm-message {
          font-size: 15px;
        }

        .ai-confirm-button {
          font-size: 15px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .ai-confirm-overlay,
        .ai-confirm-card,
        .ai-confirm-button {
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureModal() {
    ensureStyles();

    let overlay = document.getElementById(MODAL_ID);
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.className = 'ai-confirm-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML = `
      <div class="ai-confirm-card" role="dialog" aria-modal="true" aria-labelledby="aiConfirmTitle" aria-describedby="aiConfirmMessage">
        <div class="ai-confirm-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>
          </svg>
        </div>
        <h2 id="aiConfirmTitle" class="ai-confirm-title">Potwierdź usunięcie</h2>
        <p id="aiConfirmMessage" class="ai-confirm-message"></p>
        <div class="ai-confirm-actions">
          <button type="button" class="ai-confirm-button ai-confirm-cancel">Anuluj</button>
          <button type="button" class="ai-confirm-button ai-confirm-delete">Usuń</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.ai-confirm-cancel').addEventListener('click', () => closeModal(false));
    overlay.querySelector('.ai-confirm-delete').addEventListener('click', () => closeModal(true));

    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeModal(false);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.classList.contains('is-open')) {
        event.preventDefault();
        closeModal(false);
      }
    });

    return overlay;
  }

  function closeModal(result) {
    const overlay = document.getElementById(MODAL_ID);
    if (!overlay || !resolver) return;

    const resolve = resolver;
    resolver = null;

    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('ai-confirm-lock');

    window.setTimeout(() => {
      previousFocus?.focus?.({ preventScroll: true });
      previousFocus = null;
    }, 30);

    resolve(result);
  }

  function askConfirmation({ title, message, subject = '', confirmLabel = 'Usuń' }) {
    const overlay = ensureModal();
    const titleEl = overlay.querySelector('#aiConfirmTitle');
    const messageEl = overlay.querySelector('#aiConfirmMessage');
    const deleteButton = overlay.querySelector('.ai-confirm-delete');

    if (resolver) closeModal(false);

    titleEl.textContent = title;
    messageEl.textContent = '';

    if (subject) {
      const subjectEl = document.createElement('span');
      subjectEl.className = 'ai-confirm-subject';
      subjectEl.textContent = `„${subject}”`;
      messageEl.append(subjectEl, document.createTextNode(` ${message}`));
    } else {
      messageEl.textContent = message;
    }

    deleteButton.textContent = confirmLabel;

    previousFocus = document.activeElement;
    document.body.classList.add('ai-confirm-lock');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');

    window.setTimeout(() => {
      overlay.querySelector('.ai-confirm-cancel')?.focus({ preventScroll: true });
    }, 20);

    return new Promise(resolve => {
      resolver = resolve;
    });
  }

  function getSubject(button) {
    const article = button.closest('article');
    const heading = article?.querySelector('h3')?.textContent?.trim();
    return heading ? heading.slice(0, 120) : '';
  }

  async function performDelete(kind, value) {
    try {
      if (kind === 'meal') {
        if (typeof loading === 'function') {
          loading(true, 'Usuwam posiłek…', 'Aktualizuję dzisiejszy bilans.');
        }
        await api('meal_delete', { mealId: value });
        if (typeof toast === 'function') toast('Posiłek usunięty');
        if (typeof loadDashboard === 'function') await loadDashboard();
        return;
      }

      if (kind === 'favorite') {
        if (typeof loading === 'function') {
          loading(true, 'Usuwam z ulubionych…', 'Aktualizuję listę zapisanych posiłków.');
        }
        await api('favorite_delete', { favoriteId: value });
        if (typeof toast === 'function') toast('Usunięto z ulubionych');
        if (typeof loadFavorites === 'function') await loadFavorites();
        return;
      }

      if (kind === 'day') {
        if (typeof loading === 'function') {
          loading(true, 'Usuwam dzień…', 'Usuwam zapisane posiłki z wybranego dnia.');
        }
        await api('day_delete', { date: value });
        if (typeof toast === 'function') toast('Dzień usunięty');
        if (typeof loadHistory === 'function') await loadHistory();
      }
    } catch (error) {
      if (typeof toast === 'function') toast(error?.message || 'Nie udało się usunąć.');
    } finally {
      if (typeof loading === 'function') loading(false);
    }
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest?.('[data-del], [data-fdel], [data-ddel]');
    if (!button) return;

    // Przechwytujemy kliknięcie przed natywnym onclick z app.js,
    // dzięki czemu systemowy window.confirm() w ogóle się nie uruchamia.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    let kind;
    let value;
    let config;

    if (button.dataset.del) {
      kind = 'meal';
      value = button.dataset.del;
      config = {
        title: 'Usunąć posiłek?',
        subject: getSubject(button),
        message: 'zostanie usunięty z dzisiejszego bilansu.',
        confirmLabel: 'Usuń posiłek'
      };
    } else if (button.dataset.fdel) {
      kind = 'favorite';
      value = button.dataset.fdel;
      config = {
        title: 'Usunąć z ulubionych?',
        subject: getSubject(button),
        message: 'zostanie usunięty z listy ulubionych posiłków.',
        confirmLabel: 'Usuń'
      };
    } else {
      kind = 'day';
      value = button.dataset.ddel;
      config = {
        title: 'Usunąć cały dzień?',
        subject: value,
        message: 'wraz ze wszystkimi zapisanymi posiłkami zostanie usunięty z historii.',
        confirmLabel: 'Usuń dzień'
      };
    }

    const confirmed = await askConfirmation(config);
    if (!confirmed) return;

    await performDelete(kind, value);
  }, true);

  // Przygotuj modal po załadowaniu DOM, żeby pierwsze użycie było natychmiastowe.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureModal, { once: true });
  } else {
    ensureModal();
  }
})();
