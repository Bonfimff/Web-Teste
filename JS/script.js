'use strict';

/* =========================================================
   MEGA DISTRITO — Script Principal
   Funcionalidades: Produtos · Categorias · Carrinho · Busca
   ---------------------------------------------------------
   Dados (CATEGORIAS, PRODUTOS, PRODUTOS_USADOS, PROFISSIONAIS…)
   vivem em JS/data/*.js; helpers compartilhados em JS/utils.js.
   Ambos devem ser carregados ANTES deste arquivo.
   ========================================================= */

// =====================
// ESTADO DO CARRINHO
// (salvo no localStorage)
// =====================
let carrinho = carregarCarrinho();

/* ─────────────────────────────────────────────
   CARREGAMENTO DA VITRINE (API)
   PRODUTOS/PRODUTOS_USADOS começam vazios (JS/data/produtos.js)
   e são populados aqui a partir do backend. Idempotente e
   seguro de chamar mais de uma vez (ex: feed.js também usa).
   ───────────────────────────────────────────── */
const BADGE_CLASSE = {
    'Novo': 'badge-novo',
    'Top': 'badge-top',
    'Destaque': 'badge-top',
    'Oferta': 'sale',
    'Promoção': 'sale',
};
const CONDICAO_LABEL = { otimo: 'Ótimo Estado', bom: 'Bom Estado', regular: 'Estado Regular' };

function mapItemVitrine(item) {
    return {
        id: item.id,
        nome: item.nome,
        categoria: item.categoria,
        preco: Number(item.preco),
        precoAntigo: item.preco_antigo ? Number(item.preco_antigo) : null,
        emoji: item.foto_url ? '' : '🛍️',
        avaliacao: item.avaliacao ? Number(item.avaliacao) : 0,
        avaliacoes: item.avaliacoes || 0,
        badge: item.badge || null,
        badgeCls: BADGE_CLASSE[item.badge] || '',
    };
}

function mapItemBazar(item) {
    return {
        id: item.id,
        nome: item.nome,
        categoria: item.categoria,
        emoji: '🛍️',
        preco: Number(item.preco),
        precoOrig: item.preco_antigo ? Number(item.preco_antigo) : Number(item.preco),
        condicao: item.condicao,
        condicaoLabel: CONDICAO_LABEL[item.condicao] || 'Bom Estado',
        desc: item.descricao || '',
        vendedor: item.vendedor_nome || 'Vendedor',
        bairro: item.bairro || '',
    };
}

let _vitrinePromise = null;

function carregarVitrine() {
    if (!_vitrinePromise) {
        _vitrinePromise = (async () => {
            const [novos, bazar] = await Promise.all([
                fetchItens({ tipo: 'produto', bazar: '0' }),
                fetchItens({ tipo: 'produto', bazar: '1' }),
            ]);
            if (novos) PRODUTOS = novos.map(mapItemVitrine);
            if (bazar) PRODUTOS_USADOS = bazar.map(mapItemBazar);
        })();
    }
    return _vitrinePromise;
}

// INICIALIZAÇÃO
// =====================
document.addEventListener('DOMContentLoaded', async () => {
    const carregamentos = [carregarVitrine()];
    if (typeof carregarApps === 'function') carregamentos.push(carregarApps());
    await Promise.all(carregamentos);

    if (document.getElementById('categories-grid')) renderCategorias();
    if (document.getElementById('products-grid'))   renderProdutos(PRODUTOS);
    if (document.getElementById('bazar-grid'))      renderBazar(PRODUTOS_USADOS);
    atualizarContadorCarrinho();
    if (typeof atualizarContadorAtalhos === 'function') atualizarContadorAtalhos();
    if (typeof renderGavetaApps === 'function') renderGavetaApps();
    if (typeof renderApps === 'function' && document.getElementById('apps-grid')) renderApps();
    bindEventos();
});

/* ─────────────────────────────────────────────
   RENDERIZAÇÃO DE CATEGORIAS
   ───────────────────────────────────────────── */
function renderCategorias() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;
    grid.innerHTML = CATEGORIAS.map(c => `
        <button type="button" class="category-card" data-cat="${c.id}" onclick="filtrarCategoria('${c.id}')">
            <span class="category-icon"><i class="${c.icone}"></i></span>
            <span class="category-name">${c.nome}</span>
        </button>
    `).join('');
}

/* ─────────────────────────────────────────────
   RENDERIZAÇÃO DE PRODUTOS
   ───────────────────────────────────────────── */
function renderProdutos(lista) {
    const grid     = document.getElementById('products-grid');
    const msgVazia = document.getElementById('no-results');
    if (!grid) return; // guard: página sem grid de produtos

    if (lista.length === 0) {
        grid.innerHTML  = '';
        msgVazia.style.display = 'block';
        return;
    }

    msgVazia.style.display = 'none';
    grid.innerHTML = lista.map(buildCardHTML).join('');

    // Animação de entrada em cascata
    grid.querySelectorAll('.product-card').forEach((card, i) => {
        card.style.opacity   = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'opacity .4s ease, transform .4s ease';
            card.style.opacity    = '1';
            card.style.transform  = 'translateY(0)';
        }, i * 65);
    });
}

function buildCardHTML(p) {
    // Selo de desconto (%) quando há preço antigo; senão badge textual
    const desconto = p.precoAntigo
        ? Math.round((1 - p.preco / p.precoAntigo) * 100)
        : 0;
    const selo = desconto >= 5
        ? `<span class="product-discount">-${desconto}%</span>`
        : (p.badge ? `<span class="product-badge ${p.badgeCls}">${p.badge}</span>` : '');

    const precoAntigo = p.precoAntigo
        ? `<span class="product-price-old">${brl(p.precoAntigo)}</span>`
        : '';

    // Parcelamento realista: até 12x, parcela mínima de R$ 10
    const parcelas   = Math.min(12, Math.max(1, Math.floor(p.preco / 10)));
    const vlrParcela = brl(p.preco / parcelas);
    const parcelaHtml = parcelas > 1
        ? `<div class="product-installment">em ${parcelas}x ${vlrParcela} sem juros</div>`
        : '';

    // Frete grátis acima de R$ 99 (regra promocional)
    const freteHtml = p.preco >= 99
        ? `<div class="product-shipping"><i class="fas fa-truck"></i> Frete grátis</div>`
        : '';

    return `
        <div class="product-card" data-id="${p.id}">
            <div class="product-img-wrapper">
                ${selo}
                <span class="product-emoji">${p.emoji}</span>
            </div>
            <div class="product-info">
                <h3 class="product-name">${p.nome}</h3>
                <div class="product-rating">
                    <i class="fas fa-star"></i>
                    <span class="nota">${p.avaliacao.toFixed(1)}</span>
                    <span class="count">(${p.avaliacoes})</span>
                </div>
                <div class="product-prices">
                    ${precoAntigo}
                    <div class="product-price">${brl(p.preco)}</div>
                    ${parcelaHtml}
                    ${freteHtml}
                </div>
                <button class="btn-add-cart" onclick="adicionarAoCarrinho(${p.id})">
                    <i class="fas fa-cart-plus"></i> Adicionar
                </button>
            </div>
        </div>
    `;
}

/* ─────────────────────────────────────────────
   FILTROS
   ───────────────────────────────────────────── */
function filtrarCategoria(catId) {
    // Ativa tab
    document.querySelectorAll('.filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === catId)
    );
    // Ativa card de categoria
    document.querySelectorAll('.category-card').forEach(c =>
        c.classList.toggle('active', c.dataset.cat === catId)
    );
    renderProdutos(PRODUTOS.filter(p => p.categoria === catId));
    document.getElementById('produtos').scrollIntoView({ behavior: 'smooth' });
}

function resetarFiltros() {
    document.querySelectorAll('.filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === 'todos')
    );
    document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
    renderProdutos(PRODUTOS);
}

function bindFiltroTabs() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filtro = btn.dataset.filter;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');

            if (filtro === 'todos') {
                renderProdutos(PRODUTOS);
            } else {
                renderProdutos(PRODUTOS.filter(p => p.categoria === filtro));
                document.querySelectorAll('.category-card').forEach(c => {
                    if (c.dataset.cat === filtro) c.classList.add('active');
                });
            }
        });
    });
}

/* ─────────────────────────────────────────────
   BUSCA
   ───────────────────────────────────────────── */
function realizarBusca() {
    const termo = document.getElementById('search-input').value.trim().toLowerCase();

    if (!termo) { resetarFiltros(); return; }

    const resultados = PRODUTOS.filter(p =>
        p.nome.toLowerCase().includes(termo) ||
        nomeDaCategoria(p.categoria).toLowerCase().includes(termo)
    );

    // Reset visual dos filtros
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-filter="todos"]').classList.add('active');
    document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));

    renderProdutos(resultados);
    document.getElementById('produtos').scrollIntoView({ behavior: 'smooth' });
}

/* ─────────────────────────────────────────────
   CARRINHO — AÇÕES
   ───────────────────────────────────────────── */
function adicionarAoCarrinho(id) {
    const produto = PRODUTOS.find(p => p.id === id);
    if (!produto) return;

    const item = carrinho.find(i => i.id === id);
    if (item) {
        item.quantidade++;
    } else {
        carrinho.push({ ...produto, quantidade: 1 });
    }

    salvarCarrinho();
    atualizarContadorCarrinho();
    pulsarBotaoCarrinho();
    toast(`"${produto.nome}" adicionado ao carrinho!`);
}

function removerDoCarrinho(id) {
    carrinho = carrinho.filter(i => i.id !== id);
    salvarCarrinho();
    atualizarContadorCarrinho();
    renderItensCarrinho();
}

function alterarQuantidade(id, delta) {
    const item = carrinho.find(i => i.id === id);
    if (!item) return;

    item.quantidade += delta;
    if (item.quantidade <= 0) {
        removerDoCarrinho(id);
    } else {
        salvarCarrinho();
        atualizarContadorCarrinho();
        renderItensCarrinho();
    }
}

function limparCarrinho() {
    if (carrinho.length === 0) return;
    if (!confirm('Tem certeza que deseja limpar o carrinho?')) return;
    carrinho = [];
    salvarCarrinho();
    atualizarContadorCarrinho();
    renderItensCarrinho();
    toast('Carrinho esvaziado!');
}

/* ─────────────────────────────────────────────
   CARRINHO — RENDERIZAÇÃO
   ───────────────────────────────────────────── */
function renderItensCarrinho() {
    const container = document.getElementById('cart-items');
    const totalEl   = document.getElementById('cart-total');

    if (carrinho.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>Seu carrinho está vazio</p>
                <small>Adicione produtos para continuar</small>
            </div>`;
    } else {
        container.innerHTML = carrinho.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-emoji">${item.emoji}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.nome}</div>
                    <div class="cart-item-price">${brl(item.preco)}</div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="alterarQuantidade(${item.id}, -1)" aria-label="Diminuir">-</button>
                        <span class="qty-value">${item.quantidade}</span>
                        <button class="qty-btn" onclick="alterarQuantidade(${item.id},  1)" aria-label="Aumentar">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removerDoCarrinho(${item.id})" aria-label="Remover">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `).join('');
    }

    totalEl.textContent = brl(calcularTotal());
}

/* ─────────────────────────────────────────────
   CARRINHO — SIDEBAR (ABRIR / FECHAR)
   ───────────────────────────────────────────── */
function abrirCarrinho() {
    if (typeof fecharGavetaApps === 'function') fecharGavetaApps();
    document.getElementById('cart-sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderItensCarrinho();
}

function fecharCarrinho() {
    document.getElementById('cart-sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
    if (!document.getElementById('app-drawer')?.classList.contains('open')) {
        document.body.style.overflow = '';
    }
}

/* ─────────────────────────────────────────────
   CARRINHO — PERSISTÊNCIA
   ───────────────────────────────────────────── */
function salvarCarrinho() {
    try { localStorage.setItem('mage-carrinho', JSON.stringify(carrinho)); }
    catch { /* sem suporte a localStorage — ignora */ }
}

function carregarCarrinho() {
    try { return JSON.parse(localStorage.getItem('mage-carrinho')) || []; }
    catch { return []; }
}

/* ─────────────────────────────────────────────
   CARRINHO — CÁLCULOS
   ───────────────────────────────────────────── */
function calcularTotal() {
    return carrinho.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
}
function totalItens() {
    return carrinho.reduce((acc, i) => acc + i.quantidade, 0);
}

function atualizarContadorCarrinho() {
    const n  = totalItens();
    const el = document.getElementById('cart-count');
    el.textContent   = n;
    el.style.display = n === 0 ? 'none' : 'flex';
}

/* ─────────────────────────────────────────────
   CHECKOUT SIMULADO
   ───────────────────────────────────────────── */
function simularCheckout() {
    if (carrinho.length === 0) {
        toast('Adicione ao menos um produto ao carrinho!');
        return;
    }
    toast('✅ Pedido realizado com sucesso! Obrigado pela preferência!');
    carrinho = [];
    salvarCarrinho();
    atualizarContadorCarrinho();
    renderItensCarrinho();
    setTimeout(fecharCarrinho, 2500);
}

/* ─────────────────────────────────────────────
   ANIMAÇÃO DO ÍCONE DO CARRINHO
   ───────────────────────────────────────────── */
function pulsarBotaoCarrinho() {
    const el = document.getElementById('cart-count');
    el.classList.remove('pulse');
    void el.offsetWidth; // força reflow
    el.classList.add('pulse');
}

/* ─────────────────────────────────────────────
   HEADER — SOMBRA AO ROLAR
   ───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   SCROLL DO HEADER
   ───────────────────────────────────────────── */
function bindHeaderScroll() {
    window.addEventListener('scroll', () => {
        document.getElementById('header')
            .classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
}

/* ─────────────────────────────────────────────
   NAV — LINK ATIVO AO ROLAR (INTERSECTION OBSERVER)
   ───────────────────────────────────────────── */
function bindActiveNav() {
    const sections = document.querySelectorAll('section[id], footer[id], [data-nav-anchor][id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                navLinks.forEach(link =>
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`)
                );
            }
        });
    }, { threshold: 0.35, rootMargin: '-68px 0px 0px 0px' });

    sections.forEach(s => observer.observe(s));
}

/* ─────────────────────────────────────────────
   HAMBURGER (MENU MOBILE)
   ───────────────────────────────────────────── */
function bindHamburger() {
    // Header atual não usa hamburger; guarda mantida para
    // páginas que ainda tenham o menu antigo.
    const btn = document.getElementById('hamburger');
    const nav = document.getElementById('nav');
    if (!btn || !nav) return;

    btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        nav.classList.toggle('open');
    });

    // Fecha ao clicar em qualquer link
    nav.querySelectorAll('.nav-link').forEach(link =>
        link.addEventListener('click', () => {
            btn.classList.remove('active');
            nav.classList.remove('open');
        })
    );
}

/* ─────────────────────────────────────────────
   BIND DE TODOS OS EVENTOS
   ───────────────────────────────────────────── */
function bindEventos() {
    // Carrinho
    document.getElementById('cart-btn')       .addEventListener('click',   abrirCarrinho);
    document.getElementById('close-cart')     .addEventListener('click',   fecharCarrinho);
    document.getElementById('overlay')        .addEventListener('click',   fecharCarrinho);
    document.getElementById('clear-cart-btn') .addEventListener('click',   limparCarrinho);
    document.getElementById('checkout-btn')   .addEventListener('click',   simularCheckout);

    // Busca
    document.getElementById('search-btn')     .addEventListener('click',   realizarBusca);
    document.getElementById('search-input')   .addEventListener('keydown', e => {
        if (e.key === 'Enter') realizarBusca();
    });

    // Fechar carrinho com Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            fecharCarrinho();
            if (typeof fecharGavetaApps === 'function') fecharGavetaApps();
        }
    });

    // Tabs de filtro (produtos novos)
    bindFiltroTabs();

    // Tabs de filtro do bazar
    bindFiltrosBazar();

    // Apps
    if (typeof bindApps === 'function') bindApps();
    if (typeof bindFloatingBottomNav === 'function') bindFloatingBottomNav();


    // Header
    bindHeaderScroll();
    bindActiveNav();
    bindHamburger();
}

/* ─────────────────────────────────────────────
   BAZAR — RENDERIZAÇÃO
   ───────────────────────────────────────────── */

/** Renderiza o grid de produtos usados */
function renderBazar(lista) {
    const grid     = document.getElementById('bazar-grid');
    const msgVazia = document.getElementById('bazar-no-results');

    if (lista.length === 0) {
        grid.innerHTML = '';
        msgVazia.style.display = 'block';
        return;
    }

    msgVazia.style.display = 'none';
    grid.innerHTML = lista.map(buildBazarCardHTML).join('');

    // Animação em cascata
    grid.querySelectorAll('.bazar-card').forEach((card, i) => {
        card.style.opacity   = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'opacity .4s ease, transform .4s ease';
            card.style.opacity    = '1';
            card.style.transform  = 'translateY(0)';
        }, i * 65);
    });
}

/** Gera o HTML de um card do bazar */
function buildBazarCardHTML(item) {
    const condCls = { otimo: 'cond-otimo', bom: 'cond-bom', regular: 'cond-regular' }[item.condicao] || 'cond-bom';
    const economia = ((1 - item.preco / item.precoOrig) * 100).toFixed(0);
    const catNome  = nomeDaCategoriaBazar(item.categoria);
    const inicial  = item.vendedor.charAt(0).toUpperCase();

    return `
        <div class="bazar-card" data-id="${item.id}">
            <span class="bazar-badge-usado"><i class="fas fa-recycle"></i> Usado</span>
            <span class="bazar-condition ${condCls}">${item.condicaoLabel}</span>
            <div class="bazar-img-wrapper">${item.emoji}</div>
            <div class="bazar-info">
                <span class="bazar-cat">${catNome}</span>
                <h3 class="bazar-name">${item.nome}</h3>
                <p class="bazar-desc">${item.desc}</p>
                <div class="bazar-seller">
                    <div class="bazar-seller-avatar">${inicial}</div>
                    <div class="bazar-seller-info">
                        <span class="bazar-seller-name">${item.vendedor}</span>
                        <span class="bazar-seller-local"><i class="fas fa-map-marker-alt"></i> ${item.bairro}</span>
                    </div>
                </div>
                <div class="bazar-prices">
                    <div class="bazar-price-orig">Novo por: ${brl(item.precoOrig)}</div>
                    <div class="bazar-price">${brl(item.preco)}</div>
                    <div class="bazar-economy"><i class="fas fa-tag"></i> ${economia}% mais barato que o novo</div>
                </div>
                <div class="bazar-actions">
                    <button class="btn-bazar-interest" onclick="demonstrarInteresse(${item.id})">
                        <i class="fab fa-whatsapp"></i> Tenho Interesse
                    </button>
                    <button class="btn-bazar-cart" title="Adicionar ao carrinho" onclick="adicionarBazarAoCarrinho(${item.id})">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/** Retorna nome legível para categorias do bazar (inclui 'outros') */
function nomeDaCategoriaBazar(id) {
    const mapa = {
        eletronicos : 'Eletrônicos',
        casa        : 'Casa e Cozinha',
        ferramentas : 'Ferramentas',
        moda        : 'Moda',
        outros      : 'Outros',
    };
    return mapa[id] || id;
}

/** Filtra e renderiza bazar por categoria */
function filtrarBazar(cat) {
    document.querySelectorAll('.filter-bazar').forEach(b =>
        b.classList.toggle('active', b.dataset.bazarFilter === cat)
    );
    const lista = cat === 'todos'
        ? PRODUTOS_USADOS
        : PRODUTOS_USADOS.filter(p => p.categoria === cat);
    renderBazar(lista);
}

/** Reseta filtros do bazar */
function resetarBazar() {
    filtrarBazar('todos');
}

/** Bind nos botões de filtro do bazar */
function bindFiltrosBazar() {
    document.querySelectorAll('.filter-bazar').forEach(btn => {
        btn.addEventListener('click', () => filtrarBazar(btn.dataset.bazarFilter));
    });
}

/** Abre WhatsApp com mensagem de interesse (simulado) */
function demonstrarInteresse(id) {
    const item = PRODUTOS_USADOS.find(p => p.id === id);
    if (!item) return;
    const msg = encodeURIComponent(
        `Olá! Vi o anúncio "${item.nome}" por ${brl(item.preco)} no Mega Distrito. Ainda está disponível?`
    );
    // Abre WhatsApp do vendedor (número ficticio)
    window.open(`https://wa.me/5521999990000?text=${msg}`, '_blank', 'noopener,noreferrer');
}

/** Adiciona item do bazar ao carrinho */
function adicionarBazarAoCarrinho(id) {
    const item = PRODUTOS_USADOS.find(p => p.id === id);
    if (!item) return;

    // Reutiliza o mesmo carrinho com uma cópia do item
    const noItem = {
        id         : item.id,
        nome       : item.nome + ' (Usado)',
        preco      : item.preco,
        emoji      : item.emoji,
        quantidade : 1,
    };

    const existente = carrinho.find(i => i.id === id);
    if (existente) {
        existente.quantidade++;
    } else {
        carrinho.push(noItem);
    }

    salvarCarrinho();
    atualizarContadorCarrinho();
    pulsarBotaoCarrinho();
    toast(`"${item.nome}" adicionado ao carrinho!`);
}

/* ─────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────── */
/** Retorna o nome legível de uma categoria pelo id */
function nomeDaCategoria(id) {
    return (CATEGORIAS.find(c => c.id === id) || { nome: id }).nome;
}

/** Gera HTML de estrelas (cheias, meia, vazia) */
function buildEstrelas(nota) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(nota))          html += '<i class="fas fa-star"></i>';
        else if (i - nota < 1 && i > nota) html += '<i class="fas fa-star-half-alt"></i>';
        else                                html += '<i class="far fa-star"></i>';
    }
    return html;
}

