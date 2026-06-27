/* ═══════════════════════════════════════════════════════════
   SHOPX — app.js
   All application logic: state, routing, API, rendering
═══════════════════════════════════════════════════════════ */

// ── STATE ──────────────────────────────────────────────────────────────────────

let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';
let searchQuery = '';
let currentProduct = null;
let cart = JSON.parse(localStorage.getItem('shopx-cart') || '[]');
let toastTimer = null;

// ── ROUTING ────────────────────────────────────────────────────────────────────

function navigate(page, productId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'detail' && productId) loadDetail(productId);
  if (page === 'cart') renderCart();
}

// ── INIT / FETCH ALL PRODUCTS ──────────────────────────────────────────────────

async function init() {
  try {
    const res = await fetch('https://dummyjson.com/products?limit=194');
    const data = await res.json();
    allProducts = data.products;
    filteredProducts = [...allProducts];
    renderCategories();
    renderProducts(filteredProducts);
  } catch (err) {
    document.getElementById('product-grid').innerHTML = `
      <div class="col-span-5 text-center py-20 text-gray-500">
        Failed to load products. Please check your connection.
      </div>`;
  }
}

// ── CATEGORIES ─────────────────────────────────────────────────────────────────

function renderCategories() {
  const categories = ['all', ...new Set(allProducts.map(p => p.category))];
  const wrap = document.getElementById('category-filters');

  wrap.innerHTML = categories.map(cat => `
    <button
      onclick="selectCategory('${cat}')"
      class="filter-tab flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:border-violet-400 hover:text-violet-600 transition-all whitespace-nowrap ${cat === 'all' ? 'active' : ''}"
    >
      ${cat === 'all' ? 'All Products' : formatCategory(cat)}
    </button>
  `).join('');
}

function formatCategory(cat) {
  return cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function selectCategory(cat) {
  currentCategory = cat;

  document.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  applyFilters();
}

// ── SEARCH ─────────────────────────────────────────────────────────────────────

function handleNavSearch(value) {
  searchQuery = value.toLowerCase();
  const mobSearch = document.getElementById('mob-search');
  if (mobSearch) mobSearch.value = value;
  applyFilters();
}

function handleMobSearch(value) {
  searchQuery = value.toLowerCase();
  const navSearch = document.getElementById('nav-search');
  if (navSearch) navSearch.value = value;
  applyFilters();
}

// ── FILTERS + SORT ─────────────────────────────────────────────────────────────

function applyFilters() {
  let results = allProducts.filter(product => {
    const matchesCategory = currentCategory === 'all' || product.category === currentCategory;
    const matchesSearch = !searchQuery ||
      product.title.toLowerCase().includes(searchQuery) ||
      product.category.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const sortValue = document.getElementById('sort-select').value;

  if (sortValue === 'price-asc')  results.sort((a, b) => a.price - b.price);
  if (sortValue === 'price-desc') results.sort((a, b) => b.price - a.price);
  if (sortValue === 'rating')     results.sort((a, b) => b.rating - a.rating);
  if (sortValue === 'discount')   results.sort((a, b) => b.discountPercentage - a.discountPercentage);

  filteredProducts = results;
  renderProducts(filteredProducts);
}

function resetFilters() {
  currentCategory = 'all';
  searchQuery = '';

  const navSearch = document.getElementById('nav-search');
  const mobSearch = document.getElementById('mob-search');
  const sortSelect = document.getElementById('sort-select');

  if (navSearch) navSearch.value = '';
  if (mobSearch) mobSearch.value = '';
  if (sortSelect) sortSelect.value = 'default';

  document.querySelectorAll('.filter-tab').forEach((btn, i) => {
    i === 0 ? btn.classList.add('active') : btn.classList.remove('active');
  });

  filteredProducts = [...allProducts];
  renderProducts(filteredProducts);
}

// ── RENDER: PRODUCT GRID ───────────────────────────────────────────────────────

function renderProducts(products) {
  const grid = document.getElementById('product-grid');
  const emptyState = document.getElementById('empty-state');
  const countEl = document.getElementById('product-count');

  countEl.textContent = products.length;

  if (!products.length) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  grid.innerHTML = products.map(product => {
    const discountedPrice = (product.price * (1 - product.discountPercentage / 100)).toFixed(2);
    const stars = buildStarsHTML(product.rating, 'small');
    const isInCart = cart.some(c => c.id === product.id);

    return `
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden card-hover cursor-pointer"
           onclick="navigate('detail', ${product.id})">

        <!-- Image -->
        <div class="relative overflow-hidden bg-gray-50 h-44 flex items-center justify-center">
          <img
            src="${product.thumbnail}"
            alt="${product.title}"
            class="h-full w-full object-contain p-3 img-thumb"
            loading="lazy"
          />
          <div class="absolute top-2 right-2 badge bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
            ${Math.round(product.discountPercentage)}% off
          </div>
        </div>

        <!-- Info -->
        <div class="p-3">
          <div class="badge bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full mb-1.5 inline-block">
            ${formatCategory(product.category)}
          </div>

          <h3 class="text-sm font-medium text-gray-900 leading-snug mb-1.5 product-title-clamp">
            ${product.title}
          </h3>

          <div class="flex items-center gap-1 mb-2">
            ${stars}
            <span class="text-xs text-gray-400">${product.rating.toFixed(1)}</span>
          </div>

          <div class="flex items-baseline gap-1.5 mb-3">
            <span class="font-bold text-gray-900 text-sm">$${discountedPrice}</span>
            <span class="text-xs text-gray-400 line-through">$${product.price.toFixed(2)}</span>
          </div>

          <button
            onclick="event.stopPropagation(); addToCart(${product.id})"
            id="btn-${product.id}"
            class="w-full py-2 rounded-lg text-xs font-semibold transition-all btn-primary ${isInCart ? 'btn-in-cart' : 'btn-add-to-cart'}"
          >
            ${isInCart ? '✓ In Cart' : 'Add to Cart'}
          </button>
        </div>
      </div>`;
  }).join('');
}

// ── RENDER: STAR RATINGS ───────────────────────────────────────────────────────

function buildStarsHTML(rating, size = 'normal') {
  const sizeClass = size === 'small' ? 'w-3 h-3' : 'w-4 h-4';
  const starPath = 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z';

  return [1, 2, 3, 4, 5].map(i => {
    const filled = i <= Math.round(rating);
    return `
      <svg class="${sizeClass} ${filled ? 'text-amber-400' : 'text-gray-200'}"
           fill="${filled ? 'currentColor' : 'none'}"
           viewBox="0 0 24 24"
           stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="${starPath}"/>
      </svg>`;
  }).join('');
}

// ── FETCH + RENDER: PRODUCT DETAIL ────────────────────────────────────────────

async function loadDetail(id) {
  const skeleton = document.getElementById('detail-skeleton');
  const content = document.getElementById('detail-content');

  skeleton.style.display = 'grid';
  content.classList.add('hidden');

  try {
    const res = await fetch(`https://dummyjson.com/products/${id}`);
    currentProduct = await res.json();
    renderDetail(currentProduct);
  } catch (err) {
    skeleton.innerHTML = `
      <div class="col-span-2 text-center py-20 text-gray-500">
        Failed to load product.
      </div>`;
  }
}

function renderDetail(product) {
  const skeleton = document.getElementById('detail-skeleton');
  const content = document.getElementById('detail-content');

  skeleton.style.display = 'none';
  content.classList.remove('hidden');

  const discountedPrice = (product.price * (1 - product.discountPercentage / 100)).toFixed(2);

  // Main image
  document.getElementById('detail-main-img').src = product.images[0] || product.thumbnail;
  document.getElementById('detail-main-img').alt = product.title;

  // Badges
  document.getElementById('detail-category').textContent = formatCategory(product.category);
  document.getElementById('detail-brand').textContent = product.brand || 'Brand';

  // Title
  document.getElementById('detail-title').textContent = product.title;

  // Rating
  document.getElementById('detail-stars').innerHTML = buildStarsHTML(product.rating);
  document.getElementById('detail-rating-text').textContent =
    `${product.rating.toFixed(1)} · ${product.reviews?.length || 0} reviews`;

  // Price
  document.getElementById('detail-price').textContent = `$${discountedPrice}`;
  document.getElementById('detail-original').textContent = `$${product.price.toFixed(2)}`;
  document.getElementById('detail-discount').textContent = `${Math.round(product.discountPercentage)}% off`;

  // Stock
  const inStock = product.stock > 0;
  const stockDot = document.getElementById('detail-stock-dot');
  const stockText = document.getElementById('detail-stock-text');

  stockDot.className = `w-2 h-2 rounded-full ${inStock ? 'bg-green-500' : 'bg-red-500'}`;
  stockText.textContent = inStock ? `In stock (${product.stock} left)` : 'Out of stock';
  stockText.className = `text-sm ${inStock ? 'text-green-600' : 'text-red-500'}`;

  // Description
  document.getElementById('detail-desc').textContent = product.description;

  // Tags
  const tagsWrap = document.getElementById('detail-tags-wrap');
  tagsWrap.innerHTML = (product.tags || []).map(tag =>
    `<span class="badge bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">#${tag}</span>`
  ).join('');

  // Image Thumbnails
  const thumbsWrap = document.getElementById('detail-thumbs');
  const images = [product.thumbnail, ...(product.images || [])].filter(Boolean).slice(0, 6);

  thumbsWrap.innerHTML = images.map((img, index) => `
    <button
      onclick="setMainImage('${img}', this)"
      class="gallery-thumb w-16 h-16 flex-shrink-0 rounded-lg border-2 overflow-hidden
             ${index === 0 ? 'border-violet-500 active' : 'border-gray-200'}
             hover:border-violet-400 transition-colors"
    >
      <img src="${img}" alt="" class="w-full h-full object-contain p-1" />
    </button>
  `).join('');

  // Cart button state
  const isInCart = cart.some(c => c.id === product.id);
  const cartBtn = document.getElementById('detail-cart-btn');

  if (isInCart) {
    cartBtn.className = 'detail-btn-added';
    cartBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      Added to Cart`;
  } else {
    cartBtn.className = 'detail-btn-default btn-primary';
    cartBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
      </svg>
      Add to Cart`;
  }
}

function setMainImage(src, clickedBtn) {
  document.getElementById('detail-main-img').src = src;

  document.querySelectorAll('.gallery-thumb').forEach(btn => {
    btn.classList.remove('active', 'border-violet-500');
    btn.classList.add('border-gray-200');
  });

  clickedBtn.classList.add('active', 'border-violet-500');
  clickedBtn.classList.remove('border-gray-200');
}

function addToCartFromDetail() {
  if (!currentProduct) return;

  addToCart(currentProduct.id, currentProduct);

  const cartBtn = document.getElementById('detail-cart-btn');
  cartBtn.className = 'detail-btn-added';
  cartBtn.innerHTML = `
    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    </svg>
    Added to Cart`;
}

// ── CART: ADD ──────────────────────────────────────────────────────────────────

function addToCart(id, productData) {
  const product = productData || allProducts.find(p => p.id === id);
  if (!product) return;

  const existing = cart.find(c => c.id === id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      thumbnail: product.thumbnail,
      price: product.price,
      discountPercentage: product.discountPercentage,
      qty: 1
    });
  }

  saveCart();
  updateCartCount();
  showToast(`${product.title.slice(0, 28)}... added to cart!`);

  // Update the card button in the listing grid
  const listingBtn = document.getElementById(`btn-${id}`);
  if (listingBtn) {
    listingBtn.textContent = '✓ In Cart';
    listingBtn.className = 'w-full py-2 rounded-lg text-xs font-semibold transition-all btn-primary btn-in-cart';
  }
}

// ── CART: SAVE + COUNT ─────────────────────────────────────────────────────────

function saveCart() {
  localStorage.setItem('shopx-cart', JSON.stringify(cart));
}

function updateCartCount() {
  const total = cart.reduce((sum, item) => sum + item.qty, 0);
  const badge = document.getElementById('cart-count');

  if (total > 0) {
    badge.textContent = total > 99 ? '99+' : total;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// ── CART: QUANTITY CONTROLS ────────────────────────────────────────────────────

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    cart = cart.filter(c => c.id !== id);

    // Reset the listing button if visible
    const listingBtn = document.getElementById(`btn-${id}`);
    if (listingBtn) {
      listingBtn.textContent = 'Add to Cart';
      listingBtn.className = 'w-full py-2 rounded-lg text-xs font-semibold transition-all btn-primary btn-add-to-cart';
    }
  }

  saveCart();
  updateCartCount();
  renderCart();
}

function removeItem(id) {
  cart = cart.filter(c => c.id !== id);

  // Reset listing button if visible
  const listingBtn = document.getElementById(`btn-${id}`);
  if (listingBtn) {
    listingBtn.textContent = 'Add to Cart';
    listingBtn.className = 'w-full py-2 rounded-lg text-xs font-semibold transition-all btn-primary btn-add-to-cart';
  }

  saveCart();
  updateCartCount();
  renderCart();
}

// ── CART: RENDER ───────────────────────────────────────────────────────────────

function renderCart() {
  const emptyState = document.getElementById('cart-empty');
  const cartContent = document.getElementById('cart-content');
  const itemBadge = document.getElementById('cart-item-badge');
  const itemsList = document.getElementById('cart-items-list');

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  itemBadge.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;

  if (!cart.length) {
    emptyState.classList.remove('hidden');
    cartContent.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  cartContent.classList.remove('hidden');
  cartContent.style.display = 'grid';

  // Render each cart item
  itemsList.innerHTML = cart.map(item => {
    const discountedPrice = item.price * (1 - item.discountPercentage / 100);
    const lineTotal = (discountedPrice * item.qty).toFixed(2);

    return `
      <div class="bg-white rounded-xl border border-gray-100 p-4 flex gap-4 items-start">

        <!-- Thumbnail -->
        <div class="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
             onclick="navigate('detail', ${item.id})">
          <img src="${item.thumbnail}" alt="${item.title}" class="w-full h-full object-contain p-1" />
        </div>

        <!-- Details -->
        <div class="flex-1 min-w-0">
          <h3 class="font-medium text-gray-900 text-sm leading-snug mb-1 cursor-pointer hover:text-violet-600 transition-colors"
              onclick="navigate('detail', ${item.id})">
            ${item.title}
          </h3>

          <div class="flex items-center gap-2 mb-3">
            <span class="font-bold text-gray-900 text-sm">$${discountedPrice.toFixed(2)}</span>
            <span class="text-xs text-gray-400 line-through">$${item.price.toFixed(2)}</span>
            <span class="text-xs text-green-600">${Math.round(item.discountPercentage)}% off</span>
          </div>

          <div class="flex items-center justify-between">

            <!-- Qty Controls -->
            <div class="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
              <button onclick="changeQty(${item.id}, -1)"
                class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-600 font-semibold text-lg leading-none">
                −
              </button>
              <span class="w-6 text-center text-sm font-semibold">${item.qty}</span>
              <button onclick="changeQty(${item.id}, 1)"
                class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-600 font-semibold text-lg leading-none">
                +
              </button>
            </div>

            <!-- Line Total + Remove -->
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-violet-600">$${lineTotal}</span>
              <button onclick="removeItem(${item.id})" class="text-gray-300 hover:text-red-500 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>

          </div>
        </div>
      </div>`;
  }).join('');

  // Bill calculations
  const subtotal     = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmt  = cart.reduce((s, c) => s + (c.price * c.discountPercentage / 100) * c.qty, 0);
  const delivery     = subtotal > 50 ? 0 : 4.99;
  const grandTotal   = subtotal - discountAmt + delivery;

  document.getElementById('bill-count').textContent    = totalItems;
  document.getElementById('bill-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('bill-discount').textContent = `-$${discountAmt.toFixed(2)}`;
  document.getElementById('bill-delivery').textContent = delivery === 0 ? 'FREE' : `$${delivery.toFixed(2)}`;
  document.getElementById('bill-total').textContent    = `$${grandTotal.toFixed(2)}`;
  document.getElementById('savings-amount').textContent = `$${discountAmt.toFixed(2)}`;
}

// ── TOAST ──────────────────────────────────────────────────────────────────────

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = message;

  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── CHECKOUT ───────────────────────────────────────────────────────────────────

function checkout() {
  cart = [];
  saveCart();
  updateCartCount();
  showToast('🎉 Order placed successfully!');
  setTimeout(() => renderCart(), 300);
}

// ── BOOT ───────────────────────────────────────────────────────────────────────

updateCartCount();
init();