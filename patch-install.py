from pathlib import Path

OLD = '20260814-10'
NEW = '20260814-11'

# index.html
p = Path('index.html')
s = p.read_text(encoding='utf-8')
old_hint = 'Instalacja jest opcjonalna. Profil możesz przypisać również w przeglądarce.'
new_hint = 'Zainstaluj aplikację, aby przejść do logowania i konfiguracji profilu.'
if old_hint not in s:
    raise RuntimeError('Expected install hint not found')
s = s.replace(old_hint, new_hint, 1)
s = s.replace(OLD, NEW)
p.write_text(s, encoding='utf-8')

# styles.css
p = Path('styles.css')
s = p.read_text(encoding='utf-8')
marker = '''.auth-shell {
  width: min(580px, 100%);

  display: grid;

  gap: 17px;
}
'''
addition = marker + '''

.auth-screen.install-only {
  place-items: center;
}

.auth-screen.install-only .auth-intro,
.auth-screen.install-only #existingProfiles,
.auth-screen.install-only #newUserDetails,
.auth-screen.install-only #authError,
.auth-screen.install-only .security-note {
  display: none !important;
}

.auth-screen.install-only .auth-shell {
  width: min(580px, 100%);
}

.auth-screen.install-only .install-card {
  margin: 0;
}
'''
if marker not in s:
    raise RuntimeError('Expected auth-shell CSS marker not found')
s = s.replace(marker, addition, 1)
p.write_text(s, encoding='utf-8')

# app.js
p = Path('app.js')
s = p.read_text(encoding='utf-8')
old_refresh = '''function refreshInstallButtons() {

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
'''
new_refresh = '''function refreshInstallButtons() {

  const buttons = [
    $('installFirstBtn'),
    $('installBtn')
  ].filter(Boolean);

  const hint =
    $('installHint');


  if (
    isStandalone()
  ) {

    buttons.forEach(
      button =>
        button.classList.add(
          'hidden'
        )
    );

    hint?.classList.add(
      'hidden'
    );

    return;

  }


  buttons.forEach(
    button =>
      button.classList.remove(
        'hidden'
      )
  );

  hint?.classList.remove(
    'hidden'
  );
}
'''
if old_refresh not in s:
    raise RuntimeError('Expected refreshInstallButtons not found')
s = s.replace(old_refresh, new_refresh, 1)

old_handler = '''  window.addEventListener(
    'appinstalled',
    () => {

      state.deferredPrompt =
        null;

      refreshInstallButtons();

    }
  );
'''
new_handler = '''  window.addEventListener(
    'appinstalled',
    () => {

      state.deferredPrompt =
        null;

      if (!isStandalone()) {

        $('installFirstBtn')
          ?.classList.add(
            'hidden'
          );

        if ($('installHint')) {
          $('installHint').textContent =
            'Aplikacja została zainstalowana. Uruchom ją z ikony na ekranie głównym.';
        }

        return;
      }

      refreshInstallButtons();

    }
  );
'''
if old_handler not in s:
    raise RuntimeError('Expected appinstalled handler not found')
s = s.replace(old_handler, new_handler, 1)

marker = '''  /*
    Jeżeli token istnieje:
    backend sam ustala userId z tokenu.
  */
'''
gate = '''  /*
    W przeglądarce pokazujemy tylko instalację PWA.
    Logowanie i tworzenie profilu są dostępne dopiero
    po uruchomieniu aplikacji w trybie standalone.
  */

  if (
    !isStandalone()
  ) {

    $('authScreen')
      ?.classList.add(
        'install-only'
      );

    hide('app');
    show('authScreen');
    refreshInstallButtons();
    hideSplash();

    return;
  }

  $('authScreen')
    ?.classList.remove(
      'install-only'
    );

  refreshInstallButtons();


''' + marker
if marker not in s:
    raise RuntimeError('Expected token flow marker not found')
s = s.replace(marker, gate, 1)
s = s.replace(OLD, NEW)
p.write_text(s, encoding='utf-8')

# sw.js
p = Path('sw.js')
s = p.read_text(encoding='utf-8')
if OLD not in s:
    raise RuntimeError('Expected old version in sw.js')
s = s.replace(OLD, NEW)
p.write_text(s, encoding='utf-8')

# validation
index = Path('index.html').read_text(encoding='utf-8')
css = Path('styles.css').read_text(encoding='utf-8')
app = Path('app.js').read_text(encoding='utf-8')
sw = Path('sw.js').read_text(encoding='utf-8')
assert 'Zainstaluj aplikację, aby przejść do logowania' in index
assert '.auth-screen.install-only #existingProfiles' in css
assert '.auth-screen.install-only #newUserDetails' in css
assert "'install-only'" in app
assert 'Aplikacja została zainstalowana. Uruchom ją z ikony' in app
assert NEW in index and NEW in app and NEW in sw
