// Módulo compartilhado: curtidas na galeria de relatos de clientes + comentários/avaliações por tour.
// Usado pelas 4 páginas de cidade (Rio, Lençóis, São Luís, Salvador).
(function () {
    'use strict';

    // Não reaproveita window.apiFetch: aquele wrapper lança exceção em respostas
    // não-2xx (ex.: 403/409 de validação de negócio) e descarta o corpo JSON com
    // a mensagem real do backend. Aqui sempre devolvemos o JSON, seja qual for o
    // status, para exibir a mensagem de erro correta ao usuário.
    const apiFetch = async (path, options) => {
        const base = window.API_BASE_URL || '';
        const url = path.startsWith('http') ? path : `${base}${path}`;
        const response = await fetch(url, options);
        const text = await response.text();
        try {
            return text ? JSON.parse(text) : null;
        } catch (_e) {
            return null;
        }
    };

    const getCurrentUserEmail = () => (localStorage.getItem('userEmail') || '').trim();

    const notify = (message, type) => {
        if (typeof window.showGlobalNotification === 'function') {
            window.showGlobalNotification(message, type || 'info');
        } else {
            alert(message);
        }
    };

    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        try {
            return new Date(iso).toLocaleDateString('pt-BR');
        } catch (_e) {
            return '';
        }
    };

    const renderStars = (nota) => {
        const n = Math.max(0, Math.min(5, Math.round(nota || 0)));
        return '★'.repeat(n) + '☆'.repeat(5 - n);
    };

    // ─── Curtidas na galeria de relatos de clientes (#relatosGallery) ────
    // Fotos fixas de depoimentos, sem vínculo com um tour; chaveadas por
    // cidade + data-photo-id de cada <figure class="rio-relatos-item">.

    function initRelatosLikes(cidade) {
        const gallery = document.getElementById('relatosGallery');
        if (!gallery || !cidade) return;

        const items = Array.from(gallery.querySelectorAll('.rio-relatos-item[data-photo-id]'));
        if (!items.length) return;

        const fotoIds = items.map((item) => item.dataset.photoId);
        const email = getCurrentUserEmail();
        const qs = new URLSearchParams({ cidade, fotos: fotoIds.join(',') });
        if (email) qs.set('email', email);

        apiFetch(`/get_relato_curtidas?${qs.toString()}`, { method: 'GET' })
            .then((state) => {
                if (!state || !state.success) return;
                items.forEach((item) => {
                    const fotoId = item.dataset.photoId;
                    const countEl = item.querySelector('.rio-relatos-like-count');
                    const likeBtn = item.querySelector('.rio-relatos-like');
                    if (!countEl || !likeBtn) return;
                    countEl.textContent = String((state.contagem && state.contagem[fotoId]) || 0);
                    likeBtn.classList.toggle('is-liked', Array.isArray(state.curtidas_por_mim) && state.curtidas_por_mim.includes(fotoId));
                });
            })
            .catch((err) => console.warn('Erro ao carregar curtidas dos relatos', cidade, err));

        items.forEach((item) => {
            const fotoId = item.dataset.photoId;
            const likeBtn = item.querySelector('.rio-relatos-like');
            const countEl = item.querySelector('.rio-relatos-like-count');
            if (!fotoId || !likeBtn || !countEl) return;

            likeBtn.addEventListener('click', async () => {
                const currentEmail = getCurrentUserEmail();
                if (!currentEmail) {
                    notify('Faça login para curtir uma foto.', 'error');
                    return;
                }
                likeBtn.disabled = true;
                try {
                    const result = await apiFetch('/toggle_relato_curtida', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: currentEmail, cidade, foto_id: fotoId })
                    });
                    if (result && result.success) {
                        countEl.textContent = String(result.total);
                        likeBtn.classList.toggle('is-liked', !!result.curtido);
                        if (result.curtido) {
                            likeBtn.classList.add('just-liked');
                            setTimeout(() => likeBtn.classList.remove('just-liked'), 400);
                        }
                    } else {
                        notify((result && result.message) || 'Erro ao curtir foto.', 'error');
                    }
                } catch (err) {
                    console.error('Erro ao curtir foto de relato', err);
                    notify('Erro de conexão ao curtir foto.', 'error');
                } finally {
                    likeBtn.disabled = false;
                }
            });
        });
    }

    // ─── Comentários / avaliações ────────────────────────────────────────

    const STATUS_BADGE = {
        pendente: '<span class="tour-comment-status tour-comment-status-pendente">Em análise</span>',
        rejeitado: '<span class="tour-comment-status tour-comment-status-rejeitado">Não aprovado</span>'
    };

    const MAX_FOTOS_AVALIACAO = 10;

    function renderCommentFotos(fotos) {
        if (!Array.isArray(fotos) || !fotos.length) return '';
        const fotosAttr = escapeHtml(JSON.stringify(fotos));
        return `
            <div class="tour-comment-fotos">
                ${fotos.map((url, idx) => `<img src="${escapeHtml(url)}" alt="Foto da avaliação" loading="lazy" data-fotos="${fotosAttr}" data-foto-index="${idx}" />`).join('')}
            </div>
        `;
    }

    // ─── Lightbox: expandir e navegar entre as fotos de uma avaliação ─────

    let lightboxFotos = [];
    let lightboxIndex = 0;

    function updateLightboxImage() {
        const lightbox = document.getElementById('tourFotoLightbox');
        if (!lightbox) return;
        lightboxIndex = ((lightboxIndex % lightboxFotos.length) + lightboxFotos.length) % lightboxFotos.length;
        const img = lightbox.querySelector('.tour-foto-lightbox-img');
        const counter = lightbox.querySelector('.tour-foto-lightbox-counter');
        img.src = lightboxFotos[lightboxIndex];
        counter.textContent = `${lightboxIndex + 1} / ${lightboxFotos.length}`;
        const isSingle = lightboxFotos.length <= 1;
        lightbox.querySelector('.tour-foto-lightbox-prev').hidden = isSingle;
        lightbox.querySelector('.tour-foto-lightbox-next').hidden = isSingle;
    }

    function openLightbox(fotos, startIndex) {
        lightboxFotos = fotos;
        lightboxIndex = startIndex;

        let lightbox = document.getElementById('tourFotoLightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'tourFotoLightbox';
            lightbox.className = 'tour-foto-lightbox';
            lightbox.setAttribute('role', 'dialog');
            lightbox.setAttribute('aria-label', 'Foto da avaliação');
            lightbox.innerHTML = `
                <button type="button" class="tour-foto-lightbox-close" aria-label="Fechar">&times;</button>
                <button type="button" class="tour-foto-lightbox-prev" aria-label="Foto anterior">&lsaquo;</button>
                <img class="tour-foto-lightbox-img" alt="Foto da avaliação em tamanho ampliado" />
                <button type="button" class="tour-foto-lightbox-next" aria-label="Próxima foto">&rsaquo;</button>
                <span class="tour-foto-lightbox-counter"></span>
            `;
            const close = () => { lightbox.classList.remove('open'); };
            lightbox.querySelector('.tour-foto-lightbox-close').addEventListener('click', close);
            lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
            lightbox.querySelector('.tour-foto-lightbox-prev').addEventListener('click', () => {
                lightboxIndex -= 1;
                updateLightboxImage();
            });
            lightbox.querySelector('.tour-foto-lightbox-next').addEventListener('click', () => {
                lightboxIndex += 1;
                updateLightboxImage();
            });
            document.addEventListener('keydown', (e) => {
                if (!lightbox.classList.contains('open')) return;
                if (e.key === 'Escape') close();
                if (e.key === 'ArrowLeft') { lightboxIndex -= 1; updateLightboxImage(); }
                if (e.key === 'ArrowRight') { lightboxIndex += 1; updateLightboxImage(); }
            });
            document.body.appendChild(lightbox);
        }

        updateLightboxImage();
        lightbox.classList.add('open');
    }

    document.addEventListener('click', (event) => {
        const img = event.target.closest('.tour-comment-fotos img[data-fotos]');
        if (!img) return;
        try {
            const fotos = JSON.parse(img.dataset.fotos);
            openLightbox(fotos, Number(img.dataset.fotoIndex) || 0);
        } catch (_e) {
            // ignore
        }
    });

    async function uploadComentarioFotos(email, comentarioId, files) {
        for (const file of files) {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('comentario_id', comentarioId);
            formData.append('imagem', file);
            try {
                await apiFetch('/upload_comentario_imagem', { method: 'POST', body: formData });
            } catch (err) {
                console.error('Erro ao enviar foto da avaliação', err);
            }
        }
    }

    async function renderCommentsPanel(container, tourId) {
        container.innerHTML = '<p class="tour-comments-loading">Carregando avaliações...</p>';
        try {
            const email = getCurrentUserEmail();
            const qs = email ? `?email=${encodeURIComponent(email)}` : '';
            const data = await apiFetch(`/get_tour_comentarios/${tourId}${qs}`, { method: 'GET' });
            if (!data || !data.success) throw new Error('Falha ao carregar comentários');

            const mediaLabel = data.media_nota != null
                ? `${renderStars(data.media_nota)} ${Number(data.media_nota).toFixed(1)} · ${data.total} avaliação${data.total === 1 ? '' : 'ões'}`
                : 'Ainda sem avaliações';

            const listHtml = data.comentarios.length
                ? data.comentarios.map((c) => `
                    <li class="tour-comment-item">
                        <div class="tour-comment-header">
                            <strong>${escapeHtml(c.usuario_nome)}</strong>
                            ${c.nota ? `<span class="tour-comment-stars">${renderStars(c.nota)}</span>` : ''}
                            ${STATUS_BADGE[c.status] || ''}
                        </div>
                        <p class="tour-comment-text">${escapeHtml(c.comentario)}</p>
                        ${renderCommentFotos(c.fotos)}
                        <span class="tour-comment-date">${formatDate(c.criado_em)}</span>
                    </li>
                `).join('')
                : '<li class="tour-comment-empty">Seja o primeiro a avaliar este tour.</li>';

            let formOrHint;
            if (!email) {
                formOrHint = '<p class="tour-comment-login-hint">Faça login para avaliar este tour (disponível para quem já realizou uma reserva finalizada).</p>';
            } else if (data.ja_avaliou) {
                formOrHint = '<p class="tour-comment-login-hint">Você já avaliou este tour. Obrigado pelo retorno!</p>';
            } else if (!data.pode_avaliar) {
                formOrHint = '<p class="tour-comment-login-hint">Você só pode avaliar tours que já realizou (reserva finalizada).</p>';
            } else {
                formOrHint = `
                    <form class="tour-comment-form">
                        <div class="tour-comment-rating" data-value="0">
                            ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="tour-comment-star" data-value="${n}">☆</button>`).join('')}
                        </div>
                        <textarea class="tour-comment-input" placeholder="Conte como foi sua experiência..." required></textarea>
                        <label class="tour-comment-fotos-label">
                            Anexar fotos (opcional, até ${MAX_FOTOS_AVALIACAO})
                            <button type="button" class="tour-comment-fotos-btn"><i class="fa fa-camera"></i> Escolher fotos</button>
                            <input type="file" class="tour-comment-fotos-input" accept="image/*" multiple hidden />
                        </label>
                        <div class="tour-comment-fotos-preview"></div>
                        <label class="tour-comment-publico-toggle">
                            <input type="checkbox" class="tour-comment-publico-input" checked />
                            Deixar esta avaliação pública
                        </label>
                        <p class="tour-comment-publico-hint">Sua avaliação será exibida publicamente para outros visitantes. Desmarque a opção acima se preferir que ela fique privada (visível só para você e para nossa equipe).</p>
                        <button type="submit" class="btn-book tour-comment-submit">Enviar avaliação</button>
                    </form>
                `;
            }

            container.innerHTML = `
                <div class="tour-comments-summary">${mediaLabel}</div>
                <ul class="tour-comments-list">${listHtml}</ul>
                ${formOrHint}
            `;

            const form = container.querySelector('.tour-comment-form');
            if (!form) return;

            const ratingEl = form.querySelector('.tour-comment-rating');
            ratingEl.querySelectorAll('.tour-comment-star').forEach((star) => {
                star.addEventListener('click', () => {
                    const value = Number(star.dataset.value);
                    ratingEl.dataset.value = String(value);
                    ratingEl.querySelectorAll('.tour-comment-star').forEach((s) => {
                        s.textContent = Number(s.dataset.value) <= value ? '★' : '☆';
                    });
                });
            });

            const fotosInput = form.querySelector('.tour-comment-fotos-input');
            const fotosPreview = form.querySelector('.tour-comment-fotos-preview');
            const fotosBtn = form.querySelector('.tour-comment-fotos-btn');
            fotosBtn.addEventListener('click', () => fotosInput.click());
            fotosInput.addEventListener('change', () => {
                if (fotosInput.files.length > MAX_FOTOS_AVALIACAO) {
                    notify(`Você pode anexar no máximo ${MAX_FOTOS_AVALIACAO} fotos.`, 'error');
                    fotosInput.value = '';
                    fotosPreview.innerHTML = '';
                    return;
                }
                fotosPreview.innerHTML = Array.from(fotosInput.files || [])
                    .map((file) => `<img src="${URL.createObjectURL(file)}" alt="Prévia da foto selecionada" />`)
                    .join('');
            });

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const comentario = form.querySelector('.tour-comment-input').value.trim();
                const nota = Number(ratingEl.dataset.value) || null;
                const publico = form.querySelector('.tour-comment-publico-input').checked;
                if (!comentario) return;
                if (!nota) {
                    notify('Selecione ao menos 1 estrela para enviar a avaliação.', 'error');
                    return;
                }

                const submitBtn = form.querySelector('.tour-comment-submit');
                submitBtn.disabled = true;
                try {
                    const result = await apiFetch('/add_tour_comentario', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, tour_id: tourId, comentario, nota, publico })
                    });
                    if (result && result.success) {
                        const files = Array.from(fotosInput.files || []).slice(0, MAX_FOTOS_AVALIACAO);
                        if (files.length) {
                            await uploadComentarioFotos(email, result.comentario.id, files);
                        }
                        notify(result.message || 'Avaliação enviada. Obrigado!', 'success');
                        renderCommentsPanel(container, tourId);
                    } else {
                        notify((result && result.message) || 'Erro ao enviar avaliação.', 'error');
                    }
                } catch (err) {
                    console.error('Erro ao enviar comentário do tour', err);
                    notify('Erro de conexão ao enviar avaliação.', 'error');
                } finally {
                    submitBtn.disabled = false;
                }
            });
        } catch (err) {
            console.error('Erro ao carregar comentários do tour', err);
            container.innerHTML = '<p class="tour-comments-error">Não foi possível carregar as avaliações agora.</p>';
        }
    }

    // tourId -> { card, toggleBtn, panel }, para permitir abrir o painel de
    // avaliação de um tour específico a partir de fora (ex.: Minhas Reservas).
    const panelsByTourId = new Map();

    function attachCommentsToggle(card, tourId) {
        if (!tourId || !card || card.dataset.commentsAttached === 'true') return;
        const actions = card.querySelector('.rio-tour-actions');
        if (!actions) return;

        card.dataset.commentsAttached = 'true';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'rio-link-map tour-comments-toggle';
        toggleBtn.innerHTML = '<i class="fa fa-comment"></i> Avaliações';

        const panel = document.createElement('div');
        panel.className = 'tour-comments-panel';
        panel.hidden = true;

        let loaded = false;
        const openPanel = () => {
            panel.hidden = false;
            if (!loaded) {
                loaded = true;
                renderCommentsPanel(panel, tourId);
            }
        };
        toggleBtn.addEventListener('click', () => {
            if (panel.hidden) {
                openPanel();
            } else {
                panel.hidden = true;
            }
        });

        actions.appendChild(toggleBtn);
        actions.insertAdjacentElement('afterend', panel);

        panelsByTourId.set(String(tourId), { card, toggleBtn, panel, openPanel });
    }

    // Abre (se ainda fechado) e rola até o painel de avaliação de um tour,
    // usado pelo botão "Avaliar" em Minhas Reservas e pelo aviso pós-tour.
    function openReviewPanel(tourId) {
        const entry = panelsByTourId.get(String(tourId));
        if (!entry) return false;
        if (entry.panel.hidden) entry.openPanel();
        entry.card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
    }

    // Aviso não-bloqueante (não usa alert/confirm) perguntando se o cliente
    // quer avaliar um tour finalizado. Some sozinho ao escolher qualquer opção.
    function showReviewPromptBanner({ tourName, onAccept, onDismiss }) {
        document.getElementById('tourReviewPromptBanner')?.remove();

        const banner = document.createElement('div');
        banner.id = 'tourReviewPromptBanner';
        banner.className = 'tour-review-prompt';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Avaliar tour concluído');
        banner.innerHTML = `
            <p class="tour-review-prompt-text">Você concluiu o tour <strong>${escapeHtml(tourName)}</strong>! Gostaria de avaliar sua experiência?</p>
            <div class="tour-review-prompt-actions">
                <button type="button" class="tour-review-prompt-yes">Sim</button>
                <button type="button" class="tour-review-prompt-no">Não</button>
            </div>
        `;

        const remove = () => banner.remove();
        banner.querySelector('.tour-review-prompt-yes').addEventListener('click', () => {
            remove();
            if (typeof onAccept === 'function') onAccept();
        });
        banner.querySelector('.tour-review-prompt-no').addEventListener('click', () => {
            remove();
            if (typeof onDismiss === 'function') onDismiss();
        });

        document.body.appendChild(banner);
    }

    window.TourInteracoes = {
        initRelatosLikes,
        attachCommentsToggle,
        openReviewPanel,
        showReviewPromptBanner
    };
})();
