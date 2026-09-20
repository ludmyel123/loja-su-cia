/**
 * Carrinho (drawer) — usa a Ajax Cart API real do Shopify (/cart/add.js, /cart/change.js)
 * e a Section Rendering API (?sections=cart-drawer) para manter o HTML do carrinho
 * sempre sincronizado com o estado real do carrinho, sem recarregar a página.
 */
(function () {
  "use strict";

  var drawer = document.getElementById("CartDrawer");
  var backdrop = document.getElementById("CartDrawerBackdrop");
  var cartToggle = document.getElementById("cartToggle");
  var cartCountEl = document.getElementById("CartCount");

  if (!drawer) return; // carrinho lateral desativado nas definições do tema

  function openDrawer() {
    drawer.classList.add("is-open");
    backdrop.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function refreshCartCount(count) {
    if (!cartCountEl) return;
    cartCountEl.textContent = count;
    cartCountEl.hidden = count === 0;
  }

  function renderSectionsResponse(sections) {
    var html = sections["cart-drawer"];
    if (!html) return;
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, "text/html");
    var freshDrawer = doc.getElementById("CartDrawer");
    if (freshDrawer) {
      drawer.innerHTML = freshDrawer.innerHTML;
    }
    bindDrawerEvents();
  }

  function fetchCartSections() {
    return fetch("/cart?sections=cart-drawer")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        renderSectionsResponse(data);
      });
  }

  function addToCart(variantId, quantity, button) {
    if (!variantId) return Promise.reject(new Error("Ingen variant vald"));
    if (button) button.classList.add("loading");
    return fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ id: variantId, quantity: quantity || 1 }),
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (e) { throw e; });
        return r.json();
      })
      .then(function () {
        return fetch("/cart.js").then(function (r) { return r.json(); });
      })
      .then(function (cart) {
        refreshCartCount(cart.item_count);
        return fetchCartSections();
      })
      .then(function () {
        if (button) {
          button.classList.remove("loading");
          button.classList.add("done");
          setTimeout(function () { button.classList.remove("done"); }, 1800);
        }
        openDrawer();
      })
      .catch(function (err) {
        if (button) button.classList.remove("loading");
        console.error("Kunde inte lägga i varukorgen:", err);
        alert("Kunde inte lägga produkten i varukorgen. Försök igen.");
      });
  }

  function changeLineQuantity(key, quantity) {
    return fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ id: key, quantity: quantity }),
    })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        refreshCartCount(cart.item_count);
        return fetchCartSections();
      });
  }

  function bindDrawerEvents() {
    var closeBtn = document.getElementById("CartDrawerClose");
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

    var continueBtn = document.getElementById("CartDrawerContinue");
    if (continueBtn) continueBtn.addEventListener("click", closeDrawer);

    drawer.querySelectorAll("[data-cart-qty-minus]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-key");
        var span = btn.parentElement.querySelector("[data-cart-qty]");
        var qty = parseInt(span.textContent, 10) - 1;
        changeLineQuantity(key, Math.max(0, qty));
      });
    });
    drawer.querySelectorAll("[data-cart-qty-plus]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-key");
        var span = btn.parentElement.querySelector("[data-cart-qty]");
        var qty = parseInt(span.textContent, 10) + 1;
        changeLineQuantity(key, qty);
      });
    });
    drawer.querySelectorAll("[data-cart-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        changeLineQuantity(btn.getAttribute("data-key"), 0);
      });
    });

    var priorityToggle = document.getElementById("PriorityShippingToggle");
    if (priorityToggle) {
      priorityToggle.addEventListener("change", function () {
        var variantId = priorityToggle.getAttribute("data-priority-shipping-variant");
        if (priorityToggle.checked) {
          addToCart(variantId, 1, null);
        } else {
          fetch("/cart.js")
            .then(function (r) { return r.json(); })
            .then(function (cart) {
              var line = cart.items.find(function (i) { return String(i.variant_id) === String(variantId); });
              if (line) return changeLineQuantity(line.key, 0);
            });
        }
      });
    }
  }

  // Abrir/fechar
  if (cartToggle) cartToggle.addEventListener("click", openDrawer);
  backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !drawer.hidden) closeDrawer();
  });

  bindDrawerEvents();

  // Interceta todos os formulários de produto (permite ter vários na mesma página)
  document.addEventListener("submit", function (e) {
    var form = e.target.closest("[data-product-form]");
    if (!form) return;
    e.preventDefault();
    var formData = new FormData(form);
    var variantId = formData.get("id");
    var quantity = parseInt(formData.get("quantity"), 10) || 1;
    var button = form.querySelector("[data-add-to-cart]");
    addToCart(variantId, quantity, button);
  });

  // Botão "Köp nu" fixo (barra inferior) usa o mesmo formulário do produto na página
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-add-to-cart-sticky]");
    if (!btn) return;
    var form = document.querySelector("[data-product-form]");
    if (!form) return;
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true }));
  });

  window.UrveiaCart = { openDrawer: openDrawer, closeDrawer: closeDrawer, addToCart: addToCart };
})();
