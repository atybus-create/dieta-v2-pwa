(() => {
  const GOALS_API = 'https://n8n-pi.taild8d05f.ts.net/webhook/dieta-v2-goals-calc';
  let targetMode = 'new';

  function $(id) { return document.getElementById(id); }

  function injectStyles() {
    if ($('goalsCalcStyles')) return;
    const style = document.createElement('style');
    style.id = 'goalsCalcStyles';
    style.textContent = `
      .goals-ai-button{width:100%;margin:14px 0 6px;padding:16px 18px;border:0;border-radius:18px;font-weight:800;font-size:15px;line-height:1.25;color:#061316;background:linear-gradient(135deg,#72f5df,#22c9d6);box-shadow:0 14px 36px rgba(34,201,214,.18);cursor:pointer}
      .goals-ai-button small{display:block;margin-top:5px;font-weight:600;opacity:.72}
      .goals-calc-modal{position:fixed;inset:0;z-index:10020;display:grid;place-items:center;padding:18px;background:rgba(2,8,11,.78);backdrop-filter:blur(10px)}
      .goals-calc-modal.hidden{display:none!important}
      .goals-calc-card{width:min(620px,100%);max-height:min(90dvh,820px);overflow:auto;padding:22px;border-radius:26px;background:#0c171c;border:1px solid rgba(114,245,223,.18);box-shadow:0 24px 80px rgba(0,0,0,.48);color:#edf7f6}
      .goals-calc-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:16px}
      .goals-calc-head h2{margin:2px 0 4px;font-size:24px}.goals-calc-head p{margin:0;color:#9fb8bb;font-size:14px;line-height:1.45}
      .goals-calc-close{border:0;background:transparent;color:#c9dddd;font-size:28px;line-height:1;cursor:pointer;padding:2px 6px}
      .goals-calc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .goals-calc-grid label{display:grid;gap:7px;font-size:13px;font-weight:700;color:#cfe1e1}.goals-calc-grid label.full{grid-column:1/-1}
      .goals-calc-grid input,.goals-calc-grid select{width:100%;box-sizing:border-box;border-radius:14px;border:1px solid rgba(180,220,220,.18);background:#0a1317;color:#edf7f6;padding:13px 14px;font:inherit}
      .goals-calc-result{margin-top:18px;padding:16px;border-radius:18px;background:rgba(114,245,223,.07);border:1px solid rgba(114,245,223,.15)}
      .goals-calc-result.hidden{display:none!important}.goals-result-main{font-size:30px;font-weight:900}.goals-result-macros{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.goals-result-macros div{padding:10px;border-radius:12px;background:rgba(255,255,255,.04);text-align:center}.goals-result-macros strong{display:block;font-size:18px}.goals-result-meta{margin-top:12px;color:#9fb8bb;font-size:13px;line-height:1.45}
      .goals-calc-actions{display:flex;gap:10px;margin-top:16px}.goals-calc-actions button{flex:1;padding:14px 16px;border-radius:14px;font-weight:800;cursor:pointer}.goals-calc-run{border:0;color:#061316;background:linear-gradient(135deg,#72f5df,#22c9d6)}.goals-calc-use{border:1px solid rgba(114,245,223,.24);background:#122127;color:#edf7f6}.goals-calc-use.hidden{display:none!important}
      .goals-calc-error{margin-top:12px;color:#ff9a9a;font-size:13px}.goals-calc-error.hidden{display:none!important}
      @media(max-width:560px){.goals-calc-grid{grid-template-columns:1fr}.goals-calc-card{padding:18px}.goals-calc-actions{flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function createButton(id, label, small) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.type = 'button';
    btn.className = 'goals-ai-button';
    btn.innerHTML = `${label}<small>${small}</small>`;
    return btn;
  }

  function ensureButtons() {
    const newGrid = document.querySelector('#newUserDetails .form-grid');
    if (newGrid && !$('newUserGoalsCalcBtn')) {
      const btn = createButton('newUserGoalsCalcBtn','Wykonaj analizę i uzupełnij pola automatycznie','Wiek, wzrost, masa, aktywność i cel');
      btn.onclick = () => openModal('new');
      newGrid.insertAdjacentElement('afterend', btn);
    }

    const profileGrid = document.querySelector('#viewProfile .goals-grid');
    if (profileGrid && !$('profileGoalsCalcBtn')) {
      const btn = createButton('profileGoalsCalcBtn','Oblicz dzienne cele','Przelicz kalorie i makro na podstawie aktualnych danych');
      btn.onclick = () => openModal('profile');
      profileGrid.insertAdjacentElement('afterend', btn);
    }
  }

  function ensureModal() {
    if ($('goalsCalcModal')) return;
    const modal = document.createElement('div');
    modal.id = 'goalsCalcModal';
    modal.className = 'goals-calc-modal hidden';
    modal.innerHTML = `
      <div class="goals-calc-card" role="dialog" aria-modal="true" aria-labelledby="goalsCalcTitle">
        <div class="goals-calc-head">
          <div><div class="section-kicker">Kalkulator</div><h2 id="goalsCalcTitle">Oblicz dzienne cele</h2><p>Wynik jest szacunkiem dla zdrowej osoby dorosłej. Nie zastępuje porady medycznej.</p></div>
          <button class="goals-calc-close" id="goalsCalcClose" type="button" aria-label="Zamknij">×</button>
        </div>
        <div class="goals-calc-grid">
          <label>Płeć używana do obliczenia<select id="gcSex"><option value="">Wybierz</option><option value="female">Kobieta</option><option value="male">Mężczyzna</option></select></label>
          <label>Wiek<input id="gcAge" type="number" min="18" max="80" inputmode="numeric" placeholder="np. 35"></label>
          <label>Wzrost<input id="gcHeight" type="number" min="130" max="230" inputmode="numeric" placeholder="cm"></label>
          <label>Masa ciała<input id="gcWeight" type="number" min="35" max="300" step="0.1" inputmode="decimal" placeholder="kg"></label>
          <label class="full">Aktywność<select id="gcActivity"><option value="">Wybierz</option><option value="sedentary">Siedzący tryb życia — prawie bez treningów</option><option value="light">Lekka — ok. 1–3 treningi tygodniowo</option><option value="moderate">Umiarkowana — ok. 3–5 treningów tygodniowo</option><option value="high">Duża — ok. 6–7 treningów tygodniowo</option><option value="very_high">Bardzo duża — ciężkie treningi / praca fizyczna</option></select></label>
          <label class="full">Cel<select id="gcGoal"><option value="">Wybierz</option><option value="lose_fast">Szybko schudnąć</option><option value="lose_medium">Schudnąć umiarkowanie</option><option value="lose_slow">Schudnąć powoli</option><option value="maintain">Utrzymać wagę</option><option value="gain_slow">Powoli zwiększać masę</option><option value="gain_medium">Zwiększać masę umiarkowanie</option></select></label>
          <label class="full">Szczególna sytuacja<select id="gcSpecial"><option value="none">Brak</option><option value="pregnancy">Ciąża</option><option value="breastfeeding">Karmienie piersią</option><option value="medical">Zalecenia medyczne / istotna choroba</option></select></label>
        </div>
        <div id="goalsCalcError" class="goals-calc-error hidden"></div>
        <div id="goalsCalcResult" class="goals-calc-result hidden">
          <div class="goals-result-main"><span id="gcCalories">0</span> kcal / dzień</div>
          <div class="goals-result-macros"><div><span>Białko</span><strong id="gcProtein">0 g</strong></div><div><span>Węglowodany</span><strong id="gcCarbs">0 g</strong></div><div><span>Tłuszcz</span><strong id="gcFat">0 g</strong></div></div>
          <div id="gcMeta" class="goals-result-meta"></div>
        </div>
        <div class="goals-calc-actions"><button id="goalsCalcRun" class="goals-calc-run" type="button">Oblicz cele</button><button id="goalsCalcUse" class="goals-calc-use hidden" type="button">Użyj tych wartości</button></div>
      </div>`;
    document.body.appendChild(modal);
    $('goalsCalcClose').onclick = closeModal;
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    $('goalsCalcRun').onclick = calculate;
    $('goalsCalcUse').onclick = applyResult;
  }

  function openModal(mode) {
    targetMode = mode;
    $('goalsCalcError')?.classList.add('hidden');
    $('goalsCalcResult')?.classList.add('hidden');
    $('goalsCalcUse')?.classList.add('hidden');
    $('goalsCalcModal')?.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    $('goalsCalcModal')?.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  async function calculate() {
    const error = $('goalsCalcError');
    error.classList.add('hidden');
    $('goalsCalcRun').disabled = true;
    $('goalsCalcRun').textContent = 'Obliczam…';
    try {
      const response = await fetch(GOALS_API, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          sex: $('gcSex').value,
          age: $('gcAge').value,
          heightCm: $('gcHeight').value,
          weightKg: $('gcWeight').value,
          activity: $('gcActivity').value,
          goal: $('gcGoal').value,
          specialCondition: $('gcSpecial').value
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.message || data?.error || 'Nie udało się obliczyć celów.');
      window.__goalsCalcResult = data.result;
      $('gcCalories').textContent = data.result.calories;
      $('gcProtein').textContent = `${data.result.protein} g`;
      $('gcCarbs').textContent = `${data.result.carbs} g`;
      $('gcFat').textContent = `${data.result.fat} g`;
      $('gcMeta').textContent = `${data.result.activityLabel} · ${data.result.goalLabel} · BMR ok. ${data.result.bmr} kcal · TDEE ok. ${data.result.tdee} kcal`;
      $('goalsCalcResult').classList.remove('hidden');
      $('goalsCalcUse').classList.remove('hidden');
    } catch (e) {
      error.textContent = e.message || 'Nie udało się obliczyć celów.';
      error.classList.remove('hidden');
    } finally {
      $('goalsCalcRun').disabled = false;
      $('goalsCalcRun').textContent = 'Oblicz cele';
    }
  }

  function applyResult() {
    const r = window.__goalsCalcResult;
    if (!r) return;
    const ids = targetMode === 'profile'
      ? ['setCalories','setProtein','setCarbs','setFat']
      : ['newCalories','newProtein','newCarbs','newFat'];
    [r.calories,r.protein,r.carbs,r.fat].forEach((value, i) => { if ($(ids[i])) $(ids[i]).value = value; });
    closeModal();
    if (typeof window.toast === 'function') window.toast('Cele zostały uzupełnione. Sprawdź je i zapisz.');
  }

  function init() {
    injectStyles();
    ensureModal();
    ensureButtons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
