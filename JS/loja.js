'use strict';

/* =========================================================
   MEGA DISTRITO — Página da Loja (loja.html?id=<slug>)
   Reaproveita o carrinho compartilhado de JS/script.js
   (carrinho, salvarCarrinho, atualizarContadorCarrinho, toast).
   ========================================================= */

let lojaAtual = null;
let lojaFiltroAtivo = 'todos';

function getSlugDaUrl() {
    return new URLSearchParams(window.location.search).get('id');
}

function isLojaAberta(loja) {
    if (!loja.horario_abre || !loja.horario_fecha) return null;
    const agora = new Date();
    const [ha, ma] = loja.horario_abre.split(':').map(Number);
    const [hf, mf] = loja.horario_fecha.split(':').map(Number);
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    const minutosAbre = ha * 60 + ma;
    const minutosFecha = hf * 60 + mf;
    if (minutosFecha <= minutosAbre) {
        // horário atravessa a meia-noite (ex: drogaria 24h "00:00" - "23:59")
        return minutosAgora >= minutosAbre || minutosAgora < minutosFecha;
    }
    return minutosAgora >= minutosAbre && minutosAgora < minutosFecha;
}

function formatHorario(loja) {
    const abre = (loja.horario_abre || '').slice(0, 5);
    const fecha = (loja.horario_fecha || '').slice(0, 5);
    if (!abre || !fecha) return '';
    return `${abre} — ${fecha}`;
}

function renderHeroLoja(loja) {
    document.title = `${loja.nome} - Mega Distrito`;

    const banner = document.getElementById('loja-hero-banner');
    if (loja.banner_url) banner.style.backgroundImage = `url('${loja.banner_url}')`;
    else banner.style.background = loja.cor_primaria || 'var(--color-primary)';

    const icone = document.getElementById('loja-hero-icon');
    if (loja.icone_url) {
        icone.style.backgroundImage = `url('${loja.icone_url}')`;
    } else {
        icone.style.display = 'flex';
        icone.style.alignItems = 'center';
        icone.style.justifyContent = 'center';
        icone.style.fontSize = '2rem';
        icone.textContent = '🏪';
    }

    document.getElementById('loja-categoria').textContent = loja.categoria || '';
    document.getElementById('loja-nome').textContent = loja.nome;
    document.getElementById('loja-subtitulo').textContent = loja.subtitulo || '';

    const aberta = isLojaAberta(loja);
    const statusEl = document.getElementById('loja-status-aberto');
    if (aberta === null) {
        statusEl.style.display = 'none';
    } else {
        statusEl.textContent = aberta ? 'Aberta agora' : 'Fechada no momento';
        statusEl.className = `loja-status-badge ${aberta ? 'aberta' : 'fechada'}`;
    }

    const enderecoEl = document.getElementById('loja-endereco');
    if (loja.endereco) {
        enderecoEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${loja.endereco}`;
    } else {
        enderecoEl.style.display = 'none';
    }

    const horarioTxt = formatHorario(loja);
    const horarioEl = document.getElementById('loja-horario');
    if (horarioTxt) horarioEl.innerHTML = `<i class="fas fa-clock"></i> ${horarioTxt}`;
    else horarioEl.style.display = 'none';

    const whatsBtn = document.getElementById('loja-whatsapp');
    if (loja.whatsapp) {
        whatsBtn.href = `https://wa.me/55${loja.whatsapp.replace(/\D/g, '')}`;
        whatsBtn.hidden = false;
    }
}

function renderFiltrosLoja(loja) {
    const wrap = document.getElementById('loja-filtros');
    if (!loja.filtros || !loja.filtros.length) {
        wrap.style.display = 'none';
        return;
    }

    const chips = [{ nome: 'Todos', valor: 'todos' }, ...loja.filtros.map(f => ({ nome: f.nome, valor: f.valor }))];
    wrap.innerHTML = chips.map(f => `
        <button type="button" class="loja-filtro-chip ${f.valor === lojaFiltroAtivo ? 'active' : ''}" data-filtro="${f.valor}">
            ${f.nome}
        </button>
    `).join('');

    wrap.querySelectorAll('.loja-filtro-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            lojaFiltroAtivo = btn.dataset.filtro;
            renderFiltrosLoja(loja);
            renderItensLoja(loja);
        });
    });
}

function itemPassaNoFiltro(item, loja) {
    if (lojaFiltroAtivo === 'todos') return true;
    const filtro = (loja.filtros || []).find(f => f.valor === lojaFiltroAtivo);
    if (!filtro) return true;
    const chave = filtro.valor.toLowerCase();
    return (item.categoria || '').toLowerCase().includes(chave) ||
        (item.subcategoria || '').toLowerCase().includes(chave);
}

function buildItemCardHTML(item) {
    const preco = Number(item.preco);
    const modalidades = [item.entrega ? 'Entrega' : '', item.retirada ? 'Retirada' : '']
        .filter(Boolean).join(' + ') || 'Sem modalidade definida';

    const foto = item.foto_url
        ? `<div class="loja-item-photo" style="background-image:url('${item.foto_url}')"></div>`
        : `<div class="loja-item-photo">🛍️</div>`;

    const acao = item.tipo === 'servico'
        ? `<button class="btn btn-outline btn-block" data-action="solicitar" data-id="${item.id}">
               <i class="fab fa-whatsapp"></i> Solicitar
           </button>`
        : `<button class="btn btn-primary btn-block" data-action="adicionar" data-id="${item.id}">
               <i class="fas fa-cart-plus"></i> Adicionar
           </button>`;

    return `
        <article class="loja-item-card" data-id="${item.id}">
            <div style="position:relative;">
                ${foto}
                <span class="loja-item-tipo-badge">${item.tipo === 'servico' ? 'Serviço' : 'Produto'}</span>
            </div>
            <div class="loja-item-body">
                <h3 class="loja-item-nome">${item.nome}</h3>
                ${item.descricao ? `<p class="loja-item-desc">${item.descricao}</p>` : ''}
                <p class="loja-item-preco">${preco > 0 ? brl(preco) : 'Gratuito'}</p>
                <p class="loja-item-modalidades">${modalidades}</p>
                ${acao}
            </div>
        </article>
    `;
}

function renderItensLoja(loja) {
    const grid = document.getElementById('loja-itens-grid');
    const empty = document.getElementById('loja-itens-empty');

    const visiveis = (loja.itens || []).filter(item => itemPassaNoFiltro(item, loja));

    if (!visiveis.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = visiveis.map(buildItemCardHTML).join('');
}

function adicionarItemLojaAoCarrinho(id) {
    const item = (lojaAtual.itens || []).find(i => i.id === id);
    if (!item) return;

    const existente = carrinho.find(i => i.id === item.id);
    if (existente) {
        existente.quantidade++;
    } else {
        carrinho.push({
            id: item.id,
            nome: item.nome,
            preco: Number(item.preco),
            emoji: item.foto_url ? '' : '🛍️',
            quantidade: 1,
        });
    }

    salvarCarrinho();
    atualizarContadorCarrinho();
    pulsarBotaoCarrinho();
    toast(`"${item.nome}" adicionado ao carrinho!`);
}

function solicitarServicoLoja(id) {
    const item = (lojaAtual.itens || []).find(i => i.id === id);
    if (!item) return;

    const msg = encodeURIComponent(`Olá! Vi o serviço "${item.nome}" na loja ${lojaAtual.nome} e gostaria de solicitar.`);
    const numero = (lojaAtual.whatsapp || '').replace(/\D/g, '') || '5521999990000';
    window.open(`https://wa.me/55${numero}?text=${msg}`, '_blank', 'noopener,noreferrer');
}

function bindLojaEventos() {
    document.getElementById('loja-itens-grid').addEventListener('click', event => {
        const btn = event.target.closest('button[data-action]');
        if (!btn) return;
        const id = Number(btn.dataset.id);
        if (btn.dataset.action === 'adicionar') adicionarItemLojaAoCarrinho(id);
        if (btn.dataset.action === 'solicitar') solicitarServicoLoja(id);
    });
}

async function inicializarPaginaLoja() {
    const slug = getSlugDaUrl();
    if (!slug) {
        document.getElementById('loja-carregando').hidden = true;
        document.getElementById('loja-nao-encontrada').hidden = false;
        return;
    }

    const loja = await fetchLojaPorSlug(slug);
    if (!loja || loja.erro) {
        document.getElementById('loja-carregando').hidden = true;
        document.getElementById('loja-nao-encontrada').hidden = false;
        return;
    }

    lojaAtual = loja;
    document.getElementById('loja-carregando').hidden = true;
    document.getElementById('loja-conteudo').hidden = false;

    renderHeroLoja(loja);
    renderFiltrosLoja(loja);
    renderItensLoja(loja);
    bindLojaEventos();
}

document.addEventListener('DOMContentLoaded', inicializarPaginaLoja);
