/* ============================================================
   KEMETED SAVEUR — panier (localStorage) + checkout Stripe dynamique
   ============================================================ */
(function () {
  'use strict';
  if (!window.KEMETED_PRODUCTS) { console.error('pop-products.js doit être chargé avant pop-cart.js'); return; }

  var STORE_KEY = 'kemeted_cart_v1';
  var ROOT = window.KEMETED_ROOT || './';

  function loadCart() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; } }
  function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (e) {} renderAll(); }
  var cart = loadCart();

  function findItem(id) { return cart.filter(function (i) { return i.id === id; })[0]; }
  function addToCart(id, qty) {
    if (!window.KEMETED_PRODUCTS[id]) return;
    qty = qty || 1;
    var item = findItem(id);
    if (item) item.qty += qty; else cart.push({ id: id, qty: qty });
    persist();
    openDrawer();
  }
  function setQty(id, qty) {
    var item = findItem(id);
    if (!item) return;
    item.qty = Math.max(1, Math.min(50, qty));
    persist();
  }
  function removeItem(id) { cart = cart.filter(function (i) { return i.id !== id; }); persist(); }
  function clearCart() { cart = []; persist(); }

  function currentTier(cb) {
    if (window.kemetedAuth) {
      window.kemetedAuth.getSession().then(function (session) {
        if (!session) return cb('b2c', null);
        window.kemetedAuth.getProfile(session.user.id).then(function (profile) {
          cb(profile ? profile.tier : 'b2c', session);
        });
      });
    } else cb('b2c', null);
  }
  function priceFor(id, tier) {
    var p = window.KEMETED_PRODUCTS[id];
    if (!p) return 0;
    return tier === 'b2b' ? p.priceB2B : p.price;
  }
  function euros(cents) { return (cents / 100).toFixed(2).replace('.', ',') + ' €'; }

  /* ---- UI: cart drawer, built once per page ---- */
  var overlay, drawer, badgeEls = [];
  function buildUI() {
    overlay = document.createElement('div');
    overlay.className = 'cart-overlay';
    document.body.appendChild(overlay);

    drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.innerHTML =
      '<div class="cart-drawer__head"><div class="cart-drawer__title">Mon panier</div><button class="cart-drawer__close" type="button" aria-label="Fermer">✕</button></div>' +
      '<div class="cart-drawer__items" id="cart-items"></div>' +
      '<div class="cart-drawer__foot">' +
        '<div class="cart-total"><span>Total</span><span id="cart-total-val">0,00 €</span></div>' +
        '<p class="cart-note">Frais de livraison calculés à l\'étape suivante.</p>' +
        '<a class="btn" style="width:100%;justify-content:center;margin-top:14px" href="' + ROOT + 'panier.html">Voir mon panier →</a>' +
        '<button class="btn btn--ghost" id="cart-checkout-btn" style="width:100%;justify-content:center;margin-top:10px" type="button">Passer commande</button>' +
      '</div>';
    document.body.appendChild(drawer);

    overlay.addEventListener('click', closeDrawer);
    drawer.querySelector('.cart-drawer__close').addEventListener('click', closeDrawer);
    drawer.querySelector('#cart-checkout-btn').addEventListener('click', checkout);

    document.querySelectorAll('[data-cart-trigger]').forEach(function (el) {
      var isRealLink = el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href') !== '#';
      if (!isRealLink) {
        el.addEventListener('click', function (e) { e.preventDefault(); openDrawer(); });
      }
      var badge = document.createElement('span');
      badge.className = 'cart-badge';
      el.appendChild(badge);
      badgeEls.push(badge);
    });
  }
  function openDrawer() { overlay.classList.add('open'); drawer.classList.add('open'); }
  function closeDrawer() { overlay.classList.remove('open'); drawer.classList.remove('open'); }

  function itemRowHtml(item, tier) {
    var p = window.KEMETED_PRODUCTS[item.id];
    if (!p) return '';
    var unit = priceFor(item.id, tier);
    return '<div class="cart-item" data-id="' + item.id + '">' +
      '<div class="cart-item__info">' +
        '<div class="cart-item__name">' + p.name + '</div>' +
        '<div class="cart-item__sub">' + euros(unit) + ' / unité</div>' +
        '<div class="cart-item__actions"><div class="cart-item__qty"><div class="cart-item__qty-row">' +
          '<button type="button" data-act="dec" aria-label="Retirer une unité">−</button>' +
          '<span class="cart-item__qty-val">' + item.qty + '</span>' +
          '<button type="button" data-act="inc" aria-label="Ajouter une unité">+</button>' +
        '</div></div></div>' +
      '</div>' +
      '<button class="cart-item__del" data-act="del" type="button" aria-label="Retirer du panier">🗑</button>' +
    '</div>';
  }

  function renderInto(container, tier) {
    if (!container) return;
    if (!cart.length) {
      container.innerHTML = '<div class="cart-empty">Ton panier est vide pour l\'instant.<br>Direction la boutique ? 🧃</div>';
      return;
    }
    container.innerHTML = cart.map(function (i) { return itemRowHtml(i, tier); }).join('');
    container.querySelectorAll('.cart-item').forEach(function (row) {
      var id = row.dataset.id;
      row.querySelector('[data-act="inc"]').addEventListener('click', function () {
        var it = findItem(id); if (it) setQty(id, it.qty + 1);
      });
      row.querySelector('[data-act="dec"]').addEventListener('click', function () {
        var it = findItem(id); if (it) setQty(id, it.qty - 1);
      });
      row.querySelector('[data-act="del"]').addEventListener('click', function () { removeItem(id); });
    });
  }

  function renderAll() {
    currentTier(function (tier) {
      var count = cart.reduce(function (s, i) { return s + i.qty; }, 0);
      badgeEls.forEach(function (b) { b.textContent = count; b.style.display = count > 0 ? 'grid' : 'none'; });

      renderInto(document.getElementById('cart-items'), tier);
      renderInto(document.getElementById('panier-items'), tier);

      var total = cart.reduce(function (s, i) { return s + priceFor(i.id, tier) * i.qty; }, 0);
      ['cart-total-val', 'panier-total-val'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.textContent = euros(total);
      });
    });
  }

  function checkout() {
    if (!cart.length) return;
    currentTier(function (tier, session) {
      var items = cart.map(function (i) { return { id: i.id, qty: i.qty }; });
      var successUrl = new URL(ROOT + 'panier.html?success=1', location.href).href;
      var cancelUrl = new URL(ROOT + 'panier.html?canceled=1', location.href).href;
      var payload = { items: items, success_url: successUrl, cancel_url: cancelUrl };
      if (session) { payload.client_reference_id = session.user.id; payload.email = session.user.email; }

      var btns = [document.getElementById('cart-checkout-btn'), document.getElementById('panier-checkout-btn')];
      btns.forEach(function (b) { if (b) { b.disabled = true; b.textContent = 'Redirection…'; } });

      window.kemetedAuth.client.functions.invoke('create-checkout-session', { body: payload })
        .then(function (res) {
          if (res.error || !res.data || !res.data.url) throw res.error || new Error('réponse invalide');
          location.href = res.data.url;
        })
        .catch(function (err) {
          console.error(err);
          alert('Une erreur est survenue au moment de payer — réessaie dans un instant.');
          btns.forEach(function (b) { if (b) { b.disabled = false; b.textContent = 'Passer commande'; } });
        });
    });
  }

  window.kemetedCart = {
    add: addToCart, remove: removeItem, setQty: setQty, clear: clearCart,
    get: function () { return cart.slice(); }, checkout: checkout, open: function () { openDrawer(); }
  };

  buildUI();
  if (new URLSearchParams(location.search).get('success') === '1') clearCart();
  else renderAll();

  document.querySelectorAll('.prod[data-pid] .add').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      addToCart(a.closest('.prod').dataset.pid, 1);
    });
  });
  document.querySelectorAll('.gour-add-btn[data-gour-pid]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      addToCart(btn.dataset.gourPid, 1);
    });
  });
})();
