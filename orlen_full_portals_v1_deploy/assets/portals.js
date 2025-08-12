(function(){
  const DB = {
    kUsers: 'orlen_users',
    kReqs: 'orlen_requests',
    kSession: 'orlen_session',
    uid() { return 'id-' + Math.random().toString(36).slice(2,10); },
    load(k){ try { return JSON.parse(localStorage.getItem(k)||'[]'); } catch(e){ return []; } },
    save(k,v){ localStorage.setItem(k, JSON.stringify(v)); },
    session(){ try { return JSON.parse(localStorage.getItem(DB.kSession)||'{}'); } catch(e){ return {}; } },
    setSession(s){ localStorage.setItem(DB.kSession, JSON.stringify(s||{})); },
  };
  function hash(str){ let h=5381; for(let i=0;i<str.length;i++){ h=((h<<5)+h)^str.charCodeAt(i); } return (h>>>0).toString(16); }
  (function seed(){
    const users = DB.load(DB.kUsers);
    if(users.length) return;
    const admin = {id:DB.uid(), role:'admin', email:'admin@orlen.co', name:'Admin', pass:hash('admin123'), createdAt:new Date().toISOString()};
    const client = {id:DB.uid(), role:'client', email:'alice@demo.co', name:'Alice', pass:hash('orlen123'), createdAt:new Date().toISOString()};
    const partner = {id:DB.uid(), role:'partner', email:'partner@demo.co', name:'Vancouver Chauffeur', company:'Vanco Limo', pass:hash('orlen123'), createdAt:new Date().toISOString()};
    DB.save(DB.kUsers, [admin, client, partner]);
    const req = { id:'ORL-'+Math.random().toString(36).slice(2,8).toUpperCase(), createdAt:new Date().toISOString(),
      clientId:client.id, category:'Private Driver', guests:2, date:'', time:'', budget:180, notes:'Tonight 18:30–23:30: dinner → concert → hotel. SUV.',
      status:'new', updates:[{at:new Date().toISOString(), by:'system', text:'Request created'}], offers:[], assignedPartnerId:null };
    DB.save(DB.kReqs, [req]);
  })();
  const Auth = {
    login(email, pass){
      const users = DB.load(DB.kUsers);
      const u = users.find(x=>x.email.toLowerCase()===String(email).toLowerCase() && x.pass===hash(pass));
      if(!u) throw new Error('Invalid credentials');
      DB.setSession({userId:u.id}); return u;
    },
    signup({role,name,email,pass,company}){
      const users = DB.load(DB.kUsers);
      if(users.some(x=>x.email.toLowerCase()===email.toLowerCase())) throw new Error('Email already registered');
      const u = {id:DB.uid(), role, name, email, pass:hash(pass), createdAt:new Date().toISOString()};
      if(role==='partner') u.company = company||'';
      users.push(u); DB.save(DB.kUsers, users); DB.setSession({userId:u.id}); return u;
    },
    me(){
      const s = DB.session(); if(!s.userId) return null;
      const users = DB.load(DB.kUsers); return users.find(x=>x.id===s.userId)||null;
    },
    logout(){ DB.setSession({}); }
  };
  const Data = {
    users(){ return DB.load(DB.kUsers); },
    requests(){ return DB.load(DB.kReqs); },
    saveRequests(list){ DB.save(DB.kReqs, list); },
    byId(list,id){ return list.find(x=>x.id===id); },
    userById(id){ return Data.users().find(u=>u.id===id)||null; },
    createRequest(payload){
      const list = Data.requests();
      const r = Object.assign({ id:'ORL-'+Math.random().toString(36).slice(2,8).toUpperCase(), createdAt:new Date().toISOString(),
        status:'new', updates:[], offers:[], assignedPartnerId:null }, payload);
      r.updates.push({at:new Date().toISOString(), by:'client', text:'Request created'});
      list.unshift(r); Data.saveRequests(list); return r;
    },
    addUpdate(reqId, by, text){
      const list=Data.requests(); const r=list.find(x=>x.id===reqId); if(!r) return;
      r.updates.push({at:new Date().toISOString(), by, text}); Data.saveRequests(list); return r;
    },
    proposeOffer(reqId, partnerId, amount, note){
      const list=Data.requests(); const r=list.find(x=>x.id===reqId); if(!r) return;
      r.offers.push({partnerId, amount:Number(amount||0), note:note||'', at:new Date().toISOString(), accepted:false});
      r.status = r.status==='new' ? 'assigned' : r.status;
      r.assignedPartnerId = r.assignedPartnerId||partnerId;
      Data.saveRequests(list); return r;
    },
    acceptOffer(reqId, partnerId, idx){
      const list=Data.requests(); const r=list.find(x=>x.id===reqId); if(!r) return;
      r.offers = r.offers.map((o,i)=>({ ...o, accepted: i===idx }));
      r.assignedPartnerId = partnerId; r.status='accepted';
      Data.saveRequests(list); return r;
    },
    assignPartner(reqId, partnerId){
      const list=Data.requests(); const r=list.find(x=>x.id===reqId); if(!r) return;
      r.assignedPartnerId = partnerId; r.status = r.status==='new'?'assigned':r.status; Data.saveRequests(list); return r;
    },
    setStatus(reqId, status){
      const list=Data.requests(); const r=list.find(x=>x.id===reqId); if(!r) return;
      r.status = status; Data.saveRequests(list); return r;
    }
  };
  const Pages = {
    login(){
      const form = document.querySelector('form[data-login]');
      form.addEventListener('submit', e=>{
        e.preventDefault(); const fd=new FormData(form);
        try{
          const u = Auth.login(fd.get('email'), fd.get('password'));
          if(u.role==='admin') location.href='admin.html';
          else if(u.role==='partner') location.href='partner.html';
          else location.href='client.html';
        }catch(err){ toast(err.message); }
      });
    },
    signup(){
      const form = document.querySelector('form[data-signup]');
      const roleSel = document.querySelector('[data-role]');
      const companyWrap = document.querySelector('[data-company-wrap]');
      roleSel.addEventListener('change', ()=>{ companyWrap.style.display = roleSel.value==='partner' ? 'block':'none'; });
      form.addEventListener('submit', e=>{
        e.preventDefault(); const fd=new FormData(form);
        try{
          const u = Auth.signup({
            role: fd.get('role'), name: fd.get('name'), email: fd.get('email'),
            pass: fd.get('password'), company: fd.get('company')
          });
          toast('Account created'); setTimeout(()=>{
            location.href = u.role==='partner' ? 'partner.html' : (u.role==='admin' ? 'admin.html':'client.html');
          },600);
        }catch(err){ toast(err.message); }
      });
    },
    gate(role){
      const me = Auth.me();
      if(!me){ location.href='login.html'; return null; }
      if(role && me.role!==role){
        toast('Unauthorized for this area'); location.href = me.role==='admin'?'admin.html':(me.role==='partner'?'partner.html':'client.html'); return null;
      }
      const info = document.querySelector('[data-identity]'); if(info) info.textContent = me.name + ' • ' + me.role.toUpperCase();
      document.querySelectorAll('[data-logout]').forEach(b=>b.addEventListener('click',()=>{Auth.logout(); location.href='login.html'}));
      return me;
    },
    client(){
      const me = Pages.gate('client'); if(!me) return;
      const listWrap = document.querySelector('[data-my-requests]');
      const form = document.querySelector('form[data-new-request]');
      const sel = form.querySelector('select[name=category]');
      const params = new URLSearchParams(location.search);
      if(params.get('category')) sel.value = params.get('category');
      if(params.get('notes')) form.querySelector('textarea[name=notes]').value = decodeURIComponent(params.get('notes'));

      function render(){
        const reqs = Data.requests().filter(r=>r.clientId===me.id);
        listWrap.innerHTML = reqs.map((r)=>`
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <h3>${r.category} • <span class="small">${r.id}</span></h3>
              <span class="status ${r.status}">${r.status.replace('_',' ')}</span>
            </div>
            <div class="small">Guests: ${r.guests||'-'} • Budget: ${r.budget?('CAD '+r.budget):'-'}</div>
            <p>${r.notes||''}</p>
            <div class="grid-2">
              <div>
                <h4>Updates</h4>
                <div class="alert">${r.updates.map(u=>`<div class="small">[${new Date(u.at).toLocaleString()}] ${u.by}: ${u.text}</div>`).join('')}</div>
              </div>
              <div>
                <h4>Offers</h4>
                <div class="alert">${r.offers.length? r.offers.map((o,i)=>{
                  const p = Data.userById(o.partnerId)||{name:'Partner'};
                  return `<div class="small">From <b>${p.company||p.name}</b>: CAD ${o.amount} — ${o.note||''} ${o.accepted?'<span class="badge">accepted</span>':`<button class="btn" data-accept="${r.id}:${o.partnerId}:${i}">Accept</button>`}</div>`
                }).join('') : 'No offers yet'}</div>
              </div>
            </div>
            <div class="right"><button class="btn" data-msg="${r.id}">Add note</button></div>
          </div>
        `).join('');
        listWrap.querySelectorAll('[data-accept]').forEach(b=>b.addEventListener('click', e=>{
          const [rid,pid,idx] = b.getAttribute('data-accept').split(':');
          Data.acceptOffer(rid,pid,Number(idx)); render();
        }));
        listWrap.querySelectorAll('[data-msg]').forEach(b=>b.addEventListener('click', e=>{
          const rid = b.getAttribute('data-msg'); const text = prompt('Add a note/message:');
          if(text){ Data.addUpdate(rid,'client',text); render(); }
        }));
      }
      form.addEventListener('submit', e=>{
        e.preventDefault(); const fd=new FormData(form);
        Data.createRequest({
          clientId: me.id,
          category: fd.get('category'),
          guests: Number(fd.get('guests')||0),
          date: fd.get('date')||'', time: fd.get('time')||'',
          budget: Number(fd.get('budget')||0)||null,
          notes: fd.get('notes')||''
        });
        form.reset(); toast('Request created'); render();
      });
      render();
    },
    partner(){
      const me = Pages.gate('partner'); if(!me) return;
      const openWrap = document.querySelector('[data-open-requests]');
      const myWrap = document.querySelector('[data-my-requests]');
      function render(){
        const all = Data.requests();
        const open = all.filter(r=>!r.assignedPartnerId || r.assignedPartnerId===me.id || r.status==='new');
        const mine = all.filter(r=>r.assignedPartnerId===me.id);
        function card(r){
          const client = Data.userById(r.clientId)||{name:'Client'};
          return `<div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <h3>${r.category} • <span class="small">${r.id}</span></h3>
              <span class="status ${r.status}">${r.status.replace('_',' ')}</span>
            </div>
            <div class="small">Client: ${client.name}</div>
            <p>${r.notes||''}</p>
            <div class="right">
              <button class="btn" data-offer="${r.id}">Propose offer</button>
              <button class="btn" data-msg="${r.id}">Add note</button>
            </div>
          </div>`;
        }
        openWrap.innerHTML = open.map(card).join('') || '<div class="small">No open requests right now.</div>';
        myWrap.innerHTML = mine.map(card).join('') || '<div class="small">No assigned requests yet.</div>';
        document.querySelectorAll("[data-offer]").forEach(b=>b.addEventListener('click',()=>{
          const rid=b.getAttribute('data-offer'); const amount=prompt('Proposed amount (CAD):'); if(amount===null) return;
          const note=prompt('Short note (optional):')||''; Data.proposeOffer(rid, me.id, Number(amount), note); render();
        }));
        document.querySelectorAll("[data-msg]").forEach(b=>b.addEventListener('click',()=>{
          const rid=b.getAttribute('data-msg'); const text=prompt('Add a note to the request:'); if(text){ Data.addUpdate(rid,'partner',text); render(); }
        }));
      }
      render();
    },
    admin(){
      const me = Pages.gate('admin'); if(!me) return;
      const table = document.querySelector('[data-req-table]');
      const metrics = document.querySelector('[data-metrics]');
      const userForm = document.querySelector('form[data-new-user]');
      function render(){
        const reqs = Data.requests();
        const users = Data.users();
        const m = { total:reqs.length, new:reqs.filter(r=>r.status==='new').length,
          assigned:reqs.filter(r=>r.status==='assigned').length, accepted:reqs.filter(r=>r.status==='accepted').length,
          inprog:reqs.filter(r=>r.status==='in_progress').length, done:reqs.filter(r=>r.status==='done').length };
        metrics.innerHTML = `<div class="grid-3">
          <div class="card"><h3>Total</h3><div class="kicker">${m.total}</div></div>
          <div class="card"><h3>New</h3><div class="kicker">${m.new}</div></div>
          <div class="card"><h3>Assigned</h3><div class="kicker">${m.assigned}</div></div>
          <div class="card"><h3>Accepted</h3><div class="kicker">${m.accepted}</div></div>
          <div class="card"><h3>In progress</h3><div class="kicker">${m.inprog}</div></div>
          <div class="card"><h3>Done</h3><div class="kicker">${m.done}</div></div>
        </div>`;
        const partners = users.filter(u=>u.role==='partner');
        table.innerHTML = reqs.map(r=>{
          const c = Data.userById(r.clientId)||{name:'Client'};
          const partnerOptions = ['<option value="">— Assign —</option>'].concat(partners.map(u=>`<option value="${u.id}" ${r.assignedPartnerId===u.id?'selected':''}>${u.company||u.name}</option>`)).join('');
          return `<tr>
            <td><b>${r.id}</b><div class="small">${new Date(r.createdAt).toLocaleString()}</div></td>
            <td>${c.name}</td>
            <td>${r.category}</td>
            <td><span class="status ${r.status}">${r.status.replace('_',' ')}</span></td>
            <td><select data-assign="${r.id}" class="input">${partnerOptions}</select></td>
            <td><select data-status="${r.id}" class="input">
              ${['new','assigned','accepted','in_progress','done','cancelled'].map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
            </select></td>
          </tr>`;
        }).join('');
        document.querySelectorAll('[data-assign]').forEach(s=>s.addEventListener('change',()=>{ Data.assignPartner(s.getAttribute('data-assign'), s.value||null); render(); }));
        document.querySelectorAll('[data-status]').forEach(s=>s.addEventListener('change',()=>{ Data.setStatus(s.getAttribute('data-status'), s.value); render(); }));
      }
      userForm.addEventListener('submit', e=>{
        e.preventDefault(); const fd=new FormData(userForm);
        try{
          // create user via signup
          const u = DB.load(DB.kUsers); // to check duplicate quickly
          // reuse Auth.signup
        }catch(err){}
        try{
          window.Auth && Auth.signup({ role:userForm.role.value, name:userForm.name.value, email:userForm.email.value, pass:userForm.password.value, company:userForm.company.value });
          userForm.reset(); toast('User added'); render();
        }catch(err){ toast(err.message); }
      });
      render();
    }
  };
  document.addEventListener('DOMContentLoaded',()=>{
    const page = document.body.getAttribute('data-page');
    if(page && Pages[page]) Pages[page]();
    window.Auth = Auth; window.Data = Data; // expose for debug
  });
})();