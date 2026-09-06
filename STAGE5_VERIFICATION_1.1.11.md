# Etap 5 — weryfikacja testów APK 1.1.10 i poprawki 1.1.11

Data: 2026-08-26

## Zakres sprawdzony na prywatnym n8n

- Instancja: `PRIV` (`https://n8n.atybuslab.com`).
- W ostatnich 100 wykonaniach głównego API wszystkie zakończyły się statusem `success`.
- W dniu testu nie było wykonań zakończonych błędem.
- Potwierdzone ścieżki: utworzenie profilu, ustawienia, motyw, analiza tekstu, analiza zdjęcia, wyszukiwanie składnika, zapis posiłku, ulubione, historia, dashboard, wylogowanie i nawodnienie.
- Dla Artura backend poprawnie zapisał `water_add` (550 → 800 ml) i `water_remove` (800 → 550 ml). Błąd wyszarzenia był wyłącznie błędem stanu przycisków w frontendzie.
- Profil `testowy` nie pozostał w żadnej z 15 tabel danych użytkownika. Rejestr usunięcia ma status `VERIFIED`, a liczba zachowanych rekordów zakupowych wynosi 0.

## Poprawki 1.1.11

1. Nawodnienie ma jeden jawny stan zajętości. Oba przyciski są odblokowywane w `finally`, a każdy odczyt dashboardu odtwarza prawidłowy stan także po zmianie profilu bez przeładowania WebView.
2. Animowany pasek startowy jest większy i pozycjonowany względem proporcji grafiki `360 × 648`, dzięki czemu zakrywa statyczny pasek również na wysokich, wąskich ekranach.
3. Modal usuwania profilu korzysta z `visualViewport`, ma przewijalną kartę i przyklejone przyciski akcji. Po otwarciu klawiatury pole PIN oraz przyciski pozostają dostępne.

## Kontrole automatyczne

- deterministyczny bundle: 28 modułów,
- jedno źródło transportu i sesji,
- brak `eval` i dynamicznego pobierania modułów,
- zgodność `dist` z zasobami Androida,
- kontrola architektury Androida, aparatu, przypomnień i monetyzacji,
- kontrola wersji `1.1.11` (`versionCode 14`),
- testy regresyjne dla nawodnienia, paska startowego i modalu usuwania profilu.
