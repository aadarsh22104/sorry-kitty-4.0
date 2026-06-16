// ══════════════════════════════════════════════════════
async function initApp(){
  showPanel('panel-app');
  document.getElementById('hero-name').textContent = CU.name.split(' ')[0];
  document.getElementById('nav-avatar').textContent = CU.avatar||'🐱';
  document.getElementById('prof-avatar').textContent = CU.avatar||'🐱';
  document.getElementById('prof-name').textContent = CU.name;
  document.getElementById('prof-email').textContent = CU.email;
  await updateStats();
  renderHomeCards();
  await renderCardsList();
  renderChats();
  await renderNotifs();

  // If the user just signed up/logged in because they clicked Chat on a
  // shared card, jump straight into that card's chat instead of Home.
  let pendingChat = null;
  try { pendingChat = sessionStorage.getItem('sk_pending_chat'); } catch (e) {}
  if (pendingChat) {
    try { sessionStorage.removeItem('sk_pending_chat'); } catch (e) {}
    // Clear the share hash so a refresh doesn't bounce them back into the
    // public card viewer.
    if (window.location.hash) {
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { window.location.hash = ''; }
    }
    goTab('chat');
    setTimeout(()=>{ if (typeof openMomentWindow === 'function') openMomentWindow(pendingChat); }, 120);
  } else {
    goTab('home');
  }

  // Demo notifications if none exist
  const notifs = await DB.getNotifs(CU.id);
  if(notifs.length===0){
    await addNotif({type:'welcome',title:'Welcome to Sorry Kitty! 🐾',msg:'Start by creating your first adorable sorry card.',icon:'🌸',time:Date.now()});
    await addNotif({type:'tip',title:'Tip: Share links without login',msg:'Your recipients can open card links without creating an account.',icon:'💡',time:Date.now()-60000});
  }
}

async function updateStats(){
  const result = await DB.getCards(CU.id);
  const cards = result.success ? result.cards : [];
  const s=CU.stats||{cards:0,sent:0,smiles:0};
  s.cards=cards.length;
  document.getElementById('stat-cards').textContent=s.cards;
  document.getElementById('stat-sent').textContent=s.sent||0;
  document.getElementById('stat-smiles').textContent=s.smiles||0;
  document.getElementById('ps-cards').textContent=s.cards;
  document.getElementById('ps-sent').textContent=s.sent||0;
  document.getElementById('ps-smiles').textContent=s.smiles||0;
}

// ══════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════
async function goTab(name){
  document.querySelectorAll('.tab-content').forEach(t=>t.style.display='none');
  document.querySelectorAll('.tabbar-item').forEach(t=>t.classList.remove('on'));
  const tc=document.getElementById('tab-'+name);
  if(tc){ tc.style.display='flex'; tc.style.flexDirection='column'; }
  const tb=document.getElementById('tb-'+name);
  if(tb) tb.classList.add('on');
  if(name==='create') resetCreateForm();
  if(name==='cards') await renderCardsList();
  if(name==='chat') renderChats();
  if(name==='notifs'){await renderNotifs();await markAllRead();}
  if(name==='profile'){
    document.getElementById('prof-avatar').textContent=CU.avatar||'🐱';
    document.getElementById('prof-name').textContent=CU.name;
    document.getElementById('prof-email').textContent=CU.email;
    await updateStats();
  }
  if(name==='home'){renderHomeCards();await updateStats();}
}

function bounceBounce(el){ el.style.transform='scale(1.4) rotate(15deg)'; setTimeout(()=>el.style.transform='',400); }

// ══════════════════════════════════════════════════════
// HOME CARDS GRID
