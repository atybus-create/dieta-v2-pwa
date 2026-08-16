(() => {
  const capacitor = window.Capacitor;
  const isNative = Boolean(
    capacitor && (
      (typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform()) ||
      (typeof capacitor.getPlatform === 'function' && capacitor.getPlatform() !== 'web')
    )
  );

  if (!isNative) return;

  async function captureMealPhoto(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'photoInput') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const camera = capacitor.Plugins?.Camera;
    if (!camera?.getPhoto) {
      console.error('Native camera plugin unavailable.');
      if (typeof window.toast === 'function') {
        window.toast('Nie udało się uruchomić aparatu.');
      }
      return;
    }

    try {
      const photo = await camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: 'uri',
        source: 'CAMERA',
        direction: 'REAR',
        correctOrientation: true,
        saveToGallery: false
      });

      const webPath = photo?.webPath;
      if (!webPath) throw new Error('Aparat nie zwrócił zdjęcia.');

      const response = await fetch(webPath);
      if (!response.ok) throw new Error('Nie udało się odczytać zdjęcia z aparatu.');
      const blob = await response.blob();
      const type = blob.type || 'image/jpeg';
      const extension = type.includes('png') ? 'png' : 'jpg';
      const file = new File([blob], `meal-${Date.now()}.${extension}`, {
        type,
        lastModified: Date.now()
      });

      if (typeof window.__prepareAndAnalyzePhoto !== 'function') {
        throw new Error('Brak modułu przygotowania zdjęcia.');
      }

      await window.__prepareAndAnalyzePhoto(file);
    } catch (error) {
      const message = String(error?.message || '');
      const cancelled = /cancel|canceled|cancelled|user cancelled|user canceled/i.test(message);
      if (cancelled) return;

      console.error('Native camera capture failed.', error);
      if (typeof window.toast === 'function') {
        window.toast(message || 'Nie udało się uruchomić aparatu.');
      }
    }
  }

  document.addEventListener('click', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'photoInput') return;
    captureMealPhoto(event);
  }, true);
})();
