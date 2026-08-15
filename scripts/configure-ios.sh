#!/usr/bin/env bash
set -euo pipefail

PLIST="ios/App/App/Info.plist"

if [ ! -f "$PLIST" ]; then
  echo "iOS Info.plist not found at $PLIST" >&2
  exit 1
fi

set_plist_string() {
  local key="$1"
  local value="$2"
  /usr/libexec/PlistBuddy -c "Set :$key $value" "$PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :$key string $value" "$PLIST"
}

set_plist_string "NSCameraUsageDescription" "Aparat jest używany do zrobienia zdjęcia posiłku do analizy żywieniowej."
set_plist_string "NSPhotoLibraryUsageDescription" "Dostęp do zdjęć służy do wybrania zdjęcia posiłku do analizy żywieniowej."

/usr/libexec/PlistBuddy -c "Print :NSCameraUsageDescription" "$PLIST"
/usr/libexec/PlistBuddy -c "Print :NSPhotoLibraryUsageDescription" "$PLIST"
