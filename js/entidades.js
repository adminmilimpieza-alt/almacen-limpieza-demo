// entidades.js — puntos 3 y 4: clientes y proveedores
const Entidades = (() => {
  const $ = id => document.getElementById(id);
  let col = 'clientes', editId = null;
  function renderTabla(nombre, tbId){
    const db = Store.get();
    const tb = $(tbId); tb.innerHTML='';
    db[nombre].forEach(e=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${e.nombre}</td><td>${e.tel||'-'}</td><td>${e.extra||'-'}</td>`;
      const td = document.createElement('td');
      const bE = document.createElement('button'); bE.textContent='Editar';
      bE.onclick=()=>{ col=nombre; editId=e.id;
        $('ent-titulo').textContent = (nombre==='clientes'?'Cliente':'Proveedor');
        $('e-nombre').value=e.nombre; $('e-tel').value=e.tel||''; $('e-extra').value=e.extra||'';
        $('modal-ent').showModal(); };
      const bD = document.createElement('button'); bD.textContent='Borrar';
      bD.onclick=()=>{ if(confirm('Borrar '+e.nombre+'?')){ Store.delEntidad(nombre, e.id); render(); } };
      td.appendChild(bE); td.appendChild(bD); tr.appendChild(td); tb.appendChild(tr);
    });
  }
  function render(){ renderTabla('clientes','tabla-cli'); renderTabla('proveedores','tabla-prov'); Caja.refresh(); }
  function init(){
    render();
    $('cli-nuevo').onclick=()=>{ col='clientes'; editId=null; $('ent-titulo').textContent='Nuevo cliente';
      $('e-nombre').value=''; $('e-tel').value=''; $('e-extra').value=''; $('modal-ent').showModal(); };
    $('prov-nuevo').onclick=()=>{ col='proveedores'; editId=null; $('ent-titulo').textContent='Nuevo proveedor';
      $('e-nombre').value=''; $('e-tel').value=''; $('e-extra').value=''; $('modal-ent').showModal(); };
    $('e-guardar').onclick=()=>{
      const e = {id: editId || col[0]+Date.now(), nombre:$('e-nombre').value.trim(),
        tel:$('e-tel').value.trim(), extra:$('e-extra').value.trim()};
      if(!e.nombre){ alert('Falta nombre'); return; }
      Store.upsertEntidad(col, e); render();
    };
  }
  return {init, render};
})();
