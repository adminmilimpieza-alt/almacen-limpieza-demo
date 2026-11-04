// app.js — menú lateral (drawer) + overlay de módulos a pantalla completa.
// La caja (escaneo, ticket, cobro) es la pantalla principal siempre visible.
const Panel = (() => {
  const TITULOS = {
    'mod-listas':'Listas de precios', 'mod-stock':'Stock', 'mod-precios':'Precios', 'mod-clientes':'Clientes',
    'mod-cumple':'Cumpleaños', 'mod-proveedores':'Proveedores', 'mod-pedidos':'Pedidos',
    'mod-mov':'Movimientos de caja', 'mod-turno':'Turno de caja', 'mod-reportes':'Reportes', 'mod-respaldo':'Respaldo'
  };
  const $ = id => document.getElementById(id);
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
    $('panel-title').textContent = TITULOS[id]||'';
    $('panel-overlay').hidden = false;
    cerrarDrawer();
    body.scrollTop = 0; window.scrollTo(0,0);
  }
  function back(){
    const body = $('panel-body'), modulos = document.getElementById('modulos');
    while(body.firstChild) modulos.appendChild(body.firstChild);
    $('panel-overlay').hidden = true;
  }
  function init(){
    document.querySelectorAll('[data-go]').forEach(b=>{ b.onclick = ()=>go(b.dataset.go); });
    $('panel-back').onclick = back;
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
