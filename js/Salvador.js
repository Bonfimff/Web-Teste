(() => {
    const pageKey = 'Salvador';
    const pageTranslations = window.pageTranslations?.[pageKey] || {};

    const applyPageLanguage = (lang) => {
        const t = pageTranslations[lang] || pageTranslations.pt;
        if (!t) return;

        const heroTitle = document.querySelector('.rio-hero-title');
        if (heroTitle) heroTitle.innerHTML = t.hero_title;

        const heroLocation = document.querySelector('.rio-hero-location');
        if (heroLocation) heroLocation.textContent = t.hero_location;

        const heroDesc = document.querySelector('.rio-hero-desc');
        if (heroDesc) heroDesc.textContent = t.hero_desc;

        const heroButton = document.querySelector('.rio-hero-content .btn-book');
        if (heroButton) heroButton.textContent = t.hero_button;

        if (!window.__cidadeAvisoCarregado) {
            const noticeTitle = document.querySelector('.rio-notice-title');
            if (noticeTitle) noticeTitle.textContent = t.notice_title;

            document.querySelectorAll('.rio-notice-text p').forEach((item, index) => {
                if (t.notice_lines[index]) {
                    item.innerHTML = `<i class="fa fa-circle-info"></i> ${t.notice_lines[index]}`;
                }
            });
        } else if (window.__cidadeAvisoData && typeof window.applyCidadeAviso === 'function') {
            // Reaplica o aviso já carregado do banco, agora com a tradução
            // automática do novo idioma (em vez do fallback hardcoded).
            window.applyCidadeAviso(null, window.__cidadeAvisoData);
        }

        const proceedButton = document.querySelector('.rio-notice .btn-proceed');
        if (proceedButton) proceedButton.textContent = t.proceed;

        const toursSection = document.getElementById('tours');
        if (toursSection) {
            const sectionTitle = toursSection.querySelector('.rio-section-title');
            if (sectionTitle) sectionTitle.textContent = t.section_title;
            const sectionSubtitle = toursSection.querySelector('.rio-section-subtitle');
            if (sectionSubtitle) sectionSubtitle.textContent = t.section_subtitle;

            const card = toursSection.querySelector('.rio-tour-card');
            if (card) {
                const hasDynamicDetails = typeof window.applyDynamicTourDetailsToCard === 'function'
                    && window.applyDynamicTourDetailsToCard(card, lang);
                if (!hasDynamicDetails) {
                    const nameEl = card.querySelector('.rio-tour-name');
                    if (nameEl) nameEl.textContent = t.tour_name;
                    const detailItems = card.querySelectorAll('.rio-tour-details li');
                    (t.details || []).forEach((html, index) => {
                        if (detailItems[index]) detailItems[index].innerHTML = html;
                    });
                }
                const mapLink = card.querySelector('.rio-link-map');
                if (mapLink) mapLink.innerHTML = t.map;
                const reserveBtn = card.querySelector('.rio-btn-reserve');
                if (reserveBtn) reserveBtn.textContent = t.reserve;
            }
        }

        const depoimentosSection = document.getElementById('depoimentos');
        if (depoimentosSection) {
            const sectionTitle = depoimentosSection.querySelector('.rio-section-title');
            if (sectionTitle) sectionTitle.textContent = t.depoimentos_title;
            const quotes = depoimentosSection.querySelectorAll('.rio-testimonial-quote');
            (t.testimonials || []).forEach((item, index) => {
                const quote = quotes[index];
                if (!quote) return;
                const textEl = quote.querySelector('.rio-testimonial-text');
                if (textEl) textEl.textContent = item.text;
                const authorEl = quote.querySelector('.rio-testimonial-author');
                if (authorEl) authorEl.textContent = item.author;
            });
            const likeLabel = t.relatos_like_label;
            if (likeLabel) {
                depoimentosSection.querySelectorAll('.rio-relatos-like').forEach((btn) => {
                    btn.setAttribute('aria-label', likeLabel);
                });
            }
        }
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('rio-card-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.rio-tour-card, .rio-relatos-item').forEach(card => {
        card.classList.add('rio-card-hidden');
        observer.observe(card);
    });

    document.addEventListener('app:language-changed', (event) => {
        applyPageLanguage(event.detail.lang);
    });

    const initialLang = typeof window.getCurrentLanguage === 'function'
        ? window.getCurrentLanguage()
        : (document.documentElement.lang || 'pt').slice(0, 2);
    applyPageLanguage(initialLang);

    function startTourSliders() {
        const folderImages = {
            'Caminhando pelo Pelourinho': [
                'imagem-elevador-lacerda-500.webp',
                '3af04d06-pelo_10cs08j0cs07i00000i01o.webp',
                'cf9b67a5-photo-web-27762_10cs0850cs07i00000b01o.webp'
            ]
        };

        document.querySelectorAll('.rio-tour-slider').forEach((slider) => {
            const folder = slider.dataset.folder;
            // Imagens enviadas via admin (Gerenciamento) têm prioridade; sem elas,
            // cai no manifesto local de sempre (arquivos hardcoded por pasta).
            const dbImages = window.tourImagesByFolder && window.tourImagesByFolder[folder];
            const files = folderImages[folder];
            const imageUrls = (Array.isArray(dbImages) && dbImages.length)
                ? dbImages
                : (files && files.length ? files.map(file => `../imagem/Salvador/${folder}/${file}`) : null);
            if (!imageUrls) return;

            slider.innerHTML = '';

            const track = document.createElement('div');
            track.className = 'rio-tour-slider-track';
            slider.appendChild(track);

            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'rio-tour-slider-dots';
            slider.appendChild(dotsContainer);

            imageUrls.forEach((url, i) => {
                const img = document.createElement('img');
                img.className = 'rio-tour-slide';
                img.src = url;
                img.alt = `${folder} - imagem ${i + 1}`;
                img.loading = 'lazy';
                track.appendChild(img);

                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'rio-tour-dot' + (i === 0 ? ' active' : '');
                dot.setAttribute('aria-label', `Ver imagem ${i + 1} de ${imageUrls.length}`);
                dot.addEventListener('click', () => {
                    changeSlide(i);
                    resetInterval();
                });
                dotsContainer.appendChild(dot);
            });

            const total = imageUrls.length;
            let current = 0;
            const dots = dotsContainer.querySelectorAll('.rio-tour-dot');
            let interval = null;

            function moveTrack(index) {
                track.style.transform = `translateX(-${index * 100}%)`;
            }

            function changeSlide(index) {
                if (index === current) return;
                dots[current].classList.remove('active');
                current = index;
                dots[current].classList.add('active');
                moveTrack(current);
            }

            function nextSlide() {
                const next = (current + 1) % total;
                changeSlide(next);
                scheduleNext();
            }

            function scheduleNext() {
                const delay = 6500 + Math.floor(Math.random() * 2000);
                if (interval) clearTimeout(interval);
                interval = setTimeout(nextSlide, delay);
            }

            function resetInterval() {
                if (interval) clearTimeout(interval);
                scheduleNext();
            }

            let touchStartX = null;
            let touchStartTime = null;

            slider.addEventListener('touchstart', (event) => {
                if (event.touches.length !== 1) return;
                touchStartX = event.touches[0].clientX;
                touchStartTime = Date.now();
            });

            slider.addEventListener('touchend', (event) => {
                if (touchStartX === null) return;
                const diffX = event.changedTouches[0].clientX - touchStartX;
                const elapsed = Date.now() - touchStartTime;
                touchStartX = null;
                touchStartTime = null;
                if (Math.abs(diffX) >= 40 && elapsed <= 700) {
                    const next = diffX > 0
                        ? (current - 1 + total) % total
                        : (current + 1) % total;
                    changeSlide(next);
                    resetInterval();
                }
            });

            slider.addEventListener('mousedown', (event) => {
                touchStartX = event.clientX;
                touchStartTime = Date.now();
            });

            slider.addEventListener('mouseup', (event) => {
                if (touchStartX === null) return;
                const diffX = event.clientX - touchStartX;
                const elapsed = Date.now() - touchStartTime;
                touchStartX = null;
                touchStartTime = null;
                if (Math.abs(diffX) >= 40 && elapsed <= 700) {
                    const next = diffX > 0
                        ? (current - 1 + total) % total
                        : (current + 1) % total;
                    changeSlide(next);
                    resetInterval();
                }
            });

            if (total > 1) {
                const initialDelay = 500 + Math.floor(Math.random() * 1200);
                interval = setTimeout(nextSlide, initialDelay);
            }
        });
    }

    window.startTourSliders = startTourSliders;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startTourSliders);
    } else {
        startTourSliders();
    }
})();
