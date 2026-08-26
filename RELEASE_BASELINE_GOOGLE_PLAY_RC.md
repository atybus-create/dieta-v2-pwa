# Google Play RC — baseline Etapu 2

Data utworzenia: 2026-08-26

## Cel

Ta gałąź jest jedyną bazą roboczą do dalszej przebudowy przed finalnymi testami Google Play. Etap 2 nie zmienia logiki działania aplikacji. Jego celem jest zebranie pełnego aktualnego stanu w jednej kontrolowanej linii oraz zachowanie jednoznacznego rollbacku.

## Gałąź RC

- `release/google-play-rc`
- utworzona z pełnej gałęzi `test-complete-1-1-10-native-camera`
- bazowy commit funkcjonalny: `ae3878b8acea5c9253ff1402f56305d14d676de3`

## Łańcuch funkcjonalny

Porównanie commitów potwierdziło liniową historię bez rozjazdu:

- `main` — commit bazowy `96127833d57ae162e043fcca33c9459fe6d9f861`
- `test-complete-1-1-8` — `c9c0ac765359c84d7bc87a1d611ec4476617aadf`, 19 commitów przed `main`
- `test-complete-1-1-9-photo-fix` — `41f9da3ecfff52da19a51d191a95733f63071b9f`, 7 commitów przed 1.1.8
- `test-complete-1-1-10-native-camera` — `ae3878b8acea5c9253ff1402f56305d14d676de3`, 3 commity przed 1.1.9

Wniosek: 1.1.10 zawiera funkcjonalności 1.1.8 i 1.1.9, więc nie wykonujemy ręcznego cherry-pick/merge tych gałęzi.

## Rollback

Nienaruszalny punkt powrotu Etapu 2:

`ae3878b8acea5c9253ff1402f56305d14d676de3`

W razie problemu gałąź RC można odtworzyć dokładnie z tego SHA. Gałęzie `main`, `test-complete-1-1-8`, `test-complete-1-1-9-photo-fix` i `test-complete-1-1-10-native-camera` nie są modyfikowane w Etapie 2.

## Stan funkcjonalny przejęty do RC

RC przejmuje aktualny komplet frontendu/PWA oraz Androida z 1.1.10, w tym istniejące mechanizmy:

- rejestracja i logowanie,
- PIN i odzyskiwanie dostępu,
- regulaminy i zgoda AI,
- analiza tekstu i zdjęcia,
- korekty składników/gramatur,
- historia i edycja posiłków,
- woda i cele,
- ulubione,
- motyw,
- usunięcie profilu,
- monetyzacja testowa,
- przypomnienia Android,
- PWA/offline/instalacja,
- native camera z 1.1.10.

## Znane problemy świadomie pozostawione do kolejnych etapów

Nie rozwiązujemy ich w Etapie 2, aby nie mieszać utworzenia bezpiecznej bazy z przebudową logiki:

- 29 modułów ładowanych dynamicznie przez bootstrap oraz `eval`,
- wielokrotne nadpisywanie tych samych funkcji (`api`, `post`, `createUser`, `enterApp` itd.),
- dwa mechanizmy aparatu po stronie Androida,
- rozbieżne numery wersji raportowane w różnych plikach,
- duplikacja frontendu w katalogu głównym i `android-app/app/src/main/assets/www`,
- osobny/stary endpoint recovery w kodzie źródłowym, podmieniany dziś przez bootstrap,
- rozproszone wersjonowanie cache/service workera.

Te punkty są przedmiotem Etapu 3–5.

## Kryterium zamknięcia Etapu 2

1. Istnieje jedna gałąź `release/google-play-rc` oparta na pełnej 1.1.10.
2. Jest zachowany jednoznaczny rollback SHA.
3. `main` i wcześniejsze gałęzie pozostają bez zmian.
4. GitHub Actions potrafi zbudować APK/AAB bezpośrednio z gałęzi RC.
5. Poza konfiguracją CI i tym dokumentem nie zmieniamy logiki runtime aplikacji.
