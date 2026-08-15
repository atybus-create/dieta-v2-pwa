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
        font-weight: 700;
        line-height: 1.35;
      }
      .analysis-item-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 9px;
        flex-shrink: 0;
      }
      .analysis-grams-wrap {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-height: 36px;
        padding: 3px 8px 3px 10px;
        border: 1px solid rgba(111, 194, 186, .18);
        border-radius: 11px;
        background: rgba(4, 15, 19, .42);
        transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
      }
      .analysis-grams-wrap.is-invalid {
        border-color: rgba(255, 103, 120, .72);
        background: rgba(255, 83, 103, .08);
        box-shadow: 0 0 0 3px rgba(255, 83, 103, .08);
      }
      .analysis-grams-input {
        width: 68px;
        min-height: 30px;
        padding: 2px 4px;
        border: 0;
        outline: 0;
        color: #edf7f6;
        background: transparent;
        font: inherit;
        font-size: 14px;
        font-weight: 850;
        text-align: right;
        appearance: textfield;
      }
      .analysis-grams-input::-webkit-outer-spin-button,
      .analysis-grams-input::-webkit-inner-spin-button { margin: 0; }
      .analysis-grams-unit {
        color: #7f9a9e;
        font-size: 12px;
        font-weight: 750;
      }
      .analysis-item-kcal {
        min-width: 68px;
        text-align: right;
        white-space: nowrap;
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
      .analysis-remove-btn:active { transform: scale(.98); }
      #app[data-theme="light"] .analysis-live-total {
        border-color: rgba(31, 44, 56, .09);
        background: #f8f9f8;
      }
      #app[data-theme="light"] .analysis-live-total strong { color: #17212b; }
      #app[data-theme="light"] .analysis-live-total small { color: #6f7b86; }
      #app[data-theme="light"] .analysis-grams-wrap {
        border-color: rgba(31, 92, 163, .14);
        background: #f5f8fb;
      }
      #app[data-theme="light"] .analysis-grams-wrap.is-invalid {
        border-color: rgba(189, 69, 61, .52);
        background: rgba(189, 69, 61, .06);
        box-shadow: 0 0 0 3px rgba(189, 69, 61, .07);
      }
      #app[data-theme="light"] .analysis-grams-input { color: #17212b; }
      #app[data-theme="light"] .analysis-grams-unit { color: #6f7b86; }
      #app[data-theme="light"] .analysis-remove-btn {
        color: #bd453d;
        border-color: rgba(189, 69, 61, .18);
        background: rgba(189, 69, 61, .06);
      }
      @media (max-width: 520px) {
        .analysis-live-totals { grid-template-columns: repeat(2, 1fr); }
        .analysis-item { align-items: flex-start; flex-wrap: wrap; }
        .analysis-item-copy { flex-basis: 100%; }
        .analysis-item-actions {
          width: 100%;
          justify-content: space-between;
          gap: 7px;
        }
        .analysis-grams-wrap { flex: 0 0 auto; }
      }
    `;

    document.head.appendChild(style);
  }

  function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function positiveOrZero(value) {
    return Math.max(0, num(value));
  }

  function parseGrams(value) {
    const raw = String(value ?? '').trim().replace(',', '.');
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5000) return null;
    return Math.round(parsed * 10) / 10;
  }

  function getPer100(item, key100, totalKey) {
    const direct = Number(item?.[key100]);
    if (Number.isFinite(direct) && direct >= 0) return direct;

    const grams = Number(item?.grams);
    const total = Number(item?.[totalKey]);
    if (Number.isFinite(grams) && grams > 0 && Number.isFinite(total) && total >= 0) {
      return (total * 100) / grams;
    }
    return 0;
  }

  function normalizeItemReferences(item) {
    if (!item || typeof item !== 'object') return item;
    if (!Number.isFinite(Number(item.kcal100))) item.kcal100 = getPer100(item, 'kcal100', 'calories');
    if (!Number.isFinite(Number(item.protein100))) item.protein100 = getPer100(item, 'protein100', 'protein');
    if (!Number.isFinite(Number(item.carbs100))) item.carbs100 = getPer100(item, 'carbs100', 'carbs');
    if (!Number.isFinite(Number(item.fat100))) item.fat100 = getPer100(item, 'fat100', 'fat');
    return item;
  }

  function recalculateItem(item) {
    normalizeItemReferences(item);
    const grams = Math.max(1, Math.min(5000, num(item.grams)));
    item.grams = grams;
    const factor = grams / 100;
    item.calories = Math.round(positiveOrZero(item.kcal100) * factor);
    item.protein = Math.round(positiveOrZero(item.protein100) * factor);
    item.carbs = Math.round(positiveOrZero(item.carbs100) * factor);
    item.fat = Math.round(positiveOrZero(item.fat100) * factor);
    return item;
  }

  function recalculateAnalysis({ syncCaloriesInput = true } = {}) {
    if (!state.analysis || !Array.isArray(state.analysis.items)) return;

    const items = state.analysis.items;
    const sum = key => Math.round(items.reduce((total, item) => total + num(item?.[key]), 0));

    state.analysis.calories = sum('calories');
    state.analysis.protein = sum('protein');
    state.analysis.carbs = sum('carbs');
    state.analysis.fat = sum('fat');

    if (syncCaloriesInput) {
      const caloriesInput = document.getElementById('analysisCalories');
      if (caloriesInput) caloriesInput.value = state.analysis.calories;
    }
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

  function updateItemRow(row, item) {
    const kcal = row?.querySelector('.analysis-item-kcal');
    if (kcal) kcal.textContent = `${Math.round(num(item?.calories))} kcal`;
  }

  function markInputValidity(input, valid) {
    input?.closest('.analysis-grams-wrap')?.classList.toggle('is-invalid', !valid);
    if (input) input.setAttribute('aria-invalid', valid ? 'false' : 'true');
  }

  function applyGramChange(index, rawValue, row, input, { showError = true } = {}) {
    if (!state.analysis || !Array.isArray(state.analysis.items)) return false;
    const item = state.analysis.items[index];
    if (!item) return false;

    const parsed = parseGrams(rawValue);
    if (parsed === null) {
      markInputValidity(input, false);
      if (showError && typeof toast === 'function') toast('Uzupełnij gramaturę składnika w zakresie 1–5000 g.');
      return false;
    }

    markInputValidity(input, true);
    item.grams = parsed;
    if (input) input.value = String(parsed);
    recalculateItem(item);
    recalculateAnalysis();
    updateItemRow(row, item);
    renderLiveTotals();
    return true;
  }

  function validateAndCommitAllGrams({ showError = true } = {}) {
    const inputs = [...document.querySelectorAll('#analysisItems .analysis-grams-input')];
    if (!inputs.length) return true;

    let valid = true;
    inputs.forEach(input => {
      const index = Number(input.dataset.analysisIndex);
      const row = input.closest('.analysis-item');
      if (!Number.isInteger(index) || !applyGramChange(index, input.value, row, input, { showError: false })) {
        valid = false;
      }
    });

    if (!valid && showError && typeof toast === 'function') {
      toast('Uzupełnij poprawną gramaturę wszystkich składników.');
      const firstInvalid = inputs.find(input => input.getAttribute('aria-invalid') === 'true');
      firstInvalid?.focus();
    }
    return valid;
  }

  function decorateItems() {
    const container = document.getElementById('analysisItems');
    if (!container || !state.analysis || !Array.isArray(state.analysis.items)) return;

    [...container.querySelectorAll('.analysis-item')].forEach((row, index) => {
      const item = state.analysis.items[index];
      if (!item) return;
      normalizeItemReferences(item);

      const label = row.querySelector('span');
      const kcal = row.querySelector('strong');
      if (label) {
        label.classList.add('analysis-item-copy');
        label.textContent = String(item.namePl || item.searchTerm || 'Składnik');
      }

      const actions = document.createElement('div');
      actions.className = 'analysis-item-actions';

      const gramsWrap = document.createElement('label');
      gramsWrap.className = 'analysis-grams-wrap';
      gramsWrap.setAttribute('aria-label', `Gramatura: ${item.namePl || 'składnik'}`);

      const gramsInput = document.createElement('input');
      gramsInput.type = 'number';
      gramsInput.className = 'analysis-grams-input';
      gramsInput.min = '1';
      gramsInput.max = '5000';
      gramsInput.step = '1';
      gramsInput.inputMode = 'decimal';
      gramsInput.value = String(Math.round(num(item.grams) * 10) / 10);
      gramsInput.dataset.analysisIndex = String(index);
      gramsInput.setAttribute('aria-invalid', 'false');

      const gramsUnit = document.createElement('span');
      gramsUnit.className = 'analysis-grams-unit';
      gramsUnit.textContent = 'g';
      gramsWrap.append(gramsInput, gramsUnit);
      actions.appendChild(gramsWrap);

      if (kcal) {
        kcal.classList.add('analysis-item-kcal');
        kcal.textContent = `${Math.round(num(item.calories))} kcal`;
        actions.appendChild(kcal);
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'analysis-remove-btn';
      button.textContent = 'Usuń';
      button.dataset.analysisIndex = String(index);
      button.setAttribute('aria-label', `Usuń ${item.namePl || 'składnik'} z posiłku`);

      gramsInput.addEventListener('input', () => {
        const valid = parseGrams(gramsInput.value) !== null;
        markInputValidity(gramsInput, valid);
      });

      gramsInput.addEventListener('change', () => {
        applyGramChange(index, gramsInput.value, row, gramsInput);
      });

      gramsInput.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        if (applyGramChange(index, gramsInput.value, row, gramsInput)) gramsInput.blur();
      });

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

        if (typeof toast === 'function') toast(`${removed?.namePl || 'Składnik'} usunięty`);
      });

      actions.appendChild(button);
      row.appendChild(actions);
    });
  }

  document.addEventListener('click', event => {
    const button = event.target?.closest?.('#analysisPanel button');
    if (!button || button.classList.contains('analysis-remove-btn')) return;

    const label = String(button.textContent || '').trim().toLocaleLowerCase('pl-PL');
    const isSaveAction = label.includes('dodaj posiłek') || label.includes('ulubion');
    if (!isSaveAction) return;

    if (!validateAndCommitAllGrams()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.renderAnalysis = function patchedRenderAnalysis(analysis) {
    state.analysis = analysis;
    if (Array.isArray(state.analysis?.items)) {
      state.analysis.items.forEach(normalizeItemReferences);
    }
    recalculateAnalysis();
    originalRenderAnalysis(state.analysis);
    recalculateAnalysis();
    renderLiveTotals();
    decorateItems();
  };

  ensureStyles();
})();
