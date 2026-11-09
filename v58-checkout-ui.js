/* Visual-only checkout enhancements: does not alter pricing, payment or API calls. */
(()=>{
 const count=document.getElementById('v58CartCount');
 const cart=document.getElementById('items');
 if(!count||!cart)return;
 function update(){
  const raw=localStorage.getItem('flashCart');let lines=[];
  try{lines=JSON.parse(raw||'[]');if(!Array.isArray(lines))lines=[]}catch{}
  const qty=lines.reduce((n,x)=>n+(Number.isFinite(Number(x.quantity))?Math.max(0,Number(x.quantity)):0),0);
  count.textContent=`(${qty})`;
 }
 update();
 const observer=new MutationObserver(update);
 observer.observe(cart,{childList:true,subtree:true});
 window.addEventListener('storage',e=>{if(e.key==='flashCart')update()});
})();
