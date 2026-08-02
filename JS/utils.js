'use strict';

/* =========================================================
   MEGA DISTRITO — Utilidades Compartilhadas
   Carregar ANTES de qualquer outro script, em todas as páginas.
   ========================================================= */

/** Formata um número como moeda brasileira (R$) */
function brl(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Remove acentos e converte para minúsculas (para buscas e filtros) */
function normalizar(txt) {
    return (txt || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

/** Converte um DATETIME do backend ("2026-07-10 14:00:00") em texto relativo ("Hoje", "Ontem", "Há 3 dias") */
function tempoRelativo(dataStr) {
    if (!dataStr) return '';
    const data = new Date(dataStr.replace(' ', 'T'));
    if (Number.isNaN(data.getTime())) return '';

    const dias = Math.floor((Date.now() - data.getTime()) / 86400000);
    if (dias <= 0) return 'Hoje';
    if (dias === 1) return 'Ontem';
    return `Há ${dias} dias`;
}

/** Converte um perfil de profissional vindo da API (GET /api/profissionais)
 *  para o formato usado por servicos.js/feed.js (ex: descricao -> desc) */
function mapProfissional(p) {
    return {
        id: p.id,
        nome: p.nome,
        especialidade: p.especialidade,
        ocupacao: p.ocupacao,
        desc: p.descricao || '',
        avaliacao: p.avaliacao ? Number(p.avaliacao) : 0,
        avaliacoes: p.avaliacoes || 0,
        verificado: !!p.verificado,
        disponivel: !!p.disponivel,
        tags: Array.isArray(p.tags) ? p.tags : [],
        bairro: p.bairro || '',
        atende: p.atende || '',
        horario: p.horario || '',
        preco: p.preco ? Number(p.preco) : 0,
        unidade: p.unidade || '',
        telefone: p.telefone || p.telefone_usuario || '',
    };
}

/** Converte uma vaga vinda da API (GET /api/vagas) para o formato usado por servicos.js */
function mapVaga(v) {
    return {
        id: v.id,
        cargo: v.cargo,
        empresa: v.empresa,
        area: v.area,
        regime: v.regime,
        salario: v.salario,
        local: v.local,
        desc: v.descricao || '',
        contato: v.contato,
        publicada: tempoRelativo(v.criado_em),
    };
}

/* ─────────────────────────────────────────────
   TOAST NOTIFICATION — exige um elemento #toast
   ───────────────────────────────────────────── */
let toastTimer = null;
function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}
