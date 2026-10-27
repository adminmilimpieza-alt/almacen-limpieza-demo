export function normalizeItems(input) {
  if (!Array.isArray(input) || !input.length || input.length > 100) throw new Error('El ticket debe tener entre 1 y 100 productos.');
  const items = input.map(i => {
    if (!i || typeof i.id !== 'string' || !i.id || typeof i.nombre !== 'string' || !i.nombre.trim()) throw new Error('Producto inválido.');
    if (typeof i.precio !== 'number' || !Number.isFinite(i.precio) || i.precio <= 0 || typeof i.cant !== 'number' || !Number.isFinite(i.cant) || i.cant <= 0 || i.cant > 10000) throw new Error('Precio o cantidad inválidos.');
    const cents = Math.round((i.precio * i.cant + Number.EPSILON) * 100);
    if (!Number.isSafeInteger(cents) || cents < 1) throw new Error('Importe inválido.');
    return {id:i.id.slice(0,80), nombre:i.nombre.trim().slice(0,180), precio:i.precio, cant:i.cant, cents};
  });
  const totalCents = items.reduce((n,i)=>n+i.cents,0);
  if (totalCents > 10000000000) throw new Error('El ticket supera el importe máximo.');
  return {items:items.map(({cents,...i})=>i), total:totalCents/100,
    mpItems:items.map(i=>({id:i.id,title:`${i.nombre} × ${i.cant}`.slice(0,250),quantity:1,unit_price:i.cents/100,currency_id:'ARS'}))};
}
export function matchesPayment(order, payment) {
  return String(payment.collector_id) === String(order.collector_id) && payment.external_reference === order.id &&
    payment.currency_id === 'ARS' && Math.round(Number(payment.transaction_amount)*100) === Math.round(order.total*100) &&
    Number(payment.transaction_amount_refunded||0) === 0;
}
export function paymentResult(order, payments) {
  const exact = payments.filter(p=>matchesPayment(order,p));
  const approved = exact.find(p=>p.status==='approved');
  if(approved) return {status:'approved', payment_id:String(approved.id)};
  // Refunds and chargebacks must override a previously approved payment.
  const reversed = payments.find(p=>String(p.id)===String(order.payment_id) && ['refunded','charged_back'].includes(p.status));
  if(reversed) return {status:reversed.status,payment_id:String(reversed.id)};
  const changed=payments.find(p=>String(p.id)===String(order.payment_id));
  if(changed && !matchesPayment(order,changed)) return {status:'review',payment_id:String(changed.id)};
  return {status:order.status === 'approved' ? 'review' : 'pending',payment_id:order.payment_id||null};
}
