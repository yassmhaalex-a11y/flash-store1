'use strict';
function validateDiscountInput(b){
 const code=String(b.code||'').trim();
 if(!/^[A-Za-z0-9_-]{2,40}$/.test(code))return 'Discount code must be 2–40 letters, numbers, underscores or hyphens';
 if(!['percent','fixed'].includes(b.kind))return 'Invalid discount type';
 const value=Number(b.value);
 if(!Number.isFinite(value)||value<=0||(b.kind==='percent'&&value>100)||(b.kind==='fixed'&&value>1000000))return 'Invalid discount value';
 if(!['all','products','categories'].includes(b.scope))return 'Invalid discount scope';
 if(b.max_uses!=null&&b.max_uses!==''&&(!Number.isSafeInteger(Number(b.max_uses))||Number(b.max_uses)<1))return 'Maximum uses must be a positive whole number';
 const min=b.min_order_total==null||b.min_order_total===''?null:Number(b.min_order_total);
 const max=b.max_order_total==null||b.max_order_total===''?null:Number(b.max_order_total);
 if((min!==null&&(!Number.isFinite(min)||min<0))||(max!==null&&(!Number.isFinite(max)||max<0))||(min!==null&&max!==null&&min>max))return 'Invalid discount order total range';
 const start=b.starts_at?Date.parse(b.starts_at):null,end=b.ends_at?Date.parse(b.ends_at):null;
 if((b.starts_at&&!Number.isFinite(start))||(b.ends_at&&!Number.isFinite(end))||(start!==null&&end!==null&&start>=end))return 'Invalid discount dates';
 return null;
}
module.exports={validateDiscountInput};
