const API='https://n8n-pi.taild8d05f.ts.net/webhook/dieta-v2';
const AUTH='https://n8n-pi.taild8d05f.ts.net/webhook/dieta-v2-auth';
const TOKEN_KEY='fotoDietaAccessTokenV2';
const PROFILE_KEY='fotoDietaProfileV2';
const state={token:localStorage.getItem(TOKEN_KEY)||'',profile:null,analysis:null,deferredPrompt:null};
try{state.profile=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch(e){}
const $=id=>document.getElementById(id);
const show=id=>$(id)?.classList.remove('hidden');
const hide=id=>$(id)?.classList.add('hidden');
const toast=msg=>{const el=$('toast');el.textContent=msg;show('toast');clearTimeout(toast.t);toast.t=setTimeout(()=>hide('toast'),2400)};
const loading=(on,text='Przetwarzam…')=>{if(on){$('loadingText').textContent=text;show('loading')}else hide('loading')};
const escapeHtml=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function post(url,payload={},file=null){
  let options={method:'POST'};
  if(file){const f=new FormData();Object.entries(payload).forEach(([k,v])=>f.append(k,v));f.append('data',file,file.name||'meal.jpg');options.body=f;}
  else{options.headers={'Content-Type':'application/json'};options.body=JSON.stringify(payload)}
  const r=await fetch(url,options);let data;try{data=await r.json()}catch(e){throw new Error('Nieprawidłowa odpowiedź serwera.')}if(!r.ok||data?.success===false)throw new Error(data?.message||data?.error||'Błąd serwera.');return data;
}
async function api(action,payload={},file=null){if(!state.token)throw new Error('Brak przypisania instalacji.');return post(API,{action,accessToken:state.token,...payload},file)}
function rememberSession(accessToken,userId,displayName){state.token=accessToken;state.profile={userId,displayName};localStorage.setItem(TOKEN_KEY,state.token);localStorage.setItem(PROFILE_KEY,JSON.stringify(state.profile));}

async function loadProfiles(){
  try{const d=await post(API,{action:'users_list'});const sel=$('profileSelect');sel.innerHTML='';(d.users||[]).forEach(u=>{const o=document.createElement('option');o.value=u.userId;o.textContent=u.displayName;sel.appendChild(o)});if(!(d.users||[]).length){const o=document.createElement('option');o.textContent='Brak użytkowników';o.disabled=true;sel.appendChild(o)}}catch(e){$('authError').textContent=e.message;show('authError')}
}

async function claimProfile(){
  hide('authError');const userId=$('profileSelect').value;const accessPin=$('profilePin').value.trim();if(!userId||!accessPin){$('authError').textContent='Wybierz użytkownika i wpisz PIN.';show('authError');return}
  loading(true,'Przypisuję instalację…');try{const d=await post(AUTH,{userId,accessPin});rememberSession(d.accessToken,d.userId,$('profileSelect').selectedOptions[0]?.textContent||d.userId);await enterApp()}catch(e){$('authError').textContent=e.message;show('authError')}finally{loading(false)}
}

async function createUser(){
  hide('authError');const displayName=$('newName').value.trim(),accessPin=$('newPin').value.trim();if(displayName.length<2){$('authError').textContent='Podaj imię lub nazwę użytkownika.';show('authError');return}if(!/^\d{4,8}$/.test(accessPin)){$('authError').textContent='PIN musi mieć 4–8 cyfr.';show('authError');return}
  const payload={action:'user_create',displayName,accessPin,dailyCalorieTarget:$('newCalories').value,dailyProteinTarget:$('newProtein').value,dailyCarbsTarget:$('newCarbs').value,dailyFatTarget:$('newFat').value};
  loading(true,'Tworzę profil…');try{const created=await post(API,payload);const userId=created.user?.userId;if(!userId)throw new Error('Nie udało się utworzyć profilu.');const auth=await post(AUTH,{userId,accessPin});rememberSession(auth.accessToken,userId,created.user?.displayName||displayName);await enterApp()}catch(e){$('authError').textContent=e.message;show('authError')}finally{loading(false)}
}

function nav(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));const map={today:'viewToday',add:'viewAdd',favorites:'viewFavorites',history:'viewHistory',profile:'viewProfile'};$(map[name])?.classList.add('active');if(name==='today')loadDashboard();if(name==='favorites')loadFavorites();if(name==='history')loadHistory();if(name==='profile')loadSettings();window.scrollTo({top:0,behavior:'smooth'});}

function nutrition(m){return `<div class="nutrition"><span>${Math.round(m.calories||0)} kcal</span><span>B ${Math.round(m.protein||0)} g</span><span>W ${Math.round(m.carbs||0)} g</span><span>T ${Math.round(m.fat||0)} g</span></div>`}
async function loadDashboard(){
  try{const d=await api('dashboard');$('welcome').textContent=`Dzisiaj · ${state.profile?.displayName||''}`;$('profileName').textContent=state.profile?.displayName||d.userId;$('todayDate').textContent=d.date||'';$('mealCount').textContent=`${d.count||0} posiłków`;$('kcalConsumed').textContent=Math.round(d.consumed?.calories||0);$('kcalTarget').textContent=Math.round(d.targets?.calories||0);const pct=Math.min(100,(Number(d.consumed?.calories||0)/Math.max(1,Number(d.targets?.calories||0)))*100);$('kcalBar').style.width=`${pct}%`;$('proteinConsumed').textContent=Math.round(d.consumed?.protein||0);$('carbsConsumed').textContent=Math.round(d.consumed?.carbs||0);$('fatConsumed').textContent=Math.round(d.consumed?.fat||0);$('proteinTarget').textContent=`cel ${Math.round(d.targets?.protein||0)} g`;$('carbsTarget').textContent=`cel ${Math.round(d.targets?.carbs||0)} g`;$('fatTarget').textContent=`cel ${Math.round(d.targets?.fat||0)} g`;const box=$('todayMeals');box.innerHTML='';if(!(d.meals||[]).length){box.innerHTML='<div class="empty">Brak zapisanych posiłków.</div>';return}(d.meals||[]).forEach(m=>{const a=document.createElement('article');a.innerHTML=`<div class="meal-head"><div><h3>${escapeHtml(m.description)}</h3><div class="meta">Posiłek ${m.mealNo}</div></div><button class="danger-link" data-del="${escapeHtml(m.mealId)}">Usuń</button></div>${nutrition(m)}`;box.appendChild(a)});box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>deleteMeal(b.dataset.del));}catch(e){toast(e.message)}
}
async function deleteMeal(mealId){if(!confirm('Usunąć ten posiłek?'))return;loading(true,'Usuwam…');try{await api('meal_delete',{mealId});toast('Posiłek usunięty');await loadDashboard()}catch(e){toast(e.message)}finally{loading(false)}}

function renderAnalysis(a){state.analysis=a;$('analysisDescription').value=a.description||'';$('analysisCalories').value=Math.round(a.calories||0);$('analysisConfidence').textContent=a.confidence||'';$('analysisItems').innerHTML=(a.items||[]).map(x=>`<div class="analysis-item"><span>${escapeHtml(x.namePl)} · ${Math.round(x.grams||0)} g</span><strong>${Math.round(x.calories||0)} kcal</strong></div>`).join('');show('analysisPanel');}
async function analyzeText(){const text=$('mealText').value.trim();if(!text)return toast('Wpisz opis posiłku.');loading(true,'Analizuję opis…');try{const d=await api('analyze_text',{text});renderAnalysis(d.analysis)}catch(e){toast(e.message)}finally{loading(false)}}
async function analyzePhoto(file){if(!file)return;loading(true,'Analizuję zdjęcie…');try{const d=await api('analyze_photo',{},file);renderAnalysis(d.analysis)}catch(e){toast(e.message)}finally{loading(false);$('photoInput').value=''}}
async function saveMeal(){if(!state.analysis)return;loading(true,'Zapisuję posiłek…');try{await api('meal_save',{analysisJson:JSON.stringify(state.analysis),description:$('analysisDescription').value.trim(),calories:$('analysisCalories').value});state.analysis=null;hide('analysisPanel');$('mealText').value='';toast('Posiłek zapisany');nav('today')}catch(e){toast(e.message)}finally{loading(false)}}
async function saveFavorite(){if(!state.analysis)return;loading(true,'Dodaję do ulubionych…');try{await api('favorite_add',{analysisJson:JSON.stringify(state.analysis),description:$('analysisDescription').value.trim(),calories:$('analysisCalories').value});toast('Dodano do ulubionych')}catch(e){toast(e.message)}finally{loading(false)}}

async function loadFavorites(){
  try{const d=await api('favorites_list');const box=$('favoritesList');box.innerHTML='';if(!(d.favorites||[]).length){box.innerHTML='<div class="empty">Brak ulubionych posiłków.</div>';return}(d.favorites||[]).forEach(f=>{const a=document.createElement('article');a.innerHTML=`<div class="fav-head"><div><h3>${escapeHtml(f.description)}</h3><div class="meta">${escapeHtml(f.addedAt||'')}</div></div><button class="danger-link" data-fdel="${escapeHtml(f.favoriteId)}">Usuń</button></div>${nutrition(f)}<button class="small top-gap" data-use="${escapeHtml(f.favoriteId)}">Dodaj jako posiłek</button>`;a.dataset.favorite=JSON.stringify(f);box.appendChild(a)});box.querySelectorAll('[data-fdel]').forEach(b=>b.onclick=()=>deleteFavorite(b.dataset.fdel));box.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{const f=JSON.parse(b.closest('article').dataset.favorite);state.analysis={description:f.description,items:f.items,calories:f.calories,protein:f.protein,carbs:f.carbs,fat:f.fat,source:`Ulubione · ${f.source||'Dieta V2'}`,confidence:f.confidence||'high'};renderAnalysis(state.analysis);nav('add')});}catch(e){toast(e.message)}
}
async function deleteFavorite(favoriteId){if(!confirm('Usunąć z ulubionych?'))return;try{await api('favorite_delete',{favoriteId});toast('Usunięto');loadFavorites()}catch(e){toast(e.message)}}

async function loadHistory(){
  try{const d=await api('history');const box=$('historyList');box.innerHTML='';if(!(d.days||[]).length){box.innerHTML='<div class="empty">Brak historii.</div>';return}(d.days||[]).forEach(day=>{const a=document.createElement('article');const meals=(day.meals||[]).map(m=>`<div><span>${m.mealNo}. ${escapeHtml(m.description)}</span><strong>${Math.round(m.calories||0)} kcal</strong></div>`).join('');a.innerHTML=`<div class="history-head"><div><h3>${escapeHtml(day.date)}</h3><div class="meta">${Math.round(day.totals?.calories||0)} / ${Math.round(day.targets?.calories||0)} kcal</div></div><button class="danger-link" data-ddel="${escapeHtml(day.date)}">Usuń dzień</button></div>${nutrition(day.totals||{})}<div class="history-meals">${meals}</div>`;box.appendChild(a)});box.querySelectorAll('[data-ddel]').forEach(b=>b.onclick=()=>deleteDay(b.dataset.ddel));}catch(e){toast(e.message)}
}
async function deleteDay(date){if(!confirm(`Usunąć cały dzień ${date}?`))return;loading(true,'Usuwam dzień…');try{await api('day_delete',{date});toast('Dzień usunięty');loadHistory()}catch(e){toast(e.message)}finally{loading(false)}}

async function loadSettings(){try{const d=await api('settings_get');$('setCalories').value=d.settings.dailyCalorieTarget;$('setProtein').value=d.settings.dailyProteinTarget;$('setCarbs').value=d.settings.dailyCarbsTarget;$('setFat').value=d.settings.dailyFatTarget;$('profileName').textContent=state.profile?.displayName||'Profil'}catch(e){toast(e.message)}}
async function saveSettings(){loading(true,'Zapisuję limity…');try{await api('settings_update',{dailyCalorieTarget:$('setCalories').value,dailyProteinTarget:$('setProtein').value,dailyCarbsTarget:$('setCarbs').value,dailyFatTarget:$('setFat').value});toast('Limity zapisane');await loadSettings()}catch(e){toast(e.message)}finally{loading(false)}}

async function enterApp(){hide('authScreen');show('app');$('profileName').textContent=state.profile?.displayName||'Profil';await loadDashboard();}
async function init(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.nav)));
  $('claimProfileBtn').onclick=claimProfile;$('createUserBtn').onclick=createUser;$('showTextBtn').onclick=()=>show('textPanel');$('analyzeTextBtn').onclick=analyzeText;$('photoInput').onchange=e=>analyzePhoto(e.target.files?.[0]);$('saveMealBtn').onclick=saveMeal;$('saveFavoriteBtn').onclick=saveFavorite;$('saveSettingsBtn').onclick=saveSettings;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredPrompt=e;show('installBtn')});$('installBtn').onclick=async()=>{if(!state.deferredPrompt)return;state.deferredPrompt.prompt();await state.deferredPrompt.userChoice;state.deferredPrompt=null;hide('installBtn')};
  const online=()=>{navigator.onLine?hide('offline'):show('offline')};window.addEventListener('online',online);window.addEventListener('offline',online);online();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  if(state.token){try{await api('settings_get');await enterApp();return}catch(e){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(PROFILE_KEY);state.token='';state.profile=null;toast('Sesja wygasła. Przypisz instalację ponownie.')}}
  show('authScreen');await loadProfiles();
}
document.addEventListener('DOMContentLoaded',init);
