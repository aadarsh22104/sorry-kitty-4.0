// PROFILE / SETTINGS
// ══════════════════════════════════════════════════════
let epAv=null;
function pickEpAv(el){ document.querySelectorAll('#ep-av-picker .av-opt').forEach(e=>e.classList.remove('sel')); el.classList.add('sel'); epAv=el.dataset.av; }
function openModal(id){
  const m=document.getElementById(id);
  if(id==='modal-edit-profile'){
    document.getElementById('ep-name').value=CU.name;
    epAv=CU.avatar||'🐱';
    document.querySelectorAll('#ep-av-picker .av-opt').forEach(e=>e.classList.toggle('sel',e.dataset.av===epAv));
  }
  m.style.display='flex';
}
function closeModal(m){ m.style.display='none'; }
function saveProfile(){
  const name=document.getElementById('ep-name').value.trim();
  if(!name) return;
  const u=DB.getUsers();
  u[CU.email].name=name;
  if(epAv) u[CU.email].avatar=epAv;
  DB.saveUsers(u); CU=u[CU.email];
  document.getElementById('prof-name').textContent=CU.name;
  document.getElementById('prof-avatar').textContent=CU.avatar||'🐱';
  document.getElementById('nav-avatar').textContent=CU.avatar||'🐱';
  document.getElementById('hero-name').textContent=CU.name.split(' ')[0];
  closeModal(document.getElementById('modal-edit-profile'));
  showToast('Profile updated! ✓','✏️');
}
function changePassword(){
  const cur=document.getElementById('cp-cur').value;
  const nw=document.getElementById('cp-new').value;
  const conf=document.getElementById('cp-conf').value;
  const err=document.getElementById('cp-err'),ok=document.getElementById('cp-ok');
  err.style.display='none'; ok.style.display='none';
  const u=DB.getUsers();
  if(u[CU.email].pass!==btoa(cur)){showErr(err,'Current password incorrect.');return;}
  if(nw.length<6){showErr(err,'New password needs 6+ characters.');return;}
  if(nw!==conf){showErr(err,'Passwords don\'t match.');return;}
  u[CU.email].pass=btoa(nw); DB.saveUsers(u); CU=u[CU.email];
  ok.textContent='Password updated! ✓'; ok.style.display='block';
}

// ══════════════════════════════════════════════════════
// CARD VIEWER
