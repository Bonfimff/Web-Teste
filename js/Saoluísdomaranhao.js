(() => {
    const pageKey = 'Saoluísdomaranhao';
    const pageTranslations = window.pageTranslations?.[pageKey] || {};
    const applyPageLanguage = (lang) => {
        const t = pageTranslations[lang] || pageTranslations.pt;
        const noticeItems = document.querySelectorAll('.rio-notice-text p');
        const subtitles = document.querySelectorAll('.rio-section-subtitle');
        const names = document.querySelectorAll('.rio-tour-name');
        const details1 = document.querySelectorAll('.rio-tours-grid .rio-tour-card:nth-child(1) .rio-tour-details li');
        const details2 = document.querySelectorAll('.rio-tour-card.rio-tour-paid .rio-tour-details li');
        const card1Actions = document.querySelectorAll('.rio-tours-grid .rio-tour-card:nth-child(1) .rio-tour-actions a');
        const card2Actions = document.querySelectorAll('.rio-tour-card.rio-tour-paid .rio-tour-actions a');

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

        if (subtitles[0]) subtitles[0].textContent = t.free_subtitle;
        if (subtitles[1]) subtitles[1].textContent = t.paid_title;

        const paidSubtitle = document.querySelector('.rio-paid-subtitle');
        if (paidSubtitle) paidSubtitle.textContent = t.paid_subtitle;

        if (names[0]) names[0].textContent = t.names[0];
        if (names[1]) names[1].innerHTML = t.names[1];

        details1.forEach((item, index) => {
            if (t.card1_details[index]) item.innerHTML = t.card1_details[index];
        });
        details2.forEach((item, index) => {
            if (t.card2_details[index]) item.innerHTML = t.card2_details[index];
        });

        if (card1Actions[0]) card1Actions[0].innerHTML = t.card1_map;
        if (card1Actions[1]) card1Actions[1].textContent = t.card1_reserve;
        if (card2Actions[0]) card2Actions[0].innerHTML = t.card2_map;
        if (card2Actions[1]) card2Actions[1].textContent = t.card2_reserve;

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
})();