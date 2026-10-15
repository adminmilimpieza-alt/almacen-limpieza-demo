// scan.js — escaneo con cámara (mejora progresiva, opcional).
// El escáner USB no necesita nada: actúa como teclado y escribe en #scan + Enter.
// Este módulo suma la cámara (BarcodeDetector nativo donde exista, sin librerías).
const ScanCam = (() => {
  let stream = null, raf = 0, onCode = null;
  const $ = id => document.getElementById(id);
  function soportado(){
    return ('BarcodeDetector' in window) && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  }
  async function toggle(scanId, cb){
    onCode = cb;
    const wrap = $('cam-wrap'), video = $('cam'), btn = $('cam-btn');
    if(stream){ parar(); if(btn) btn.textContent = 'Escanear con cámara'; return; }
    if(!soportado()){ alert('Este navegador no soporta lectura con cámara. Usá el escáner USB o escribí el código.'); return; }
    try{
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      video.srcObject = stream; await video.play();
      wrap.style.display = 'block'; if(btn) btn.textContent = 'Detener cámara';
      const det = new BarcodeDetector({formats:['ean_13','ean_8','code_128','code_39','upc_a','upc_e','qr_code']});
      let ultimo = '', ultimoT = 0;
      const loop = async ()=>{
        try{
          const res = await det.detect(video);
          if(res && res.length){
            const v = res[0].rawValue || '';
            const ahora = Date.now();
            if(v && (v!==ultimo || ahora-ultimoT>2500)){ ultimo=v; ultimoT=ahora; onCode && onCode(v); }
          }
        }catch{}
        raf = requestAnimationFrame(loop);
      };
      loop();
    }catch{ alert('No se pudo abrir la cámara (permiso denegado).'); }
  }
  function parar(){
    cancelAnimationFrame(raf);
    if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
    const video = $('cam'); if(video) video.srcObject = null;
    const wrap = $('cam-wrap'); if(wrap) wrap.style.display='none';
  }
  function init(scanId, cb){ const btn = $('cam-btn'); if(!btn) return;
    if(!soportado()){ btn.style.display='none'; return; }
    btn.onclick = ()=>toggle(scanId, cb); }
  return {init, parar};
})();
