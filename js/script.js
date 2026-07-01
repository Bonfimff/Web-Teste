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