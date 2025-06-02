const BACKEND_URL = "https://zone51-backend.onrender.com";

// ---------- DOMContentLoaded ----------
document.addEventListener("DOMContentLoaded", () => {
  fetchProductsAndRenderCategories();

  const backBtn = document.getElementById("back-to-store");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  const cartPage = document.getElementById("cart-container");
  if (cartPage) {
    // Use cached products if available, else fetch
    if (window.allProducts && window.allProducts.length) {
      showCart(window.allProducts);
    } else {
      fetch(`${BACKEND_URL}/api/products`)
        .then(res => res.json())
        .then(products => {
          window.allProducts = products;
          showCart(products);
        })
        .catch(err => {
          console.error("Failed to load products for cart:", err);
          cartPage.innerHTML = "<p>Could not load product data.</p>";
        });
    }

    document.getElementById("clear-cart-btn")?.addEventListener("click", () => {
      clearCart();
      showCart(window.allProducts);
    });

    document.getElementById("checkout-btn")?.addEventListener("click", checkout);
  }

  initTheme();
  handleCheckoutForm();
  renderSalesReport();
});

// ---------- Product Display ----------
async function fetchProductsAndRenderCategories() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/products`);
    const products = await res.json();
    window.allProducts = products;
    renderCategories(products);
  } catch (error) {
    console.error("Failed to load products:", error);
    const container = document.getElementById("product-container");
    if (container) container.innerHTML = "<p>Could not load product data.</p>";
  }
}

function renderCategories(products) {
  const container = document.getElementById("product-container");
  if (!container) return;
  container.innerHTML = "";

  const categories = [...new Set(products.map(p => p.category))];

  categories.forEach(category => {
    const btn = document.createElement("button");
    btn.className = "category-btn";
    btn.setAttribute("data-category", category);
    btn.setAttribute("aria-label", `Category: ${category}`);
    btn.innerHTML = `
      <img src="assets/${formatImageName(category)}.png"
           alt="${category}" 
           class="images"
           onerror="this.src='assets/default.png';" />
      <span>${category}</span>
    `;
    btn.addEventListener("click", () => {
      const filtered = products.filter(p => p.category === category);
      renderProducts(filtered);
    });

    container.appendChild(btn);
  });
}

function renderProducts(productList) {
  const container = document.getElementById("product-container");
  if (!container) return;
  container.innerHTML = "";

  productList.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <p><strong>R${product.price.toFixed(2)}</strong></p>
      <button class="add-btn">Add to Cart</button>
    `;

    card.querySelector("button").addEventListener("click", () => addToCart(product.id));
    container.appendChild(card);
  });
}

function formatImageName(category) {
  return category.toLowerCase().replace(/[\W_]+/g, '');
}

// ---------- Cart Management ----------
function addToCart(id) {
  const product = window.allProducts.find(p => p.id.toString() === id.toString());
  if (!product) {
    alert("Product not found");
    console.error("Add to cart failed: product not found", id);
    return;
  }

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existing = cart.find(item => item.id.toString() === id.toString());

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, quantity: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  alert(`${product.name} added to cart`);
}

function showCart(products) {
  const cartContainer = document.getElementById("cart-container");
  if (!cartContainer) return;

  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  cartContainer.innerHTML = cart.length === 0 ? "<p>Your cart is empty.</p>" : "";

  let subtotal = 0;

  cart.forEach(item => {
    const product = products.find(p => p.id.toString() === item.id.toString());
    if (!product) return; // Skip if product missing

    const itemSubtotal = product.price * item.quantity;
    subtotal += itemSubtotal;

    const itemDiv = document.createElement("div");
    itemDiv.className = "cart-item";
    itemDiv.innerHTML = `
      <div class="product-image"><img src="${product.image || 'assets/default.png'}" alt="${product.name}"></div>
      <div class="product-details">${product.name}</div>
      <div class="product-price">R${product.price.toFixed(2)}</div>
      <div class="product-quantity"></div>
      <div class="product-removal">
        <button class="remove-btn">Remove</button>
      </div>
      <div class="product-line-price">R${itemSubtotal.toFixed(2)}</div>
    `;

    // Quantity input
    const qtyDiv = itemDiv.querySelector(".product-quantity");
    const input = document.createElement("input");
    input.type = "number";
    input.min = 1;
    input.value = item.quantity;
    input.addEventListener("change", e => {
      const val = parseInt(e.target.value);
      if (isNaN(val) || val < 1) {
        e.target.value = item.quantity;
        return;
      }
      updateQuantity(item.id, val);
      showCart(products); // Re-render after update
    });
    qtyDiv.appendChild(input);

    // Remove button
    itemDiv.querySelector(".remove-btn").addEventListener("click", () => {
      removeItem(item.id);
      showCart(products); // Re-render after removal
    });

    cartContainer.appendChild(itemDiv);
  });

  const tax = subtotal * 0.15;
  const shipping = subtotal > 0 ? 50 : 0;
  const grandTotal = subtotal + tax + shipping;

  document.getElementById("cart-subtotal").textContent = `R${subtotal.toFixed(2)}`;
  document.getElementById("cart-tax").textContent = `R${tax.toFixed(2)}`;
  document.getElementById("cart-shipping").textContent = `R${shipping.toFixed(2)}`;
  document.getElementById("cart-total").textContent = `R${grandTotal.toFixed(2)}`;
}

function removeItem(id) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart = cart.filter(item => item.id.toString() !== id.toString());
  localStorage.setItem("cart", JSON.stringify(cart));
  console.log(`Removed item ${id} from cart`);
}

function updateQuantity(id, qty) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const item = cart.find(i => i.id.toString() === id.toString());
  if (item) {
    item.quantity = qty;
    localStorage.setItem("cart", JSON.stringify(cart));
    console.log(`Updated quantity for item ${id} to ${qty}`);
  }
}

function clearCart() {
  localStorage.removeItem("cart");
  console.log("Cart cleared");
}

// ---------- Checkout ----------
function checkout() {
  alert("Proceeding to checkout...");
  window.location.href = "checkout.html";
}

// ---------- Checkout Submission ----------
function handleCheckoutForm() {
  const form = document.getElementById("checkout-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

const cart = JSON.parse(localStorage.getItem("cart")) || [];

const formData = {
  name: form.name.value,
  email: form.email.value,
  address: form.address.value,
  items: cart, // <-- match backend
  timestamp: new Date().toISOString()
};

    fetch(`${BACKEND_URL}/api/sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to save sale");
        return res.json();
      })
      .then(() => {
        const history = JSON.parse(localStorage.getItem("salesHistory")) || [];
        history.push(formData);
        localStorage.setItem("salesHistory", JSON.stringify(history));
        localStorage.removeItem("cart");
        alert("Order placed successfully!");
        window.location.href = "index.html";
      })
      .then(async res => {
        if (!res.ok) {
          const errMsg = await res.text();
          throw new Error(errMsg);
        }
        return res.json();
      })
      .catch(err => {
        console.error("Checkout error:", err);
        alert("Something went wrong while processing your order.");
      });
  });
}

// ---------- Theme Toggle ----------
function initTheme() {
  const toggle = document.getElementById('theme-toggle');

  function applyTheme(theme) {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
    localStorage.setItem('theme', theme);
    if (toggle) toggle.checked = theme === 'dark';

    const videoLight = document.getElementById('bg-video-light');
    const videoDark = document.getElementById('bg-video-dark');

    if (videoLight && videoDark) {
      if (theme === 'dark') {
        videoLight.classList.add('hidden');
        videoDark.classList.remove('hidden');
      } else {
        videoDark.classList.add('hidden');
        videoLight.classList.remove('hidden');
      }
    }
  }

  // Apply saved theme or default to light
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  // Listen for toggle change
  if (toggle) {
    toggle.addEventListener('change', () => {
      applyTheme(toggle.checked ? 'dark' : 'light');
    });
  }
}

// ---------- Sales Report ----------
function renderSalesReport() {
  const sales = JSON.parse(localStorage.getItem("salesHistory")) || [];
  const reportContainer = document.getElementById("sales-report");
  if (!reportContainer) return;

  reportContainer.innerHTML = "";

  sales.forEach(sale => {
    const saleDiv = document.createElement("div");
    saleDiv.className = "sale-record";

    const date = new Date(sale.timestamp).toLocaleString();

    let itemsHTML = "<ul>";
    sale.cartItems.forEach(item => {
      itemsHTML += `<li>${item.name} - Qty: ${item.quantity} - R${(item.price * item.quantity).toFixed(2)}</li>`;
    });
    itemsHTML += "</ul>";

    saleDiv.innerHTML = `
      <h4>Order for ${sale.name} (${sale.email})</h4>
      <p>Address: ${sale.address}</p>
      <p>Date: ${date}</p>
      <p>Items: ${itemsHTML}</p>
      <hr>
    `;

    reportContainer.appendChild(saleDiv);
  });

  if (sales.length === 0) {
    reportContainer.innerHTML = "<p>No sales to report.</p>";
  }
}
