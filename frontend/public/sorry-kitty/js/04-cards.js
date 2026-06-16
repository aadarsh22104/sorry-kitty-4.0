// ══════════════════════════════════════════════════════
const charEmojis={cat:'🐱',panda:'🐼',bear:'🐻',penguin:'🐧',fox:'🦊',bunny:'🐰',dog:'🐶',frog:'🐸',lion:'🦁',koala:'🐨'};
async function renderHomeCards(){
  const result = await DB.getCards(CU.id);
  const cards = result.success ? result.cards : [];
  const mine=cards.slice(-3);
  const grid=document.getElementById('home-card-grid');
  grid.innerHTML='<div class="mini-card" onclick="goTab(\'create\')" style="border-style:dashed;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100px;"><span style="font-size:32px;">+</span><span style="font-size:12px;font-weight:800;color:var(--muted);margin-top:4px;">New Card</span></div>';
  mine.reverse().forEach(c=>{
    const em=charEmojis[c.character||'cat']||'🐱';
    const d=document.createElement('div'); d.className='mini-card'; d.onclick=()=>openCardViewer(c.id);
    d.innerHTML=`<span class="mini-card-char">${em}</span><div class="mini-card-title">To: ${c.recipient||'?'}</div><div class="mini-card-sub">${(c.tagline||'').slice(0,28)||'No tagline'}</div>`;
    grid.appendChild(d);
  });
}

// ══════════════════════════════════════════════════════
// CARDS LIST
// ══════════════════════════════════════════════════════
async function renderCardsList(){
  const result = await DB.getCards(CU.id);
  const cards = result.success ? result.cards : [];
  const body=document.getElementById('cards-list-body');
  if(cards.length===0){
    body.innerHTML=`<div class="empty-state"><span class="empty-icon">📬</span><div class="empty-title">No cards yet!</div><div class="empty-sub">Create your first sorry card and melt someone's heart.</div><button class="btn btn-main" onclick="goTab('create')">Create Card ✨</button></div>`;
    return;
  }
  body.innerHTML=cards.map(c=>{
    const em=charEmojis[c.character||'cat']||'🐱';
    const url=getCardURL(c.id);
    return `<div class="card-item">
      <div class="ci-header">
        <div class="ci-char">${em}</div>
        <div class="ci-info">
          <div class="ci-title">To: ${c.recipient||'(unnamed)'}</div>
          <div class="ci-sub">From: ${c.sender||CU.name} · ${timeAgo(c.created_at)}</div>
          <div style="margin-top:4px;"><span class="badge badge-gold">${(c.character||'cat').toUpperCase()}</span></div>
        </div>
      </div>
      <div class="link-pill">
        <div class="link-pill-text">${url}</div>
        <button class="link-pill-copy" onclick="copyLink('${c.id}',this)">Copy Link</button>
      </div>
      <div class="ci-actions">
        <button class="btn btn-sec" onclick="openCardViewer('${c.id}')">👁 Preview</button>
        <button class="btn btn-sec" onclick="editCard('${c.id}')">✏️ Edit</button>
        <button class="btn btn-sec" onclick="shareViaChat('${c.id}')">💬 Share</button>
        <button class="btn btn-sec" style="border-color:#f5b7b1;color:var(--danger);" onclick="deleteCard('${c.id}')">🗑</button>
      </div>
    </div>`;
  }).join('');
  updateStats();
}

function getCardURL(id){ return window.location.href.split('#')[0]+'#card='+id; }
function copyLink(id,btn){
  const url=getCardURL(id);
  const fallback=()=>{ const t=document.createElement('textarea');t.value=url;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch(e){}document.body.removeChild(t); };
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(url).catch(fallback); } else { fallback(); }
  if(btn){const old=btn.textContent;btn.textContent='Copied! ✓';setTimeout(()=>btn.textContent=old,2000);}
  // Track sent - update user stats in Supabase
  if(CU){ 
    CU.stats = CU.stats || {cards:0,sent:0,smiles:0};
    CU.stats.sent = (CU.stats.sent || 0) + 1;
    updateStats();
  }
}
function deleteCard(id){
  // Use inline confirm toast instead of confirm() which can be blocked in iframes
  const toast=document.createElement('div');
  toast.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#fff;border:2px solid #e8c4b8;border-radius:16px;padding:14px 20px;box-shadow:0 8px 28px rgba(0,0,0,.18);z-index:9999;display:flex;align-items:center;gap:12px;font-family:Nunito,sans-serif;min-width:280px;animation:fadeUp .3s ease;';
  toast.innerHTML=`<span style="font-size:18px;">🗑</span><div style="flex:1;"><div style="font-weight:900;font-size:14px;color:#3d1a00;">Delete this card?</div><div style="font-size:12px;color:#6b3a1f;font-weight:600;">This cannot be undone</div></div><button onclick="confirmDeleteCard('${id}');this.closest('div[style]').remove();" style="background:#c0392b;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-weight:900;font-size:13px;cursor:pointer;font-family:Nunito,sans-serif;">Delete</button><button onclick="this.closest('div[style]').remove()" style="background:#f5e6cc;color:#3d1a00;border:none;border-radius:10px;padding:8px 14px;font-weight:900;font-size:13px;cursor:pointer;font-family:Nunito,sans-serif;">Cancel</button>`;
  document.body.appendChild(toast);
  setTimeout(()=>toast.remove&&toast.remove(),6000);
}
async function confirmDeleteCard(id){
  // Delete via backend
  try {
    const result = await DB.deleteCard(id, CU?.id);
    if (result.error) throw new Error(result.error);
    renderCardsList();
    renderHomeCards();
    updateStats();
    showToast('Card deleted 🗑','');
  } catch (error) {
    console.error('Failed to delete card:', error);
    showToast('Failed to delete card', 'error');
  }
}
async function editCard(id){
  editCardId=id;
  const result = await DB.getCard(id);
  if(!result.success || !result.card) return;
  const c = result.card;
  resetCreateForm();
  document.getElementById('create-mode-title').textContent='✏️ Edit Card';
  // fill form
  document.getElementById('c-recipient').value=c.recipient||'';
  document.getElementById('c-sender').value=c.sender||'';
  document.getElementById('c-tagline').value=c.tagline||'';
  document.getElementById('c-message').value=c.message||'';
  document.getElementById('c-forgive-text').value=c.forgive_text||'';
  document.getElementById('c-floaties').value=(c.floaties||[]).join(' ');
  document.getElementById('c-confetti').value=(c.confetti||[]).join(' ');
  document.getElementById('c-quotes').value=(c.quotes||[]).join('\n');
  document.getElementById('c-closing').value=c.closing||'';
  document.getElementById('c-smile-btn').value=c.smile_button_text||'';
  document.getElementById('c-after-smile').value=c.after_smile_text||'';
  document.getElementById('c-char-size').value=c.char_size||170;
  document.getElementById('char-size-val').textContent=(c.char_size||170)+'px';
  // char
  selChar=c.character||'cat';
  document.querySelectorAll('#char-picker .char-opt').forEach(el=>el.classList.toggle('sel',el.dataset.char===selChar));
  // treats
  selTreats=c.treats||['🍫'];
  document.querySelectorAll('#treat-picker .ep-chip').forEach(el=>el.classList.toggle('sel',selTreats.includes(el.dataset.e)));
  // theme
  if(c.theme_bg){ selTheme={bg:c.theme_bg,ac:c.theme_accent,a2:c.theme_accent2,tx:c.theme_text}; document.querySelectorAll('#theme-picker .theme-opt').forEach(el=>el.classList.toggle('sel',el.dataset.bg===c.theme_bg)); document.getElementById('c-bg-color').value=c.theme_bg; document.getElementById('c-accent-color').value=c.theme_accent; document.getElementById('c-a2-color').value=c.theme_accent2||'#c4822a'; }
  // font
  if(c.font){ selFont=c.font; document.querySelectorAll('#font-picker .font-opt').forEach(el=>el.classList.toggle('sel',el.dataset.font===c.font)); }
  // opts
  cardOpts={runaway:c.opt_runaway,treats:c.opt_treats,mood:c.opt_mood,stripe:c.opt_stripe,floaties:c.opt_floaties,stars:c.opt_stars,trail:c.opt_trail};
  Object.keys(cardOpts).forEach(k=>{ const t=document.getElementById('toggle-'+k); if(t){ t.classList.toggle('on',cardOpts[k]); } });
  // tone
  document.querySelectorAll('#msg-tone-opts .msg-opt').forEach(el=>el.classList.toggle('sel',el.dataset.tone===(c.tone||'sorry')));
  goTab('create');
}

// ══════════════════════════════════════════════════════
// CREATE FORM
// ══════════════════════════════════════════════════════
function resetCreateForm(){
  editCardId=null;
  selChar='cat'; selTreats=['🍫','🥐','🍪','🎂']; selTheme={bg:'#fdf3e7',ac:'#3d1a00',a2:'#c4822a',tx:'#6b3a1f'}; selFont='Nunito';
  cardOpts={runaway:true,treats:true,mood:true,stripe:true,floaties:true,stars:true,trail:true};
  document.getElementById('create-mode-title').textContent='✨ New Card';
  ['c-recipient','c-sender','c-tagline','c-message','c-forgive-text','c-floaties','c-confetti','c-quotes','c-closing','c-smile-btn','c-after-smile'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('c-char-size').value=170; document.getElementById('char-size-val').textContent='170px';
  document.getElementById('c-bg-color').value='#fdf3e7'; document.getElementById('c-accent-color').value='#3d1a00'; document.getElementById('c-a2-color').value='#c4822a';
  document.querySelectorAll('#char-picker .char-opt').forEach((el,i)=>el.classList.toggle('sel',i===0));
  document.querySelectorAll('#treat-picker .ep-chip').forEach(el=>el.classList.toggle('sel',['🍫','🥐','🍪','🎂'].includes(el.dataset.e)));
  document.querySelectorAll('#theme-picker .theme-opt').forEach((el,i)=>el.classList.toggle('sel',i===0));
  document.querySelectorAll('#font-picker .font-opt').forEach((el,i)=>el.classList.toggle('sel',i===0));
  document.querySelectorAll('#msg-tone-opts .msg-opt').forEach((el,i)=>el.classList.toggle('sel',i===0));
  Object.keys(cardOpts).forEach(k=>{ const t=document.getElementById('toggle-'+k); if(t) t.classList.add('on'); });
  document.getElementById('create-err').style.display='none';
  document.getElementById('create-ok').style.display='none';
}
function pickChar(el){ document.querySelectorAll('#char-picker .char-opt').forEach(e=>e.classList.remove('sel')); el.classList.add('sel'); selChar=el.dataset.char; }
function pickTreat(el){ el.classList.toggle('sel'); selTreats=[...document.querySelectorAll('#treat-picker .ep-chip.sel')].map(e=>e.dataset.e); if(!selTreats.length){el.classList.add('sel');selTreats=[el.dataset.e];} }
function pickTheme(el){ document.querySelectorAll('#theme-picker .theme-opt').forEach(e=>e.classList.remove('sel')); el.classList.add('sel'); selTheme={bg:el.dataset.bg,ac:el.dataset.ac,a2:el.dataset.a2,tx:el.dataset.tx}; document.getElementById('c-bg-color').value=selTheme.bg; document.getElementById('c-accent-color').value=selTheme.ac; document.getElementById('c-a2-color').value=selTheme.a2; }
function applyCustomColor(){ selTheme={bg:document.getElementById('c-bg-color').value,ac:document.getElementById('c-accent-color').value,a2:document.getElementById('c-a2-color').value,tx:document.getElementById('c-accent-color').value+'99'}; document.querySelectorAll('#theme-picker .theme-opt').forEach(e=>e.classList.remove('sel')); }
function pickFont(el){ document.querySelectorAll('#font-picker .font-opt').forEach(e=>e.classList.remove('sel')); el.classList.add('sel'); selFont=el.dataset.font; }
function pickTone(el){ document.querySelectorAll('#msg-tone-opts .msg-opt').forEach(e=>e.classList.remove('sel')); el.classList.add('sel'); }
function toggleOpt(btn,key){ btn.classList.toggle('on'); cardOpts[key]=btn.classList.contains('on'); }
function toggleThis(btn){ btn.classList.toggle('on'); }

async function saveCard(){
  const recipient=document.getElementById('c-recipient').value.trim();
  const err=document.getElementById('create-err'),ok=document.getElementById('create-ok');
  err.style.display='none'; ok.style.display='none';
  if(!recipient){showErr(err,'Please enter the recipient\'s name.');return;}
  const floatiesRaw=document.getElementById('c-floaties').value.trim();
  const confettiRaw=document.getElementById('c-confetti').value.trim();
  const quotesRaw=document.getElementById('c-quotes').value.trim();
  const card={
    id:editCardId||DB.mkId(),
    owner_id:CU.id,
    character:selChar, recipient, sender:document.getElementById('c-sender').value.trim()||CU.name,
    tagline:document.getElementById('c-tagline').value.trim(),
    message:document.getElementById('c-message').value.trim(),
    tone:[...document.querySelectorAll('#msg-tone-opts .msg-opt.sel')].map(e=>e.dataset.tone)[0]||'sorry',
    forgive_text:document.getElementById('c-forgive-text').value.trim(),
    treats:selTreats.length?selTreats:['🍫'],
    floaties:floatiesRaw?floatiesRaw.split(/\s+/).filter(Boolean):['🌸','✨','🐾','⭐','🌟'],
    confetti:confettiRaw?confettiRaw.split(/\s+/).filter(Boolean):['🎉','🎊','✨','🌟'],
    quotes:quotesRaw?quotesRaw.split('\n').map(s=>s.trim()).filter(Boolean):[],
    closing:document.getElementById('c-closing').value.trim(),
    smile_button_text:document.getElementById('c-smile-btn').value.trim(),
    after_smile_text:document.getElementById('c-after-smile').value.trim(),
    theme_bg:selTheme.bg, theme_accent:selTheme.ac, theme_accent2:selTheme.a2, theme_text:selTheme.tx,
    font:selFont,
    opt_runaway:cardOpts.runaway,
    opt_treats:cardOpts.treats,
    opt_mood:cardOpts.mood,
    opt_stripe:cardOpts.stripe,
    opt_floaties:cardOpts.floaties,
    opt_stars:cardOpts.stars,
    opt_trail:cardOpts.trail,
    char_size:parseInt(document.getElementById('c-char-size').value)||170
  };
  
  const result = await DB.createCard(card);
  if(result.error){
    showErr(err, result.error);
    return;
  }
  
  ok.textContent='Card saved! 🎉 Link is ready.'; ok.style.display='block';
  addActivity({icon:charEmojis[selChar]||'🐱',title:`Card saved for ${recipient}`,sub:'Tap "Cards" to copy the link',time:Date.now()});
  addNotif({type:'card_saved',title:'Card saved! 🎉',msg:`Your sorry card for ${recipient} is ready to share.`,icon:charEmojis[selChar]||'🐱',time:Date.now()});
  await updateStats();
  setTimeout(()=>{ goTab('cards'); },1000);
}

// ══════════════════════════════════════════════════════
// NOTIFICATIONS
