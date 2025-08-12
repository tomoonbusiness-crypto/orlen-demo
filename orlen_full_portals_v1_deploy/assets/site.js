
(function(){
  window.$ = (sel,root=document)=>root.querySelector(sel);
  window.$$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
  window.toast = (msg)=>{ const d=document.createElement('div'); d.textContent=msg; d.style.cssText='position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#12151C;color:#fff;border:1px solid #262B36;padding:10px 14px;border-radius:12px;z-index:9999'; document.body.appendChild(d); setTimeout(()=>d.remove(),1800); };
})();
