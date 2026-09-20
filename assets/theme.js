/**
 * Interações gerais do tema: menu mobile, pesquisa, popup de newsletter,
 * acordeões, galeria de produto, seletor de variantes e recomendações de produtos.
 * O carrinho (drawer) vive à parte em cart.js.
 */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  /* ---------------- Menu mobile ---------------- */
  (function mobileNav() {
    var toggle = document.getElementById("menuToggle");
    var nav = document.getElementById("MobileNav");
    var backdrop = document.getElementById("MobileNavBackdrop");
    var closeBtn = document.getElementById("mobileNavClose");
    if (!toggle || !nav || !backdrop) return;

    function open() {
      nav.classList.add("is-open");
      backdrop.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
    function close() {
      nav.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }
    toggle.addEventListener("click", open);
    backdrop.addEventListener("click", close);
    if (closeBtn) closeBtn.addEventListener("click", close);
    nav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  })();

  /* ---------------- Pesquisa ---------------- */
  (function search() {
    var toggle = document.getElementById("searchToggle");
    var panel = document.getElementById("HeaderSearch");
    if (!toggle || !panel) return;
    toggle.addEventListener("click", function () {
      var isOpen = !panel.hidden;
      panel.hidden = isOpen;
      toggle.setAttribute("aria-expanded", String(!isOpen));
      if (!isOpen) {
        var input = panel.querySelector("input[type=search]");
        if (input) input.focus();
      }
    });
  })();

  /* ---------------- Popup de newsletter ---------------- */
  (function popup() {
    var popupEl = document.getElementById("NewsletterPopup");
    if (!popupEl) return;
    var closeBtn = document.getElementById("popupClose");
    var skipBtn = document.getElementById("popupSkip");
    var delay = parseInt(popupEl.getAttribute("data-popup-delay"), 10) || 1500;
    var storageKey = "urveia_popup_dismissed";

    function show() {
      popupEl.classList.add("is-open");
    }
    function hide() {
      popupEl.classList.remove("is-open");
      try { sessionStorage.setItem(storageKey, "1"); } catch (e) {}
    }

    var dismissed = false;
    try { dismissed = sessionStorage.getItem(storageKey) === "1"; } catch (e) {}

    var formPostedSuccessfully = popupEl.querySelector("[data-form-success]");
    if (!dismissed || formPostedSuccessfully) {
      setTimeout(show, delay);
    }
    if (closeBtn) closeBtn.addEventListener("click", hide);
    if (skipBtn) skipBtn.addEventListener("click", hide);
    popupEl.addEventListener("click", function (e) {
      if (e.target === popupEl) hide();
    });
  })();

  /* ---------------- Acordeões (descrição, FAQ, etc.) ---------------- */
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-acc-trigger]");
    if (!trigger) return;
    var item = trigger.closest(".acc-item");
    var panel = item.querySelector(".acc-panel");
    var open = item.classList.toggle("open");
    panel.style.maxHeight = open ? panel.scrollHeight + "px" : "0px";
  });

  /* ---------------- Galeria do produto ---------------- */
  document.querySelectorAll("product-page").forEach(function (root) {
    var mainId = "GalleryMain-" + root.getAttribute("data-section-id");
    var main = document.getElementById(mainId);
    if (!main) return;
    var slides = main.querySelectorAll("[data-gallery-slide]");
    var thumbs = root.parentElement.querySelectorAll("[data-gallery-thumb]");
    var current = 0;

    function show(index) {
      if (!slides.length) return;
      index = (index + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.style.display = i === index ? "" : "none"; });
      thumbs.forEach(function (t, i) { t.classList.toggle("active", i === index); });
      current = index;
    }
    root.querySelectorAll("[data-gallery-prev]").forEach(function (b) { b.addEventListener("click", function () { show(current - 1); }); });
    root.querySelectorAll("[data-gallery-next]").forEach(function (b) { b.addEventListener("click", function () { show(current + 1); }); });
    thumbs.forEach(function (t) {
      t.addEventListener("click", function () { show(parseInt(t.getAttribute("data-index"), 10)); });
    });

    root._showGallerySlide = show;
  });

  /* ---------------- Quantidade (stepper) ---------------- */
  document.addEventListener("click", function (e) {
    var minus = e.target.closest("[data-quantity-minus]");
    var plus = e.target.closest("[data-quantity-plus]");
    if (!minus && !plus) return;
    var stepper = (minus || plus).closest("[data-quantity-stepper]");
    var input = stepper.querySelector("[data-quantity-input]");
    var value = parseInt(input.value, 10) || 1;
    value = minus ? Math.max(1, value - 1) : value + 1;
    input.value = value;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  /* ---------------- Seletor de variantes (tamanho / cor / outras opções) ---------------- */
  document.querySelectorAll("product-page").forEach(function (root) {
    var sectionId = root.getAttribute("data-section-id");
    var dataEl = document.getElementById("ProductJson-" + sectionId);
    if (!dataEl) return;
    var product = JSON.parse(dataEl.textContent);

    var optionCount = product.options ? product.options.length : (product.variants[0].options || []).length;
    var selected = new Array(optionCount).fill(null);
    var sizeTouched = false; // exige seleção explícita de tamanho antes de comprar

    var variantIdInput = document.getElementById("ProductVariantId-" + sectionId);
    var priceBlock = document.getElementById("PriceBlock-" + sectionId);
    var stockLine = document.getElementById("StockLine-" + sectionId);
    var addBtn = document.getElementById("AddToCart-" + sectionId);
    var stickyPrice = root.querySelector("[data-price-sticky]");
    var stickyAddBtn = root.parentElement.querySelector("[data-add-to-cart-sticky]");
    var sizeGrid = root.querySelector("[data-size-grid]");
    var sizeWarning = root.querySelector("[data-size-warning]");
    var selectedSizeLabel = root.querySelector("[data-selected-size]");
    var selectedColorLabel = root.querySelector("[data-selected-color]");

    // Inicializa `selected` a partir da variante pré-selecionada pelo servidor,
    // exceto a opção de tamanho, que fica por escolher até o cliente clicar.
    var initialVariant = product.variants.find(function (v) { return v.available; }) || product.variants[0];
    var sizeOptionIndex = sizeGrid ? parseInt(sizeGrid.closest(".size-block").getAttribute("data-option-index"), 10) : null;
    var colorSwatchesEl = root.querySelector("[data-color-swatches]");
    var colorOptionIndex = colorSwatchesEl ? parseInt(colorSwatchesEl.getAttribute("data-option-index"), 10) : null;
    initialVariant.options.forEach(function (val, i) {
      if (i !== sizeOptionIndex) selected[i] = val;
    });

    function findVariant() {
      return product.variants.find(function (v) {
        return v.options.every(function (val, i) { return selected[i] === null || selected[i] === val; });
      });
    }

    function money(cents) {
      return (cents / 100).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " kr";
    }

    function render() {
      var variant = findVariant();

      root.querySelectorAll("[data-option-value]").forEach(function (btn) {
        var idx = parseInt(btn.getAttribute("data-option-index"), 10);
        btn.classList.toggle("active", selected[idx] === btn.getAttribute("data-value"));
      });

      if (selectedSizeLabel && sizeOptionIndex !== null && sizeTouched && selected[sizeOptionIndex]) {
        selectedSizeLabel.textContent = selected[sizeOptionIndex];
      }
      if (selectedColorLabel && colorOptionIndex !== null && selected[colorOptionIndex]) {
        selectedColorLabel.textContent = selected[colorOptionIndex];
      }

      if (!variant) {
        if (addBtn) { addBtn.disabled = true; addBtn.querySelector(".lbl-default").textContent = "Ej tillgänglig kombination"; }
        return;
      }

      if (variantIdInput) variantIdInput.value = variant.id;

      if (priceBlock) {
        var onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
        var oldEl = priceBlock.querySelector("[data-price-compare]");
        var nowEl = priceBlock.querySelector("[data-price]");
        var saveEl = priceBlock.querySelector("[data-price-save]");
        if (nowEl) nowEl.textContent = money(variant.price);
        if (onSale) {
          if (oldEl) { oldEl.hidden = false; oldEl.textContent = money(variant.compare_at_price); }
          if (saveEl) {
            var pct = Math.round(((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100);
            saveEl.hidden = false;
            saveEl.textContent = "SPARA " + pct + "%";
          }
        } else {
          if (oldEl) oldEl.hidden = true;
          if (saveEl) saveEl.hidden = true;
        }
      }
      if (stickyPrice) stickyPrice.textContent = money(variant.price);

      if (stockLine) {
        var low = variant.inventory_management && variant.inventory_quantity > 0 && variant.inventory_quantity <= 10;
        stockLine.hidden = !low;
        if (low) {
          stockLine.innerHTML = '<span class="stock-dot"></span> Endast ' + variant.inventory_quantity + ' kvar i lager';
        }
      }

      [addBtn, stickyAddBtn].forEach(function (btn) {
        if (!btn) return;
        btn.disabled = !variant.available;
        var lbl = btn.querySelector(".lbl-default");
        if (lbl) lbl.textContent = variant.available ? (btn === stickyAddBtn ? "Köp nu" : "Lägg i varukorg") : "Slutsåld";
      });

      // Troca a imagem principal se a variante tiver uma imagem própria (ex: mudar de cor)
      if (variant.featured_image && root._showGallerySlide) {
        var media = product.media || [];
        var idx = media.findIndex(function (m) { return m.id === variant.featured_image.id; });
        if (idx > -1) root._showGallerySlide(idx);
      }
    }

    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-option-value]");
      if (!btn) return;
      var idx = parseInt(btn.getAttribute("data-option-index"), 10);
      var value = btn.getAttribute("data-value");
      if (btn.disabled) return;
      selected[idx] = value;
      if (idx === sizeOptionIndex) {
        sizeTouched = true;
        if (sizeWarning) sizeWarning.hidden = true;
      }
      render();
    });

    var form = root.querySelector("[data-product-form]");
    if (form) {
      form.addEventListener("submit", function (e) {
        if (sizeOptionIndex !== null && !sizeTouched) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (sizeWarning) sizeWarning.hidden = false;
          if (sizeGrid) {
            sizeGrid.classList.remove("shake");
            void sizeGrid.offsetWidth;
            sizeGrid.classList.add("shake");
            sizeGrid.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
      });
    }

    render();
  });

  /* ---------------- Recomendações de produtos ---------------- */
  document.querySelectorAll("[data-product-recommendations]").forEach(function (el) {
    var url = el.getAttribute("data-url");
    if (!url) return;
    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var fresh = doc.querySelector("[data-product-recommendations]");
        if (fresh && fresh.innerHTML.trim()) el.innerHTML = fresh.innerHTML;
      })
      .catch(function () {});
  });
})();
