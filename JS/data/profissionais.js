'use strict';

/* =========================================================
   MEGA DISTRITO — DADOS: PROFISSIONAIS DE SERVIÇOS
   Os perfis (PROFISSIONAIS) vêm da API — ver carregarProfissionais()
   em JS/servicos.js. Aqui fica só configuração visual estática.
   ========================================================= */

// Cores da faixa superior por especialidade
const SERVICO_CORES = {
    construcao : '#795548',
    eletrica   : '#f9a825',
    hidraulica : '#0288d1',
    limpeza    : '#00897b',
    tecnologia : '#5c35a8',
    beleza     : '#e91e63',
    outros     : '#607d8b',
};

/* Fotos de exemplo por especialidade (3 por área) */
const FOTOS_ESPECIALIDADE = {
    construcao: [
        { src: 'https://picsum.photos/seed/const-obra/400/220',   alt: 'Obra de alvenaria' },
        { src: 'https://picsum.photos/seed/const-piso/400/220',   alt: 'Assentamento de pisos e revestimentos' },
        { src: 'https://picsum.photos/seed/const-reform/400/220', alt: 'Reforma residencial concluída' },
    ],
    eletrica: [
        { src: 'https://picsum.photos/seed/elec-painel/400/220',  alt: 'Quadro de distribuição elétrica' },
        { src: 'https://picsum.photos/seed/elec-fio/400/220',     alt: 'Instalação de cabeamentos' },
        { src: 'https://picsum.photos/seed/elec-tomada/400/220',  alt: 'Instalação de tomadas e interruptores' },
    ],
    hidraulica: [
        { src: 'https://picsum.photos/seed/hid-cano/400/220',     alt: 'Encanamento de canos' },
        { src: 'https://picsum.photos/seed/hid-banheiro/400/220', alt: 'Instalação de banheiro' },
        { src: 'https://picsum.photos/seed/hid-caixa/400/220',    alt: 'Caixa d\'água instalada' },
    ],
    limpeza: [
        { src: 'https://picsum.photos/seed/clean-sala/400/220',   alt: 'Limpeza de sala' },
        { src: 'https://picsum.photos/seed/clean-kit/400/220',    alt: 'Cozinha higienizada' },
        { src: 'https://picsum.photos/seed/clean-obra/400/220',   alt: 'Limpeza pós-obra' },
    ],
    tecnologia: [
        { src: 'https://picsum.photos/seed/tech-pc/400/220',      alt: 'Manutenção de computador' },
        { src: 'https://picsum.photos/seed/tech-rede/400/220',    alt: 'Instalação de rede Wi-Fi' },
        { src: 'https://picsum.photos/seed/tech-cftv/400/220',    alt: 'Câmeras CFTV instaladas' },
    ],
    beleza: [
        { src: 'https://picsum.photos/seed/beauty-mani/400/220',  alt: 'Manicure e pedicure' },
        { src: 'https://picsum.photos/seed/beauty-cab/400/220',   alt: 'Corte e coloração' },
        { src: 'https://picsum.photos/seed/beauty-unh/400/220',   alt: 'Alongamento de unhas' },
    ],
    outros: [
        { src: 'https://picsum.photos/seed/outros-jard/400/220',  alt: 'Jardim cuidado' },
        { src: 'https://picsum.photos/seed/outros-serv/400/220',  alt: 'Serviço em andamento' },
        { src: 'https://picsum.photos/seed/outros-res/400/220',   alt: 'Resultado final' },
    ],
};

/* Populado a partir da API no carregamento da página */
let PROFISSIONAIS = [];
