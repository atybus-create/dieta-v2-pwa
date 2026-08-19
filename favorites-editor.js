(() => {
  'use strict';

  const STYLE_ID = 'favorites-editor-styles';
  let pendingIngredient = null;
  let pendingDatabaseHit = false;
  let busy = false;

  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const clone = value => JSON.parse(JSON.stringify(value));
  const parseGrams = value => {
    const n = Number(String(value ?? '').trim().replace(',', '.'));
    return Number.isFinite(n) && n >= 1 && n <= 5000 ? Math.round(n * 10) / 10 : null;
  };
  const getPer100 = (item, directKey, totalKey) => {
    const direct = Number(item?.[directKey]);
    if (Number.isFinite(direct) && direct >= 0) return direct;
    const grams = Number(item?.grams);
    const total = Number(item?.[totalKey]);
    return Number.isFinite(grams) && grams > 0 && Number.isFinite(total) && total >= 0 ? total * 100 / grams : 0;
  };
  function recalcItem(item) {
    item.kcal100 = getPer100(item, 'kcal100', 'calories');
    item.protein100 = getPer100(item, 'protein100', 'protein');
    item.carbs100 = getPer100(item, 'carbs100', 'carbs');
    item.fat100 = getPer100(item, 'fat100', 'fat');
    const grams = parseGrams(item.grams) ?? 1;
    item.grams = grams;
    const factor = grams / 100;
    item.calories = Math.round(num(item.kcal100) * factor);
    item.protein = Math.round(num(item.protein100) * factor);
    item.carbs = Math.round(num(item.carbs100) * factor);
    item.fat = Math.round(num(item.fat100) * factor);
    return item;
  }
  function recalcFavorite(favorite) {
    favorite.items = (Array.isArray(favorite.items) ? favorite.items : []).map(recalcItem);
    for (const key of ['calories','protein','carbs','fat']) favorite[key] = Math.round(favorite.items.reduce((s, x) => s + num(x[key]), 0));
    return favorite;
  }
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #favoritesList article{transition:border-color .18s ease,background .18s ease,transform .18s ease}.favorite-editor-card{cursor:pointer}.favorite-editor-card.is-expanded{cursor:default;border-color:rgba(91,225,209,.28);background:rgba(12,29,34,.72)}.favorite-editor-card .fav-head{cursor:pointer}.favorite-editor-body{display:none;margin-top:16px;padding-top:15px;border-top:1px solid rgba(111,194,186,.12)}.favorite-editor-card.is-expanded .favorite-editor-body{display:block}.favorite-editor-totals{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:14px}.favorite-editor-total{padding:9px 5px;text-align:center;border-radius:11px;background:rgba(4,15,19,.44)}.favorite-editor-total strong{display:block;font-size:15px}.favorite-editor-total small{display:block;margin-top:3px;color:#789397;font-size:10px}.favorite-editor-items{display:grid;gap:8px}.favorite-editor-item{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:8px;align-items:center;padding:9px 10px;border:1px solid rgba(111,194,186,.11);border-radius:12px;background:rgba(4,15,19,.32)}.favorite-editor-name{min-width:0;font-size:13px;font-weight:750}.favorite-editor-grams{width:68px;min-height:36px;padding:5px 7px;border:1px solid rgba(111,194,186,.18);border-radius:10px;color:#edf7f6;background:rgba(4,15,19,.5);font:inherit;font-weight:800;text-align:right}.favorite-editor-kcal{min-width:62px;text-align:right;font-size:12px;color:#9eb5b6}.favorite-editor-remove{min-height:34px;padding:5px 8px;border:1px solid rgba(255,103,120,.22);border-radius:9px;color:#ff8996;background:rgba(255,83,103,.07);font:inherit;font-size:11px;font-weight:800;cursor:pointer}.favorite-editor-add{margin-top:11px}.favorite-editor-add-toggle{width:100%;min-height:40px;border:1px dashed rgba(93,221,204,.34);border-radius:11px;color:#75e9d8;background:rgba(45,197,181,.05);font:inherit;font-size:12px;font-weight:850;cursor:pointer}.favorite-editor-search-form,.favorite-editor-grams-form{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:7px;margin-top:8px}.favorite-editor-search-form.hidden,.favorite-editor-grams-form.hidden{display:none!important}.favorite-editor-search-input,.favorite-editor-new-grams{min-width:0;min-height:40px;padding:7px 9px;border:1px solid rgba(111,194,186,.18);border-radius:10px;color:#edf7f6;background:rgba(4,15,19,.5);font:inherit}.favorite-editor-found{grid-column:1/-1;font-size:12px;color:#a9c8c5}.favorite-editor-search,.favorite-editor-confirm,.favorite-editor-cancel,.favorite-editor-back{min-height:40px;padding:7px 10px;border-radius:10px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}.favorite-editor-search,.favorite-editor-confirm{border:1px solid rgba(91,225,209,.34);background:#69e1d1;color:#071014}.favorite-editor-cancel,.favorite-editor-back{border:1px solid rgba(135,158,161,.18);background:rgba(255,255,255,.035);color:#9db1b3}.favorite-editor-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.favorite-editor-save,.favorite-editor-use{min-height:42px;border-radius:11px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.favorite-editor-save{border:1px solid rgba(91,225,209,.34);background:#69e1d1;color:#071014}.favorite-editor-use{border:1px solid rgba(111,194,186,.18);background:rgba(45,197,181,.07);color:#75e9d8}#app[data-theme="light"] .favorite-editor-card.is-expanded{background:#fff}#app[data-theme="light"] .favorite-editor-total,#app[data-theme="light"] .favorite-editor-item{background:#f7f9f9}#app[data-theme="light"] .favorite-editor-grams,#app[data-theme="light"] .favorite-editor-search-input,#app[data-theme="light"] .favorite-editor-new-grams{color:#17212b;background:#fff}@media(max-width:520px){.favorite-editor-item{grid-template-columns:minmax(0,1fr) 76px auto}.favorite-editor-kcal{grid-column:1/2;grid-row:2;text-align:left}.favorite-editor-remove{grid-column:3;grid-row:1/3}.favorite-editor-totals{grid-template-columns:repeat(2,1fr)}.favorite-editor-actions{grid-template-columns:1fr}.favorite-editor-search-form,.favorite-editor-grams-form{grid-template-columns:minmax(0,1fr) auto}.favorite-editor-cancel,.favorite-editor-back{grid-column:1/-1}}
    `;
    document.head.appendChild(style);
  }
  function updateTotals(article, favorite) {
    const totals = article.querySelector('.favorite-editor-totals');
    if (totals) totals.innerHTML = `<div class="favorite-editor-total"><strong>${favorite.calories}</strong><small>kcal</small></div><div class="favorite-editor-total"><strong>${favorite.protein} g</strong><small>Białko</small></div><div class="favorite-editor-total"><strong>${favorite.carbs} g</strong><small>Węgle</small></div><div class="favorite-editor-total"><strong>${favorite.fat} g</strong><small>Tłuszcz</small></div>`;
  }
  function renderItems(article, favorite) {
    recalcFavorite(favorite);
    updateTotals(article, favorite);
    const root = article.querySelector('.favorite-editor-items');
    if (!root) return;
    root.innerHTML = '';
    favorite.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'favorite-editor-item';
      row.innerHTML = `<div class="favorite-editor-name">${escapeHtml(item.namePl || item.searchTerm || 'Składnik')}</div><input class="favorite-editor-grams" type="number" inputmode="decimal" min="1" max="5000" step="1" value="${item.grams}" aria-label="Gramatura ${escapeHtml(item.namePl || 'składnika')}"><div class="favorite-editor-kcal">${item.calories} kcal</div><button class="favorite-editor-remove" type="button">Usuń</button>`;
      const grams = row.querySelector('.favorite-editor-grams');
      grams.addEventListener('change', () => {
        const value = parseGrams(grams.value);
        if (value === null) { grams.value = String(item.grams); toast('Podaj gramaturę 1–5000 g.'); return; }
        item.grams = value; recalcFavorite(favorite); renderItems(article, favorite); markDirty(article);
      });
      row.querySelector('.favorite-editor-remove').addEventListener('click', event => {
        event.stopPropagation();
        if (favorite.items.length <= 1) { toast('Ulubiony posiłek musi zawierać co najmniej jeden składnik.'); return; }
        favorite.items.splice(index, 1); recalcFavorite(favorite); renderItems(article, favorite); markDirty(article);
      });
      root.appendChild(row);
    });
  }
  function markDirty(article) { article.dataset.dirty = 'true'; const btn = article.querySelector('.favorite-editor-save'); if (btn) btn.textContent = 'Zapisz zmiany'; }
  function resetAdd(article) {
    pendingIngredient = null; pendingDatabaseHit = false;
    article.querySelector('.favorite-editor-search-form')?.classList.add('hidden');
    article.querySelector('.favorite-editor-grams-form')?.classList.add('hidden');
    article.querySelector('.favorite-editor-add-toggle')?.classList.remove('hidden');
  }
  async function searchIngredient(article) {
    if (busy) return;
    const input = article.querySelector('.favorite-editor-search-input');
    const text = String(input?.value || '').trim();
    if (!text) { toast('Wpisz nazwę składnika.'); input?.focus(); return; }
    busy = true;
    try {
      const data = await api('ingredient_search', { text });
      if (!data?.ingredient) throw new Error('Nie udało się znaleźć składnika.');
      pendingIngredient = clone(data.ingredient); pendingDatabaseHit = Boolean(data.databaseHit);
      article.querySelector('.favorite-editor-found').textContent = `Znaleziono: ${pendingIngredient.namePl || text}. Ile gramów dodać?`;
      article.querySelector('.favorite-editor-search-form')?.classList.add('hidden');
      article.querySelector('.favorite-editor-grams-form')?.classList.remove('hidden');
    } catch (e) { toast(e.message || 'Nie udało się znaleźć składnika.'); }
    finally { busy = false; }
  }
  function confirmIngredient(article, favorite) {
    if (!pendingIngredient) return;
    const input = article.querySelector('.favorite-editor-new-grams');
    const grams = parseGrams(input?.value);
    if (grams === null) { toast('Podaj gramaturę 1–5000 g.'); return; }
    const item = recalcItem({ ...pendingIngredient, grams, itemIndex: favorite.items.length, mealDescription: favorite.description });
    favorite.items.push(item); recalcFavorite(favorite); renderItems(article, favorite); markDirty(article); resetAdd(article);
    toast(`${item.namePl || 'Składnik'}: dodano ${grams} g${pendingDatabaseHit ? ' z bazy' : ''}.`);
  }
  function decorateArticle(article) {
    if (article.dataset.favoriteEditorReady === '1') return;
    let original; try { original = JSON.parse(article.dataset.favorite || '{}'); } catch (e) { return; }
    if (!original?.favoriteId || !Array.isArray(original.items)) return;
    const favorite = recalcFavorite(clone(original));
    article.dataset.favoriteEditorReady = '1'; article.dataset.dirty = 'false'; article.classList.add('favorite-editor-card');
    const oldUse = article.querySelector('[data-use]'); if (oldUse) oldUse.style.display = 'none';
    const body = document.createElement('div'); body.className = 'favorite-editor-body';
    body.innerHTML = `<div class="favorite-editor-totals"></div><div class="favorite-editor-items"></div><div class="favorite-editor-add"><button class="favorite-editor-add-toggle" type="button">+ Dodaj składnik</button><div class="favorite-editor-search-form hidden"><input class="favorite-editor-search-input" maxlength="120" placeholder="np. ser cheddar"><button class="favorite-editor-search" type="button">Szukaj</button><button class="favorite-editor-cancel" type="button">Anuluj</button></div><div class="favorite-editor-grams-form hidden"><div class="favorite-editor-found"></div><input class="favorite-editor-new-grams" type="number" min="1" max="5000" value="100"><button class="favorite-editor-confirm" type="button">Dodaj</button><button class="favorite-editor-back" type="button">Wróć</button></div></div><div class="favorite-editor-actions"><button class="favorite-editor-save" type="button">Zapisz zmiany</button><button class="favorite-editor-use" type="button">Dodaj ten posiłek</button></div>`;
    article.appendChild(body); renderItems(article, favorite);
    article.querySelector('.fav-head')?.addEventListener('click', event => { if (event.target.closest('button')) return; article.classList.toggle('is-expanded'); });
    article.addEventListener('click', event => { if (event.target.closest('.favorite-editor-body') || event.target.closest('button')) return; article.classList.toggle('is-expanded'); });
    article.querySelector('.favorite-editor-add-toggle').onclick = event => { event.stopPropagation(); article.querySelector('.favorite-editor-add-toggle').classList.add('hidden'); article.querySelector('.favorite-editor-search-form').classList.remove('hidden'); article.querySelector('.favorite-editor-search-input')?.focus(); };
    article.querySelector('.favorite-editor-cancel').onclick = event => { event.stopPropagation(); resetAdd(article); };
    article.querySelector('.favorite-editor-back').onclick = event => { event.stopPropagation(); pendingIngredient = null; article.querySelector('.favorite-editor-grams-form').classList.add('hidden'); article.querySelector('.favorite-editor-search-form').classList.remove('hidden'); };
    article.querySelector('.favorite-editor-search').onclick = event => { event.stopPropagation(); searchIngredient(article); };
    article.querySelector('.favorite-editor-confirm').onclick = event => { event.stopPropagation(); confirmIngredient(article, favorite); };
    article.querySelector('.favorite-editor-save').onclick = async event => {
      event.stopPropagation(); recalcFavorite(favorite);
      loading(true, 'Zapisuję ulubiony posiłek…', 'Aktualizuję składniki i wartości odżywcze.');
      try {
        await api('favorite_update', { favoriteId: favorite.favoriteId, analysisJson: JSON.stringify(favorite), description: favorite.description });
        article.dataset.favorite = JSON.stringify(favorite); article.dataset.dirty = 'false'; toast('Zapisano zmiany w ulubionych');
      } catch (e) { toast(e.message || 'Nie udało się zapisać zmian.'); }
      finally { loading(false); }
    };
    article.querySelector('.favorite-editor-use').onclick = event => {
      event.stopPropagation(); recalcFavorite(favorite);
      state.analysis = { description: favorite.description, items: clone(favorite.items), calories: favorite.calories, protein: favorite.protein, carbs: favorite.carbs, fat: favorite.fat, source: `Ulubione · ${favorite.source || 'Dieta V2'}`, confidence: favorite.confidence || 'high' };
      nav('add'); renderAnalysis(state.analysis);
    };
  }
  function decorateFavorites() { ensureStyles(); document.querySelectorAll('#favoritesList article').forEach(decorateArticle); }
  const originalLoadFavorites = window.loadFavorites;
  if (typeof originalLoadFavorites === 'function') window.loadFavorites = async function patchedLoadFavorites(...args) { const result = await originalLoadFavorites.apply(this, args); decorateFavorites(); return result; };
  const observer = new MutationObserver(() => decorateFavorites());
  const start = () => { const root = document.getElementById('favoritesList'); if (root) { observer.observe(root, { childList: true }); decorateFavorites(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();