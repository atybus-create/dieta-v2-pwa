(() => {
  'use strict';

  const PORTAL_CLASS = 'editor-portal-active';
  const records = new WeakMap();

  function isOpenEditor(el) {
    if (!el?.classList) return false;
    return el.classList.contains('is-meal-expanded') || el.classList.contains('is-expanded');
  }

  function isSupportedEditor(el) {
    return el?.matches?.('.today-meal-editor-card, .favorite-editor-card');
  }

  function findFallbackParent(el) {
    if (el.classList.contains('today-meal-editor-card')) {
      return document.getElementById('todayMeals');
    }
    if (el.classList.contains('favorite-editor-card')) {
      return document.getElementById('favoritesList');
    }
    return null;
  }

  function portal(el) {
    if (!isSupportedEditor(el) || records.has(el) || !isOpenEditor(el)) return;
    const parent = el.parentNode;
    if (!parent || parent === document.body) return;

    const marker = document.createComment('editor-portal-anchor');
    parent.insertBefore(marker, el);
    records.set(el, { marker, parent });

    el.classList.add(PORTAL_CLASS);
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.scrollTop = 0;
    });
  }

  function restore(el) {
    const record = records.get(el);
    if (!record) return;

    el.classList.remove(PORTAL_CLASS);

    if (record.marker?.isConnected && record.marker.parentNode) {
      record.marker.parentNode.insertBefore(el, record.marker);
      record.marker.remove();
    } else {
      const fallback = record.parent?.isConnected ? record.parent : findFallbackParent(el);
      fallback?.appendChild(el);
    }

    records.delete(el);
  }

  function syncElement(el) {
    if (!isSupportedEditor(el)) return;
    if (isOpenEditor(el)) portal(el);
    else restore(el);
  }

  function scan(root = document) {
    if (root?.nodeType === Node.ELEMENT_NODE && isSupportedEditor(root)) syncElement(root);
    root?.querySelectorAll?.('.today-meal-editor-card, .favorite-editor-card').forEach(syncElement);
  }

  const style = document.createElement('style');
  style.id = 'editor-portal-styles';
  style.textContent = `
    body.today-meal-editor-open,
    body.favorite-editor-open {
      overflow: hidden !important;
      touch-action: auto !important;
    }

    body > .today-meal-editor-card.editor-portal-active.is-meal-expanded,
    body > .favorite-editor-card.editor-portal-active.is-expanded {
      position: fixed !important;
      z-index: 10080 !important;
      top: max(6px, env(safe-area-inset-top)) !important;
      right: 6px !important;
      bottom: max(6px, env(safe-area-inset-bottom)) !important;
      left: 6px !important;
      width: auto !important;
      height: auto !important;
      min-height: 0 !important;
      max-width: none !important;
      max-height: none !important;
      margin: 0 !important;
      transform: none !important;
      overflow-x: hidden !important;
      overflow-y: scroll !important;
      touch-action: pan-y !important;
      overscroll-behavior-y: contain !important;
      -webkit-overflow-scrolling: touch;
      box-sizing: border-box !important;
    }

    body > .editor-portal-active .today-meal-editor-body,
    body > .editor-portal-active .favorite-editor-body,
    body > .editor-portal-active .today-meal-items,
    body > .editor-portal-active .favorite-editor-items {
      touch-action: pan-y !important;
    }

    @media (min-width: 760px) {
      body > .today-meal-editor-card.editor-portal-active.is-meal-expanded,
      body > .favorite-editor-card.editor-portal-active.is-expanded {
        left: 50% !important;
        right: auto !important;
        width: min(720px, calc(100vw - 40px)) !important;
        transform: translateX(-50%) !important;
      }
    }
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        syncElement(mutation.target);
        continue;
      }
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      });
    }
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class']
  });

  scan();
})();
