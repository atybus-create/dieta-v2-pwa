# Dieta V2 Android APK

Pierwsza wersja sideload: `1.0.0`.

Aplikacja jest natywnym wrapperem Android WebView dla `https://dieta.atybuslab.com/` i zachowuje sesję w pamięci WebView. Build CI generuje instalowalny plik APK do pobrania jako artifact GitHub Actions.

Build testowy jest uruchamiany automatycznie dla zmian w `android-app/`.

Aktualny build testowy: `1.1.3`, `compileSdk 36`, `targetSdk 36`. CI generuje z jednego commita odpowiadające sobie artefakty APK i AAB.
