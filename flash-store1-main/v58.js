/* FLASH STORE V58 — progressive, non-destructive UI enhancements */
(()=>{'use strict';
const onReady=()=>{
 const search=document.querySelector('#search'),clear=document.querySelector('#v58Clear'),reset=document.querySelector('#v58ResetFilters');
 function updateClear(){if(clear&&search)clear.hidden=!search.value.trim()}
 function clearSearch(){if(!search)return;search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus();updateClear()}
 if(search){search.addEventListener('input',updateClear);updateClear()}
 clear?.addEventListener('click',clearSearch);
 reset?.addEventListener('click',()=>{const cat=document.querySelector('#searchCategory'),sort=document.querySelector('#searchSort');if(cat){cat.value='';cat.dispatchEvent(new Event('change',{bubbles:true}))}if(sort){sort.value='relevance';sort.dispatchEvent(new Event('change',{bubbles:true}))}clearSearch()});
 document.addEventListener('keydown',e=>{if(!search||e.altKey||e.ctrlKey||e.metaKey)return;const target=e.target,typing=target&&(/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)||target.isContentEditable);if(e.key==='/'&&!typing){e.preventDefault();search.focus();search.select()}else if(e.key==='Escape'&&document.activeElement===search){clearSearch();search.blur()}});
 // Give the original checkout clear, accessible field hints without altering payment logic.
 const proof=document.querySelector('#proof');if(proof){proof.setAttribute('aria-describedby','v58ProofHint');if(!document.querySelector('#v58ProofHint')){const hint=document.createElement('small');hint.id='v58ProofHint';hint.className='v58-field-hint';hint.textContent='Upload a clear image. Your order is not marked as paid until payment is verified.';proof.insertAdjacentElement('afterend',hint)}}
 const main=document.querySelector('main');if(main&&!main.id)main.id='mainContent';
 if(!document.querySelector('.v58-skip')){const skip=document.createElement('a');skip.className='v58-skip';skip.href='#mainContent';skip.textContent='Skip to content';document.body.prepend(skip)}
 const admin=document.querySelector('#tabs,.admin-nav');if(admin){admin.setAttribute('aria-label','Admin sections');admin.querySelectorAll('button').forEach(b=>{if(!b.type)b.type='button'})}
};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',onReady);else onReady();
})();
