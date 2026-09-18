// ONEWORLD clone — front-end SPA. All content is fetched from the API
// (backed by Supabase) and rendered client-side. No register/login on front-end.
(function () {
  'use strict';

  const state = { content: {}, banners: [], products: [], blog: [] };
  const NAV = [
    { href: '#/', label: 'Home' },
    { href: '#/products', label: 'Products' },
    { href: '#/about', label: 'About Us' },
    { href: '#/blog', label: 'News' },
    { href: '#/contact', label: 'Contact' },
  ];

  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const block = (k) => state.content[k] || { key: k, title: '', body: '', image_url: '', link_url: '' };
  const ph = (seed) => 'https://picsum.photos/seed/' + encodeURIComponent(seed) + '/600/400';

  async function api(url, opts) {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  async function loadAll() {
    const [content, banners, products, blog] = await Promise.all([
      api('/api/content').catch(() => []),
      api('/api/banners').catch(() => []),
      api('/api/products').catch(() => []),
      api('/api/blog').catch(() => []),
    ]);
    state.content = {};
    (content || []).forEach((b) => { state.content[b.key] = b; });
    state.banners = (banners || []).filter((b) => b.active !== false);
    state.products = products || [];
    state.blog = (blog || []).filter((b) => b.active !== false);
  }

  // ---------- shell ----------
  function topbarHtml() {
    const phb = block('header_phone'), emb = block('header_email');
    return `<div class="topbar"><div class="wrap">
      <div class="left">
        <span>📞 ${esc(phb.title || phb.body || '')}</span>
        <span>✉️ <a href="mailto:${esc(emb.title || '')}">${esc(emb.title || '')}</a></span>
      </div>
      <div class="right"><span>ONEWORLD Group — Global B2B Manufacturer</span></div>
    </div></div>`;
  }
  function headerHtml() {
    const name = block('site_name').title || 'ONEWORLD';
    const nav = NAV.map((n) => `<a href="${n.href}" data-href="${n.href}">${esc(n.label)}</a>`).join('');
    return `<header class="site"><div class="wrap">
      <a href="#/" class="logo">${esc(name)}<small>LABELS &amp; THERMAL MATERIALS</small></a>
      <button class="nav-toggle" id="navToggle" aria-label="menu">☰</button>
      <nav class="main" id="navMain">${nav}</nav>
    </div></header>`;
  }
  function footerHtml() {
    const about = block('footer_about');
    const copy = block('footer_copyright').title || '© 2026 ONEWORLD Group.';
    const addr = block('footer_address');
    const navlinks = NAV.map((n) => `<a href="${n.href}">${esc(n.label)}</a>`).join('');
    return `<footer class="site"><div class="wrap">
      <div class="col">
        <h4>${esc(block('site_name').title || 'ONEWORLD')}</h4>
        <p class="about-foot">${esc(about.body || about.title || '')}</p>
      </div>
      <div class="col">
        <h4>Quick Links</h4>
        ${navlinks}
      </div>
      <div class="col">
        <h4>Contact</h4>
        <div class="about-foot">
          📞 ${esc(block('header_phone').title || '')}<br>
          ✉️ ${esc(block('header_email').title || '')}<br>
          📍 ${esc(addr.title || addr.body || '')}
        </div>
      </div>
      <div class="bottom" style="grid-column:1/-1">${esc(copy)}</div>
    </div></footer>`;
  }

  // ---------- section builders ----------
  function heroHtml() {
    if (state.banners.length) {
      const slides = state.banners.map((b, i) => `
        <div class="slide ${i === 0 ? 'active' : ''}" data-i="${i}">
          <img src="${esc(b.image_url || ph(b.id))}" alt="${esc(b.title)}">
          <div class="cap"><h1>${esc(b.title)}</h1>
            ${b.link_url ? `<a class="btn" href="${esc(b.link_url)}">Learn more</a>` : ''}
          </div>
        </div>`).join('');
      const dots = state.banners.map((_, i) => `<button data-i="${i}" class="${i === 0 ? 'active' : ''}"></button>`).join('');
      return `<section class="section"><div class="hero">
        <div class="slides">${slides}</div>
        <div class="dots">${dots}</div>
      </div></section>`;
    }
    const h = block('hero_title');
    return `<section class="section"><div class="hero-fallback">
      <h1>${esc(h.title || 'ONEWORLD')}</h1>
      <p>${esc(h.body || '')}</p>
      ${h.link_url ? `<a class="btn" href="${esc(h.link_url)}">${esc(block('hero_cta').title || 'View Products')}</a>` : ''}
    </div></section>`;
  }
  function newsHtml() {
    const items = state.blog.slice(0, 4);
    if (!items.length) return '';
    const cards = items.map((p) => `
      <div class="card">
        <div class="thumb" style="background-image:url('${esc(p.cover_image || ph(p.slug))}')"></div>
        <div class="body">
          <div class="date">${esc((p.published_at || '').slice(0, 10))}</div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.excerpt || '')}</p>
          <a class="more" href="#/blog/${esc(p.slug)}">READ MORE →</a>
        </div>
      </div>`).join('');
    return `<section class="section soft"><div class="center">
      <h2>News &amp; Updates</h2>
      <p class="lead">Latest insights from our R&amp;D and manufacturing teams.</p>
      <div class="grid news">${cards}</div>
      <p style="margin-top:28px"><a class="btn ghost" href="#/blog">View All News</a></p>
    </div></section>`;
  }
  function productsGridHtml(limit) {
    const list = limit ? state.products.slice(0, limit) : state.products;
    if (!list.length) return '<p class="note">No products yet. Add some from the admin panel.</p>';
    const cards = list.map((p) => `
      <div class="card">
        <div class="thumb" style="background-image:url('${esc(p.image || ph(p.id))}')"></div>
        <div class="body">
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.desc || '')}</p>
        </div>
      </div>`).join('');
    return `<div class="grid products">${cards}</div>`;
  }
  function productsSectionHome() {
    return `<section class="section"><div>
      <h2>Our Products</h2>
      <p class="lead">${esc(block('hero_title').body || 'Empowering global businesses with stable supply chains and premium-grade coating technologies.')}</p>
      ${productsGridHtml(9)}
      <p style="margin-top:28px"><a class="btn ghost" href="#/products">VIEW ALL PRODUCTS</a></p>
    </div></section>`;
  }
  function aboutHtml() {
    const a = block('about_title');
    const s1 = block('about_stat1_num'), s2 = block('about_stat2_num'), s3 = block('about_stat3_num');
    return `<section class="section soft"><div class="about-grid">
      <div><img src="${esc(a.image_url || ph('about'))}" alt="About ONEWORLD"></div>
      <div>
        <h2>${esc(a.title || 'About Us')}</h2>
        <p class="lead">${esc(a.body || '')}</p>
        <div class="stats">
          <div class="stat"><div class="n">${esc(s1.num || s1.title || '20+')}</div><div class="l">${esc(s1.label || s1.body || 'Years of Experience')}</div></div>
          <div class="stat"><div class="n">${esc(s2.num || s2.title || '24h')}</div><div class="l">${esc(s2.label || s2.body || 'Quick Response')}</div></div>
          <div class="stat"><div class="n">${esc(s3.num || s3.title || '100%')}</div><div class="l">${esc(s3.label || s3.body || 'Scan-Safe Quality')}</div></div>
        </div>
        <p style="margin-top:22px"><a class="btn primary" href="#/about">View More</a></p>
      </div>
    </div></section>`;
  }
  function factoryHtml() {
    const f = block('factory_title');
    return `<section class="section"><div class="about-grid">
      <div><h2>${esc(f.title || 'Factory Introduction')}</h2><p class="lead">${esc(f.body || '')}</p></div>
      <div><img src="${esc(f.image_url || ph('factory'))}" alt="Factory"></div>
    </div></section>`;
  }

  // ---------- pages ----------
  function pageHome() {
    return topbarHtml() + headerHtml() + heroHtml() + newsHtml() + productsSectionHome() + aboutHtml() + factoryHtml() + contactHtml() + footerHtml();
  }
  function pageProducts() {
    return topbarHtml() + headerHtml() +
      `<section class="section"><div><h2>All Products</h2><p class="lead">Browse our full range of self-adhesive labels and thermal materials.</p>${productsGridHtml(0)}</div></section>` +
      footerHtml();
  }
  function pageAbout() {
    const a = block('about_title');
    const s1 = block('about_stat1_num'), s2 = block('about_stat2_num'), s3 = block('about_stat3_num');
    return topbarHtml() + headerHtml() +
      `<section class="section"><div class="about-grid">
        <div><img src="${esc(a.image_url || ph('about'))}" alt="About"></div>
        <div>
          <h2>${esc(a.title || 'About Us')}</h2>
          <p class="lead">${esc(a.body || '')}</p>
          <div class="stats">
            <div class="stat"><div class="n">${esc(s1.num || s1.title || '20+')}</div><div class="l">${esc(s1.label || s1.body || 'Years')}</div></div>
            <div class="stat"><div class="n">${esc(s2.num || s2.title || '24h')}</div><div class="l">${esc(s2.label || s2.body || 'Response')}</div></div>
            <div class="stat"><div class="n">${esc(s3.num || s3.title || '100%')}</div><div class="l">${esc(s3.label || s3.body || 'Quality')}</div></div>
          </div>
        </div>
      </div></section>` +
      factoryHtml() + footerHtml();
  }
  function pageBlog() {
    if (!state.blog.length) return topbarHtml() + headerHtml() + `<section class="section"><h2>News</h2><p class="note">No posts yet.</p></section>` + footerHtml();
    const cards = state.blog.map((p) => `
      <div class="card">
        <div class="thumb" style="background-image:url('${esc(p.cover_image || ph(p.slug))}')"></div>
        <div class="body">
          <div class="date">${esc((p.published_at || '').slice(0, 10))}</div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.excerpt || '')}</p>
          <a class="more" href="#/blog/${esc(p.slug)}">READ MORE →</a>
        </div>
      </div>`).join('');
    return topbarHtml() + headerHtml() +
      `<section class="section"><div class="center"><h2>News &amp; Updates</h2><div class="grid news">${cards}</div></div></section>` +
      footerHtml();
  }
  async function pageBlogDetail(slug) {
    let post;
    try { post = await api('/api/blog/' + encodeURIComponent(slug)); } catch { post = null; }
    if (!post) return topbarHtml() + headerHtml() + `<section class="section"><h2>Not found</h2><p class="note">This post does not exist.</p></section>` + footerHtml();
    return topbarHtml() + headerHtml() +
      `<section class="section"><div class="post-body">
        <a class="btn ghost" href="#/blog">← Back to News</a>
        <h1 style="margin-top:18px">${esc(post.title)}</h1>
        <div class="date">${esc((post.published_at || '').slice(0, 10))}</div>
        ${post.cover_image ? `<img src="${esc(post.cover_image)}" alt="">` : ''}
        <p>${esc(post.body || '')}</p>
      </div></section>` + footerHtml();
  }
  function contactHtml() {
    const c = block('contact_title');
    return `<section class="section" id="contact"><div class="center">
      <h2>${esc(c.title || 'Get In Touch')}</h2>
      <p class="lead">${esc(c.body || 'Request a quote or send us a message.')}</p>
      <div class="grid news" style="text-align:left;max-width:980px;margin:0 auto">
        <div class="form-card">
          <h3 style="margin-top:0">Request a Quote</h3>
          <form id="quoteForm">
            <div class="two-col">
              <div class="field"><label>Name *</label><input name="name" required></div>
              <div class="field"><label>Email *</label><input name="email" type="email" required></div>
              <div class="field"><label>Phone</label><input name="phone"></div>
              <div class="field"><label>Company</label><input name="company"></div>
              <div class="field"><label>Country</label><input name="country"></div>
              <div class="field"><label>Product / Interest</label><input name="product"></div>
            </div>
            <div class="field"><label>Message</label><textarea name="message"></textarea></div>
            <div class="field"><label>Budget</label><input name="budget" placeholder="e.g. USD 10,000"></div>
            <button class="btn" type="submit">Submit Quote</button>
            <div id="quoteMsg"></div>
          </form>
        </div>
        <div class="form-card">
          <h3 style="margin-top:0">Send a Message</h3>
          <form id="msgForm">
            <div class="two-col">
              <div class="field"><label>Name *</label><input name="name" required></div>
              <div class="field"><label>Email *</label><input name="email" type="email" required></div>
            </div>
            <div class="field"><label>Phone *</label><input name="phone" required></div>
            <div class="field"><label>Message *</label><textarea name="message" required></textarea></div>
            <button class="btn primary" type="submit">Send Message</button>
            <div id="msgMsg"></div>
          </form>
        </div>
      </div>
    </div></section>`;
  }

  // ---------- router ----------
  function setActiveNav() {
    const hash = location.hash || '#/';
    document.querySelectorAll('nav.main a').forEach((a) => {
      a.classList.toggle('active', a.getAttribute('data-href') === hash);
    });
  }
  async function render() {
    const app = document.getElementById('app');
    const hash = location.hash || '#/';
    let html;
    if (hash === '#/') html = pageHome();
    else if (hash === '#/products') html = pageProducts();
    else if (hash === '#/about') html = pageAbout();
    else if (hash === '#/blog') html = pageBlog();
    else if (hash.startsWith('#/blog/')) html = await pageBlogDetail(hash.slice(6));
    else if (hash === '#/contact') html = pageHome();
    else html = pageHome();
    app.innerHTML = html;
    setActiveNav();
    bindForms();
    bindHero();
    window.scrollTo(0, 0);
  }

  function bindHero() {
    const dots = document.querySelectorAll('.dots button');
    if (!dots.length) return;
    const slides = document.querySelectorAll('.slide');
    let cur = 0;
    dots.forEach((d) => d.addEventListener('click', () => {
      const i = Number(d.getAttribute('data-i'));
      slides[cur].classList.remove('active');
      dots[cur].classList.remove('active');
      cur = i;
      slides[cur].classList.add('active');
      dots[cur].classList.add('active');
    }));
  }

  function bindForms() {
    const qf = document.getElementById('quoteForm');
    if (qf) qf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(qf); const data = Object.fromEntries(fd.entries());
      const msg = document.getElementById('quoteMsg');
      try {
        const r = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const j = await r.json();
        if (j.ok) { msg.className = 'ok-msg'; msg.textContent = 'Thank you! Your quote request has been received.'; qf.reset(); }
        else { msg.className = 'err-msg'; msg.textContent = j.error || 'Submission failed.'; }
      } catch { msg.className = 'err-msg'; msg.textContent = 'Network error, please try again.'; }
    });
    const mf = document.getElementById('msgForm');
    if (mf) mf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(mf); const data = Object.fromEntries(fd.entries());
      const msg = document.getElementById('msgMsg');
      try {
        const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const j = await r.json();
        if (j.ok) { msg.className = 'ok-msg'; msg.textContent = 'Thank you! Your message has been sent.'; mf.reset(); }
        else { msg.className = 'err-msg'; msg.textContent = j.error || 'Submission failed.'; }
      } catch { msg.className = 'err-msg'; msg.textContent = 'Network error, please try again.'; }
    });
    const nt = document.getElementById('navToggle');
    if (nt) nt.addEventListener('click', () => document.getElementById('navMain').classList.toggle('open'));
  }

  // ---------- boot ----------
  (async function boot() {
    try { await loadAll(); } catch (e) { console.error(e); }
    window.addEventListener('hashchange', render);
    render();
  })();
})();
