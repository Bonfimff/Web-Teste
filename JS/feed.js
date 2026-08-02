'use strict';

/* =========================================================
   MEGA DISTRITO - FEED DE VÍDEOS CURTOS
   Estilo TikTok / Reels: scroll vertical com snap
   ========================================================= */

/* ?? Estado ?? */
let reelFiltro   = 'todos';
let reelCurtidas = _carregarCurtidas();
let REEL_ITENS   = [];
let reelObserver = null;
let reelAtualIdx = 0;

/* ?? Persistência de curtidas ?? */
function _carregarCurtidas() {
    try { return JSON.parse(localStorage.getItem('mage-curtidas') || '{}'); }
    catch { return {}; }
}
function _salvarCurtidas() {
    localStorage.setItem('mage-curtidas', JSON.stringify(reelCurtidas));
}

/* ?? Gradientes por categoria/tipo ?? */
const REEL_GRADIENTS = {
    eletronicos : 'linear-gradient(160deg,#0d1b4b 0%,#1565c0 55%,#1976d2 100%)',
    casa        : 'linear-gradient(160deg,#1b3a1e 0%,#2e7d32 55%,#388e3c 100%)',
    ferramentas : 'linear-gradient(160deg,#3e2723 0%,#5d4037 55%,#795548 100%)',
    moda        : 'linear-gradient(160deg,#560027 0%,#c2185b 55%,#e91e63 100%)',
    outros      : 'linear-gradient(160deg,#1a237e 0%,#283593 55%,#3949ab 100%)',
    // usados
    usado       : 'linear-gradient(160deg,#bf360c 0%,#e64a19 55%,#f57c00 100%)',
    // serviços
    construcao  : 'linear-gradient(160deg,#3e2723 0%,#5d4037 55%,#795548 100%)',
    eletrica    : 'linear-gradient(160deg,#7b4f00 0%,#f9a825 55%,#ffca28 100%)',
    hidraulica  : 'linear-gradient(160deg,#01579b 0%,#0277bd 55%,#0288d1 100%)',
    limpeza     : 'linear-gradient(160deg,#00332e 0%,#00695c 55%,#00897b 100%)',
    tecnologia  : 'linear-gradient(160deg,#1a0050 0%,#4527a0 55%,#5c35a8 100%)',
    beleza      : 'linear-gradient(160deg,#880e4f 0%,#c2185b 55%,#e91e63 100%)',
};

function _gradiente(item) {
    if (item.tipo === 'usado')   return REEL_GRADIENTS.usado;
    if (item.tipo === 'servico') return REEL_GRADIENTS[item.ref.especialidade] || REEL_GRADIENTS.tecnologia;
    return REEL_GRADIENTS[item.ref.categoria] || REEL_GRADIENTS.outros;
}
function _avatarCor(item) {
    if (item.tipo === 'servico') return SERVICO_CORES[item.ref.especialidade] || '#5c35a8';
    if (item.tipo === 'usado')   return '#f57c00';
    return '#2e7d32';
}

/* ?????????????????????????????????????????????
   NORMALIZAÇÃO DOS DADOS
????????????????????????????????????????????? */
function _gerarItens() {
    const itens = [];

    PRODUTOS.forEach(p => itens.push({
        fid       : `produto-${p.id}`,
        tipo      : 'produto',
        titulo    : p.nome,
        desc      : `${nomeDaCategoria(p.categoria)}${p.badge ? ' · ' + p.badge : ''}`,
        preco     : p.preco,
        precoAntigo: p.precoAntigo || null,
        emoji     : p.emoji,
        foto      : null,
        vendedor  : 'Mega Distrito',
        local     : 'Magé - RJ',
        avaliacao : p.avaliacao,
        avaliacoes: p.avaliacoes,
        tags      : [nomeDaCategoria(p.categoria), p.badge].filter(Boolean),
        ref       : p,
    }));

    PRODUTOS_USADOS.forEach(p => itens.push({
        fid       : `usado-${p.id}`,
        tipo      : 'usado',
        titulo    : p.nome,
        desc      : p.desc,
        preco     : p.preco,
        precoAntigo: p.precoOrig,
        emoji     : p.emoji,
        foto      : null,
        vendedor  : p.vendedor,
        local     : p.bairro,
        avaliacao : null,
        avaliacoes: null,
        tags      : [p.condicaoLabel, nomeDaCategoriaBazar(p.categoria)].filter(Boolean),
        ref       : p,
    }));

    PROFISSIONAIS.forEach(p => {
        const fotos = p.fotos || FOTOS_ESPECIALIDADE[p.especialidade] || [];
        itens.push({
            fid       : `servico-${p.id}`,
            tipo      : 'servico',
            titulo    : p.ocupacao,
            desc      : p.desc,
            preco     : p.preco,
            precoAntigo: null,
            emoji     : null,
            foto      : fotos[0]?.src || null,
            vendedor  : p.nome,
            local     : p.bairro,
            avaliacao : p.avaliacao,
            avaliacoes: p.avaliacoes,
            tags      : p.tags,
            ref       : p,
        });
    });

    // Fisher-Yates shuffle para misturar os tipos
    for (let i = itens.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [itens[i], itens[j]] = [itens[j], itens[i]];
    }
    return itens;
}

/* ?????????????????????????????????????????????
   CONSTRUÇÃO DO CARD REEL
????????????????????????????????????????????? */
function _buildReelItem(item, idx) {
    // Garantir contador de curtidas persistido
    const fidN = item.fid + '_n';
    if (reelCurtidas[fidN] === undefined) {
        reelCurtidas[fidN] = Math.floor(Math.random() * 120 + 5);
    }
    const curtido = !!reelCurtidas[item.fid];
    const n       = reelCurtidas[fidN];
    const vendedor = item.vendedor || 'Mega Distrito';
    const local = typeof item.local === 'string' && item.local.trim() ? item.local : 'Magé';
    const titulo = item.titulo || 'Anúncio';
    const desc = item.desc || 'Confira mais detalhes no anúncio.';
    const tags = Array.isArray(item.tags) ? item.tags : [];

    // ?? Background ??
    let bgInner;
    if (item.foto) {
        bgInner = `<img class="reel-bg-img" src="${item.foto}" alt="${item.titulo}" loading="lazy">`;
    } else {
        const grad = _gradiente(item);
        bgInner = `
            <div class="reel-bg-grad" style="background:${grad};position:absolute;inset:0;"></div>
            <div class="reel-bg-particles">
                <div class="reel-particle" style="width:200px;height:200px;left:-50px;top:15%;background:rgba(255,255,255,.07);"></div>
                <div class="reel-particle" style="width:130px;height:130px;right:8%;top:8%;background:rgba(255,255,255,.06);"></div>
                <div class="reel-particle" style="width:90px;height:90px;left:20%;bottom:30%;background:rgba(255,255,255,.05);"></div>
            </div>
            <div class="reel-bg-emoji-wrap">
                <span class="reel-bg-emoji">${item.emoji || '📦'}</span>
            </div>`;
    }

    // ?? Badge desconto ??
    let offPill = '';
    if (item.precoAntigo && item.precoAntigo > item.preco) {
        const pct = Math.round((1 - item.preco / item.precoAntigo) * 100);
        offPill = `<div class="reel-off-pill">-${pct}%</div>`;
    }

    // ?? Rating ??
    const ratingTag = item.avaliacao
        ? `<span class="reel-tipo-badge" style="background:rgba(0,0,0,.35);">⭐ ${item.avaliacao.toFixed(1)}</span>`
        : '';

    // ?? Tipo badge ??
    const tipoCls   = { produto:'rtb-produto', usado:'rtb-usado', servico:'rtb-servico' }[item.tipo];
    const tipoLabel = { produto:'Produto', usado:'Usado', servico:'Serviço' }[item.tipo];

    // ?? Preço ??
    const precoOld = item.precoAntigo && item.precoAntigo > item.preco
        ? `<span class="reel-price-old">${brl(item.precoAntigo)}</span>` : '';
    const unidade  = item.tipo === 'servico'
        ? `<span class="reel-price-unit"> / ${item.ref?.unidade || 'serviço'}</span>` : '';

    // ?? Botão CTA ??
    const ctaCls = { produto:'reel-cta-produto', usado:'reel-cta-usado', servico:'reel-cta-servico' }[item.tipo];
    const ctaTxt = item.tipo === 'servico'
        ? `<i class="fab fa-whatsapp"></i> Contatar`
        : `<i class="fas fa-cart-plus"></i> Carrinho`;
    const ctaFn  = item.tipo === 'servico'
        ? `reelContatar('${item.fid}')`
        : `reelAddCarrinho('${item.fid}')`;

    // ?? Tags ??
    const tagsHTML = tags.slice(0,3)
        .map(t => `<span class="reel-tag">${t}</span>`).join('');

    const avatarCor = _avatarCor(item);
    const inicial   = vendedor.charAt(0).toUpperCase();

    // ?? Indicador swipe (só no primeiro card) ??
    const swipeHint = idx === 0
        ? `<div class="reel-swipe-hint">
               <i class="fas fa-chevron-up"></i>
               <span>Role para ver mais</span>
           </div>` : '';

    return `
    <div class="feed-reel-item" data-fid="${item.fid}" data-idx="${idx}">
        <div class="reel-bg">${bgInner}<div class="reel-bg-shade"></div></div>

        ${offPill}

        <!-- Ações: lado direito -->
        <div class="reel-actions">
            <div class="reel-action-item">
                <button class="reel-action-btn reel-like-btn ${curtido ? 'curtido' : ''}"
                        id="rlike-${item.fid}"
                        onclick="reelCurtir('${item.fid}', event)"
                        aria-label="Curtir">
                    <i class="${curtido ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <span class="reel-action-label" id="rlikeN-${item.fid}">${n}</span>
            </div>
            <div class="reel-action-item">
                <button class="reel-action-btn reel-cart-btn" onclick="${ctaFn}" aria-label="Ação principal">
                    ${item.tipo === 'servico'
                        ? '<i class="fab fa-whatsapp"></i>'
                        : '<i class="fas fa-shopping-cart"></i>'}
                </button>
                <span class="reel-action-label">${item.tipo === 'servico' ? 'Contato' : 'Carrinho'}</span>
            </div>
            <div class="reel-action-item">
                <button class="reel-action-btn reel-ver-btn" onclick="reelVerAnuncio('${item.fid}')" aria-label="Ver anúncio">
                    <i class="fas fa-expand-alt"></i>
                </button>
                <span class="reel-action-label">Ver mais</span>
            </div>
        </div>

        <!-- Informações inferiores -->
        <div class="reel-info">
            <div class="reel-tipo-row">
                <span class="reel-tipo-badge ${tipoCls}">${tipoLabel}</span>
                ${ratingTag}
            </div>
            <div class="reel-seller-row">
                <div class="reel-avatar" style="background:${avatarCor};">${inicial}</div>
                <span class="reel-seller-name">${vendedor}</span>
                <span class="reel-local"><i class="fas fa-map-marker-alt"></i> ${local.split(',')[0]}</span>
            </div>
            <h3 class="reel-title">${titulo}</h3>
            <p class="reel-desc">${desc}</p>
            <div class="reel-tags">${tagsHTML}</div>
            <div class="reel-price-row">
                <div class="reel-price-block">
                    ${precoOld}
                    <span class="reel-price-main">${brl(item.preco)}${unidade}</span>
                </div>
                <button class="reel-cta-btn ${ctaCls}" onclick="${ctaFn}">${ctaTxt}</button>
            </div>
        </div>

        ${swipeHint}
    </div>`;
}

function renderReel() {
    const container = document.getElementById('feed-reel-container');
    if (!container) return;

    const lista = reelFiltro === 'todos'
        ? REEL_ITENS
        : REEL_ITENS.filter(i => i.tipo === reelFiltro);

    if (lista.length === 0) {
        container.innerHTML = `
            <div class="feed-reel-item" style="align-items:center;justify-content:center;flex-direction:column;gap:14px;">
                <i class="fas fa-box-open" style="font-size:52px;color:rgba(255,255,255,.4);"></i>
                <p style="color:rgba(255,255,255,.6);font-size:15px;font-weight:600;">Nenhum item encontrado</p>
            </div>`;
        return;
    }

    container.innerHTML = lista.map(_buildReelItem).join('');
    container.scrollTop = 0;
    reelAtualIdx = 0;
    _atualizarCounter(0, lista.length);
    _salvarCurtidas();

    // Ativar primeiro card imediatamente
    const primeiro = container.querySelector('.feed-reel-item');
    if (primeiro) primeiro.classList.add('active');

    _bindObserver();
}

/* ?????????????????????????????????????????????
   INTERSECTION OBSERVER (card ativo)
????????????????????????????????????????????? */
function _bindObserver() {
    if (reelObserver) reelObserver.disconnect();

    const container = document.getElementById('feed-reel-container');
    if (!container) return;

    reelObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
                document.querySelectorAll('.feed-reel-item.active')
                    .forEach(el => el.classList.remove('active'));
                entry.target.classList.add('active');

                const idx   = parseInt(entry.target.dataset.idx || '0');
                reelAtualIdx = idx;
                const total = document.querySelectorAll('.feed-reel-item').length;
                _atualizarCounter(idx, total);
            }
        });
    }, { root: container, threshold: 0.55 });

    container.querySelectorAll('.feed-reel-item').forEach(el => reelObserver.observe(el));
}

function reelCurtir(fid, event) {
    reelCurtidas[fid] = !reelCurtidas[fid];
    const delta = reelCurtidas[fid] ? 1 : -1;
    const fidN  = fid + '_n';
    reelCurtidas[fidN] = Math.max(0, (reelCurtidas[fidN] || 0) + delta);
    _salvarCurtidas();

    const btn   = document.getElementById(`rlike-${fid}`);
    const count = document.getElementById(`rlikeN-${fid}`);
    if (!btn) return;

    const ativo = !!reelCurtidas[fid];
    btn.classList.toggle('curtido', ativo);
    btn.querySelector('i').className = ativo ? 'fas fa-heart' : 'far fa-heart';
    if (count) count.textContent = reelCurtidas[fidN];

    // Animação pulso no botão
    btn.style.transform = 'scale(1.5)';
    setTimeout(() => btn.style.transform = '', 200);

    // Coração flutuante
    if (ativo && event) {
        const rect = btn.getBoundingClientRect();
        const h    = document.createElement('div');
        h.className   = 'floating-heart';
        h.textContent = '❤️';
        h.style.cssText = `left:${rect.left}px;top:${rect.top}px;`;
        document.body.appendChild(h);
        setTimeout(() => h.remove(), 950);
    }
}

function reelAddCarrinho(fid) {
    const item = REEL_ITENS.find(i => i.fid === fid);
    if (!item) return;
    if (item.tipo === 'usado') {
        adicionarBazarAoCarrinho(item.ref.id);
    } else {
        adicionarAoCarrinho(item.ref.id);
    }
}

function reelContatar(fid) {
    const item = REEL_ITENS.find(i => i.fid === fid);
    if (!item || !item.ref.telefone) return;
    const msg = encodeURIComponent(
        `Olá! Vi seu perfil no Mega Distrito e gostaria de contratar: ${item.ref.ocupacao}.`
    );
    window.open(`https://wa.me/55${item.ref.telefone}?text=${msg}`, '_blank', 'noopener,noreferrer');
}

function reelVerAnuncio(fid) {
    const item  = REEL_ITENS.find(i => i.fid === fid);
    if (!item) return;

    const modal = document.getElementById('feed-modal');
    const body  = document.getElementById('feed-modal-body');
    if (!modal || !body) return;

    // Mídia
    let mediaHTML;
    if (item.foto) {
        mediaHTML = `<div class="feed-modal-media-wrap"><img src="${item.foto}" alt="${item.titulo}"></div>`;
    } else {
        mediaHTML = `<div class="feed-modal-media-wrap">${item.emoji || '📦'}</div>`;
    }

    // Preço
    const precoOld = item.precoAntigo && item.precoAntigo > item.preco
        ? `<span class="feed-modal-preco-old">De ${brl(item.precoAntigo)}</span>` : '';
    const unidade  = item.tipo === 'servico' ? ` / ${item.ref.unidade}` : '';
    const precoCls = item.tipo === 'servico' ? 'servico-cor' : '';

    // Meta
    const ratingRow   = item.avaliacao
        ? `<div class="feed-modal-meta-row"><i class="fas fa-star" style="color:#f9a825;"></i>${item.avaliacao.toFixed(1)} • ${item.avaliacoes} avaliações</div>` : '';
    const horarioRow  = item.tipo === 'servico' && item.ref.horario
        ? `<div class="feed-modal-meta-row"><i class="fas fa-clock"></i>${item.ref.horario}</div>` : '';
    const atendeRow   = item.tipo === 'servico' && item.ref.atende
        ? `<div class="feed-modal-meta-row"><i class="fas fa-route"></i>Atende: ${item.ref.atende}</div>` : '';
    const condicaoRow = item.tipo === 'usado'
        ? `<div class="feed-modal-meta-row"><i class="fas fa-info-circle"></i>Condição: ${item.ref.condicaoLabel}</div>` : '';

    const tagsHTML = item.tags.map(t => `<span class="feed-modal-tag">${t}</span>`).join('');

    // Botão ação
    let btnAcao;
    if (item.tipo === 'servico') {
        btnAcao = `<button class="btn btn-primary"
                        style="background:#5c35a8;border-color:#5c35a8;"
                        onclick="reelContatar('${fid}'); fecharReelModal();">
                       <i class="fab fa-whatsapp"></i> WhatsApp
                   </button>`;
    } else {
        btnAcao = `<button class="btn btn-primary"
                        onclick="reelAddCarrinho('${fid}'); fecharReelModal();">
                       <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                   </button>`;
    }

    const curtidoNow = !!reelCurtidas[fid];

    body.innerHTML = `
        <div class="feed-modal-drag"></div>
        ${mediaHTML}
        <div class="feed-modal-inner">
            <div class="feed-modal-top">
                <h2 class="feed-modal-titulo">${item.titulo}</h2>
                <button class="feed-modal-fechar" onclick="fecharReelModal()" aria-label="Fechar">×</button>
            </div>
            ${precoOld}
            <div class="feed-modal-preco ${precoCls}">${brl(item.preco)}${unidade ? `<span style="font-size:14px;font-weight:400;color:#888;">${unidade}</span>` : ''}</div>
            <div class="feed-modal-meta">
                <div class="feed-modal-meta-row"><i class="fas fa-user"></i>${item.vendedor}</div>
                <div class="feed-modal-meta-row"><i class="fas fa-map-marker-alt"></i>${item.local}</div>
                ${ratingRow}${horarioRow}${atendeRow}${condicaoRow}
            </div>
            <p class="feed-modal-descricao">${item.desc}</p>
            <div class="feed-modal-tags">${tagsHTML}</div>
            <div class="feed-modal-acoes">
                <button class="btn btn-outline" id="modal-like-btn"
                        onclick="reelCurtir('${fid}', null); _syncModalLike('${fid}')">
                    <i class="${curtidoNow ? 'fas' : 'far'} fa-heart"></i>
                    ${curtidoNow ? 'Curtido' : 'Curtir'}
                </button>
                ${btnAcao}
            </div>
        </div>`;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function _syncModalLike(fid) {
    const curtido = !!reelCurtidas[fid];
    const btn = document.getElementById('modal-like-btn');
    if (btn) btn.innerHTML = `<i class="${curtido ? 'fas' : 'far'} fa-heart"></i> ${curtido ? 'Curtido' : 'Curtir'}`;
}

function fecharReelModal() {
    const modal = document.getElementById('feed-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
}

/* ?? Contador de posição ?? */
function _atualizarCounter(idx, total) {
    const el = document.getElementById('reel-counter');
    if (el) el.textContent = `${idx + 1} / ${total}`;
}

/* ?????????????????????????????????????????????
   FILTROS
????????????????????????????????????????????? */
function bindReelFiltros() {
    document.querySelectorAll('.reel-tabbar button').forEach(btn => {
        btn.addEventListener('click', () => {
            reelFiltro = btn.dataset.feedFiltro;
            document.querySelectorAll('.reel-tabbar button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderReel();
        });
    });
}

/* ?????????????????????????????????????????????
   INICIALIZAÇÃO
????????????????????????????????????????????? */
/* O layout do feed é fixado abaixo do header; como a altura do
   header varia (busca quebra de linha no mobile), medimos a real. */
function _ajustarAlturaHeader() {
    const header = document.getElementById('header');
    if (header) {
        document.body.style.setProperty('--feed-header-h', header.offsetHeight + 'px');
    }
}

async function _carregarProfissionaisParaFeed() {
    const profissionais = await fetchProfissionais();
    if (profissionais) PROFISSIONAIS = profissionais.map(mapProfissional);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!document.getElementById('feed-reel-container')) return;

    _ajustarAlturaHeader();
    window.addEventListener('resize', _ajustarAlturaHeader);

    await Promise.all([carregarVitrine(), _carregarProfissionaisParaFeed()]);

    REEL_ITENS = _gerarItens();
    renderReel();
    bindReelFiltros();

    // Fechar modal ao clicar no overlay
    const modal = document.getElementById('feed-modal');
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) fecharReelModal(); });

    // Fechar com Escape
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharReelModal(); });
});


