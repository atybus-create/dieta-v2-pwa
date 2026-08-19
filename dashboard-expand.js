(() => {
  'use strict';

  const STYLE_ID = 'dashboardExpandStyles';
  const BACKDROP_ID = 'dashboardExpandBackdrop';
  const TARGET_SELECTOR = '#viewToday .calorie-card, #viewToday .macro-grid, #waterCard';
  const INTERACTIVE_SELECTOR = 'button, input, textarea, select, a, label, [role="button"]';
  const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  let expanded = null;
  let placeholder = null;
  let closing = false;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.dashboard-panel-open {
        overflow: hidden !important;
        overscroll-behavior: none;
      }

      .dashboard-expand-backdrop {
        position: fixed;
        inset: 0;
        z-index: 140;
        opacity: 0;
        background: rgba(2, 9, 12, .72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: opacity 240ms ease;
      }

      .dashboard-expand-backdrop.visible { opacity: 1; }

      #viewToday .calorie-card,
      #viewToday .macro-grid,
      #waterCard {
        cursor: zoom-in;
        -webkit-tap-highlight-color: transparent;
      }

      #viewToday .calorie-card:focus-visible,
      #viewToday .macro-grid:focus-visible,
      #waterCard:focus-visible {
        outline: 3px solid rgba(93, 234, 216, .55);
        outline-offset: 4px;
      }

      .dashboard-expand-placeholder {
        visibility: hidden !important;
        pointer-events: none !important;
      }

      #viewToday .dashboard-panel-expanded,
      #waterCard.dashboard-panel-expanded {
        position: fixed !important;
        z-index: 150 !important;
        margin: 0 !important;
        max-width: none !important;
        max-height: none !important;
        min-height: 0 !important;
        box-sizing: border-box !important;
        cursor: zoom-out !important;
        overflow: auto !important;
        overscroll-behavior: contain;
        border-radius: 28px !important;
        box-shadow: 0 30px 90px rgba(0, 0, 0, .52), inset 0 1px 0 rgba(255,255,255,.04) !important;
        transition:
          left 320ms cubic-bezier(.22,.8,.22,1),
          top 320ms cubic-bezier(.22,.8,.22,1),
          width 320ms cubic-bezier(.22,.8,.22,1),
          height 320ms cubic-bezier(.22,.8,.22,1),
          border-radius 320ms cubic-bezier(.22,.8,.22,1),
          box-shadow 320ms ease !important;
      }

      #viewToday .calorie-card.dashboard-panel-expanded {
        display: flex !important;
        flex-direction: column;
        justify-content: center;
        padding: clamp(24px, 6vw, 40px) !important;
      }

      #viewToday .calorie-card.dashboard-panel-expanded .summary-head,
      #viewToday .calorie-card.dashboard-panel-expanded .calorie-layout,
      #viewToday .calorie-card.dashboard-panel-expanded .progress-lg,
      #viewToday .calorie-card.dashboard-panel-expanded .remaining-row {
        width: 100%;
      }

      #viewToday .calorie-card.dashboard-panel-expanded .calorie-layout {
        margin: clamp(24px, 5vh, 42px) 0 !important;
      }

      #viewToday .calorie-card.dashboard-panel-expanded .kcal-main strong {
        font-size: clamp(68px, 19vw, 104px) !important;
      }

      #viewToday .calorie-card.dashboard-panel-expanded .calorie-ring {
        transform: scale(1.12) !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded {
        padding: 72px 14px 24px !important;
        align-items: stretch !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded .macro-card {
        min-height: 0 !important;
        height: 100% !important;
        display: flex !important;
        flex-direction: column;
        justify-content: center !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded .macro-name {
        font-size: clamp(12px, 3.5vw, 16px) !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded .macro-value b {
        font-size: clamp(34px, 9vw, 52px) !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded .macro-ring strong {
        font-size: clamp(18px, 5vw, 26px) !important;
      }

      #waterCard.dashboard-panel-expanded {
        display: flex !important;
        flex-direction: column;
        justify-content: center;
        padding: clamp(24px, 6vw, 40px) !important;
      }

      #waterCard.dashboard-panel-expanded .water-head,
      #waterCard.dashboard-panel-expanded .water-progress,
      #waterCard.dashboard-panel-expanded .water-progress-copy,
      #waterCard.dashboard-panel-expanded .water-actions,
      #waterCard.dashboard-panel-expanded #waterBreakdown {
        width: 100%;
      }

      #waterCard.dashboard-panel-expanded .water-value strong {
        font-size: clamp(28px, 8vw, 44px) !important;
      }

      #waterCard.dashboard-panel-expanded .water-progress {
        height: 15px !important;
        margin: clamp(26px, 6vh, 44px) 0 14px !important;
      }

      #waterCard.dashboard-panel-expanded .water-actions {
        margin-top: clamp(24px, 6vh, 42px) !important;
      }

      @media (max-width: 430px) {
        #viewToday .macro-grid.dashboard-panel-expanded {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          padding-left: 6px !important;
          padding-right: 6px !important;
        }

        #viewToday .macro-grid.dashboard-panel-expanded .macro-card {
          padding-left: 5px !important;
          padding-right: 5px !important;
        }

        #viewToday .calorie-card.dashboard-panel-expanded .calorie-ring {
          transform: scale(.98) !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .dashboard-expand-backdrop,
        #viewToday .dashboard-panel-expanded,
        #waterCard.dashboard-panel-expanded {
          transition-duration: 1ms !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getTarget(node) {
    return node?.closest?.(TARGET_SELECTOR) || null;
  }

  function isInteractive(node) {
    return Boolean(node?.closest?.(INTERACTIVE_SELECTOR));
  }

  function setAccessible(target) {
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '0');
    target.setAttribute('role', 'button');
    target.setAttribute('aria-expanded', target === expanded ? 'true' : 'false');
    if (!target.getAttribute('aria-label')) {
      if (target.matches('.calorie-card')) target.setAttribute('aria-label', 'Rozwiń panel kalorii');
      else if (target.matches('.macro-grid')) target.setAttribute('aria-label', 'Rozwiń panel makroelementów');
      else if (target.id === 'waterCard') target.setAttribute('aria-label', 'Rozwiń panel nawodnienia');
    }
  }

  function prepareTargets() {
    document.querySelectorAll(TARGET_SELECTOR).forEach(setAccessible);
  }

  function viewportBounds() {
    const gap = 12;
    const nav = document.querySelector('.bottom-nav');
    const navRect = nav?.getBoundingClientRect();
    const top = Math.max(gap, Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || gap);
    const bottom = navRect && navRect.top > window.innerHeight * .55
      ? Math.max(top + 240, navRect.top - gap)
      : window.innerHeight - gap;

    return {
      left: gap,
      top,
      width: Math.max(280, window.innerWidth - gap * 2),
      height: Math.max(240, bottom - top)
    };
  }

  function ensureBackdrop() {
    let backdrop = document.getElementById(BACKDROP_ID);
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.className = 'dashboard-expand-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', collapse);
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function applyRect(target, rect) {
    target.style.left = `${Math.round(rect.left)}px`;
    target.style.top = `${Math.round(rect.top)}px`;
    target.style.width = `${Math.round(rect.width)}px`;
    target.style.height = `${Math.round(rect.height)}px`;
  }

  function createPlaceholder(target, rect) {
    const holder = document.createElement('div');
    holder.className = 'dashboard-expand-placeholder';
    holder.style.width = `${rect.width}px`;
    holder.style.height = `${rect.height}px`;
    holder.style.marginTop = getComputedStyle(target).marginTop;
    holder.style.marginBottom = getComputedStyle(target).marginBottom;
    target.parentNode?.insertBefore(holder, target);
    return holder;
  }

  function clearInlineGeometry(target) {
    ['left', 'top', 'width', 'height'].forEach(prop => target.style.removeProperty(prop));
  }

  function expand(target) {
    if (!target || expanded || closing) return;

    const start = target.getBoundingClientRect();
    if (!start.width || !start.height) return;

    expanded = target;
    placeholder = createPlaceholder(target, start);
    document.body.classList.add('dashboard-panel-open');

    const backdrop = ensureBackdrop();
    target.classList.add('dashboard-panel-expanded');
    target.setAttribute('aria-expanded', 'true');
    applyRect(target, start);

    // Force the fixed start geometry to paint before animating to the viewport bounds.
    void target.offsetWidth;
    requestAnimationFrame(() => {
      backdrop.classList.add('visible');
      applyRect(target, viewportBounds());
    });
  }

  function finishCollapse(target) {
    clearInlineGeometry(target);
    target.classList.remove('dashboard-panel-expanded');
    target.setAttribute('aria-expanded', 'false');
    placeholder?.remove();
    placeholder = null;
    expanded = null;
    closing = false;
    document.body.classList.remove('dashboard-panel-open');

    const backdrop = document.getElementById(BACKDROP_ID);
    backdrop?.classList.remove('visible');
    window.setTimeout(() => backdrop?.remove(), REDUCED_MOTION ? 0 : 250);
  }

  function collapse() {
    if (!expanded || closing) return;
    const target = expanded;
    const end = placeholder?.getBoundingClientRect();
    closing = true;

    document.getElementById(BACKDROP_ID)?.classList.remove('visible');

    if (!end || !end.width || !end.height || REDUCED_MOTION) {
      finishCollapse(target);
      return;
    }

    applyRect(target, end);
    window.setTimeout(() => finishCollapse(target), 340);
  }

  function toggle(target) {
    if (target === expanded) collapse();
    else if (!expanded) expand(target);
  }

  document.addEventListener('click', event => {
    const target = getTarget(event.target);
    if (!target) return;

    // Controls inside cards (notably hydration buttons) keep their normal behavior.
    if (isInteractive(event.target) && event.target !== target) return;

    event.preventDefault();
    toggle(target);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      collapse();
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = getTarget(event.target);
    if (!target || event.target !== target) return;
    event.preventDefault();
    toggle(target);
  });

  window.addEventListener('resize', () => {
    if (expanded && !closing) applyRect(expanded, viewportBounds());
  });

  const observer = new MutationObserver(prepareTargets);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  injectStyles();
  prepareTargets();
})();
