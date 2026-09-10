/* ============================================================
   KEMETED SAVEUR — cookie consent + Korvo (le corbeau messager)
   ============================================================ */
(function(){
  'use strict';

  /* ===================== COOKIE CONSENT ===================== */
  var STORE_KEY = 'kemeted_consent_v1';
  var waiters = { analytics: [], marketing: [] };

  function readConsent(){
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch(e){ return null; }
  }
  function writeConsent(c){
    c.ts = Date.now();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(c)); } catch(e){}
    applyConsent(c);
  }
  function applyConsent(c){
    ['analytics','marketing'].forEach(function(cat){
      if (c[cat]) {
        waiters[cat].forEach(function(fn){ try{ fn(); }catch(e){} });
        waiters[cat] = [];
      }
    });
  }
  /* Public API for future scripts (analytics, ad pixels…) to hook in
     safely — they only run once the matching category is accepted. */
  window.kemetedConsent = {
    get: readConsent,
    on: function(category, fn){
      var c = readConsent();
      if (c && c[category]) fn();
      else (waiters[category] || (waiters[category]=[])).push(fn);
    },
    openSettings: function(){ openCookieModal(); }
  };

  var bar, modal, overlay;
  function buildCookieUI(){
    bar = document.createElement('div');
    bar.className = 'cookie-bar';
    bar.innerHTML =
      '<div class="cookie-bar__title">🍪 Cookies</div>' +
      '<p>On utilise des cookies essentiels au fonctionnement du site, et — seulement avec ton accord — des cookies de mesure d\'audience et marketing. ' +
      '<a href="politique-de-confidentialite.html#cookies">En savoir plus</a></p>' +
      '<div class="cookie-bar__actions">' +
        '<button class="cookie-accept" type="button">Tout accepter</button>' +
        '<button class="cookie-reject" type="button">Refuser</button>' +
        '<button class="cookie-settings" type="button">Personnaliser</button>' +
      '</div>';
    document.body.appendChild(bar);

    overlay = document.createElement('div');
    overlay.className = 'cookie-modal-overlay';
    document.body.appendChild(overlay);

    modal = document.createElement('div');
    modal.className = 'cookie-modal';
    modal.innerHTML =
      '<h3>Gérer mes cookies</h3>' +
      '<div class="cookie-cat">' +
        '<div><b>Essentiels</b><p>Nécessaires au site (navigation, panier, sécurité). Toujours actifs.</p></div>' +
        '<button class="cookie-toggle on disabled" type="button" data-cat="necessary" disabled></button>' +
      '</div>' +
      '<div class="cookie-cat">' +
        '<div><b>Mesure d\'audience</b><p>Nous aide à comprendre comment le site est utilisé, de façon anonyme.</p></div>' +
        '<button class="cookie-toggle" type="button" data-cat="analytics"></button>' +
      '</div>' +
      '<div class="cookie-cat">' +
        '<div><b>Marketing</b><p>Personnalisation publicitaire (réseaux sociaux, Instagram…).</p></div>' +
        '<button class="cookie-toggle" type="button" data-cat="marketing"></button>' +
      '</div>' +
      '<button class="btn cookie-modal__save" type="button">Enregistrer mes choix</button>';
    document.body.appendChild(modal);

    bar.querySelector('.cookie-accept').addEventListener('click', function(){
      writeConsent({ necessary:true, analytics:true, marketing:true });
      hideBar();
    });
    bar.querySelector('.cookie-reject').addEventListener('click', function(){
      writeConsent({ necessary:true, analytics:false, marketing:false });
      hideBar();
    });
    bar.querySelector('.cookie-settings').addEventListener('click', openCookieModal);
    overlay.addEventListener('click', closeCookieModal);
    modal.querySelectorAll('.cookie-toggle:not(.disabled)').forEach(function(t){
      t.addEventListener('click', function(){ t.classList.toggle('on'); });
    });
    modal.querySelector('.cookie-modal__save').addEventListener('click', function(){
      var c = { necessary:true };
      modal.querySelectorAll('.cookie-toggle[data-cat]').forEach(function(t){
        c[t.dataset.cat] = t.classList.contains('on');
      });
      writeConsent(c);
      closeCookieModal();
      hideBar();
    });
  }
  function showBar(){ bar.classList.add('show'); }
  function hideBar(){ bar.classList.remove('show'); }
  function openCookieModal(){
    var c = readConsent() || { analytics:false, marketing:false };
    modal.querySelectorAll('.cookie-toggle[data-cat]').forEach(function(t){
      t.classList.toggle('on', !!c[t.dataset.cat]);
    });
    overlay.classList.add('open'); modal.classList.add('open');
  }
  function closeCookieModal(){ overlay.classList.remove('open'); modal.classList.remove('open'); }

  buildCookieUI();
  var existing = readConsent();
  if (existing) applyConsent(existing);
  else setTimeout(showBar, 900);

  /* ===================== KORVO — LE CORBEAU KEMETED ===================== */
  var ROOT = window.KEMETED_ROOT || './';

  var KB = [
    { match: ['bissap blanc','blanc'], reply: 'Le <b>Bissap Blanc</b> (4,50 €) est plus doux et solaire que le rouge — parfait, digeste, moins acidulé. <a href="' + ROOT + 'produit/blanc/">Voir la fiche produit →</a>' },
    { match: ['bissap','hibiscus'], reply: 'Le <b>Bissap</b> (4,50 €) c\'est notre classique — hibiscus rouge, acidulé et floral, riche en antioxydants et vitamine C. <a href="' + ROOT + 'produit/bissap/">Voir la fiche produit →</a>' },
    { match: ['ditakh'], reply: 'Le <b>Ditakh</b> (4,90 €) est le fruit vert et acidulé du Sahel — plein de fibres, un boost d\'immunité. <a href="' + ROOT + 'produit/ditakh/">Voir la fiche produit →</a>' },
    { match: ['bouye','baobab'], reply: 'Le <b>Bouye</b> (4,90 €) est la pulpe crémeuse du baobab — onctueux, 6× plus de calcium qu\'un jus classique. <a href="' + ROOT + 'produit/bouye/">Voir la fiche produit →</a>' },
    { match: ['coffret','decouverte','découverte'], reply: 'Le <b>Coffret découverte</b> réunit nos quatre jus en bouteilles de verre consignées — parfait pour trouver ta saveur. <a href="' + ROOT + 'index.html#produits">Voir le coffret →</a>' },
    { match: ['jus','saveur','produit','gamme','quoi vendez','vous vendez'], reply: 'On a quatre jus pressés à froid : <b>Bissap</b>, <b>Bissap Blanc</b>, <b>Ditakh</b> et <b>Bouye</b> — plus des douceurs sucrées (donuts, bonbons, pâtes de fruits) sur le même thème. <a href="' + ROOT + 'index.html#produits">Voir toute la boutique →</a>' },
    { match: ['prix','tarif','combien','cout','coût'], reply: 'Nos jus sont à 4,50 € (Bissap, Bissap Blanc) et 4,90 € (Ditakh, Bouye) — et il y a un tarif pro réduit pour les professionnels. <a href="' + ROOT + 'index.html#produits">Voir tous les prix →</a>' },
    { match: ['quantite','quantité','plusieurs bouteille','commander plusieurs','combien de bouteille'], reply: 'Tu peux ajuster la quantité de chaque jus directement dans ton panier (ou sur la fiche produit avec le sélecteur + / −), et mélanger les saveurs — tout se paie en une seule fois. <a href="' + ROOT + 'index.html#produits">Aller à la boutique →</a>' },
    { match: ['panier'], reply: 'Ton panier est toujours accessible via l\'icône 🛒 en haut à droite, ou juste ici : <a href="' + ROOT + 'panier.html">Voir mon panier →</a>' },
    { match: ['livraison','delai','délai','expedition','expédition'], reply: 'On expédie nos bouteilles en verre consigné avec le plus grand soin. Pour un délai précis selon ta ville, le plus sûr est de nous écrire directement : <a href="mailto:kemeted.association@gmail.com">kemeted.association@gmail.com</a>' },
    { match: ['professionnel','pro','b2b','revendeur','restaurant','entreprise','grossiste'], reply: 'On propose des tarifs professionnels pour les restaurants, épiceries et revendeurs (achat en volume). Crée un compte, puis clique sur « Demander le tarif pro » dans ton tableau de bord. <a href="' + ROOT + 'compte.html">Aller à mon compte →</a>' },
    { match: ['fidelite','fidélité','points','programme'], reply: 'Notre programme de points est actif : 1 point par euro dépensé quand tu commandes connecté·e à ton compte. <a href="' + ROOT + 'compte.html">Voir mes points →</a>' },
    { match: ['rembours','retour','retractation','rétractation','annuler','annulation'], reply: 'Toutes les infos sur les retours et remboursements sont ici : <a href="' + ROOT + 'politique-de-remboursement.html">Politique de remboursement →</a>' },
    { match: ['rgpd','donnees','données','vie privee','vie privée','confidentialite','confidentialité'], reply: 'On respecte le RGPD à la lettre. Détail de tes droits et de l\'usage de tes données : <a href="' + ROOT + 'politique-de-confidentialite.html">Politique de confidentialité →</a>' },
    { match: ['cookie'], reply: 'Tu peux gérer tes préférences de cookies à tout moment. <button type="button" class="crow-chip" id="crow-open-cookies" style="margin-top:6px">Ouvrir les réglages cookies</button>' },
    { match: ['instagram','insta','reseaux','réseaux','social','tiktok'], reply: 'Suis-nous sur Instagram pour les coulisses et les nouveautés : <a href="https://www.instagram.com/kemetedassociation/" target="_blank" rel="noopener">@kemetedassociation →</a>' },
    { match: ['sucre','calorie','allerg','bio','naturel'], reply: '100% naturel, 0 sucre ajouté — juste le fruit, pressé à froid, sans conservateur. Pour toute question allergène précise, écris-nous : <a href="mailto:kemeted.association@gmail.com">kemeted.association@gmail.com</a>' },
    { match: ['compte','connexion','inscription','connecter','inscrire'], reply: 'Tu peux créer un compte ou te connecter ici — ça débloque tes points fidélité et l\'historique de commandes. <a href="' + ROOT + 'compte.html">Mon compte →</a>' },
    { match: ['contact','ecrire','écrire','email','mail','humain','parler à quelqu\'un','service client'], reply: 'Tu peux nous écrire directement à <a href="mailto:kemeted.association@gmail.com">kemeted.association@gmail.com</a> — une vraie personne (pas un corbeau) te répondra ! 🙂' },
    { match: ['histoire','association','kemeted &','qui êtes vous','qui es tu','c\'est quoi kemeted'], reply: 'Kemeted Saveur est le pôle superfood de <b>Kemeted &amp; Association</b>, un collectif culturel qui valorise les patrimoines africains — museum, academy, impact, et le jus dans ta main. <a href="' + ROOT + 'index.html#histoire">Découvrir notre histoire →</a>' },
    { match: ['bonjour','salut','hello','coucou','hey'], reply: 'Croa ! Ravi de te voir par ici. Je peux te parler des jus, du panier, du RGPD, du B2B… ou juste papoter deux minutes. Qu\'est-ce qui t\'amène ?' },
    { match: ['ca va', 'ça va', 'comment vas tu', 'comment tu vas'], reply: 'Un corbeau perché sur un site de jus d\'hibiscus, ça ne peut qu\'aller bien 🐦 Et toi, je peux t\'aider sur quelque chose ?' },
    { match: ['blague','drole','drôle','fais moi rire'], reply: 'Pourquoi le bissap ne se dispute jamais ? Parce qu\'il reste toujours pressé de faire la paix. 🍷🐦 …Bon, je suis meilleur pour les jus que pour l\'humour.' },
    { match: ['merci'], reply: 'Avec plaisir ! Croa croa. 🐦' },
    { match: ['au revoir','bye','a plus','à plus','ciao'], reply: 'À bientôt ! Reviens quand tu veux, je ne bouge pas de ce coin de l\'écran. 🐦' },
    { match: ['qui es tu','tu es qui','t\'es qui','tu es quoi'], reply: 'Je suis Korvo, le corbeau messager de Kemeted — je garde un œil sur la boutique et je réponds à peu près à tout ce qui touche à Kemeted Saveur.' }
  ];
  var FALLBACK = 'Croa… je n\'ai pas de réponse toute prête pour ça, mais je fais de mon mieux. Choisis un sujet ci-dessous, ou écris directement à <a href="mailto:kemeted.association@gmail.com">kemeted.association@gmail.com</a> pour parler à l\'équipe.';
  var CHIPS = [
    { label: '🧃 Nos jus', q: 'Quels sont vos jus ?' },
    { label: '🛒 Mon panier', q: 'Voir mon panier' },
    { label: '🏢 Pro / B2B', q: 'Tarifs professionnels' },
    { label: '🎁 Points fidélité', q: 'Programme de points' },
    { label: '↩️ Remboursement', q: 'Politique de remboursement' },
    { label: '🔒 RGPD', q: 'Vie privée et RGPD' }
  ];

  function findReply(text){
    var t = text.toLowerCase();
    for (var i=0;i<KB.length;i++){
      for (var j=0;j<KB[i].match.length;j++){
        if (t.indexOf(KB[i].match[j]) !== -1) return KB[i].reply;
      }
    }
    return FALLBACK;
  }

  var launcher = document.createElement('button');
  launcher.className = 'crow-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Ouvrir le chat Korvo, le corbeau Kemeted');
  launcher.innerHTML = '🐦‍⬛<span class="crow-launcher__badge"></span>';
  document.body.appendChild(launcher);

  var chat = document.createElement('div');
  chat.className = 'crow-chat';
  chat.innerHTML =
    '<div class="crow-chat__head">' +
      '<div class="crow-chat__avatar">🐦‍⬛</div>' +
      '<div><div class="crow-chat__title">Korvo</div><div class="crow-chat__sub">Le messager de Kemeted</div></div>' +
      '<button class="crow-chat__close" type="button" aria-label="Fermer">✕</button>' +
    '</div>' +
    '<div class="crow-chat__body" id="crow-body"></div>' +
    '<div class="crow-chips" id="crow-chips"></div>' +
    '<form class="crow-input" id="crow-form">' +
      '<input type="text" id="crow-field" placeholder="Écris ta question…" autocomplete="off">' +
      '<button type="submit" aria-label="Envoyer">➤</button>' +
    '</form>';
  document.body.appendChild(chat);

  var body = chat.querySelector('#crow-body');
  var chipsWrap = chat.querySelector('#crow-chips');
  var form = chat.querySelector('#crow-form');
  var field = chat.querySelector('#crow-field');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var v = field.value.trim();
    if (!v) return;
    field.value = '';
    ask(v, true);
  });

  function addMsg(text, who){
    var m = document.createElement('div');
    m.className = 'crow-msg crow-msg--' + who;
    m.innerHTML = text;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    var cookieBtn = m.querySelector('#crow-open-cookies');
    if (cookieBtn) cookieBtn.addEventListener('click', openCookieModal);
    var cartBtn = m.querySelector('#crow-open-cart');
    if (cartBtn) cartBtn.addEventListener('click', function(){ window.kemetedCart && window.kemetedCart.open(); });
    return m;
  }
  function showTyping(){
    var typing = document.createElement('div');
    typing.className = 'crow-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
    return typing;
  }
  function botReply(text){
    var typing = showTyping();
    setTimeout(function(){
      typing.remove();
      addMsg(text, 'bot');
    }, 500 + Math.random()*400);
  }

  /* Free-text messages try Korvo's AI (Claude) first, with the local
     keyword answers as an instant, always-available fallback — chips
     stay purely local for zero-latency canned answers. */
  var chatHistory = [];
  function askAI(q){
    var typing = showTyping();
    window.kemetedAuth.client.functions.invoke('korvo-chat', { body: { message: q, history: chatHistory } })
      .then(function(res){
        typing.remove();
        if (res.error || !res.data || !res.data.reply) throw new Error('no AI reply');
        addMsg(res.data.reply, 'bot');
        chatHistory.push({ role: 'user', content: q }, { role: 'assistant', content: res.data.reply });
      })
      .catch(function(){
        typing.remove();
        addMsg(findReply(q), 'bot');
      });
  }
  function renderChips(){
    chipsWrap.innerHTML = '';
    CHIPS.forEach(function(c){
      var b = document.createElement('button');
      b.className = 'crow-chip'; b.type = 'button'; b.textContent = c.label;
      b.addEventListener('click', function(){ ask(c.q); });
      chipsWrap.appendChild(b);
    });
  }
  function ask(q, viaAI){
    addMsg(q, 'user');
    if (viaAI && window.kemetedAuth && window.kemetedAuth.client) askAI(q);
    else botReply(findReply(q));
  }

  var started = false;
  function openChat(){
    chat.classList.add('open');
    if (!started){
      started = true;
      botReply('Croa ! Je suis Korvo, le corbeau messager de Kemeted 🐦‍⬛<br>Je peux répondre à tes questions sur nos jus, la livraison, le RGPD ou nos tarifs pro. Que veux-tu savoir ?');
      renderChips();
    }
  }
  launcher.addEventListener('click', function(){
    chat.classList.contains('open') ? chat.classList.remove('open') : openChat();
  });
  chat.querySelector('.crow-chat__close').addEventListener('click', function(){ chat.classList.remove('open'); });

  /* ---- push announcement: Korvo flies in full-screen with the launch
     promo, and flies back off when dismissed ---- */
  var PUSH_KEY = 'kemeted_push_coffret_seen';
  function buildFullPush(){
    var push = document.createElement('div');
    push.className = 'crow-fullpush';
    push.innerHTML =
      '<div class="crow-fullpush__bird">🐦‍⬛</div>' +
      '<div class="crow-fullpush__card">' +
        '<button type="button" class="crow-fullpush__close" aria-label="Fermer">✕</button>' +
        '<div class="crow-fullpush__kicker">Korvo a un message</div>' +
        '<h3>Coffret Découverte<br>de lancement</h3>' +
        '<p>3 jus signature + 1 pass tombola 🎟️ — <b>10 €</b>, réservé aux <b>200 premiers clients</b>. Croa, ne traîne pas trop !</p>' +
        '<a class="btn crow-fullpush__cta" href="' + ROOT + 'produit/coffret/">Découvrir le coffret →</a>' +
        '<button type="button" class="crow-fullpush__later">Plus tard</button>' +
      '</div>';
    document.body.appendChild(push);

    var dismissed = false;
    function dismiss(){
      if (dismissed) return;
      dismissed = true;
      push.classList.add('flyout');
      try { localStorage.setItem(PUSH_KEY, '1'); } catch(e){}
      setTimeout(function(){
        push.classList.remove('show');
        push.remove();
      }, 900);
    }
    push.querySelector('.crow-fullpush__close').addEventListener('click', dismiss);
    push.querySelector('.crow-fullpush__later').addEventListener('click', dismiss);
    push.querySelector('.crow-fullpush__cta').addEventListener('click', dismiss);
    push.addEventListener('click', function(e){ if (e.target === push) dismiss(); });
    launcher.addEventListener('click', dismiss);

    var already = false;
    try { already = localStorage.getItem(PUSH_KEY) === '1'; } catch(e){}
    if (!already) {
      setTimeout(function(){
        if (!chat.classList.contains('open')) push.classList.add('show');
      }, 3500);
    } else {
      push.remove();
    }
  }
  buildFullPush();

})();
