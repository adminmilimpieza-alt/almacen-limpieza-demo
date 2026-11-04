// Administración de listas y modelo público, sin datos internos del negocio.
const ListasPrecios = (() => {
  const $=id=>document.getElementById(id);
  function informe(id){
    const lista=Store.listarListasPrecios().find(l=>l.id===id)||Store.listarListasPrecios()[0];
    return {titulo:'Lista de precios · '+lista.nombre,subtitulo:'Precios de venta · '+new Date().toLocaleDateString('es-AR'),columnas:['Código','Producto','Presentación','Precio ($)'],filas:Store.get().productos.filter(p=>p.activo!==false).map(p=>[p.codigo||'',p.nombre,p.presentacion||p.categoria||'',Store.precioEnLista(p.id,lista.id)]),resumen:[],fotos:Store.get().productos.filter(p=>p.activo!==false).map(p=>p.foto||'')};
  }
  function render(){
    const select=$('precio-lista'); if(!select)return;
    const selected=select.value||'mostrador';
    const listas=Store.listarListasPrecios();
    select.replaceChildren(...listas.map(l=>{const o=document.createElement('option');o.value=l.id;o.textContent=l.nombre;return o;}));
    select.value=listas.some(l=>l.id===selected)?selected:'mostrador';
    renderEditor();
    const protectedList=['mostrador','revendedores'].includes(select.value);
    if($('lista-renombrar'))$('lista-renombrar').disabled=select.value==='mostrador';
    if($('lista-eliminar'))$('lista-eliminar').disabled=protectedList;
  }
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderEditor(){
    const box=$('lista-precios-editor');if(!box)return;
    const id=$('precio-lista').value,lista=Store.listarListasPrecios().find(l=>l.id===id);
    if(id==='mostrador'){box.innerHTML='<p class="hint">Los precios de Mostrador se editan en Stock. Elegí otra lista para configurar sus precios particulares. La asignación de listas se realiza en Clientes.</p>';return;}
    box.innerHTML='<p class="hint">Precio final con envase cuando corresponda. Los productos sin precio particular heredan Mostrador. Asigná la lista desde Clientes.</p><div class="precios-tabla"><table><thead><tr><th>Producto</th><th>Precio final ($)</th><th>Origen</th></tr></thead><tbody>'+Store.get().productos.filter(p=>p.activo!==false).map(p=>'<tr><td>'+escape(p.nombre)+'<small>'+escape(p.presentacion||'')+'</small></td><td><input type="number" min="0" step="0.01" aria-label="Precio de '+escape(p.nombre)+'" data-lista-producto="'+escape(p.id)+'" value="'+Store.precioEnLista(p.id,id)+'"></td><td>'+(Object.hasOwn(lista?.precios||{},p.id)?'<button data-lista-restablecer="'+escape(p.id)+'">Usar Mostrador</button>':'Hereda Mostrador')+'</td></tr>').join('')+'</tbody></table></div>';
    box.querySelectorAll('[data-lista-producto]').forEach(input=>input.onchange=()=>mutate(()=>Store.editarPrecioLista(id,input.dataset.listaProducto,'precio',Number(input.value))));
    box.querySelectorAll('[data-lista-restablecer]').forEach(button=>button.onclick=()=>mutate(()=>Store.restablecerPrecioLista(id,button.dataset.listaRestablecer)));
  }
  async function mutate(action){try{await action();render();if(typeof Precios!=='undefined')Precios.render();if(typeof Entidades!=='undefined')Entidades.render();}catch(err){alert(err.message);}}
  function init(){
    const box=$('listas-gestion');
    if(box && !box.dataset.ready){
      box.dataset.ready='1';
      box.innerHTML='<p class="hint">Los productos sin precio particular heredan Mostrador. Cada cliente usa su lista asignada.</p><label>Nombre de lista <input id="lista-nombre" maxlength="80" placeholder="Ej.: Mayorista"></label><div class="listas-acciones"><button id="lista-crear" type="button">Nueva lista</button><button id="lista-renombrar" type="button">Renombrar</button><button id="lista-eliminar" type="button">Eliminar lista</button><button id="lista-imprimir" type="button">Imprimir lista</button><button id="lista-pdf" type="button">Descargar PDF con fotos</button><button id="lista-csv" type="button">Exportar CSV</button></div>';
      $('lista-crear').onclick=()=>{const nombre=$('lista-nombre').value;if(!nombre.trim()){ $('lista-nombre').focus(); return; }mutate(async()=>{const result=await Store.guardarListaPrecios({nombre:nombre.trim()});render();if(result?.id)$('precio-lista').value=result.id;});};
      $('lista-renombrar').onclick=()=>{const id=$('precio-lista').value;const current=Store.listarListasPrecios().find(l=>l.id===id);const nombre=$('lista-nombre').value;if(nombre?.trim())mutate(()=>Store.guardarListaPrecios({id,nombre:nombre.trim()}));};
      $('lista-eliminar').onclick=()=>{const id=$('precio-lista').value;if(confirm('¿Eliminar esta lista? Sólo se puede si ningún cliente la tiene asignada.'))mutate(()=>Store.eliminarListaPrecios(id));};
      $('lista-imprimir').onclick=async()=>{try{await ExportarInforme.imprimir(informe($('precio-lista').value));}catch(err){alert(err.message);}};
      $('lista-pdf').onclick=async()=>{const button=$('lista-pdf');button.disabled=true;try{await ExportarInforme.exportar('pdf',informe($('precio-lista').value));}catch(err){alert(err.message);}finally{button.disabled=false;}};
      $('lista-csv').onclick=()=>{try{ExportarInforme.exportar('csv',informe($('precio-lista').value));}catch(err){alert(err.message);}};
      $('precio-lista')?.addEventListener('change',render);
    }
    render();
  }
  return {init,render,informe};
})();
