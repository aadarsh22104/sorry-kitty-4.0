// ══════════════════════════════════════════════════════
async function openCardViewer(id){
  const result = await DB.getCard(id);
  if(!result.success || !result.card) return;
  const c = result.card;
  viewCardData=c;
  applyCardTheme(c);
  populateCardViewer(c);
  document.getElementById('card-viewer').classList.add('open');
  resetKittyState();
  startKitty(c);
}
function closeCardViewer(){
  document.getElementById('card-viewer').classList.remove('open');
  clearTimeout(kqTimer); clearTimeout(kq5Timer);
  viewCardData=null;
}
function applyCardTheme(c){
  const t=c.theme||{bg:'#fdf3e7',ac:'#3d1a00',a2:'#c4822a'};
  const app=document.getElementById('kitty-app');
  app.style.background=t.bg;
  app.style.color=t.ac;
  app.style.fontFamily=c.font||'Nunito';
  app.style.setProperty('--cv-bg',t.bg);
  app.style.setProperty('--cv-accent',t.ac);
  app.style.setProperty('--cv-a2',t.a2||'#c4822a');
  app.style.setProperty('--cv-muted',t.tx||t.ac+'aa');
  // stripe
  const stripe=document.getElementById('kstripe');
  if(stripe){ stripe.style.display=c.opts?.stripe!==false?'block':'none'; stripe.style.background=`repeating-linear-gradient(90deg,${t.ac} 0,${t.ac} 18px,${t.tx||t.ac}99 18px,${t.tx||t.ac}99 36px,${t.a2} 36px,${t.a2} 54px,#d4a017 54px,#d4a017 72px,${t.tx||t.ac}99 72px,${t.tx||t.ac}99 90px)`; }
  // buttons
  document.querySelectorAll('.kbigbtn').forEach(b=>{ b.style.background=t.ac; b.style.color=t.bg; b.style.outlineColor=t.a2; b.style.boxShadow=`0 6px 0 ${t.ac}88`; });
  document.querySelectorAll('#kfbtn').forEach(b=>{ b.style.background='#c0392b'; b.style.color='#fff'; });
  // dots
  document.querySelectorAll('.kdot').forEach(d=>{ d.style.background='rgba(0,0,0,0.15)'; });
  document.querySelectorAll('.kdot.on').forEach(d=>{ d.style.background=t.ac; });
  // prog
  document.querySelectorAll('.kpfill').forEach(p=>p.style.background=t.ac);
  document.querySelectorAll('.kprog').forEach(p=>p.style.background='rgba(0,0,0,0.1)');
  // moodbar
  document.querySelectorAll('.kmoodbar-fill').forEach(f=>f.style.background=t.ac);
  document.querySelectorAll('.kmoodbar').forEach(b=>{ b.style.background=t.bg; b.style.border=`2px solid ${t.a2}44`; });
  // qcard
  document.querySelectorAll('.kqcard').forEach(q=>{ q.style.background=t.bg; q.style.border=`2px solid ${t.a2}44`; q.style.borderLeftColor=t.a2; q.style.color=t.tx||t.ac; });
  // msign
  document.querySelectorAll('.kmsign').forEach(m=>{ m.style.background=t.ac; m.style.color=t.a2||'#d4a017'; });
  // treat buttons
  document.querySelectorAll('.ktbtn').forEach(b=>{ b.style.background=t.bg; b.style.borderColor=t.a2; b.style.boxShadow=`0 4px 0 ${t.ac}66`; });
  // kback btn
  document.querySelectorAll('.kback-btn').forEach(b=>{ b.style.background=`${t.ac}22`; b.style.color=t.ac; });
  // bubbles
  document.querySelectorAll('.kbubble').forEach(b=>{ b.style.borderColor=t.a2; b.style.color=t.ac; });
  // forgive btn zone
  document.getElementById('kfbtn').style.outlineColor='rgba(200,0,0,.5)';
}
const charBubbles={
  cat:['Meow 🐱','Purrr 😸','*kneads paws*','Hiii!! 🐾','Mrrrow!'],
  panda:['Nom nom 🐼','*rolls cutely*','Bamboo! 🎋','Bao!! 🐼','Cuddle me?'],
  bear:['Roar... softly 🐻','*hugs you*','Honey! 🍯','Bear hug! 🐻','Grrr 🌸'],
  penguin:['Waddle waddle 🐧','Brrr! ❄️','*slides belly*','Squeak! 🐧','Fish? 🐟'],
  fox:['*swishes tail*','Arf! 🦊','Clever fox here','Fox tricks! 🦊','Fluffy! ✨'],
  bunny:['*thumps foot*','Bun bun! 🐰','Ears up! 🐰','Hop hop! ✨','Sniff sniff 🌸'],
  dog:['WOOF!! 🐶','Bork bork!','*wags tail*','Good boi! 🐶','Fetch? 🎾'],
  frog:['Ribbit! 🐸','*croaks cutely*','Leap! 🐸','Lily pad 🌿','Boing! 🐸'],
  lion:['*gentle roar*','King/Queen! 🦁','Purr... 🦁','Mane floof! ✨','Rawr 🌸'],
  koala:['*sleepy hug*','Eucalyptus 🌿','Koala! 🐨','*clings*','Soft! 🐨'],
};

function buildCSSChar(type, emotionClass){
  // Returns HTML for a full CSS-built character
  const t=type||'cat';
  const emo=emotionClass||'idle';
  if(t==='cat') return `
  <div class="css-char char-cat ${emo}">
    <div class="char-root">
      <div class="ch-body-wrap">
        <div class="ch-head">
          <div class="ch-ear-left"><div class="ch-ear-inner-l"></div></div>
          <div class="ch-ear-right"><div class="ch-ear-inner-r"></div></div>
          <div class="ch-stripes"><div class="ch-stripe"></div><div class="ch-stripe"></div><div class="ch-stripe"></div></div>
          <div class="ch-eyes"><div class="ch-eye"></div><div class="ch-eye"></div></div>
          <div class="ch-blush-l"></div><div class="ch-blush-r"></div>
          <div class="ch-nose"></div>
          <div class="ch-whiskers"><div class="ch-wh-l1"></div><div class="ch-wh-l2"></div><div class="ch-wh-r1"></div><div class="ch-wh-r2"></div></div>
          <div class="ch-mouth"></div>
        </div>
        <div class="ch-body">
          <div class="ch-arm-left"><div class="ch-paw-l"><div class="ch-toe"></div><div class="ch-toe"></div><div class="ch-toe"></div></div></div>
          <div class="ch-arm-right"><div class="ch-paw-r"><div class="ch-toe"></div><div class="ch-toe"></div><div class="ch-toe"></div></div></div>
          <div class="ch-belly"></div>
          <div class="ch-tail"></div>
        </div>
      </div>
    </div>
  </div>`;
  if(t==='panda') return `
  <div class="css-char char-panda ${emo}">
    <div class="char-root">
      <div class="ch-body-wrap">
        <div class="ch-head">
          <div class="ch-ear-left"></div><div class="ch-ear-right"></div>
          <div class="ch-patch-l"></div><div class="ch-patch-r"></div>
          <div class="ch-eyes"><div class="ch-eye"></div><div class="ch-eye"></div></div>
          <div class="ch-blush-l"></div><div class="ch-blush-r"></div>
          <div class="ch-nose"></div>
          <div class="ch-mouth"></div>
        </div>
        <div class="ch-body">
          <div class="ch-arm-left"></div>
          <div class="ch-arm-right"></div>
          <div class="ch-belly"></div>
          <div class="ch-leg-l"></div><div class="ch-leg-r"></div>
        </div>
      </div>
    </div>
  </div>`;
  if(t==='bear') return `
  <div class="css-char char-bear ${emo}">
    <div class="char-root">
      <div class="ch-body-wrap">
        <div class="ch-head">
          <div class="ch-ear-left"><div class="ch-ear-inner-l"></div></div>
          <div class="ch-ear-right"><div class="ch-ear-inner-r"></div></div>
          <div class="ch-eyes"><div class="ch-eye"></div><div class="ch-eye"></div></div>
          <div class="ch-blush-l"></div><div class="ch-blush-r"></div>
          <div class="ch-snout"></div>
          <div class="ch-nose"></div>
          <div class="ch-mouth"></div>
        </div>
        <div class="ch-body">
          <div class="ch-arm-left"><div class="ch-paw-l"></div></div>
          <div class="ch-arm-right"><div class="ch-paw-r"></div></div>
          <div class="ch-belly"></div>
          <div class="ch-leg-l"></div><div class="ch-leg-r"></div>
        </div>
      </div>
    </div>
  </div>`;
  if(t==='penguin') return `
  <div class="css-char char-penguin ${emo}">
    <div class="char-root">
      <div class="ch-body-wrap" style="position:relative;width:110px;">
        <div class="ch-hoodie" style="position:relative;">
          <div class="ch-hood" style="position:absolute;top:-40px;left:50%;transform:translateX(-50%);width:80px;height:76px;background:#999;border-radius:50%;border:3px solid #333;z-index:2;overflow:hidden;">
            <div class="ch-hood-inner" style="position:absolute;top:8px;left:50%;transform:translateX(-50%);width:60px;height:64px;background:#444;border-radius:50%;">
              <div class="ch-head" style="position:absolute;top:8px;left:50%;transform:translateX(-50%);width:52px;height:52px;background:#fff;border-radius:50%;">
                <div class="ch-eyes" style="position:absolute;top:14px;left:0;right:0;display:flex;justify-content:center;gap:10px;z-index:5;">
                  <div class="ch-eye"></div><div class="ch-eye"></div>
                </div>
                <div class="ch-blush-l"></div><div class="ch-blush-r"></div>
                <div class="ch-beak"></div>
              </div>
            </div>
          </div>
          <div class="ch-belly"></div>
          <div class="ch-string-l"></div><div class="ch-string-r"></div>
          <div class="ch-string-dot-l"></div><div class="ch-string-dot-r"></div>
          <div class="ch-arm-left"></div>
          <div class="ch-arm-right"></div>
          <div class="ch-foot-l"></div><div class="ch-foot-r"></div>
        </div>
      </div>
    </div>
  </div>`;
  // Fallback for other characters — styled emoji wrapper
  const fallbackEmoji={fox:'🦊',bunny:'🐰',dog:'🐶',frog:'🐸',lion:'🦁',koala:'🐨'}[t]||'🐾';
  return `<div class="css-char ${emo}" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;"><div class="char-root" style="font-size:110px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.15));">${fallbackEmoji}</div></div>`;
}

// Map screen index to emotion
const screenEmotions=['idle','sad','sad','happy','excited','happy'];

function populateCardViewer(c){
  const charType=c.character||'cat';
  // set all char displays with CSS characters + emotions
  for(let i=1;i<=6;i++){
    const el=document.getElementById('kchar'+i);
    if(el){
      el.innerHTML=buildCSSChar(charType, screenEmotions[i-1]);
      el.style.fontSize='';
      el.style.animation='';
      el.style.filter='';
      // Scale by user charSize setting
      const scale=((c.charSize||170)/170).toFixed(2);
      el.style.transform=`scale(${scale})`;
      el.style.transformOrigin='bottom center';
    }
  }
  const r=c.recipient||'You';
  const s=c.sender||CU?.name||'Someone';
  setText('kv-tagline',c.tagline?`✦ ${c.tagline} ✦`:'✦ A Special Delivery ✦');
  setText('kv-recipient',r+' 🌸');
  setText('kv-s1-title',`Hi ${r}... I'm here on a mission! 🐾`);
  setText('kv-s1-sub',`I came all the way here with a secret 🌸`);
  document.getElementById('kb1').textContent=`Hiii ${r}!! 🐾`;
  // message
  const msgs={sorry:`So I, the most adorable messenger, came to fix it. You're welcome. 🐾`,love:`I brought all my love and affection just for you 💕`,miss:`Missing you so much it hurts... so I sent a cute messenger 🥺`,cheer:`Today is going to be a GREAT day — I promise! 🎉`};
  setText('kv-message',c.message||(msgs[c.tone||'sorry']));
  setText('kv-s3-title',`${s} is genuinely sorry, ${r} 😿`);
  setText('kv-s3-sub',`They didn't mean to hurt you...<br>So this little one came with gifts 🎁`);
  setText('kv-mood-label',`${r}'s mood`);
  setText('kv-final-msg',(c.closing||`Just wanted to make ${r} smile 😸<br>${s} is waiting... 🌸`));
  // forgive btn
  const fb=document.getElementById('kfbtn');
  fb.textContent=c.forgiveText||'Forgive them? 🥺';
  fb.onclick=krunAway;
  // smile btn
  const sb=document.getElementById('ksmile-btn');
  sb.textContent=c.smileBtn||'Send a tiny smile back 😊';
  sb.onclick=kSendSmile;
  // after smile
  setText('kaftersmile',c.afterSmile||`Mission complete!! 🎉 ${r} smiled!! ${s} will be so happy! 😸`);
  // treat row
  buildTreatRow(c.treats||['🍫']);
  // options
  if(c.opts?.treats===false) document.getElementById('ks4').style.display='none';
  if(c.opts?.mood===false){ document.getElementById('kmoodbar-wrap').style.display='none'; document.getElementById('khappy-bar').style.display='none'; }
  if(c.opts?.runaway===false){ const fb=document.getElementById('kfbtn'); fb.onclick=()=>kgoTo(6); }
  // bgf
  document.getElementById('kbgf-layer').innerHTML='';
  if(c.opts?.floaties!==false){
    (c.floaties||['🌸','✨','🐾','⭐']).forEach(e=>{ const p=document.createElement('div');p.className='kbgf';p.textContent=e;p.style.left=(10+Math.random()*80)+'%';p.style.animationDelay=(Math.random()*9)+'s';p.style.animationDuration=(12+Math.random()*12)+'s';document.getElementById('kbgf-layer').appendChild(p); });
  }
}
function setText(id,html){ const el=document.getElementById(id); if(el) el.innerHTML=html; }
function buildTreatRow(treats){
  const row=document.getElementById('ktreat-row');
  if(!row) return;
  row.innerHTML='';
  treats.forEach((t,i)=>{
    const d=document.createElement('div'); d.className='ktbtn'; d.id='kt'+i;
    d.textContent=t; d.onclick=()=>kfeed(i,t);
    row.appendChild(d);
  });
}


// Open chat directly with sender/recipient from final greeting screen.
// If the user isn't logged in we remember the card id so that, after they
// sign up or log in, they're taken straight into that card's chat instead of
// dropping onto the home tab.
function kOpenChat(){
  const c = viewCardData;
  closeCardViewer();
  if (typeof CU !== 'undefined' && CU) {
    showPanel('panel-app');
    if (c && typeof openMomentWindow === 'function') {
      setTimeout(()=>openMomentWindow(c.id), 80);
    } else if (typeof goTab === 'function') {
      goTab('chat');
    }
  } else {
    if (c && c.id) {
      try { sessionStorage.setItem('sk_pending_chat', c.id); } catch (e) {}
    }
    showPanel('panel-auth');
  }
}
