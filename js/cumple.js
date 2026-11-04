// cumple.js — calendario de cumpleaños de clientes y saludo por WhatsApp.
const Cumple = (() => {
  const $ = id => document.getElementById(id);
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  let cursor = null, selDia = null;
  const hoy = () => { const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Argentina/Cordoba',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return {y:Number(p.year),m:Number(p.month),d:Number(p.day)}; };
  const esc = s => String(s||'').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function clienteDe(c){
    const m = String(c.nac||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(!m) return null;
    const y = Number(m[1]), mes = Number(m[2]), d = Number(m[3]);
    if(!y || mes<1 || mes>12 || d<1 || d>31) return null;
    return { y, m:mes, d };
  }
  function clientes(){
    return Store.get().clientes.filter(c => c.id!=='c1').map(c => {
      const f = clienteDe(c); return f ? { c, f } : null;
    }).filter(Boolean);
  }
  function telArg(tel){
    let d = String(tel||'').replace(/\D/g,'');
    if(!d) return '';
    if(d.startsWith('54')) return d;
    d = d.replace(/^0+/,'');
    if(d.length===10) return '549'+d;
    if(d.length===11 && d[0]==='9') return '54'+d;
    return d;
  }
  function primerNombre(nombre){
    return String(nombre||'').trim().split(/\s+/)[0]||'';
  }
  function saludo(c){
    const tpl = ($('cumple-msg') && $('cumple-msg').value) || '¡Feliz cumpleaños, {nombre}!';
    return tpl.split('{nombre}').join(primerNombre(c.nombre));
  }
  function wa(c){
    const tel = telArg(c.tel);
    if(!tel) return;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(saludo(c))}`, '_blank', 'noopener');
  }
  function delMes(){ return clientes().filter(x => x.f.m===cursor.m+1); }
  function renderGrid(){
    const grid = $('cal-grid'); grid.innerHTML = '';
    DIAS.forEach(d => { const el = document.createElement('div'); el.className='cal-dow'; el.textContent=d; grid.appendChild(el); });
    const t = hoy();
    const primero = new Date(cursor.y, cursor.m, 1);
    const offset = (primero.getDay()+6)%7;
    const dias = new Date(cursor.y, cursor.m+1, 0).getDate();
    const celdas = Math.ceil((offset+dias)/7)*7;
    const meses = delMes();
    for(let i=0;i<celdas;i++){
      const f = new Date(cursor.y, cursor.m, 1-offset+i);
      const dia = f.getDate(), mes = f.getMonth()+1, anio = f.getFullYear();
      const b = document.createElement('button');
      b.type='button'; b.className='cal-day';
      if(mes!==cursor.m+1) b.classList.add('otro');
      const n = meses.filter(x => x.f.d===dia && x.f.m===mes).length;
      if(n) b.classList.add('tiene');
      if(anio===t.y && mes===t.m && dia===t.d) b.classList.add('hoy');
      if(selDia===dia && mes===cursor.m+1 && anio===cursor.y) b.classList.add('sel');
      b.innerHTML = `<span class="cal-num">${dia}</span>${n?`<span class="cal-q">${n}</span>`:''}`;
      b.setAttribute('aria-label', `${dia} de ${MESES[mes-1]}${n?`, ${n} cumpleaños`:''}`);
      b.onclick = ()=>{
        if(mes!==cursor.m+1 || anio!==cursor.y){ cursor = {y:anio, m:mes-1}; selDia=null; render(); return; }
        selDia = selDia===dia ? null : dia; render();
      };
      grid.appendChild(b);
    }
  }
  function renderLista(){
    const cont = $('cumple-lista'); cont.innerHTML = '';
    let list = delMes();
    const dia=$('cumple-dia');if(dia){dia.replaceChildren();const title=document.createElement('h3');title.textContent=selDia==null?'Elegí un día para ver sus cumpleaños':`${selDia} de ${MESES[cursor.m]}`;dia.appendChild(title);if(selDia!=null){const names=list.filter(x=>x.f.d===selDia).map(x=>x.c.nombre);const p=document.createElement('p');p.textContent=names.length?names.join(' · '):'Sin cumpleaños este día.';dia.appendChild(p);}}
    list.sort((a,b) => a.f.d-b.f.d || String(a.c.nombre).localeCompare(String(b.c.nombre), 'es'));
    const head = document.createElement('div'); head.className='hint';
    head.textContent = list.length
      ? (selDia!=null ? `${list.length} cumpleaños el ${selDia} de ${MESES[cursor.m]}` : `${list.length} cumpleaños en ${MESES[cursor.m]}`)
      : (selDia!=null ? `Sin cumpleaños el ${selDia} de ${MESES[cursor.m]}` : `Sin cumpleaños en ${MESES[cursor.m]}`);
    cont.appendChild(head);
    if(!list.length){ const p = document.createElement('div'); p.className='cumple-vacio'; p.textContent='Nada para saludar este mes.'; cont.appendChild(p); return; }
    list.forEach(({c,f}) => {
      const row = document.createElement('div'); row.className='cumple-row';
      const day = document.createElement('span'); day.className='cumple-day'; day.textContent=String(f.d).padStart(2,'0');
      const info = document.createElement('span'); info.className='cumple-info';
      const nom = document.createElement('b'); nom.textContent=c.nombre; info.appendChild(nom);
      const det = document.createElement('span'); det.className='hint';
      det.textContent = `Cumple ${f.d} de ${MESES[f.m-1]}` + (c.ref ? ` · ${c.ref}` : '') + (c.extra ? ` · ${c.extra}` : '') + (c.tel ? ` · ${c.tel}` : '');
      info.appendChild(det);
      const b = document.createElement('button'); b.type='button'; b.className='primary';
      if(telArg(c.tel)){ b.textContent='Saludar'; b.onclick=()=>wa(c); }
      else { b.textContent='Sin tel'; b.disabled=true; }
      row.appendChild(day); row.appendChild(info); row.appendChild(b); cont.appendChild(row);
    });
  }
  function render(){
    if(!cursor){ const t = hoy(); cursor = {y:t.y, m:t.m-1}; }
    const mes = $('cal-mes'); if(mes) mes.textContent = `${MESES[cursor.m]} ${cursor.y}`;
    renderGrid(); renderLista(); renderAviso();
  }
  function renderAviso(){
    const box=$('cumples-alert');if(!box)return;const t=hoy(),list=clientes().filter(x=>x.f.m===t.m&&x.f.d===t.d);box.hidden=!list.length;box.replaceChildren();if(!list.length)return;
    const text=document.createElement('span');text.textContent='🎂 Hoy cumplen: '+list.map(x=>x.c.nombre).join(' · ')+'. ';const button=document.createElement('button');button.type='button';button.textContent='Ver calendario';button.onclick=()=>{cursor={y:t.y,m:t.m-1};selDia=t.d;render();Panel.go('mod-cumple');};box.append(text,button);
  }
  function init(){
    const t = hoy(); cursor = {y:t.y, m:t.m-1}; selDia = null;
    $('cal-prev').onclick = ()=>{ cursor = cursor.m===0 ? {y:cursor.y-1, m:11} : {y:cursor.y, m:cursor.m-1}; selDia=null; render(); };
    $('cal-next').onclick = ()=>{ cursor = cursor.m===11 ? {y:cursor.y+1, m:0} : {y:cursor.y, m:cursor.m+1}; selDia=null; render(); };
    $('cal-hoy').onclick = ()=>{ const h=hoy(); selDia=null; cursor={y:h.y, m:h.m-1}; render(); };
    render();
  }
  return {init, render};
})();
