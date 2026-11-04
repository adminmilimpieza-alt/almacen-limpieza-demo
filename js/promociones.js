// Promociones con precio propio; sus componentes siempre son productos del catálogo.
const Promociones = (() => {
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let editId=null, items=[], inicializado=false;
  function render(){
    const box=$('promociones-editor'); if(!box)return;
    if(!inicializado){
      box.innerHTML='<h3>Promociones</h3><p class="hint">Definí un precio final para un conjunto de productos. La foto se toma del primer componente.</p><div id="promo-lista"></div><form id="promo-form"><h4 id="promo-titulo">Nueva promoción</h4><div class="row"><label>Nombre <input id="promo-nombre" required maxlength="200"></label><label>Precio final ($) <input id="promo-precio" type="number" min="0.01" step="0.01" required></label><label><input id="promo-activo" type="checkbox" checked> Visible en Caja</label></div><div class="row"><label>Producto <select id="promo-producto"></select></label><label>Cantidad <input id="promo-cant" type="number" min="1" step="1" value="1"></label><label><input id="promo-envase" type="checkbox" checked> Incluir envase (5 L)</label><button type="button" id="promo-agregar">Agregar componente</button></div><div id="promo-items"></div><div class="row"><button id="promo-guardar" type="submit" class="primary">Guardar promoción</button><button id="promo-cancelar" type="button">Nueva / cancelar edición</button></div></form>';
      inicializado=true; bind();
    }
    const db=Store.get(), selected=$('promo-producto').value;
    $('promo-producto').innerHTML=db.productos.filter(p=>p.activo!==false).map(p=>`<option value="${esc(p.id)}">${esc(p.nombre)} · ${esc(p.presentacion||'')}</option>`).join('');
    if(db.productos.some(p=>p.id===selected))$('promo-producto').value=selected;
    const promos=db.promociones||[];
    $('promo-lista').innerHTML=promos.length?promos.map(p=>`<div class="venta"><b>${esc(p.nombre)}</b> · $${esc(p.precio)} · ${p.activo===false?'Oculta':'Disponible: '+Store.disponibilidadVenta(p.id)}<br><small>${(p.items||[]).map(i=>esc(db.productos.find(x=>x.id===i.id)?.nombre||'Producto eliminado')+' × '+esc(i.cant)+(i.incluirEnvase===false?' (sin bidón)':'')).join(' · ')}</small><br><button type="button" data-promo-editar="${esc(p.id)}">Editar</button> <button type="button" data-promo-borrar="${esc(p.id)}">Eliminar</button></div>`).join(''):'<p class="hint">Todavía no hay promociones.</p>';
    $('promo-lista').querySelectorAll('[data-promo-editar]').forEach(b=>b.onclick=()=>{const p=promos.find(p=>p.id===b.dataset.promoEditar);editId=p.id;items=p.items.map(i=>({...i}));$('promo-titulo').textContent='Editar promoción';$('promo-nombre').value=p.nombre;$('promo-precio').value=p.precio;$('promo-activo').checked=p.activo!==false;renderItems();});
    $('promo-lista').querySelectorAll('[data-promo-borrar]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Eliminar esta promoción? Las ventas anteriores se conservan.'))return;try{await Store.eliminarPromocion(b.dataset.promoBorrar);if(editId===b.dataset.promoBorrar)reset();render();Caja.refresh();}catch(e){alert(e.message);}});
    renderItems();
  }
  function renderItems(){
    const db=Store.get();
    $('promo-items').innerHTML=items.length?items.map((i,n)=>`<p>${esc(db.productos.find(p=>p.id===i.id)?.nombre||'Producto eliminado')} × ${esc(i.cant)}${i.incluirEnvase===false?' · sin bidón':''} <button type="button" data-quitar="${n}">Quitar</button></p>`).join(''):'<p class="hint">Agregá al menos un componente.</p>';
    $('promo-items').querySelectorAll('[data-quitar]').forEach(b=>b.onclick=()=>{items.splice(Number(b.dataset.quitar),1);renderItems();});
  }
  function reset(){editId=null;items=[];$('promo-form').reset();$('promo-titulo').textContent='Nueva promoción';renderItems();}
  function bind(){
    $('promo-cancelar').onclick=reset;
    $('promo-agregar').onclick=()=>{
      const id=$('promo-producto').value,cant=Number($('promo-cant').value),p=Store.get().productos.find(p=>p.id===id);
      if(!p||!Number.isInteger(cant)||cant<1){alert('Elegí un producto y una cantidad entera positiva.');return;}
      const incluirEnvase=!p.envaseId||!/5\s*l/i.test(p.presentacion||p.nombre)?true:$('promo-envase').checked;
      const prev=items.find(i=>i.id===id&&i.incluirEnvase===incluirEnvase);
      if(prev)prev.cant+=cant;else items.push({id,cant,incluirEnvase});renderItems();
    };
    $('promo-form').onsubmit=async e=>{
      e.preventDefault();const button=$('promo-guardar');if(button.disabled)return;
      const nombre=$('promo-nombre').value.trim(),precio=Number($('promo-precio').value);
      if(!nombre||!Number.isFinite(precio)||precio<=0||!items.length){alert('Completá nombre, precio final y componentes.');return;}
      button.disabled=true;
      try{const p={nombre,precio,items:items.map(i=>({...i})),activo:$('promo-activo').checked};if(editId)p.id=editId;await Store.guardarPromocion(p);reset();render();Caja.refresh();}catch(e){alert(e.message);}finally{button.disabled=false;}
    };
  }
  function init(){render();}
  return {init,render};
})();
