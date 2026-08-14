from pathlib import Path

OLD = '20260814-9'
NEW = '20260814-10'

# index.html
p = Path('index.html')
s = p.read_text(encoding='utf-8')
start_marker = '''        <h2>\n          Wybierz istniejącego użytkownika\n        </h2>'''
start = s.index(start_marker)
end_marker = '''        <label\n          class="field-label"\n          for="profilePin"'''
end = s.index(end_marker, start)
replacement = '''        <h2>\n          ZALOGUJ SIĘ\n        </h2>\n\n        <label\n          class="field-label"\n          for="profileLogin"\n        >\n          Imię lub login\n        </label>\n\n        <input\n          id="profileLogin"\n          type="text"\n          autocomplete="username"\n          maxlength="60"\n          placeholder="Wpisz imię lub login"\n        >\n\n\n'''
s = s[:start] + replacement + s[end:]
s = s.replace('Przypisz profil do tego urządzenia', 'Zaloguj', 1)
s = s.replace(OLD, NEW)
p.write_text(s, encoding='utf-8')

# app.js
p = Path('app.js')
s = p.read_text(encoding='utf-8')
start = s.index('function renderProfileChoices(')
end = s.index('async function loadProfiles()', start)
s = s[:start] + '''function renderProfileChoices(\n  users = []\n) {\n\n  state.profiles =\n    Array.isArray(users)\n      ? users\n      : [];\n}\n\n\n''' + s[end:]

start = s.index('async function claimProfile()')
end = s.index('async function createUser()', start)
claim = '''async function claimProfile() {\n\n  hide('authError');\n\n\n  const login =\n    $('profileLogin')?.value\n      .trim() || '';\n\n\n  const accessPin =\n    $('profilePin')?.value\n      .trim() || '';\n\n\n  if (\n    !login ||\n    !accessPin\n  ) {\n\n    $('authError').textContent =\n      'Wpisz imię lub login oraz PIN.';\n\n    show('authError');\n\n    return;\n  }\n\n\n  const normalizeLogin = value =>\n    String(value || '')\n      .trim()\n      .toLocaleLowerCase('pl-PL');\n\n\n  const wanted =\n    normalizeLogin(login);\n\n\n  const byUserId =\n    state.profiles.find(\n      user =>\n        normalizeLogin(user.userId) ===\n        wanted\n    );\n\n\n  const byDisplayName =\n    state.profiles.filter(\n      user =>\n        normalizeLogin(user.displayName) ===\n        wanted\n    );\n\n\n  if (\n    !byUserId &&\n    byDisplayName.length > 1\n  ) {\n\n    $('authError').textContent =\n      'To imię pasuje do kilku profili. Wpisz login.';\n\n    show('authError');\n\n    return;\n  }\n\n\n  const profile =\n    byUserId ||\n    byDisplayName[0];\n\n\n  if (!profile?.userId) {\n\n    $('authError').textContent =\n      'Nieprawidłowe imię/login lub PIN.';\n\n    show('authError');\n\n    return;\n  }\n\n\n  loading(\n    true,\n    'Loguję…',\n    'Weryfikuję dane logowania.'\n  );\n\n\n  try {\n\n    const data =\n      await post(\n        AUTH,\n        {\n          userId:\n            profile.userId,\n          accessPin\n        }\n      );\n\n\n    rememberSession(\n      data.accessToken,\n      data.userId,\n      profile.displayName ||\n      login ||\n      data.userId\n    );\n\n\n    await enterApp();\n\n  } catch (e) {\n\n    $('authError').textContent =\n      'Nieprawidłowe imię/login lub PIN.';\n\n    show('authError');\n\n  } finally {\n\n    loading(false);\n\n  }\n}\n\n\n'''
s = s[:start] + claim + s[end:]

hook = '''  $('claimProfileBtn').onclick =\n    claimProfile;\n\n\n  $('createUserBtn').onclick =\n    createUser;'''
hook_new = '''  $('claimProfileBtn').onclick =\n    claimProfile;\n\n\n  ['profileLogin', 'profilePin']\n    .forEach(\n      id =>\n        $(id)?.addEventListener(\n          'keydown',\n          event => {\n\n            if (event.key === 'Enter') {\n              event.preventDefault();\n              claimProfile();\n            }\n\n          }\n        )\n    );\n\n\n  $('createUserBtn').onclick =\n    createUser;'''
if hook not in s:
    raise RuntimeError('Auth initialization hook not found')
s = s.replace(hook, hook_new, 1)
s = s.replace(OLD, NEW)
p.write_text(s, encoding='utf-8')

# sw.js
p = Path('sw.js')
s = p.read_text(encoding='utf-8')
if OLD not in s:
    raise RuntimeError('Old PWA version not found in sw.js')
s = s.replace(OLD, NEW)
p.write_text(s, encoding='utf-8')

# validation
index = Path('index.html').read_text(encoding='utf-8')
app = Path('app.js').read_text(encoding='utf-8')
sw = Path('sw.js').read_text(encoding='utf-8')
assert 'Wybierz istniejącego użytkownika' not in index
assert 'Przypisz profil do tego urządzenia' not in index
assert 'id="profileSelect"' not in index
assert 'id="profileCards"' not in index
assert 'id="profileLogin"' in index
assert 'ZALOGUJ SIĘ' in index
assert 'Zaloguj' in index
assert "$('profileLogin')" in app
assert 'state.profiles.find' in app
assert 'state.profiles.filter' in app
assert NEW in index and NEW in app and NEW in sw
