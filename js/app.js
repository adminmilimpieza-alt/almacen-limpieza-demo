// app.js — tabs + boot
document.querySelectorAll('nav button').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('tab-'+b.dataset.tab).classList.add('active');
  };
});
Caja.init(); Stock.init(); Entidades.init(); Precios.init(); Pedidos.init(); Reportes.init(); Respaldo.init();
