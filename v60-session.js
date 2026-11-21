/* Refresh Supabase access cookie through the authenticated server endpoint. */
(()=>{let busy=false;async function refresh(){if(busy)return;busy=true;try{await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});}catch(_){}finally{busy=false}}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.addEventListener('pageshow',refresh);setInterval(()=>{if(!document.hidden)refresh()},15*60*1000);
})();
