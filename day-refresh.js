(() => {
  'use strict';

  try {
    const INACTIVITY_REFRESH_MS = 30 * 60 * 1000;
    const MIDNIGHT_GRACE_MS = 5000;

    let lastActiveAt = Date.now();
    let lastLocalDate = localDateKey();
    let refreshPending = false;
    let refreshBusy = false;
    let midnightTimer = null;

    function localDateKey(date = new Date()) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function isLoggedIn() {
      return Boolean(state?.token);
    }

    function isTodayViewActive() {
      return document.getElementById('viewToday')?.classList.contains('active') === true;
    }

    async function refreshDashboard(reason) {
      if (!isLoggedIn() || refreshBusy) return;

      if (!isTodayViewActive()) {
        refreshPending = true;
        return;
      }

      refreshBusy = true;
      refreshPending = false;

      try {
        await loadDashboard();
        console.info(`Dashboard refreshed automatically: ${reason}`);
      } catch (error) {
        console.warn('Automatic dashboard refresh failed.', error);
      } finally {
        refreshBusy = false;
      }
    }

    async function checkForRefresh(reason = 'resume') {
      try {
        const now = Date.now();
        const today = localDateKey();
        const dateChanged = today !== lastLocalDate;
        const inactiveLongEnough = (now - lastActiveAt) >= INACTIVITY_REFRESH_MS;

        lastLocalDate = today;
        lastActiveAt = now;

        if (dateChanged) {
          await refreshDashboard(`${reason}:date-changed`);
        } else if (inactiveLongEnough) {
          await refreshDashboard(`${reason}:inactive-30m`);
        } else if (refreshPending && isTodayViewActive()) {
          await refreshDashboard(`${reason}:pending`);
        }

        scheduleMidnightRefresh();
      } catch (error) {
        console.warn('Automatic refresh check failed.', error);
      }
    }

    function markInactive() {
      lastActiveAt = Date.now();
    }

    function scheduleMidnightRefresh() {
      try {
        if (midnightTimer) clearTimeout(midnightTimer);

        const now = new Date();
        const nextMidnight = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
          0,
          0,
          0,
          MIDNIGHT_GRACE_MS
        );

        const delay = Math.max(1000, nextMidnight.getTime() - now.getTime());

        midnightTimer = setTimeout(async () => {
          try {
            lastLocalDate = localDateKey();
            await refreshDashboard('midnight');
          } finally {
            scheduleMidnightRefresh();
          }
        }, delay);
      } catch (error) {
        console.warn('Midnight refresh scheduling failed.', error);
      }
    }

    const baseNavForDayRefresh = nav;
    nav = function dayRefreshNav(name) {
      const result = baseNavForDayRefresh(name);
      if (name === 'today' && refreshPending) {
        setTimeout(() => {
          refreshDashboard('today-opened').catch(error =>
            console.warn('Pending dashboard refresh failed.', error)
          );
        }, 0);
      }
      return result;
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        markInactive();
        return;
      }

      if (document.visibilityState === 'visible') {
        checkForRefresh('visibility');
      }
    });

    window.addEventListener('focus', () => {
      checkForRefresh('focus');
    });

    const capacitor = window.Capacitor;
    const appPlugin = capacitor?.Plugins?.App;
    if (appPlugin?.addListener) {
      try {
        const listenerResult = appPlugin.addListener('appStateChange', ({ isActive }) => {
          if (isActive) checkForRefresh('app-state');
          else markInactive();
        });

        Promise.resolve(listenerResult).catch(error => {
          console.warn('App state refresh listener could not be attached.', error);
        });
      } catch (error) {
        console.warn('App state refresh listener could not be attached.', error);
      }
    }

    scheduleMidnightRefresh();
  } catch (error) {
    console.warn('Automatic day refresh module disabled after initialization error.', error);
  }
})();
