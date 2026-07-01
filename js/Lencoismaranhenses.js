(() => {
    const pageKey = 'Lencoismaranhenses';
    const pageTranslations = window.pageTranslations?.[pageKey] || {};
    const applyPageLanguage = (lang) => {
        const t = pageTranslations[lang] || pageTranslations.pt;
        const noticeItems = document.querySelectorAll('.rio-notice-text p');
        const names = document.querySelectorAll('.rio-tour-name');
        const details1 = document.querySelectorAll('.rio-tours-grid .rio-tour-card:nth-child(1) .rio-tour-details li');
        const details2 = document.querySelectorAll('.rio-tours-grid .rio-tour-card:nth-child(2) .rio-tour-details li');
        const actions = document.querySelectorAll('.rio-tour-actions a');

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

        noticeItems.forEach((item, index) => {
            if (t.notice_lines[index]) {
                item.innerHTML = `<i class="fa fa-circle-info"></i> ${t.notice_lines[index]}`;
            }
        });

        const proceedButton = document.querySelector('.rio-notice .btn-proceed');
        if (proceedButton) proceedButton.textContent = t.proceed;

        const sectionTitle = document.querySelector('.rio-section-title');
        if (sectionTitle) sectionTitle.textContent = t.section_title;

        const sectionSubtitle = document.querySelector('.rio-section-subtitle');
        if (sectionSubtitle) sectionSubtitle.textContent = t.section_subtitle;

        if (names[0]) names[0].textContent = t.names[0];
        if (names[1]) names[1].textContent = t.names[1];

        details1.forEach((item, index) => {
            if (t.card1_details[index]) item.innerHTML = t.card1_details[index];
        });
        details2.forEach((item, index) => {
            if (t.card2_details[index]) item.innerHTML = t.card2_details[index];
        });

        actions.forEach((action, index) => {
            if (index % 2 === 0) action.innerHTML = t.details;
            if (index % 2 === 1) action.textContent = t.reserve;
        });

        const footerText = document.querySelector('.rio-footer-text');
        if (footerText) footerText.textContent = t.footer;
    };

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('rio-card-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.rio-tour-card').forEach(card => {
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
            'Lagoas de Santo Amaro': 1,
            'Circuito Completo Lencois': 1,
            'Manhã na Lagoa Azul': 4,
            'Entardecer na Lagoa Bonita': 4,
            'Um dia em Atins Beach': 4,
            'Expedição Santo Amaro': 5,
            'Quadriciclo Adventure': 3,
            'Duas Lagoas': 5,
            'Povoados do Maranhão': 5,
            'Delta das Américas': 5,
        };

        document.querySelectorAll('.rio-tour-slider').forEach((slider) => {
            const folder = slider.dataset.folder;
            const total = folderImages[folder];
            if (!total) return;

            slider.innerHTML = '';

            const track = document.createElement('div');
            track.className = 'rio-tour-slider-track';
            slider.appendChild(track);

            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'rio-tour-slider-dots';
            slider.appendChild(dotsContainer);

            for (let i = 1; i <= total; i++) {
                const img = document.createElement('img');
                img.className = 'rio-tour-slide';
                img.src = `../imagem/Lencois/${folder}/img${i}.webp`;
                img.alt = `${folder} - imagem ${i}`;
                img.loading = 'lazy';
                track.appendChild(img);

                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'rio-tour-dot' + (i === 1 ? ' active' : '');
                dot.setAttribute('aria-label', `Ver imagem ${i} de ${total}`);
                dot.addEventListener('click', () => {
                    changeSlide(i - 1);
                    resetInterval();
                });
                dotsContainer.appendChild(dot);
            }

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

            const initialDelay = 500 + Math.floor(Math.random() * 1200);
            interval = setTimeout(nextSlide, initialDelay);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startTourSliders);
    } else {
        startTourSliders();
    }
})();