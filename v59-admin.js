/* V59 navigation: presentation only, retains V58 original admin behavior */
(()=>{'use strict';
const panel=document.getElementById('panel'),tabs=document.getElementById('tabs');
if(!panel||!tabs)return;
const sidebar=document.createElement('aside');sidebar.id='v59Sidebar';sidebar.setAttribute('aria-label','Admin sections');
const logo=document.createElement('div');logo.className='v59-logo';logo.innerHTML='<span>⚡</span> FLASH STORE';sidebar.append(logo);
const label=document.createElement('div');label.className='v59-label';label.textContent='MAIN MENU';sidebar.append(label);
const entries=[['','Dashboard','▦'],['orders','Orders','▣'],['products','Products','▧'],['categories','Categories','▤'],['banners','Hero Banners','▥'],['discounts','Discounts','◇'],['reviews','Reviews','★'],['notifications','Notifications','♧'],['stock','Stock Management','▦'],['game-requests','Game Requests','🎮'],['payments','Payment Methods','▰'],['analytics','Sales Analytics','▥'],['settings','Store Settings','⚙'],['admins','Admins','♙']];
const buttons=[];
entries.forEach(([id,title,icon])=>{const b=document.createElement('button');b.type='button';b.dataset.v59Section=id;b.innerHTML='<span class="v59-icon" aria-hidden="true">'+icon+'</span><span></span>';b.lastChild.textContent=title;b.addEventListener('click',()=>{if(!id){document.getElementById('v56AdminBack')?.click()}else{const tile=[...document.querySelectorAll('#v56AdminTiles .v56-admin-tile')].find(x=>x.querySelector('strong')?.textContent.trim()===title);if(tile)tile.click();else tabs.querySelector('[data-tab="'+id+'"]')?.click()}sync()});sidebar.append(b);buttons.push(b)});
const foot=document.createElement('div');foot.className='v59-foot';foot.textContent='V59 · MORE THAN A STORE';sidebar.append(foot);
document.body.insertBefore(sidebar,document.body.firstChild);
function sync(){const id=location.hash.slice(1);buttons.forEach(b=>b.classList.toggle('active',b.dataset.v59Section===id));sidebar.style.display=panel.classList.contains('hidden')?'none':''}
new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['class']});window.addEventListener('hashchange',sync);document.getElementById('v56AdminBack')?.addEventListener('click',()=>setTimeout(sync,0));document.querySelectorAll('#v56AdminTiles .v56-admin-tile').forEach(b=>b.addEventListener('click',()=>setTimeout(sync,0)));sync();
})();
