// Pré-carrega, a partir do index, as imagens de painel (hero) de cada cidade
// definidas em Gerenciamento > Identidade Visual. Não existe mais imagem
// padrão no CSS: o painel só exibe o que estiver cadastrado no banco, e a URL
// só é conhecida após consultar a API — daí o preload ser feito por aqui.
(() => {
    const apiBase = window.API_BASE_URL || 'https://api-tour.exksvol.com';
    // api.exksvol.com não existe (NXDOMAIN) — era só um request garantidamente
    // falho a cada carregamento. O fallback real é o backend local.
    const endpoints = [
        `${apiBase}/get_cidade_visual`,
        'http://127.0.0.1:5000/get_cidade_visual'
    ];

    // Precisa ser IDÊNTICO ao bustCache de js/cidade-visual.js (mesma chave de
    // sessionStorage, mesma lógica): a página da cidade só reaproveita esta
    // pré-busca do navegador se pedir exatamente a mesma URL, "cb=" incluso.
    // Um Date.now() novo aqui geraria uma URL diferente da que a página da
    // cidade pede, e o preload não serviria pra nada.
    const CACHE_BUST_STORAGE_KEY = 'cidadeVisualCacheBust';
    const getCacheBustValue = () => {
        try {
            let valor = sessionStorage.getItem(CACHE_BUST_STORAGE_KEY);
            if (!valor) {
                valor = String(Date.now());
                sessionStorage.setItem(CACHE_BUST_STORAGE_KEY, valor);
            }
            return valor;
        } catch (_e) {
            return String(Date.now());
        }
    };
    const bustCache = (url) => {
        if (!url) return url;
        const separador = url.includes('?') ? '&' : '?';
        return `${url}${separador}cb=${getCacheBustValue()}`;
    };

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
                    if (visual?.painel?.imagem) {
                        preloadImage(bustCache(visual.painel.imagem));
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
