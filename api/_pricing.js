function effectivePrice(row){
  const base=Number(row?.price||0);
  const sale=Number(row?.sale_price||0);
  const now=Date.now();
  const start=row?.sale_starts_at?Date.parse(row.sale_starts_at):NaN;
  const end=row?.sale_ends_at?Date.parse(row.sale_ends_at):NaN;
  if(sale>0 && (!Number.isFinite(start)||now>=start) && (!Number.isFinite(end)||now<end)) return sale;
  return base;
}
function enrichPrice(row){
  const p={...row};
  p.effective_price=effectivePrice(p);
  p.sale_active=p.effective_price!==Number(p.price||0);
  return p;
}
module.exports={effectivePrice,enrichPrice};
