(() => {
    const pageKey = 'Salvador';
    const pageTranslations = window.pageTranslations?.[pageKey] || {};
    const applyPageLanguage = (lang) => {
        const t = pageTranslations[lang] || pageTranslations.pt;
        const noticeItems = document.querySelectorAll('.rio-notice-text p');
        const detailItems = document.querySelectorAll('.rio-tour-details li');
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

        const tourName = document.querySelector('.rio-tour-name');
        if (tourName) tourName.textContent = t.tour_name;

        detailItems.forEach((item, index) => {
            if (t.details[index]) item.innerHTML = t.details[index];
        });

        if (actions[0]) actions[0].innerHTML = t.map;
        if (actions[1]) actions[1].textContent = t.reserve;

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