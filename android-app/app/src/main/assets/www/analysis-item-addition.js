(() => {
  'use strict';

  const originalRenderAnalysis = window.renderAnalysis;
  if (typeof originalRenderAnalysis !== 'function') return;

  const STYLE_ID = 'analysis-item-addition-styles';
  let busy = false;
  let pendingIngredient = null;
  let pendingDatabaseHit = false;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .analysis-add-ingredient{margin:12px 0 16px}.analysis-add-toggle{width:100%;min-height:42px;border:1px dashed rgba(93,221,204,.34);border-radius:12px;color:#75e9d8;background:rgba(45,197,181,.06);font:inherit;font-size:13px;font-weight:850;cursor:pointer;-webkit-tap-highlight-color:transparent}.analysis-add-toggle:active{transform:scale(.995)}
      .analysis-add-form,.analysis-add-grams-form{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;margin-top:9px;align-items:center}.analysis-add-form.hidden,.analysis-add-grams-form.hidden{display:none!important}.analysis-add-input,.analysis-add-grams{min-width:0;min-height:42px;padding:9px 11px;border:1px solid rgba(111,194,186,.2);border-radius:11px;color:#edf7f6;background:rgba(4,15,19,.52);font:inherit;font-size:14px;outline:0}.analysis-add-input:focus,.analysis-add-grams:focus{border-color:rgba(91,225,209,.58);box-shadow:0 0 0 3px rgba(91,225,209,.08)}
      .analysis-add-found{grid-column:1/-1;padding:10px 11px;border-radius:11px;background:rgba(45,197,181,.06);color:#cce9e5;font-size:13px}.analysis-add-found strong{color:#75e9d8}.analysis-add-search,.analysis-add-confirm,.analysis-add-cancel,.analysis-add-back{min-height:42px;padding:8px 12px;border-radius:11px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.analysis-add-search,.analysis-add-confirm{border:1px solid rgba(91,225,209,.34);color:#071014;background:#69e1d1}.analysis-add-cancel,.analysis-add-back{border:1px solid rgba(135,158,161,.18);color:#9db1b3;background:rgba(255,255,255,.035)}
      .analysis-add-search:disabled,.analysis-add-confirm:disabled,.analysis-add-cancel:disabled,.analysis-add-back:disabled,.analysis-add-input:disabled,.analysis-add-grams:disabled{opacity:.58;cursor:default}#app[data-theme="light"] .analysis-add-toggle{color:#147f77;border-color:rgba(20,127,119,.28);background:rgba(20,127,119,.045)}#app[data-theme="light"] .analysis-add-input,#app[data-theme="light"] .analysis-add-grams{color:#17212b;border-color:rgba(31,92,163,.14);background:#f7f9fa}#app[data-theme="light"] .analysis-add-search,#app[data-theme="light"] .analysis-add-confirm{color:#0b2825;background:#74dfd1}#app[data-theme="light"] .analysis-add-cancel,#app[data-theme="light"] .analysis-add-back{color:#65727c;border-color:rgba(31,44,56,.12);background:#f3f5f6}#app[data-theme="light"] .analysis-add-found{background:rgba(20,127,119,.05);color:#43545b}#app[data-theme="light"] .analysis-add-found strong{color:#147f77}
      @media(max-width:520px){.analysis-add-form,.analysis-add-grams-form{grid-template-columns:minmax(0,1fr) auto}.analysis-add-cancel,.analysis-add-back{grid-column:1/-1}}
    `;
    document.head.appendChild(style);
  }

  function validIngredient(item) {
    if (!item || typeof item !== 'object' || !String(item.namePl || item.searchTerm || '').trim()) return false;
    return ['kcal100','protein100','carbs100','fat100'].every(key => Number.isFinite(Number(item[key])) && Number(item[key]) >= 0);
  }

  function setBusy(root, value) {
    busy = value;
    root?.querySelectorAll('input,button').forEach(el => { el.disabled = value; });
    const search = root?.querySelector('.analysis-add-search');
    if (search) search.textContent = value ? 'Szukam…' : 'Szukaj';
  }

  function reset(root) {
    pendingIngredient = null;
    pendingDatabaseHit = false;
    const input = root.querySelector('.analysis-add-input');
    const grams = root.querySelector('.analysis-add-grams');
    if (input) input.value = '';
    if (grams) grams.value = '100';
    root.querySelector('.analysis-add-form')?.classList.add('hidden');
    root.querySelector('.analysis-add-grams-form')?.classList.add('hidden');
    root.querySelector('.analysis-add-toggle')?.classList.remove('hidden');
  }

  async function searchIngredient(root) {
    if (busy || !state.analysis || !Array.isArray(state.analysis.items)) return;
    const input = root.querySelector('.analysis-add-input');
    const query = String(input?.value || '').trim();
    if (!query) { if (typeof toast === 'function') toast('Wpisz nazwę składnika.'); input?.focus(); return; }
    if (query.length > 120) { if (typeof toast === 'function') toast('Nazwa składnika jest za długa.'); return; }

    setBusy(root, true);
    try {
      const data = await api('ingredient_search', { text: query });
      if (!validIngredient(data?.ingredient)) throw new Error('Nie udało się pobrać poprawnych danych składnika.');
      pendingIngredient = { ...data.ingredient };
      pendingDatabaseHit = Boolean(data.databaseHit);
      root.querySelector('.analysis-add-found').innerHTML = `Znaleziono: <strong>${String(pendingIngredient.namePl || query)}</strong>. Ile gramów dodać?`;
      root.querySelector('.analysis-add-form')?.classList.add('hidden');
      root.querySelector('.analysis-add-grams-form')?.classList.remove('hidden');
      const grams = root.querySelector('.analysis-add-grams');
      if (grams) { grams.value = '100'; setTimeout(() => { grams.focus(); grams.select(); }, 0); }
    } catch (error) {
      if (typeof toast === 'function') toast(error?.message || 'Nie udało się znaleźć składnika.');
    } finally { setBusy(root, false); }
  }

  function confirmIngredient(root) {
    if (!pendingIngredient || !state.analysis || !Array.isArray(state.analysis.items)) return;
    const gramsInput = root.querySelector('.analysis-add-grams');
    const grams = Number(String(gramsInput?.value || '').replace(',', '.'));
    if (!Number.isFinite(grams) || grams <= 0 || grams > 10000) { if (typeof toast === 'function') toast('Podaj prawidłową gramaturę.'); gramsInput?.focus(); return; }

    const ingredient = { ...pendingIngredient, grams };
    const factor = grams / 100;
    ingredient.calories = Math.round(Number(ingredient.kcal100 || 0) * factor);
    ingredient.protein = Math.round(Number(ingredient.protein100 || 0) * factor);
    ingredient.carbs = Math.round(Number(ingredient.carbs100 || 0) * factor);
    ingredient.fat = Math.round(Number(ingredient.fat100 || 0) * factor);
    ingredient.itemIndex = state.analysis.items.length;
    ingredient.mealDescription = String(state.analysis.description || 'Posiłek');
    ingredient.confidence = String(ingredient.confidence || state.analysis.confidence || 'medium');
    state.analysis.items.push(ingredient);

    const name = ingredient.namePl || 'Składnik';
    const source = pendingDatabaseHit ? ' z bazy' : ' przez Gemini';
    reset(root);
    window.renderAnalysis(state.analysis);
    if (typeof toast === 'function') toast(`${name}: dodano ${grams} g${source}.`);
  }

  function ensureControls() {
    const panel = document.getElementById('analysisPanel');
    const items = document.getElementById('analysisItems');
    if (!panel || !items || !state.analysis || !Array.isArray(state.analysis.items) || panel.querySelector('.analysis-add-ingredient')) return;

    const root = document.createElement('div');
    root.className = 'analysis-add-ingredient';
    root.innerHTML = `
      <button class="analysis-add-toggle" type="button">+ Dodaj składnik</button>
      <div class="analysis-add-form hidden"><input class="analysis-add-input" type="text" maxlength="120" autocomplete="off" placeholder="np. ser cheddar" aria-label="Nazwa składnika"><button class="analysis-add-search" type="button">Szukaj</button><button class="analysis-add-cancel" type="button">Anuluj</button></div>
      <div class="analysis-add-grams-form hidden"><div class="analysis-add-found"></div><input class="analysis-add-grams" type="number" inputmode="decimal" min="1" max="10000" step="1" value="100" aria-label="Gramatura składnika"><button class="analysis-add-confirm" type="button">Dodaj</button><button class="analysis-add-back" type="button">Wróć</button></div>`;
    items.after(root);

    const toggle = root.querySelector('.analysis-add-toggle');
    const form = root.querySelector('.analysis-add-form');
    const input = root.querySelector('.analysis-add-input');
    toggle?.addEventListener('click', () => { toggle.classList.add('hidden'); form?.classList.remove('hidden'); setTimeout(() => input?.focus(), 0); });
    root.querySelector('.analysis-add-cancel')?.addEventListener('click', () => { if (!busy) reset(root); });
    root.querySelector('.analysis-add-back')?.addEventListener('click', () => { if (busy) return; pendingIngredient = null; root.querySelector('.analysis-add-grams-form')?.classList.add('hidden'); form?.classList.remove('hidden'); setTimeout(() => input?.focus(), 0); });
    root.querySelector('.analysis-add-search')?.addEventListener('click', () => searchIngredient(root));
    root.querySelector('.analysis-add-confirm')?.addEventListener('click', () => confirmIngredient(root));
    input?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); searchIngredient(root); } });
    root.querySelector('.analysis-add-grams')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); confirmIngredient(root); } });
  }

  window.renderAnalysis = function patchedRenderAnalysisWithIngredientAddition(analysis) { originalRenderAnalysis(analysis); ensureControls(); };
  ensureStyles();
  ensureControls();
})();