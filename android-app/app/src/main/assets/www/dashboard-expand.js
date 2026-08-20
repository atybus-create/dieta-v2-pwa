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
      body.dashboard-panel-open { overflow:hidden!important; overscroll-behavior:none; }
      .dashboard-expand-backdrop { position:fixed; inset:0; z-index:140; opacity:0; background:rgba(2,9,12,.72); backdrop-filter:blur(8px) saturate(.72); -webkit-backdrop-filter:blur(8px) saturate(.72); transition:opacity 220ms ease; }
      .dashboard-expand-backdrop.visible { opacity:1; }
      #viewToday .calorie-card, #viewToday .macro-grid, #waterCard { cursor:pointer; touch-action:manipulation; -webkit-tap-highlight-color:transparent; }
      .dashboard-expand-placeholder { visibility:hidden!important; pointer-events:none!important; }
      #viewToday .dashboard-panel-expanded, #waterCard.dashboard-panel-expanded { position:fixed!important; z-index:150!important; margin:0!important; min-height:0!important; max-width:none!important; max-height:none!important; box-sizing:border-box!important; overflow:hidden!important; cursor:zoom-out!important; border-radius:28px!important; box-shadow:0 30px 90px rgba(0,0,0,.52), inset 0 1px 0 rgba(255,255,255,.04)!important; transition:left 300ms cubic-bezier(.2,.82,.2,1), top 300ms cubic-bezier(.2,.82,.2,1), width 300ms cubic-bezier(.2,.82,.2,1), height 300ms cubic-bezier(.2,.82,.2,1), border-radius 300ms ease, box-shadow 300ms ease!important; }
      .dashboard-panel-expanded::after { content:'Dotknij, aby zwinąć  ⌃'; position:absolute; left:50%; bottom:15px; transform:translateX(-50%); z-index:5; padding:7px 12px; border:1px solid rgba(150,190,190,.16); border-radius:999px; background:rgba(4,17,21,.62); color:rgba(210,229,229,.62); font-size:11px; font-weight:750; letter-spacing:.02em; white-space:nowrap; pointer-events:none; }

      /* Calories — accepted state, unchanged. */
      #viewToday .calorie-card.dashboard-panel-expanded { display:flex!important; flex-direction:column; justify-content:center!important; padding:30px 28px 52px!important; }
      #viewToday .calorie-card.dashboard-panel-expanded .summary-head { margin:0 0 22px!important; }
      #viewToday .calorie-card.dashboard-panel-expanded .summary-label { font-size:clamp(18px,5vw,24px)!important; }
      #viewToday .calorie-card.dashboard-panel-expanded .calorie-layout { width:100%; margin:0 0 30px!important; display:grid!important; grid-template-columns:minmax(0,1fr) auto!important; align-items:center!important; gap:16px!important; }
      #viewToday .calorie-card.dashboard-panel-expanded .kcal-main strong { font-size:clamp(74px,21vw,108px)!important; line-height:.9!important; }
      #viewToday .calorie-card.dashboard-panel-expanded .kcal-main span { font-size:clamp(20px,5.5vw,28px)!important; }
      #viewToday .calorie-card.dashboard-panel-expanded .calorie-ring { transform:scale(1.12)!important; }
      #viewToday .calorie-card.dashboard-panel-expanded .progress-lg { width:100%; height:14px!important; margin-top:6px!important; }
      #viewToday .calorie-card.dashboard-panel-expanded .remaining-row { width:100%; margin-top:18px!important; font-size:clamp(18px,5vw,25px)!important; }

      /* Macro — larger typography, bars and spacing; rows fill the useful card height. */
      #viewToday .macro-grid.dashboard-panel-expanded { display:grid!important; grid-template-columns:1fr!important; grid-template-rows:repeat(3,minmax(0,1fr))!important; gap:0!important; padding:66px 26px 50px!important; align-content:stretch!important; }
      #viewToday .macro-grid.dashboard-panel-expanded::before { top:22px!important; left:28px!important; font-size:18px!important; letter-spacing:.06em!important; }
      #viewToday .macro-grid.dashboard-panel-expanded .macro-card { min-height:0!important; height:100%!important; padding:12px 0!important; border-left:0!important; border-bottom:1px solid rgba(148,190,190,.14)!important; display:grid!important; grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)!important; grid-template-rows:auto auto auto!important; align-content:center!important; align-items:center!important; column-gap:22px!important; row-gap:8px!important; }
      #viewToday .macro-grid.dashboard-panel-expanded .macro-card:last-child { border-bottom:0!important; }
      #viewToday .macro-grid.dashboard-panel-expanded .macro-card-top { grid-column:1!important; grid-row:1 / span 2!important; display:block!important; align-self:center!important; }
      #viewToday .macro-grid.dashboard-panel-expanded .macro-heading { text-align:left!important; }
      #viewToday .macro-grid.dashboard-panel-expanded .macro-name { min-height:0!important; justify-content:flex-start!important; font-size:clamp(18px,5vw,23px)!important; line-height:1.05!important; }
      #viewToday .macro-grid.dashboard-panel-expanded .macro-heading small { display:block!important; margin-top:10px!important; font-size:clamp(14px,3.8vw,17px)!important; line-height:1.2!important; }
      #viewToday .macro-grid.dashboard-panel-expanded .macro-ring { grid-column:1!important; grid-row:3!important; margin:0!important; text-align:left!important; align-self:start!important; }
      #viewToday .macro-grid.dashboard-panel-expanded .macro-ring strong { font-size:clamp(38px,10vw,50px)!important; line-height:1!important; }
      #viewToday .macro-grid.dashboard-panel-expanded .macro-value { grid-column:2!important; grid-row:1 / span 2!important; margin:0!important; justify-content:flex-end!important; align-self:center!important; text-align:right!important; }
      #viewToday .macro-grid.dashboard-panel-expanded .macro-value b { font-size:clamp(58px,15vw,78px)!important; line-height:.9!important; }
      #viewToday .macro-grid.dashboard-panel-expanded .macro-value span { font-size:clamp(18px,4.8vw,23px)!important; }
      #viewToday .macro-grid.dashboard-panel-expanded .mini-progress { grid-column:2!important; grid-row:3!important; width:100%!important; height:12px!important; margin:2px 0 0!important; align-self:start!important; }

      /* Hydration — remove the decorative halo while expanded and keep a clean hierarchy. */
      #waterCard.dashboard-panel-expanded { display:flex!important; flex-direction:column; justify-content:center!important; padding:34px 28px 54px!important; background-image:none!important; }
      #waterCard.dashboard-panel-expanded::before { display:none!important; content:none!important; opacity:0!important; background:none!important; border:0!important; box-shadow:none!important; }
      #waterCard.dashboard-panel-expanded .water-head { width:100%; margin:0!important; display:grid!important; grid-template-columns:1fr!important; grid-template-rows:auto auto!important; gap:22px!important; align-items:start!important; }
      #waterCard.dashboard-panel-expanded .water-heading { width:100%; display:flex!important; align-items:center!important; gap:16px!important; position:relative!important; z-index:2!important; }
      #waterCard.dashboard-panel-expanded .water-icon { transform:scale(1.08); flex:0 0 52px!important; }
      #waterCard.dashboard-panel-expanded .water-title { font-size:clamp(23px,6vw,30px)!important; line-height:1.05!important; }
      #waterCard.dashboard-panel-expanded .water-sub { margin-top:6px!important; max-width:290px; font-size:15px!important; line-height:1.35!important; }
      #waterCard.dashboard-panel-expanded .water-value { width:100%; text-align:left!important; display:flex!important; align-items:baseline!important; gap:14px!important; white-space:normal!important; position:relative!important; z-index:2!important; }
      #waterCard.dashboard-panel-expanded .water-value strong { display:inline!important; font-size:clamp(52px,14vw,72px)!important; line-height:.95!important; }
      #waterCard.dashboard-panel-expanded .water-value span { display:inline!important; font-size:17px!important; }
      #waterCard.dashboard-panel-expanded .water-progress { width:100%; height:16px!important; margin:30px 0 13px!important; }
      #waterCard.dashboard-panel-expanded .water-progress-copy { width:100%; font-size:16px!important; }
      #waterCard.dashboard-panel-expanded #waterBreakdown { width:100%; margin-top:14px!important; font-size:15px!important; }
      #waterCard.dashboard-panel-expanded .water-actions { width:100%; margin-top:28px!important; display:grid!important; gap:12px!important; }
      #waterCard.dashboard-panel-expanded .water-add, #waterCard.dashboard-panel-expanded .water-undo { min-height:58px!important; }

      @media (max-width:430px) {
        #viewToday .calorie-card.dashboard-panel-expanded { padding-left:22px!important; padding-right:22px!important; }
        #viewToday .calorie-card.dashboard-panel-expanded .calorie-ring { transform:scale(.98)!important; }
        #viewToday .macro-grid.dashboard-panel-expanded { padding:62px 22px 48px!important; }
        #viewToday .macro-grid.dashboard-panel-expanded .macro-card { grid-template-columns:minmax(0,1fr) minmax(132px,.95fr)!important; column-gap:14px!important; }
        #viewToday .macro-grid.dashboard-panel-expanded .macro-name { font-size:clamp(17px,4.8vw,21px)!important; }
        #viewToday .macro-grid.dashboard-panel-expanded .macro-value b { font-size:clamp(54px,14vw,68px)!important; }
        #viewToday .macro-grid.dashboard-panel-expanded .macro-ring strong { font-size:clamp(36px,9.5vw,46px)!important; }
        #waterCard.dashboard-panel-expanded { padding-left:22px!important; padding-right:22px!important; }
        #waterCard.dashboard-panel-expanded .water-value strong { font-size:clamp(50px,14vw,64px)!important; }
      }
      @media (max-width:360px) {
        #viewToday .macro-grid.dashboard-panel-expanded { padding-left:18px!important; padding-right:18px!important; }
        #viewToday .macro-grid.dashboard-panel-expanded .macro-card { grid-template-columns:minmax(0,1fr) 116px!important; column-gap:10px!important; }
        #viewToday .macro-grid.dashboard-panel-expanded .macro-name { font-size:15px!important; }
        #viewToday .macro-grid.dashboard-panel-expanded .macro-value b { font-size:48px!important; }
        #viewToday .macro-grid.dashboard-panel-expanded .macro-ring strong { font-size:34px!important; }
        #waterCard.dashboard-panel-expanded .water-value { gap:8px!important; }
        #waterCard.dashboard-panel-expanded .water-value strong { font-size:46px!important; }
      }
      @media (prefers-reduced-motion:reduce) { .dashboard-expand-backdrop, #viewToday .dashboard-panel-expanded, #waterCard.dashboard-panel-expanded { transition-duration:1ms!important; } }
    `;
    document.head.appendChild(style);
  }

  function getTarget(node) { return node?.closest?.(TARGET_SELECTOR) || null; }
  function setAccessible(target) { if (!target) return; if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex','0'); target.setAttribute('role','button'); target.setAttribute('aria-expanded', target === expanded ? 'true' : 'false'); }
  function prepareTargets() { document.querySelectorAll(TARGET_SELECTOR).forEach(setAccessible); }
  function availableViewport() { const side=12, top=12; const nav=document.querySelector('.bottom-nav'); const navRect=nav?.getBoundingClientRect(); const bottom=navRect && navRect.top > window.innerHeight*.52 ? navRect.top-12 : window.innerHeight-12; return { left:side, top, width:Math.max(280,window.innerWidth-side*2), height:Math.max(360,bottom-top) }; }
  function expandedBounds(target) { const vp=availableViewport(); let ratio=.76; if (target.matches('.calorie-card')) ratio=.72; else if (target.matches('.macro-grid')) ratio=.88; else ratio=.76; const minH=target.matches('.macro-grid') ? 590 : target.id==='waterCard' ? 500 : 470; const height=Math.min(vp.height, Math.max(minH, vp.height*ratio)); const top=vp.top+Math.max(0,(vp.height-height)/2); return { left:vp.left, top, width:vp.width, height }; }
  function ensureBackdrop() { let backdrop=document.getElementById(BACKDROP_ID); if (backdrop) return backdrop; backdrop=document.createElement('div'); backdrop.id=BACKDROP_ID; backdrop.className='dashboard-expand-backdrop'; backdrop.setAttribute('aria-hidden','true'); backdrop.addEventListener('click',collapse); document.body.appendChild(backdrop); return backdrop; }
  function applyRect(target,rect) { target.style.left=`${Math.round(rect.left)}px`; target.style.top=`${Math.round(rect.top)}px`; target.style.width=`${Math.round(rect.width)}px`; target.style.height=`${Math.round(rect.height)}px`; }
  function createPlaceholder(target,rect) { const h=document.createElement('div'); h.className='dashboard-expand-placeholder'; h.style.width=`${rect.width}px`; h.style.height=`${rect.height}px`; h.style.marginTop=getComputedStyle(target).marginTop; h.style.marginBottom=getComputedStyle(target).marginBottom; target.parentNode?.insertBefore(h,target); return h; }
  function clearInlineGeometry(target) { ['left','top','width','height'].forEach(p=>target.style.removeProperty(p)); }
  function expand(target) { if (!target || expanded || closing) return; const start=target.getBoundingClientRect(); if (!start.width || !start.height) return; expanded=target; placeholder=createPlaceholder(target,start); document.body.classList.add('dashboard-panel-open'); const backdrop=ensureBackdrop(); target.classList.add('dashboard-panel-expanded'); target.setAttribute('aria-expanded','true'); applyRect(target,start); void target.offsetWidth; requestAnimationFrame(()=>{ backdrop.classList.add('visible'); applyRect(target,expandedBounds(target)); }); }
  function finishCollapse(target) { clearInlineGeometry(target); target.classList.remove('dashboard-panel-expanded'); target.setAttribute('aria-expanded','false'); placeholder?.remove(); placeholder=null; expanded=null; closing=false; document.body.classList.remove('dashboard-panel-open'); const backdrop=document.getElementById(BACKDROP_ID); backdrop?.classList.remove('visible'); window.setTimeout(()=>backdrop?.remove(),REDUCED_MOTION?0:230); }
  function collapse() { if (!expanded || closing) return; const target=expanded, end=placeholder?.getBoundingClientRect(); closing=true; document.getElementById(BACKDROP_ID)?.classList.remove('visible'); if (!end || !end.width || !end.height || REDUCED_MOTION) { finishCollapse(target); return; } applyRect(target,end); window.setTimeout(()=>finishCollapse(target),320); }
  function toggle(target) { if (target===expanded) collapse(); else if (!expanded) expand(target); }
  document.addEventListener('pointerup',event=>{ if (event.pointerType==='mouse') return; const target=getTarget(event.target); if (!target) return; const control=event.target?.closest?.(INTERACTIVE_SELECTOR); if (control && control!==target) return; event.preventDefault(); toggle(target); },{passive:false});
  document.addEventListener('click',event=>{ const target=getTarget(event.target); if (!target) return; const control=event.target?.closest?.(INTERACTIVE_SELECTOR); if (control && control!==target) return; if (event.detail===0 || !('PointerEvent' in window)) { event.preventDefault(); toggle(target); } },{passive:false});
  document.addEventListener('keydown',event=>{ if (event.key==='Escape' && expanded) { event.preventDefault(); collapse(); return; } if (event.key!=='Enter' && event.key!==' ') return; const target=getTarget(event.target); if (!target || event.target!==target) return; event.preventDefault(); toggle(target); });
  window.addEventListener('resize',()=>{ if (expanded && !closing) applyRect(expanded,expandedBounds(expanded)); });
  new MutationObserver(prepareTargets).observe(document.documentElement,{childList:true,subtree:true});
  injectStyles(); prepareTargets();
})();
