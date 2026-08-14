const API =
  'https://n8n-pi.taild8d05f.ts.net/webhook/dieta-v2';

const AUTH =
  'https://n8n-pi.taild8d05f.ts.net/webhook/dieta-v2-auth';


const TOKEN_KEY =
  'fotoDietaAccessTokenV2';

const PROFILE_KEY =
  'fotoDietaProfileV2';


const state = {
  token:
    localStorage.getItem(TOKEN_KEY) || '',

  profile:
    null,

  analysis:
    null,

  deferredPrompt:
    null,

  profiles:
    []
};


try {
  state.profile =
    JSON.parse(
      localStorage.getItem(PROFILE_KEY) || 'null'
    );
} catch (e) {
  state.profile = null;
}


const $ =
  id =>
    document.getElementById(id);


const show =
  id =>
    $(id)?.classList.remove('hidden');


const hide =
  id =>
    $(id)?.classList.add('hidden');


const escapeHtml = s =>
  String(s ?? '')
    .replace(
      /[&<>'"]/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[c])
    );


const initials = name =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      x =>
        x[0]?.toUpperCase() || ''
    )
    .join('') || '?';


const clamp = (
  value,
  min,
  max
) =>
  Math.min(
    Math.max(value, min),
    max
  );


function actualPercent(
  value,
  target
) {

  const v =
    Number(value || 0);

  const t =
    Number(target || 0);

  if (!Number.isFinite(v)) {
    return 0;
  }

  if (!Number.isFinite(t) || t <= 0) {
    return 0;
  }

  return Math.max(
    0,
    (v / t) * 100
  );
}


/*
  0%     -> teal
  około 50% -> zielony
  około 75% -> żółty
  około 90% -> pomarańczowy
  około 100% -> pomarańczowo-czerwony
  110%+ -> czerwony
*/
function progressColor(percent) {

  const p =
    clamp(
      Number(percent || 0),
      0,
      110
    );

  const hue =
    Math.round(
      174 -
      (
        p / 110
      ) * 174
    );

  return (
    `hsl(${hue} 82% 58%)`
  );
}


function setProgressVisual({
  ringId,
  barId,
  percentId,
  value,
  target
}) {

  const percent =
    actualPercent(
      value,
      target
    );

  const visualPercent =
    clamp(
      percent,
      0,
      100
    );

  const color =
    progressColor(percent);


  const percentElement =
    $(percentId);

  if (percentElement) {
    percentElement.textContent =
      `${Math.round(percent)}%`;
  }


  const ring =
    $(ringId);

  if (ring) {
    ring.style.setProperty(
      '--p',
      visualPercent
    );

    ring.style.setProperty(
      '--ring-color',
      color
    );
  }


  const bar =
    $(barId);

  if (bar) {
    bar.style.width =
      `${visualPercent}%`;

    bar.style.background =
      color;
  }


  return percent;
}


function formatDate(raw) {

  const d =
    raw
      ? new Date(
          `${raw}T12:00:00`
        )
      : new Date();


  return new Intl.DateTimeFormat(
    'pl-PL',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }
  ).format(d);
}


function mealCountText(value) {

  const n =
    Number(value || 0);


  if (n === 1) {
    return '1 posiłek';
  }


  if (
    n >= 2 &&
    n <= 4
  ) {
    return `${n} posiłki`;
  }


  return `${n} posiłków`;
}


const toast = msg => {

  const el =
    $('toast');

  if (!el) {
    return;
  }


  el.textContent =
    msg;

  show('toast');


  clearTimeout(
    toast.t
  );


  toast.t =
    setTimeout(
      () =>
        hide('toast'),
      2800
    );
};


const loading = (
  on,
  text = 'Przetwarzam…',
  sub = 'To może potrwać kilka sekund.'
) => {

  if (on) {

    if ($('loadingText')) {
      $('loadingText').textContent =
        text;
    }


    if ($('loadingSubtext')) {
      $('loadingSubtext').textContent =
        sub;
    }


    show('loading');

  } else {

    hide('loading');

  }
};


const hideSplash = () =>
  hide('startSplash');


/* =====================================================
   HTTP
===================================================== */

async function post(
  url,
  payload = {},
  file = null
) {

  const options = {
    method: 'POST'
  };


  if (file) {

    const form =
      new FormData();


    Object.entries(payload)
      .forEach(
        ([key, value]) =>
          form.append(
            key,
            value
          )
      );


    form.append(
      'data',
      file,
      file.name || 'meal.jpg'
    );


    options.body =
      form;

  } else {

    options.headers = {
      'Content-Type':
        'application/json'
    };


    options.body =
      JSON.stringify(payload);

  }


  const response =
    await fetch(
      url,
      options
    );


  let data;


  try {

    data =
      await response.json();

  } catch (e) {

    throw new Error(
      'Nieprawidłowa odpowiedź serwera.'
    );

  }


  if (
    !response.ok ||
    data?.success === false
  ) {

    throw new Error(
      data?.message ||
      data?.error ||
      'Błąd serwera.'
    );

  }


  return data;
}


async function api(
  action,
  payload = {},
  file = null
) {

  if (!state.token) {

    throw new Error(
      'Brak przypisania instalacji.'
    );

  }


  return post(
    API,
    {
      action,
      accessToken:
        state.token,
      ...payload
    },
    file
  );
}


/* =====================================================
   SESSION
===================================================== */

function rememberSession(
  accessToken,
  userId,
  displayName
) {

  state.token =
    accessToken;


  state.profile = {
    userId,
    displayName
  };


  localStorage.setItem(
    TOKEN_KEY,
    state.token
  );


  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify(
      state.profile
    )
  );
}


/* =====================================================
   AUTH / USERS
===================================================== */

function renderProfileChoices(
  users = []
) {

  state.profiles =
    users;


  const select =
    $('profileSelect');

  const box =
    $('profileCards');


  if (
    !select ||
    !box
  ) {
    return;
  }


  select.innerHTML = '';
  box.innerHTML = '';


  if (!users.length) {

    box.innerHTML =
      '<div class="empty">Nie znaleziono aktywnych profili.</div>';

    return;
  }


  users.forEach(
    (
      user,
      index
    ) => {

      const option =
        document.createElement(
          'option'
        );


      option.value =
        user.userId;

      option.textContent =
        user.displayName;


      select.appendChild(
        option
      );


      const button =
        document.createElement(
          'button'
        );


      button.type =
        'button';


      button.className =
        'profile-choice' +
        (
          index === 0
            ? ' active'
            : ''
        );


      button.dataset.userId =
        user.userId;


      button.setAttribute(
        'role',
        'radio'
      );


      button.setAttribute(
        'aria-checked',
        index === 0
          ? 'true'
          : 'false'
      );


      button.innerHTML =
        `
        <span class="profile-choice-avatar">
          ${escapeHtml(initials(user.displayName))}
        </span>

        <span class="profile-choice-copy">
          <strong>
            ${escapeHtml(user.displayName)}
          </strong>

          <small>
            Profil istniejący
          </small>
        </span>

        <span class="choice-check">
          <svg viewBox="0 0 24 24">
            <path d="m6 12 4 4 8-9"/>
          </svg>
        </span>
        `;


      button.onclick =
        () =>
          selectProfile(
            user.userId
          );


      box.appendChild(
        button
      );

    }
  );


  select.selectedIndex =
    0;
}


function selectProfile(
  userId
) {

  const select =
    $('profileSelect');


  if (select) {
    select.value =
      userId;
  }


  document
    .querySelectorAll(
      '.profile-choice'
    )
    .forEach(
      button => {

        const active =
          button.dataset.userId ===
          userId;


        button.classList.toggle(
          'active',
          active
        );


        button.setAttribute(
          'aria-checked',
          active
            ? 'true'
            : 'false'
        );

      }
    );
}


async function loadProfiles() {

  hide('authError');


  try {

    const data =
      await post(
        API,
        {
          action:
            'users_list'
        }
      );


    renderProfileChoices(
      data.users || []
    );

  } catch (e) {

    if ($('authError')) {

      $('authError').textContent =
        e.message;

    }


    show('authError');

  }
}


async function claimProfile() {

  hide('authError');


  const userId =
    $('profileSelect')?.value || '';


  const accessPin =
    $('profilePin')?.value
      .trim() || '';


  if (
    !userId ||
    !accessPin
  ) {

    $('authError').textContent =
      'Wybierz użytkownika i wpisz PIN.';

    show('authError');

    return;

  }


  loading(
    true,
    'Przypisuję profil…',
    'Weryfikuję PIN i zabezpieczam tę instalację.'
  );


  try {

    const data =
      await post(
        AUTH,
        {
          userId,
          accessPin
        }
      );


    rememberSession(
      data.accessToken,
      data.userId,
      $('profileSelect')
        ?.selectedOptions?.[0]
        ?.textContent ||
      data.userId
    );


    await enterApp();

  } catch (e) {

    $('authError').textContent =
      e.message;

    show('authError');

  } finally {

    loading(false);

  }
}


async function createUser() {

  hide('authError');


  const displayName =
    $('newName')?.value
      .trim() || '';


  const accessPin =
    $('newPin')?.value
      .trim() || '';


  if (
    displayName.length < 2
  ) {

    $('authError').textContent =
      'Podaj imię lub nazwę użytkownika.';

    show('authError');

    return;

  }


  if (
    !/^\d{4,8}$/.test(
      accessPin
    )
  ) {

    $('authError').textContent =
      'PIN musi mieć 4–8 cyfr.';

    show('authError');

    return;

  }


  const payload = {
    action:
      'user_create',

    displayName,
    accessPin,

    dailyCalorieTarget:
      $('newCalories').value,

    dailyProteinTarget:
      $('newProtein').value,

    dailyCarbsTarget:
      $('newCarbs').value,

    dailyFatTarget:
      $('newFat').value
  };


  loading(
    true,
    'Tworzę profil…',
    'Zapisuję profil, cele dzienne i przypisuję urządzenie.'
  );


  try {

    const created =
      await post(
        API,
        payload
      );


    const userId =
      created.user?.userId;


    if (!userId) {

      throw new Error(
        'Nie udało się utworzyć profilu.'
      );

    }


    const auth =
      await post(
        AUTH,
        {
          userId,
          accessPin
        }
      );


    rememberSession(
      auth.accessToken,
      userId,
      created.user?.displayName ||
      displayName
    );


    await enterApp();

  } catch (e) {

    $('authError').textContent =
      e.message;

    show('authError');

  } finally {

    loading(false);

  }
}


/* =====================================================
   NAV
===================================================== */

function nav(
  name
) {

  document
    .querySelectorAll(
      '.view'
    )
    .forEach(
      view =>
        view.classList.remove(
          'active'
        )
    );


  document
    .querySelectorAll(
      '.bottom-nav button'
    )
    .forEach(
      button =>
        button.classList.toggle(
          'active',
          button.dataset.nav ===
            name
        )
    );


  const map = {
    today:
      'viewToday',

    add:
      'viewAdd',

    favorites:
      'viewFavorites',

    history:
      'viewHistory',

    profile:
      'viewProfile'
  };


  $(map[name])
    ?.classList.add(
      'active'
    );


  if (
    name === 'today'
  ) {
    loadDashboard();
  }


  if (
    name === 'favorites'
  ) {
    loadFavorites();
  }


  if (
    name === 'history'
  ) {
    loadHistory();
  }


  if (
    name === 'profile'
  ) {
    loadSettings();
  }


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* =====================================================
   NUTRITION CHIP
===================================================== */

function nutrition(
  meal
) {

  return `
    <div class="nutrition">

      <span>
        ${Math.round(meal.calories || 0)} kcal
      </span>

      <span>
        B ${Math.round(meal.protein || 0)} g
      </span>

      <span>
        W ${Math.round(meal.carbs || 0)} g
      </span>

      <span>
        T ${Math.round(meal.fat || 0)} g
      </span>

    </div>
  `;
}


/* =====================================================
   DASHBOARD
===================================================== */

async function loadDashboard() {

  try {

    const data =
      await api(
        'dashboard'
      );


    const name =
      state.profile?.displayName ||
      '';


    $('welcome').textContent =
      `Dzień dobry${name ? `, ${name}` : ''}`;


    $('profileName').textContent =
      name ||
      data.userId;


    $('profileAvatar').textContent =
      initials(
        name ||
        data.userId
      );


    $('todayDate').textContent =
      data.date ||
      '';


    $('headerDate').textContent =
      formatDate(
        data.date
      );


    $('mealCount').textContent =
      mealCountText(
        data.count
      );


    const consumed =
      data.consumed || {};


    const targets =
      data.targets || {};


    const remaining =
      data.remaining || {};


    /* kalorie */

    $('kcalConsumed').textContent =
      Math.round(
        consumed.calories || 0
      );


    $('kcalTarget').textContent =
      Math.round(
        targets.calories || 0
      );


    const kcalRemaining =
      Math.max(
        0,
        Math.round(
          remaining.calories ??
          (
            Number(
              targets.calories || 0
            ) -
            Number(
              consumed.calories || 0
            )
          )
        )
      );


    $('kcalRemaining').textContent =
      `${kcalRemaining} kcal`;


    setProgressVisual({
      ringId:
        'kcalRing',

      barId:
        'kcalBar',

      percentId:
        'kcalPercent',

      value:
        consumed.calories,

      target:
        targets.calories
    });


    /* białko */

    $('proteinConsumed').textContent =
      Math.round(
        consumed.protein || 0
      );


    $('proteinTarget').textContent =
      `cel ${Math.round(targets.protein || 0)} g`;


    setProgressVisual({
      ringId:
        'proteinRing',

      barId:
        'proteinBar',

      percentId:
        'proteinPercent',

      value:
        consumed.protein,

      target:
        targets.protein
    });


    /* carbs */

    $('carbsConsumed').textContent =
      Math.round(
        consumed.carbs || 0
      );


    $('carbsTarget').textContent =
      `cel ${Math.round(targets.carbs || 0)} g`;


    setProgressVisual({
      ringId:
        'carbsRing',

      barId:
        'carbsBar',

      percentId:
        'carbsPercent',

      value:
        consumed.carbs,

      target:
        targets.carbs
    });


    /* fat */

    $('fatConsumed').textContent =
      Math.round(
        consumed.fat || 0
      );


    $('fatTarget').textContent =
      `cel ${Math.round(targets.fat || 0)} g`;


    setProgressVisual({
      ringId:
        'fatRing',

      barId:
        'fatBar',

      percentId:
        'fatPercent',

      value:
        consumed.fat,

      target:
        targets.fat
    });


    /* meals */

    const box =
      $('todayMeals');


    box.innerHTML =
      '';


    if (
      !(data.meals || []).length
    ) {

      box.innerHTML =
        `
        <div class="empty">
          Nie masz jeszcze zapisanych posiłków na dziś.
          <br>
          Dodaj pierwszy posiłek, gdy będziesz gotowy.
        </div>
        `;

      return;
    }


    (
      data.meals || []
    ).forEach(
      meal => {

        const article =
          document.createElement(
            'article'
          );


        article.innerHTML =
          `
          <div class="meal-head">

            <div>

              <h3>
                ${escapeHtml(meal.description)}
              </h3>

              <div class="meta">
                Posiłek ${meal.mealNo}
              </div>

            </div>

            <button
              class="danger-link"
              data-del="${escapeHtml(meal.mealId)}"
              type="button"
            >
              Usuń
            </button>

          </div>

          ${nutrition(meal)}
          `;


        box.appendChild(
          article
        );

      }
    );


    box
      .querySelectorAll(
        '[data-del]'
      )
      .forEach(
        button => {

          button.onclick =
            () =>
              deleteMeal(
                button.dataset.del
              );

        }
      );

  } catch (e) {

    toast(
      e.message
    );

  }
}


async function deleteMeal(
  mealId
) {

  if (
    !confirm(
      'Usunąć ten posiłek?'
    )
  ) {
    return;
  }


  loading(
    true,
    'Usuwam posiłek…',
    'Aktualizuję dzisiejszy bilans.'
  );


  try {

    await api(
      'meal_delete',
      {
        mealId
      }
    );


    toast(
      'Posiłek usunięty'
    );


    await loadDashboard();

  } catch (e) {

    toast(
      e.message
    );

  } finally {

    loading(false);

  }
}


/* =====================================================
   ANALYSIS
===================================================== */

function renderAnalysis(
  analysis
) {

  state.analysis =
    analysis;


  $('analysisDescription').value =
    analysis.description ||
    '';


  $('analysisCalories').value =
    Math.round(
      analysis.calories || 0
    );


  const confidence =
    String(
      analysis.confidence || ''
    ).toLowerCase();


  if (
    confidence === 'high'
  ) {

    $('analysisConfidence').textContent =
      'Wysoka pewność';

  } else if (
    confidence === 'medium'
  ) {

    $('analysisConfidence').textContent =
      'Średnia pewność';

  } else if (
    confidence === 'low'
  ) {

    $('analysisConfidence').textContent =
      'Niska pewność';

  } else {

    $('analysisConfidence').textContent =
      analysis.confidence ||
      '';

  }


  $('analysisItems').innerHTML =
    (
      analysis.items || []
    )
      .map(
        item =>
          `
          <div class="analysis-item">

            <span>
              ${escapeHtml(item.namePl)}
              ·
              ${Math.round(item.grams || 0)} g
            </span>

            <strong>
              ${Math.round(item.calories || 0)} kcal
            </strong>

          </div>
          `
      )
      .join('');


  show(
    'analysisPanel'
  );


  setTimeout(
    () =>
      $('analysisPanel')
        ?.scrollIntoView({
          behavior:
            'smooth',

          block:
            'start'
        }),
    80
  );
}


async function analyzeText() {

  const text =
    $('mealText')
      .value
      .trim();


  if (!text) {

    toast(
      'Wpisz opis posiłku.'
    );

    return;

  }


  loading(
    true,
    'Analizuję posiłek…',
    'Rozpoznaję składniki i szacuję wartości odżywcze.'
  );


  try {

    const data =
      await api(
        'analyze_text',
        {
          text
        }
      );


    renderAnalysis(
      data.analysis
    );

  } catch (e) {

    toast(
      e.message
    );

  } finally {

    loading(false);

  }
}


async function analyzePhoto(
  file
) {

  if (!file) {
    return;
  }


  loading(
    true,
    'Analizuję zdjęcie…',
    'AI rozpoznaje składniki i oblicza wartości odżywcze.'
  );


  try {

    const data =
      await api(
        'analyze_photo',
        {},
        file
      );


    renderAnalysis(
      data.analysis
    );

  } catch (e) {

    toast(
      e.message
    );

  } finally {

    loading(false);


    if ($('photoInput')) {
      $('photoInput').value =
        '';
    }

  }
}


async function saveMeal() {

  if (!state.analysis) {
    return;
  }


  loading(
    true,
    'Zapisuję posiłek…',
    'Aktualizuję dzisiejszy bilans.'
  );


  try {

    await api(
      'meal_save',
      {
        analysisJson:
          JSON.stringify(
            state.analysis
          ),

        description:
          $('analysisDescription')
            .value
            .trim(),

        calories:
          $('analysisCalories')
            .value
      }
    );


    state.analysis =
      null;


    hide(
      'analysisPanel'
    );


    $('mealText').value =
      '';


    toast(
      'Posiłek zapisany'
    );


    nav(
      'today'
    );

  } catch (e) {

    toast(
      e.message
    );

  } finally {

    loading(false);

  }
}


async function saveFavorite() {

  if (!state.analysis) {
    return;
  }


  loading(
    true,
    'Dodaję do ulubionych…',
    'Zapisuję gotowy posiłek do szybkiego użycia.'
  );


  try {

    await api(
      'favorite_add',
      {
        analysisJson:
          JSON.stringify(
            state.analysis
          ),

        description:
          $('analysisDescription')
            .value
            .trim(),

        calories:
          $('analysisCalories')
            .value
      }
    );


    toast(
      'Dodano do ulubionych'
    );

  } catch (e) {

    toast(
      e.message
    );

  } finally {

    loading(false);

  }
}


/* =====================================================
   FAVORITES
===================================================== */

async function loadFavorites() {

  try {

    const data =
      await api(
        'favorites_list'
      );


    const box =
      $('favoritesList');


    box.innerHTML =
      '';


    if (
      !(data.favorites || []).length
    ) {

      box.innerHTML =
        `
        <div class="empty">
          Brak ulubionych posiłków.
          <br>
          Po analizie posiłku możesz zapisać go tutaj.
        </div>
        `;

      return;
    }


    (
      data.favorites || []
    ).forEach(
      favorite => {

        const article =
          document.createElement(
            'article'
          );


        article.dataset.favorite =
          JSON.stringify(
            favorite
          );


        article.innerHTML =
          `
          <div class="fav-head">

            <div>

              <h3>
                ${escapeHtml(favorite.description)}
              </h3>

              <div class="meta">
                ${escapeHtml((favorite.addedAt || '').slice(0, 10))}
              </div>

            </div>

            <button
              class="danger-link"
              data-fdel="${escapeHtml(favorite.favoriteId)}"
              type="button"
            >
              Usuń
            </button>

          </div>

          ${nutrition(favorite)}

          <button
            class="small"
            data-use="${escapeHtml(favorite.favoriteId)}"
            type="button"
          >
            Dodaj jako bieżący posiłek
          </button>
          `;


        box.appendChild(
          article
        );

      }
    );


    box
      .querySelectorAll(
        '[data-fdel]'
      )
      .forEach(
        button => {

          button.onclick =
            () =>
              deleteFavorite(
                button.dataset.fdel
              );

        }
      );


    box
      .querySelectorAll(
        '[data-use]'
      )
      .forEach(
        button => {

          button.onclick =
            () => {

              const favorite =
                JSON.parse(
                  button
                    .closest('article')
                    .dataset.favorite
                );


              state.analysis = {
                description:
                  favorite.description,

                items:
                  favorite.items,

                calories:
                  favorite.calories,

                protein:
                  favorite.protein,

                carbs:
                  favorite.carbs,

                fat:
                  favorite.fat,

                source:
                  `Ulubione · ${favorite.source || 'Dieta V2'}`,

                confidence:
                  favorite.confidence ||
                  'high'
              };


              nav(
                'add'
              );


              renderAnalysis(
                state.analysis
              );

            };

        }
      );

  } catch (e) {

    toast(
      e.message
    );

  }
}


async function deleteFavorite(
  favoriteId
) {

  if (
    !confirm(
      'Usunąć z ulubionych?'
    )
  ) {
    return;
  }


  loading(
    true,
    'Usuwam z ulubionych…',
    'Aktualizuję listę zapisanych posiłków.'
  );


  try {

    await api(
      'favorite_delete',
      {
        favoriteId
      }
    );


    toast(
      'Usunięto z ulubionych'
    );


    await loadFavorites();

  } catch (e) {

    toast(
      e.message
    );

  } finally {

    loading(false);

  }
}


/* =====================================================
   HISTORY
===================================================== */

function renderHistoryStrip(
  days = []
) {

  const strip =
    $('historyDaysStrip');


  strip.innerHTML =
    '';


  if (!days.length) {

    $('historyMonth').textContent =
      '';

    return;
  }


  const latest =
    new Date(
      `${days[0].date}T12:00:00`
    );


  $('historyMonth').textContent =
    new Intl.DateTimeFormat(
      'pl-PL',
      {
        month:
          'long',

        year:
          'numeric'
      }
    ).format(
      latest
    );


  days
    .slice(0, 14)
    .forEach(
      (
        day,
        index
      ) => {

        const date =
          new Date(
            `${day.date}T12:00:00`
          );


        const button =
          document.createElement(
            'button'
          );


        button.type =
          'button';


        button.className =
          'day-chip' +
          (
            index === 0
              ? ' active'
              : ''
          );


        button.innerHTML =
          `
          <small>
            ${
              new Intl.DateTimeFormat(
                'pl-PL',
                {
                  weekday:
                    'short'
                }
              )
                .format(date)
                .replace('.', '')
            }
          </small>

          <strong>
            ${date.getDate()}
          </strong>
          `;


        button.onclick =
          () => {

            const target =
              document.querySelector(
                `[data-history-date="${day.date}"]`
              );


            target?.scrollIntoView({
              behavior:
                'smooth',

              block:
                'start'
            });

          };


        strip.appendChild(
          button
        );

      }
    );
}


async function loadHistory() {

  loading(
    true,
    'Ładuję historię…',
    'Pobieram zapisane dni i ich podsumowania.'
  );


  try {

    const data =
      await api(
        'history'
      );


    const box =
      $('historyList');


    box.innerHTML =
      '';


    renderHistoryStrip(
      data.days || []
    );


    if (
      !(data.days || []).length
    ) {

      box.innerHTML =
        `
        <div class="empty">
          Brak historii.
          <br>
          Zapisane dni pojawią się tutaj automatycznie.
        </div>
        `;

      return;
    }


    (
      data.days || []
    ).forEach(
      day => {

        const article =
          document.createElement(
            'article'
          );


        article.dataset.historyDate =
          day.date;


        const meals =
          (
            day.meals || []
          )
            .map(
              meal =>
                `
                <div>

                  <span>
                    ${meal.mealNo}.
                    ${escapeHtml(meal.description)}
                  </span>

                  <strong>
                    ${Math.round(meal.calories || 0)}
                    kcal
                  </strong>

                </div>
                `
            )
            .join('');


        article.innerHTML =
          `
          <div class="history-head">

            <div>

              <h3>
                ${escapeHtml(day.date)}
              </h3>

              <div class="meta">
                ${Math.round(day.totals?.calories || 0)}
                /
                ${Math.round(day.targets?.calories || 0)}
                kcal
              </div>

            </div>

            <button
              class="danger-link"
              data-ddel="${escapeHtml(day.date)}"
              type="button"
            >
              Usuń dzień
            </button>

          </div>

          ${nutrition(day.totals || {})}

          <div class="history-meals">
            ${meals}
          </div>
          `;


        box.appendChild(
          article
        );

      }
    );


    box
      .querySelectorAll(
        '[data-ddel]'
      )
      .forEach(
        button => {

          button.onclick =
            () =>
              deleteDay(
                button.dataset.ddel
              );

        }
      );

  } catch (e) {

    toast(
      e.message
    );

  } finally {

    loading(false);

  }
}


async function deleteDay(
  date
) {

  if (
    !confirm(
      `Usunąć cały dzień ${date}?`
    )
  ) {
    return;
  }


  loading(
    true,
    'Usuwam dzień…',
    'Usuwam zapisane posiłki z wybranego dnia.'
  );


  try {

    await api(
      'day_delete',
      {
        date
      }
    );


    toast(
      'Dzień usunięty'
    );


    await loadHistory();

  } catch (e) {

    toast(
      e.message
    );

  } finally {

    loading(false);

  }
}


/* =====================================================
   SETTINGS
===================================================== */

async function loadSettings() {

  try {

    const data =
      await api(
        'settings_get'
      );


    const settings =
      data.settings || {};


    $('setCalories').value =
      settings.dailyCalorieTarget ??
      0;


    $('setProtein').value =
      settings.dailyProteinTarget ??
      0;


    $('setCarbs').value =
      settings.dailyCarbsTarget ??
      0;


    $('setFat').value =
      settings.dailyFatTarget ??
      0;


    const name =
      state.profile?.displayName ||
      'Profil';


    $('profileName').textContent =
      name;


    $('profileAvatar').textContent =
      initials(name);


    if ($('profileSubline')) {

      $('profileSubline').textContent =
        'Ta instalacja jest trwale przypisana do tego profilu.';

    }

  } catch (e) {

    toast(
      e.message
    );

  }
}


async function saveSettings() {

  loading(
    true,
    'Zapisuję ustawienia…',
    'Aktualizuję dzienne cele.'
  );


  try {

    await api(
      'settings_update',
      {
        dailyCalorieTarget:
          $('setCalories').value,

        dailyProteinTarget:
          $('setProtein').value,

        dailyCarbsTarget:
          $('setCarbs').value,

        dailyFatTarget:
          $('setFat').value
      }
    );


    toast(
      'Zmiany zapisane'
    );


    await loadSettings();

  } catch (e) {

    toast(
      e.message
    );

  } finally {

    loading(false);

  }
}


/* =====================================================
   INSTALL PWA
===================================================== */

function isStandalone() {

  return (
    window.matchMedia(
      '(display-mode: standalone)'
    ).matches ||
    window.navigator.standalone === true
  );
}


function refreshInstallButtons() {

  const buttons = [
    $('installFirstBtn'),
    $('installBtn')
  ].filter(Boolean);


  if (
    isStandalone()
  ) {

    buttons.forEach(
      button =>
        button.classList.add(
          'hidden'
        )
    );

    return;

  }


  buttons.forEach(
    button =>
      button.classList.remove(
        'hidden'
      )
  );
}


async function installApp() {

  if (
    isStandalone()
  ) {
    return;
  }


  if (
    state.deferredPrompt
  ) {

    state.deferredPrompt.prompt();


    await state
      .deferredPrompt
      .userChoice;


    state.deferredPrompt =
      null;


    refreshInstallButtons();

    return;
  }


  const ios =
    /iphone|ipad|ipod/i.test(
      navigator.userAgent
    );


  if (ios) {

    alert(
      'Na iPhonie otwórz aplikację w Safari, stuknij Udostępnij i wybierz „Dodaj do ekranu początkowego”.'
    );

  } else {

    alert(
      'Jeśli przeglądarka nie pokazuje instalacji automatycznie, otwórz jej menu i wybierz „Zainstaluj aplikację” albo „Dodaj do ekranu głównego”.'
    );

  }
}


/* =====================================================
   ENTER APP
===================================================== */

async function enterApp() {

  hide(
    'authScreen'
  );


  show(
    'app'
  );


  const name =
    state.profile?.displayName ||
    'Profil';


  $('profileName').textContent =
    name;


  $('profileAvatar').textContent =
    initials(name);


  try {

    await loadDashboard();

  } finally {

    hideSplash();

  }
}


/* =====================================================
   INIT
===================================================== */

async function init() {

  /* nav */

  document
    .querySelectorAll(
      '[data-nav]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            nav(
              button.dataset.nav
            )
        );

      }
    );


  /* auth */

  $('claimProfileBtn').onclick =
    claimProfile;


  $('createUserBtn').onclick =
    createUser;


  /* meal add */

  $('showTextBtn').onclick =
    () =>
      show(
        'textPanel'
      );


  $('analyzeTextBtn').onclick =
    analyzeText;


  $('photoInput').onchange =
    event =>
      analyzePhoto(
        event.target.files?.[0]
      );


  $('saveMealBtn').onclick =
    saveMeal;


  $('saveFavoriteBtn').onclick =
    saveFavorite;


  $('saveSettingsBtn').onclick =
    saveSettings;


  /* install */

  window.addEventListener(
    'beforeinstallprompt',
    event => {

      event.preventDefault();

      state.deferredPrompt =
        event;

      refreshInstallButtons();

    }
  );


  window.addEventListener(
    'appinstalled',
    () => {

      state.deferredPrompt =
        null;

      refreshInstallButtons();

    }
  );


  if ($('installFirstBtn')) {

    $('installFirstBtn')
      .addEventListener(
        'click',
        installApp
      );

  }


  if ($('installBtn')) {

    $('installBtn')
      .addEventListener(
        'click',
        installApp
      );

  }


  refreshInstallButtons();


  /* online */

  const online = () => {

    if (
      navigator.onLine
    ) {

      hide(
        'offline'
      );

    } else {

      show(
        'offline'
      );

    }

  };


  window.addEventListener(
    'online',
    online
  );


  window.addEventListener(
    'offline',
    online
  );


  online();


  /* SW */

  if (
    'serviceWorker' in navigator
  ) {

    navigator.serviceWorker
      .register(
        './sw.js?v=20260814-9'
      )
      .catch(
        () => {}
      );

  }


  /*
    Jeżeli token istnieje:
    backend sam ustala userId z tokenu.
  */

  if (
    state.token
  ) {

    try {

      await api(
        'settings_get'
      );


      await enterApp();

      return;

    } catch (e) {

      localStorage.removeItem(
        TOKEN_KEY
      );


      localStorage.removeItem(
        PROFILE_KEY
      );


      state.token =
        '';


      state.profile =
        null;


      toast(
        'Sesja wygasła. Przypisz instalację ponownie.'
      );

    }

  }


  /*
    Brak poprawnego tokenu.
    Dopiero teraz pokazujemy ekran pierwszego uruchomienia.
  */

  show(
    'authScreen'
  );


  try {

    await loadProfiles();

  } finally {

    hideSplash();

  }
}


document.addEventListener(
  'DOMContentLoaded',
  init
);
