(function(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  function money(cents){return new Intl.NumberFormat(document.documentElement.lang||'en-US',{style:'currency',currency:window.Shopify?.currency?.active||'USD'}).format(cents/100)}
  async function getCart(){const r=await fetch('/cart.js');return r.json()}
  function openCart(){document.querySelector('#furvero-cart')?.classList.add('active');document.body.style.overflow='hidden'}
  function closeCart(){document.querySelector('#furvero-cart')?.classList.remove('active');document.body.style.overflow=''}
  async function changeQty(key,qty){await fetch('/cart/change.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:key,quantity:Math.max(0,qty)})});refreshCart()}
  async function refreshCart(){const cart=await getCart();const box=$('#cart-items');if(!box)return;$('#cart-subtotal').textContent=money(cart.total_price);$$('[data-cart-count]').forEach(x=>x.textContent=cart.item_count);box.innerHTML='';if(!cart.items.length){box.innerHTML='<div class="empty-state"><p>Your cart is empty.</p><a class="btn btn-primary" href="/">Continue shopping</a></div>';return}cart.items.forEach(item=>{const row=document.createElement('div');row.className='cart-item';row.innerHTML=`<img src="${item.image||''}" alt="${item.title.replace(/"/g,'&quot;')}"><div><strong>${item.product_title}</strong><div class="muted">${item.variant_title&&item.variant_title!=='Default Title'?item.variant_title:''}</div><div class="qty-ctrl"><button type="button" class="qty-btn" data-dec="${item.key}" data-qty="${item.quantity}" aria-label="Decrease quantity">−</button><span aria-live="polite">${item.quantity}</span><button type="button" class="qty-btn" data-inc="${item.key}" data-qty="${item.quantity}" aria-label="Increase quantity">+</button></div><button class="icon-btn" data-remove="${item.key}" type="button">Remove</button></div><strong>${money(item.final_line_price)}</strong>`;box.appendChild(row)});$$('[data-remove]',box).forEach(b=>b.addEventListener('click',()=>changeQty(b.dataset.remove,0)));$$('[data-dec]',box).forEach(b=>b.addEventListener('click',()=>changeQty(b.dataset.dec,Number(b.dataset.qty)-1)));$$('[data-inc]',box).forEach(b=>b.addEventListener('click',()=>changeQty(b.dataset.inc,Number(b.dataset.qty)+1)))}
  async function addToCart(form){const fd=new FormData(form);const id=Number(fd.get('id'));const quantity=Number(fd.get('quantity')||1);const btn=form.querySelector('[type=submit]');if(!id)return;btn.disabled=true;btn.textContent='Adding…';try{const r=await fetch('/cart/add.js',{method:'POST',headers:{'Accept':'application/json'},body:new URLSearchParams({id,quantity})});if(!r.ok)throw new Error(await r.text());if(window.fbq)fbq('track','AddToCart',{content_ids:[String(id)],content_type:'product'});await refreshCart();openCart()}catch(e){alert('Sorry, we could not add this item. Please try again.')}finally{btn.disabled=false;btn.textContent=btn.dataset.original||'Add to cart'}}
  document.addEventListener('click',e=>{if(e.target.closest('[data-open-cart]')){e.preventDefault();refreshCart();openCart()}if(e.target.closest('[data-close-cart]')){e.preventDefault();closeCart()}if(e.target.classList.contains('drawer-overlay'))closeCart()});
  document.addEventListener('click',e=>{const a=e.target.closest('a[href="/checkout"]');if(!a||!window.fbq)return;const n=document.querySelector('[data-cart-count]');try{fbq('track','InitiateCheckout',{num_items:n?Number(n.textContent)||0:0,currency:(window.Shopify&&window.Shopify.currency&&window.Shopify.currency.active)||'USD'})}catch(_){}},true);
  $$('form.buy-form').forEach(f=>{const b=f.querySelector('[type=submit]');if(b)b.dataset.original=b.textContent;f.addEventListener('submit',e=>{e.preventDefault();addToCart(f)})});
  $$('.faq-q').forEach(b=>b.addEventListener('click',()=>b.closest('.faq-item').classList.toggle('open')));
  /* Product gallery: swap main image from thumbnails */
  $$('.gallery-thumb').forEach(t=>t.addEventListener('click',()=>{
    const main=t.closest('.product-media')?.querySelector('.gallery-main');
    if(!main)return;
    main.src=t.dataset.gallerySrc;
    if(t.dataset.galleryAlt)main.alt=t.dataset.galleryAlt;
    $$('.gallery-thumb').forEach(x=>x.classList.remove('is-active'));
    t.classList.add('is-active');
  }));
  /* Bundle cards: selected state + price sync (CSS :has covers modern browsers; this is the fallback) */
  $$('.bundle-cards').forEach(group=>{
    const cards=$$('.bundle-card',group);
    const priceEl=group.closest('.buy-box')?.querySelector('.price');
    function sync(){
      const checked=group.querySelector('.bundle-radio:checked');
      cards.forEach(c=>c.classList.toggle('is-selected',!!checked&&c.contains(checked)));
      if(checked&&priceEl){
        const p=checked.closest('.bundle-card')?.querySelector('.bundle-price');
        if(p)priceEl.textContent=p.textContent;
      }
    }
    group.addEventListener('change',sync);sync();
  });
  /* Mobile nav toggle */
  $$('[data-nav-toggle]').forEach(b=>b.addEventListener('click',()=>{
    const n=b.closest('.header-inner')?.querySelector('[data-nav]');
    if(!n)return;
    const open=n.classList.toggle('open');
    b.setAttribute('aria-expanded',String(open));
    b.setAttribute('aria-label',open?'Close menu':'Open menu');
  }));
  refreshCart();
})();
