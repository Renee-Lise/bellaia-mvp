const cfg = window.BELLA_CONFIG;
const productsEl = document.querySelector('#products');
const waBase = `https://wa.me/${cfg.whatsappNumber}`;

function whatsappLink(product) {
  const message = `Bonjour, je suis intéressée par le produit : ${product.title} (${product.price}). Pouvez-vous me renseigner ?`;
  return `${waBase}?text=${encodeURIComponent(message)}`;
}

function renderProducts() {
  productsEl.innerHTML = cfg.products.map((product, index) => `
    <article class="product-card ${index === 0 ? 'highlight' : ''}">
      <div class="product-top">
        <span class="product-tag">${product.tag}</span>
        <span class="product-price">${product.price}</span>
      </div>
      <h3>${product.title}</h3>
      <p class="product-subtitle">${product.subtitle}</p>
      <p>${product.description}</p>
      <ul>
        ${product.includes.map(item => `<li>${item}</li>`).join('')}
      </ul>
      <div class="product-actions">
        <a class="btn primary" href="${product.paymentLink}" target="_blank" rel="noopener">Acheter</a>
        <a class="btn ghost" href="${whatsappLink(product)}" target="_blank" rel="noopener">Question</a>
      </div>
    </article>
  `).join('');
}

function hydrateLinks() {
  const shopIds = ['navShop', 'heroKofi', 'featuredBuy', 'bundleBuy', 'footerKofi'];
  shopIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = cfg.kofiShopUrl;
  });
  const featured = cfg.products[0];
  const featuredWa = document.getElementById('featuredWhatsapp');
  const footerWa = document.getElementById('footerWhatsapp');
  if (featuredWa) featuredWa.href = whatsappLink(featured);
  if (footerWa) footerWa.href = `${waBase}?text=${encodeURIComponent('Bonjour, je souhaite avoir des informations sur vos kits numériques.')}`;
}

renderProducts();
hydrateLinks();
