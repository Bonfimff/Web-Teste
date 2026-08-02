// Pré-carrega, a partir do index, as imagens de painel (hero) de cada cidade
// que foram customizadas via Gerenciamento > Identidade Visual. As imagens
// padrão (fallback do CSS) já são pré-carregadas via <link rel="preload"> no
// <head> do index.html — este script cobre o caso de imagem customizada pelo
// admin, cuja URL só é conhecida após consultar a API.
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
