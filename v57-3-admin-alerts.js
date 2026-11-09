/* V57.3 section badges: piggyback on existing admin fetches. No additional polling. */
(()=>{'use strict';
const nativeFetch=window.fetch.bind(window);
function update(d){if(!d||typeof d!=='object')return;
 const notes=(d.notifications||[]).filter(n=>!n.read);
 const counts={orders:0,reviews:0,products:0,stock:0,notifications:notes.length,'game-requests':0};
 // Pending orders remain actionable until their status changes.
 counts.orders=(d.orders||[]).filter(o=>['pending','new','processing'].includes(String(o.status||'').toLowerCase())).length;
 for(const n of notes){const msg=String((n.title||'')+' '+(n.message||'')).toLowerCase();
 if(/review|rating|تقييم/.test(msg))counts.reviews++;
 else if(/stock|inventory|مخزون/.test(msg)){counts.stock++;counts.products++}
 else if(/game request|requested game|طلب لعبة/.test(msg))counts['game-requests']++;
 else if(/order|طلب/.test(msg) && !counts.orders)counts.orders++;
 }
 for(const [key,value] of Object.entries(counts)){
  document.querySelectorAll('[data-alert-for="'+key+'"] , #tabs [data-tab="'+key+'"] .v573-tile-badge').forEach(el=>{el.textContent=String(value);el.hidden=!value;});
  const tab=document.querySelector('#tabs button[data-tab="'+key+'"]');if(tab){let badge=tab.querySelector('.v573-tile-badge');if(!badge){badge=document.createElement('span');badge.className='v573-tile-badge';tab.appendChild(badge)}badge.textContent=String(value);badge.hidden=!value;}
 }
 const bell=document.getElementById('v57BellCount');if(bell)bell.textContent=String(notes.length);
}
window.fetch=function(input,init){const promise=nativeFetch(input,init);try{const url=typeof input==='string'?input:input?.url||'';if(/\/api\/admin(?:\?|$)/.test(url)){promise.then(r=>{if(r.ok)r.clone().json().then(update).catch(()=>{})}).catch(()=>{})}}catch(_){}return promise};
})();
