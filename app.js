/* ============================================================
   OOP CLASSES
   ============================================================ */

// ── Abstraction + Encapsulation ──────────────────────────────
class MenuItem {
  #price;
  #name;
  #category;

  constructor(id, name, description, price, emoji, category) {
    this.id = id;
    this.#name = name;
    this.description = description;
    this.#price = price;
    this.emoji = emoji;
    this.#category = category;
  }

  getName()     { return this.#name; }
  getCategory() { return this.#category; }
  getPrice()    { return this.#price; }

  computePrice(qty = 1) {
    return this.#price * qty;
  }

  getDiscountLabel() { return null; }

  toCardHTML() {
    const discountLabel = this.getDiscountLabel();
    const mediaContent = foodImages[this.id] || defaultFoodSVG(this.emoji);

    return `
      <div class="menu-card" data-id="${this.id}">
        <div class="menu-card-img">
          ${mediaContent}
        </div>
        <div class="menu-card-body">
          <h3>${this.#name}</h3>
          <p class="menu-card-desc">${this.description}</p>
          <div class="menu-card-footer">
            <div>
              <span class="price">&#8369;${this.#price.toFixed(2)}</span>
              ${discountLabel ? `<span class="discount-badge">${discountLabel}</span>` : ''}
            </div>
            <button class="add-btn" onclick="event.stopPropagation(); order.addItem('${this.id}')">+</button>
          </div>
        </div>
      </div>`;
  }
}

// ── Inheritance: Drink extends MenuItem ──────────────────────
class Drink extends MenuItem {
  #isRefillable;

  constructor(id, name, description, price, emoji, isRefillable = false) {
    super(id, name, description, price, emoji, 'Drinks');
    this.#isRefillable = isRefillable;
  }

  getDiscountLabel() {
    return this.#isRefillable ? 'Free Refill' : null;
  }

  // Polymorphism: Drinks get a 5% discount when ordered 3+
  computePrice(qty = 1) {
    const base = super.computePrice(qty);
    return qty >= 3 ? base * 0.95 : base;
  }
}

// ── Inheritance: Meal extends MenuItem ───────────────────────
class Meal extends MenuItem {
  #isCombo;

  constructor(id, name, description, price, emoji, isCombo = false) {
    super(id, name, description, price, emoji, 'Meals');
    this.#isCombo = isCombo;
  }

  getDiscountLabel() {
    return this.#isCombo ? 'Combo Deal' : null;
  }

  // Polymorphism: Combo Meals get 10% off
  computePrice(qty = 1) {
    const base = super.computePrice(qty);
    return this.#isCombo ? base * 0.90 : base;
  }
}

// ── Inheritance: Dessert extends MenuItem ────────────────────
class Dessert extends MenuItem {
  constructor(id, name, description, price, emoji) {
    super(id, name, description, price, emoji, 'Desserts');
  }

  getDiscountLabel() { return null; }

  computePrice(qty = 1) {
    return super.computePrice(qty);
  }
}

// ── Order (Encapsulation of cart logic) ──────────────────────
class Order {
  #items  = {};
  #menuMap = {};

  constructor(menuItems) {
    menuItems.forEach(item => { this.#menuMap[item.id] = item; });
  }

  addItem(id) {
    if (this.#items[id]) {
      this.#items[id].qty++;
    } else {
      const m = this.#menuMap[id];
      if (!m) return;
      this.#items[id] = { item: m, qty: 1 };
    }
    this.#notify();
  }

  removeItem(id) {
    if (!this.#items[id]) return;
    this.#items[id].qty--;
    if (this.#items[id].qty <= 0) delete this.#items[id];
    this.#notify();
  }

  clear() {
    this.#items = {};
    this.#notify();
  }

  getEntries()   { return Object.values(this.#items); }
  getTotalQty()  { return this.getEntries().reduce((s, e) => s + e.qty, 0); }
  getSubtotal()  { return this.getEntries().reduce((s, e) => s + e.item.computePrice(e.qty), 0); }
  getTax()       { return this.getSubtotal() * 0.12; }
  getTotal()     { return this.getSubtotal() + this.getTax(); }
  isEmpty()      { return this.getEntries().length === 0; }
  getMenu()      { return this.#menuMap; }

  #notify() { renderCart(); }
}



/* ============================================================
   FOOD ILLUSTRATIONS (SVG fallbacks)
   ============================================================ */
function defaultFoodSVG(emoji) {
  return `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#1a1814"/>
    <text x="130" y="75" font-size="52" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`;
}

const foodImages = {
  m1: `<img src="images/crispy_lechon.png" alt="Crispy Pork Lechon" />`,
  m2: `<img src="images/beef_sinigang.png" alt="Beef Sinigang Combo" />`,
  m3: `<img src="images/chicken_inasal.png" alt="Chicken Inasal Plate" />`,
  m4: `<img src="images/seafood_karekare.png" alt="Seafood Kare-Kare" />`,
  m5: `<img src="images/pork_sisig.png" alt="Pork Sisig Bowl" />`,
  d1: `<img src="images/fresh_buko.png" alt="Fresh Buko Juice" />`,
  d2: `<img src="images/calamansi_soda.jpg" alt="Calamansi Soda" />`,
  d3: `<img src="images/sago_gulaman.jpg" alt="Sago't Gulaman" />`,
  d4: `<img src="images/mango_shake.jpg" alt="Mango Shake" />`,
  ds1: `<img src="images/halo_halo.jpg" alt="Halo-Halo Supreme" />`,
  ds2: `<img src="images/leche_flan.jpg" alt="Leche Flan" />`,
  ds3: `<img src="images/bibingka.jpg" alt="Bibingka" />`
};

/* ============================================================
   DATA
   ============================================================ */
const menuItems = [
  new Meal('m1',  'Crispy Pork Lechon',    'Slow-roasted pork belly, garlic rice & pickled vegetables', 185, '🍖', false),
  new Meal('m2',  'Beef Sinigang Combo',   'Tamarind broth, tender beef, veggies & steamed rice',       220, '🍲', true),
  new Meal('m3',  'Chicken Inasal Plate',  'Grilled marinated chicken with java rice & atchara',         155, '🍗', false),
  new Meal('m4',  'Seafood Kare-Kare',     'Rich peanut stew with mixed seafood & bagoong',              260, '🦐', true),
  new Meal('m5',  'Pork Sisig Bowl',       'Sizzling sisig, egg, calamansi & garlic rice',               165, '🥘', false),

  new Drink('d1', 'Fresh Buko Juice',      'Cold young coconut juice with chunks',                        75, '🥥', true),
  new Drink('d2', 'Calamansi Soda',        'Fresh calamansi squeezed over sparkling water',               65, '🍋', false),
  new Drink('d3', "Sago't Gulaman",        'Classic Filipino cold drink with syrup pearls',               55, '🧋', false),
  new Drink('d4', 'Mango Shake',           'Blended fresh ripe Philippine mangoes, milky',                95, '🥭', false),

  new Dessert('ds1', 'Halo-Halo Supreme',  'Shaved ice, leche flan, ube, sweetened beans & milk',        120, '🍧'),
  new Dessert('ds2', 'Leche Flan',         'Classic steamed egg custard with caramel syrup',              80,  '🍮'),
  new Dessert('ds3', 'Bibingka',           'Warm rice cake with butter, salted egg & coconut',            90,  '🎂'),
];

const order = new Order(menuItems);

/* ============================================================
   RENDER
   ============================================================ */
let activeCategory = 'All';

function renderMenu(filter = 'All') {
  const grid  = document.getElementById('menuGrid');
  const items = filter === 'All'
    ? menuItems
    : menuItems.filter(i => i.getCategory() === filter);
  grid.innerHTML = items.map(i => i.toCardHTML()).join('');
}

function renderTabs() {
  const categories = ['All', ...new Set(menuItems.map(i => i.getCategory()))];
  const tabs = document.getElementById('categoryTabs');
  tabs.innerHTML = categories.map(c =>
    `<button class="tab-btn ${c === activeCategory ? 'active' : ''}" onclick="setCategory('${c}')">${c}</button>`
  ).join('');
}

function setCategory(cat) {
  activeCategory = cat;
  renderTabs();
  renderMenu(cat);
}

function renderCart() {
  const entries     = order.getEntries();
  const qty         = order.getTotalQty();
  const badge       = document.getElementById('cartBadge');
  const subtitle    = document.getElementById('cartSubtitle');
  const checkoutBtn = document.getElementById('checkoutBtn');

  badge.textContent = qty;
  badge.classList.add('bump');
  setTimeout(() => badge.classList.remove('bump'), 200);

  subtitle.textContent = qty === 0 ? 'No items yet' : `${qty} item${qty !== 1 ? 's' : ''} in order`;
  checkoutBtn.disabled = order.isEmpty();

  const cartItems = document.getElementById('cartItems');

  if (order.isEmpty()) {
    cartItems.innerHTML = `<div class="cart-empty"><span class="big-emoji">🍽️</span><span>Your order is empty</span></div>`;
    document.getElementById('cartSummary').innerHTML = '';
    return;
  }

  cartItems.innerHTML = entries.map(e => `
    <div class="cart-item">
      <span class="cart-item-emoji">${e.item.emoji}</span>
      <div class="cart-item-info">
        <div class="cart-item-name">${e.item.getName()}</div>
        <div class="cart-item-price">₱${e.item.computePrice(e.qty).toFixed(2)}</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn minus" onclick="order.removeItem('${e.item.id}')">−</button>
        <span class="qty-display">${e.qty}</span>
        <button class="qty-btn" onclick="order.addItem('${e.item.id}')">+</button>
      </div>
    </div>
  `).join('');

  const sub   = order.getSubtotal();
  const tax   = order.getTax();
  const total = order.getTotal();

  document.getElementById('cartSummary').innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>₱${sub.toFixed(2)}</span></div>
    <div class="summary-row"><span>VAT (12%)</span><span>₱${tax.toFixed(2)}</span></div>
    <div class="summary-row total"><span>Total</span><span>₱${total.toFixed(2)}</span></div>
  `;
}

/* ============================================================
   CHECKOUT
   ============================================================ */
function checkout() {
  if (order.isEmpty()) return;

  const entries = order.getEntries();
  const orderId = 'ORD-' + Math.random().toString(36).substring(2, 7).toUpperCase();

  document.getElementById('orderId').textContent = `Order #${orderId} · ${new Date().toLocaleTimeString()}`;

  document.getElementById('receiptItems').innerHTML = entries.map(e => `
    <div class="receipt-row">
      <span>${e.item.emoji} ${e.item.getName()} × ${e.qty}</span>
      <span>₱${e.item.computePrice(e.qty).toFixed(2)}</span>
    </div>
  `).join('');

  const sub   = order.getSubtotal();
  const tax   = order.getTax();
  const total = order.getTotal();

  document.getElementById('receiptTotals').innerHTML = `
    <div class="receipt-row"><span>Subtotal</span><span>₱${sub.toFixed(2)}</span></div>
    <div class="receipt-row"><span>VAT (12%)</span><span>₱${tax.toFixed(2)}</span></div>
    <div class="receipt-row gold bold"><span>TOTAL</span><span>₱${total.toFixed(2)}</span></div>
  `;

  document.getElementById('receiptModal').classList.add('open');
}

function closeReceipt() {
  document.getElementById('receiptModal').classList.remove('open');
  order.clear();
  showToast('🙏 Thank you! Your order is being prepared.');
  if (window.innerWidth <= 768) closeMobileCart();
}

function clearCart() {
  if (order.isEmpty()) return;
  order.clear();
  showToast('Order cleared.');
}

/* ============================================================
   MOBILE CART
   ============================================================ */
function toggleMobileCart() {
  document.getElementById('cartPanel').classList.toggle('mobile-open');
}

function closeMobileCart() {
  document.getElementById('cartPanel').classList.remove('mobile-open');
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ============================================================
   INTRO SCREEN EXPERIENCE
   ============================================================ */
function initIntroScreen() {
  const introScreen = document.getElementById('introScreen');
  const startOrderBtn = document.getElementById('startOrderBtn');
  const progressBar = document.getElementById('introProgressBar');
  const loadingStatus = document.getElementById('introLoadingStatus');
  const loadingContainer = document.getElementById('introLoadingContainer');
  
  if (!introScreen) return;

  // Set initial scroll lock
  document.body.classList.add('intro-active');

  // Backdrop slideshow rotation logic
  const slides = document.querySelectorAll('.backdrop-slide');
  let currentSlide = 0;
  
  const slideInterval = setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  }, 1800);

  // Precision 5-second loading loop using high-fidelity elapsed time ticker
  const duration = 5000;
  const startTime = performance.now();
  
  const loadingMessages = [
    { threshold: 0.24, text: "Stoking the charcoal..." },
    { threshold: 0.50, text: "Simmering the tamarind broth..." },
    { threshold: 0.75, text: "Sizzling the pork sisig..." },
    { threshold: 0.94, text: "Chilling the fresh buko..." },
    { threshold: 1.00, text: "Ready for your presence..." }
  ];

  function updateLoader(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    if (progressBar) {
      progressBar.style.width = `${progress * 100}%`;
    }

    if (loadingStatus) {
      const activeMessage = loadingMessages.find(m => progress <= m.threshold);
      if (activeMessage && loadingStatus.textContent !== activeMessage.text) {
        loadingStatus.textContent = activeMessage.text;
      }
    }

    if (progress < 1) {
      requestAnimationFrame(updateLoader);
    } else {
      // Transition out the progress indicator, scale/pulse the order button
      setTimeout(() => {
        if (loadingContainer) {
          loadingContainer.classList.add('hide');
        }
        setTimeout(() => {
          if (startOrderBtn) {
            startOrderBtn.classList.add('show');
          }
        }, 450);
      }, 300);
    }
  }

  requestAnimationFrame(updateLoader);

  // Interactive exit trigger on button click
  if (startOrderBtn) {
    startOrderBtn.addEventListener('click', () => {
      clearInterval(slideInterval);

      // Trigger beautiful, premium leaving transition (blur + scale up + fade)
      introScreen.classList.add('leaving');
      document.body.classList.remove('intro-active');

      // Clear layout nodes after animation completes to clean up layout flow
      setTimeout(() => {
        introScreen.remove();
      }, 850);
    });
  }
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initIntroScreen();
  renderTabs();
  renderMenu();
  renderCart();
  
  // Close receipt modal on overlay click
  document.getElementById('receiptModal').addEventListener('click', e => {
    if (e.target === document.getElementById('receiptModal')) closeReceipt();
  });
});
