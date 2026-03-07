(() => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        });
    });
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('rio-card-visible'); observer.unobserve(entry.target); }
        });
    }, { threshold: 0.15 });
    document.querySelectorAll('.rio-tour-card').forEach(card => { card.classList.add('rio-card-hidden'); observer.observe(card); });
})();