from pathlib import Path

OLD = '20260814-11'
NEW = '20260814-12'

# index.html
p = Path('index.html')
s = p.read_text(encoding='utf-8')
old = '''      <button
        id="installBtn"
        class="icon-button ghost hidden"
        type="button"
        aria-label="Zainstaluj aplikację"
        title="Zainstaluj aplikację"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3v11
               m0 0 4-4
               m-4 4-4-4
               M5 16v3
               a2 2 0 0 0 2 2
               h10
               a2 2 0 0 0 2-2
               v-3"
          />
        </svg>
      </button>
'''
new = old + '''

      <button
        id="logoutBtn"
        class="logout-button"
        type="button"
        aria-label="Wyloguj"
        title="Wyloguj"
      >
        Wyloguj
      </button>
'''
if old not in s:
    raise RuntimeError('install button marker not found')
s = s.replace(old, new, 1)
s = s.replace(OLD, NEW)
p.write_text(s, encoding='utf-8')

# styles.css
p = Path('styles.css')
s = p.read_text(encoding='utf-8')
marker = '''/* -------------------------------------------------------
   AUTH
------------------------------------------------------- */
'''
css = '''.logout-button {
  align-self: center;
  min-height: 42px;
  padding: 0 15px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 14px;
  background: rgba(255, 255, 255, .045);
  color: #dbe9e8;
  font: inherit;
  font-size: 14px;
  font-weight: 750;
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease, transform .18s ease;
}

.logout-button:hover {
  background: rgba(255, 255, 255, .08);
  border-color: rgba(255, 255, 255, .22);
}

.logout-button:active {
  transform: translateY(1px);
}


'''
if marker not in s:
    raise RuntimeError('AUTH css marker not found')
s = s.replace(marker, css + marker, 1)
p.write_text(s, encoding='utf-8')

# app.js
p = Path('app.js')
s = p.read_text(encoding='utf-8')

marker = '''function rememberSession(
  accessToken,
  userId,
  displayName
) {
'''
if marker not in s:
    raise RuntimeError('rememberSession marker not found')

insert_after = '''  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify(
      state.profile
    )
  );
}
'''
addition = insert_after + '''

function clearSession() {

  localStorage.removeItem(
    TOKEN_KEY
  );

  localStorage.removeItem(
    PROFILE_KEY
  );

  state.token = '';
  state.profile = null;
  state.analysis = null;
}


async function logout() {

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
    true,
    'Wylogowuję…',
    'Kończę sesję na tym urządzeniu.'
  );

  try {

    await api(
      'logout'
    );

    clearSession();

    if ($('profileLogin')) {
      $('profileLogin').value = '';
    }

    if ($('profilePin')) {
      $('profilePin').value = '';
    }

    hide('app');

    $('authScreen')
      ?.classList.remove(
        'install-only'
      );

    show('authScreen');

    await loadProfiles();

    toast(
      'Wylogowano.'
    );

  } catch (e) {

    toast(
      e.message ||
      'Nie udało się wylogować.'
    );

  } finally {

    loading(false);

  }
}
'''
if insert_after not in s:
    raise RuntimeError('rememberSession end not found')
s = s.replace(insert_after, addition, 1)

init_marker = '''  $('createUserBtn').onclick =
    createUser;
'''
init_add = init_marker + '''

  if ($('logoutBtn')) {
    $('logoutBtn').onclick =
      logout;
  }
'''
if init_marker not in s:
    raise RuntimeError('createUser init marker not found')
s = s.replace(init_marker, init_add, 1)

# Use shared session clear on expired token too
old_expired = '''      localStorage.removeItem(
        TOKEN_KEY
      );


      localStorage.removeItem(
        PROFILE_KEY
      );


      state.token =
        '';


      state.profile =
        null;
'''
if old_expired not in s:
    raise RuntimeError('expired-session cleanup marker not found')
s = s.replace(old_expired, '''      clearSession();
''', 1)

s = s.replace(OLD, NEW)
p.write_text(s, encoding='utf-8')

# sw.js
p = Path('sw.js')
s = p.read_text(encoding='utf-8')
if OLD not in s:
    raise RuntimeError('old cache version not found in sw.js')
s = s.replace(OLD, NEW)
p.write_text(s, encoding='utf-8')

# validate
idx = Path('index.html').read_text(encoding='utf-8')
app = Path('app.js').read_text(encoding='utf-8')
css = Path('styles.css').read_text(encoding='utf-8')
sw = Path('sw.js').read_text(encoding='utf-8')
assert 'id="logoutBtn"' in idx
assert 'async function logout()' in app
assert "await api(\n      'logout'" in app
assert 'function clearSession()' in app
assert '.logout-button {' in css
assert NEW in idx and NEW in app and NEW in sw
