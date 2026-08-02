'use strict';

/* =========================================================
   MEGA DISTRITO — Detalhes do Produto
   Modal estilo Mercado Livre: descrição, especificações,
   avaliações, histórico de preço (gráfico) e sugestões.
   Sem backend: especificações, histórico, ofertas de outras
   lojas e avaliações são gerados de forma determinística
   (mesmo produto sempre mostra os mesmos dados na sessão).
   ========================================================= */

const PD_LOJAS_TERCEIRAS = [
    'Ponto Digital Magé', 'Casa & Estilo', 'Center Ferragens',
    'Comercial Boa Vista', 'Magazine Popular', 'Loja Bom Preço',
];

const PD_AUTORES_REVIEW = [
    'Bruno T.', 'Larissa M.', 'Diego S.', 'Camila V.', 'Rodrigo P.', 'Juliana C.', 'Vinícius A.', 'Priscila N.',
];

const PD_COMENTARIOS_POSITIVOS = [
    'Produto excelente, chegou rápido e bem embalado!',
    'Superou minhas expectativas, recomendo demais.',
    'Ótimo custo-benefício, comprem sem medo.',
    'Qualidade muito boa, entrega dentro do prazo.',
    'Já é a segunda vez que compro, sempre impecável.',
];

const PD_COMENTARIOS_NEUTROS = [
    'Bom produto, mas achei o prazo de entrega um pouco longo.',
    'Atende o que promete, nada excepcional.',
    'Cumpre a função, esperava um pouco mais pelo preço.',
];

let pdProdutoAtualId = -1;
let pdAbaAtiva = 'descricao';

/** Gerador pseudo-aleatório determinístico (mesma seed = mesma sequência) */
function pdCriarRng(seed) {
    let estado = (seed * 9301 + 49297) % 233280;
    return function () {
        estado = (estado * 9301 + 49297) % 233280;
        return estado / 233280;
    };
}

function pdEscolher(lista, rng) {
    return lista[Math.floor(rng() * lista.length)];
}

const PD_ESPECS_POR_CATEGORIA = {
    eletronicos: [
        { label: 'Garantia', valor: '12 meses' },
        { label: 'Voltagem', valor: 'Bivolt' },
        { label: 'Procedência', valor: 'Nacional' },
    ],
    casa: [
        { label: 'Material', valor: 'Alumínio / Aço inox' },
        { label: 'Garantia', valor: '6 meses' },
    ],
    ferramentas: [
        { label: 'Voltagem', valor: '220V' },
        { label: 'Garantia', valor: '12 meses' },
    ],
    moda: [
        { label: 'Material', valor: 'Algodão / Poliéster' },
        { label: 'Tamanhos disponíveis', valor: 'P, M, G, GG' },
    ],
};

function gerarEspecificacoes(p) {
    const base = [
        { label: 'Modelo', valor: p.nome },
        { label: 'Categoria', valor: nomeDaCategoria(p.categoria) },
    ];
    return [...base, ...(PD_ESPECS_POR_CATEGORIA[p.categoria] || [])];
}

function gerarDescricaoPadrao(p) {
    return `${p.nome} — um dos itens mais procurados na categoria ${nomeDaCategoria(p.categoria).toLowerCase()} do Mega Distrito. Produto novo, com nota média ${p.avaliacao.toFixed(1)} entre ${p.avaliacoes} clientes que já compraram.`;
}

/** Histórico de 6 meses terminando no preço atual (o último ponto é sempre o preço real) */
function gerarHistoricoPrecos(p) {
    const rng = pdCriarRng(p.id * 7);
    const inicio = p.precoAntigo || p.preco * 1.18;
    const labels = ['há 5 meses', 'há 4 meses', 'há 3 meses', 'há 2 meses', 'mês passado', 'hoje'];
    const total = labels.length;

    return labels.map((label, i) => {
        if (i === total - 1) return { label, preco: p.preco };
        const t = i / (total - 1);
        const base = inicio + (p.preco - inicio) * t;
        const ruido = (rng() - 0.5) * inicio * 0.06;
        const preco = Math.max(p.preco * 0.92, base + ruido);
        return { label, preco: Math.round(preco * 100) / 100 };
    });
}

/** Mesmo produto em 2-3 lojas concorrentes, sempre mais caro que o Mega Distrito */
function gerarOfertasLojas(p) {
    const rng = pdCriarRng(p.id * 13);
    const lojas = [...PD_LOJAS_TERCEIRAS].sort(() => rng() - 0.5).slice(0, 2 + Math.floor(rng() * 2));
    return lojas.map(loja => ({
        loja,
        preco: Math.round(p.preco * (1.05 + rng() * 0.22) * 100) / 100,
    })).sort((a, b) => a.preco - b.preco);
}

function gerarAvaliacoesDemo(p) {
    const rng = pdCriarRng(p.id * 31);
    const quantidade = 3;
    const usados = new Set();
    const avaliacoes = [];

    for (let i = 0; i < quantidade; i += 1) {
        let autor = pdEscolher(PD_AUTORES_REVIEW, rng);
        let tentativas = 0;
        while (usados.has(autor) && tentativas < 10) { autor = pdEscolher(PD_AUTORES_REVIEW, rng); tentativas += 1; }
        usados.add(autor);

        const nota = Math.max(1, Math.min(5, Math.round((p.avaliacao + (rng() - 0.5) * 1.2) * 2) / 2));
        const comentario = nota >= 4.5
            ? pdEscolher(PD_COMENTARIOS_POSITIVOS, rng)
            : pdEscolher(PD_COMENTARIOS_NEUTROS, rng);
        const semanas = 1 + Math.floor(rng() * 10);

        avaliacoes.push({ autor, nota, comentario, data: `há ${semanas} semana${semanas > 1 ? 's' : ''}` });
    }

    return avaliacoes;
}

/** Gráfico de linha simples em SVG (sem dependências externas) */
function buildPriceChartSVG(historico) {
    const largura = 560, altura = 180, padX = 28, padY = 24, padLabel = 16;
    const precos = historico.map(item => item.preco);
    const min = Math.min(...precos);
    const max = Math.max(...precos);
    const range = (max - min) || 1;
    const stepX = (largura - padX * 2) / (historico.length - 1);
    const areaTopo = padY;
    const areaBase = altura - padY - padLabel;

    const pontos = historico.map((item, i) => {
        const x = padX + i * stepX;
        const y = areaTopo + (1 - (item.preco - min) / range) * (areaBase - areaTopo);
        return { x, y, preco: item.preco, label: item.label };
    });

    const linha = pontos.map(pt => `${pt.x},${pt.y}`).join(' ');
    const pontosSVG = pontos.map(pt => `
        <circle cx="${pt.x}" cy="${pt.y}" r="4" fill="#2e7d32">
            <title>${pt.label}: ${brl(pt.preco)}</title>
        </circle>
    `).join('');
    const labelsSVG = pontos.map(pt => `
        <text x="${pt.x}" y="${altura - 4}" font-size="10" fill="#78909c" text-anchor="middle">${pt.label}</text>
    `).join('');

    return `
        <svg viewBox="0 0 ${largura} ${altura}" class="pd-chart-svg" role="img" aria-label="Gráfico de histórico de preço">
            <polyline points="${linha}" fill="none" stroke="#2e7d32" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
            ${pontosSVG}
            ${labelsSVG}
        </svg>
    `;
}

function pdBuscarProduto(id) {
    return PRODUTOS.find(p => p.id === id) || null;
}

const PD_GALERIA_CORES = ['#e3f2fd', '#fff3e0', '#e8f5e9', '#fce4ec'];

/** Simula 3-4 fotos do produto (o catálogo só tem 1 emoji por item) */
function gerarGaleria(p) {
    const rng = pdCriarRng(p.id * 3);
    const total = 3 + Math.floor(rng() * 2);
    return Array.from({ length: total }, (_, i) => ({
        bg: PD_GALERIA_CORES[i % PD_GALERIA_CORES.length],
        indice: i + 1,
        total,
    }));
}

function buildGaleriaHTML(p, slides) {
    return slides.map(s => `
        <div class="pd-gallery-slide" style="background:${s.bg};">
            <div class="pd-gallery-media">
                <span class="pd-gallery-emoji">${p.emoji}</span>
            </div>
            <span class="pd-gallery-count">Foto ${s.indice} de ${s.total}</span>
        </div>
    `).join('');
}

function buildProdutoDetalheHTML(p) {
    const desconto = p.precoAntigo ? Math.round((1 - p.preco / p.precoAntigo) * 100) : 0;
    const precoAntigoHTML = p.precoAntigo ? `<span class="pd-preco-antigo">${brl(p.precoAntigo)}</span>` : '';
    const descontoHTML = desconto >= 5 ? `<span class="pd-desconto">-${desconto}%</span>` : '';
    const parcelas = Math.min(12, Math.max(1, Math.floor(p.preco / 10)));
    const vlrParcela = brl(p.preco / parcelas);
    const freteHTML = p.preco >= 99 ? `<div class="pd-frete"><i class="fas fa-truck"></i> Frete grátis</div>` : '';

    const especificacoes = gerarEspecificacoes(p);
    const historico = gerarHistoricoPrecos(p);
    const ofertas = gerarOfertasLojas(p);
    const avaliacoesList = gerarAvaliacoesDemo(p);
    const similares = PRODUTOS.filter(x => x.categoria === p.categoria && x.id !== p.id).slice(0, 4);

    const especsHTML = especificacoes.map(e => `
        <div class="pd-spec-row"><span>${e.label}</span><strong>${e.valor}</strong></div>
    `).join('');

    const ofertasHTML = ofertas.map(o => `
        <div class="pd-oferta-row">
            <span class="pd-oferta-loja">${o.loja}</span>
            <span class="pd-oferta-preco">${brl(o.preco)}</span>
            <button class="btn btn-outline" type="button" data-action="ver-oferta" data-loja="${o.loja}">Ver oferta</button>
        </div>
    `).join('');

    const reviewsHTML = avaliacoesList.map(r => `
        <div class="pd-review">
            <div class="pd-review-head">
                <strong>${r.autor}</strong>
                <span class="pd-review-nota">${buildEstrelas(r.nota)}</span>
            </div>
            <p>${r.comentario}</p>
            <span class="pd-review-data">${r.data}</span>
        </div>
    `).join('');

    const similaresHTML = similares.map(s => `
        <article class="pd-similar-card" data-action="abrir-similar" data-id="${s.id}">
            <span class="pd-similar-emoji">${s.emoji}</span>
            <strong>${s.nome}</strong>
            <span class="pd-similar-preco">${brl(s.preco)}</span>
        </article>
    `).join('');

    const galeria = gerarGaleria(p);
    const galeriaHTML = buildGaleriaHTML(p, galeria);

    return `
        <div class="pd-layout">
            <div class="pd-gallery">
                ${descontoHTML}
                <div class="pd-gallery-square">
                    <div class="pd-gallery-track">${galeriaHTML}</div>
                </div>
            </div>

            <!-- Bloco 2: informações de compra (nome, preço, frete, adicionar ao carrinho) — fica fixo (sticky) ao rolar -->
            <div class="pd-bloco pd-bloco-compra">
                <span class="pd-categoria">${nomeDaCategoria(p.categoria)}</span>
                <h2 class="pd-nome">${p.nome}</h2>
                <div class="pd-rating">
                    <span class="pd-rating-stars">${buildEstrelas(p.avaliacao)}</span>
                    <span class="pd-rating-valor">${p.avaliacao.toFixed(1)}</span>
                    <span class="pd-rating-count">(${p.avaliacoes} avaliações)</span>
                </div>
                <div class="pd-precos">
                    ${precoAntigoHTML}
                    <div class="pd-preco-atual">${brl(p.preco)}</div>
                    <div class="pd-parcela">em ${parcelas}x ${vlrParcela} sem juros</div>
                    ${freteHTML}
                </div>
                <button class="btn btn-primary btn-block" type="button" data-action="adicionar" data-id="${p.id}">
                    <i class="fas fa-cart-plus"></i> Adicionar ao carrinho
                </button>
            </div>

            <!-- Bloco 3: demais informações (descrição, especificações, avaliações, histórico, outras lojas, similares) -->
            <div class="pd-bloco pd-bloco-info">
                <div class="pd-tabs" role="tablist">
                    <button class="pd-tab active" type="button" role="tab" aria-selected="true" data-pd-tab="descricao">Descrição</button>
                    <button class="pd-tab" type="button" role="tab" aria-selected="false" data-pd-tab="especificacoes">Especificações</button>
                    <button class="pd-tab" type="button" role="tab" aria-selected="false" data-pd-tab="avaliacoes">Avaliações</button>
                    <button class="pd-tab" type="button" role="tab" aria-selected="false" data-pd-tab="historico">Histórico de Preço</button>
                </div>

                <div class="pd-tab-panel active" data-pd-panel="descricao">
                    <p class="pd-descricao">${p.descricao || gerarDescricaoPadrao(p)}</p>
                </div>

                <div class="pd-tab-panel" data-pd-panel="especificacoes">
                    <div class="pd-specs">${especsHTML}</div>
                </div>

                <div class="pd-tab-panel" data-pd-panel="avaliacoes">
                    <div class="pd-reviews">${reviewsHTML}</div>
                </div>

                <div class="pd-tab-panel" data-pd-panel="historico">
                    <div class="pd-chart-wrap">${buildPriceChartSVG(historico)}</div>
                    <p class="pd-chart-caption">Menor preço dos últimos 6 meses: <strong>${brl(Math.min(...historico.map(h => h.preco)))}</strong></p>
                </div>

                <div class="pd-secao">
                    <h4><i class="fas fa-store"></i> Este produto em outras lojas</h4>
                    <div class="pd-ofertas">
                        <div class="pd-oferta-row pd-oferta-atual">
                            <span class="pd-oferta-loja">Mercado Express <span class="pd-oferta-selo">Melhor preço</span></span>
                            <span class="pd-oferta-preco">${brl(p.preco)}</span>
                        </div>
                        ${ofertasHTML}
                    </div>
                </div>

                ${similares.length ? `
                <div class="pd-secao">
                    <h4><i class="fas fa-layer-group"></i> Produtos similares</h4>
                    <div class="pd-similares">${similaresHTML}</div>
                </div>` : ''}
            </div>
        </div>
    `;
}

function abrirDetalheProduto(id) {
    const produto = pdBuscarProduto(id);
    if (!produto) return;

    pdProdutoAtualId = id;
    pdAbaAtiva = 'descricao';

    document.getElementById('pd-content').innerHTML = buildProdutoDetalheHTML(produto);
    document.getElementById('pd-modal').classList.add('open');
    document.body.style.overflow = 'hidden';

    document.getElementById('pd-modal').scrollTo(0, 0);
    document.querySelector('.pd-gallery-track')?.scrollTo(0, 0);
    document.querySelector('.pd-layout')?.scrollTo(0, 0);
}

function fecharDetalheProduto() {
    document.getElementById('pd-modal').classList.remove('open');
    if (!document.getElementById('cart-sidebar')?.classList.contains('open')
        && !document.getElementById('app-drawer')?.classList.contains('open')) {
        document.body.style.overflow = '';
    }
    pdProdutoAtualId = -1;
}

function pdTrocarAba(nomeAba) {
    pdAbaAtiva = nomeAba;
    const content = document.getElementById('pd-content');
    content.querySelectorAll('.pd-tab').forEach(tab => {
        const ativa = tab.dataset.pdTab === nomeAba;
        tab.classList.toggle('active', ativa);
        tab.setAttribute('aria-selected', ativa ? 'true' : 'false');
    });
    content.querySelectorAll('.pd-tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.pdPanel === nomeAba);
    });
}

function bindProdutoDetalhe() {
    const grid = document.getElementById('products-grid');
    if (grid) {
        grid.addEventListener('click', event => {
            const btnAdd = event.target.closest('.btn-add-cart');
            if (btnAdd) return; // deixa o botão "Adicionar" agir normalmente, sem abrir o modal

            const card = event.target.closest('.product-card[data-id]');
            if (!card) return;
            abrirDetalheProduto(Number(card.dataset.id));
        });
    }

    document.getElementById('pd-close')?.addEventListener('click', fecharDetalheProduto);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') fecharDetalheProduto();
    });

    document.getElementById('pd-content')?.addEventListener('click', event => {
        const tab = event.target.closest('.pd-tab');
        if (tab) { pdTrocarAba(tab.dataset.pdTab); return; }

        const btnAdicionar = event.target.closest('[data-action="adicionar"]');
        if (btnAdicionar) {
            adicionarAoCarrinho(Number(btnAdicionar.dataset.id));
            return;
        }

        const btnOferta = event.target.closest('[data-action="ver-oferta"]');
        if (btnOferta) {
            toast(`Redirecionando para "${btnOferta.dataset.loja}" (simulação).`);
            return;
        }

        const similar = event.target.closest('[data-action="abrir-similar"]');
        if (similar) {
            abrirDetalheProduto(Number(similar.dataset.id));
        }
    });
}

document.addEventListener('DOMContentLoaded', bindProdutoDetalhe);
