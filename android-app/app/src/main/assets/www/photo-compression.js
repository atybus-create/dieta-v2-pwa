(() => {
  'use strict';

  const MAX_EDGE = 1280;
  const TARGET_BYTES = 900 * 1024;
  const MAX_ORIGINAL_FALLBACK_BYTES = 12 * 1024 * 1024;
  const JPEG_QUALITIES = [0.80, 0.68, 0.56];

  const style = document.createElement('style');
  style.id = 'photo-loading-visual-fix';
  style.textContent = `
    .loading-line { width: 198px !important; height: 7px !important; }
    .loading-line span { width: 42% !important; height: calc(100% + 2px) !important; margin-top: -1px !important; }
  `;
  if (!document.getElementById(style.id)) document.head.appendChild(style);

  const nextPaint = () => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  );

  const fileType = file => String(file?.type || '').trim().toLowerCase();
  const fileName = file => String(file?.name || '').trim().toLowerCase();

  const looksLikeImage = file => {
    if (!file) return false;
    const type = fileType(file);
    const name = fileName(file);
    if (type.startsWith('image/')) return true;
    if (/\.(jpe?g|png|webp|heic|heif)$/i.test(name)) return true;
    return type === '' && Number(file.size || 0) > 0;
  };

  const canSendOriginal = file =>
    looksLikeImage(file) &&
    Number(file?.size || 0) > 0 &&
    Number(file?.size || 0) <= MAX_ORIGINAL_FALLBACK_BYTES;

  const isSmallJpeg = file => {
    const type = fileType(file);
    const name = fileName(file);
    const jpeg = /^image\/jpe?g$/i.test(type) || (!type && /\.jpe?g$/i.test(name));
    return jpeg && Number(file?.size || 0) > 0 && Number(file.size) <= TARGET_BYTES;
  };

  const encodeJpeg = (canvas, quality) => new Promise((resolve, reject) => {
    canvas.toBlob(
      value => value ? resolve(value) : reject(new Error('Nie udało się zakodować zdjęcia jako JPEG.')),
      'image/jpeg',
      quality
    );
  });

  async function optimizePhoto(file) {
    if (!looksLikeImage(file)) throw new Error('Wybrany plik nie jest zdjęciem.');
    if (isSmallJpeg(file)) return file;

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
      if (!sourceWidth || !sourceHeight) throw new Error('Nie udało się odczytać wymiarów zdjęcia.');

      const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight));
      const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
      const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Nie udało się przygotować zdjęcia do wysłania.');

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, targetWidth, targetHeight);
      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      let blob = null;
      for (const quality of JPEG_QUALITIES) {
        blob = await encodeJpeg(canvas, quality);
        if (blob.size <= TARGET_BYTES) break;
      }
      if (!blob) throw new Error('Nie udało się przygotować zdjęcia do wysłania.');

      const baseName = String(file.name || 'meal').replace(/\.[^.]+$/, '') || 'meal';
      return new File([blob], `${baseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  if (typeof analyzePhoto !== 'function') {
    console.error('Photo preprocessing: analyzePhoto is unavailable.');
    return;
  }

  const baseAnalyzePhoto = analyzePhoto;

  analyzePhoto = async function resilientAnalyzePhoto(file) {
    if (!file) return baseAnalyzePhoto(file);

    let uploadFile = file;
    try {
      if (typeof loading === 'function') {
        loading(true, 'Analizuję zdjęcie…', 'Przygotowuję zdjęcie do wysłania.');
      }
      await nextPaint();

      try {
        uploadFile = await optimizePhoto(file);
      } catch (error) {
        console.warn('Photo preprocessing failed; checking original fallback.', error);
        if (!canSendOriginal(file)) {
          throw new Error(
            Number(file?.size || 0) > MAX_ORIGINAL_FALLBACK_BYTES
              ? 'Zdjęcie jest zbyt duże. Zrób zdjęcie ponownie.'
              : 'Nie udało się odczytać zdjęcia. Zrób zdjęcie ponownie.'
          );
        }
        uploadFile = file;
      }

      return await baseAnalyzePhoto(uploadFile);
    } catch (error) {
      if (typeof loading === 'function') loading(false);
      if (typeof toast === 'function') toast(error?.message || 'Nie udało się przeanalizować zdjęcia.');
      console.error('Photo analysis wrapper failed.', error);
      return undefined;
    }
  };

  window.analyzePhoto = analyzePhoto;
})();
