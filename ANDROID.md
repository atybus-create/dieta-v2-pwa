# AI Monitor żywienia — Android / Capacitor

## Konfiguracja

- App name: `AI Monitor żywienia`
- Package ID: `pl.aimonitor.zywienia`
- versionCode: `1`
- versionName: `1.0`
- Web source: pliki w katalogu głównym repozytorium
- Native web bundle: generowany do `www/` przez `npm run build:web`
- Android project: generowany przez Capacitor 8 podczas buildu

## Lokalny build projektu Android

```bash
npm install
npm run build:web
npx cap add android
npm run native:assets
npx cap sync android
```

Po zmianie frontendu wystarczy:

```bash
npm run native:android:sync
```

## Release signing

Klucza release ani haseł nie wolno commitować do repozytorium. Workflow `.github/workflows/android.yml` oczekuje czterech GitHub Actions Secrets:

- `ANDROID_KEYSTORE_BASE64` — plik keystore zakodowany base64
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Ten sam trwały keystore musi być używany do APK i AAB oraz do przyszłych aktualizacji aplikacji.

## Zachowanie PWA vs Android

`native-bootstrap.js` działa wyłącznie wewnątrz Capacitor. W natywnej aplikacji:

- istniejący frontend jest traktowany jako standalone,
- przyciski i prompty instalacji PWA są ukryte,
- Service Worker PWA nie jest rejestrowany,
- systemowy przycisk Wstecz wraca do widoku „Dzisiaj”, a z widoku głównego zamyka aplikację,
- obecny picker zdjęcia `<input type="file" capture="environment">` pozostaje bez zmian, dzięki czemu nie dokładamy zbędnego uprawnienia `CAMERA`.

PWA na branchu `main` pozostaje bez zmian.
