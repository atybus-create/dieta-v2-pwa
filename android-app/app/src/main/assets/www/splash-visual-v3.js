(function installFullSplashAnimation(){
  const splash=document.getElementById('startSplash');
  if(!splash) return;

  const MIN_SPLASH_MS=5000;
  const startedAt=performance.now();
  let allowHide=false;
  const keepVisible=()=>{
    if(!allowHide && splash.classList.contains('hidden')) splash.classList.remove('hidden');
  };
  const observer=new MutationObserver(keepVisible);
  observer.observe(splash,{attributes:true,attributeFilter:['class']});
  setTimeout(()=>{
    allowHide=true;
    observer.disconnect();
    splash.classList.add('hidden');
  },Math.max(0,MIN_SPLASH_MS-(performance.now()-startedAt)));

  const style=document.createElement('style');
  style.id='wczai-rendered-splash-v3';
  style.textContent=`
#startSplash{background:#061015!important;overflow:hidden!important;padding:0!important}
.wczai-v3-shell{position:relative;width:100%;height:100%;min-height:100dvh;overflow:hidden;background:radial-gradient(circle at 50% 58%,rgba(27,229,210,.16),transparent 30%),linear-gradient(180deg,#061015 0%,#071014 100%)}
.wczai-v3-stage{position:absolute;left:50%;top:47%;width:min(96vw,500px);aspect-ratio:235/340;transform:translate(-50%,-50%);overflow:visible;filter:drop-shadow(0 24px 50px rgba(0,0,0,.35))}
.wczai-v3-art{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border-radius:30px;will-change:transform,opacity,clip-path}
.wczai-v3-title{z-index:1;opacity:0;clip-path:inset(0 31% 0 0 round 28px);transform:scale(.86) translateY(22px);animation:v3TitleBuild 1.55s cubic-bezier(.16,.8,.2,1) .22s forwards}
.wczai-v3-monster{z-index:2;opacity:0;clip-path:inset(0 0 0 70% round 28px);transform:translateX(24%) scale(.96);animation:v3MonsterEnter 1.25s cubic-bezier(.16,.85,.22,1) 1.55s forwards,v3Lunge .62s cubic-bezier(.18,.9,.25,1) 2.72s forwards,v3BiteShake .38s ease-in-out 3.23s forwards}
.wczai-v3-after{z-index:3;opacity:0;transform:scale(1.045) translateX(-1.5%);animation:v3AfterBite 1.12s cubic-bezier(.2,.8,.2,1) 3.48s forwards,v3FinalBreath 1.5s ease-in-out 4.05s infinite alternate}
.wczai-v3-vignette{position:absolute;inset:-10%;z-index:4;pointer-events:none;background:radial-gradient(circle at 50% 46%,transparent 42%,rgba(1,9,12,.08) 62%,rgba(1,9,12,.56) 100%)}
.wczai-v3-flash{position:absolute;left:50%;top:51%;z-index:5;width:45%;height:13%;transform:translate(-50%,-50%) scale(.3);border-radius:50%;opacity:0;background:radial-gradient(circle,rgba(255,205,63,.85),rgba(51,240,220,.35) 38%,transparent 72%);filter:blur(10px);animation:v3BiteFlash .42s ease-out 3.18s forwards;pointer-events:none}
.wczai-v3-status{position:absolute;z-index:6;left:50%;bottom:max(10vh,92px);transform:translateX(-50%);width:min(82vw,360px);display:grid;gap:14px;justify-items:center}
.wczai-v3-status p{margin:0;color:#e6f4f2;font:700 17px/1.35 system-ui,sans-serif;text-shadow:0 2px 14px rgba(0,0,0,.6)}
.wczai-v3-line{width:100%;height:7px;border-radius:999px;background:rgba(100,184,180,.14);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(112,243,226,.09),0 0 24px rgba(35,211,200,.08)}
.wczai-v3-line span{display:block;height:100%;width:100%;transform-origin:left;transform:scaleX(.04);border-radius:inherit;background:linear-gradient(90deg,#32d6cf,#75f4e4 68%,#d8fffa);box-shadow:0 0 18px rgba(61,232,217,.65);animation:v3Progress 4.75s cubic-bezier(.1,.55,.2,1) .18s forwards}
@keyframes v3TitleBuild{0%{opacity:0;transform:scale(.86) translateY(22px);filter:blur(8px)}24%{opacity:1;filter:blur(0)}65%{opacity:1;transform:scale(1.025) translateY(0)}100%{opacity:1;transform:scale(1) translateY(0);clip-path:inset(0 24% 0 0 round 28px)}}
@keyframes v3MonsterEnter{0%{opacity:0;clip-path:inset(0 0 0 84% round 28px);transform:translateX(30%) scale(.92)}18%{opacity:1}62%{opacity:1;clip-path:inset(0 0 0 46% round 28px);transform:translateX(8%) scale(1.01)}100%{opacity:1;clip-path:inset(0 round 28px);transform:translateX(0) scale(1)}}
@keyframes v3Lunge{0%{transform:translateX(0) scale(1)}45%{transform:translateX(-5.5%) scale(1.085) rotate(-1.3deg)}72%{transform:translateX(-3%) scale(1.055) rotate(.8deg)}100%{transform:translateX(-4%) scale(1.07) rotate(0)}}
@keyframes v3BiteShake{0%{transform:translateX(-4%) scale(1.07)}22%{transform:translateX(-7%) scale(1.095) rotate(-1.5deg)}44%{transform:translateX(-2%) scale(1.055) rotate(1.2deg)}67%{transform:translateX(-5%) scale(1.08) rotate(-.7deg)}100%{transform:translateX(-4%) scale(1.07) rotate(0);opacity:1}}
@keyframes v3BiteFlash{0%{opacity:0;transform:translate(-50%,-50%) scale(.25)}35%{opacity:.95;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.55)}}
@keyframes v3AfterBite{0%{opacity:0;transform:scale(1.08) translateX(-2%)}22%{opacity:1;transform:scale(1.025) translateX(0)}100%{opacity:1;transform:scale(1) translateX(0)}}
@keyframes v3FinalBreath{from{transform:scale(1)}to{transform:scale(1.012) translateY(-2px)}}
@keyframes v3Progress{0%{transform:scaleX(.04)}18%{transform:scaleX(.22)}42%{transform:scaleX(.48)}68%{transform:scaleX(.72)}88%{transform:scaleX(.9)}100%{transform:scaleX(1)}}
@media(max-width:390px){.wczai-v3-stage{width:min(98vw,430px);top:46%}.wczai-v3-status{bottom:max(8.5vh,72px)}}
@media(prefers-reduced-motion:reduce){.wczai-v3-title,.wczai-v3-monster,.wczai-v3-after,.wczai-v3-flash,.wczai-v3-line span{animation-duration:.01ms!important;animation-delay:0ms!important;animation-iteration-count:1!important}.wczai-v3-after{opacity:1}.wczai-v3-monster,.wczai-v3-title{opacity:0}}
`;
  document.head.appendChild(style);

  splash.innerHTML=`<div class="wczai-v3-shell">
    <div class="wczai-v3-stage" aria-hidden="true">
      <img class="wczai-v3-art wczai-v3-title" src="./assets/splash-bite.webp?v=20260820-v3" alt="">
      <img class="wczai-v3-art wczai-v3-monster" src="./assets/splash-bite.webp?v=20260820-v3" alt="">
      <img class="wczai-v3-art wczai-v3-after" src="./assets/splash-afterbite.webp?v=20260820-v3" alt="">
      <div class="wczai-v3-flash"></div>
      <div class="wczai-v3-vignette"></div>
    </div>
    <div class="wczai-v3-status"><p>Uruchamiam aplikację…</p><div class="wczai-v3-line" aria-hidden="true"><span></span></div></div>
  </div>`;
  splash.setAttribute('aria-label','Uruchamianie Wiem co Żre-m z AI');
})();
