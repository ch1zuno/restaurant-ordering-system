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
    const customImg = imageStore.get(this.id);
    const mediaContent = customImg
      ? `<img src="${customImg}" alt="${this.#name}" />`
      : (foodImages[this.id] || defaultFoodSVG(this.emoji));

    return `
      <div class="menu-card" data-id="${this.id}">
        <div class="menu-card-img" onclick="openImageModal('${this.id}', '${this.#name.replace(/'/g, "\\'")}')">
          ${mediaContent}
          <div class="img-overlay">
            <span class="img-overlay-icon">📷</span>
            <span class="img-overlay-label">Change Photo</span>
          </div>
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
   IMAGE STORE  (persists custom photos via localStorage)
   ============================================================ */
const IMAGE_STORE_KEY = 'laMesa_customImages';

const imageStore = {
  _data: (() => {
    try { return JSON.parse(localStorage.getItem(IMAGE_STORE_KEY)) || {}; }
    catch { return {}; }
  })(),

  get(id) { return this._data[id] || null; },

  set(id, dataURL) {
    this._data[id] = dataURL;
    this._save();
  },

  remove(id) {
    delete this._data[id];
    this._save();
  },

  _save() {
    try { localStorage.setItem(IMAGE_STORE_KEY, JSON.stringify(this._data)); }
    catch { showToast('⚠️ Storage full — image could not be saved.'); }
  }
};

/* ============================================================
   IMAGE UPLOAD MODAL
   ============================================================ */
let _modalItemId   = null;
let _pendingDataURL = null;

function openImageModal(itemId, itemName) {
  _modalItemId   = itemId;
  _pendingDataURL = null;

  document.getElementById('imageModalSub').textContent = `Uploading photo for: ${itemName}`;
  document.getElementById('imgSaveBtn').disabled = true;
  document.getElementById('imagePreview').src = '';

  const previewWrap   = document.getElementById('imagePreviewWrap');
  const dropPrompt    = document.getElementById('imageDropPrompt');
  const existingImage = imageStore.get(itemId);

  if (existingImage) {
    document.getElementById('imagePreview').src = existingImage;
    previewWrap.classList.add('visible');
    dropPrompt.style.display = 'none';
  } else {
    previewWrap.classList.remove('visible');
    dropPrompt.style.display = '';
  }

  // Reset file input so the same file can be re-selected
  const input = document.getElementById('imageFileInput');
  input.value = '';

  document.getElementById('imageModal').classList.add('open');
}

function closeImageModal() {
  document.getElementById('imageModal').classList.remove('open');
  _modalItemId    = null;
  _pendingDataURL = null;
}

function saveItemImage() {
  if (!_modalItemId || !_pendingDataURL) return;
  imageStore.set(_modalItemId, _pendingDataURL);
  closeImageModal();
  renderMenu(activeCategory);
  showToast('✅ Photo updated!');
}

function removeItemImage() {
  if (!_modalItemId) return;
  imageStore.remove(_modalItemId);
  closeImageModal();
  renderMenu(activeCategory);
  showToast('🗑️ Photo removed.');
}

// File input change handler
function handleImageFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Please select an image file.');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('⚠️ Image must be under 5 MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    _pendingDataURL = e.target.result;
    document.getElementById('imagePreview').src = _pendingDataURL;
    document.getElementById('imagePreviewWrap').classList.add('visible');
    document.getElementById('imageDropPrompt').style.display = 'none';
    document.getElementById('imgSaveBtn').disabled = false;
  };
  reader.readAsDataURL(file);
}

// Wire up file input + drag-and-drop after DOM loads
function initImageUpload() {
  const input    = document.getElementById('imageFileInput');
  const dropZone = document.getElementById('imageDropZone');

  input.addEventListener('change', () => handleImageFile(input.files[0]));

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handleImageFile(file);
    }
  });

  // Close modal on overlay click (not on the modal card itself)
  document.getElementById('imageModal').addEventListener('click', e => {
    if (e.target === document.getElementById('imageModal')) closeImageModal();
  });

  // Also close receipt modal on overlay click
  document.getElementById('receiptModal').addEventListener('click', e => {
    if (e.target === document.getElementById('receiptModal')) closeReceipt();
  });
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
  // m1 – Crispy Pork Lechon
  m1: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#1c150f"/>
    <ellipse cx="130" cy="100" rx="90" ry="18" fill="#2a2118"/>
    <ellipse cx="130" cy="97" rx="88" ry="16" fill="#332819"/>
    <ellipse cx="80" cy="90" rx="28" ry="14" fill="#e8dcc0"/>
    <ellipse cx="80" cy="84" rx="24" ry="11" fill="#f0e6ca"/>
    <rect x="100" y="72" width="70" height="28" rx="8" fill="#8B3A10"/>
    <rect x="103" y="74" width="64" height="6" rx="3" fill="#c46030"/>
    <rect x="103" y="82" width="64" height="5" rx="2" fill="#f5a060"/>
    <rect x="103" y="88" width="64" height="8" rx="3" fill="#7a2e08"/>
    <rect x="103" y="74" width="64" height="3" rx="2" fill="#e07840" opacity="0.7"/>
    <circle cx="175" cy="93" r="5" fill="#2d6a2d"/>
    <circle cx="168" cy="96" r="4" fill="#3a8a3a"/>
    <ellipse cx="145" cy="103" rx="30" ry="5" fill="#5c1a05" opacity="0.5"/>
    <path d="M115 68 Q118 58 115 48" stroke="#ffffff22" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M130 65 Q133 55 130 45" stroke="#ffffff22" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M145 68 Q148 58 145 48" stroke="#ffffff22" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`,

  // m2 – Beef Sinigang Combo
  m2: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#0e1510"/>
    <ellipse cx="130" cy="112" rx="75" ry="10" fill="#00000040"/>
    <path d="M55 75 Q55 115 130 115 Q205 115 205 75 Z" fill="#2a3520"/>
    <path d="M55 75 Q55 78 130 80 Q205 78 205 75 Z" fill="#3a4a2a"/>
    <path d="M60 78 Q60 112 130 112 Q200 112 200 78 Q165 85 130 85 Q95 85 60 78Z" fill="#8B4513" opacity="0.85"/>
    <path d="M60 78 Q60 81 130 83 Q200 81 200 78 Q165 81 130 82 Q95 81 60 78Z" fill="#a05a20" opacity="0.6"/>
    <rect x="90" y="82" width="22" height="14" rx="5" fill="#5a2010"/>
    <rect x="92" y="83" width="18" height="5" rx="2" fill="#8a3820"/>
    <rect x="148" y="85" width="18" height="12" rx="5" fill="#5a2010"/>
    <rect x="150" y="86" width="14" height="4" rx="2" fill="#8a3820"/>
    <ellipse cx="125" cy="84" rx="10" ry="6" fill="#2d7a2d"/>
    <ellipse cx="140" cy="87" rx="8" ry="5" fill="#4a9a30"/>
    <ellipse cx="110" cy="88" rx="7" ry="4" fill="#c87020"/>
    <path d="M100 72 Q103 60 100 50" stroke="#ffffff30" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M130 70 Q133 58 130 48" stroke="#ffffff30" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M160 72 Q163 60 160 50" stroke="#ffffff30" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="195" cy="100" rx="20" ry="10" fill="#2a2118"/>
    <ellipse cx="195" cy="96" rx="17" ry="8" fill="#f0e6ca"/>
  </svg>`,

  // m3 – Chicken Inasal
  m3: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#1a1208"/>
    <rect x="50" y="55" width="160" height="60" rx="8" fill="#2a1a08"/>
    <line x1="50" y1="65" x2="210" y2="65" stroke="#3a2808" stroke-width="3"/>
    <line x1="50" y1="78" x2="210" y2="78" stroke="#3a2808" stroke-width="3"/>
    <line x1="50" y1="91" x2="210" y2="91" stroke="#3a2808" stroke-width="3"/>
    <line x1="50" y1="104" x2="210" y2="104" stroke="#3a2808" stroke-width="3"/>
    <ellipse cx="130" cy="88" rx="45" ry="25" fill="#c06820"/>
    <ellipse cx="130" cy="85" rx="42" ry="22" fill="#d87828"/>
    <line x1="100" y1="75" x2="118" y2="95" stroke="#5a2808" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
    <line x1="120" y1="72" x2="138" y2="92" stroke="#5a2808" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
    <line x1="140" y1="75" x2="158" y2="95" stroke="#5a2808" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
    <ellipse cx="118" cy="79" rx="20" ry="8" fill="#f0a048" opacity="0.5"/>
    <rect x="165" y="80" width="8" height="30" rx="4" fill="#e0d0a0"/>
    <circle cx="169" cy="78" r="6" fill="#e8daa8"/>
    <circle cx="169" cy="112" r="6" fill="#e8daa8"/>
    <ellipse cx="75" cy="100" rx="25" ry="13" fill="#e8dcc0"/>
    <ellipse cx="75" cy="95" rx="22" ry="10" fill="#f5edd0"/>
    <ellipse cx="195" cy="95" rx="18" ry="10" fill="#f5c040" opacity="0.9"/>
    <ellipse cx="195" cy="92" rx="15" ry="8" fill="#f8d060"/>
  </svg>`,

  // m4 – Seafood Kare-Kare
  m4: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#1a1205"/>
    <ellipse cx="130" cy="108" rx="80" ry="12" fill="#00000030"/>
    <path d="M50 72 Q50 112 130 114 Q210 112 210 72 Z" fill="#3a2810"/>
    <path d="M50 72 Q50 76 130 78 Q210 76 210 72 Z" fill="#4a3818"/>
    <path d="M55 75 Q55 110 130 111 Q205 110 205 75 Q165 83 130 84 Q95 83 55 75Z" fill="#c88020"/>
    <path d="M90 80 Q95 70 105 72 Q110 75 108 82 Q103 88 95 86 Q88 83 90 80Z" fill="#e04830" opacity="0.9"/>
    <path d="M92 81 Q96 74 103 76" stroke="#f07050" stroke-width="1.5" fill="none"/>
    <path d="M150 78 Q155 68 165 70 Q170 73 168 80 Q163 86 155 84 Q148 81 150 78Z" fill="#e04830" opacity="0.9"/>
    <ellipse cx="125" cy="84" rx="14" ry="7" fill="#5a208a"/>
    <rect x="123" y="76" width="4" height="6" rx="2" fill="#2d6a10"/>
    <ellipse cx="145" cy="88" rx="12" ry="6" fill="#f5c040" opacity="0.8"/>
    <path d="M108 90 Q112 82 118 86 Q114 94 108 90Z" fill="#3a8a20"/>
    <path d="M170 88 Q174 80 180 84 Q176 92 170 88Z" fill="#3a8a20"/>
    <path d="M110 68 Q113 56 110 46" stroke="#ffffff25" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M150 66 Q153 54 150 44" stroke="#ffffff25" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`,

  // m5 – Pork Sisig Bowl
  m5: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#180e06"/>
    <rect x="195" y="88" width="30" height="8" rx="4" fill="#5a3a18"/>
    <ellipse cx="125" cy="95" rx="80" ry="22" fill="#3a2010"/>
    <ellipse cx="125" cy="92" rx="76" ry="20" fill="#4a2a14"/>
    <ellipse cx="125" cy="89" rx="62" ry="16" fill="#8B4010"/>
    <rect x="78" y="80" width="12" height="8" rx="3" fill="#a05020" opacity="0.9"/>
    <rect x="94" y="78" width="10" height="9" rx="3" fill="#7a3010" opacity="0.9"/>
    <rect x="108" y="79" width="13" height="8" rx="3" fill="#b06030" opacity="0.9"/>
    <rect x="125" y="77" width="11" height="10" rx="3" fill="#8a3818" opacity="0.9"/>
    <rect x="140" y="79" width="12" height="8" rx="3" fill="#a04820" opacity="0.9"/>
    <rect x="155" y="80" width="10" height="7" rx="3" fill="#7a3010" opacity="0.9"/>
    <ellipse cx="125" cy="82" rx="18" ry="12" fill="#f5e060" opacity="0.85"/>
    <ellipse cx="125" cy="82" rx="10" ry="7" fill="#f5a020"/>
    <circle cx="68" cy="88" r="8" fill="#c8e030"/>
    <circle cx="68" cy="88" r="5" fill="#e0f050"/>
    <line x1="68" y1="83" x2="68" y2="93" stroke="#a0b020" stroke-width="1"/>
    <line x1="63" y1="88" x2="73" y2="88" stroke="#a0b020" stroke-width="1"/>
    <path d="M95 73 Q97 63 94 55" stroke="#ffffff35" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M125 70 Q127 60 124 52" stroke="#ffffff35" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M155 73 Q157 63 154 55" stroke="#ffffff35" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`,

  // d1 – Fresh Buko Juice
  d1: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#081008"/>
    <ellipse cx="80" cy="70" rx="42" ry="48" fill="#3a5a18"/>
    <ellipse cx="80" cy="65" rx="38" ry="40" fill="#4a7a20"/>
    <ellipse cx="80" cy="58" rx="30" ry="28" fill="#f5f0e8"/>
    <ellipse cx="80" cy="55" rx="26" ry="22" fill="#f8f4ec"/>
    <ellipse cx="74" cy="50" rx="10" ry="8" fill="#fff" opacity="0.5"/>
    <path d="M108 40 Q120 20 135 35" stroke="#3a6a10" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M112 50 Q130 35 148 48" stroke="#4a8018" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M155 30 Q145 15 130 20" stroke="#2d5a10" stroke-width="2" fill="none" stroke-linecap="round"/>
    <rect x="148" y="25" width="7" height="90" rx="3.5" fill="#a0c850"/>
    <rect x="148" y="25" width="7" height="8" rx="3.5" fill="#c0e870"/>
    <path d="M165 38 L145 118 L215 118 L195 38 Z" fill="#c8f07030" stroke="#a0d04040" stroke-width="1.5"/>
    <path d="M168 65 L165 118 L213 118 L210 65 Z" fill="#d0e8a0" opacity="0.7"/>
    <ellipse cx="189" cy="65" rx="22" ry="7" fill="#e0f0b8" opacity="0.9"/>
    <ellipse cx="180" cy="62" rx="8" ry="4" fill="#f0ffd0" opacity="0.5"/>
    <rect x="153" y="75" width="10" height="10" rx="2" fill="#f5f0e8" opacity="0.7"/>
    <rect x="200" y="80" width="8" height="8" rx="2" fill="#f5f0e8" opacity="0.6"/>
  </svg>`,

  // d2 – Calamansi Soda
  d2: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#080c08"/>
    <path d="M90 25 L78 118 L182 118 L170 25 Z" fill="#c8f03020" stroke="#a0d02030" stroke-width="1.5"/>
    <path d="M93 58 L80 118 L180 118 L167 58 Z" fill="#d0f070" opacity="0.55"/>
    <ellipse cx="130" cy="58" rx="37" ry="9" fill="#e0f880" opacity="0.8"/>
    <ellipse cx="118" cy="55" rx="14" ry="5" fill="#f0ffa0" opacity="0.5"/>
    <circle cx="100" cy="75" r="4" fill="#f0ffd0" opacity="0.6"/>
    <circle cx="155" cy="80" r="3" fill="#f0ffd0" opacity="0.5"/>
    <circle cx="120" cy="90" r="3" fill="#f0ffd0" opacity="0.5"/>
    <circle cx="145" cy="68" r="3.5" fill="#f0ffd0" opacity="0.4"/>
    <circle cx="108" cy="100" r="3" fill="#f0ffd0" opacity="0.4"/>
    <circle cx="162" cy="95" r="2.5" fill="#f0ffd0" opacity="0.4"/>
    <rect x="95" y="62" width="20" height="20" rx="4" fill="#e8f8f8" opacity="0.5"/>
    <rect x="148" y="66" width="18" height="18" rx="4" fill="#e0f4f4" opacity="0.45"/>
    <circle cx="65" cy="75" r="22" fill="#f0d020"/>
    <circle cx="65" cy="75" r="17" fill="#f8e040"/>
    <ellipse cx="58" cy="68" rx="7" ry="5" fill="#fff8a0" opacity="0.5"/>
    <line x1="65" y1="57" x2="65" y2="93" stroke="#c8a010" stroke-width="1.5"/>
    <line x1="47" y1="75" x2="83" y2="75" stroke="#c8a010" stroke-width="1.5"/>
    <rect x="148" y="12" width="6" height="60" rx="3" fill="#80c820"/>
    <rect x="148" y="12" width="6" height="7" rx="3" fill="#a0e840"/>
  </svg>`,

  // d3 – Sago't Gulaman
  d3: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#0a0810"/>
    <rect x="90" y="22" width="80" height="98" rx="10" fill="#30204820" stroke="#60408040" stroke-width="1.5"/>
    <rect x="92" y="52" width="76" height="66" rx="0 0 9 9" fill="#4a2808" opacity="0.85"/>
    <rect x="92" y="52" width="76" height="12" rx="0" fill="#6a3810" opacity="0.7"/>
    <circle cx="110" cy="95" r="5" fill="#1a0a05" opacity="0.9"/>
    <circle cx="125" cy="100" r="5" fill="#1a0a05" opacity="0.9"/>
    <circle cx="140" cy="93" r="5" fill="#1a0a05" opacity="0.9"/>
    <circle cx="118" cy="108" r="5" fill="#1a0a05" opacity="0.9"/>
    <circle cx="148" cy="105" r="5" fill="#1a0a05" opacity="0.9"/>
    <circle cx="102" cy="106" r="4" fill="#1a0a05" opacity="0.9"/>
    <circle cx="158" cy="98" r="4" fill="#1a0a05" opacity="0.9"/>
    <rect x="108" y="70" width="12" height="12" rx="2" fill="#101828" opacity="0.9"/>
    <rect x="138" y="74" width="11" height="11" rx="2" fill="#101828" opacity="0.9"/>
    <rect x="122" y="78" width="10" height="10" rx="2" fill="#101828" opacity="0.9"/>
    <rect x="95" y="55" width="22" height="22" rx="4" fill="#e0f0ff" opacity="0.5"/>
    <rect x="143" y="57" width="20" height="20" rx="4" fill="#d8ecff" opacity="0.5"/>
    <rect x="152" y="10" width="6" height="85" rx="3" fill="#e05050"/>
    <rect x="152" y="10" width="6" height="8" rx="3" fill="#f07070"/>
  </svg>`,

  // d4 – Mango Shake
  d4: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#100a00"/>
    <ellipse cx="55" cy="85" rx="35" ry="28" fill="#e8800820"/>
    <ellipse cx="55" cy="82" rx="30" ry="22" fill="#f0900820"/>
    <path d="M30 82 Q55 60 80 82 Q55 95 30 82Z" fill="#f8b020"/>
    <path d="M95 30 L80 118 L180 118 L165 30 Z" fill="#ffe06030" stroke="#f0a03040" stroke-width="1.5"/>
    <path d="M83 75 L80 118 L180 118 L177 75 Z" fill="#f0a020" opacity="0.8"/>
    <ellipse cx="130" cy="75" rx="47" ry="10" fill="#f8d060" opacity="0.9"/>
    <ellipse cx="115" cy="73" rx="15" ry="6" fill="#fff5c0" opacity="0.6"/>
    <ellipse cx="145" cy="72" rx="12" ry="5" fill="#fff5c0" opacity="0.5"/>
    <rect x="148" y="15" width="6" height="80" rx="3" fill="#f0e020"/>
    <rect x="115" y="60" width="18" height="12" rx="4" fill="#f09010"/>
    <rect x="117" y="61" width="14" height="5" rx="2" fill="#f8b030"/>
    <path d="M52 58 Q60 42 70 50" stroke="#2d7a10" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M46 62 Q38 45 50 48" stroke="#3a9018" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`,

  // ds1 – Halo-Halo Supreme
  ds1: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#0d0810"/>
    <path d="M90 20 L75 118 L185 118 L170 20 Z" fill="#e0d0f030" stroke="#c0a0e040" stroke-width="1.5"/>
    <ellipse cx="130" cy="30" rx="32" ry="22" fill="#6a20a0"/>
    <ellipse cx="122" cy="25" rx="12" ry="8" fill="#8030c0" opacity="0.7"/>
    <path d="M82 62 L80 118 L180 118 L178 62 Z" fill="#d0e8f8" opacity="0.7"/>
    <path d="M82 62 L84 75 L176 75 L178 62 Z" fill="#f0c8e0" opacity="0.8"/>
    <rect x="105" y="80" width="30" height="16" rx="5" fill="#e8b030"/>
    <rect x="107" y="81" width="26" height="7" rx="3" fill="#f0c848"/>
    <ellipse cx="100" cy="95" rx="6" ry="4" fill="#8a2020"/>
    <ellipse cx="155" cy="92" rx="6" ry="4" fill="#8a2020"/>
    <ellipse cx="128" cy="100" rx="6" ry="4" fill="#8a2020"/>
    <rect x="85" y="90" width="10" height="10" rx="2" fill="#10205a" opacity="0.8"/>
    <rect x="163" y="88" width="10" height="10" rx="2" fill="#10205a" opacity="0.8"/>
    <path d="M108 68 Q120 72 132 68 Q140 72 148 68" stroke="#c07820" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <rect x="155" y="55" width="8" height="30" rx="3" fill="#f5f0e830"/>
  </svg>`,

  // ds2 – Leche Flan
  ds2: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#120e04"/>
    <ellipse cx="130" cy="105" rx="90" ry="14" fill="#1e1608"/>
    <ellipse cx="130" cy="102" rx="85" ry="12" fill="#2a1e0a"/>
    <path d="M55 65 Q55 105 130 108 Q205 105 205 65 Q175 72 130 74 Q85 72 55 65Z" fill="#e8a820"/>
    <ellipse cx="130" cy="65" rx="75" ry="20" fill="#f5c040"/>
    <ellipse cx="118" cy="60" rx="30" ry="10" fill="#f8d060" opacity="0.6"/>
    <ellipse cx="130" cy="65" rx="70" ry="17" fill="#c07010" opacity="0.35"/>
    <path d="M65 75 Q62 90 65 102" stroke="#b06010" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
    <path d="M195 75 Q198 90 195 102" stroke="#b06010" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
    <path d="M100 72 Q98 88 100 100" stroke="#b06010" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>
    <path d="M160 72 Q162 88 160 100" stroke="#b06010" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>
    <ellipse cx="105" cy="58" rx="20" ry="7" fill="#fde080" opacity="0.5"/>
    <rect x="208" y="60" width="4" height="45" rx="2" fill="#888"/>
    <rect x="206" y="60" width="2" height="15" rx="1" fill="#888"/>
    <rect x="210" y="60" width="2" height="15" rx="1" fill="#888"/>
    <rect x="214" y="60" width="2" height="15" rx="1" fill="#888"/>
  </svg>`,

  // ds3 – Bibingka
  ds3: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="130" fill="#100a04"/>
    <ellipse cx="130" cy="108" rx="95" ry="15" fill="#1a3010" opacity="0.9"/>
    <ellipse cx="130" cy="105" rx="90" ry="13" fill="#254018"/>
    <ellipse cx="130" cy="80" rx="80" ry="30" fill="#c88030"/>
    <ellipse cx="130" cy="75" rx="76" ry="26" fill="#e8a848"/>
    <ellipse cx="130" cy="72" rx="70" ry="22" fill="#f0b840"/>
    <ellipse cx="95" cy="68" rx="14" ry="8" fill="#8a4010" opacity="0.5"/>
    <ellipse cx="158" cy="70" rx="12" ry="7" fill="#8a4010" opacity="0.4"/>
    <ellipse cx="130" cy="65" rx="18" ry="9" fill="#7a3808" opacity="0.35"/>
    <circle cx="110" cy="70" r="12" fill="#f5e080" opacity="0.9"/>
    <circle cx="110" cy="70" r="7" fill="#f0a820"/>
    <circle cx="155" cy="72" r="10" fill="#f5e080" opacity="0.9"/>
    <circle cx="155" cy="72" r="6" fill="#f0a820"/>
    <rect x="118" y="62" width="25" height="6" rx="3" fill="#f5e0a0" opacity="0.85"/>
    <ellipse cx="125" cy="66" rx="20" ry="6" fill="#ffe060" opacity="0.35"/>
    <path d="M100 55 Q103 43 100 33" stroke="#ffffff20" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M130 52 Q133 40 130 30" stroke="#ffffff20" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M160 55 Q163 43 160 33" stroke="#ffffff20" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`,
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
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  renderTabs();
  renderMenu();
  renderCart();
  initImageUpload();
});
