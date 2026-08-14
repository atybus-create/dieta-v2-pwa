const CACHE =
  'ai-monitor-zywienia-20260814-11';


const SHELL = [
  './',
  './index.html',
  './styles.css?v=20260814-11',
  './app.js?v=20260814-11',
  './manifest.webmanifest?v=20260814-11',
  './icon.svg?v=20260814-11',
  './icon-192.png?v=20260814-11',
  './icon-512.png?v=20260814-11'
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


    /*
      API n8n pozostaje poza cache PWA.
    */

    if (
      url.origin !==
      self.location.origin
    ) {
      return;
    }


    /*
      Nawigacja:
      najpierw sieć, offline fallback do shell.
    */

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


    /*
      Assety:
      network first.
    */

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
