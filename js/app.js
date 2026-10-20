// app.js — menú lateral (drawer) + overlay de módulos a pantalla completa.
// La caja (escaneo, ticket, cobro) es la pantalla principal siempre visible.
const Panel = (() => {
  const TITULOS = {
    'mod-stock':'Stock', 'mod-precios':'Precios', 'mod-clientes':'Clientes',
    'mod-cumple':'Cumpleaños', 'mod-proveedores':'Proveedores', 'mod-pedidos':'Pedidos',
    'mod-mov':'Movimientos de caja', 'mod-turno':'Turno de caja', 'mod-reportes':'Reportes', 'mod-respaldo':'Respaldo'
  };
  const $ = id => document.getElementById(id);
  function abrirDrawer(){
    $('drawer').hidden = false; document.body.classList.add('drawer-open');
    $('menu-btn').setAttribute('aria-expanded','true');
  }
  function cerrarDrawer(){
    $('drawer').hidden = true; document.body.classList.remove('drawer-open');
    $('menu-btn').setAttribute('aria-expanded','false');
  }
  function go(id){
    const body = $('panel-body'), sec = document.getElementById(id); if(!sec) return;
    if(!go._origen) go._origen = document.getElementById('modulos');
    // Si ya habia un modulo abierto, se vuelve a su lugar antes de montar el nuevo.
    while(body.firstChild) go._origen.appendChild(body.firstChild);
    body.appendChild(sec);
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
    $('menu-btn').onclick = ()=>{ $('drawer').hidden ? abrirDrawer() : cerrarDrawer(); };
    $('drawer-close').onclick = cerrarDrawer;
    document.addEventListener('keydown', e=>{
      if(e.key!=='Escape') return;
      if(!$('panel-overlay').hidden) back(); else cerrarDrawer();
    });
  }
  return {init, go, back, abrirDrawer, cerrarDrawer};
})();
Caja.init(); Stock.init(); Entidades.init(); Cumple.init(); Precios.init(); Pedidos.init(); Reportes.init(); Respaldo.init(); Turnos.init(); Panel.init();
