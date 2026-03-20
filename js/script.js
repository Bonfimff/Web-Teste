console.log('Layout da imagem de referência carregado.');

(() => {
	/* ================================================= */
	/* MENU HAMBURGER (mobile)                           */
	/* ================================================= */
	const hamburger = document.getElementById("hamburger");
	const headerEl = document.querySelector("header");

	if (hamburger && headerEl) {
		hamburger.addEventListener("click", () => {
			hamburger.classList.toggle("active");
			headerEl.classList.toggle("menu-open");
		});

		document.querySelectorAll("nav a").forEach((link) => {
			link.addEventListener("click", () => {
				hamburger.classList.remove("active");
				headerEl.classList.remove("menu-open");
			});
		});
	}

	/* ================================================= */
	/* TRADUCOES BASE (i18n)                             */
	/* ================================================= */
	const translations = {
		pt: {
			hero_title: "Free <br> Walking Tour",
			hero_subtitle: "Descubra novos destinos,<br>experiências inesquecíveis<br>& novas aventuras",
			choose_city: "Escolha a cidade:",
			city_rio: "Rio de Janeiro",
			city_salvador: "Salvador",
			city_saoluis: "São Luís do Maranhão",
			city_lencois: "Lençóis Maranhenses",
			nav_home: "INÍCIO",
			nav_about: "SOBRE",
			nav_contact: "CONTATO",
			nav_help: "AJUDA",
			about_title: "Sobre",
			about_text: "Somos uma equipe apaixonada por experiências locais autênticas, conectando viajantes a guias especialistas em cada destino.",
			contact_title: "Contato",
			contact_text: "Fale com a Travel the World para dúvidas, parcerias e reservas personalizadas.",
			help_title: "Ajuda",
			help_text: "Precisa de suporte com idioma, horários, cancelamentos ou ponto de encontro? Nossa equipe está pronta para ajudar.",
			award_title: "Reconhecimento Especial",
			award_text: "Sabia que fomos premiados como a <b>melhor escolha</b> pelo <b>TripAdvisor</b> em 2021? 🥰",
			search_placeholder: "Pesquisar",
			login: "LOGIN"
		},
		en: {
			hero_title: "Free <br> Walking Tour",
			hero_subtitle: "Discover new destinations,<br>unforgettable experiences<br>& new adventures",
			choose_city: "Choose the city:",
			city_rio: "Rio de Janeiro",
			city_salvador: "Salvador",
			city_saoluis: "São Luís do Maranhão",
			city_lencois: "Lençóis Maranhenses",
			nav_home: "HOME",
			nav_about: "ABOUT",
			nav_contact: "CONTACT",
			nav_help: "HELP",
			about_title: "About",
			about_text: "We are a team passionate about authentic local experiences, connecting travelers with expert guides in each destination.",
			contact_title: "Contact",
			contact_text: "Get in touch with Travel the World for questions, partnerships and personalized bookings.",
			help_title: "Help",
			help_text: "Need support with language, schedules, cancellations or meeting point? Our team is ready to help.",
			award_title: "Special Recognition",
			award_text: "Did you know we were awarded as the <b>best choice</b> by <b>TripAdvisor</b> in 2021? 🥰",
			search_placeholder: "Search",
			login: "LOGIN"
		},
		fr: {
			hero_title: "Free <br> Walking Tour",
			hero_subtitle: "Découvrez de nouvelles destinations,<br>des expériences inoubliables<br>& de nouvelles aventures",
			choose_city: "Choisissez la ville :",
			city_rio: "Rio de Janeiro",
			city_salvador: "Salvador",
			city_saoluis: "São Luís do Maranhão",
			city_lencois: "Lençóis Maranhenses",
			nav_home: "ACCUEIL",
			nav_about: "À PROPOS",
			nav_contact: "CONTACT",
			nav_help: "AIDE",
			about_title: "À propos",
			about_text: "Nous sommes une équipe passionnée par les expériences locales authentiques, reliant les voyageurs à des guides experts dans chaque destination.",
			contact_title: "Contact",
			contact_text: "Contactez Travel the World pour questions, partenariats et réservations personnalisées.",
			help_title: "Aide",
			help_text: "Besoin d'aide pour la langue, les horaires, les annulations ou le point de rendez-vous ? Notre équipe est prête à vous aider.",
			award_title: "Reconnaissance Spéciale",
			award_text: "Saviez-vous que nous avons été récompensés comme le <b>meilleur choix</b> par <b>TripAdvisor</b> en 2021 ? 🥰",
			search_placeholder: "Rechercher",
			login: "LOGIN"
		},
		es: {
			hero_title: "Free <br> Walking Tour",
			hero_subtitle: "Descubre nuevos destinos,<br>experiencias inolvidables<br>& nuevas aventuras",
			choose_city: "Elige la ciudad:",
			city_rio: "Rio de Janeiro",
			city_salvador: "Salvador",
			city_saoluis: "São Luís do Maranhão",
			city_lencois: "Lençóis Maranhenses",
			nav_home: "INICIO",
			nav_about: "SOBRE",
			nav_contact: "CONTACTO",
			nav_help: "AYUDA",
			about_title: "Sobre",
			about_text: "Somos un equipo apasionado por experiencias locales auténticas, conectando viajeros con guías expertos en cada destino.",
			contact_title: "Contacto",
			contact_text: "Habla con Travel the World para dudas, alianzas y reservas personalizadas.",
			help_title: "Ayuda",
			help_text: "¿Necesitas ayuda con idioma, horarios, cancelaciones o punto de encuentro? Nuestro equipo está listo para ayudarte.",
			award_title: "Reconocimiento Especial",
			award_text: "¿Sabías que fuimos premiados como la <b>mejor elección</b> por <b>TripAdvisor</b> en 2021? 🥰",
			search_placeholder: "Buscar",
			login: "LOGIN"
		},
		it: {
			hero_title: "Free <br> Walking Tour",
			hero_subtitle: "Scopri nuove destinazioni,<br>esperienze indimenticabili<br>& nuove avventure",
			choose_city: "Scegli la città:",
			city_rio: "Rio de Janeiro",
			city_salvador: "Salvador",
			city_saoluis: "São Luís do Maranhão",
			city_lencois: "Lençóis Maranhenses",
			nav_home: "INIZIO",
			nav_about: "CHI SIAMO",
			nav_contact: "CONTATTO",
			nav_help: "AIUTO",
			about_title: "Chi siamo",
			about_text: "Siamo un team appassionato di esperienze locali autentiche, che collega i viaggiatori a guide esperte in ogni destinazione.",
			contact_title: "Contatto",
			contact_text: "Contatta Travel the World per domande, partnership e prenotazioni personalizzate.",
			help_title: "Aiuto",
			help_text: "Hai bisogno di supporto con lingua, orari, cancellazioni o punto di incontro? Il nostro team è pronto ad aiutarti.",
			award_title: "Riconoscimento Speciale",
			award_text: "Sapevi che siamo stati premiati come la <b>migliore scelta</b> da <b>TripAdvisor</b> nel 2021? 🥰",
			search_placeholder: "Cerca",
			login: "LOGIN"
		},
		zh: {
			hero_title: "Free <br> Walking Tour",
			hero_subtitle: "探索新的目的地，<br>难忘的体验<br>& 全新的冒险",
			choose_city: "选择城市：",
			city_rio: "里约热内卢",
			city_salvador: "萨尔瓦多",
			city_saoluis: "圣路易斯（马拉尼昂州）",
			city_lencois: "伦索伊斯马拉年塞斯",
			nav_home: "首页",
			nav_about: "关于",
			nav_contact: "联系",
			nav_help: "帮助",
			about_title: "关于我们",
			about_text: "我们是一支热爱本地真实体验的团队，把旅行者与每个目的地的专业向导连接起来。",
			contact_title: "联系我们",
			contact_text: "如需咨询、合作或定制预订，请联系Travel the World。",
			help_title: "帮助",
			help_text: "需要语言、时间安排、取消或集合点方面的支持吗？我们的团队随时为您服务。",
			award_title: "特别荣誉",
			award_text: "您知道吗？我们在2021年被<b>TripAdvisor</b>评为<b>最佳选择</b>！🥰",
			search_placeholder: "搜索",
			login: "登录"
		}
	};

	const langMap = {
		pt: { label: "Português", flag: "flag-pt" },
		en: { label: "English", flag: "flag-en" },
		fr: { label: "Français", flag: "flag-fr" },
		es: { label: "Español", flag: "flag-es" },
		it: { label: "Italiano", flag: "flag-it" },
		zh: { label: "中文(普通话)", flag: "flag-zh" }
	};

	const btn = document.getElementById("langBtn");
	const list = document.getElementById("langList");
	const wrapper = document.getElementById("langSelector");
	let currentLang = "pt";

	const applyLang = (lang) => {
		currentLang = translations[lang] ? lang : "pt";
		window.__appLang = currentLang;
		try { localStorage.setItem('appLang', currentLang); } catch(e) {}
		document.documentElement.lang = currentLang;

		const dict = translations[currentLang] || translations.pt;
		document.querySelectorAll("[data-i18n]").forEach((el) => {
			const key = el.getAttribute("data-i18n");
			if (dict[key]) el.innerHTML = dict[key];
		});
		document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
			const key = el.getAttribute("data-i18n-placeholder");
			if (dict[key]) el.setAttribute("placeholder", dict[key]);
		});

		if (btn) {
			const info = langMap[currentLang] || langMap.pt;
			btn.innerHTML = `<span class="flag ${info.flag}"></span> ${info.label}`;
		}

		document.dispatchEvent(new CustomEvent("app:language-changed", {
			detail: { lang: currentLang }
		}));
	};

	window.getCurrentLanguage = () => currentLang;

	if (btn && list && wrapper) {
		let savedLang;
		try { savedLang = localStorage.getItem('appLang'); } catch(e) {}
		const browserLang = (navigator.language || "pt").slice(0, 2);
		const initialLang = savedLang && translations[savedLang] ? savedLang : (translations[browserLang] ? browserLang : "pt");
		applyLang(initialLang);

		btn.addEventListener("click", () => {
			wrapper.classList.toggle("open");
		});

		list.addEventListener("click", (e) => {
			const item = e.target.closest("li");
			if (!item) return;
			applyLang(item.dataset.lang);
			wrapper.classList.remove("open");
		});

		document.addEventListener("click", (e) => {
			if (!wrapper.contains(e.target)) wrapper.classList.remove("open");
		});
	}

	const modal = document.getElementById("awardModal");
	if (modal) {
		const countdownEl = document.getElementById("awardCountdown");
		const awardLink = "https://www.tripadvisor.com.br/Attraction_Review-g303506-d12219836-Reviews-Rio_by_Foot_Free_Walking_Tour-Rio_de_Janeiro_State_of_Rio_de_Janeiro.html";
		let countdownTimer = null;

		const getCountdownLabel = (seconds) => {
			const labels = {
				pt: "Fecha em",
				en: "Closes in",
				fr: "Se ferme dans",
				es: "Se cierra en",
				it: "Si chiude tra",
				zh: "将在"
			};
			const lang = window.getCurrentLanguage ? window.getCurrentLanguage() : "pt";
			const prefix = labels[lang] || labels.pt;
			return lang === "zh" ? `${prefix} ${seconds} 秒` : `${prefix} ${seconds}s`;
		};

		const stopCountdown = () => {
			if (countdownTimer) {
				clearInterval(countdownTimer);
				countdownTimer = null;
			}
		};

		const closeModal = () => {
			stopCountdown();
			modal.classList.remove("is-open");
			modal.setAttribute("aria-hidden", "true");
			try { sessionStorage.setItem("awardModalSeen", "1"); } catch (e) {}
		};

		const openModal = () => {
			let secondsLeft = 10;
			modal.classList.add("is-open");
			modal.setAttribute("aria-hidden", "false");
			if (countdownEl) countdownEl.textContent = getCountdownLabel(secondsLeft);

			stopCountdown();
			countdownTimer = setInterval(() => {
				secondsLeft -= 1;
				if (secondsLeft <= 0) {
					closeModal();
					return;
				}
				if (countdownEl) countdownEl.textContent = getCountdownLabel(secondsLeft);
			}, 1000);
		};

		modal.querySelectorAll("[data-close-award]").forEach((el) => {
			el.addEventListener("click", (e) => {
				e.stopPropagation();
				closeModal();
			});
		});

		const dialog = modal.querySelector(".award-modal__dialog");
		if (dialog) {
			dialog.addEventListener("click", (e) => {
				if (e.target.closest("[data-close-award]")) return;
				closeModal();
				window.location.href = awardLink;
			});
		}

		document.addEventListener("app:language-changed", () => {
			if (!modal.classList.contains("is-open") || !countdownEl) return;
			const match = countdownEl.textContent.match(/(\d+)/);
			const seconds = match ? Number(match[1]) : 15;
			countdownEl.textContent = getCountdownLabel(seconds);
		});

		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && modal.classList.contains("is-open")) {
				closeModal();
			}
		});

		let alreadySeen = false;
		try { alreadySeen = sessionStorage.getItem("awardModalSeen") === "1"; } catch (e) {}
		if (!alreadySeen) {
			setTimeout(openModal, 700);
		}
	}

	const navLinks = document.querySelectorAll("nav a[href^='#']");
	const infoSections = document.getElementById("infoSections");
	const infoCards = infoSections ? infoSections.querySelectorAll(".site-section-card") : [];

	const showInfoSection = (sectionId) => {
		if (!infoSections) return;

		if (!sectionId) {
			infoSections.classList.add("is-empty");
			infoSections.classList.remove("single-view");
			infoCards.forEach((card) => card.classList.add("is-hidden"));
			return;
		}

		let hasMatch = false;
		infoCards.forEach((card) => {
			const isTarget = card.id === sectionId;
			card.classList.toggle("is-hidden", !isTarget);
			if (isTarget) hasMatch = true;
		});

		if (hasMatch) {
			infoSections.classList.remove("is-empty");
			infoSections.classList.add("single-view");
		}
	};

	navLinks.forEach((link) => {
		link.addEventListener("click", (e) => {
			const href = link.getAttribute("href");
			if (!href) return;

			const targetId = href.replace("#", "");
			const isInfoTab = targetId === "sobre" || targetId === "contato" || targetId === "ajuda";
			const target = document.querySelector(href);
			if (!target) return;

			e.preventDefault();
			navLinks.forEach((item) => item.classList.remove("active"));
			link.classList.add("active");

			if (isInfoTab) {
				showInfoSection(targetId);
				target.scrollIntoView({ behavior: "smooth", block: "start" });
				return;
			}

			showInfoSection(null);
			target.scrollIntoView({ behavior: "smooth", block: "start" });
		});
	});

	const hash = window.location.hash ? window.location.hash.replace("#", "") : "";
	if (hash === "sobre" || hash === "contato" || hash === "ajuda") {
		showInfoSection(hash);
	} else {
		showInfoSection(null);
	}
})();

/* ===================================================== */
/* VIDEO CAPSULE SYNC  (split-screen local mp4)          */
/* Trecho de 0:12 a 2:00, depois repete                  */
/* ===================================================== */
(function () {
	var START = 12;
	var END   = 120;
	var videos = document.querySelectorAll('.capsule-video');
	if (!videos.length) return;

	var master = videos[0];

	// Configura todos os vídeos no ponto inicial
	videos.forEach(function (v) {
		v.currentTime = START;
	});

	// Inicia a reprodução quando o master estiver pronto
	master.addEventListener('canplay', function handler() {
		master.removeEventListener('canplay', handler);
		videos.forEach(function (v) {
			v.currentTime = START;
			v.play().catch(function () {});
		});
	});

	// Loop manual: quando chegar em END, volta para START
	master.addEventListener('timeupdate', function () {
		if (master.currentTime >= END) {
			videos.forEach(function (v) {
				v.currentTime = START;
				v.play().catch(function () {});
			});
		}
	});

	// Sincroniza os seguidores com o master a cada 500ms
	setInterval(function () {
		if (master.paused) return;
		for (var i = 1; i < videos.length; i++) {
			if (Math.abs(videos[i].currentTime - master.currentTime) > 0.15) {
				videos[i].currentTime = master.currentTime;
			}
		}
	}, 500);

	// Se o vídeo terminar naturalmente, reinicia
	master.addEventListener('ended', function () {
		videos.forEach(function (v) {
			v.currentTime = START;
			v.play().catch(function () {});
		});
	});
})();

// fecha modal de aviso quando usuário clica em prosseguir
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.querySelector('.rio-notice .btn-proceed');
    if (btn) {
        btn.addEventListener('click', function() {
            const notice = btn.closest('.rio-notice');
            if (notice) notice.style.display = 'none';
        });
    }
});