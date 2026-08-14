from pathlib import Path

OLD = '20260814-12'
NEW = '20260814-13'

# ---------- index.html ----------
p = Path('index.html')
s = p.read_text(encoding='utf-8')

marker = '''  <!-- LOADING -->
  <div
    id="loading"
'''
modal = '''  <!-- WYLOGOWANIE -->
  <div
    id="logoutModal"
    class="logout-modal hidden"
    role="dialog"
    aria-modal="true"
    aria-labelledby="logoutModalTitle"
    aria-describedby="logoutModalText"
  >

    <div class="logout-modal-card">

      <div
        class="logout-modal-icon"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24">
          <path
            d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4
               M14 8l4 4-4 4
               M18 12H9"
          />
        </svg>
      </div>

      <div class="logout-modal-kicker">
        Sesja użytkownika
      </div>

      <h2 id="logoutModalTitle">
        Wylogować się?
      </h2>

      <p id="logoutModalText">
        Po wylogowaniu przy kolejnym uruchomieniu aplikacji trzeba będzie ponownie podać login i PIN.
      </p>

      <div class="logout-modal-actions">

        <button
          id="logoutCancelBtn"
          class="logout-modal-cancel"
          type="button"
        >
          Anuluj
        </button>

        <button
          id="logoutConfirmBtn"
          class="logout-modal-confirm"
          type="button"
        >
          Wyloguj
        </button>

      </div>

    </div>

  </div>


''' + marker

if marker not in s:
    raise RuntimeError('Loading marker not found in index.html')

s = s.replace(marker, modal, 1)
s = s.replace(OLD, NEW)
p.write_text(s, encoding='utf-8')

# ---------- styles.css ----------
p = Path('styles.css')
s = p.read_text(encoding='utf-8')

marker = '''/* -------------------------------------------------------
   LOADING
------------------------------------------------------- */
'''

css = '''/* -------------------------------------------------------
   LOGOUT MODAL
------------------------------------------------------- */

body.modal-open {
  overflow: hidden;
}

.logout-modal {
  position: fixed;
  z-index: 230;
  inset: 0;
  padding:
    max(20px, env(safe-area-inset-top))
    20px
    max(20px, env(safe-area-inset-bottom));
  display: grid;
  place-items: center;
  background:
    rgba(3, 10, 13, .82);
  backdrop-filter:
    blur(14px);
  animation:
    logoutBackdropIn .18s ease both;
}

.logout-modal-card {
  width: min(390px, 100%);
  padding: 28px 24px 24px;
  border:
    1px solid rgba(85, 234, 216, .18);
  border-radius: 27px;
  background:
    radial-gradient(
      circle at 50% -10%,
      rgba(85, 234, 216, .11),
      transparent 38%
    ),
    linear-gradient(
      145deg,
      rgba(16, 34, 40, .99),
      rgba(8, 21, 26, .99)
    );
  box-shadow:
    0 28px 80px rgba(0, 0, 0, .48),
    inset 0 1px 0 rgba(255, 255, 255, .025);
  text-align: center;
  animation:
    logoutCardIn .2s ease both;
}

.logout-modal-icon {
  width: 66px;
  height: 66px;
  margin: 0 auto 18px;
  display: grid;
  place-items: center;
  border:
    1px solid rgba(85, 234, 216, .16);
  border-radius: 21px;
  color: #68ecdd;
  background:
    rgba(85, 234, 216, .075);
  box-shadow:
    0 12px 32px rgba(34, 201, 214, .10);
}

.logout-modal-icon svg {
  width: 31px;
  height: 31px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.logout-modal-kicker {
  margin-bottom: 7px;
  color: #5edfd0;
  text-transform: uppercase;
  letter-spacing: .13em;
  font-size: 12px;
  font-weight: 850;
}

.logout-modal-card h2 {
  margin: 0;
  color: #edf7f6;
  font-size: 29px;
  line-height: 1.08;
  letter-spacing: -.04em;
}

.logout-modal-card p {
  margin: 13px auto 23px;
  max-width: 320px;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.55;
}

.logout-modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.logout-modal-actions button {
  min-height: 50px;
  border-radius: 16px;
  font: inherit;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}

.logout-modal-cancel {
  border:
    1px solid rgba(255, 255, 255, .11);
  color: #c1d2d3;
  background:
    rgba(255, 255, 255, .045);
}

.logout-modal-confirm {
  border: 0;
  color: #061416;
  background:
    linear-gradient(
      135deg,
      var(--teal),
      var(--cyan)
    );
  box-shadow:
    0 10px 26px rgba(38, 199, 213, .18);
}

.logout-modal-actions button:active {
  transform: translateY(1px);
}

@keyframes logoutBackdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes logoutCardIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}


''' + marker

if marker not in s:
    raise RuntimeError('Loading CSS marker not found')

s = s.replace(marker, css, 1)
p.write_text(s, encoding='utf-8')

# ---------- app.js ----------
p = Path('app.js')
s = p.read_text(encoding='utf-8')

old_logout_start = '''async function logout() {

  if (!state.token) {
    return;
  }

  if (
    !confirm(
      'Wylogować się z aplikacji?'
    )
  ) {
    return;
  }

  loading(
'''

new_logout_start = '''function openLogoutModal() {

  if (!state.token) {
    return;
  }

  show('logoutModal');
  document.body.classList.add('modal-open');

  setTimeout(
    () => $('logoutCancelBtn')?.focus(),
    20
  );
}


function closeLogoutModal() {

  hide('logoutModal');
  document.body.classList.remove('modal-open');
}


async function logout() {

  if (!state.token) {
    return;
  }

  closeLogoutModal();

  loading(
'''

if old_logout_start not in s:
    raise RuntimeError('Native confirm logout block not found')

s = s.replace(old_logout_start, new_logout_start, 1)

old_handler = '''  if ($('logoutBtn')) {
    $('logoutBtn').onclick =
      logout;
  }
'''

new_handler = '''  if ($('logoutBtn')) {
    $('logoutBtn').onclick =
      openLogoutModal;
  }

  if ($('logoutCancelBtn')) {
    $('logoutCancelBtn').onclick =
      closeLogoutModal;
  }

  if ($('logoutConfirmBtn')) {
    $('logoutConfirmBtn').onclick =
      logout;
  }

  $('logoutModal')
    ?.addEventListener(
      'click',
      event => {
        if (event.target === $('logoutModal')) {
          closeLogoutModal();
        }
      }
    );

  document.addEventListener(
    'keydown',
    event => {
      if (
        event.key === 'Escape' &&
        !$('logoutModal')?.classList.contains('hidden')
      ) {
        closeLogoutModal();
      }
    }
  );
'''

if old_handler not in s:
    raise RuntimeError('logout button handler not found')

s = s.replace(old_handler, new_handler, 1)
s = s.replace(OLD, NEW)
p.write_text(s, encoding='utf-8')

# ---------- sw.js ----------
p = Path('sw.js')
s = p.read_text(encoding='utf-8')
if OLD not in s:
    raise RuntimeError('Old cache version not found in sw.js')
s = s.replace(OLD, NEW)
p.write_text(s, encoding='utf-8')

# ---------- validation ----------
idx = Path('index.html').read_text(encoding='utf-8')
app = Path('app.js').read_text(encoding='utf-8')
css = Path('styles.css').read_text(encoding='utf-8')
sw = Path('sw.js').read_text(encoding='utf-8')

assert 'id="logoutModal"' in idx
assert 'id="logoutCancelBtn"' in idx
assert 'id="logoutConfirmBtn"' in idx
assert 'function openLogoutModal()' in app
assert 'function closeLogoutModal()' in app
assert "confirm(\n      'Wylogować się z aplikacji?'" not in app
assert "$('logoutBtn').onclick =\n      openLogoutModal;" in app
assert '.logout-modal-card {' in css
assert '.logout-modal-confirm {' in css
assert NEW in idx and NEW in app and NEW in sw
