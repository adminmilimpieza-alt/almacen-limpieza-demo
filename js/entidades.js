// entidades.js — puntos 3 y 4: clientes (deuda, cumpleaños y referencia) y proveedores
const Entidades = (() => {
  const $ = id => document.getElementById(id);
  let col = 'clientes', editId = null, baseEntidad = null;

  // Días que faltan para el próximo cumpleaños (0 = hoy).
  function diasCumple(nac){
    if(!nac) return null;
    const p = String(nac).split('-').map(Number);
    if(p.length<3 || !p[1] || !p[2]) return null;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    let f = new Date(hoy.getFullYear(), p[1]-1, p[2]);
    if(f < hoy) f = new Date(hoy.getFullYear()+1, p[1]-1, p[2]);
    return Math.round((f - hoy)/86400000);
  }
  function fmtCumple(nac){
    if(!nac) return '—';
    const p = String(nac).split('-');
    if(p.length<3) return '—';
    return `${p[2]}/${p[1]}` + (diasCumple(nac)===0 ? ' 🎂' : '');
  }
  // Aviso en la caja: cumpleaños de hoy y de los próximos 7 días.
  function renderCumples(){
    const box = $('cumples-alert'); if(!box) return;
    const hoy = [], prox = [];
    Store.get().clientes.forEach(c=>{
      const d = diasCumple(c.nac);
      if(d===0) hoy.push(c);
      else if(d!==null && d<=7) prox.push({c, d});
    });
    if(!hoy.length && !prox.length){ box.hidden = true; box.innerHTML=''; return; }
    const ref = c => (c.ref || c.extra) ? ` <span class="hint">(${c.ref || c.extra})</span>` : '';
    const partes = [];
    if(hoy.length) partes.push(`<b>🎂 Hoy cumple${hoy.length>1?'n':''} años:</b> ${hoy.map(c=>c.nombre+ref(c)).join(' · ')}`);
    if(prox.length){
      prox.sort((a,b)=>a.d-b.d);
      partes.push(`<b>Próximos cumpleaños:</b> ${prox.map(x=>`${x.c.nombre}${ref(x.c)} (${x.d===1?'mañana':'en '+x.d+' días'})`).join(' · ')}`);
    }
    box.innerHTML = partes.join('<br>');
    box.hidden = false;
  }
  function mostrarNac(show){ const w = $('e-nac-wrap'); if(w) w.hidden = !show; }
  function abrir(colName, e){
    col = colName; editId = e ? e.id : null;
    baseEntidad = e ? {...e} : null;
    $('ent-titulo').textContent = (e?'Editar ':'Nuevo ') + (colName==='clientes'?'cliente':'proveedor');
    $('e-nombre').value = e ? e.nombre : '';
    $('e-tel').value = e ? (e.tel||'') : '';
    $('e-ref').value = e ? (e.ref||'') : '';
    $('e-extra').value = e ? (e.extra||'') : '';
    $('e-extra').placeholder = colName==='clientes' ? 'Dirección' : 'Notas';
    $('e-nac').value = (e && e.nac) || '';
    mostrarNac(colName==='clientes');
    $('modal-ent').showModal();
  }
  function render(){
    const db = Store.get();
    renderCumples();
    // Clientes
    const tb = $('tabla-cli'); tb.innerHTML='';
    db.clientes.forEach(e=>{
      const tr = document.createElement('tr');
      const deuda = e.deuda||0;
      const hoy = diasCumple(e.nac)===0;
      tr.innerHTML = `<td>${e.nombre}</td><td>${e.ref||'-'}</td><td>${e.tel||'-'}</td><td>${e.extra||'-'}</td>`+
        `<td${hoy?' style="font-weight:700"':''}>${fmtCumple(e.nac)}</td>`+
        `<td>${deuda>0?`<b>$${deuda}</b>`:'$0'}</td>`;
      const td = document.createElement('td');
      if(deuda>0){
        const inp = document.createElement('input'); inp.type='number'; inp.min='1'; inp.max=String(deuda);
        inp.placeholder='Monto'; inp.style.maxWidth='110px';
        const med = document.createElement('select');
        med.innerHTML = '<option value="efectivo">Efectivo</option><option value="mercadopago">Mercado Pago</option><option value="banco">Banco</option>';
        med.style.maxWidth='150px';
        const bC = document.createElement('button'); bC.textContent='Cobrar'; bC.className='primary';
        bC.onclick=async ()=>{ try{ await Store.cobrarDeuda(e.id, inp.value, med.value); render(); Reportes.render(); }
          catch(err){ alert(err.message); } };
        td.appendChild(inp); td.appendChild(med); td.appendChild(bC);
      }
      const bE = document.createElement('button'); bE.textContent='Editar';
      bE.onclick=()=>abrir('clientes', e);
      const bD = document.createElement('button'); bD.textContent='Borrar';
      bD.onclick=async ()=>{ if(confirm('Borrar '+e.nombre+'?')){ try{ await Store.delEntidad('clientes', e.id); render(); }catch(err){ alert(err.message); } } };
      td.appendChild(bE); td.appendChild(bD); tr.appendChild(td); tb.appendChild(tr);
    });
    // Proveedores
    const tp = $('tabla-prov'); tp.innerHTML='';
    db.proveedores.forEach(e=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${e.nombre}</td><td>${e.ref||'-'}</td><td>${e.tel||'-'}</td><td>${e.extra||'-'}</td>`;
      const td = document.createElement('td');
      const bE = document.createElement('button'); bE.textContent='Editar';
      bE.onclick=()=>abrir('proveedores', e);
      const bD = document.createElement('button'); bD.textContent='Borrar';
      bD.onclick=async ()=>{ if(confirm('Borrar '+e.nombre+'?')){ try{ await Store.delEntidad('proveedores', e.id); render(); }catch(err){ alert(err.message); } } };
      td.appendChild(bE); td.appendChild(bD); tr.appendChild(td); tp.appendChild(tr);
    });
    Caja.refresh();
    if(typeof Cumple!=='undefined' && Cumple.render) Cumple.render();
    if(typeof Pedidos!=='undefined' && Pedidos.render) Pedidos.render();
  }
  function init(){
    render();
    $('form-ent').onsubmit=event=>{event.preventDefault();$('e-guardar').click();};
    $('cancelar-ent').onclick=()=>$('modal-ent').close();
    $('cli-nuevo').onclick=()=>abrir('clientes', null);
    $('prov-nuevo').onclick=()=>abrir('proveedores', null);
    $('e-guardar').onclick=async event=>{
      event.preventDefault();
      const button=$('e-guardar'); if(button.disabled)return;
      const db = Store.get();
      const cur = editId && db[col].find(x=>x.id===editId);
      const e = Object.assign({}, cur||{}, {
        id: editId || crypto.randomUUID(),
        nombre:$('e-nombre').value.trim(),
        tel:$('e-tel').value.trim(),
        ref:$('e-ref').value.trim(),
        extra:$('e-extra').value.trim(),
        nac: col==='clientes' ? ($('e-nac').value||'') : ((cur&&cur.nac)||'')
      });
      if(!('deuda' in e)) e.deuda = 0;
      if(!e.nombre){ alert('Falta nombre'); return; }
      button.disabled=true;
      try{ await Store.upsertEntidad(col, e, baseEntidad); render(); $('modal-ent').close(); }
      catch(err){ alert(err.message); }
      finally{ button.disabled=false; }
    };
  }
  return {init, render, renderCumples};
})();
