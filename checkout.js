let items=[],payments=[],discountAmount=0,currentUser=null,productMap=new Map();
const money=n=>`${Number(n||0).toLocaleString()} EGP`;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function cart(){try{return JSON.parse(localStorage.flashCart||'[]')}catch{return[]}}
function saveCart(c){items=c;localStorage.flashCart=JSON.stringify(c);renderCart()}
function selectedProduct(i){return productMap.get(String(i.product_id))}
function selectedOption(i){const p=selectedProduct(i);return p?.options?.find(o=>String(o.id)===String(i.option_id))}
function needsAccount(i){const o=selectedOption(i);const p=selectedProduct(i);return !!(o?.requires_account_details??p?.requires_account_details)}
function itemPrice(i){const o=selectedOption(i),p=selectedProduct(i);return Number(o?.effective_price??o?.price??p?.effective_price??p?.price??i.price??0)}
function totals(){const sub=items.reduce((a,x)=>a+itemPrice(x)*Number(x.quantity||1),0);document.querySelector('#sub').textContent=money(sub);document.querySelector('#disc').textContent=money(discountAmount);document.querySelector('#total').textContent=money(Math.max(0,sub-discountAmount))}
function renderCart(){
 document.querySelector('#items').innerHTML=items.length?items.map((x,i)=>`<div class="cart-line"><img src="${esc(x.image||selectedOption(x)?.image_url||selectedProduct(x)?.image_url||'')}" alt=""><div style="flex:1"><b>${esc(x.name)}</b><div class="muted">${x.option_name?esc(x.option_name)+' · ':''}${money(itemPrice(x))}</div></div><div class="cart-qty"><button class="small-btn" onclick="changeQty(${i},-1)">−</button><b>${x.quantity}</b><button class="small-btn" onclick="changeQty(${i},1)">+</button></div><div class="cart-price"><b>${money(itemPrice(x)*x.quantity)}</b><button class="small-btn remove-cart" onclick="removeItem(${i})">Remove</button></div></div>`).join(''):`<p class="muted">Your cart is empty.</p>`;
 document.querySelector('#place').disabled=!items.length;totals();
}
window.changeQty=(i,d)=>{items[i].quantity=Math.max(1,Number(items[i].quantity||1)+d);saveCart(items)};
window.removeItem=i=>{items.splice(i,1);saveCart(items)};
function collectAccountDetails(){const email=document.querySelector('#accountEmail')?.value.trim()||'',password=document.querySelector('#accountPassword')?.value||'';return items.map(x=>({key:x.key,email:email,password:password}))}
async function init(){
 items=cart();renderCart();if(!items.length)return;
 const me=await fetch('/api/me').then(r=>r.ok?r.json():null).catch(()=>null);const gate=document.querySelector('#authGate'),wrap=document.querySelector('#checkoutWrap');
 if(!me){gate.classList.remove('hidden');wrap.classList.add('hidden');return}
 currentUser=me;gate.classList.add('hidden');wrap.classList.remove('hidden');document.querySelector('#fullName').value=me.full_name||'';document.querySelector('#email').value=me.email||'';
 try{
  const storeR=await fetch('/api/store');const store=await storeR.json();if(!storeR.ok)throw Error(store.error||'Could not load checkout data');
  productMap=new Map((store.products||[]).map(p=>[String(p.id),p]));renderCart();const requiresAccount=items.some(i=>needsAccount(i));document.querySelector('#accountFields').classList.toggle('hidden',!requiresAccount);
  payments=(store.payments||[]).filter(p=>p.active!==false);
  const select=document.querySelector('#payment');select.innerHTML=payments.length?payments.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join(''):`<option value="">No payment methods available</option>`;select.disabled=!payments.length;updatePayment();
 }catch(e){document.querySelector('#checkoutMsg').textContent=e.message}
}
function updatePayment(){const p=payments.find(x=>x.name===document.querySelector('#payment').value);document.querySelector('#paymentDetails').textContent=p?p.details:'Select a payment method to see the payment details.'}
document.querySelector('#payment').onchange=updatePayment;
document.querySelector('#proof').onchange=e=>{const f=e.target.files[0],im=document.querySelector('#proofPreview');if(f){im.src=URL.createObjectURL(f);im.style.display='block'}else im.style.display='none'};
document.querySelector('#apply').onclick=async()=>{const code=document.querySelector('#discount').value.trim();if(!code)return;const r=await fetch('/api/discount',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,items})});const d=await r.json();if(!r.ok){document.querySelector('#discountMsg').textContent=d.error||'Invalid code';discountAmount=0}else{discountAmount=Number(d.amount||0);document.querySelector('#discountMsg').textContent=`Applied: ${d.label||code}`}totals()};
document.querySelector('#place').onclick=async()=>{
 if(!items.length)return;if(!currentUser){location.href='/account.html?return=/checkout.html';return}
 if(!document.querySelector('#fullName').value.trim()||!document.querySelector('#phone').value.trim()){document.querySelector('#checkoutMsg').textContent='Please complete your name and phone.';return}
 if(!payments.length){document.querySelector('#checkoutMsg').textContent='No active payment method is available. Please contact support.';return}
 const details=collectAccountDetails();
 const requiresAccount=items.some(i=>needsAccount(i));if(requiresAccount&&(!document.querySelector('#accountEmail').value.trim()||!document.querySelector('#accountPassword').value)){document.querySelector('#checkoutMsg').textContent='This order requires the product Email and Password.';return}
 const file=document.querySelector('#proof').files[0];if(!file){document.querySelector('#checkoutMsg').textContent='Payment proof is required.';return}
 document.querySelector('#place').disabled=true;document.querySelector('#checkoutMsg').textContent='Uploading payment proof...';
 try{
  const fd=new FormData();fd.append('proof',file);const up=await fetch('/api/upload-proof',{method:'POST',body:fd});const ud=await up.json();if(!up.ok)throw Error(ud.error||'Payment proof upload failed');
  const payload={full_name:document.querySelector('#fullName').value.trim(),phone:document.querySelector('#phone').value.trim(),payment_method:document.querySelector('#payment').value,items,account_details:details,discount_code:document.querySelector('#discount').value.trim(),proof_url:ud.url};
  const r=await fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not place order');
  localStorage.removeItem('flashCart');document.querySelector('main').innerHTML=`<section class="modal-box" style="max-width:700px;margin:70px auto;text-align:center"><div style="font-size:70px">✓</div><span class="eyebrow">ORDER RECEIVED</span><h1>Order #${d.order_number}</h1><p class="muted">Your payment proof was received. You can track this order from your Account → Orders.</p><a class="btn" href="/account.html">View My Orders</a></section>`;
 }catch(e){document.querySelector('#checkoutMsg').textContent=e.message;document.querySelector('#place').disabled=false}
};
init();
const checkoutSearch=document.querySelector('#search');if(checkoutSearch)checkoutSearch.onkeydown=e=>{if(e.key==='Enter'&&e.target.value.trim())location.href='/search.html?q='+encodeURIComponent(e.target.value.trim())};
const checkoutMenu=document.querySelector('#menuBtn');if(checkoutMenu)checkoutMenu.onclick=()=>{location.href='/'};
