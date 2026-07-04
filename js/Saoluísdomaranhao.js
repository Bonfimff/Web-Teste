(() => {
    const pageKey = 'Saoluísdomaranhao';
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

        const noticeTitle = document.querySelector('.rio-notice-title');
        if (noticeTitle) noticeTitle.textContent = t.notice_title;

        document.querySelectorAll('.rio-notice-text p').forEach((item, index) => {
            if (t.notice_lines[index]) {
                item.innerHTML = `<i class="fa fa-circle-info"></i> ${t.notice_lines[index]}`;
            }
        });

        const proceedButton = document.querySelector('.rio-notice .btn-proceed');
        if (proceedButton) proceedButton.textContent = t.proceed;

        const toursSection = document.getElementById('tours');
        if (toursSection) {
            const sectionTitle = toursSection.querySelector('.rio-section-title');
            if (sectionTitle) sectionTitle.textContent = t.section_title;

            const subtitles = toursSection.querySelectorAll('.rio-section-subtitle');
            if (subtitles[0]) subtitles[0].textContent = t.free_subtitle;
            if (subtitles[1]) subtitles[1].textContent = t.paid_title;

            const paidSubtitle = toursSection.querySelector('.rio-paid-subtitle');
            if (paidSubtitle) paidSubtitle.textContent = t.paid_subtitle;

            const freeCard = toursSection.querySelector('.rio-tours-grid .rio-tour-card:not(.rio-tour-paid)');
            if (freeCard) {
                const nameEl = freeCard.querySelector('.rio-tour-name');
                if (nameEl && t.names?.[0]) nameEl.textContent = t.names[0];
                const detailItems = freeCard.querySelectorAll('.rio-tour-details li');
                (t.card1_details || []).forEach((html, index) => {
                    if (detailItems[index]) detailItems[index].innerHTML = html;
                });
                const mapLink = freeCard.querySelector('.rio-link-map');
                if (mapLink) mapLink.innerHTML = t.card1_map;
                const reserveBtn = freeCard.querySelector('.rio-btn-reserve');
                if (reserveBtn) reserveBtn.textContent = t.card1_reserve;
            }

            const paidCard = toursSection.querySelector('.rio-tour-card.rio-tour-paid');
            if (paidCard) {
                const nameEl = paidCard.querySelector('.rio-tour-name');
                if (nameEl && t.names?.[1]) nameEl.innerHTML = t.names[1];
                const detailItems = paidCard.querySelectorAll('.rio-tour-details li');
                (t.card2_details || []).forEach((html, index) => {
                    if (detailItems[index]) detailItems[index].innerHTML = html;
                });
                const mapLink = paidCard.querySelector('.rio-link-map');
                if (mapLink) mapLink.innerHTML = t.card2_map;
                const reserveBtn = paidCard.querySelector('.rio-btn-reserve');
                if (reserveBtn) reserveBtn.textContent = t.card2_reserve;
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
            'Centro Histórico': [
                'dscn5865-1500.webp',
                '17_sao_luis_ma__foto_banto_viana.webp',
                'whatsapp-image-2023-06-24-at-18-14-47.webp',
                'whatsapp-image-2023-07-08-at-12-16-03.webp',
                'whatsapp-image-2023-08-05-at-12-23-38-1500.webp'
            ],
            'Centro Histórico - Privado': [
                'whatsapp-image-2023-08-07-at-12-39-16-1500.webp',
                'whatsapp-image-2023-08-08-at-18-24-48.webp',
                'whatsapp-image-2023-08-11-at-18-45-49.webp',
                'whatsapp-image-2023-08-12-at-13-15-38.webp'
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
                : (files && files.length ? files.map(file => `../imagem/Sao Luis/${folder}/${file}`) : null);
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
