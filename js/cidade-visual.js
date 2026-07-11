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

    const backgroundValue = (bloco) => {
        if (!bloco) return '';
        if (bloco.modo === 'solida' && bloco.cor1) {
            return hexToRgba(bloco.cor1, bloco.cor1Alpha);
        }
        if (bloco.modo === 'degrade' && bloco.cor1 && bloco.cor2) {
            return buildGradient(bloco);
        }
        if (bloco.imagem) {
            return `url('${bloco.imagem}') center/cover no-repeat`;
        }
        return '';
    };

    const applyCidadeVisual = (visual) => {
        if (!visual) return;

        if (visual.logo && visual.logo.imagem) {
            document.querySelectorAll('.rio-hero-logo').forEach((img) => {
                img.src = visual.logo.imagem;
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
