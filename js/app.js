// app.js — menú lateral (drawer) + overlay de módulos a pantalla completa.
// La caja (escaneo, ticket, cobro) es la pantalla principal siempre visible.
const Panel = (() => {
  const $ = id => document.getElementById(id);
  function marcarActivo(id){document.querySelectorAll('.main-nav [data-go]').forEach(b=>{const activo=b.dataset.go===id;b.classList.toggle('active',activo);if(activo)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
  function ajustarPanel(){const nav=document.querySelector('.main-nav');if(nav&&nav.getBoundingClientRect)$('panel-overlay').style.top=Math.max(0,nav.getBoundingClientRect().bottom)+'px';}
  function abrirDrawer(){}
  function cerrarDrawer(){}
  function go(id){
    if(id==='caja'){back();return;}
    const body = $('panel-body'), sec = document.getElementById(id); if(!sec) return;
    if(!go._origen) go._origen = document.getElementById('modulos');
    // Si ya habia un modulo abierto, se vuelve a su lugar antes de montar el nuevo.
    while(body.firstChild) go._origen.appendChild(body.firstChild);
    body.appendChild(sec);
    if(id==='mod-listas'&&typeof ListasPrecios!=='undefined')ListasPrecios.render();
    if(id==='mod-promociones'&&typeof Promociones!=='undefined')Promociones.render();
    marcarActivo(id);
    $('panel-overlay').hidden = false;
    cerrarDrawer();
    document.body.classList.add('panel-abierto');
    $('panel-overlay').scrollTop = 0; window.scrollTo(0,0);ajustarPanel();
  }
  function back(){
    const body = $('panel-body'), modulos = document.getElementById('modulos');
    while(body.firstChild) modulos.appendChild(body.firstChild);
    $('panel-overlay').hidden = true;
    document.body.classList.remove('panel-abierto');
    marcarActivo('caja');
  }
  function init(){
    document.querySelectorAll('[data-go]').forEach(b=>{ b.onclick = ()=>go(b.dataset.go); });
    marcarActivo('caja');window.addEventListener('resize',()=>{if(!$('panel-overlay').hidden)ajustarPanel();});
    $('menu-btn').hidden=true;
    document.querySelectorAll('[data-caja-vista]').forEach(b=>b.onclick=()=>{document.body.dataset.cajaVista=b.dataset.cajaVista;});
    document.addEventListener('keydown', e=>{
      if(e.key!=='Escape') return;
      if(!$('panel-overlay').hidden) back(); else cerrarDrawer();
    });
  }
  return {init, go, back, abrirDrawer, cerrarDrawer};
})();
(async()=>{
  if(typeof OnlineBusiness!=='undefined')await OnlineBusiness.init();
  Caja.init(); Stock.init(); Entidades.init(); Cumple.init(); Precios.init(); Pedidos.init(); Reportes.init(); Respaldo.init(); if(typeof RespaldoDrive!=='undefined')RespaldoDrive.init(); Turnos.init(); Panel.init();
  Pagos.init();
  if(typeof OnlineBusiness!=='undefined')OnlineBusiness.uiReady();
})();
