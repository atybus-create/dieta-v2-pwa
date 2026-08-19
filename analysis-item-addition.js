(() => {
  'use strict';

  const originalRenderAnalysis = window.renderAnalysis;
  if (typeof originalRenderAnalysis !== 'function') return;

  const STYLE_ID = 'analysis-item-addition-styles';
  let busy = false;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .analysis-add-ingredient {
        margin: 12px 0 16px;
      }
      .analysis-add-toggle {
        width: 100%;
        min-height: 42px;
        border: 1px dashed rgba(93, 221, 204, .34);
        border-radius: 12px;
        color: #75e9d8;
        background: rgba(45, 197, 181, .06);
        font: inherit;
        font-size: 13px;
        font-weight: 850;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .analysis-add-toggle:active { transform: scale(.995); }
      .analysis-add-form {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        gap: 8px;
        margin-top: 9px;
        align-items: center;
      }
      .analysis-add-form.hidden { display: none !important; }
      .analysis-add-input {
        min-width: 0;
        min-height: 42px;
        padding: 9px 11px;
        border: 1px solid rgba(111, 194, 186, .2);
        border-radius: 11px;
        color: #edf7f6;
        background: rgba(4, 15, 19, .52);
        font: inherit;
        font-size: 14px;
        outline: 0;
      }
      .analysis-add-input:focus {
        border-color: rgba(91, 225, 209, .58);
        box-shadow: 0 0 0 3px rgba(91, 225, 209, .08);
      }
      .analysis-add-search,
      .analysis-add-cancel {
        min-height: 42px;
        padding: 8px 12px;
        border-radius: 11px;
        font: inherit;
        font-size: 12px;
        font-weight: 850;
        cursor: pointer;
      }
      .analysis-add-search {
        border: 1px solid rgba(91, 225, 209, .34);
        color: #071014;
        background: #69e1d1;
      }
      .analysis-add-cancel {
        border: 1px solid rgba(135, 158, 161, .18);
        color: #9db1b3;
        background: rgba(255, 255, 255, .035);
      }
      .analysis-add-search:disabled,
      .analysis-add-cancel:disabled,
      .analysis-add-input:disabled {
        opacity: .58;
        cursor: default;
      }
      #app[data-theme="light"] .analysis-add-toggle {
        color: #147f77;
        border-color: rgba(20, 127, 119, .28);
        background: rgba(20, 127, 119, .045);
      }
      #app[data-theme="light"] .analysis-add-input {
        color: #17212b;
        border-color: rgba(31, 92, 163, .14);
        background: #f7f9fa;
      }
      #app[data-theme="light"] .analysis-add-search {
        color: #0b2825;
        background: #74dfd1;
      }
      #app[data-theme="light"] .analysis-add-cancel {
        color: #65727c;
        border-color: rgba(31, 44, 56, .12);
        background: #f3f5f6;
      }
      @media (max-width: 520px) {
        .analysis-add-form {
          grid-template-columns: minmax(0, 1fr) auto;
        }
        .analysis-add-cancel {
          grid-column: 1 / -1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function validIngredient(item) {
    if (!item || typeof item !== 'object') return false;
    if (!String(item.namePl || item.searchTerm || '').trim()) return false;
    const fields = ['grams', 'kcal100', 'protein100', 'carbs100', 'fat100'];
    return fields.every(key => Number.isFinite(Number(item[key])) && Number(item[key]) >= 0) && Number(item.grams) > 0;
  }

  function setBusy(root, value) {
    busy = value;
    const input = root?.querySelector('.analysis-add-input');
    const search = root?.querySelector('.analysis-add-search');
    const cancel = root?.querySelector('.analysis-add-cancel');
    if (input) input.disabled = value;
    if (search) {
      search.disabled = value;
      search.textContent = value ? 'Szukam…' : 'Szukaj';
    }
    if (cancel) cancel.disabled = value;
  }

  async function searchAndAdd(root) {
    if (busy || !state.analysis || !Array.isArray(state.analysis.items)) return;
    const input = root.querySelector('.analysis-add-input');
    const query = String(input?.value || '').trim();
    if (!query) {
      if (typeof toast === 'function') toast('Wpisz nazwę składnika.');
      input?.focus();
      return;
    }
    if (query.length > 120) {
      if (typeof toast === 'function') toast('Nazwa składnika jest za długa.');
      return;
    }

    setBusy(root, true);
    try {
      const data = await api('ingredient_search', { text: query });
      const ingredient = data?.ingredient;
      if (!validIngredient(ingredient)) throw new Error('Nie udało się pobrać poprawnych danych składnika.');

      ingredient.itemIndex = state.analysis.items.length;
      ingredient.mealDescription = String(state.analysis.description || 'Posiłek');
      ingredient.confidence = String(ingredient.confidence || state.analysis.confidence || 'medium');
      state.analysis.items.push(ingredient);

      if (input) input.value = '';
      root.querySelector('.analysis-add-form')?.classList.add('hidden');
      root.querySelector('.analysis-add-toggle')?.classList.remove('hidden');
      window.renderAnalysis(state.analysis);

      if (typeof toast === 'function') {
        const source = data?.databaseHit ? ' z bazy' : '';
        toast(`${ingredient.namePl || 'Składnik'} dodany${source}.`);
      }
    } catch (error) {
      if (typeof toast === 'function') toast(error?.message || 'Nie udało się dodać składnika.');
    } finally {
      const freshRoot = document.querySelector('.analysis-add-ingredient');
      if (freshRoot) setBusy(freshRoot, false);
      else busy = false;
    }
  }

  function ensureControls() {
    const panel = document.getElementById('analysisPanel');
    const items = document.getElementById('analysisItems');
    if (!panel || !items || !state.analysis || !Array.isArray(state.analysis.items)) return;

    let root = panel.querySelector('.analysis-add-ingredient');
    if (root) return;

    root = document.createElement('div');
    root.className = 'analysis-add-ingredient';
    root.innerHTML = `
      <button class="analysis-add-toggle" type="button">+ Dodaj składnik</button>
      <div class="analysis-add-form hidden">
        <input class="analysis-add-input" type="text" maxlength="120" autocomplete="off" placeholder="np. ser cheddar" aria-label="Nazwa składnika">
        <button class="analysis-add-search" type="button">Szukaj</button>
        <button class="analysis-add-cancel" type="button">Anuluj</button>
      </div>
    `;
    items.after(root);

    const toggle = root.querySelector('.analysis-add-toggle');
    const form = root.querySelector('.analysis-add-form');
    const input = root.querySelector('.analysis-add-input');
    const search = root.querySelector('.analysis-add-search');
    const cancel = root.querySelector('.analysis-add-cancel');

    toggle?.addEventListener('click', () => {
      toggle.classList.add('hidden');
      form?.classList.remove('hidden');
      setTimeout(() => input?.focus(), 0);
    });

    cancel?.addEventListener('click', () => {
      if (busy) return;
      if (input) input.value = '';
      form?.classList.add('hidden');
      toggle?.classList.remove('hidden');
    });

    search?.addEventListener('click', () => searchAndAdd(root));
    input?.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      searchAndAdd(root);
    });
  }

  window.renderAnalysis = function patchedRenderAnalysisWithIngredientAddition(analysis) {
    originalRenderAnalysis(analysis);
    ensureControls();
  };

  ensureStyles();
  ensureControls();
})();