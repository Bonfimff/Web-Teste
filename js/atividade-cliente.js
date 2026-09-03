// Rastreia cliques em tour nas páginas de cidade — alimenta "Ações dos
// Clientes" e o ranking de "Tours mais clicados" em Gerenciamento > Contas.
//
// Usa DELEGAÇÃO DE EVENTO (um único listener em document, em vez de ligar em
// cada card) de propósito: os cards de tour são criados de duas formas
// diferentes (HTML estático da página e cards montados em JS a partir do
// banco — ver createRioTourCardElement em Riodejaneiro.js/site-shell.js), e
// delegação pega os dois sem precisar tocar em nenhum dos dois caminhos de
// criação. Roda por fora da lógica de reserva (não faz preventDefault, não
// depende de nada do fluxo real) — se essa contagem falhar, a reserva em si
// nunca é afetada.
(() => {
    const CIDADE_POR_CAMINHO = [
        [/\/html\/Riodejaneiro\.html/i, 'Rio de Janeiro'],
        [/\/html\/Salvador\.html/i, 'Salvador'],
        [/\/html\/Saolu[ií]sdomaranhao\.html/i, 'Sao Luis'],
        [/\/html\/Lencoismaranhenses\.html/i, 'Lencois'],
    ];

    const cidadeAtual = () => {
        const caminho = window.location.pathname;
        for (const [regex, nome] of CIDADE_POR_CAMINHO) {
            if (regex.test(caminho)) return nome;
        }
        return '';
    };

    const registrar = (tipoAcao, tourNome) => {
        if (!tourNome) return;
        const email = localStorage.getItem('userEmail') || '';
        const apiBaseUrl = window.API_BASE_URL || 'https://api-tour.exksvol.com';
        fetch(`${apiBaseUrl}/registrar_atividade_cliente`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipoAcao, tourNome, cidade: cidadeAtual(), email })
        }).catch(() => {
            // Estatística — falha aqui não pode incomodar quem navega.
        });
    };

    document.addEventListener('click', (event) => {
        const card = event.target.closest?.('.rio-tour-card');
        if (!card) return;
        const tourNome = card.querySelector('.rio-tour-name')?.textContent?.trim();
        if (!tourNome) return;

        if (event.target.closest('.rio-btn-reserve')) {
            registrar('tour_reservar_clique', tourNome);
        } else if (event.target.closest('.rio-link-share')) {
            registrar('tour_compartilhar', tourNome);
        } else if (event.target.closest('.rio-tour-fav')) {
            // Favoritar é registrado pelo servidor, em /toggle_tour_favorito —
            // lá dá pra distinguir favoritar de desfavoritar, o que daqui não
            // dá. Só não pode cair no "viu detalhes" abaixo.
        } else if (!event.target.closest('.rio-link-map')) {
            // Qualquer clique no corpo do card (fora do link do mapa) conta como
            // "viu detalhes" — a própria página já é o "detalhe" do tour, não
            // existe um modal separado de "saiba mais" neste site.
            registrar('tour_visualizar', tourNome);
        }
    });

    // Chegada por link direto (?tour=<id>, o link gerado pelo botão de
    // compartilhar). O card correspondente só ganha data-tour-id depois que os
    // tours voltam do banco (ver fetchToursFromBackend), então o nome do tour
    // não existe no DOM na hora do load — daí observar as mudanças em vez de
    // ler uma vez só. Registra no máximo uma vez por carregamento de página.
    const registrarAcessoPorLink = () => {
        const tourId = new URLSearchParams(window.location.search).get('tour');
        if (!tourId) return;

        let registrado = false;
        const tentar = () => {
            if (registrado) return true;
            const card = document.querySelector(`.rio-tour-card[data-tour-id="${CSS.escape(tourId)}"]`);
            const tourNome = card?.querySelector('.rio-tour-name')?.textContent?.trim();
            if (!tourNome) return false;
            registrado = true;
            registrar('tour_acesso_link', tourNome);
            return true;
        };

        if (tentar()) return;

        const observer = new MutationObserver(() => {
            if (tentar()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        // Rede de segurança: se o tour não existir mais (apagado no admin), o
        // observer ficaria ligado pra sempre.
        setTimeout(() => observer.disconnect(), 15000);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registrarAcessoPorLink);
    } else {
        registrarAcessoPorLink();
    }
})();
