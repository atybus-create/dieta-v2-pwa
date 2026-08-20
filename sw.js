const CACHE =
  'wiem-co-zre-m-ai-20260820-refresh1';


const SHELL = [
  './',
  './index.html',
  './styles.css?v=20260814-13',
  './app.js?v=20260820-refresh1',
  './pwa-login-safety.js?v=20260820-scroll1',
  './editor-portal.js?v=20260820-scroll1',
  './brand-redesign.css?v=20260820-brand2',
  './brand-redesign-polish.css?v=20260820-brand2',
  './brand-functional-fixes.css?v=20260820-fix2',
  './assets/static-splash-p1.txt?v=20260820-static1',
  './assets/static-splash-p2.txt?v=20260820-static1',
  './assets/static-splash-p3.txt?v=20260820-static1',
  './assets/static-splash-p4.txt?v=20260820-static1',
  './recovery-complete-message.js?v=20260816-recovery2',
  './theme-manager.js?v=20260815-theme1',
  './theme-light.css?v=20260815-theme1',
  './refresh-controller.js?v=20260820-refresh1',
  './manifest.webmanifest?v=20260820-pwa2',
  './icon.svg?v=20260820-monster1',
  './icon-192.png?v=20260820-monster1',
  './icon-512.png?v=20260820-monster1',
  './icon-maskable-512.png?v=20260820-monster1',
  './apple-touch-icon.png?v=20260820-monster1'
];


self.addEventListener(
  'install',
  event => {

    event.waitUntil(
      caches
        .open(CACHE)
        .then(
          cache =>
            cache.addAll(
              SHELL
            )
        )
        .then(
          () =>
            self.skipWaiting()
        )
    );

  }
);


self.addEventListener(
  'activate',
  event => {

    event.waitUntil(
      caches
        .keys()
        .then(
          keys =>
            Promise.all(
              keys
                .filter(
                  key =>
                    key !== CACHE
                )
                .map(
                  key =>
                    caches.delete(
                      key
                    )
                )
            )
        )
        .then(
          () =>
            self.clients.claim()
        )
    );

  }
);


self.addEventListener(
  'fetch',
  event => {

    const request =
      event.request;


    if (
      request.method !== 'GET'
    ) {
      return;
    }


    const url =
      new URL(
        request.url
      );


    if (
      url.origin !==
      self.location.origin
    ) {
      return;
    }


    if (
      request.mode === 'navigate'
    ) {

      event.respondWith(
        fetch(
          request,
          {
            cache:
              'no-store'
          }
        )
          .then(
            response => {

              const copy =
                response.clone();


              caches
                .open(CACHE)
                .then(
                  cache =>
                    cache.put(
                      './',
                      copy
                    )
                );


              return response;

            }
          )
          .catch(
            () =>
              caches.match(
                './'
              )
          )
      );


      return;
    }


    event.respondWith(
      fetch(
        request,
        {
          cache:
            'no-store'
        }
      )
        .then(
          response => {

            const copy =
              response.clone();


            caches
              .open(CACHE)
              .then(
                cache =>
                  cache.put(
                    request,
                    copy
                  )
              );


            return response;

          }
        )
          .catch(
            () =>
              caches.match(
                request
              )
          )
      );

  }
);
