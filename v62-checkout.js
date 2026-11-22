(()=>{
 const select=document.getElementById('v62Redeem'),info=document.getElementById('v62PointsInfo'),msg=document.getElementById('v62PointsMsg');if(!select)return;
 let seq=0;
 async function refresh(){const id=++seq;select.disabled=true;select.innerHTML='<option value="0">No points discount</option>';pointsDiscount=0;totals();
  if(!items.length)return;
  try{const r=await fetch('/api/points-quote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items})});const d=await r.json();if(id!==seq)return;if(!r.ok)throw Error(d.error||'Rewards unavailable');
   info.textContent=d.enabled?`Balance: ${d.balance} points · Up to ${d.max_discount} EGP off this cart`:'Point redemption is currently disabled by FLASH STORE.';
   for(let n=20;n<=Number(d.max_points||0);n+=20){const op=document.createElement('option');op.value=String(n);op.textContent=`${n} points = ${n/4} EGP OFF`;select.appendChild(op)}
   select.disabled=!d.enabled||!d.max_points;msg.textContent='Every 20 points = 5 EGP. Points are reserved when you place the order.';
  }catch(e){if(id===seq){info.textContent='FLASH POINTS unavailable';msg.textContent=e.message}}
 }
 select.onchange=()=>{if(Number(select.value)>0&&document.getElementById('discount').value.trim()){select.value='0';msg.textContent='Remove your discount code before using points.';return;}pointsDiscount=Number(select.value||0)/4;totals();};
 document.getElementById('discount').addEventListener('input',()=>{discountAmount=0;document.getElementById('discountMsg').textContent='Apply your code to calculate the discount.';if(document.getElementById('discount').value.trim()){select.value='0';pointsDiscount=0;}totals()});
 window.v62RefreshPoints=refresh;refresh();
})();
