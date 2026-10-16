// turnos.js — control de cajas: apertura única, arqueo y cierre funcional.
// El saldo inicial se carga una sola vez por turno; el cierre arrastra al siguiente.
const Turnos = (() => {
  const $ = id => document.getElementById(id);
  const fmt = n => '$' + (Number(n)||0).toLocaleString('es-AR');
  const fh = iso => new Date(iso).toLocaleString('es-AR');
  function status(){
    const box = $('turno-status'); if(!box) return;
    const t = Store.turnoAbierto();
    box.innerHTML = t
      ? `<span class="tag ok">Caja abierta</span> <span class="hint">desde ${fh(t.apertura)} · saldo inicial ${fmt(t.saldo_inicial)}</span>`
      : `<span class="tag warn">Caja cerrada</span> <span class="hint">abrí el turno en el panel para vender</span>`;
  }
  function render(){
    status();
    const box = $('turno-box'); if(!box) return;
    const t = Store.turnoAbierto();
    if(!t){
      const ult = Store.ultimoCerrado();
      const arrastre = ult && ult.conteo ? ult.conteo.efectivo : 0;
      box.innerHTML = `<p class="hint">Sin turno abierto. El saldo inicial se carga <b>una sola vez</b>; al cerrar se arrastra al próximo.</p>
        <div class="row"><input id="t-saldo" type="number" min="0" value="${arrastre}" title="Saldo inicial en efectivo">
        <button id="t-abrir" class="primary">Abrir caja</button></div>
        ${ult?`<p class="hint">Arrastre sugerido del cierre anterior: ${fmt(arrastre)}</p>`:''}`;
      $('t-abrir').onclick = ()=>{
        try{ Store.abrirTurno(Number($('t-saldo').value)); render(); Caja.refresh(); Reportes.render(); }
        catch(e){ alert(e.message); }
      };
    } else {
      const r = Store.resumenTurno(t);
      const pm = m => r.porMedio[m]||{ing:0,egr:0};
      const esp = m => m==='efectivo' ? t.saldo_inicial+pm(m).ing-pm(m).egr : pm(m).ing-pm(m).egr;
      box.innerHTML = `<p class="hint">Abierta ${fh(t.apertura)} · saldo inicial <b>${fmt(t.saldo_inicial)}</b> · ${r.movs.length} movimientos</p>
        <table><thead><tr><th>Medio</th><th>Esperado</th><th>Conteo físico</th><th>Dif.</th></tr></thead><tbody>
        ${['efectivo','mercadopago','banco'].map(m=>`<tr><td>${m==='mercadopago'?'Mercado Pago':m[0].toUpperCase()+m.slice(1)}</td><td>${fmt(esp(m))}</td>
          <td><input id="t-c-${m}" type="number" min="0" value="${esp(m)}"></td><td id="t-d-${m}">0</td></tr>`).join('')}
        </tbody></table>
        <input id="t-notas" placeholder="Notas del cierre (opcional)">
        <div class="row"><button id="t-cerrar" class="primary">Cerrar caja</button></div>`;
      const viva = ()=>{ ['efectivo','mercadopago','banco'].forEach(m=>{
        const c = Number($('t-c-'+m).value)||0, d = c - esp(m);
        const el = $('t-d-'+m); el.textContent = (d>0?'+':'')+d;
        el.style.color = d===0 ? 'inherit' : (d<0 ? '#9F2F2D' : '#346538');
      }); };
      ['efectivo','mercadopago','banco'].forEach(m=>{ $('t-c-'+m).addEventListener('input', viva); });
      $('t-cerrar').onclick = ()=>{
        try{
          const conteo = {efectivo:Number($('t-c-efectivo').value)||0, mercadopago:Number($('t-c-mercadopago').value)||0, banco:Number($('t-c-banco').value)||0};
          const c = Store.cerrarTurno(conteo, $('t-notas').value);
          const dt = c.diferencia.efectivo.diferencia + c.diferencia.mercadopago.diferencia + c.diferencia.banco.diferencia;
          alert(`Caja cerrada. Diferencia total: ${dt} (${dt===0?'sin diferencias':dt<0?'faltante':'sobrante'})`);
          render(); Caja.refresh(); Reportes.render();
        }catch(e){ alert(e.message); }
      };
    }
    const db = Store.get();
    const hist = $('turnos-hist');
    hist.innerHTML = '<h3>Historial de cajas</h3>' + (db.turnos.length ? db.turnos.slice(0,20).map(t=>{
      const tot = t.diferencia ? (t.diferencia.efectivo.diferencia+t.diferencia.mercadopago.diferencia+t.diferencia.banco.diferencia) : null;
      return `<div class="venta"><b>${fh(t.apertura)}</b> → ${t.estado==='abierto' ? '<span class="tag ok">abierta</span>' : 'cerrada '+fh(t.cierre)} · inicial ${fmt(t.saldo_inicial)}` +
        (tot===null?'':` · dif. total <b>${tot}</b>`) + '</div>';
    }).join('') : '<p class="hint">Todavía no hay turnos.</p>');
  }
  function init(){ render(); }
  return {init, render, status};
})();
