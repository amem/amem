// Renders catalog.json into the website's static HTML at build time, so prices and
// product facts live in one place and the published page needs no client rendering.
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function games(catalog) {
  return catalog.products.map((p) => `
      <article class="cart" style="--c1:${esc(p.accent)};--c2:${esc(p.accent2)}">
        <div class="cart-shell">
          <div class="cart-label">
            <img src="img/${esc(p.id)}-card.png" alt="${esc(p.title)} gameplay screenshot" width="800" height="500" loading="lazy">
          </div>
          <div class="cart-body">
            <p class="cart-meta mono"><span>No. ${esc(p.number)}</span><span>${esc(p.genre)}</span></p>
            <h3>${esc(p.title)}</h3>
            <p class="cart-tag">${esc(p.tagline)}</p>
            <p class="cart-sum">${esc(p.summary)}</p>
            <p class="cart-controls mono">${esc(p.controls)}</p>
            <div class="cart-actions">
              <a class="btn btn-ink btn-sm" href="play/${esc(p.id)}/" target="_blank" rel="noopener">Play now</a>
              <a class="btn btn-ghost btn-sm" href="#shop">Source from $${p.price.standard}</a>
            </div>
          </div>
        </div>
      </article>`).join('');
}

function services(catalog) {
  const titleOf = (id) => catalog.products.find((p) => p.id === id)?.title || id;
  return catalog.services.map((s) => `
        <article class="offer">
          <p class="offer-price"><span class="mono">from</span><strong>$${s.from}</strong></p>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.summary)}</p>
          <ul class="ticks">${s.includes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          <p class="offer-meta mono">Delivery from ${s.days} day${s.days > 1 ? 's' : ''} · <a href="play/${esc(s.demo)}/" target="_blank" rel="noopener">See ${esc(titleOf(s.demo))}</a></p>
          <div class="offer-actions">
            <a class="btn btn-star btn-sm" data-link="fiverr" data-fallback="#contact" href="#contact">Order on Fiverr</a>
            <a class="btn btn-ghost btn-sm" data-link="upwork" data-fallback="#contact" href="#contact">Hire on Upwork</a>
          </div>
        </article>`).join('');
}

function shop(catalog) {
  const row = (id, title, detail, price, cls = '') => `
          <tr class="${cls}">
            <th scope="row"><span class="product"><strong>${esc(title)}</strong><span>${detail}</span></span></th>
            <td class="amount">$${price.standard}</td>
            <td class="amount">$${price.extended}</td>
            <td><div class="buy">
              <a class="btn btn-ink btn-sm" data-link="product:${esc(id)}:itch" href="#">itch.io</a>
              <a class="btn btn-ghost btn-sm" data-link="product:${esc(id)}:gumroad" href="#">Gumroad</a>
              <span class="soon" hidden>Coming soon</span>
            </div></td>
          </tr>`;
  const total = catalog.products.reduce((sum, p) => sum + p.price.standard, 0);
  const b = catalog.bundle;
  const save = Math.round((1 - b.price.standard / total) * 100);
  return catalog.products.map((p) => row(p.id, p.title, esc(p.genre), p.price)).join('') +
    row(b.id, b.title, `${esc(b.tagline)} <span class="save">save ${save}%</span>`, b.price, 'bundle');
}

export function renderSite(html, catalog) {
  return html
    .replace('<!-- build:games -->', games(catalog))
    .replace('<!-- build:services -->', services(catalog))
    .replace('<!-- build:shop -->', shop(catalog))
    .replaceAll('{{version}}', esc(catalog.version))
    .replaceAll('{{year}}', String(new Date().getFullYear()));
}
