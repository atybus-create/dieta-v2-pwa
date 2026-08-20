(function installRenderedSplash(){
  const splash=document.getElementById('startSplash');
  if(!splash) return;

  const style=document.createElement('style');
  style.id='wczai-rendered-splash-v2';
  style.textContent=`
#startSplash{background:radial-gradient(circle at 50% 70%,rgba(44,235,219,.18),transparent 19%),linear-gradient(180deg,#061015 0%,#071014 100%)!important}
.wczai-v2-shell{width:min(92vw,390px);display:grid;justify-items:center;gap:16px}
.wczai-v2-stage{position:relative;width:min(86vw,340px);height:min(90vw,390px);max-height:390px;display:grid;place-items:center;overflow:visible}
.wczai-v2-intro{position:absolute;inset:0;display:grid;place-content:center;gap:2px;z-index:1;animation:v2Intro 1.05s ease forwards}
.wczai-v2-intro span{display:block;text-align:center;letter-spacing:-.045em;text-shadow:0 0 24px rgba(72,232,217,.22)}
.wczai-v2-intro .a{font:800 34px/1 system-ui,sans-serif;color:#7fe9dc;animation:v2Rise .35s ease .05s both}
.wczai-v2-intro .b{font:900 66px/.95 system-ui,sans-serif;color:#f4fffd;animation:v2Pop .45s cubic-bezier(.2,.9,.25,1.2) .18s both}
.wczai-v2-intro .c{font:800 36px/1 system-ui,sans-serif;color:#55e8d7;animation:v2Rise .35s ease .38s both}
.wczai-v2-frame{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transform:scale(.9) translateY(8px);filter:drop-shadow(0 22px 40px rgba(0,0,0,.35));border-radius:28px}
.wczai-v2-frame.bite{animation:v2BiteFrame .78s cubic-bezier(.2,.8,.2,1) .62s both}
.wczai-v2-frame.after{animation:v2AfterFrame 1.12s cubic-bezier(.2,.8,.2,1) 1.18s both}
.wczai-v2-flash{position:absolute;width:180px;height:70px;border-radius:50%;background:radial-gradient(circle,rgba(84,246,225,.9),rgba(84,246,225,.18) 38%,transparent 72%);bottom:22px;filter:blur(6px);animation:v2Glow 1.6s ease-in-out infinite}
.wczai-v2-status{font:700 17px/1.35 system-ui,sans-serif;color:#d8eeee;margin:0}
.wczai-v2-line{width:min(320px,78vw);height:6px;border-radius:999px;background:rgba(122,196,191,.12);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(122,196,191,.05)}
.wczai-v2-line span{display:block;width:42%;height:100%;border-radius:inherit;background:linear-gradient(90deg,transparent,#74f4e4,#24c9d6,transparent);filter:drop-shadow(0 0 9px rgba(38,199,213,.8));animation:v2Load .9s ease-in-out infinite}
@keyframes v2Rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes v2Pop{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:scale(1)}}
@keyframes v2Intro{0%,54%{opacity:1;transform:scale(1)}72%,100%{opacity:0;transform:scale(.96)}}
@keyframes v2BiteFrame{0%{opacity:0;transform:scale(.9) translate(28px,10px)}18%{opacity:1;transform:scale(1.05) translate(-5px,-2px)}58%{opacity:1;transform:scale(1) translate(0)}100%{opacity:0;transform:scale(.98) translate(-8px,2px)}}
@keyframes v2AfterFrame{0%{opacity:0;transform:scale(.94) translate(12px,6px)}18%,82%{opacity:1;transform:scale(1) translate(0)}100%{opacity:1;transform:scale(.99) translateY(1px)}}
@keyframes v2Glow{0%,100%{transform:scale(.92);opacity:.65}50%{transform:scale(1.08);opacity:1}}
@keyframes v2Load{0%{transform:translateX(-120%)}100%{transform:translateX(330%)}}
@media(max-width:380px){.wczai-v2-stage{width:min(88vw,310px);height:350px}.wczai-v2-intro .b{font-size:58px}}
`;
  document.head.appendChild(style);

  splash.innerHTML=`<div class="wczai-v2-shell">
    <div class="wczai-v2-stage">
      <div class="wczai-v2-flash" aria-hidden="true"></div>
      <div class="wczai-v2-intro" aria-hidden="true"><span class="a">Wiem co</span><span class="b">Żre-m</span><span class="c">z AI</span></div>
      <img class="wczai-v2-frame bite" src="./assets/splash-bite.webp?v=20260820-v2" alt="" aria-hidden="true">
      <img class="wczai-v2-frame after" src="./assets/splash-afterbite.webp?v=20260820-v2" alt="" aria-hidden="true">
    </div>
    <p class="wczai-v2-status">Uruchamiam aplikację…</p>
    <div class="wczai-v2-line" aria-hidden="true"><span></span></div>
  </div>`;
  splash.setAttribute('aria-label','Uruchamianie Wiem co Żre-m z AI');
})();
