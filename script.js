(function() {
    const products = [
        { id:1, name:'Battery Pack MagSafe Apple', price:20000, currency:'ARS', category:'accesorios', image:'imagenes/bpack.png', stock:8, desc:'Batería externa original Apple', featured: false },
        { id:2, name:'AirPods Pro 2', price:29000, currency:'ARS', category:'audio', image:'imagenes/airpods2.png', stock:5, desc:'Cancelación activa de ruido y audio espacial', featured: true },
        { id:3, name:'Combo Cargador + Cable Lightning', price:13000, currency:'ARS', category:'accesorios', image:'imagenes/carga.png', stock:10, desc:'Cargador 20W USB-C + cable original', featured: false },
        { id:4, name:'Vaper Supreme 18.000 puffs', price:25000, currency:'ARS', category:'vape', image:'imagenes/vap-sup.png', stock:15, flavor:'🍇 Uva', desc:'Vaper descartable 18k caladas, sabor uva', featured: true },
        { id:5, name:'Pack 2 Vaper Supreme', price:45000, currency:'ARS', category:'vape', image:'imagenes/vap-sup2.jpg', stock:8, flavor:'🍇 Uva (pack ahorro)', desc:'2 unidades del Vaper Supreme 18k puffs', featured: true },
        { id:6, name:'PS5 Digital Edition', price:670, currency:'USD', category:'gaming', image:'imagenes/ps5.webp', stock:3, desc:'Consola PlayStation 5 Digital Edition', featured: true },
        { id:7, name:'ELFBAR ICE KING 40K Puffs', price:37000, currency:'ARS', category:'vape', image:'imagenes/elfbar40k.png', stock:10, desc:'Vaper descartable de 40.000 caladas, batería recargable, diseño premium.', featured: true }
    ];

    let cart = [];
    let currentFilter = 'all';
    let currentSort = 'default';
    let currentSearch = '';

    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    function saveCart() { localStorage.setItem('aux_cart', JSON.stringify(cart)); }
    function loadCart() { try { cart = JSON.parse(localStorage.getItem('aux_cart')) || []; } catch(e) { cart = []; } }

    function formatPrice(p, c) { return c === 'USD' ? `USD $${p.toLocaleString()}` : `$${p.toLocaleString('es-AR')}`; }
    function toARS(p, c) { return c === 'USD' ? p * 1400 : p; }
    function getCartTotal() { 
        let sub = cart.reduce((t,i) => t + toARS(i.price,i.currency)*i.qty, 0);
        let surcharge = $('#paymentMethod')?.value === 'credito' ? 0.1 : 0;
        return Math.round(sub * (1+surcharge));
    }
    function getAvailableStock(pid) {
        let p = products.find(p => p.id === pid);
        return p ? Math.max(0, p.stock - (cart.find(i => i.id === pid)?.qty || 0)) : 0;
    }

    function renderFeatured() {
        const featured = products.filter(p => p.featured === true);
        const container = $('#featuredGrid');
        if (!container) return;
        if (featured.length === 0) { container.innerHTML = '<p style="text-align:center;">No hay destacados</p>'; return; }
        container.innerHTML = featured.map(p => createProductCardHtml(p)).join('');
        attachProductEventsToContainer(container);
    }

    function renderProducts() {
        let filtered = products.filter(p => {
            if (currentFilter !== 'all' && p.category !== currentFilter) return false;
            if (currentSearch.trim() && !p.name.toLowerCase().includes(currentSearch.toLowerCase())) return false;
            return true;
        });
        if (currentSort !== 'default') {
            filtered.sort((a,b) => {
                if (currentSort === 'price-asc') return toARS(a.price,a.currency) - toARS(b.price,b.currency);
                if (currentSort === 'price-desc') return toARS(b.price,b.currency) - toARS(a.price,a.currency);
                if (currentSort === 'name-asc') return a.name.localeCompare(b.name);
                return 0;
            });
        }
        const grid = $('#productsGrid');
        if (!filtered.length) { grid.innerHTML = ''; $('#emptyMessage').style.display = 'block'; return; }
        $('#emptyMessage').style.display = 'none';
        grid.innerHTML = filtered.map(p => createProductCardHtml(p)).join('');
        attachProductEventsToContainer(grid);
    }

    function createProductCardHtml(p) {
        let avail = getAvailableStock(p.id);
        let imgHtml = p.image ? `<img src="${p.image}" onerror="this.src='https://placehold.co/300x200?text=No'">` : '<div style="font-size:3rem;">📦</div>';
        let inCart = cart.find(i => i.id === p.id);
        let btnDisabled = avail === 0 ? 'disabled' : '';
        let btnText = inCart ? '✓ En carrito' : '🛒 Agregar';
        let badgeHtml = p.featured ? '<span class="product-card__badge">🔥 Destacado</span>' : '';
        return `
            <div class="product-card" data-id="${p.id}">
                ${badgeHtml}
                <div class="product-card__image">${imgHtml}</div>
                <div class="product-card__body">
                    <div class="product-card__title">${p.name}</div>
                    <div class="product-card__price">${formatPrice(p.price,p.currency)}</div>
                </div>
                <button class="product-card__add-btn" data-id="${p.id}" ${btnDisabled}>${btnText}</button>
            </div>
        `;
    }

    function attachProductEventsToContainer(container) {
        container.querySelectorAll('.product-card__add-btn').forEach(btn => {
            btn.removeEventListener('click', addHandler);
            btn.addEventListener('click', addHandler);
        });
        container.querySelectorAll('.product-card').forEach(card => {
            card.removeEventListener('click', cardHandler);
            card.addEventListener('click', cardHandler);
        });
        function addHandler(e) { e.stopPropagation(); addToCart(+e.currentTarget.dataset.id); }
        function cardHandler(e) { if (!e.target.closest('.product-card__add-btn')) openModal(+e.currentTarget.dataset.id); }
    }

    function addToCart(pid) {
        let p = products.find(p => p.id === pid);
        if (!p) return;
        let avail = getAvailableStock(pid);
        if (avail <= 0) { showToast('Sin stock', true); return; }
        let existing = cart.find(i => i.id === pid);
        if (existing) existing.qty++;
        else cart.push({ id:p.id, name:p.name, price:p.price, currency:p.currency, image:p.image, flavor:p.flavor, qty:1 });
        saveCart();
        renderProducts();
        renderFeatured();
        updateCartUI();
        showToast(`${p.name} agregado`);
    }

    function updateCartUI() {
        let count = cart.reduce((c,i) => c + i.qty, 0);
        $('#cartCount').innerText = count;
        $('#cartDrawerCount').innerText = `(${count})`;
        renderCartItems();
        $('#cartTotal').innerText = formatPrice(getCartTotal(), 'ARS');
    }

    function renderCartItems() {
        const container = $('#cartItems');
        const footer = $('#cartFooter');
        if (cart.length === 0) {
            container.innerHTML = '<div class="cart-empty">🛒 Tu carrito está vacío</div>';
            footer.style.display = 'none';
            return;
        }
        footer.style.display = 'block';
        container.innerHTML = cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item__image">
                    <img src="${item.image || ''}" onerror="this.src='https://placehold.co/70x70?text=No'">
                </div>
                <div class="cart-item__info">
                    <div class="cart-item__title">${item.name}</div>
                    <div class="cart-item__price">${formatPrice(item.price, item.currency)}</div>
                </div>
                <div class="cart-item__controls">
                    <button class="cart-item__qty-btn" data-action="dec" data-id="${item.id}">−</button>
                    <span style="min-width: 25px; text-align: center;">${item.qty}</span>
                    <button class="cart-item__qty-btn" data-action="inc" data-id="${item.id}">+</button>
                    <button class="cart-item__remove" data-action="remove" data-id="${item.id}">🗑️</button>
                </div>
            </div>
        `).join('');

        $$('.cart-item__qty-btn').forEach(btn => {
            btn.removeEventListener('click', qtyHandler);
            btn.addEventListener('click', qtyHandler);
        });
        $$('.cart-item__remove').forEach(btn => {
            btn.removeEventListener('click', removeHandler);
            btn.addEventListener('click', removeHandler);
        });

        function qtyHandler(e) {
            let id = +this.dataset.id;
            let action = this.dataset.action;
            let item = cart.find(i => i.id === id);
            if (!item) return;
            let product = products.find(p => p.id === id);
            if (action === 'inc') {
                if (item.qty + 1 > product.stock) { showToast('Stock máximo', true); return; }
                item.qty++;
            } else if (action === 'dec') {
                if (item.qty - 1 < 1) {
                    cart = cart.filter(i => i.id !== id);
                } else {
                    item.qty--;
                }
            }
            saveCart();
            updateCartUI();
            renderProducts();
            renderFeatured();
        }
        function removeHandler(e) {
            let id = +this.dataset.id;
            cart = cart.filter(i => i.id !== id);
            saveCart();
            updateCartUI();
            renderProducts();
            renderFeatured();
        }
    }

    function openModal(pid) {
        let p = products.find(p => p.id === pid);
        if (!p) return;
        let flavor = p.flavor ? `<div style="margin:10px 0; padding:10px; background:rgba(0,212,255,0.1); border-radius:16px;"><strong>Sabor:</strong> ${p.flavor}</div>` : '';
        let imgHtml = p.image ? `<img src="${p.image}" onerror="this.src='https://placehold.co/500x400?text=No'">` : '<div style="font-size:4rem;">📦</div>';
        let avail = getAvailableStock(pid);
        $('#modalContent').innerHTML = `
            <div style="display:flex; gap:2rem; flex-wrap:wrap;">
                <div style="flex:1; min-width:250px; background:#161625; border-radius:24px; display:flex; align-items:center; justify-content:center; padding:1rem;">${imgHtml}</div>
                <div style="flex:1; display:flex; flex-direction:column; gap:1rem;">
                    <h2 style="font-size:1.8rem;">${p.name}</h2>
                    <div style="font-size:1.8rem; font-weight:800; background:linear-gradient(135deg,#00d4ff,#7c5cfc); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;">${formatPrice(p.price,p.currency)}</div>
                    ${flavor}
                    <p style="color:#b0b0c0;">${p.desc || 'Producto original de alta calidad.'}</p>
                    <div style="display:flex; gap:1rem; align-items:center;">
                        <input type="number" id="modalQty" value="1" min="1" max="${avail}" style="width:80px; padding:10px; border-radius:16px; background:#161625; border:1px solid #252538; color:white; text-align:center;">
                        <button id="modalAddBtn" class="btn btn--primary" ${avail===0 ? 'disabled' : ''}>Agregar al carrito</button>
                    </div>
                </div>
            </div>
        `;
        $('#productModal').classList.add('modal--open');
        document.body.style.overflow = 'hidden';
        $('#modalAddBtn')?.addEventListener('click', () => {
            let qty = parseInt($('#modalQty').value);
            if (isNaN(qty) || qty < 1) qty = 1;
            if (qty > avail) { showToast(`Máximo ${avail}`, true); return; }
            let existing = cart.find(i => i.id === pid);
            if (existing) existing.qty += qty;
            else cart.push({ id:p.id, name:p.name, price:p.price, currency:p.currency, image:p.image, flavor:p.flavor, qty });
            saveCart();
            updateCartUI();
            renderProducts();
            renderFeatured();
            showToast(`${qty} x ${p.name} agregado`);
            closeModal();
        });
    }

    function closeModal() { $('#productModal').classList.remove('modal--open'); document.body.style.overflow = ''; }

    function showToast(msg, isError = false) {
        let toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${msg}`;
        $('#toastContainer').appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    // Función para manejar el menú móvil
    function initMobileMenu() {
        const menuToggle = $('#menuToggle');
        const mobileMenu = $('#mobileMenu');
        const mobileMenuClose = $('#mobileMenuClose');
        const mobileMenuOverlay = $('#mobileMenuOverlay');
        const closeMenuLinks = $$('[data-close-menu]');

        if (!menuToggle || !mobileMenu) return;

        function openMenu() {
            mobileMenu.classList.add('mobile-menu--open');
            document.body.style.overflow = 'hidden';
        }

        function closeMenu() {
            mobileMenu.classList.remove('mobile-menu--open');
            document.body.style.overflow = '';
        }

        menuToggle.addEventListener('click', openMenu);
        mobileMenuClose.addEventListener('click', closeMenu);
        mobileMenuOverlay.addEventListener('click', closeMenu);
        closeMenuLinks.forEach(link => link.addEventListener('click', closeMenu));

        // Cerrar con tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('mobile-menu--open')) {
                closeMenu();
            }
        });
    }

    // Sincronizar búsqueda entre desktop y móvil
    function initMobileSearch() {
        const searchInputDesktop = $('#searchInput');
        const mobileSearchInput = $('#mobileSearchInput');
        if (mobileSearchInput && searchInputDesktop) {
            mobileSearchInput.addEventListener('input', (e) => {
                searchInputDesktop.value = e.target.value;
                currentSearch = e.target.value;
                renderProducts();
            });
            searchInputDesktop.addEventListener('input', (e) => {
                if (mobileSearchInput) mobileSearchInput.value = e.target.value;
                currentSearch = e.target.value;
                renderProducts();
            });
        }
    }

    function bindEvents() {
        $('#cartToggle').onclick = () => { $('#cartDrawer').classList.add('open'); $('#cartOverlay').classList.add('visible'); };
        $('#closeCart').onclick = () => { $('#cartDrawer').classList.remove('open'); $('#cartOverlay').classList.remove('visible'); };
        $('#cartOverlay').onclick = () => { $('#cartDrawer').classList.remove('open'); $('#cartOverlay').classList.remove('visible'); };
        $('#clearCartBtn').onclick = () => { if (confirm('Vaciar carrito?')) { cart = []; saveCart(); updateCartUI(); renderProducts(); renderFeatured(); } };
        $('#checkoutBtn').onclick = () => {
            if (cart.length === 0) return;
            let total = getCartTotal();
            let msg = encodeURIComponent(`Hola, quiero comprar:\n${cart.map(i => `- ${i.name} x${i.qty}: ${formatPrice(i.price,i.currency)}`).join('\n')}\nTotal: ${formatPrice(total,'ARS')}`);
            window.open(`https://wa.me/5493364248871?text=${msg}`, '_blank');
        };
        $$('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
            $$('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderProducts();
        }));
        $('#sortSelect').addEventListener('change', e => { currentSort = e.target.value; renderProducts(); });
        $('#productModal .modal__close').onclick = closeModal;
        $('#productModal .modal__overlay').onclick = closeModal;
        document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('#cartDrawer').classList.remove('open'); $('#cartOverlay').classList.remove('visible'); } });
    }

    loadCart();
    renderFeatured();
    renderProducts();
    updateCartUI();
    bindEvents();
    initMobileMenu();
    initMobileSearch();
})();