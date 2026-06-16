// ══════════════════════════════════════════════════════
// PANELS
// ══════════════════════════════════════════════════════
function showPanel(id){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ══════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════
let signupAv = '🐱';
function pickSignupAv(el){ document.querySelectorAll('#signup-av-picker .av-opt').forEach(e=>e.classList.remove('sel')); el.classList.add('sel'); signupAv=el.dataset.av; }
function switchAuthTab(t){
  ['login','signup'].forEach(n=>{
    document.getElementById('at-'+n).classList.toggle('on',n===t);
    document.getElementById('af-'+n).style.display=n===t?'block':'none';
  });
}
async function doLogin(){
  const email=document.getElementById('l-email').value.trim().toLowerCase();
  const pass=document.getElementById('l-pass').value;
  const err=document.getElementById('l-err');
  err.style.display='none';
  if(!email||!pass){showErr(err,'Please fill all fields.');return;}
  
  const result = await DB.login({ email, password: pass });
  if(result.error){showErr(err,result.error);return;}
  
  CU=result.user; await DB.setSession(result.sessionToken);
  initApp();
}
async function doSignup(){
  const name=document.getElementById('s-name').value.trim();
  const email=document.getElementById('s-email').value.trim().toLowerCase();
  const pass=document.getElementById('s-pass').value;
  const err=document.getElementById('s-err'),ok=document.getElementById('s-ok');
  err.style.display='none'; ok.style.display='none';
  if(!name||!email||!pass){showErr(err,'Please fill all fields.');return;}
  if(pass.length<6){showErr(err,'Password needs 6+ characters.');return;}
  if(!/^[^@]+@[^@]+\.[^@]+$/.test(email)){showErr(err,'Invalid email address.');return;}
  
  const result = await DB.signup({ name, email, password: pass, avatar: signupAv });
  if(result.error){showErr(err,result.error);return;}
  
  CU=result.user; await DB.setSession(result.sessionToken);
  ok.textContent='Account created! 🎉'; ok.style.display='block';
  setTimeout(initApp,700);
}
async function doGoogleLogin(){
  const err=document.getElementById('l-err');
  err.style.display='none';
  
  console.log('Starting Google login...');
  const result = await DB.loginWithGoogle();
  console.log('Google login result:', result);
  
  if(result.error){
    console.error('Google login failed:', result.error);
    showErr(err,result.error);
    return;
  }
  
  // OAuth will redirect, so we don't need to do anything here
  // The session will be handled on page load after redirect
}
async function doLogout(){ CU=null; await DB.clearSession(); showPanel('panel-auth'); }
function showErr(el,msg){ el.textContent=msg; el.style.display='block'; }

// ══════════════════════════════════════════════════════
// INIT APP
