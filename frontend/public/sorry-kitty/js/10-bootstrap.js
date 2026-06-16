// ══════════════════════════════════════════════════════
// Bootstrap: restore the session (if any) then mount the app.
// All persistence is handled by /api/* on the FastAPI backend.
// ══════════════════════════════════════════════════════
(async function init() {
  try {
    if (typeof loadFromHash === 'function' && (await loadFromHash())) return;

    console.log('Bootstrap: starting…');
    const sess = await DB.getSession();
    if (sess && sess.user) {
      CU = sess.user;
      console.log('Bootstrap: restored session for', CU.email);
      await initApp();
      return;
    }
    console.log('Bootstrap: no session, showing auth panel');
    showPanel('panel-auth');
  } catch (error) {
    console.error('Bootstrap error:', error);
    showPanel('panel-auth');
  }
})();
