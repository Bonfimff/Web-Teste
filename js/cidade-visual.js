// Aplica a identidade visual (logo, painel e fundo) configurada por cidade em
// Gerenciamento > Gerenciamento de página > Identidade Visual. Cada elemento
// pode usar imagem enviada pelo admin, cor sólida ou degradê — se nada foi
// configurado, o CSS de cada cidade já tem seu visual padrão como fallback
// (ver var(--city-painel-bg, ...) / var(--city-fundo-*, ...) no CSS).
(() => {
    const cidade = document.getElementById('relatosGallery')?.dataset.cidade || 'Rio de Janeiro';
    const apiBase = window.API_BASE_URL || 'https://api-tour.exksvol.com';
    const endpoints = [
        `${apiBase}/get_cidade_visual`,
        'http://127.0.0.1:5000/get_cidade_visual',
        'https://api.exksvol.com/get_cidade_visual'
    ];

    // Converte "#rrggbb" + alpha (0-100) em "rgba(r,g,b,a)". Sem isso, a
    // transparência escolhida no admin não teria como ser expressa: cores
    // hexadecimais puras (as que o <input type="color"> produz) não têm canal alfa.
    const hexToRgba = (hex, alphaPercent) => {
        const valor = (hex || '').replace('#', '');
        if (valor.length !== 6) return hex || '';
        const r = parseInt(valor.slice(0, 2), 16);
        const g = parseInt(valor.slice(2, 4), 16);
        const b = parseInt(valor.slice(4, 6), 16);
        const a = Math.max(0, Math.min(100, alphaPercent ?? 100)) / 100;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    };

    const gradientFn = (tipo) => {
        if (tipo === 'radial') return 'radial-gradient(circle, __STOPS__)';
        if (tipo === 'conic') return 'conic-gradient(__STOPS__)';
        return 'linear-gradient(135deg, __STOPS__)';
    };

    const buildGradient = (bloco) => {
        const cor1 = hexToRgba(bloco.cor1, bloco.cor1Alpha);
        const cor2 = hexToRgba(bloco.cor2, bloco.cor2Alpha);
        return gradientFn(bloco.degradeTipo).replace('__STOPS__', `${cor1}, ${cor2}`);
    };

    // Uploads no admin sempre salvam com o mesmo nome de arquivo (custom_logo.png,
    // custom_painel.jpg etc.), então o navegador pode servir uma cópia antiga do
    // cache mesmo depois de um novo upload. Adicionar um parâmetro de cache-busting
    // aqui garante que a imagem mais recente do servidor sempre seja buscada.
    //
    // O valor do "cb" precisa ser ESTÁVEL por sessão de navegação, não um
    // Date.now() novo a cada chamada: js/preload-paineis.js (carregado na
    // página inicial) pré-carrega essa mesma imagem para evitar demora ao
    // entrar na página da cidade, mas só existe ganho se as duas páginas
    // pedirem exatamente a mesma URL — com timestamp sempre diferente a
    // cada load, o preload buscava uma URL que a página da cidade nunca
    // reutilizava, e o cache do navegador nunca batia. sessionStorage faz
    // as duas páginas (mesma aba) concordarem no mesmo valor; ele muda de
    // novo numa sessão/aba nova, então uploads novos do admin ainda
    // aparecem em pouco tempo, sem precisar barrar o cache a cada load.
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

    const backgroundValue = (bloco) => {
        if (!bloco) return '';
        if (bloco.modo === 'solida' && bloco.cor1) {
            return hexToRgba(bloco.cor1, bloco.cor1Alpha);
        }
        if (bloco.modo === 'degrade' && bloco.cor1 && bloco.cor2) {
            return buildGradient(bloco);
        }
        if (bloco.imagem) {
            return `url('${bustCache(bloco.imagem)}') center/cover no-repeat`;
        }
        return '';
    };

    const applyCidadeVisual = (visual) => {
        if (!visual) return;

        if (visual.logo && visual.logo.imagem) {
            const logoUrl = bustCache(visual.logo.imagem);
            document.querySelectorAll('.rio-hero-logo').forEach((img) => {
                img.src = logoUrl;
            });
        }

        const painelBg = backgroundValue(visual.painel);
        if (painelBg) {
            document.documentElement.style.setProperty('--city-painel-bg', painelBg);
            // Salvador e São Luís têm um style="background-image:..." direto no
            // HTML do <section class="rio-hero">, que tem prioridade sobre a
            // var(--city-painel-bg,...) do CSS. Setar aqui via JS (mesmo elemento,
            // mesma propriedade inline) garante que a troca sempre vença.
            document.querySelectorAll('.rio-hero').forEach((el) => {
                el.style.background = painelBg;
            });
        }

        if (visual.fundo) {
            if (visual.fundo.modo === 'solida' && visual.fundo.cor1) {
                document.documentElement.style.setProperty('--city-fundo-cor', hexToRgba(visual.fundo.cor1, visual.fundo.cor1Alpha));
                document.documentElement.style.setProperty('--city-fundo-img', 'none');
            } else if (visual.fundo.modo === 'degrade' && visual.fundo.cor1 && visual.fundo.cor2) {
                document.documentElement.style.setProperty('--city-fundo-img', buildGradient(visual.fundo));
            } else if (visual.fundo.imagem) {
                document.documentElement.style.setProperty('--city-fundo-img', `url('${visual.fundo.imagem}')`);
            }
        }
    };
    window.applyCidadeVisual = (_cidade, visual) => applyCidadeVisual(visual);

    const loadCidadeVisual = async () => {
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) continue;
                const lista = await response.json();
                if (!Array.isArray(lista)) continue;
                const visual = lista.find((item) => item && item.cidade === cidade);
                if (visual) applyCidadeVisual(visual);
                return;
            } catch (error) {
                console.warn('Falha ao carregar identidade visual da cidade em', endpoint, error);
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadCidadeVisual);
    } else {
        loadCidadeVisual();
    }
})();
