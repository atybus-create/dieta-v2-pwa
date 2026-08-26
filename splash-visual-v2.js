(function installStaticFullscreenSplash(){
  const splash=document.getElementById('startSplash');
  if(!splash) return;

  const MIN_SPLASH_MS=3000;
  const FAILSAFE_MS=8000;
  const startedAt=performance.now();
  const parts=[
    './assets/static-splash-p1.txt?v=20260820-static1',
    './assets/static-splash-p2.txt?v=20260820-static1',
    './assets/static-splash-p3.txt?v=20260820-static1',
    './assets/static-splash-p4.txt?v=20260820-static1'
  ];

  const style=document.createElement('style');
  style.id='wczai-static-splash-v2';
  style.textContent=`
#startSplash{padding:0!important;background:#041116!important;overflow:hidden!important}
.wczai-static-wrap{position:fixed;inset:0;background:#041116;overflow:hidden}
.wczai-static-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block}
.wczai-static-loader-cover{position:absolute;left:min(14vw,calc(50vw - 20dvh));top:max(84.2dvh,calc(50dvh + 61.56vw));width:max(72vw,40dvh);height:max(7.4dvh,13.32vw);border-radius:28px;background:linear-gradient(90deg,rgba(2,17,20,.995),rgba(4,29,31,.995),rgba(2,16,19,.995));box-shadow:0 0 26px rgba(0,18,20,.48)}
.wczai-static-loader{position:absolute;left:min(16vw,calc(50vw - 18.889dvh));top:max(85.2dvh,calc(50dvh + 63.36vw));width:max(68vw,37.778dvh);height:clamp(22px,max(4.6dvh,8.28vw),38px);border-radius:999px;background:#06262b;border:2px solid rgba(0,238,238,.88);box-shadow:0 0 16px rgba(0,238,238,.34);overflow:hidden}
.wczai-static-loader>span{display:block;height:100%;width:100%;transform:scaleX(.02);transform-origin:left;border-radius:inherit;background:linear-gradient(90deg,#0fe7e4,#7df7f0 72%,#efffff);box-shadow:0 0 18px rgba(70,244,235,.8);animation:wczStaticLoad 3s linear forwards}
@keyframes wczStaticLoad{to{transform:scaleX(1)}}
@media(prefers-reduced-motion:reduce){.wczai-static-loader>span{animation:none;transform:scaleX(1)}}
`;
  document.head.appendChild(style);

  splash.innerHTML='<div class="wczai-static-wrap"><img class="wczai-static-art" alt="" aria-hidden="true"><div class="wczai-static-loader-cover" aria-hidden="true"></div><div class="wczai-static-loader" aria-hidden="true"><span></span></div></div>';
  splash.classList.remove('hidden');
  splash.setAttribute('aria-label','Uruchamianie Wiem co Żre-m z AI');

  const img=splash.querySelector('.wczai-static-art');
  Promise.all(parts.map(url=>fetch(url,{cache:'no-store'}).then(response=>{
    if(!response.ok) throw new Error(`Nie udało się pobrać ${url}`);
    return response.text();
  })))
    .then(chunks=>{ img.src='data:image/webp;base64,'+chunks.join(''); })
    .catch(error=>console.error('Dieta V2 static splash image failed:',error));

  let minElapsed=false;
  let hideRequested=false;
  let internalChange=false;
  let released=false;

  const release=()=>{
    if(released) return;
    released=true;
    observer.disconnect();
    internalChange=true;
    splash.classList.add('hidden');
    queueMicrotask(()=>{ internalChange=false; });
  };

  const observer=new MutationObserver(()=>{
    if(internalChange||released) return;
    if(!splash.classList.contains('hidden')) return;
    if(minElapsed){
      release();
      return;
    }
    hideRequested=true;
    internalChange=true;
    splash.classList.remove('hidden');
    queueMicrotask(()=>{ internalChange=false; });
  });
  observer.observe(splash,{attributes:true,attributeFilter:['class']});

  setTimeout(()=>{
    minElapsed=true;
    if(hideRequested) release();
  },Math.max(0,MIN_SPLASH_MS-(performance.now()-startedAt)));

  setTimeout(()=>{
    if(!released){
      console.warn('Splash failsafe released after startup timeout.');
      release();
    }
  },FAILSAFE_MS);
})();
