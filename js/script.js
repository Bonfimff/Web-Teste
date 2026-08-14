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
	const translations = window.translations || {};
	const langMap = window.langMap || {
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
		// Mesma chave usada pelas páginas de cidade e pelo Gerenciamento
		// (site-shell.js/Riodejaneiro.js) — precisa ser a mesma em todo o site
		// para o idioma escolhido numa aba valer nas outras (ver listener de
		// "storage" mais abaixo).
		try { localStorage.setItem('preferredLanguage', currentLang); } catch(e) {}
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
		try { savedLang = localStorage.getItem('preferredLanguage'); } catch(e) {}
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

		// Troca de idioma feita em OUTRA aba (ex.: home aberta junto com a
		// página de uma cidade): o evento "storage" só dispara nas abas que
		// NÃO fizeram a mudança, então não conflita com applyLang() acima.
		window.addEventListener('storage', (event) => {
			if (event.key !== 'preferredLanguage' || !event.newValue) return;
			if (event.newValue !== currentLang) {
				applyLang(event.newValue);
			}
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
/* TEXTOS SOBRE / CONTATO / AJUDA (editáveis via Gerenciamento) */
/* ===================================================== */
(() => {
	// Título/texto dessas 3 seções são editáveis em Gerenciamento > Gerenciamento
	// da página > Textos SOBRE/CONTATO/AJUDA (página "Principal"). Reaplica a cada
	// troca de idioma porque applyLang() (acima) reescreve o texto padrão a cada vez.
	const SECOES = ["sobre", "contato", "ajuda"];
	let overrides = {};

	const applyOverrides = () => {
		// O admin só digita em português; nos outros idiomas usamos a tradução
		// automática cacheada em override.traducoes[lang] (ver app.py).
		const lang = typeof window.getCurrentLanguage === "function" ? window.getCurrentLanguage() : "pt";
		SECOES.forEach((secao) => {
			const override = overrides[secao];
			if (!override) return;
			const article = document.getElementById(secao);
			if (!article) return;

			const traducao = lang !== "pt" ? override.traducoes?.[lang] : null;
			const titulo = (traducao && traducao.titulo) || override.titulo;
			const texto = (traducao && typeof traducao.texto === "string") ? traducao.texto : override.texto;

			const titleEl = article.querySelector("h2");
			if (titleEl && titulo) titleEl.textContent = titulo;

			if (texto) {
				const linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
				if (linhas.length) {
					article.querySelectorAll("p").forEach((p) => p.remove());
					const linksDiv = article.querySelector(".site-section-links");
					linhas.forEach((linha) => {
						const p = document.createElement("p");
						p.textContent = linha;
						article.insertBefore(p, linksDiv || null);
					});
				}
			}
		});
	};

	const loadPaginaSecao = async () => {
		const endpoints = [
			"https://api-tour.exksvol.com/get_pagina_secao?pagina=Principal",
			"http://127.0.0.1:5000/get_pagina_secao?pagina=Principal",
			"https://api.exksvol.com/get_pagina_secao?pagina=Principal"
		];
		for (const endpoint of endpoints) {
			try {
				const response = await fetch(endpoint);
				if (!response.ok) continue;
				const lista = await response.json();
				if (!Array.isArray(lista)) continue;
				overrides = lista.reduce((acc, item) => {
					if (item && item.secao) acc[item.secao] = item;
					return acc;
				}, {});
				applyOverrides();
				return;
			} catch (error) {
				console.warn("Falha ao carregar textos da página em", endpoint, error);
			}
		}
	};

	document.addEventListener("app:language-changed", applyOverrides);
	loadPaginaSecao();
})();

/* ===================================================== */
/* VIDEO CAPSULE SYNC  (split-screen local mp4)          */
/* Trecho de 0:12 a 2:00, depois repete                  */
/* ===================================================== */
(function () {
	// Cápsulas de vídeo ficam escondidas (display:none) abaixo de 1200px
	// (ver style.css); evita baixar/reproduzir 3 vídeos à toa em mobile/tablet.
	if (window.matchMedia('(max-width: 1200px)').matches) return;

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

// Modo de manutenção: a checagem que realmente decide isso agora é o script
// bloqueante no <head> (ver index.html), que redireciona pra manutencao.html
// antes de qualquer conteúdo renderizar — evita o flash da página real que
// essa versão baseada em fetch assíncrono/pós-load tinha.