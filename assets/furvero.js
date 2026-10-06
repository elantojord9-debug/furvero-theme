/* ============================================================
   FURVERO — storefront behavior
   Vanilla JS, no libraries.
   - Mobile nav toggle
   - Sticky mobile add-to-cart
   - Quantity selector
   - Real Shopify cart via /cart/add.js + /cart.js
   - Bundle options -> real variant IDs (from section settings)
   - Meta Pixel event hooks (fbq guarded; no-ops until Pixel ID set)
   ============================================================ */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Meta Pixel helper (fires only on real actions) ---------- */
  function track(name, params) {
    if (typeof window.fbq === 'function') {
      try { window.fbq('track', name, params || {}); } catch (e) { /* noop */ }
    }
  }

  /* ---------- Mobile nav ---------- */
  var burger = $('#fv-hamburger');
  var mobileNav = $('#fv-mobile-nav');
  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      mobileNav.classList.toggle('open', !open);
    });
    $$('a', mobileNav).forEach(function (a) {
      a.addEventListener('click', function () {
        burger.setAttribute('aria-expanded', 'false');
        mobileNav.classList.remove('open');
      });
    });
  }

  /* ---------- Cart drawer ---------- */
  var drawer = $('#fv-cart-drawer');
  var overlay = $('#fv-cart-overlay');
  var itemsEl = $('#fv-cart-items');
  var countEl = $('#fv-cart-count');
  var subtotalEl = $('#fv-cart-subtotal');

  function money(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function openCart() {
    document.body.classList.add('fv-cart-open');
    overlay.classList.add('fv-cart-overlay--open');
    drawer.classList.add('fv-cart-drawer--open');
    drawer.setAttribute('aria-hidden', 'false');
    renderCart();
  }
  function closeCart() {
    document.body.classList.remove('fv-cart-open');
    overlay.classList.remove('fv-cart-overlay--open');
    drawer.classList.remove('fv-cart-drawer--open');
    drawer.setAttribute('aria-hidden', 'true');
  }

  function renderCart() {
    fetch('/cart.js', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        var count = cart.item_count || 0;
        if (countEl) {
          countEl.textContent = count;
          countEl.hidden = count === 0;
        }
        if (!cart.items || cart.items.length === 0) {
          itemsEl.innerHTML = '<div class="fv-cart-empty"><p>Your cart is empty.</p><p>Less fur is one click away.</p></div>';
        } else {
          itemsEl.innerHTML = cart.items.map(function (it) {
            var img = it.image
              ? '<img src="' + it.image.replace(/(\.[a-z]+)(\?.*)?$/, '_160x160$1') + '" alt="" width="80" height="80" loading="lazy">'
              : '<span aria-hidden="true">FURVERO</span>';
            return (
              '<div class="fv-cart-item">' +
                '<div class="fv-cart-item__img" aria-hidden="true">' + img + '</div>' +
                '<div class="fv-cart-item__info">' +
                  '<div class="fv-cart-item__name">' + escapeHtml(it.product_title) + '</div>' +
                  '<div class="fv-cart-item__meta">' + (it.variant_title && it.variant_title !== 'Default Title' ? escapeHtml(it.variant_title) + ' · ' : '') + 'Qty ' + it.quantity + '</div>' +
                  '<div class="fv-cart-item__row">' +
                    '<span class="fv-cart-item__price">' + money(it.final_line_price) + '</span>' +
                    '<button class="fv-cart-remove" data-remove="' + it.key + '">Remove</button>' +
                  '</div>' +
                '</div>' +
              '</div>'
            );
          }).join('');
          $$('[data-remove]', itemsEl).forEach(function (btn) {
            btn.addEventListener('click', function () {
              changeItem(btn.getAttribute('data-remove'), 0);
            });
          });
        }
        if (subtotalEl) subtotalEl.textContent = money(cart.total_price || 0);
      })
      .catch(function () {
        itemsEl.innerHTML = '<div class="fv-cart-empty"><p>Could not load your cart. Please refresh.</p></div>';
      });
  }

  function changeItem(key, qty) {
    fetch('/cart/change.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    }).then(renderCart);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var openBtn = $('#fv-cart-open');
  if (openBtn) openBtn.addEventListener('click', openCart);
  var closeBtn = $('#fv-cart-close');
  if (closeBtn) closeBtn.addEventListener('click', closeCart);
  if (overlay) overlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCart();
  });

  /* ---------- Add to cart (real Shopify cart) ---------- */
  function addToCart(variantId, qty) {
    if (!variantId) return Promise.reject(new Error('missing-variant'));
    var body = new FormData();
    body.append('id', variantId);
    body.append('quantity', qty || 1);
    return fetch('/cart/add.js', { method: 'POST', credentials: 'same-origin', body: body })
      .then(function (r) {
        if (!r.ok) throw new Error('add-failed');
        return r.json();
      });
  }

  // Main purchase card
  $$('[data-fv-purchase]').forEach(function (card) {
    var qtyEl = $('[data-fv-qty]', card);
    var qty = 1;
    function setQty(n) {
      qty = Math.min(99, Math.max(1, n));
      qtyEl.textContent = qty;
    }
    var minus = $('[data-fv-qty-minus]', card);
    var plus = $('[data-fv-qty-plus]', card);
    if (minus) minus.addEventListener('click', function () { setQty(qty - 1); });
    if (plus) plus.addEventListener('click', function () { setQty(qty + 1); });

    var variantId = card.getAttribute('data-variant-id');
    var addBtn = $('[data-fv-add]', card);
    if (addBtn) addBtn.addEventListener('click', function () {
      addBtn.disabled = true;
      addToCart(variantId, qty).then(function (line) {
        track('AddToCart', { content_ids: [String(variantId)], content_type: 'product', value: (line.final_price * qty) / 100, currency: 'USD' });
        openCart();
      }).catch(function () {
        alert('Something went wrong adding to cart. Please try again.');
      }).then(function () { addBtn.disabled = false; });
    });

    var buyNow = $('[data-fv-buynow]', card);
    if (buyNow) buyNow.addEventListener('click', function () {
      buyNow.disabled = true;
      addToCart(variantId, qty).then(function () {
        track('InitiateCheckout', { currency: 'USD' });
        window.location.href = '/checkout';
      }).catch(function () {
        alert('Something went wrong. Please try again.');
        buyNow.disabled = false;
      });
    });
  });

  // Bundle options
  var bundleWrap = $('[data-fv-bundles]');
  if (bundleWrap) {
    var options = $$('.fv-bundle', bundleWrap);
    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        options.forEach(function (o) { o.classList.remove('fv-bundle--selected'); });
        opt.classList.add('fv-bundle--selected');
        var radio = $('input[type="radio"]', opt);
        if (radio) radio.checked = true;
      });
    });
    var bundleAdd = $('[data-fv-bundle-add]');
    if (bundleAdd) bundleAdd.addEventListener('click', function () {
      var selected = $('.fv-bundle--selected', bundleWrap) || options[0];
      var radio = $('input[type="radio"]', selected);
      var variantId = radio && radio.value ? radio.value.trim() : '';
      if (!variantId) {
        // Honest fallback: bundle variants not configured yet — do not fake a price.
        if (window.console) console.warn('[FURVERO] Bundle variant ID not configured. See PRODUCT-SETUP.md.');
        alert('Bundle options are being configured. Please use ADD TO CART above for now.');
        return;
      }
      bundleAdd.disabled = true;
      addToCart(variantId, 1).then(function (line) {
        track('AddToCart', { content_ids: [String(variantId)], content_type: 'product', value: line.final_price / 100, currency: 'USD' });
        openCart();
      }).catch(function () {
        alert('Something went wrong adding to cart. Please try again.');
      }).then(function () { bundleAdd.disabled = false; });
    });
  }

  // Checkout button in drawer
  var checkoutBtn = $('#fv-checkout-btn');
  if (checkoutBtn) checkoutBtn.addEventListener('click', function () {
    track('InitiateCheckout', { currency: 'USD' });
    window.location.href = '/checkout';
  });

  /* ---------- Sticky mobile add-to-cart ---------- */
  var sticky = $('#fv-sticky-atc');
  var buySection = $('#buy');
  if (sticky && buySection && 'IntersectionObserver' in window) {
    var pastHero = false;
    var buyVisible = false;
    function update() {
      var show = pastHero && !buyVisible && !document.body.classList.contains('fv-cart-open');
      sticky.classList.toggle('fv-sticky-atc--visible', show);
    }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target === buySection) buyVisible = en.isIntersecting;
        else pastHero = !en.isIntersecting && en.boundingClientRect.top < 0;
        update();
      });
    }, { threshold: 0 }).observe(buySection);
    var heroEl = $('.fv-hero');
    if (heroEl) {
      new IntersectionObserver(function (entries) {
        pastHero = !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0;
        update();
      }, { threshold: 0 }).observe(heroEl);
    }
    var stickyBtn = $('[data-fv-sticky-add]', sticky);
    if (stickyBtn) stickyBtn.addEventListener('click', function () {
      var card = $('[data-fv-purchase]');
      var variantId = card ? card.getAttribute('data-variant-id') : '';
      stickyBtn.disabled = true;
      addToCart(variantId, 1).then(function (line) {
        track('AddToCart', { content_ids: [String(variantId)], content_type: 'product', value: line.final_price / 100, currency: 'USD' });
        openCart();
      }).catch(function () {
        alert('Something went wrong adding to cart. Please try again.');
      }).then(function () { stickyBtn.disabled = false; });
    });
  }

  /* ---------- ViewContent (real product view) ---------- */
  (function () {
    var card = $('[data-fv-purchase]');
    if (!card || !('IntersectionObserver' in window)) return;
    var fired = false;
    new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting && !fired) {
        fired = true;
        track('ViewContent', { content_ids: [String(card.getAttribute('data-variant-id'))], content_type: 'product', currency: 'USD' });
        obs.disconnect();
      }
    }, { threshold: 0.4 }).observe(card);
  })();

  // Initial cart count
  renderCart();
})();
