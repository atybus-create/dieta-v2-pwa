const CACHE =
  'wiem-co-zre-m-ai-20260820-rebrand1';


const SHELL = [
  './',
  './index.html',
  './styles.css?v=20260814-13',
  './app.js?v=20260820-rebrand1',
  './pwa-login-safety.js?v=20260816-pwalogin1',
  './recovery-complete-message.js?v=20260816-recovery2',
  './theme-manager.js?v=20260815-theme1',
  './theme-light.css?v=20260815-theme1',
  './manifest.webmanifest?v=20260820-rebrand1',
  './icon.svg?v=20260820-rebrand1',
  './icon-192.png?v=20260820-rebrand1',
  './icon-512.png?v=20260820-rebrand1'
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
