// ══════════════════════════════════════════════════════
let momentCardId       = null;
let momentBlocked      = false;
let momentCurrentMsg   = null;
let momentReactionTimer = null;
let momentIdleTimer    = null;
let momentHeldTimer    = null;
let selectedMomentEmoji = null;  // { emoji, holdClass }

// ── EMOJI BAR STATE ──
let emojiBarExpanded = false;

function expandEmojiBar(){
  document.getElementById('emoji-selector').classList.add('expanded');
  emojiBarExpanded = true;
  clearTimeout(window._emojiCollapseTimer);
  window._emojiCollapseTimer = setTimeout(collapseEmojiBar, 5000);
}
function collapseEmojiBar(){
  document.getElementById('emoji-selector').classList.remove('expanded');
  emojiBarExpanded = false;
  clearTimeout(window._emojiCollapseTimer);
}

// ── SINGLE TAP LOGIC ──
// Collapsed: tap ❤️ → expand (show all)
// Expanded:  tap any emoji → fire instantly + collapse
function tapMomentEmoji(btn){
  const emojiChar = btn.dataset.emoji;
  const holdClass = btn.dataset.hold;

  if(!emojiBarExpanded){
    // Always expand first on any tap when collapsed
    expandEmojiBar();
    return;
  }

  // Bar is open — fire immediately
  fireEmojiReaction(emojiChar, holdClass, btn);
}

// ── FIRE EMOJI — no text needed ──
async function fireEmojiReaction(emojiChar, holdClass, btn){
  if(momentBlocked) return;

  // Button flash
  document.querySelectorAll('.emoji-sel-btn').forEach(b=>b.classList.remove('fired'));
  if(btn){ btn.classList.add('fired'); setTimeout(()=>btn.classList.remove('fired'), 400); }

  // Collapse bar
  collapseEmojiBar();

  // Show emoji as the moment message
  showMoment(emojiChar, true);

  // Character reacts
  const cfg = EMOJI_HOLD_CONFIG[emojiChar];
  if(cfg){
    applyCharReaction(emojiChar, '');
    applyMomentBg({bg: cfg.bg, glow: cfg.glow});
    spawnParticles([emojiChar, '✨', '🌸']);
  }

  // Persist the emoji as a real chat message so the other side sees it.
  if(momentCardId && CU){
    const isOwner = momentOwnerId === CU.id;
    const saved = await DB.sendChatMessage({
      card_id: momentCardId,
      participant_id: CU.id,
      message: emojiChar,
      is_from_owner: isOwner,
      emoji_reaction: emojiChar
    });
    if(saved && saved.success && saved.message){
      momentSeenIds.add(saved.message.id);
    }
  }
}

// ── EMOJI HOLD CONFIG per emoji ──
// position: {bottom, left offset from center (translateX)}
// holdClass: animation class
// charEmotion: which CSS char emotion class to apply
// charAnim: body animation name
// glowColor, bgColor
const EMOJI_HOLD_CONFIG = {
  '❤️': {
    holdClass:'hold-chest',
    pos:{bottom:'34px', left:'calc(50% - 18px)'},
    charEmotion:'happy', charAnim:'charBlush',
    glow:'#ff9eb5', bg:'rgba(255,182,193,.28)',
    charMouth:'smile', blushVisible:true,
    replyTexts:['💕','I feel that too 🥺','❤️','you mean so much to me 🌸','my heart 💗'],
  },
  '😊': {
    holdClass:'hold-side',
    pos:{bottom:'28px', left:'calc(50% + 42px)'},
    charEmotion:'happy', charAnim:'charBounce',
    glow:'#fde047', bg:'rgba(253,224,71,.22)',
    replyTexts:['😊','that made me smile','hehe 😄','you\'re so sweet 🌸'],
  },
  '😢': {
    holdClass:'hold-loose',
    pos:{bottom:'26px', left:'calc(50% - 22px)'},
    charEmotion:'sad', charAnim:'charSad',
    glow:'#93c5fd', bg:'rgba(147,197,253,.22)',
    headTilt: true,
    replyTexts:['🥺','I understand...','I\'m here for you','don\'t cry 🌸'],
  },
  '😡': {
    holdClass:'hold-tight',
    pos:{bottom:'30px', left:'calc(50% + 38px)'},
    charEmotion:'surprised', charAnim:'charShake',
    glow:'#f87171', bg:'rgba(252,165,165,.25)',
    replyTexts:['😤','okay okay...','I hear you!','I\'m sorry 🥺'],
  },
  '😲': {
    holdClass:'hold-face',
    pos:{bottom:'72px', left:'calc(50% - 10px)'},
    charEmotion:'surprised', charAnim:'charWide',
    glow:'#c4822a', bg:'rgba(196,130,42,.2)',
    replyTexts:['😱','NO WAY!!','omg omg','I can\'t believe it!!'],
  },
  '😌': {
    holdClass:'hold-gentle',
    pos:{bottom:'30px', left:'calc(50% + 36px)'},
    charEmotion:'idle', charAnim:'charCalm',
    glow:'#a7f3d0', bg:'rgba(167,243,208,.2)',
    replyTexts:['😌','I\'m calm now 🌿','thank you 🌸','peaceful 🍃'],
  },
  '🩴': {
    holdClass:'hold-swing',
    pos:{bottom:'30px', left:'calc(50% + 44px)'},
    charEmotion:'surprised', charAnim:'charShake',
    glow:'#fbbf24', bg:'rgba(251,191,36,.2)',
    special:'chappal',
    replyTexts:['😤 don\'t make me use this!','playfully annoyed 🩴','I\'m warning you!! 😂','haha okay okay!!'],
  },
};

// ── TEXT → EMOTION DETECTION (fallback when no emoji selected) ──
const TEXT_EMOTION_MAP = [
  { re:/i love|love you|luv|❤|💕|💗|miss you|adore|darling/i,  emoji:'❤️' },
  { re:/sorry|forgive|hurt|sad|cry|tears|😢|😭|😔|💔/i,         emoji:'😢' },
  { re:/haha|lol|hehe|funny|😂|😄|😁|happy|great/i,              emoji:'😊' },
  { re:/angry|hate|mad|ugh|annoyed|stop|😠|😤|🤬/i,              emoji:'😡' },
  { re:/wow|omg|whoa|amazing|!!|😱|🤩|shocked|no way/i,          emoji:'😲' },
  { re:/calm|okay|fine|alright|peace|😌|sure|good/i,              emoji:'😌' },
];
function detectEmojiFromText(text){
  for(const r of TEXT_EMOTION_MAP){
    if(r.re.test(text)) return r.emoji;
  }
  return null;
}

// Kept for BG-only use
const EMOTION_RULES = [
  { patterns:[/i love|love you|luv|❤|💕|💗|💖|miss you/i], emotion:'affection', bg:'rgba(255,182,193,.3)', glow:'#ff9eb5', anim:'charBlush', tag:'', particles:['❤️','💕','🌸'] },
  { patterns:[/sorry|forgive|hurt|sad|cry|tears|😢|😭/i],  emotion:'sad',       bg:'rgba(147,197,253,.25)', glow:'#93c5fd', anim:'charSad',  tag:'', particles:['🥺','💙'] },
  { patterns:[/haha|lol|hehe|funny|😂|😄|happy/i],          emotion:'happy',     bg:'rgba(253,224,71,.25)',  glow:'#fde047', anim:'charBounce',tag:'', particles:['😊','✨'] },
  { patterns:[/angry|hate|mad|😠|😤/i],                      emotion:'angry',     bg:'rgba(252,165,165,.3)', glow:'#f87171', anim:'charShake', tag:'', particles:['😤','💢'] },
  { patterns:[/wow|omg|!!|😱|🤩/i],                          emotion:'excited',   bg:'rgba(196,130,42,.2)',  glow:'#c4822a', anim:'charJump',  tag:'', particles:['🤩','✨'] },
];
function detectEmotion(text){
  for(const r of EMOTION_RULES){
    if(r.patterns.some(p=>p.test(text))) return r;
  }
  return {emotion:'neutral',bg:'rgba(253,243,231,.6)',glow:'rgba(196,130,42,.2)',anim:'charFloat',tag:'',particles:['🌸','✨']};
}

// ── SHOW HELD EMOJI — pixel-exact positions inside 180×220 char-wrap ──
// char center-x ≈ 90px, arms reach to ~20px (left arm) and ~140px (right arm)
// body bottom ≈ 30-50px from wrap bottom
let heldEmojiActive = false;
function showHeldEmoji(emojiChar, config){
  const wrap  = document.getElementById('held-emoji-wrap');
  const inner = document.getElementById('held-emoji-inner');
  if(!wrap||!inner) return;
  clearHeldEmoji(true);

  inner.textContent = emojiChar;

  // Absolute px within the 180×220 char-wrap (origin = top-left of wrap)
  const POS = {
    'hold-chest': { bottom:'40px',  left:'62px'  }, // center, both arms meeting
    'hold-side':  { bottom:'34px',  left:'120px' }, // right arm outstretched
    'hold-loose': { bottom:'20px',  left:'58px'  }, // drooping, center-left
    'hold-tight': { bottom:'38px',  left:'122px' }, // right arm, gripped tight
    'hold-face':  { bottom:'96px',  left:'68px'  }, // near face, center-high
    'hold-gentle':{ bottom:'34px',  left:'118px' }, // right arm, relaxed
    'hold-swing': { bottom:'36px',  left:'126px' }, // right arm raised for swing
  };
  const p = POS[config.holdClass] || { bottom:'36px', left:'62px' };

  wrap.style.bottom    = p.bottom;
  wrap.style.left      = p.left;
  wrap.style.transform = 'none';
  wrap.className = `held-emoji-wrap appear ${config.holdClass}`;
  wrap.style.display = 'flex';
  heldEmojiActive = true;

  if(config.special === 'chappal'){
    inner.style.transform = 'rotate(-22deg)';
    inner.style.fontSize  = '26px';
  } else {
    inner.style.transform = '';
    inner.style.fontSize  = '28px';
  }

  clearTimeout(momentHeldTimer);
  momentHeldTimer = setTimeout(()=>clearHeldEmoji(false), 2800);
}
function clearHeldEmoji(instant){
  const wrap = document.getElementById('held-emoji-wrap');
  if(!wrap||!heldEmojiActive) return;
  if(instant){
    wrap.style.display='none';
    wrap.className='held-emoji-wrap';
    heldEmojiActive = false;
    return;
  }
  wrap.classList.add('fade-out');
  setTimeout(()=>{
    wrap.style.display='none';
    wrap.className='held-emoji-wrap';
    heldEmojiActive = false;
  }, 500);
}

// ── APPLY CHARACTER REACTION ──
function applyCharReaction(emojiChar, textFallback){
  const cfg = EMOJI_HOLD_CONFIG[emojiChar];
  const inner = document.getElementById('moment-char-inner');
  const glow  = document.getElementById('moment-char-glow');
  const tag   = document.getElementById('moment-emotion-tag');
  if(!inner) return;

  // Get anim — fallback charFloat for unknown
  const animName = cfg ? cfg.charAnim : (detectEmotion(textFallback).anim || 'charFloat');
  const glowColor = cfg ? cfg.glow : 'rgba(196,130,42,.2)';

  // Trigger body animation
  inner.style.animation = 'none';
  void inner.offsetHeight;
  inner.style.animation = `${animName} .65s cubic-bezier(.34,1.56,.64,1)`;

  // Glow ring
  if(glow){ glow.style.background = glowColor; glow.classList.add('show'); }

  // CSS char emotion state
  const cssChar = inner.querySelector('.css-char');
  if(cssChar && cfg){
    cssChar.className = cssChar.className.replace(/\b(idle|happy|sad|excited|thinking|surprised|wiggle)\b/g,'').trim();
    cssChar.classList.add(cfg.charEmotion || 'idle');
  }

  // Show held emoji
  if(cfg) showHeldEmoji(emojiChar, cfg);

  // Hold for 2.8s then return to idle
  clearTimeout(momentReactionTimer);
  momentReactionTimer = setTimeout(()=>{
    inner.style.animation = 'charFloat 2.4s ease-in-out infinite';
    if(glow) glow.classList.remove('show');
    if(tag)  tag.classList.remove('show');
    if(cssChar){
      cssChar.className = cssChar.className.replace(/\b(happy|sad|excited|thinking|surprised|wiggle)\b/g,'').trim();
      cssChar.classList.add('idle');
    }
  }, 2800);
}

// ── BACKGROUND THEME ──
function applyMomentBg(emotionRule){
  const bg = document.getElementById('moment-bg');
  const b1 = document.getElementById('moment-blob1');
  const b2 = document.getElementById('moment-blob2');
  if(bg) bg.style.background = `linear-gradient(160deg,#fdf3e7 0%,${emotionRule.bg} 50%,#fdf0e8 100%)`;
  if(b1) b1.style.background = emotionRule.glow ? `${emotionRule.glow}22` : 'rgba(196,130,42,.08)';
  if(b2) b2.style.background = emotionRule.glow ? `${emotionRule.glow}18` : 'rgba(212,160,23,.07)';
}

// ── PARTICLES ──
function spawnParticles(emojis){
  const stage = document.getElementById('moment-stage');
  if(!stage) return;
  const count = 3 + Math.floor(Math.random()*3);
  for(let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className = 'moment-particle';
    p.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    p.style.left = `calc(50% + ${(Math.random()*140-70)}px)`;
    p.style.top  = `${50+Math.random()*80}px`;
    p.style.animationDelay = `${i*0.1}s`;
    p.style.fontSize = `${12+Math.floor(Math.random()*10)}px`;
    stage.appendChild(p);
    setTimeout(()=>p.remove&&p.remove(), 1100);
  }
}

// ── THE MOMENT DISPLAY (single floating message) ──
function showMoment(text, isMe){
  const zone = document.getElementById('moment-msg-zone');
  if(!zone) return;
  const hint = document.getElementById('moment-idle-hint');
  // Fade out current
  const existing = zone.querySelector('.moment-bubble');
  if(existing){
    existing.classList.remove('entering');
    existing.classList.add('exiting');
    setTimeout(()=>existing.remove&&existing.remove(), 150);
  }
  if(hint) hint.style.display='none';
  setTimeout(()=>{
    const bubble = document.createElement('div');
    bubble.className = 'moment-bubble entering';
    bubble.innerHTML = `<span class="moment-bubble-sender">${isMe?'you':'them'}</span>${escapeHtml(text)}`;
    bubble.style.borderColor = isMe ? 'rgba(196,130,42,.3)' : 'rgba(100,140,240,.2)';
    if(!isMe) bubble.style.background = 'rgba(240,245,255,.9)';
    zone.innerHTML='';
    zone.appendChild(bubble);
    momentCurrentMsg = {text,isMe};
    clearTimeout(momentIdleTimer);
    momentIdleTimer = setTimeout(()=>{
      bubble.style.transition='opacity 1s ease';
      bubble.style.opacity='.25';
    }, 8000);
  }, existing ? 165 : 0);
}
function escapeHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;}

// ── RENDER MOMENT CARD LIST ──
async function renderChats(){
  if(!CU) return;
  // Cards I own + cards I have chatted on (as a participant). Merged & deduped.
  const ownedRes = await DB.getCards(CU.id);
  const owned = ownedRes && ownedRes.success ? ownedRes.cards : [];
  const partRes = await DB.getParticipatingCards(CU.id);
  const participating = partRes && partRes.success ? partRes.cards : [];
  const seen = new Set();
  const cards = [];
  for (const c of [...owned, ...participating]) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    cards.push(c);
  }
  const list = document.getElementById('moment-card-list');
  if(!list) return;
  if(cards.length===0){
    list.innerHTML=`<div class="moment-empty"><span class="moment-empty-icon">💬</span><div class="moment-empty-title">No Moments Yet</div><div class="moment-empty-sub">Create a Sorry Card first,<br>then open a live moment with your recipient.</div><button class="btn btn-main" onclick="goTab('create')">Create a Card ✨</button></div>`;
    return;
  }
  list.innerHTML=cards.map(c=>{
    const otherName = (c.owner_id === CU.id) ? (c.recipient || '?') : (c.sender || c.recipient || 'Someone');
    return `
    <div class="moment-card-entry" onclick="openMomentWindow('${c.id}')">
      <div class="moment-card-char">${charEmojis[c.character||'cat']||'🐱'}</div>
      <div class="moment-card-info">
        <div class="moment-card-name">Moment with ${otherName}</div>
        <div class="moment-card-tagline">${c.tagline||'Tap to open the live moment'}</div>
        <div class="moment-card-status"><div class="moment-card-dot"></div><div class="moment-card-status-text">Ready</div></div>
      </div>
      <div class="moment-card-arrow">›</div>
    </div>`;
  }).join('');
}

// ── OPEN / CLOSE ──
let momentPollTimer = null;
let momentSeenIds = new Set();
let momentOwnerId = null; // owner of the currently open moment card

async function openMomentWindow(cardId){
  const result = await DB.getCard(cardId);
  if(!result.success || !result.card) return;
  const card = result.card;
  momentCardId = cardId;
  momentOwnerId = card.owner_id || null;
  momentBlocked = false;
  selectedMomentEmoji = null;
  heldEmojiActive = false;
  emojiBarExpanded = false;
  momentSeenIds = new Set();
  document.querySelectorAll('.emoji-sel-btn').forEach(b=>b.classList.remove('selected','fired'));
  document.getElementById('emoji-selector')?.classList.remove('expanded');
  // Show "you" the recipient name if you ARE the card owner, otherwise the sender's name
  const otherPartyLabel = (CU && CU.id === momentOwnerId)
    ? (card.recipient || 'Someone special')
    : (card.sender || card.recipient || 'Someone special');
  document.getElementById('mpresence-name').textContent = otherPartyLabel;
  document.getElementById('mpresence-status').textContent = 'feeling your presence';
  // Build character
  const inner = document.getElementById('moment-char-inner');
  if(inner){
    inner.innerHTML = buildCSSChar(card.character||'cat','idle');
    inner.style.animation = 'charFloat 2.4s ease-in-out infinite';
    const s = Math.min(1.2,(card.charSize||170)/170*0.85);
    inner.style.transform = `scale(${s})`;
    inner.style.transformOrigin = 'bottom center';
  }
  // Reset held emoji
  const hw = document.getElementById('held-emoji-wrap');
  if(hw){ hw.style.display='none'; hw.className='held-emoji-wrap'; }
  applyMomentBg({bg:'rgba(253,243,231,.6)',glow:'rgba(196,130,42,.2)'});
  // Reset message zone
  const zone = document.getElementById('moment-msg-zone');
  if(zone) zone.innerHTML='<div class="moment-idle-hint" id="moment-idle-hint">say something... 💬</div>';
  buildMomentCardStrip(card);
  document.getElementById('moment-window').classList.add('open');
  setTimeout(()=>document.getElementById('moment-input')?.focus(), 300);

  // Load existing chat history + start polling for new messages
  await pollMomentMessages({initial:true});
  if(momentPollTimer) clearInterval(momentPollTimer);
  momentPollTimer = setInterval(()=>{ pollMomentMessages({initial:false}); }, 3000);
}

async function pollMomentMessages(opts){
  if(!momentCardId) return;
  const r = await DB.getChatMessages(momentCardId);
  if(!r || !r.success) return;
  const messages = r.messages || [];
  if(opts && opts.initial){
    // Mark everything we already have as seen, but render the most recent
    // message from the OTHER side so the user has context on what was said.
    messages.forEach(m=>momentSeenIds.add(m.id));
    const lastFromOther = [...messages].reverse().find(m=>m.participant_id && m.participant_id !== (CU&&CU.id));
    if(lastFromOther){
      showMoment(lastFromOther.message, false);
    }
    return;
  }
  // Subsequent polls — show only NEW messages from the other side.
  messages.forEach(m=>{
    if(momentSeenIds.has(m.id)) return;
    momentSeenIds.add(m.id);
    const mine = CU && m.participant_id === CU.id;
    if(mine) return; // we already showed this when we sent it
    showMoment(m.message, false);
    const e = m.emoji_reaction || detectEmojiFromText(m.message);
    if(e) applyCharReaction(e, m.message);
    const cfg = e ? EMOJI_HOLD_CONFIG[e] : null;
    if(cfg){ applyMomentBg({bg:cfg.bg,glow:cfg.glow}); spawnParticles([e,'✨','🌸']); }
  });
}

function closeMomentWindow(){
  document.getElementById('moment-window').classList.remove('open');
  momentCardId = null;
  momentOwnerId = null;
  momentSeenIds = new Set();
  clearTimeout(momentReactionTimer);
  clearTimeout(momentIdleTimer);
  clearTimeout(momentHeldTimer);
  if(momentPollTimer){ clearInterval(momentPollTimer); momentPollTimer = null; }
}

// ── CARD STRIP ──
function buildMomentCardStrip(card){
  const strip = document.getElementById('moment-card-strip');
  if(!strip) return;
  strip.innerHTML=`<div class="moment-mini-card" onclick="openMomentCard()"><span class="moment-mini-card-char">${charEmojis[card.character||'cat']||'🐱'}</span><span class="moment-mini-card-label">View Card</span></div><div class="moment-mini-card" onclick="copyMomentLink()"><span class="moment-mini-card-char">🔗</span><span class="moment-mini-card-label">Copy Link</span></div>`;
}

// ── SEND A MOMENT (text path — emoji bar is separate) ──
async function sendMoment(){
  if(momentBlocked) return;
  const inp = document.getElementById('moment-input');
  const text = (inp?.value||'').trim();
  if(!text) return;
  inp.value = '';

  // Detect emoji from text for reaction
  const reactionEmoji = detectEmojiFromText(text);

  showMoment(text, true);
  applyCharReaction(reactionEmoji, text);

  const cfg = reactionEmoji ? EMOJI_HOLD_CONFIG[reactionEmoji] : null;
  if(cfg){
    applyMomentBg({bg: cfg.bg, glow: cfg.glow});
    spawnParticles([reactionEmoji,'✨','🌸']);
  } else {
    const emo = detectEmotion(text);
    applyMomentBg(emo);
    spawnParticles(emo.particles||['🌸']);
  }

  // Save the message to Supabase. is_from_owner is determined by whether
  // the current user owns the card (true) or is a participant (false).
  if(momentCardId && CU){
    const isOwner = momentOwnerId === CU.id;
    const saved = await DB.sendChatMessage({
      card_id: momentCardId,
      participant_id: CU.id,
      message: text,
      is_from_owner: isOwner,
      emoji_reaction: reactionEmoji
    });
    // Track our own message so the next poll doesn't double-render it
    if(saved && saved.success && saved.message){
      momentSeenIds.add(saved.message.id);
    }
  }
}
function onMomentInputChange(){}

// ── SIMULATED REPLY ──
function simulateMomentReply(emojiChar, sentText, cfg){
  const delay = 2400 + Math.random()*1800;
  setTimeout(()=>{
    if(!momentCardId) return;
    const replies = cfg
      ? cfg.replyTexts
      : ['🌸','...','yeah','hmm okay'];
    const reply = replies[Math.floor(Math.random()*replies.length)];

    // Reply from "them" — character returns to idle for a beat, then reacts to reply
    showMoment(reply, false);

    // Detect reply emotion and react
    const replyEmoji = detectEmojiFromText(reply) || (emojiChar ? emojiChar : null);
    const replyBg    = replyEmoji
      ? (EMOJI_HOLD_CONFIG[replyEmoji] || {bg:'rgba(253,243,231,.6)',glow:'rgba(196,130,42,.2)'})
      : detectEmotion(reply);

    // Slight delay so char is back to idle before reacting to reply
    setTimeout(()=>{
      applyCharReaction(replyEmoji||'😊', reply);
      applyMomentBg(replyBg);
    }, 400);
  }, delay);
}

// ── CHAR TAP ──
function onCharTap(){
  const inner = document.getElementById('moment-char-inner');
  if(!inner) return;
  spawnParticles(['✨','🌸','❤️','🐾']);
  inner.style.animation='none';
  void inner.offsetHeight;
  inner.style.animation='charJump .55s cubic-bezier(.34,1.56,.64,1)';
  setTimeout(()=>{ inner.style.animation='charFloat 2.4s ease-in-out infinite'; },650);
}

// ── MENU ──
function toggleMomentMenu(){
  const m=document.getElementById('moment-menu');
  m.classList.toggle('open');
  if(m.classList.contains('open')){
    setTimeout(()=>document.addEventListener('click',()=>m.classList.remove('open'),{once:true}),0);
  }
}
function openMomentCard(){ if(momentCardId) openCardViewer(momentCardId); }
function copyMomentLink(){
  if(!momentCardId) return;
  const url=getCardURL(momentCardId);
  const fb=()=>{const t=document.createElement('textarea');t.value=url;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch(e){}document.body.removeChild(t);};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).catch(fb);}else{fb();}
  showToast('Link copied! 🔗','');
  document.getElementById('moment-menu').classList.remove('open');
}
function closeMomentAndGoCard(){ copyMomentLink(); }
function blockMoment(){ momentBlocked=true; document.getElementById('moment-blocked').classList.add('show'); document.getElementById('moment-menu').classList.remove('open'); }
function unblockMoment(){ momentBlocked=false; document.getElementById('moment-blocked').classList.remove('show'); }
function deleteMoment(){ closeMomentWindow(); document.getElementById('moment-menu').classList.remove('open'); showToast('Moment ended 🌸',''); }

// Stubs — keep old names safe
function openChat(id){ openMomentWindow(id); }
function closeChatWindow(){ closeMomentWindow(); }
function shareViaChat(cardId){ openMomentWindow(cardId); }
function updateChatBadge(){}

// ══════════════════════════════════════════════════════
