// reportes.js — punto 6: caja diaria/período, historial cliente/proveedor, stock, listas
const Reportes = (() => {
  const $ = id => document.getElementById(id);
  const dia = iso => new Date(iso).toLocaleDateString('es-AR');
  function enRango(iso, d, h){
    const t = new Date(iso).getTime();
    if(d && t < new Date(d+'T00:00').getTime()) return false;
    if(h && t > new Date(h+'T23:59').getTime()) return false;
    return true;
  }
  function caja(){
    const db = Store.get();
    const d = $('rep-desde').value, h = $('rep-hasta').value;
    const movs = db.movimientos.filter(m=>enRango(m.fecha,d,h) && !m.anulado);
    const ing = movs.filter(m=>m.tipo==='ingreso').reduce((a,m)=>a+m.monto,0);
    const egr = movs.filter(m=>m.tipo==='egreso').reduce((a,m)=>a+m.monto,0);
    const porMedio = {};
    movs.forEach(m=>{ porMedio[m.medio]=porMedio[m.medio]||{ing:0,egr:0}; porMedio[m.medio][m.tipo==='ingreso'?'ing':'egr']+=m.monto; });
    $('rep-caja-out').innerHTML =
      `<div class="venta"><b>Caja ${d||'…'} → ${h||'…'}</b><br>Ingresos: <b>$${ing}</b> · Egresos: <b>$${egr}</b> · Neto: <b>$${ing-egr}</b><br>`+
      Object.entries(porMedio).map(([k,v])=>`${k}: +$${v.ing} / −$${v.egr}`).join(' · ')+'</div>';
  }
  function hist(){
    const db = Store.get();
    const selectedCli=$('rep-cli').value,selectedProv=$('rep-prov').value,selectedPP=$('rep-pp').value;
    $('rep-cli').innerHTML = db.clientes.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');
    const ph = db.proveedores.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('') || '<option value="">(sin proveedores)</option>';
    $('rep-prov').innerHTML = ph;
    $('rep-pp').innerHTML = '<option value="">Todos</option><option value="__none__">Sin proveedor</option>' + db.proveedores.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('');
    if(db.clientes.some(c=>c.id===selectedCli)) $('rep-cli').value=selectedCli;
    if(db.proveedores.some(p=>p.id===selectedProv)) $('rep-prov').value=selectedProv;
    if(['','__none__'].includes(selectedPP)||db.proveedores.some(p=>p.id===selectedPP)) $('rep-pp').value=selectedPP;
  }
  function hcli(){
    const db = Store.get(); const id = $('rep-cli').value;
    const cli = db.clientes.find(c=>c.id===id);
    const v = db.ventas.filter(x=>x.clienteId===id);
    const va = v.filter(x=>!x.anulada);
    const enCuenta = va.filter(x=>x.pago==='cuenta').reduce((a,x)=>a+x.total,0);
    $('rep-hist').innerHTML = `<h3>Compras del cliente (${va.length}) · en cuenta $${enCuenta} · deuda actual $${(cli&&cli.deuda)||0}</h3>` + (va.map(x=>
      `<div class="venta">${dia(x.fecha)} · $${x.total} · ${x.items.map(i=>i.nombre+' x'+i.cant).join(', ')}</div>`).join('')||'<p class="hint">Sin compras.</p>');
  }
  function hprov(){
    const db = Store.get(); const id = $('rep-prov').value;
    const p = db.pedidos.filter(x=>x.provId===id);
    $('rep-hist').innerHTML = `<h3>Pedidos al proveedor (${p.length})</h3>` + (p.map(x=>
      `<div class="venta">${dia(x.fecha)} · ${x.estado} · ${x.detalle}</div>`).join('')||'<p class="hint">Sin pedidos.</p>');
  }
  function stock(){
    const db = Store.get();
    const r = [...new Set(db.productos.map(p=>p.categoria||'General'))].sort();
    const selected=$('rep-rubro').value;
    $('rep-rubro').innerHTML = '<option value="">Stock: todos los rubros</option>'+r.map(x=>`<option>${x}</option>`).join('');
    if(r.includes(selected)) $('rep-rubro').value=selected;
  }
  function verStock(){
    const db = Store.get(); const f = $('rep-rubro').value;
    const list = db.productos.filter(p=>p.activo!==false && (!f||(p.categoria||'General')===f));
    const val = list.reduce((a,p)=>a+(p.costo??p.precio)*p.stock,0);
    $('rep-stock-out').innerHTML = `<div class="venta"><b>Stock ${f||'general'}</b>: ${list.length} productos · valorizado a costo <b>$${val}</b></div>`+
      '<table><tbody>'+list.map(p=>`<tr><td>${p.codigo||'-'}</td><td>${p.nombre}</td><td>${p.stock}</td><td>$${p.precio}</td></tr>`).join('')+'</tbody></table>';
  }
  function renderVentas(){
    const db = Store.get();
    const box = $('ventas'); if(!box) return; box.innerHTML='';
    if(!db.ventas.length){ box.innerHTML='<p class="hint">Todavía no hay ventas.</p>'; return; }
    const cli = id => (db.clientes.find(c=>c.id===id)||{}).nombre||'';
    db.ventas.slice(0,50).forEach(v=>{
      const d = document.createElement('div'); d.className='venta';
      d.innerHTML = `<b>${new Date(v.fecha).toLocaleString('es-AR')}</b> · ${v.pago} · ${cli(v.clienteId)} · <b>$${v.total}</b>` +
        (v.anulada ? ` · <span class="tag warn">anulada</span>` : '') + '<br>' +
        v.items.map(i=>`${i.nombre} x${i.cant}`).join(', ') + ' ';
      if(!v.anulada && v.id){
        const b = document.createElement('button'); b.textContent='Anular';
        b.onclick=async ()=>{ if(confirm(`Anular venta de $${v.total}? Vuelve el stock.`)){
          try{ await Store.anularVenta(v.id); Stock.render(); Caja.refresh(); render(); }
          catch(e){ alert(e.message); } } };
        d.appendChild(b);
      }
      box.appendChild(d);
    });
  }
  function porProveedor(){
    const db = Store.get(); const f = $('rep-pp').value;
    const list = db.productos.filter(p=>p.activo!==false && (!f || (f==='__none__' ? !p.provId : p.provId===f)));
    const nom = id => (db.proveedores.find(x=>x.id===id)||{}).nombre||'—';
    const val = list.reduce((a,p)=>a+(p.costo??p.precio)*p.stock,0);
    $('rep-pp-out').innerHTML = `<div class="venta"><b>Productos${f&&f!=='__none__'?' de '+nom(f):f==='__none__'?' sin proveedor':''}</b>: ${list.length} · valorizado a costo <b>$${val}</b></div>`+
      '<table><thead><tr><th>Cód</th><th>Producto</th><th>Proveedor</th><th>Costo</th><th>Venta</th><th>Stock</th></tr></thead><tbody>'+
      list.map(p=>`<tr><td>${p.codigo||'-'}</td><td>${p.nombre}</td><td>${nom(p.provId)}</td><td>$${p.costo??p.precio}</td><td>$${p.precio}</td><td>${p.stock}</td></tr>`).join('')+'</tbody></table>';
  }
  function render(){ hist(); stock(); renderVentas(); }
  function init(){
    render();
    const hoy = new Date().toISOString().slice(0,10);
    $('rep-desde').value = hoy; $('rep-hasta').value = hoy;
    $('rep-caja').onclick=caja;
    $('rep-hcli').onclick=hcli; $('rep-hprov').onclick=hprov;
    $('rep-stock').onclick=verStock;
    $('rep-verpp').onclick=porProveedor;
    $('rep-printpp').onclick=()=>{ document.body.classList.add('print-cierre'); window.print(); };
    caja();
  }
  return {init, render, renderVentas};
})();
