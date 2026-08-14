// Pré-carrega, a partir do index, as imagens de painel (hero) de cada cidade
// definidas em Gerenciamento > Identidade Visual. Não existe mais imagem
// padrão no CSS: o painel só exibe o que estiver cadastrado no banco, e a URL
// só é conhecida após consultar a API — daí o preload ser feito por aqui.
(() => {
    const apiBase = window.API_BASE_URL || 'https://api-tour.exksvol.com';
    const endpoints = [
        `${apiBase}/get_cidade_visual`,
        'http://127.0.0.1:5000/get_cidade_visual',
        'https://api.exksvol.com/get_cidade_visual'
    ];

    const preloadImage = (url) => {
        if (!url) return;
        const img = new Image();
        img.src = url;
    };

    const preloadCustomPaineis = async () => {
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) continue;
                const lista = await response.json();
                if (!Array.isArray(lista)) continue;
                lista.forEach((visual) => {
                    if (visual?.painel?.modo === 'imagem' && visual.painel.imagem) {
                        preloadImage(visual.painel.imagem);
                    }
                });
                return;
            } catch (error) {
                console.warn('Falha ao pré-carregar identidade visual de painéis em', endpoint, error);
            }
        }
    };

    preloadCustomPaineis();
})();
