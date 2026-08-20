(() => {
  'use strict';

  const STYLE_ID = 'add-text-overlay-styles';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #viewAdd .upload-photo {
        border-color: rgba(244, 196, 84, .34) !important;
        background: linear-gradient(145deg, rgba(244,196,84,.11), rgba(11,24,27,.92)) !important;
        box-shadow: inset 3px 0 0 rgba(244,196,84,.58) !important;
      }
      #viewAdd .upload-photo .action-icon {
        color: #f4c454 !important;
        border-color: rgba(244,196,84,.22) !important;
        background: rgba(244,196,84,.09) !important;
      }
      #viewAdd .upload-photo .action-arrow { color: #f4c454 !important; }

      #viewAdd #showTextBtn {
        border-color: rgba(100, 174, 255, .36) !important;
        background: linear-gradient(145deg, rgba(100,174,255,.12), rgba(10,22,31,.94)) !important;
        box-shadow: inset 3px 0 0 rgba(100,174,255,.64) !important;
      }
      #viewAdd #showTextBtn .action-icon {
        color: #72b5ff !important;
        border-color: rgba(100,174,255,.24) !important;
        background: rgba(100,174,255,.10) !important;
      }
      #viewAdd #showTextBtn .action-arrow { color: #72b5ff !important; }

      body.manual-entry-open {
        overflow: hidden !important;
        overscroll-behavior: none;
      }

      #textPanel.manual-entry-expanded {
        position: fixed !important;
        z-index: 10040 !important;
        top: max(8px, env(safe-area-inset-top)) !important;
        right: 8px !important;
        bottom: max(8px, env(safe-area-inset-bottom)) !important;
        left: 8px !important;
        margin: 0 !important;
        padding: 22px 20px 24px !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
        border: 1px solid rgba(100,174,255,.40) !important;
        border-radius: 22px !important;
        background:
          radial-gradient(circle at 92% 5%, rgba(100,174,255,.18), transparent 28%),
          linear-gradient(155deg, rgba(17,35,47,.98), rgba(7,18,23,.99) 55%) !important;
        box-shadow:
          0 0 0 100vmax rgba(2,8,11,.80),
          0 26px 90px rgba(0,0,0,.52),
          inset 4px 0 0 rgba(100,174,255,.72) !important;
      }

      #textPanel.manual-entry-expanded .panel-heading {
        margin-top: 8px !important;
        margin-bottom: 24px !important;
      }
      #textPanel.manual-entry-expanded .panel-heading h3 {
        font-size: clamp(25px, 7vw, 34px) !important;
      }
      #textPanel.manual-entry-expanded .panel-heading p {
        font-size: 15px !important;
        line-height: 1.45 !important;
      }
      #textPanel.manual-entry-expanded > label {
        display: flex !important;
        flex: 1 1 auto !important;
        min-height: 0 !important;
        flex-direction: column !important;
        font-size: 15px !important;
        font-weight: 800 !important;
      }
      #textPanel.manual-entry-expanded #mealText {
        flex: 1 1 auto !important;
        min-height: 220px !important;
        max-height: none !important;
        margin-top: 10px !important;
        padding: 16px !important;
        resize: none !important;
        border-color: rgba(100,174,255,.28) !important;
        background: rgba(4,15,21,.62) !important;
        font-size: 17px !important;
        line-height: 1.5 !important;
      }
      #textPanel.manual-entry-expanded #analyzeTextBtn {
        min-height: 58px !important;
        margin-top: 18px !important;
        border: 1px solid rgba(100,174,255,.58) !important;
        background: #72b5ff !important;
        color: #071014 !important;
        font-size: 16px !important;
        font-weight: 900 !important;
      }

      .manual-entry-close {
        display: none;
      }
      #textPanel.manual-entry-expanded .manual-entry-close {
        display: block;
        position: sticky;
        top: 0;
        z-index: 3;
        width: 100%;
        min-height: 54px;
        margin: 0 0 16px;
        padding: 10px 16px;
        border: 1px solid rgba(100,174,255,.46);
        border-radius: 14px;
        background: rgba(28,78,120,.92);
        color: #eaf5ff;
        box-shadow: 0 8px 28px rgba(38,102,158,.24);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        font: inherit;
        font-size: 15px;
        font-weight: 900;
        text-align: left;
        cursor: pointer;
      }

      @media (min-width: 760px) {
        #textPanel.manual-entry-expanded {
          left: 50% !important;
          right: auto !important;
          width: min(720px, calc(100vw - 40px)) !important;
          transform: translateX(-50%);
        }
      }

      @media (max-width: 430px) {
        #textPanel.manual-entry-expanded {
          top: max(6px, env(safe-area-inset-top)) !important;
          right: 6px !important;
          bottom: max(6px, env(safe-area-inset-bottom)) !important;
          left: 6px !important;
          padding: 18px 16px 20px !important;
          border-radius: 18px !important;
        }
        #textPanel.manual-entry-expanded #mealText {
          min-height: 260px !important;
        }
        #textPanel.manual-entry-expanded .manual-entry-close {
          min-height: 58px;
          font-size: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function closeManualEntry({ hidePanel = true } = {}) {
    const panel = document.getElementById('textPanel');
    if (!panel) return;
    panel.classList.remove('manual-entry-expanded');
    document.body.classList.remove('manual-entry-open');
    if (hidePanel) panel.classList.add('hidden');
  }

  function openManualEntry() {
    const panel = document.getElementById('textPanel');
    if (!panel) return;
    panel.classList.remove('hidden');
    panel.classList.add('manual-entry-expanded');
    document.body.classList.add('manual-entry-open');
    requestAnimationFrame(() => {
      panel.scrollTop = 0;
      document.getElementById('mealText')?.focus({ preventScroll: true });
    });
  }

  function wire() {
    injectStyles();

    const button = document.getElementById('showTextBtn');
    const panel = document.getElementById('textPanel');
    const analyze = document.getElementById('analyzeTextBtn');
    if (!button || !panel) return;

    if (!panel.querySelector('.manual-entry-close')) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'manual-entry-close';
      close.textContent = '← Wróć do dodawania posiłku';
      close.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        closeManualEntry();
      });
      panel.prepend(close);
    }

    button.onclick = event => {
      event?.preventDefault?.();
      openManualEntry();
    };

    analyze?.addEventListener('click', () => {
      // The existing analyzer keeps its original handler. We only dismiss the
      // entry overlay so its result panel can become visible after analysis.
      window.setTimeout(() => closeManualEntry({ hidePanel: true }), 0);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && panel.classList.contains('manual-entry-expanded')) {
        event.preventDefault();
        closeManualEntry();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, { once: true });
  } else {
    wire();
  }
})();