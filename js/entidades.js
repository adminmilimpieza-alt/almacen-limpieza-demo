// entidades.js — puntos 3 y 4: clientes (con deuda de cuenta corriente) y proveedores
const Entidades = (() => {
  const $ = id => document.getElementById(id);
  let col = 'clientes', editId = null;
  function render(){
    const db = Store.get();
    // Clientes
    const tb = $('tabla-cli'); tb.innerHTML='';
    db.clientes.forEach(e=>{
      const tr = document.createElement('tr');
      const deuda = e.deuda||0;
      tr.innerHTML = `<td>${e.nombre}</td><td>${e.tel||'-'}</td><td>${e.extra||'-'}</td>`+
        `<td>${deuda>0?`<b>$${deuda}</b>`:'$0'}</td>`;
      const td = document.createElement('td');
      if(deuda>0){
        const inp = document.createElement('input'); inp.type='number'; inp.min='1'; inp.max=String(deuda);
        inp.placeholder='Monto'; inp.style.maxWidth='110px';
        const med = document.createElement('select');
        med.innerHTML = '<option value="efectivo">Efectivo</option><option value="mercadopago">Mercado Pago</option><option value="banco">Banco</option>';
        med.style.maxWidth='150px';
        const bC = document.createElement('button'); bC.textContent='Cobrar'; bC.className='primary';
        bC.onclick=()=>{ try{ Store.cobrarDeuda(e.id, inp.value, med.value); render(); Reportes.render(); }
          catch(err){ alert(err.message); } };
        td.appendChild(inp); td.appendChild(med); td.appendChild(bC);
      }
      const bE = document.createElement('button'); bE.textContent='Editar';
      bE.onclick=()=>{ col='clientes'; editId=e.id;
        $('ent-titulo').textContent='Cliente';
        $('e-nombre').value=e.nombre; $('e-tel').value=e.tel||''; $('e-extra').value=e.extra||'';
        $('modal-ent').showModal(); };
      const bD = document.createElement('button'); bD.textContent='Borrar';
      bD.onclick=()=>{ if(confirm('Borrar '+e.nombre+'?')){ Store.delEntidad('clientes', e.id); render(); } };
      td.appendChild(bE); td.appendChild(bD); tr.appendChild(td); tb.appendChild(tr);
    });
    // Proveedores
    const tp = $('tabla-prov'); tp.innerHTML='';
    db.proveedores.forEach(e=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${e.nombre}</td><td>${e.tel||'-'}</td><td>${e.extra||'-'}</td>`;
      const td = document.createElement('td');
      const bE = document.createElement('button'); bE.textContent='Editar';
      bE.onclick=()=>{ col='proveedores'; editId=e.id;
        $('ent-titulo').textContent='Proveedor';
        $('e-nombre').value=e.nombre; $('e-tel').value=e.tel||''; $('e-extra').value=e.extra||'';
        $('modal-ent').showModal(); };
      const bD = document.createElement('button'); bD.textContent='Borrar';
      bD.onclick=()=>{ if(confirm('Borrar '+e.nombre+'?')){ Store.delEntidad('proveedores', e.id); render(); } };
      td.appendChild(bE); td.appendChild(bD); tr.appendChild(td); tp.appendChild(tr);
    });
    Caja.refresh();
  }
  function init(){
    render();
    $('cli-nuevo').onclick=()=>{ col='clientes'; editId=null; $('ent-titulo').textContent='Nuevo cliente';
      $('e-nombre').value=''; $('e-tel').value=''; $('e-extra').value=''; $('modal-ent').showModal(); };
    $('prov-nuevo').onclick=()=>{ col='proveedores'; editId=null; $('ent-titulo').textContent='Nuevo proveedor';
      $('e-nombre').value=''; $('e-tel').value=''; $('e-extra').value=''; $('modal-ent').showModal(); };
    $('e-guardar').onclick=()=>{
      const db = Store.get();
      const cur = editId && db[col].find(x=>x.id===editId);
      const e = {id: editId || col[0]+Date.now(), nombre:$('e-nombre').value.trim(),
        tel:$('e-tel').value.trim(), extra:$('e-extra').value.trim(),
        deuda: cur ? (cur.deuda||0) : 0};
      if(!e.nombre){ alert('Falta nombre'); return; }
      Store.upsertEntidad(col, e); render();
    };
  }
  return {init, render};
})();
