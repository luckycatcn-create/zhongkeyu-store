// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Featured products — loaded from the server (managed in /admin).
async function loadProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    if (!products.length) {
      grid.innerHTML = '<p class="muted">No products yet — add some in the admin panel (/admin).</p>';
      return;
    }
    grid.innerHTML = products.map((p) => `
      <article class="product-card">
        ${p.image ? `<img class="product-img" src="${p.image}" alt="${p.name}" />` : '<div class="product-emoji">📦</div>'}
        <h3>${p.name}</h3>
        <p>${p.desc || ''}</p>
        <div class="price">${p.price || ''}</div>
      </article>`).join('');
  } catch (e) {
    grid.innerHTML = '<p class="muted">Failed to load products.</p>';
  }
}
loadProducts();

// Contact form submission
const form = document.getElementById('contactForm');
const status = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.textContent = '';
  status.className = 'form-status';

  const data = Object.fromEntries(new FormData(form).entries());
  // Client-side required check
  const required = ['name', 'email', 'phone', 'message'];
  const missing = required.filter((k) => !(data[k] || '').trim());
  if (missing.length) {
    status.textContent = 'Please fill in all required fields.';
    status.className = 'form-status err';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const out = await res.json();
    if (res.ok && out.ok) {
      status.textContent = 'Thanks! Your message has been sent. We will reply within 24h.';
      status.className = 'form-status ok';
      form.reset();
    } else {
      status.textContent = out.error || 'Something went wrong. Please try again.';
      status.className = 'form-status err';
    }
  } catch (err) {
    status.textContent = 'Network error. Please try again.';
    status.className = 'form-status err';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Message';
  }
});
