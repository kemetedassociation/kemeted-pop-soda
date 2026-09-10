/* ============================================================
   KEMETED SAVEUR — comptes clients (Supabase Auth + points + B2B)
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://kpsuwkbrovbuudcndaot.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwc3V3a2Jyb3ZidXVkY25kYW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDQ1NTUsImV4cCI6MjEwNDYyMDU1NX0.lBKRBxWji0AK7h2b985Z4PRe51MmwJTMQrKj36Qp_JU';

  if (!window.supabase) { console.error('Supabase JS non chargé'); return; }
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  window.kemetedAuth = {
    client: sb,
    getSession: function () { return sb.auth.getSession().then(function (r) { return r.data.session; }); },
    signUp: function (email, password) { return sb.auth.signUp({ email: email, password: password }); },
    signIn: function (email, password) { return sb.auth.signInWithPassword({ email: email, password: password }); },
    signOut: function () { return sb.auth.signOut(); },
    getProfile: function (userId) {
      return sb.from('customers').select('*').eq('id', userId).maybeSingle().then(function (r) { return r.data; });
    },
    getOrders: function (userId) {
      return sb.from('orders').select('*').eq('customer_id', userId).order('created_at', { ascending: false })
        .then(function (r) { return r.data || []; });
    },
    requestB2B: function (company) { return sb.rpc('request_b2b', { company: company }); }
  };
})();
