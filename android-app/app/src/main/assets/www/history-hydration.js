(() => {
  'use strict';

  let latestHistory = null;
  const byId = id => document.getElementById(id);

  function injectStyles() {
    if (byId('historyHydrationStyles')) return;
    const style = document.createElement('style');
    style.id = 'historyHydrationStyles';
    style.textContent = `
      .history-hydration{margin:14px 0 4px;padding:14px 15px;border:1px solid rgba(82,181,255,.18);border-radius:16px;background:rgba(28,116,166,.08)}
      .history-hydration-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .history-hydration-title{font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#7ecfff}
      .history-hydration-value{font-size:13px;font-weight:850;color:#dff5ff;white-space:nowrap}
      .history-hydration-bar{height:8px;margin:10px 0 8px;overflow:hidden;border-radius:999px;background:rgba(92,160,190,.12)}
      .history-hydration-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#247bd9,#38c7ff)}
      .history-hydration-meta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:11px;color:#86aaba}
      .history-hydration-missing{font-size:11px;color:#789aaa;margin-top:5px}
    `;
    document.head.appendChild(style);
  }

  function renderHistoryHydration(data) {
    injectStyles();
    const days = Array.isArray(data?.days) ? data.days : [];
    for (const day of days) {
      const article = document.querySelector(`[data-history-date="${CSS.escape(String(day.date || ''))}"]`);
      if (!article) continue;

      article.querySelector('.history-hydration')?.remove();

      const h = day.hydration || {};
      const consumed = Math.max(0, Math.round(Number(h.consumedMl || 0)));
      const target = Math.max(0, Math.round(Number(h.targetMl || 0)));
      const plain = Math.max(0, Math.round(Number(h.plainWaterMl || 0)));
      const meals = Math.max(0, Math.round(Number(h.mealFluidsMl || 0)));
      const percent = target > 0 ? Math.max(0, Math.round((consumed / target) * 100)) : 0;
      const visual = Math.min(100, percent);

      const box = document.createElement('div');
      box.className = 'history-hydration';
      box.innerHTML = `
        <div class="history-hydration-head">
          <span class="history-hydration-title">Nawodnienie</span>
          <span class="history-hydration-value">${consumed}${target > 0 ? ` / ${target}` : ''} ml${target > 0 ? ` · ${percent}%` : ''}</span>
        </div>
        ${target > 0 ? `<div class="history-hydration-bar"><div class="history-hydration-fill" style="width:${visual}%"></div></div>` : ''}
        <div class="history-hydration-meta">
          <span>Woda: ${plain} ml</span>
          <span>Płyny z posiłków: ${meals} ml</span>
        </div>
        ${target > 0 ? '' : '<div class="history-hydration-missing">Brak zapisanego historycznego celu nawodnienia dla tego dnia.</div>'}
      `;

      const mealsBox = article.querySelector('.history-meals');
      if (mealsBox) article.insertBefore(box, mealsBox);
      else article.appendChild(box);
    }
  }

  const baseApiForHistoryHydration = api;
  api = async function historyHydrationApi(action, payload = {}, file = null) {
    const response = await baseApiForHistoryHydration(action, payload, file);
    if (action === 'history' && response?.success) latestHistory = response;
    return response;
  };

  const baseLoadHistoryForHydration = loadHistory;
  loadHistory = async function hydrationAwareHistory() {
    const result = await baseLoadHistoryForHydration();
    if (latestHistory) renderHistoryHydration(latestHistory);
    return result;
  };

  injectStyles();
})();
