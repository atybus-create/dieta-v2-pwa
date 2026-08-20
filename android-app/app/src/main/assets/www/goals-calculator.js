(() => {
  const GOALS_API = 'https://n8n-pi.taild8d05f.ts.net/webhook/dieta-v2-goals-calc';
  let targetMode = 'new';
  let activeDropdown = null;

  const OPTIONS = {
    sex: [
      ['female', 'Kobieta'],
      ['male', 'Mężczyzna']
    ],
    steps: [
      ['under_5000', 'Poniżej 5 000 kroków dziennie'],
      ['from_5000_7499', '5 000–7 499 kroków dziennie'],
      ['from_7500_9999', '7 500–9 999 kroków dziennie'],
      ['from_10000_12499', '10 000–12 499 kroków dziennie'],
      ['from_12500', '12 500+ kroków dziennie']
    ],
    training: [
      ['none', 'Bez dodatkowych treningów'],
      ['light_1_2', '1–2 lekkie treningi tygodniowo'],
      ['intense_1_2', '1–2 intensywne treningi tygodniowo'],
      ['mixed_3_4', '3–4 treningi tygodniowo'],
      ['high_5_plus', '5+ treningów tygodniowo'],
      ['physical_work', 'Ciężka praca fizyczna']
    ],
    goal: [
      ['lose_fast', 'Szybko schudnąć'],
      ['lose_medium', 'Schudnąć umiarkowanie'],
      ['lose_slow', 'Schudnąć powoli'],
      ['maintain', 'Utrzymać wagę'],
      ['gain_slow', 'Powoli zwiększać masę'],
      ['gain_medium', 'Zwiększać masę umiarkowanie']
    ],
    special: [
      ['none', 'Brak'],
      ['pregnancy', 'Ciąża'],
      ['breastfeeding', 'Karmienie piersią'],
      ['medical', 'Zalecenia medyczne / istotna choroba']
    ]
  };

  function $(id) { return document.getElementById(id); }

  function injectStyles() {
    if ($('goalsCalcStyles')) return;
    const style = document.createElement('style');
    style.id = 'goalsCalcStyles';
    style.textContent = `
      .goals-ai-button{width:100%;margin:14px 0 6px;padding:16px 18px;border:0;border-radius:18px;font-weight:800;font-size:15px;line-height:1.25;color:#061316;background:linear-gradient(135deg,#72f5df,#22c9d6);box-shadow:0 14px 36px rgba(34,201,214,.18);cursor:pointer}
      .goals-ai-button small{display:block;margin-top:5px;font-weight:600;opacity:.72}
      .goals-calc-modal{position:fixed;inset:0;z-index:10020;display:grid;place-items:center;padding:18px;background:rgba(2,8,11,.82);backdrop-filter:blur(10px)}
      .goals-calc-modal.hidden{display:none!important}
      .goals-calc-card{width:min(620px,100%);max-height:min(90dvh,820px);overflow:auto;overflow-x:hidden;padding:22px;box-sizing:border-box;border-radius:26px;background:#0c171c;border:1px solid rgba(114,245,223,.18);box-shadow:0 24px 80px rgba(0,0,0,.48);color:#edf7f6}
      .goals-calc-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:16px}
      .goals-calc-head h2{margin:2px 0 4px;font-size:24px}.goals-calc-head p{margin:0;color:#9fb8bb;font-size:14px;line-height:1.45}
      .goals-calc-close{border:0;background:transparent;color:#c9dddd;font-size:28px;line-height:1;cursor:pointer;padding:2px 6px}
      .goals-calc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .goals-calc-grid label,.gc-field{display:grid;gap:7px;min-width:0;font-size:13px;font-weight:700;color:#cfe1e1}.goals-calc-grid .full{grid-column:1/-1}
      .goals-calc-grid input{width:100%;min-width:0;box-sizing:border-box;border-radius:14px;border:1px solid rgba(180,220,220,.18);background:#0a1317;color:#edf7f6;padding:13px 14px;font:inherit;outline:none}
      .goals-calc-grid input:focus{border-color:rgba(114,245,223,.55);box-shadow:0 0 0 3px rgba(114,245,223,.08)}
      .gc-dropdown{position:relative;min-width:0}
      .gc-dropdown-button{width:100%;min-height:48px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-sizing:border-box;border-radius:14px;border:1px solid rgba(180,220,220,.18);background:#0a1317;color:#edf7f6;padding:12px 14px;text-align:left;font:inherit;font-weight:650;cursor:pointer}
      .gc-dropdown-button .gc-value{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gc-dropdown-button .gc-arrow{flex:0 0 auto;color:#86a5a7;font-size:13px;transition:transform .18s ease}
      .gc-dropdown.open .gc-arrow{transform:rotate(180deg)}.gc-dropdown.open .gc-dropdown-button{border-color:rgba(114,245,223,.55);box-shadow:0 0 0 3px rgba(114,245,223,.08)}
      .gc-dropdown-menu{display:none;position:absolute;z-index:40;left:0;right:0;top:calc(100% + 7px);max-height:260px;overflow:auto;padding:6px;border-radius:16px;background:#101e23;border:1px solid rgba(114,245,223,.2);box-shadow:0 20px 45px rgba(0,0,0,.48)}
      .gc-dropdown.open .gc-dropdown-menu{display:grid;gap:3px}.gc-option{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;border:0;border-radius:11px;background:transparent;color:#eaf5f4;padding:11px 12px;text-align:left;font:inherit;font-weight:650;cursor:pointer}.gc-option:hover,.gc-option:focus{outline:none;background:rgba(114,245,223,.09)}.gc-option.selected{background:rgba(114,245,223,.13);color:#72f5df}.gc-check{opacity:0}.gc-option.selected .gc-check{opacity:1}
      .gc-help{color:#7f9a9c;font-size:12px;font-weight:500;line-height:1.4;margin-top:-1px}
      .goals-calc-result{margin-top:18px;max-width:100%;box-sizing:border-box;padding:16px;border-radius:18px;background:rgba(114,245,223,.07);border:1px solid rgba(114,245,223,.15);overflow:hidden}
      .goals-calc-result.hidden{display:none!important}.goals-result-main{font-size:clamp(24px,7vw,30px);font-weight:900;line-height:1.1;overflow-wrap:anywhere}
      .goals-result-macros{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:12px;max-width:100%}.goals-result-macros div{min-width:0;padding:10px 5px;border-radius:12px;background:rgba(255,255,255,.04);text-align:center;overflow:hidden}.goals-result-macros span{display:block;font-size:11px;color:#aac0c1;white-space:nowrap}.goals-result-macros strong{display:block;margin-top:4px;font-size:clamp(15px,4.3vw,18px);white-space:nowrap}
      .goals-result-meta{margin-top:12px;color:#9fb8bb;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
      .goals-calc-actions{display:flex;gap:10px;margin-top:16px}.goals-calc-actions button{min-width:0;flex:1;padding:14px 16px;border-radius:14px;font-weight:800;cursor:pointer}.goals-calc-run{border:0;color:#061316;background:linear-gradient(135deg,#72f5df,#22c9d6)}.goals-calc-use{border:1px solid rgba(114,245,223,.24);background:#122127;color:#edf7f6}.goals-calc-use.hidden{display:none!important}
      .goals-calc-error{margin-top:12px;color:#ff9a9a;font-size:13px}.goals-calc-error.hidden{display:none!important}
      @media(max-width:560px){.goals-calc-modal{padding:8px}.goals-calc-card{padding:17px;border-radius:22px;max-height:94dvh}.goals-calc-grid{grid-template-columns:1fr}.goals-calc-grid .full{grid-column:auto}.goals-calc-actions{flex-direction:column}.goals-result-macros{gap:5px}.goals-result-macros div{padding:9px 3px}}
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
      const btn = createButton('newUserGoalsCalcBtn','Wykonaj analizę i uzupełnij pola automatycznie','Wiek, wzrost, masa, kroki, trening i cel');
      btn.onclick = () => openModal('new');
      newGrid.insertAdjacentElement('afterend', btn);
    }

    const profileGrid = document.querySelector('#viewProfile .goals-grid');
    if (profileGrid && !$('profileGoalsCalcBtn')) {
      const btn = createButton('profileGoalsCalcBtn','Oblicz dzienne cele','Przelicz kalorie i makro na podstawie ruchu, treningu i celu');
      btn.onclick = () => openModal('profile');
      profileGrid.insertAdjacentElement('afterend', btn);
    }
  }

  function dropdownMarkup(id, label, placeholder, full = false, help = '') {
    return `<div class="gc-field ${full ? 'full' : ''}"><span>${label}</span><div class="gc-dropdown" id="${id}Wrap"><input id="${id}" type="hidden" value=""><button id="${id}Button" class="gc-dropdown-button" type="button" aria-haspopup="listbox" aria-expanded="false"><span class="gc-value">${placeholder}</span><span class="gc-arrow">⌄</span></button><div id="${id}Menu" class="gc-dropdown-menu" role="listbox"></div></div>${help ? `<small class="gc-help">${help}</small>` : ''}</div>`;
  }

  function setupDropdown(id, options, placeholder, defaultValue = '') {
    const wrap = $(`${id}Wrap`);
    const button = $(`${id}Button`);
    const menu = $(`${id}Menu`);
    const input = $(id);
    if (!wrap || !button || !menu || !input) return;

    menu.innerHTML = options.map(([value, label]) => `<button type="button" class="gc-option" role="option" data-value="${value}" aria-selected="false"><span>${label}</span><span class="gc-check">✓</span></button>`).join('');

    const setValue = value => {
      const match = options.find(x => x[0] === value);
      input.value = value || '';
      button.querySelector('.gc-value').textContent = match ? match[1] : placeholder;
      menu.querySelectorAll('.gc-option').forEach(option => {
        const selected = option.dataset.value === value;
        option.classList.toggle('selected', selected);
        option.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
    };

    const close = () => {
      wrap.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
      if (activeDropdown === wrap) activeDropdown = null;
    };

    button.onclick = event => {
      event.stopPropagation();
      if (activeDropdown && activeDropdown !== wrap) {
        activeDropdown.classList.remove('open');
        activeDropdown.querySelector('.gc-dropdown-button')?.setAttribute('aria-expanded', 'false');
      }
      const willOpen = !wrap.classList.contains('open');
      wrap.classList.toggle('open', willOpen);
      button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      activeDropdown = willOpen ? wrap : null;
    };

    menu.querySelectorAll('.gc-option').forEach(option => {
      option.onclick = event => {
        event.stopPropagation();
        setValue(option.dataset.value);
        close();
        button.focus();
      };
    });

    button.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });

    setValue(defaultValue);
    wrap._setValue = setValue;
  }

  function ensureModal() {
    if ($('goalsCalcModal')) return;
    const modal = document.createElement('div');
    modal.id = 'goalsCalcModal';
    modal.className = 'goals-calc-modal hidden';
    modal.innerHTML = `
      <div class="goals-calc-card" role="dialog" aria-modal="true" aria-labelledby="goalsCalcTitle">
        <div class="goals-calc-head">
          <div><div class="section-kicker">Kalkulator</div><h2 id="goalsCalcTitle">Oblicz dzienne cele</h2><p>Podaj codzienny ruch i trening osobno. Dzięki temu np. 8 000 kroków bez treningów nie jest traktowane jak całkowicie siedzący tryb życia.</p></div>
          <button class="goals-calc-close" id="goalsCalcClose" type="button" aria-label="Zamknij">×</button>
        </div>
        <div class="goals-calc-grid">
          ${dropdownMarkup('gcSex','Płeć używana do obliczenia','Wybierz')}
          <label>Wiek<input id="gcAge" type="number" min="18" max="80" inputmode="numeric" placeholder="np. 35"></label>
          <label>Wzrost<input id="gcHeight" type="number" min="130" max="230" inputmode="numeric" placeholder="cm"></label>
          <label>Masa ciała<input id="gcWeight" type="number" min="35" max="300" step="0.1" inputmode="decimal" placeholder="kg"></label>
          ${dropdownMarkup('gcSteps','Średnia liczba kroków dziennie','Wybierz przedział',true,'Wybierz typowy zakres z ostatnich tygodni, nie rekord z pojedynczego dnia.')}
          ${dropdownMarkup('gcTraining','Dodatkowy trening / aktywność','Wybierz',true,'Trening jest doliczany niezależnie od codziennych kroków.')}
          ${dropdownMarkup('gcGoal','Cel','Wybierz',true)}
          ${dropdownMarkup('gcSpecial','Szczególna sytuacja','Wybierz',true)}
        </div>
        <div id="goalsCalcError" class="goals-calc-error hidden"></div>
        <div id="goalsCalcResult" class="goals-calc-result hidden">
          <div class="goals-result-main"><span id="gcCalories">0</span> kcal / dzień</div>
          <div class="goals-result-macros"><div><span>Białko</span><strong id="gcProtein">0 g</strong></div><div><span>Węgle</span><strong id="gcCarbs">0 g</strong></div><div><span>Tłuszcz</span><strong id="gcFat">0 g</strong></div></div>
          <div id="gcMeta" class="goals-result-meta"></div>
        </div>
        <div class="goals-calc-actions"><button id="goalsCalcRun" class="goals-calc-run" type="button">Oblicz cele</button><button id="goalsCalcUse" class="goals-calc-use hidden" type="button">Użyj tych wartości</button></div>
      </div>`;
    document.body.appendChild(modal);

    setupDropdown('gcSex', OPTIONS.sex, 'Wybierz');
    setupDropdown('gcSteps', OPTIONS.steps, 'Wybierz przedział');
    setupDropdown('gcTraining', OPTIONS.training, 'Wybierz', 'none');
    setupDropdown('gcGoal', OPTIONS.goal, 'Wybierz');
    setupDropdown('gcSpecial', OPTIONS.special, 'Wybierz', 'none');

    $('goalsCalcClose').onclick = closeModal;
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    $('goalsCalcRun').onclick = calculate;
    $('goalsCalcUse').onclick = applyResult;
    document.addEventListener('click', () => {
      if (activeDropdown) {
        activeDropdown.classList.remove('open');
        activeDropdown.querySelector('.gc-dropdown-button')?.setAttribute('aria-expanded', 'false');
        activeDropdown = null;
      }
    });
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
          steps: $('gcSteps').value,
          training: $('gcTraining').value,
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
      $('gcMeta').textContent = `${data.result.stepsLabel} · ${data.result.trainingLabel} · ${data.result.goalLabel} · współczynnik aktywności ${Number(data.result.activityFactor).toFixed(2)} · BMR ok. ${data.result.bmr} kcal · TDEE ok. ${data.result.tdee} kcal`;
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
