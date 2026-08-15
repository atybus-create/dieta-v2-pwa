(() => {
  'use strict';

  const BUTTON_ID = 'cancelAnalysisBtn';
  const STYLE_ID = 'analysis-cancel-styles';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .analysis-cancel-btn {
        width: 100%;
        min-height: 50px;
        margin-top: 10px;
        padding: 12px 16px;
        border: 1px solid rgba(148, 190, 190, .18);
        border-radius: 15px;
        color: #91aaad;
        background: rgba(8, 20, 25, .42);
        font: inherit;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .analysis-cancel-btn:hover,
      .analysis-cancel-btn:focus-visible {
        border-color: rgba(148, 190, 190, .3);
        color: #c4d5d6;
        background: rgba(12, 28, 34, .68);
      }

      .analysis-cancel-btn:active {
        transform: scale(.99);
      }
    `;

    document.head.appendChild(style);
  }

  function cancelAnalysis() {
    state.analysis = null;

    if (typeof hide === 'function') {
      hide('analysisPanel');
    } else {
      document.getElementById('analysisPanel')?.classList.add('hidden');
    }

    const items = document.getElementById('analysisItems');
    if (items) items.innerHTML = '';

    const totals = document.querySelector('#analysisPanel .analysis-live-totals');
    if (totals) totals.remove();

    const description = document.getElementById('analysisDescription');
    if (description) description.value = '';

    const calories = document.getElementById('analysisCalories');
    if (calories) calories.value = '';

    const confidence = document.getElementById('analysisConfidence');
    if (confidence) confidence.textContent = '';

    if (typeof toast === 'function') {
      toast('Analiza anulowana');
    }

    document.getElementById('mealText')?.focus();
  }

  function attachButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const panel = document.getElementById('analysisPanel');
    const row = panel?.querySelector('.button-row');
    if (!panel || !row) return;

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.className = 'analysis-cancel-btn';
    button.textContent = 'Anuluj';
    button.setAttribute('aria-label', 'Anuluj analizę i nie zapisuj posiłku');
    button.addEventListener('click', cancelAnalysis);

    row.insertAdjacentElement('afterend', button);
  }

  ensureStyles();
  document.addEventListener('DOMContentLoaded', attachButton);
})();
