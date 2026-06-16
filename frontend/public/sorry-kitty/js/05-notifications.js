// ══════════════════════════════════════════════════════
async function addNotif(n){ 
  if (!CU) return;
  await DB.saveNotifs({
    user_id: CU.id,
    type: n.type || 'general',
    title: n.title,
    message: n.msg || '',
    icon: n.icon || '📬'
  });
  updateNotifBadge(); 
}
async function updateNotifBadge(){ 
  if (!CU) return;
  const notifs = await DB.getNotifs(CU.id);
  const n = notifs.filter(n=>!n.read).length; 
  const b=document.getElementById('notif-badge'); 
  if(b){b.textContent=n;b.style.display=n>0?'flex':'none';} 
}
async function markAllRead(){ 
  if (!CU) return;
  const notifs = await DB.getNotifs(CU.id);
  for (const n of notifs) {
    if (!n.read) {
      await DB.markNotifAsRead(n.id, CU.id);
    }
  }
  updateNotifBadge(); 
  renderNotifs(); 
}
async function renderNotifs(){
  if (!CU) return;
  const notifs = await DB.getNotifs(CU.id);
  const body=document.getElementById('notif-list-body');
  if(!body) return;
  if(notifs.length===0){ body.innerHTML='<div class="empty-state" style="padding:30px 0;"><span style="font-size:40px;">🔔</span><div class="empty-title" style="font-size:16px;margin-top:8px;">No notifications yet</div></div>'; return; }
  body.innerHTML=notifs.map(n=>`
    <div class="notif-item${n.read?'':' unread'}" onclick="markNotifRead('${n.id}')">
      <div class="notif-dot"></div>
      <div class="notif-icon">${n.icon||'📬'}</div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.message||''}</div>
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>
    </div>`).join('');
}
async function markNotifRead(notificationId) {
  if (!CU) return;
  await DB.markNotifAsRead(notificationId, CU.id);
  updateNotifBadge();
  renderNotifs();
}
function addActivity(a){ const el=document.getElementById('activity-list'); if(!el) return; const d=document.createElement('div'); d.className='activity-item'; d.style.animation='fadeIn .3s ease'; d.innerHTML=`<div class="activity-icon">${a.icon}</div><div class="activity-text"><div class="activity-title">${a.title}</div><div class="activity-sub">${a.sub}</div></div><div class="activity-time">${timeAgo(a.time)}</div>`; el.insertBefore(d,el.firstChild); }
function showToast(msg,icon){ const t=document.createElement('div'); t.className='notif-toast'; t.innerHTML=`${icon||'🐾'} ${msg}<button class="notif-toast-close" onclick="this.parentElement.remove()">✕</button>`; document.body.appendChild(t); setTimeout(()=>t.remove&&t.remove(),4000); }

// ══════════════════════════════════════════════════════
// CHAT
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// MOMENT SYSTEM — Emotional Interaction Layer v2
// Held-emoji + character reaction engine
