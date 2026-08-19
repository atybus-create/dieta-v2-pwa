(() => {
  const MAX_EDGE = 1600;
  const JPEG_QUALITY = 0.80;
  const SMALL_JPEG_BYTES = 900 * 1024;

  async function optimizePhoto(file) {
    if (!file || !String(file.type || '').startsWith('image/')) return file;

    const isJpeg = /image\/jpe?g/i.test(String(file.type || ''));
    if (isJpeg && Number(file.size || 0) <= SMALL_JPEG_BYTES) return file;

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Nie udało się odczytać zdjęcia.'));
        img.src = objectUrl;
      });

      const sourceWidth = Number(image.naturalWidth || image.width || 0);
      const sourceHeight = Number(image.naturalHeight || image.height || 0);
      if (!sourceWidth || !sourceHeight) return file;

      const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight));
      const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
      const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return file;

      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
      );
      if (!blob) return file;

      if (blob.size >= file.size) return file;

      const baseName = String(file.name || 'meal').replace(/\.[^.]+$/, '') || 'meal';
      const optimized = new File([blob], `${baseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      console.info('Photo optimized before upload', {
        originalBytes: file.size,
        optimizedBytes: optimized.size,
        sourceWidth,
        sourceHeight,
        targetWidth,
        targetHeight
      });

      return optimized;
    } catch (error) {
      console.warn('Photo optimization failed; sending original file.', error);
      return file;
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  document.addEventListener('change', async event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'photoInput') return;

    const file = input.files?.[0];
    if (!file) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      const optimized = await optimizePhoto(file);
      if (typeof window.analyzePhoto === 'function') {
        await window.analyzePhoto(optimized);
      } else if (typeof analyzePhoto === 'function') {
        await analyzePhoto(optimized);
      } else {
        throw new Error('Brak funkcji analizy zdjęcia.');
      }
    } catch (error) {
      console.error('Photo compression bridge failed.', error);
      if (typeof window.toast === 'function') {
        window.toast(error?.message || 'Nie udało się przygotować zdjęcia.');
      }
    }
  }, true);
})();
