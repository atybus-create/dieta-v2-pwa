(function loadFullSplashV3(){
  fetch('./splash-visual-v3.js?v=20260820-v3',{cache:'no-store'})
    .then(response=>{
      if(!response.ok) throw new Error('Nie udało się pobrać splash-visual-v3.js');
      return response.text();
    })
    .then(code=>(0,eval)(code))
    .catch(error=>console.error('Dieta V2 splash v3 failed:',error));
})();
