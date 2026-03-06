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

		// Fecha o menu ao clicar em um link da nav
		document.querySelectorAll("nav a").forEach((link) => {
			link.addEventListener("click", () => {
				hamburger.classList.remove("active");
				headerEl.classList.remove("menu-open");
			});
		});
	}

	/* ================================================= */
	/* TRADUÇÕES (i18n)                                  */
	/* ================================================= */
	const translations = {
		pt: {
			hero_title: "Free <br> Walking Tour",
			hero_subtitle: "“Descubra novos destinos,<br>experiências inesquecíveis<br>& novas aventuras”",
			choose_city: "Escolha a cidade:",
			city_rio: "Rio de Janeiro",
			city_salvador: "Salvador",
			city_saoluis: "São Luís do Maranhão",
			city_lencois: "Lençóis Maranhenses",
			nav_home: "INÍCIO",
			nav_services: "SERVIÇOS",
			nav_about: "SOBRE",
			nav_contact: "CONTATO",
			nav_help: "AJUDA",
			search_placeholder: "Pesquisar",
			login: "LOGIN"
		},
		en: {
			hero_title: "Free <br> Walking Tour",
			hero_subtitle: "“Discover new destinations,<br>unforgettable experiences<br>& new adventures”",
			choose_city: "Choose the city:",
			city_rio: "Rio de Janeiro",
			city_salvador: "Salvador",
			city_saoluis: "São Luís do Maranhão",
			city_lencois: "Lençóis Maranhenses",
			nav_home: "HOME",
			nav_services: "SERVICES",
			nav_about: "ABOUT",
			nav_contact: "CONTACT",
			nav_help: "HELP",
			search_placeholder: "Search",
			login: "LOGIN"
		},
		fr: {
			hero_title: "Free <br> Walking Tour",
			hero_subtitle: "“Découvrez de nouvelles destinations,<br>des expériences inoubliables<br>& de nouvelles aventures”",
			choose_city: "Choisissez la ville :",
			city_rio: "Rio de Janeiro",
			city_salvador: "Salvador",
			city_saoluis: "São Luís do Maranhão",
			city_lencois: "Lençóis Maranhenses",
			nav_home: "ACCUEIL",
			nav_services: "SERVICES",
			nav_about: "À PROPOS",
			nav_contact: "CONTACT",
			nav_help: "AIDE",
			search_placeholder: "Rechercher",
			login: "LOGIN"
		},
		es: {
			hero_title: "Free <br> Walking Tour",
			hero_subtitle: "“Descubre nuevos destinos,<br>experiencias inolvidables<br>& nuevas aventuras”",
			choose_city: "Elige la ciudad:",
			city_rio: "Rio de Janeiro",
			city_salvador: "Salvador",
			city_saoluis: "São Luís do Maranhão",
			city_lencois: "Lençóis Maranhenses",
			nav_home: "INICIO",
			nav_services: "SERVICIOS",
			nav_about: "SOBRE",
			nav_contact: "CONTACTO",
			nav_help: "AYUDA",
			search_placeholder: "Buscar",
			login: "LOGIN"
		},
		it: {
			hero_title: "Free <br> Walking Tour",
			hero_subtitle: "“Scopri nuove destinazioni,<br>esperienze indimenticabili<br>& nuove avventure”",
			choose_city: "Scegli la città:",
			city_rio: "Rio de Janeiro",
			city_salvador: "Salvador",
			city_saoluis: "São Luís do Maranhão",
			city_lencois: "Lençóis Maranhenses",
			nav_home: "INIZIO",
			nav_services: "SERVIZI",
			nav_about: "CHI SIAMO",
			nav_contact: "CONTATTO",
			nav_help: "AIUTO",
			search_placeholder: "Cerca",
			login: "LOGIN"
		},
		zh: {
			hero_title: "Free <br> Walking Tour",
			hero_subtitle: "“探索新的目的地，<br>难忘的体验<br>& 全新的冒险”",
			choose_city: "选择城市：",
			city_rio: "里约热内卢",
			city_salvador: "萨尔瓦多",
			city_saoluis: "圣路易斯（马拉尼昂州）",
			city_lencois: "伦索伊斯马拉年塞斯",
			nav_home: "首页",
			nav_services: "服务",
			nav_about: "关于",
			nav_contact: "联系",
			nav_help: "帮助",
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

	const applyLang = (lang) => {
		const dict = translations[lang] || translations.pt;
		document.querySelectorAll("[data-i18n]").forEach((el) => {
			const key = el.getAttribute("data-i18n");
			if (dict[key]) el.innerHTML = dict[key];
		});
		document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
			const key = el.getAttribute("data-i18n-placeholder");
			if (dict[key]) el.setAttribute("placeholder", dict[key]);
		});
		if (btn) {
			const info = langMap[lang] || langMap.pt;
			btn.innerHTML = `<span class="flag ${info.flag}"></span> ${info.label}`;
		}
	};

	if (btn && list && wrapper) {
		const browserLang = (navigator.language || "pt").slice(0, 2);
		const initialLang = translations[browserLang] ? browserLang : "pt";
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
	/* Video sync code is below, outside the IIFE */
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