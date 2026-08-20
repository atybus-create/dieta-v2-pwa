(() => {
  'use strict';

  document.addEventListener('click', event => {
    const article = event.target?.closest?.('#favoritesList article.favorite-editor-card');
    if (!article) return;

    if (event.target.closest('button, input, textarea, select, a, label, .favorite-editor-body')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    article.classList.toggle('is-expanded');
  }, true);
})();