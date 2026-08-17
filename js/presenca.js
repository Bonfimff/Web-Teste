// Sinal de vida de contas logadas nas páginas PÚBLICAS do site (Início e as
// 4 cidades) — a mesma ideia que já existe em Gerenciamento.js, mas as
// páginas públicas não tinham NADA disso, então clientes nunca apareciam
// como online nem tinham "última página" na tabela de Contas.
//
// Compartilhado (em vez de duplicado dentro de auth.js/Riodejaneiro.js/
// site-shell.js) porque é pouca lógica e igual em todas as páginas — só a
// URL/rótulo da própria página muda.
(() => {
    const PAGINA_POR_CAMINHO = [
        [/\/html\/Riodejaneiro\.html/i, 'Rio de Janeiro'],
        [/\/html\/Salvador\.html/i, 'Salvador'],
        [/\/html\/Saolu[ií]sdomaranhao\.html/i, 'São Luís do Maranhão'],
        [/\/html\/Lencoismaranhenses\.html/i, 'Lençóis Maranhenses'],
    ];

    const paginaAtual = () => {
        const caminho = window.location.pathname;
        for (const [regex, nome] of PAGINA_POR_CAMINHO) {
            if (regex.test(caminho)) return nome;
        }
        return 'Início';
    };

    const HEARTBEAT_MS = 45000;

    const enviarPresenca = () => {
        const email = localStorage.getItem('userEmail');
        if (!email) return; // só rastreia contas logadas, nunca visitantes anônimos
        const apiBaseUrl = window.API_BASE_URL || 'https://api-tour.exksvol.com';
        fetch(`${apiBaseUrl}/registrar_presenca`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pagina: paginaAtual() })
        }).catch(() => {
            // Detalhe visual — falha aqui não pode incomodar quem navega.
        });
    };

    const iniciar = () => {
        enviarPresenca();
        setInterval(() => {
            if (!document.hidden) enviarPresenca();
        }, HEARTBEAT_MS);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) enviarPresenca();
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
