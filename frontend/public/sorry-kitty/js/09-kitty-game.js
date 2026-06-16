// ── KITTY STATE ──
function resetKittyState(){ kpC=[0,0,0,0,0,0];kfed=0;krunN=0;krunning=false;kmoodV=20;ktrailOn=false;kqGoing=false;clearTimeout(kqTimer);clearTimeout(kq5Timer); document.querySelectorAll('.kscreen').forEach(s=>s.classList.remove('active')); document.getElementById('ks1').classList.add('active'); document.getElementById('kczone').innerHTML=''; document.getElementById('kfloaties').innerHTML=''; document.getElementById('kaftersmile').style.opacity='0'; document.querySelectorAll('.ktbtn').forEach(b=>b.classList.remove('eaten')); document.getElementById('kfbtn').style.left='50%';document.getElementById('kfbtn').style.top='50%';document.getElementById('kfbtn').style.transform='translate(-50%,-50%)'; ksetMood('kmd3','kme3',20); ksetMood('kkf','kke',8); }

function startKitty(c){
  kResize();
  try{new ResizeObserver(kResize).observe(document.getElementById('kitty-app'));}catch(e){}
  kDrawS();
  if(c.opts?.trail!==false) kenableTrail();
}
function kgoTo(n){
  document.querySelectorAll('.kscreen').forEach(s=>s.classList.remove('active'));
  const sc=document.getElementById('ks'+n);
  if(sc) sc.classList.add('active');
  if(n===2&&!kqGoing) kstartQ();
  if(n===3) ksetMood('kmd3','kme3',52);
  if(n===5){ kposBtn(); kstartQ5(); }
  if(n===6){ setTimeout(kconfetti,280); kbuildFloaties(); }
  // If treats disabled skip s4
  if(n===4&&viewCardData?.opts?.treats===false) kgoTo(5);
}
const kMoodE=["😶","🙁","😐","🙂","😊","😄","🥰"];
function ksetMood(fid,eid,v){ if(fid==='kmd3') kmoodV=v; const f=document.getElementById(fid),e=document.getElementById(eid); if(f)f.style.width=v+'%'; if(e)e.textContent=kMoodE[Math.min(Math.floor(v/100*6),6)]; }
function kpet(s){
  const char=viewCardData?.character||'cat';
  const msgs=charBubbles[char]||charBubbles.cat;
  kpC[s-1]=(kpC[s-1]+1)%msgs.length;
  const b=document.getElementById('kb'+s);
  if(b){b.textContent=msgs[kpC[s-1]];b.classList.add('show');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('show'),2400);}
  // Animate CSS character with temporary emotion
  const charEl=document.getElementById('kchar'+s);
  if(charEl){
    const cssChar=charEl.querySelector('.css-char');
    if(cssChar){
      const emotions=['happy','excited','surprised','thinking'];
      const pick=emotions[Math.floor(Math.random()*emotions.length)];
      cssChar.className=cssChar.className.replace(/\b(idle|happy|sad|excited|thinking|surprised|wiggle|confused)\b/g,'').trim();
      cssChar.classList.add(pick);
      clearTimeout(charEl._emoT);
      charEl._emoT=setTimeout(()=>{
        cssChar.className=cssChar.className.replace(/\b(happy|excited|thinking|surprised|wiggle|confused)\b/g,'').trim();
        cssChar.classList.add(screenEmotions[s-1]);
      },1200);
    }
  }
  ksparkBurst();
  if(s===3) ksetMood('kmd3','kme3',Math.min(kmoodV+14,95));
}
function kfeed(i,emoji){
  const btn=document.getElementById('kt'+i);
  if(!btn||btn.classList.contains('eaten')) return;
  const y=document.createElement('div'); y.className='kyum';
  const n=kfed; y.textContent=emoji+' '+['Nom nom!! 😻','More please!!','Yummy!! 😸','MAXIMUM JOY!! 🤩'][Math.min(n,3)];
  y.style.color=viewCardData?.theme?.ac||'#3d1a00';
  btn.appendChild(y); setTimeout(()=>y.remove&&y.remove(),950);
  btn.classList.add('eaten'); kfed++;
  const fills=[25,50,75,100];
  ksetMood('kkf','kke',fills[Math.min(kfed-1,3)]);
  const fm=document.getElementById('kfmsg');
  if(fm){fm.textContent=['So good!! 😸','MORE!! 🏅','Getting full... 🎉','BLISS!! 🤩'][Math.min(kfed-1,3)];fm.style.color=viewCardData?.theme?.ac||'#3d1a00';}
  ksparkBurst();
  ksetMood('kmd3','kme3',Math.min(kmoodV+16,95));
  // Switch char4 to excited on eat
  const c4=document.querySelector('#kchar4 .css-char');
  if(c4){c4.className=c4.className.replace(/\b(idle|happy|sad|excited|thinking|surprised)\b/g,'').trim();c4.classList.add(kfed>=4?'excited':'happy');}
}
function kposBtn(){ const b=document.getElementById('kfbtn');if(!b)return;b.style.transition='none';b.style.left='50%';b.style.top='50%';b.style.transform='translate(-50%,-50%)';krunN=0;b.textContent=viewCardData?.forgiveText||'Forgive them? 🥺';b.onclick=krunAway;krunning=false; }
function krunAway(){
  krunN++;
  const b=document.getElementById('kfbtn');
  if(krunN>=3){ b.style.transition='left .5s cubic-bezier(.34,1.56,.64,1),top .5s cubic-bezier(.34,1.56,.64,1)'; b.style.left='50%';b.style.top='50%';b.style.transform='translate(-50%,-50%)'; b.textContent='Yes, forgiven! 🌸'; b.onclick=()=>kgoTo(6); document.getElementById('krsub').innerHTML='Okay okay... only if you smile first 😄<br><span style="font-size:.87em;opacity:.65;">I knew you would 😼</span>'; return; }
  if(krunning) return; krunning=true;
  const z=document.querySelector('.kfzone');
  const zw=z.offsetWidth,zh=z.offsetHeight,bw=b.offsetWidth,bh=b.offsetHeight;
  b.style.transition='left .38s cubic-bezier(.34,1.56,.64,1),top .38s cubic-bezier(.34,1.56,.64,1)';
  b.style.left=Math.random()*(zw-bw)+'px'; b.style.top=Math.random()*(zh-bh)+'px'; b.style.transform='none';
  document.getElementById('krsub').innerHTML=['Nope!! Too slow 😼','Almost!! 😹 One more...','Last chance... 🐾'][krunN-1];
  setTimeout(()=>{krunning=false;},420);
}
function kSendSmile(){
  const m=document.getElementById('kaftersmile');
  if(m){ m.style.opacity='1'; }
  const sb=document.getElementById('ksmile-btn');
  sb.style.animation='none'; sb.textContent='Smile sent! 😊';
  kconfetti(); kbuildFloaties();
  // Switch char6 to excited
  const c6=document.querySelector('#kchar6 .css-char');
  if(c6){c6.className=c6.className.replace(/\b(idle|happy|sad|excited|thinking|surprised)\b/g,'').trim();c6.classList.add('excited');}
  if(CU){ const u=DB.getUsers(); if(u[CU.email]){u[CU.email].stats=u[CU.email].stats||{};u[CU.email].stats.smiles=(u[CU.email].stats.smiles||0)+1;DB.saveUsers(u);CU=u[CU.email];updateStats();} }
  addNotif({type:'smile',title:'Smile received!! 😊',msg:`Someone sent a smile back on your card!`,icon:'😊',time:Date.now()});
}
function kbuildFloaties(){
  const z=document.getElementById('kfloaties'); if(!z) return; z.innerHTML='';
  const items=viewCardData?(viewCardData.floaties||['🌸','✨','🐾','⭐','🌟']):['🌸','✨','🐾','⭐','🌟'];
  [...items,...items].slice(0,10).forEach((e,i)=>{ const s=document.createElement('span');s.className='kfloatie';s.textContent=e;s.style.animationDelay=(i*.13)+'s';s.style.animationDuration=(1.1+Math.random()*.6)+'s';s.style.fontSize='24px';z.appendChild(s); });
}
function kconfetti(){
  const z=document.getElementById('kczone'); if(!z) return;
  const t=viewCardData?.theme;
  const cols=t?[t.ac,t.a2,'#d4a017','#f5e6cc','#fdf6ec']:['#3d1a00','#c4822a','#d4a017','#6b3a1f','#c0392b'];
  for(let i=0;i<60;i++){ const c=document.createElement('div');c.className='kconf'; const sz=6+Math.random()*8; c.style.cssText=`left:${Math.random()*100}%;top:-16px;background:${cols[Math.floor(Math.random()*cols.length)]};width:${sz}px;height:${sz}px;border-radius:${Math.random()>.5?'50%':'3px'};animation-duration:${1.4+Math.random()*2}s;animation-delay:${Math.random()*.9}s;`; z.appendChild(c);setTimeout(()=>c.remove&&c.remove(),4400); }
}
function kenableTrail(){
  if(ktrailOn) return; ktrailOn=true;
  const app=document.getElementById('kitty-app');
  const items=viewCardData?(viewCardData.floaties||['🌸','✨','🐾','⭐']):['🌸','✨','🐾','⭐'];
  const add=(x,y)=>{ if(Math.random()>.62){ const h=document.createElement('div');h.className='khtrail';const r=app.getBoundingClientRect();h.textContent=items[Math.floor(Math.random()*items.length)];h.style.left=(x-r.left)+'px';h.style.top=(y-r.top)+'px';h.style.color=viewCardData?.theme?.a2||'#c4822a';app.appendChild(h);setTimeout(()=>h.remove&&h.remove(),1150); } };
  app.addEventListener('mousemove',e=>add(e.clientX,e.clientY));
  app.addEventListener('touchmove',e=>add(e.touches[0].clientX,e.touches[0].clientY),{passive:true});
}
let kstars=[],kcv,kcx;
function kResize(){ kcv=document.getElementById('kcanvas');if(!kcv)return;kcx=kcv.getContext('2d');const a=document.getElementById('kitty-app');kcv.width=a.offsetWidth;kcv.height=a.offsetHeight;if(viewCardData?.opts?.stars===false){kcx.clearRect(0,0,kcv.width,kcv.height);return;}const t=viewCardData?.theme;kstars=Array.from({length:24},()=>({x:Math.random()*kcv.width,y:Math.random()*kcv.height,r:Math.random()*2+.5,sp:Math.random()*.5+.2,ph:Math.random()*Math.PI*2,col:t?[t.a2,'#d4a017',t.ac+'88']:[...['#c4822a','#d4a017','#f5e6cc','#d4956a']]})); }
function kDrawS(){ if(!kcv||!kcx){requestAnimationFrame(kDrawS);return;}kcx.clearRect(0,0,kcv.width,kcv.height);const t2=Date.now()/1000;kstars.forEach(s=>{kcx.save();kcx.globalAlpha=.05+.15*Math.sin(t2*s.sp+s.ph);kcx.fillStyle=Array.isArray(s.col)?s.col[0]:s.col;kcx.beginPath();kcx.arc(s.x,s.y,s.r,0,Math.PI*2);kcx.fill();kcx.restore();});requestAnimationFrame(kDrawS); }
let kqI=0,kq5I=0;
function kstartQ(){ kqGoing=true;const el=document.getElementById('krq');const quotes=viewCardData?.quotes?.length?viewCardData.quotes:["They're not that bad 😅","Okay maybe a little 😼","But they're trying 🐾","Worth a second chance? 🌸","You deserve apologies 💫"];const run=()=>{if(!el||!el.parentElement){kqGoing=false;return;}el.style.opacity='0';setTimeout(()=>{if(el.parentElement){el.textContent='🌸 "'+quotes[kqI%quotes.length]+'"';kqI++;}el.style.opacity='1';},300);kqTimer=setTimeout(run,3200);};run(); }
function kstartQ5(){ clearTimeout(kq5Timer);const el=document.getElementById('krq5');const qs=["They sent all this love 🌸","Even I feel bad for them 😿","They're trying SO hard 🌟","Treats + sorry = forgive? 🥺"];const run=()=>{if(!el||!el.parentElement)return;el.style.opacity='0';setTimeout(()=>{if(el.parentElement){el.textContent='🌸 "'+qs[kq5I%qs.length]+'"';kq5I++;}el.style.opacity='1';},300);kq5Timer=setTimeout(run,2900);};setTimeout(run,2900); }
function ksparkBurst(){ const sc=document.querySelector('.kscreen.active');if(!sc)return;const items=viewCardData?(viewCardData.floaties||['🌸','✨','🐾','⭐','🌟']):['🌸','✨','🐾','⭐'];for(let i=0;i<6;i++){const d=document.createElement('div');d.style.cssText=`position:absolute;left:${25+Math.random()*50}%;top:${15+Math.random()*45}%;font-size:${11+Math.random()*10}px;pointer-events:none;animation:floatUp ${.8+Math.random()*.5}s ease ${i*.08}s forwards;z-index:30;`;d.textContent=items[Math.floor(Math.random()*items.length)];sc.appendChild(d);setTimeout(()=>d.remove&&d.remove(),2000);} }

// ══════════════════════════════════════════════════════
// HASH ROUTING (shareable links)
// ══════════════════════════════════════════════════════
async function loadFromHash(){
  const hash=window.location.hash;
  const m=hash.match(/^#card=(.+)$/);
  if(!m) return false;
  const id=m[1];
  const result=await DB.getCard(id);
  if(!result || !result.success || !result.card){
    document.getElementById('card-viewer').classList.add('open');
    document.getElementById('kitty-app').innerHTML='<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:32px;"><div style="font-size:64px;margin-bottom:16px;">😿</div><div style="font-family:Fredoka One,cursive;font-size:24px;color:#3d1a00;margin-bottom:8px;">Card not found...</div><div style="color:#6b3a1f;font-size:14px;font-weight:600;margin-bottom:24px;">This link may be invalid or expired.</div><button onclick="window.location.hash=\'\'" style="background:#3d1a00;color:#fdf6ec;border:none;border-radius:50px;padding:14px 32px;font-weight:900;font-size:16px;cursor:pointer;font-family:Nunito,sans-serif;">Go Home 🏠</button></div>';
    return true;
  }
  // Populate viewer using already-fetched card to avoid a second roundtrip
  viewCardData = result.card;
  applyCardTheme(result.card);
  populateCardViewer(result.card);
  document.getElementById('card-viewer').classList.add('open');
  resetKittyState();
  startKitty(result.card);
  return true;
}
window.addEventListener('hashchange', async ()=>{ if(!(await loadFromHash())){closeCardViewer();} });

// ══════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════
function timeAgo(ts){
  if(!ts) return '';
  const t = typeof ts === 'string' ? new Date(ts).getTime() : Number(ts);
  if (!Number.isFinite(t)) return '';
  const d=Date.now()-t;
  if(d<60000)return'now';
  if(d<3600000)return Math.floor(d/60000)+'m';
  if(d<86400000)return Math.floor(d/3600000)+'h';
  return Math.floor(d/86400000)+'d';
}

// ══════════════════════════════════════════════════════
// INIT
