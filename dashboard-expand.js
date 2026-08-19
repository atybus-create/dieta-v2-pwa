(() => {
  'use strict';

  const STYLE_ID = 'dashboardExpandStyles';
  const BACKDROP_ID = 'dashboardExpandBackdrop';
  const TARGET_SELECTOR = '#viewToday .calorie-card, #viewToday .macro-grid, #waterCard';
  const INTERACTIVE_SELECTOR = 'button, input, textarea, select, a, label';
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
        background: rgba(2, 9, 12, .68);
        backdrop-filter: blur(7px) saturate(.72);
        -webkit-backdrop-filter: blur(7px) saturate(.72);
        transition: opacity 220ms ease;
      }

      .dashboard-expand-backdrop.visible { opacity: 1; }

      #viewToday .calorie-card,
      #viewToday .macro-grid,
      #waterCard {
        cursor: pointer;
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      #viewToday .calorie-card:focus-visible,
      #viewToday .macro-grid:focus-visible,
      #waterCard:focus-visible {
        outline: 3px solid rgba(93, 234, 216, .52);
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
        min-height: 0 !important;
        max-width: none !important;
        max-height: none !important;
        box-sizing: border-box !important;
        cursor: pointer !important;
        overflow: hidden !important;
        overscroll-behavior: contain;
        border-radius: 28px !important;
        box-shadow:
          0 28px 78px rgba(0, 0, 0, .48),
          0 0 0 1px rgba(255,255,255,.025),
          inset 0 1px 0 rgba(255,255,255,.04) !important;
        transition:
          left 290ms cubic-bezier(.2,.82,.2,1),
          top 290ms cubic-bezier(.2,.82,.2,1),
          width 290ms cubic-bezier(.2,.82,.2,1),
          height 290ms cubic-bezier(.2,.82,.2,1),
          border-radius 290ms cubic-bezier(.2,.82,.2,1),
          box-shadow 290ms ease !important;
      }

      #viewToday .calorie-card.dashboard-panel-expanded {
        display: flex !important;
        flex-direction: column;
        justify-content: center !important;
        padding: clamp(22px, 6vw, 36px) !important;
      }

      #viewToday .calorie-card.dashboard-panel-expanded .summary-head,
      #viewToday .calorie-card.dashboard-panel-expanded .calorie-layout,
      #viewToday .calorie-card.dashboard-panel-expanded .progress-lg,
      #viewToday .calorie-card.dashboard-panel-expanded .remaining-row {
        width: 100%;
      }

      #viewToday .calorie-card.dashboard-panel-expanded .calorie-layout {
        margin: 24px 0 22px !important;
      }

      #viewToday .calorie-card.dashboard-panel-expanded .kcal-main strong {
        font-size: clamp(64px, 18vw, 96px) !important;
      }

      #viewToday .calorie-card.dashboard-panel-expanded .calorie-ring {
        transform: scale(1.04) !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded {
        padding: 60px 8px 18px !important;
        align-items: stretch !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded::before {
        top: 20px !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded .macro-card {
        min-height: 0 !important;
        height: auto !important;
        padding: 10px 8px 14px !important;
        display: flex !important;
        flex-direction: column;
        justify-content: center !important;
        gap: 8px;
      }

      #viewToday .macro-grid.dashboard-panel-expanded .macro-name {
        font-size: clamp(11px, 3.3vw, 15px) !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded .macro-heading small {
        font-size: 11px !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded .macro-value {
        margin-top: 8px !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded .macro-value b {
        font-size: clamp(34px, 9vw, 48px) !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded .macro-ring strong {
        font-size: clamp(18px, 5vw, 24px) !important;
      }

      #viewToday .macro-grid.dashboard-panel-expanded .mini-progress {
        margin-top: 14px !important;
      }

      #waterCard.dashboard-panel-expanded {
        display: flex !important;
        flex-direction: column;
        justify-content: center !important;
        padding: clamp(22px, 6vw, 34px) !important;
      }

      #waterCard.dashboard-panel-expanded .water-head,
      #waterCard.dashboard-panel-expanded .water-progress,
      #waterCard.dashboard-panel-expanded .water-progress-copy,
      #waterCard.dashboard-panel-expanded .water-actions,
      #waterCard.dashboard-panel-expanded #waterBreakdown {
        width: 100%;
      }

      #waterCard.dashboard-panel-expanded .water-value strong {
        font-size: clamp(28px, 8vw, 40px) !important;
      }

      #waterCard.dashboard-panel-expanded .water-progress {
        height: 14px !important;
        margin: 28px 0 12px !important;
      }

      #waterCard.dashboard-panel-expanded .water-actions {
        margin-top: 26px !important;
      }

      #waterCard.dashboard-panel-expanded .water-add,
      #waterCard.dashboard-panel-expanded .water-undo {
        min-height: 52px !important;
      }

      @media (max-width: 430px) {
        #viewToday .macro-grid.dashboard-panel-expanded {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          padding-left: 4px !important;
          padding-right: 4px !important;
        }

        #viewToday .macro-grid.dashboard-panel-expanded .macro-card {
          padding-left: 4px !important;
          padding-right: 4px !important;
        }

        #viewToday .calorie-card.dashboard-panel-expanded .calorie-ring {
          transform: scale(.92) !important;
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

  function availableViewport() {
    const side = 12;
    const top = 14;
    const nav = document.querySelector('.bottom-nav');
    const navRect = nav?.getBoundingClientRect();
    const bottom = navRect && navRect.top > window.innerHeight * .52
      ? navRect.top - 12
      : window.innerHeight - 12;

    return {
      left: side,
      top,
      width: Math.max(280, window.innerWidth - side * 2),
      height: Math.max(360, bottom - top)
    };
  }

  function expandedBounds(target) {
    const vp = availableViewport();
    const width = vp.width;
    let wantedHeight;

    if (target.matches('.calorie-card')) {
      wantedHeight = Math.max(460, Math.min(590, width * 1.42));
    } else if (target.matches('.macro-grid')) {
      wantedHeight = Math.max(480, Math.min(610, width * 1.48));
    } else {
      wantedHeight = Math.max(540, Math.min(680, width * 1.62));
    }

    const height = Math.min(vp.height, wantedHeight);
    const top = vp.top + Math.max(0, (vp.height - height) / 2);

    return { left: vp.left, top, width, height };
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

    void target.offsetWidth;
    requestAnimationFrame(() => {
      backdrop.classList.add('visible');
      applyRect(target, expandedBounds(target));
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
    window.setTimeout(() => backdrop?.remove(), REDUCED_MOTION ? 0 : 230);
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
    window.setTimeout(() => finishCollapse(target), 310);
  }

  function toggle(target) {
    if (target === expanded) collapse();
    else if (!expanded) expand(target);
  }

  document.addEventListener('click', event => {
    const target = getTarget(event.target);
    if (!target) return;

    // Real controls inside a card keep their action. Every other point inside the
    // card — text, numbers, progress bars, icons and blank space — toggles it.
    const innerControl = event.target?.closest?.(INTERACTIVE_SELECTOR);
    if (innerControl && innerControl !== target) return;

    event.preventDefault();
    toggle(target);
  }, { passive: false });

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
    if (expanded && !closing) applyRect(expanded, expandedBounds(expanded));
  });

  const observer = new MutationObserver(prepareTargets);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  injectStyles();
  prepareTargets();
})();
