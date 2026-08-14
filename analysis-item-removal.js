(() => {
  'use strict';

  const originalRenderAnalysis = window.renderAnalysis;
  if (typeof originalRenderAnalysis !== 'function') return;

  const STYLE_ID = 'analysis-item-removal-styles';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .analysis-live-totals {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin: 16px 0 18px;
      }

      .analysis-live-total {
        min-width: 0;
        padding: 10px 8px;
        border: 1px solid rgba(136, 174, 177, .1);
        border-radius: 13px;
        text-align: center;
        background: rgba(4, 15, 19, .46);
      }

      .analysis-live-total strong {
        display: block;
        color: #e8f2f2;
        font-size: 16px;
        line-height: 1.05;
      }

      .analysis-live-total small {
        display: block;
        margin-top: 4px;
        color: #789397;
        font-size: 11px;
        font-weight: 750;
      }

      .analysis-item-copy {
        min-width: 0;
        flex: 1;
      }

      .analysis-item-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 9px;
        flex-shrink: 0;
      }

      .analysis-remove-btn {
        min-height: 34px;
        padding: 6px 10px;
        border: 1px solid rgba(255, 103, 120, .24);
        border-radius: 10px;
        color: #ff8996;
        background: rgba(255, 83, 103, .08);
        font: inherit;
        font-size: 12px;
        font-weight: 850;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .analysis-remove-btn:active {
        transform: scale(.98);
      }

      @media (max-width: 420px) {
        .analysis-live-totals {
          grid-template-columns: repeat(2, 1fr);
        }

        .analysis-item {
          align-items: flex-start;
        }

        .analysis-item-actions {
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function recalculateAnalysis() {
    if (!state.analysis || !Array.isArray(state.analysis.items)) return;

    const items = state.analysis.items;
    const sum = key => Math.round(items.reduce((total, item) => total + num(item?.[key]), 0));

    state.analysis.calories = sum('calories');
    state.analysis.protein = sum('protein');
    state.analysis.carbs = sum('carbs');
    state.analysis.fat = sum('fat');

    const caloriesInput = document.getElementById('analysisCalories');
    if (caloriesInput) caloriesInput.value = state.analysis.calories;
  }

  function renderLiveTotals() {
    const panel = document.getElementById('analysisPanel');
    const subtitle = panel?.querySelector('.analysis-subtitle');
    if (!panel || !subtitle || !state.analysis) return;

    let totals = panel.querySelector('.analysis-live-totals');
    if (!totals) {
      totals = document.createElement('div');
      totals.className = 'analysis-live-totals';
      subtitle.before(totals);
    }

    totals.innerHTML = `
      <div class="analysis-live-total"><strong>${Math.round(num(state.analysis.calories))}</strong><small>kcal</small></div>
      <div class="analysis-live-total"><strong>${Math.round(num(state.analysis.protein))} g</strong><small>Białko</small></div>
      <div class="analysis-live-total"><strong>${Math.round(num(state.analysis.carbs))} g</strong><small>Węgle</small></div>
      <div class="analysis-live-total"><strong>${Math.round(num(state.analysis.fat))} g</strong><small>Tłuszcz</small></div>
    `;
  }

  function decorateItems() {
    const container = document.getElementById('analysisItems');
    if (!container || !state.analysis || !Array.isArray(state.analysis.items)) return;

    [...container.querySelectorAll('.analysis-item')].forEach((row, index) => {
      if (row.querySelector('.analysis-remove-btn')) return;

      const label = row.querySelector('span');
      const kcal = row.querySelector('strong');
      if (label) label.classList.add('analysis-item-copy');

      const actions = document.createElement('div');
      actions.className = 'analysis-item-actions';

      if (kcal) actions.appendChild(kcal);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'analysis-remove-btn';
      button.textContent = 'Usuń';
      button.dataset.analysisIndex = String(index);
      button.setAttribute('aria-label', `Usuń ${state.analysis.items[index]?.namePl || 'składnik'} z posiłku`);

      button.addEventListener('click', () => {
        const currentIndex = Number(button.dataset.analysisIndex);
        if (!Number.isInteger(currentIndex)) return;

        if (state.analysis.items.length <= 1) {
          if (typeof toast === 'function') toast('Posiłek musi zawierać co najmniej jeden składnik.');
          return;
        }

        const removed = state.analysis.items[currentIndex];
        state.analysis.items.splice(currentIndex, 1);
        recalculateAnalysis();
        window.renderAnalysis(state.analysis);

        if (typeof toast === 'function') {
          toast(`${removed?.namePl || 'Składnik'} usunięty`);
        }
      });

      actions.appendChild(button);
      row.appendChild(actions);
    });
  }

  window.renderAnalysis = function patchedRenderAnalysis(analysis) {
    state.analysis = analysis;
    recalculateAnalysis();
    originalRenderAnalysis(state.analysis);
    recalculateAnalysis();
    renderLiveTotals();
    decorateItems();
  };

  ensureStyles();
})();
