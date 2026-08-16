#!/usr/bin/env bash
set -euo pipefail

GRADLE_FILE="android/app/build.gradle"

if [ ! -f "$GRADLE_FILE" ]; then
  echo "Missing generated Android Gradle file: $GRADLE_FILE" >&2
  exit 1
fi

python3 - <<'PY'
from pathlib import Path

p = Path('android/app/build.gradle')
text = p.read_text()

old_code = 'versionCode 1'
old_name = 'versionName "1.0"'

if old_code not in text:
    raise SystemExit('Expected versionCode 1 not found')
if old_name not in text:
    raise SystemExit('Expected versionName 1.0 not found')

text = text.replace(old_code, 'versionCode 3', 1)
text = text.replace(old_name, 'versionName "1.0.2"', 1)
p.write_text(text)
PY

grep -F 'versionCode 3' "$GRADLE_FILE"
grep -F 'versionName "1.0.2"' "$GRADLE_FILE"
