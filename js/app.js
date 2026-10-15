// app.js — panel derecho: inicio (cobro) + destinos + volver. La izquierda
// siempre muestra escaneo y líneas, como la pantalla de venta standard.
const Panel = (() => {
  const TITULOS = {
    'mod-stock':'Stock', 'mod-precios':'Precios', 'mod-clientes':'Clientes',
    'mod-proveedores':'Proveedores', 'mod-pedidos':'Pedidos',
    'mod-mov':'Movimientos de caja', 'mod-reportes':'Reportes', 'mod-respaldo':'Respaldo'
  };
  const $ = id => document.getElementById(id);
  function go(id){
    const home = $('panel-home'), view = $('panel-view'), body = $('panel-body');
    const sec = document.getElementById(id); if(!sec) return;
    if(!go._origen) go._origen = document.getElementById('modulos');
    body.appendChild(sec);
    $('panel-title').textContent = TITULOS[id]||'';
    home.hidden = true; view.hidden = false;
    body.scrollTop = 0;
  }
  function back(){
    const home = $('panel-home'), view = $('panel-view'), body = $('panel-body');
    const modulos = document.getElementById('modulos');
    while(body.firstChild) modulos.appendChild(body.firstChild);
    view.hidden = true; home.hidden = false;
  }
  function init(){
    document.querySelectorAll('[data-go]').forEach(b=>{ b.onclick = ()=>go(b.dataset.go); });
    $('panel-back').onclick = back;
  }
  return {init, go, back};
})();
Caja.init(); Stock.init(); Entidades.init(); Precios.init(); Pedidos.init(); Reportes.init(); Respaldo.init(); Panel.init();
