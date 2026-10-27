// Prices are saved by each operation in the central business, just like stock and sales.
const PreciosOnline=(()=>{
 const $=id=>document.getElementById(id);
 function estado(message=''){$('precios-online-estado').textContent=message||'Los cambios se guardan online al terminar de editar o aplicar una lista.';}
 async function refresh(){try{await OnlineBusiness.refresh(true);estado('Precios actualizados desde el negocio online.');}catch(e){estado(e.message);}}
 function init(){estado();$('precios-login').hidden=true;$('precio-publicar').onclick=refresh;$('precio-actualizar').onclick=refresh;}
 return {init,refresh,estado};
})();
OnlineBusiness.ready.then(()=>PreciosOnline.init());
