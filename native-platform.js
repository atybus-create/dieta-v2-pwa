(() => {
  'use strict';

  const diagnostics = [];
  const MAX_EVENTS = 60;

  function record(stage, details = {}) {
    const event = {
      at: new Date().toISOString(),
      stage: String(stage || 'unknown'),
      ...details
    };
    diagnostics.push(event);
    if (diagnostics.length > MAX_EVENTS) diagnostics.splice(0, diagnostics.length - MAX_EVENTS);
    try { console.info('[native]', event.stage, details); } catch (_) {}
    return event;
  }

  window.__WCZ_NATIVE_DIAGNOSTICS__ = diagnostics;
  window.getNativeDiagnostics = () => diagnostics.map(item => ({ ...item }));

  const hasAppBridge = Boolean(window.AndroidApp && typeof window.AndroidApp.getCapabilities === 'function');
  if (!hasAppBridge) {
    window.__WCZ_NATIVE_CAPABILITIES__ = Object.freeze({ platform: 'web', native: false });
    return;
  }

  let capabilities = {};
  try {
    capabilities = JSON.parse(String(window.AndroidApp.getCapabilities() || '{}')) || {};
  } catch (error) {
    record('capabilities_error', { message: String(error?.message || error) });
  }

  capabilities = Object.freeze({ platform: 'android', native: true, ...capabilities });
  window.__WCZ_NATIVE_CAPABILITIES__ = capabilities;
  window.__AI_MONITOR_NATIVE__ = true;
  window.__AI_MONITOR_STANDALONE_BUNDLE__ = Boolean(capabilities.standalone !== false);
  window.__WCZAI_MONETIZATION_TEST__ = Boolean(capabilities.monetizationTest !== false);
  document.documentElement.classList.add('native-wrapper');

  ['installFirstBtn', 'installHint', 'installBtn'].forEach(id => document.getElementById(id)?.remove());
  record('native_ready', {
    camera: Boolean(capabilities.camera),
    reminders: Boolean(capabilities.reminders),
    monetization: Boolean(capabilities.monetization),
    appVersion: String(capabilities.appVersion || ''),
    versionCode: Number(capabilities.versionCode || 0)
  });

  function showCameraError(message) {
    if (typeof loading === 'function') loading(false);
    if (message && typeof toast === 'function') toast(message);
  }

  window.__wczNativeCameraEvent = payload => {
    const data = payload && typeof payload === 'object' ? payload : { stage: 'native_event_invalid' };
    record(data.stage || 'native_event', {
      code: data.code ? String(data.code) : undefined,
      bytes: Number(data.bytes || 0) || undefined
    });
    if (data.stage === 'camera_error' || data.stage === 'camera_cancelled') {
      showCameraError(data.message || (data.stage === 'camera_cancelled' ? 'Anulowano robienie zdjęcia.' : 'Nie udało się zrobić zdjęcia.'));
    }
  };

  window.__wczNativeCameraPhoto = async (base64, mime, name) => {
    try {
      record('js_photo_received');
      const raw = atob(String(base64 || ''));
      if (!raw.length) throw new Error('Aparat zwrócił puste zdjęcie.');
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);

      const file = new File([bytes], String(name || 'meal.jpg'), {
        type: String(mime || 'image/jpeg'),
        lastModified: Date.now()
      });

      if (typeof window.analyzePhoto !== 'function') throw new Error('Brak funkcji analizy zdjęcia.');
      record('analyze_photo_sent', { bytes: file.size });
      await window.analyzePhoto(file);
      record('analyze_photo_result');
    } catch (error) {
      record('analyze_photo_error', { message: String(error?.message || error) });
      showCameraError(error?.message || 'Nie udało się przekazać zdjęcia do analizy.');
    }
  };

  function bindNativeCamera() {
    const input = document.getElementById('photoInput');
    const tile = input?.closest?.('.upload-photo') || input?.parentElement;
    const camera = window.AndroidCamera;
    if (!input || !tile || !capabilities.camera || !camera || typeof camera.captureMealPhoto !== 'function') {
      record('camera_unavailable');
      return;
    }
    if (tile.dataset.nativeCameraBound === '1') return;
    tile.dataset.nativeCameraBound = '1';

    tile.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      record('photo_click');
      if (typeof loading === 'function') {
        loading(true, 'Uruchamiam aparat…', 'Po zrobieniu zdjęcia rozpocznie się analiza AI.');
      }
      try {
        camera.captureMealPhoto();
      } catch (error) {
        record('camera_bridge_error', { message: String(error?.message || error) });
        showCameraError('Nie udało się uruchomić aparatu.');
      }
    }, true);

    record('camera_bound');
  }

  bindNativeCamera();
})();
