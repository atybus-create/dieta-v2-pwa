(() => {
  const MAX_EDGE = 1280;
  const TARGET_BYTES = 900 * 1024;
  const MAX_ORIGINAL_FALLBACK_BYTES = 12 * 1024 * 1024;
  const JPEG_QUALITIES = [0.80, 0.68, 0.56];

  const style = document.createElement('style');
  style.id = 'photo-loading-visual-fix';
  style.textContent = `
    .loading-line {
      width: 198px !important;
      height: 7px !important;
    }
    .loading-line span {
      width: 42% !important;
      height: calc(100% + 2px) !important;
      margin-top: -1px !important;
    }
  `;
  document.head.appendChild(style);

  const nextPaint = () =>
    new Promise(resolve =>
      requestAnimationFrame(() =>
        requestAnimationFrame(resolve)
      )
    );

  const canSendOriginal = file => {
    if (!file || Number(file.size || 0) <= 0) return false;
    if (Number(file.size || 0) > MAX_ORIGINAL_FALLBACK_BYTES) return false;
    const type = String(file.type || '').toLowerCase();
    return !type || /^image\/(jpe?g|png|webp)$/.test(type);
  };

  const encodeJpeg = (canvas, quality) =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        value => value ? resolve(value) : reject(new Error('Nie udało się zakodować zdjęcia jako JPEG.')),
        'image/jpeg',
        quality
      );
    });

  async function optimizePhoto(file) {
    if (!file || !String(file.type || '').startsWith('image/')) {
      throw new Error('Wybrany plik nie jest zdjęciem.');
    }

    const isJpeg = /^image\/jpe?g$/i.test(String(file.type || ''));
    if (isJpeg && Number(file.size || 0) > 0 && Number(file.size || 0) <= TARGET_BYTES) {
      console.info('Photo upload: small JPEG, compression skipped', {
        bytes: file.size,
        type: file.type
      });
      return file;
    }

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
      if (!sourceWidth || !sourceHeight) {
        throw new Error('Nie udało się odczytać wymiarów zdjęcia.');
      }

      const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight));
      const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
      const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) {
        throw new Error('Nie udało się przygotować zdjęcia do wysłania.');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, targetWidth, targetHeight);
      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      let blob = null;
      let usedQuality = JPEG_QUALITIES[0];
      for (const quality of JPEG_QUALITIES) {
        usedQuality = quality;
        blob = await encodeJpeg(canvas, quality);
        if (blob.size <= TARGET_BYTES) break;
      }

      if (!blob) {
        throw new Error('Nie udało się przygotować zdjęcia do wysłania.');
      }

      const baseName = String(file.name || 'meal').replace(/\.[^.]+$/, '') || 'meal';
      const normalized = new File([blob], `${baseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      console.info('Photo normalized before upload', {
        originalType: file.type,
        originalBytes: file.size,
        normalizedType: normalized.type,
        normalizedBytes: normalized.size,
        sourceWidth,
        sourceHeight,
        targetWidth,
        targetHeight,
        jpegQuality: usedQuality
      });

      return normalized;
    } catch (error) {
      console.warn('Photo normalization failed, evaluating safe original fallback.', error);
      if (canSendOriginal(file)) {
        console.warn('Photo upload: using original image fallback', {
          type: file.type,
          bytes: file.size
        });
        return file;
      }
      throw new Error(
        Number(file?.size || 0) > MAX_ORIGINAL_FALLBACK_BYTES
          ? 'Zdjęcie jest zbyt duże. Zrób zdjęcie ponownie.'
          : 'Nie udało się przygotować zdjęcia. Zrób zdjęcie ponownie.'
      );
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

    if (typeof window.loading === 'function') {
      window.loading(
        true,
        'Analizuję zdjęcie…',
        'Przygotowuję zdjęcie i za chwilę wyślę je do AI.'
      );
    } else if (typeof loading === 'function') {
      loading(
        true,
        'Analizuję zdjęcie…',
        'Przygotowuję zdjęcie i za chwilę wyślę je do AI.'
      );
    }

    try {
      await nextPaint();
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
      if (typeof window.loading === 'function') window.loading(false);
      else if (typeof loading === 'function') loading(false);

      if (typeof window.toast === 'function') {
        window.toast(error?.message || 'Nie udało się przygotować zdjęcia.');
      } else if (typeof toast === 'function') {
        toast(error?.message || 'Nie udało się przygotować zdjęcia.');
      }

      input.value = '';
    }
  }, true);
})();
