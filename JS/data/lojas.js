'use strict';

/* =========================================================
   MEGA DISTRITO — REGISTRO DE LOJAS (ESTABELECIMENTOS)
   ---------------------------------------------------------
   Cada estabelecimento que contrata uma página entra aqui.
   O schema espelha o modelo do painel de gerenciamento
   (GM_DEFAULT em JS/gerenciamento.js) para que, no futuro,
   o painel edite estes dados diretamente e sem tradução.

   A página HTML/loja.html?id=<slug> renderiza a partir
   destes dados. Quando houver backend, este arquivo é
   substituído por uma chamada de API — o schema permanece.
   ========================================================= */

const LOJAS = [
    {
        slug: 'loja-central',
        name: 'Loja Central',
        storeCategory: 'Alimentação',
        subtitle: 'Ofertas e novidades para você',
        address: 'Rua Principal, 123 - Magé',
        addressUrl: 'https://maps.google.com',
        phone: '21999990201',
        whatsapp: '21999990201',
        primary: '#2e7d32',
        accent: '#1565c0',
        banner: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
        card: 'https://images.unsplash.com/photo-1468495244123-6c6f332b7a90?auto=format&fit=crop&w=900&q=80',
        icon: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=200&q=80',
        openTime: '09:00',
        closeTime: '18:00',
        closedDates: [],
        itemCardMode: 'portrait',
        filters: [
            { name: 'Bebidas', value: 'bebidas', manualItems: [] },
            { name: 'Combo', value: 'combo', manualItems: [] },
        ],
        items: [
            {
                type: 'produto',
                name: 'Combo da Casa',
                description: 'Lanche artesanal com bebida e acompanhamento.',
                price: '39,90',
                photo: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80',
                video: '',
                category: 'Alimentação',
                subcategory: 'Combo',
                brand: '',
                qty: '5',
                color: '',
                voltage: '',
                delivery: true,
                pickup: true,
            },
        ],
    },
    {
        slug: 'drogaria-central',
        name: 'Drogaria Central',
        storeCategory: 'Beleza e Saúde',
        subtitle: 'Entrega de remédios para todo o município, 24h',
        address: 'Av. Central, 45 - Centro, Magé',
        addressUrl: 'https://maps.google.com',
        phone: '21999990202',
        whatsapp: '21999990202',
        primary: '#8e24aa',
        accent: '#00897b',
        banner: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80',
        card: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=900&q=80',
        icon: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=200&q=80',
        openTime: '00:00',
        closeTime: '23:59',
        closedDates: [],
        itemCardMode: 'portrait',
        filters: [
            { name: 'Medicamentos', value: 'medicamentos', manualItems: [] },
            { name: 'Higiene', value: 'higiene', manualItems: [] },
        ],
        items: [
            {
                type: 'produto',
                name: 'Dipirona 500mg (20 comprimidos)',
                description: 'Analgésico e antitérmico. Entrega em até 40 minutos.',
                price: '8,90',
                photo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80',
                video: '',
                category: 'Beleza e Saúde',
                subcategory: 'Medicamentos',
                brand: 'Genérico',
                qty: '30',
                color: '',
                voltage: '',
                delivery: true,
                pickup: true,
            },
            {
                type: 'servico',
                name: 'Aferição de Pressão',
                description: 'Serviço gratuito na loja, sem agendamento.',
                price: '0,00',
                photo: 'https://images.unsplash.com/photo-1615486364134-e4e2ce429fa8?auto=format&fit=crop&w=900&q=80',
                video: '',
                category: 'Beleza e Saúde',
                subcategory: 'Serviços',
                brand: '',
                qty: '',
                color: '',
                voltage: '',
                delivery: false,
                pickup: true,
            },
        ],
    },
];

/** Busca uma loja pelo slug (usado por loja.html?id=<slug>) */
function encontrarLoja(slug) {
    return LOJAS.find(l => l.slug === slug) || null;
}
