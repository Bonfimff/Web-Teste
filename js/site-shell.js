
// Site shell (header, mobile menu, login/register, footer card, notifications).
// Generic logic shared by pages that use the "rio-page" layout pattern. Extracted from
// js/Riodejaneiro.js, minus the Rio-only tour database rendering and reservation-form intercept.
// Link direto pra um tour (?tour=<id>, gerado em Gerenciamento > Editar
// Tour > "Copiar link"): quando presente, o aviso "Informações Importantes"
// e o card de premiação não aparecem — o cliente veio direto ver aquele
// tour, não a cidade inteira.
window.__tourDirectLinkId = new URLSearchParams(window.location.search).get('tour') || null;

(() => {
    // Esconde o aviso "Informações Importantes" antes do primeiro paint se o
    // usuário já marcou "não mostrar novamente" nesta página nessa sessão de
    // navegador (ou se chegou por um link direto de tour, ver acima) — evita
    // o overlay reaparecer a cada carregamento. Chave por pathname porque
    // cada cidade tem seu próprio texto de aviso.
    const NOTICE_DISMISS_KEY = `rioNoticeDismissed:${window.location.pathname}`;
    if (window.__tourDirectLinkId || localStorage.getItem(NOTICE_DISMISS_KEY) === '1') {
        const notice = document.querySelector('.rio-notice');
        if (notice) notice.style.display = 'none';
    }

    let rolePermissionsMap = {};

    const ALLOW_PUBLIC_NAV_ITEMS_WHEN_LOGGED_OUT = window.ALLOW_PUBLIC_NAV_ITEMS_WHEN_LOGGED_OUT !== false;
    window.ALLOW_PUBLIC_NAV_ITEMS_WHEN_LOGGED_OUT = ALLOW_PUBLIC_NAV_ITEMS_WHEN_LOGGED_OUT;

    const DEFAULT_ROLE_PERMISSIONS = {
        cliente_user: {
            manageReservas: false,
            manageContas: false,
            managePerfis: false,
            pages: ['Principal', 'Reservas'],
            tabs: ['Principal', 'Reservas', 'SOBRE', 'CONTATO', 'AJUDA']
        },
        admin: {
            manageReservas: true,
            manageContas: true,
            managePerfis: false,
            manageSelfEdit: true,
            manageOtherEdit: true,
            manageConsultas: true,
            loadAllReservas: true,
            pages: ['Principal', 'Gerenciamento'],
            tabs: ['Principal', 'Reservas', 'Gerenciamento', 'Financeiro', 'Contas', 'Minhas Reservas', 'Meus Dados', 'SOBRE', 'CONTATO', 'AJUDA']
        },
        super_admin: {
            manageReservas: true,
            manageContas: true,
            managePerfis: true,
            manageSelfEdit: true,
            manageOtherEdit: true,
            manageConsultas: true,
            loadAllReservas: true,
            pages: ['Principal', 'Gerenciamento'],
            tabs: ['Principal', 'Reservas', 'Gerenciamento', 'Financeiro', 'Contas', 'Minhas Reservas', 'Meus Dados', 'SOBRE', 'CONTATO', 'AJUDA']
        }
    };

    const normalizeRole = (role) => {
        if (!role) return 'cliente_user';
        const roleLower = role.toLowerCase();
        if (roleLower === 'user') return 'cliente_user';
        if (roleLower === 'cliente_user') return 'cliente_user';
        if (roleLower === 'admin') return 'admin';
        if (roleLower === 'super_admin') return 'super_admin';
        return roleLower;
    };

    const getCurrentUserRole = () => normalizeRole(localStorage.getItem('userRole') || 'cliente_user');
    const getCurrentUserEmail = () => (localStorage.getItem('userEmail') || '').toLowerCase();

    const redirectToPrincipalPage = () => {
        const path = window.location.pathname || '';
        // As páginas de cidade e o Gerenciamento vivem em /html/; o index fica na raiz.
        if (path.includes('/html/')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = 'index.html';
        }
    };

    const redirectToManagementPage = () => {
        const path = window.location.pathname || '';
        window.location.href = path.includes('/html/') ? 'Gerenciamento.html' : 'html/Gerenciamento.html';
    };

    const getCurrentRolePermissions = () => {
        const currentRole = getCurrentUserRole();
        if (rolePermissionsMap[currentRole]) {
            return rolePermissionsMap[currentRole];
        }
        return DEFAULT_ROLE_PERMISSIONS[currentRole] || DEFAULT_ROLE_PERMISSIONS.cliente_user;
    };

    // Exporta globalmente os helpers já definidos.
    window.normalizeRole = normalizeRole;
    window.getCurrentUserRole = getCurrentUserRole;
    window.getCurrentRolePermissions = getCurrentRolePermissions;
    window.redirectToManagementPage = redirectToManagementPage;

    const canAccessManagement = () => {
        const role = getCurrentUserRole();
        return role !== 'cliente_user';
    };

    const applyRoleBasedControls = () => {
        const adminItems = document.querySelectorAll('.profile-item--admin, [data-admin-only]');
        const allowed = canAccessManagement();
        adminItems.forEach(item => {
            item.style.display = allowed ? '' : 'none';
        });

        const perms = getCurrentRolePermissions();
        const tabs = Array.isArray(perms.tabs) ? perms.tabs.map(tab => String(tab).toUpperCase()) : [];
        const pages = Array.isArray(perms.pages) ? perms.pages : [];

        const navMap = [
            { selector: '[data-i18n="nav_about"]', name: 'SOBRE' },
            { selector: '[data-i18n="nav_contact"]', name: 'CONTATO' },
            { selector: '[data-i18n="nav_help"]', name: 'AJUDA' }
        ];

        const showPublicNavByDefault = window.ALLOW_PUBLIC_NAV_ITEMS_WHEN_LOGGED_OUT;
        const showPublicNavItems = showPublicNavByDefault || canAccessManagement() || tabs.includes('SOBRE') || tabs.includes('CONTATO') || tabs.includes('AJUDA');
        const isMobileScreen = window.matchMedia('(max-width: 900px)').matches;
        const headerNavs = document.querySelectorAll('.nav-left nav');

        document.querySelectorAll('.mobile-menu-main').forEach((container) => {
            container.style.removeProperty('display');
            container.style.removeProperty('visibility');
            container.style.removeProperty('opacity');
        });

        headerNavs.forEach((container) => {
            if (isMobileScreen) {
                container.style.setProperty('display', 'none', 'important');
                container.style.visibility = 'hidden';
                container.style.opacity = '0';
            } else if (showPublicNavItems) {
                container.style.removeProperty('display');
                container.style.visibility = 'visible';
                container.style.opacity = '';
            } else {
                container.style.setProperty('display', 'none', 'important');
                container.style.visibility = 'hidden';
                container.style.opacity = '0';
            }
        });

        navMap.forEach(({ selector, name }) => {
            const els = Array.from(document.querySelectorAll(selector));
            if (!els.length) {
                els.push(...document.querySelectorAll(`a[href*="${name.toLowerCase()}"]`));
            }
            els.forEach((el) => {
                if (showPublicNavItems) {
                    el.style.display = '';
                    el.style.visibility = 'visible';
                    el.style.opacity = '';
                    el.classList.remove('hidden');
                    el.removeAttribute('hidden');
                } else {
                    el.style.display = 'none';
                }
            });
        });

        // Itens do menu de perfil seguem as tabs autorizadas
        document.querySelectorAll('[data-profile-action="my-reservations"]').forEach(el => {
            if (el) el.style.display = tabs.includes('MINHAS RESERVAS') ? '' : 'none';
        });
        document.querySelectorAll('[data-profile-action="my-data"]').forEach(el => {
            if (el) el.style.display = tabs.includes('MEUS DADOS') ? '' : 'none';
        });

        // Permissões funcionais adicionais
        if (!perms.managePerfis) {
            document.querySelectorAll('.profile-item--admin').forEach(el => { if (el) el.style.display = 'none'; });
        }

        // Situação de páginas (principal / gerenciamento)
        const isManagementPage = window.location.pathname.endsWith('/html/Gerenciamento.html') || window.location.pathname.endsWith('Gerenciamento.html');
        if (isManagementPage && !allowed) {
            window.location.href = window.location.origin + '/';
        }

        if (!pages.includes('Principal') && !isManagementPage) {
            // se não tiver acesso à página principal, remove ações de tour (só para controle leve de UI)
            document.querySelectorAll('.rio-btn-reserve, .btn-book').forEach(el => { if (el) el.style.display = 'none'; });
        }

        if (!pages.includes('Gerenciamento') && isManagementPage) {
            window.location.href = window.location.origin + '/';
        }
    };

    const loadRolePermissions = async () => {
        const email = getCurrentUserEmail();
        const userRole = getCurrentUserRole();

        const canonicalRole = normalizeRole(userRole);
        if (canonicalRole !== 'admin' && canonicalRole !== 'super_admin') {
            let savedPermissions = null;
            try {
                const raw = localStorage.getItem('currentRolePermissions');
                savedPermissions = raw ? JSON.parse(raw) : null;
            } catch (_err) {
                savedPermissions = null;
            }

            const defaults = DEFAULT_ROLE_PERMISSIONS[canonicalRole] || DEFAULT_ROLE_PERMISSIONS.cliente_user;
            // O cache em localStorage (gravado no login) pode ser mais antigo
            // que permissões granulares adicionadas depois — mesclar com os
            // defaults como base evita perder uma chave nova ausente no cache.
            rolePermissionsMap = {
                ...rolePermissionsMap,
                [canonicalRole]: (savedPermissions && typeof savedPermissions === 'object')
                    ? { ...defaults, ...savedPermissions }
                    : defaults
            };
            applyRoleBasedControls();
            return;
        }

        try {
            const url = `${API_BASE_URL}/get_role_permissions?email=${encodeURIComponent(email)}`;
            const response = await apiFetch(url, { method: 'GET' });

            if (response && response.success && typeof response.permissions === 'object') {
                rolePermissionsMap = response.permissions;
            } else {
                console.warn('loadRolePermissions: resposta inesperada', response);
            }
        } catch (error) {
            console.warn('Falha ao carregar role permissions', error);
        }

        applyRoleBasedControls();
    };

    // Exporta controles após definição para evitar acesso antecipado (TDZ).
    window.applyRoleBasedControls = applyRoleBasedControls;
    window.loadRolePermissions = loadRolePermissions;

    // 1. Definição única do endereço da API
    const API_BASE_URL = 'https://api-tour.exksvol.com';

    // Disponibiliza globalmente para outros scripts e IIFEs
    window.API_BASE_URL = API_BASE_URL;

    console.debug('API_BASE_URL configurado para:', API_BASE_URL);

    // Modo de manutenção: a checagem que decide isso é o script bloqueante
    // no <head> de cada página de cidade (redireciona pra ../manutencao.html
    // antes de qualquer conteúdo renderizar — sem flash da página real).

    const apiFetch = async (path, options = {}) => {
        const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
        const defaultOptions = {
            headers: {
                // Não definir Content-Type por padrão para evitar preflight se possível
                ...(options.headers || {})
            },
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            const responseText = await response.text();
            let payload;
            try {
                payload = responseText ? JSON.parse(responseText) : null;
            } catch (_parseErr) {
                payload = responseText;
            }

            if (!response.ok) {
                console.error('apiFetch response error', {
                    url,
                    status: response.status,
                    statusText: response.statusText,
                    payload
                });
                throw new Error(`API request failed ${response.status} ${response.statusText}: ${responseText}`);
            }

            return payload;
        } catch (error) {
            if (error instanceof TypeError) {
                console.error('apiFetch network issue (CORS/DNS/Offline):', {
                    url,
                    options: defaultOptions,
                    message: error.message,
                    stack: error.stack
                });
            } else {
                console.error('apiFetch error', error);
            }
            throw error;
        }
    };

    // Expor apiFetch globalmente para evitar erro "apiFetch is not defined" em outros módulos
    window.apiFetch = apiFetch;

    // Award notification: supports either the corner "toast" markup (#awardToast, used by
    // the Rio de Janeiro page) or the centered "modal" markup (#awardModal, used by the
    // other destination pages). Whichever one is present in the DOM gets wired up.
    //
    // Link/ícone e ativo/inativo são editáveis por cidade em Gerenciamento > Card de
    // Premiação. O card só é exibido DEPOIS do aviso "Informações Importantes" ser
    // fechado (ou imediatamente se esse aviso não existir/já estiver escondido nesta
    // página) — por isso a exibição em si não roda mais num setTimeout cego; ela é
    // dependendurada de window.__showAwardCard, chamado nos handlers do aviso lá embaixo.
    const initAwardNotification = async () => {
        // Link direto pra um tour: nunca monta nem o toast nem o modal, e
        // window.__showAwardCard nunca é definida — qualquer chamada a ela
        // (inclusive pelos handlers do aviso) vira no-op sozinha.
        if (window.__tourDirectLinkId) return;
        const toast = document.getElementById('awardToast');
        const modal = !toast ? document.getElementById('awardModal') : null;
        if (!toast && !modal) return;

        let awardConfig = { ativo: true, link: '', imagem: '', titulo: '', texto: '' };
        try {
            const cidadeAtual = document.getElementById('relatosGallery')?.dataset.cidade;
            const endpoint = `${API_BASE_URL}/get_cidade_award`;
            const response = await fetch(endpoint);
            if (response.ok) {
                const lista = await response.json();
                const found = Array.isArray(lista) ? lista.find((item) => item && item.cidade === cidadeAtual) : null;
                if (found) awardConfig = found;
            }
        } catch (error) {
            console.warn('Falha ao carregar card de premiação em', error);
        }

        if (awardConfig.ativo === false) return;

        if (toast) {
            if (awardConfig.imagem) {
                const img = toast.querySelector('.award-toast__icon img');
                if (img) img.src = awardConfig.imagem;
            }
            if (awardConfig.titulo) {
                const titleEl = toast.querySelector('.award-toast__title');
                if (titleEl) titleEl.textContent = awardConfig.titulo;
            }
            if (awardConfig.texto) {
                const messageEl = toast.querySelector('.award-toast__message');
                if (messageEl) messageEl.textContent = awardConfig.texto;
            }
            let awardToastTimer = null;
            toast.addEventListener('click', (event) => {
                const close = event.target.closest('[data-close-award]');
                if (close) {
                    toast.classList.remove('visible');
                    if (awardToastTimer) clearTimeout(awardToastTimer);
                    return;
                }
                if (awardConfig.link) window.open(awardConfig.link, '_blank', 'noopener');
            });

            let alreadySeen = false;
            try { alreadySeen = sessionStorage.getItem('awardModalSeen') === '1'; } catch (e) {}
            if (alreadySeen) return;

            window.__showAwardCard = () => {
                if (window.__awardCardShown) return;
                window.__awardCardShown = true;
                toast.classList.add('visible');
                awardToastTimer = setTimeout(() => toast.classList.remove('visible'), 15000);
                try { sessionStorage.setItem('awardModalSeen', '1'); } catch (e) {}
            };
            return;
        }

        if (awardConfig.imagem) {
            const img = modal.querySelector('.hs-modal__leftImage img');
            if (img) img.src = awardConfig.imagem;
        }
        if (awardConfig.titulo) {
            const titleEl = document.getElementById('awardTitle');
            if (titleEl) titleEl.textContent = awardConfig.titulo;
        }
        if (awardConfig.texto) {
            const descEl = modal.querySelector('.js-hs-description');
            if (descEl) descEl.textContent = awardConfig.texto;
        }

        const countdownEl = document.getElementById('awardCountdown');
        const awardLink = awardConfig.link
            || 'https://www.tripadvisor.com.br/Attraction_Review-g303506-d12219836-Reviews-Rio_by_Foot_Free_Walking_Tour-Rio_de_Janeiro_State_of_Rio_de_Janeiro.html';
        let countdownTimer = null;

        const getCountdownLabel = (seconds) => {
            const labels = {
                pt: 'Fecha em', en: 'Closes in', fr: 'Se ferme dans',
                es: 'Se cierra en', it: 'Si chiude tra', zh: '将在'
            };
            const lang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'pt';
            const prefix = labels[lang] || labels.pt;
            return lang === 'zh' ? `${prefix} ${seconds} 秒` : `${prefix} ${seconds}s`;
        };

        const stopCountdown = () => {
            if (countdownTimer) {
                clearInterval(countdownTimer);
                countdownTimer = null;
            }
        };

        const closeModal = () => {
            stopCountdown();
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            try { sessionStorage.setItem('awardModalSeen', '1'); } catch (e) {}
        };

        const openModal = () => {
            let secondsLeft = 10;
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
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

        modal.querySelectorAll('[data-close-award]').forEach((el) => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                closeModal();
            });
        });

        const dialog = modal.querySelector('.award-modal__dialog');
        if (dialog) {
            dialog.addEventListener('click', (e) => {
                if (e.target.closest('[data-close-award]')) return;
                closeModal();
                window.location.href = awardLink;
            });
        }

        document.addEventListener('app:language-changed', () => {
            if (!modal.classList.contains('is-open') || !countdownEl) return;
            const match = countdownEl.textContent.match(/(\d+)/);
            const seconds = match ? Number(match[1]) : 15;
            countdownEl.textContent = getCountdownLabel(seconds);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) {
                closeModal();
            }
        });

        let alreadySeen = false;
        try { alreadySeen = sessionStorage.getItem('awardModalSeen') === '1'; } catch (e) {}
        if (alreadySeen) return;

        window.__showAwardCard = () => {
            if (window.__awardCardShown) return;
            window.__awardCardShown = true;
            openModal();
        };
    };

    initAwardNotification();

    // Dispara o card de premiação (se cadastrado/ativo) depois que o aviso
    // "Informações Importantes" some da tela — seja porque não existe nesta
    // página, seja porque o usuário já fechou. window.__showAwardCard só existe
    // quando initAwardNotification() decidiu que há algo pra mostrar.
    const maybeShowAwardCardAfterNotice = () => {
        const trigger = () => window.__showAwardCard?.();
        const notice = document.querySelector('.rio-notice');
        const isNoticeVisible = () => {
            if (!notice) return false;
            if (notice.style.display === 'none') return false;
            return getComputedStyle(notice).display !== 'none';
        };
        if (!isNoticeVisible()) {
            setTimeout(trigger, 700);
        }
        // Se o aviso estiver visível agora, os handlers de Prosseguir/Não mostrar
        // novamente (ver DOMContentLoaded mais abaixo) chamam window.__showAwardCard
        // diretamente quando o usuário fechar.
    };
    document.addEventListener('DOMContentLoaded', () => {
        // Roda depois de initAwardNotification (chamada síncrona acima, antes deste
        // listener ser registrado) já ter tido a chance de popular window.__showAwardCard;
        // como o fetch é assíncrono, adia um tick extra pra dar tempo dele resolver.
        setTimeout(maybeShowAwardCardAfterNotice, 50);
    });

    const translateProfileDropdown = (container) => {
        if (!container) return;
        const lang = (typeof window.getCurrentLang === 'function'
            ? window.getCurrentLang()
            : (document.documentElement.lang || 'pt').slice(0, 2)
        ).split('-')[0] || 'pt';
        const strings = window.uiTranslations?.[lang] || window.uiTranslations?.pt || {};
        container.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            const value = strings[key];
            if (typeof value === 'string') {
                el.textContent = value;
            }
        });
    };

    const updateProfileMenuUI = () => {
        const menu = document.querySelector('.profile-menu');
        const dropdown = menu?.querySelector('.profile-dropdown');
        const userRole = localStorage.getItem('userRole');
        const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || '';

        if (!dropdown) return;

        if (userRole) {
            const showManagement = canAccessManagement();
            const isManagementPage = window.location.pathname.endsWith('/html/Gerenciamento.html') || window.location.pathname.endsWith('Gerenciamento.html');
            const managementAction = isManagementPage ? 'principal' : 'manage';
            const managementLabel = isManagementPage ? 'Principal' : 'Gerenciamento';
            dropdown.innerHTML = `
                <div class="profile-user-info" style="padding:8px 12px; font-weight: 600; border-bottom: 1px solid #e0e0e0;"><span data-i18n="profile_hello">Olá</span>, ${userName}</div>
                ${showManagement ? `<a href="#" class="profile-item profile-item--admin" data-profile-action="${managementAction}">${managementLabel}</a>` : ''}
                <a href="#" class="profile-item" data-profile-action="my-reservations" data-i18n="profile_my_reservations">Minhas Reservas</a>
                <a href="#" class="profile-item" data-profile-action="my-data" data-i18n="profile_my_data">Meus Dados</a>
                <a href="#" class="profile-item" data-profile-action="logout" data-i18n="profile_logout">Sair</a>
            `;

            translateProfileDropdown(dropdown);
            applyRoleBasedControls();
            if (typeof syncMobileProfileUserView === 'function') {
                syncMobileProfileUserView();
            } else {
                window.syncMobileProfileUserView?.();
            }
        } else {
            dropdown.innerHTML = `
                <a href="#" class="profile-item" data-profile-action="login" data-i18n="profile_login">Entrar</a>
                <a href="#" class="profile-item" data-profile-action="register" data-i18n="profile_register">Cadastrar</a>
            `;

            translateProfileDropdown(dropdown);
            if (typeof syncMobileProfileUserView === 'function') {
                syncMobileProfileUserView();
            } else {
                window.syncMobileProfileUserView?.();
            }
        }

        window.updateProfileAvatar?.();
    };

    // Exposto para uso em callbacks no segundo IIFE.
    window.updateProfileMenuUI = updateProfileMenuUI;


    const initProfileMenu = () => {
        const menu = document.querySelector('.profile-menu');
        const button = document.querySelector('.profile-btn');
        if (!menu || !button) return;

        if (menu.dataset.profileMenuInitialized === 'true') return;
        menu.dataset.profileMenuInitialized = 'true';

        loadRolePermissions().then(() => {
            updateProfileMenuUI();
        }).catch((error) => {
            console.warn('Erro ao carregar permissões de role:', error);
            updateProfileMenuUI();
        });

        button.addEventListener('click', (event) => {
            event.stopPropagation();

            if (window.matchMedia('(max-width: 900px)').matches) {
                toggleMobileMenu('user');
                return;
            }

            const isOpen = menu.classList.toggle('open');
            button.setAttribute('aria-expanded', String(isOpen));
        });

        menu.addEventListener('click', (event) => {
            const target = event.target.closest('.profile-item');
            if (!target) return;

            event.preventDefault();
            event.stopPropagation();

            const action = target.getAttribute('data-profile-action');
            if (action === 'manage') {
                menu.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');
                redirectToManagementPage();
            } else if (action === 'principal') {
                menu.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');
                redirectToPrincipalPage();
            } else if (action === 'my-data') {
                menu.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');
                window.openUserDataModal?.();
            } else if (action === 'my-reservations') {
                menu.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');
                window.openMyReservationsModal?.();
            } else if (action === 'logout') {
                localStorage.removeItem('userRole');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                localStorage.removeItem('userPhoto');
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentRolePermissions');

                // Remove possíveis variáveis de UI internas (cache temporário, etc.)
                // e força reload para limpar tudo da página.
                menu.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');

                window.location.reload();
            }
        });
    };

    initProfileMenu();

    const initFooterScrollTop = () => {
        const button = document.querySelector('.footer-card-up');
        const profileMenu = document.querySelector('.profile-menu');
        if (!button) return;
        button.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (profileMenu) {
                profileMenu.classList.remove('open');
            }
        });
    };

    initFooterScrollTop();
})();
// script.js - shared logic for navigation, language switching and UI helpers
(() => {
    const storageKey = window.translationConfig?.storageKey || 'preferredLanguage';
    const supportedLangs = Array.isArray(window.translationConfig?.supportedLangs) ? window.translationConfig.supportedLangs : ['pt', 'en', 'fr', 'es', 'it', 'zh'];
    const translations = window.uiTranslations || {};

    const getSavedLang = () => {
        try {
            return localStorage.getItem(storageKey) || null;
        } catch (e) {
            return null;
        }
    };

    const setSavedLang = (lang) => {
        try {
            localStorage.setItem(storageKey, lang);
        } catch (_e) {
            // ignore
        }
    };

    const normalizeLang = (lang) => {
        if (!lang) return 'pt';
        const short = lang.split('-')[0].toLowerCase();
        return supportedLangs.includes(short) ? short : 'pt';
    };

    const getCurrentLang = () => {
        const saved = normalizeLang(getSavedLang());
        const htmlLang = normalizeLang(document.documentElement.lang);
        const navLang = normalizeLang(navigator.language);
        return saved || htmlLang || navLang || 'pt';
    };

    const setDocumentLang = (lang) => {
        document.documentElement.lang = `${lang}-${lang.toUpperCase()}`;
    };

    const applyTranslations = (lang) => {
        const strings = translations[lang] || translations.pt;

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            const value = strings[key];
            if (typeof value === 'string') {
                el.textContent = value;
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (!key) return;
            const value = strings[key];
            if (typeof value === 'string') {
                el.placeholder = value;
            }
        });

        document.querySelectorAll('[data-i18n-value]').forEach(el => {
            const key = el.getAttribute('data-i18n-value');
            if (!key) return;
            const value = strings[key];
            if (typeof value === 'string') {
                el.value = value;
            }
        });

        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            if (!key) return;
            const value = strings[key];
            if (typeof value === 'string') {
                el.innerHTML = value;
            }
        });

        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            if (!key) return;
            const value = strings[key];
            if (typeof value === 'string') {
                el.setAttribute('aria-label', value);
            }
        });
    };

    const updateLangSelectorButton = (lang) => {
        const btn = document.querySelector('#langBtn');
        if (!btn) return;

        const flagMap = {
            pt: 'flag-pt',
            en: 'flag-en',
            fr: 'flag-fr',
            es: 'flag-es',
            it: 'flag-it',
            zh: 'flag-zh'
        };

        const className = flagMap[lang] || 'flag-pt';

        const flagSpan = btn.querySelector('span.flag');
        const labelSpan = btn.querySelector('span.lang-label');

        if (flagSpan) {
            flagSpan.className = 'flag ' + className;
        }

        if (labelSpan) {
            // keep label updated via translations separately
        }
    };

    const dispatchLanguageChange = (lang) => {
        applyTranslations(lang);
        const ev = new CustomEvent('app:language-changed', { detail: { lang } });
        document.dispatchEvent(ev);
    };

    // Expor para a primeira IIFE poder re-disparar após carregar tours do banco
    window.dispatchLanguageChange = dispatchLanguageChange;
    window.getCurrentLang = getCurrentLang;

    const selectLanguage = (lang) => {
        const normalized = normalizeLang(lang);
        const current = getCurrentLang();
        if (normalized === current) {
            return;
        }

        setSavedLang(normalized);
        setDocumentLang(normalized);
        updateLangSelectorButton(normalized);
        dispatchLanguageChange(normalized);

        // Reload the page after switching language so all content reflects the selection.
        window.location.reload();
    };

    // Troca de idioma feita em OUTRA aba (ex.: home ou outra cidade aberta ao
    // mesmo tempo): o evento "storage" só dispara nas abas que NÃO fizeram a
    // mudança. Recarrega para reaplicar tudo (tours, textos, cartão de
    // informações etc.) do mesmo jeito que já acontece na aba que trocou.
    // Importante: por essa altura o localStorage já mudou (é por isso que o
    // evento disparou), então comparar com getCurrentLang() de novo compararia
    // o valor novo com ele mesmo — por isso o idioma já aplicado nesta aba é
    // capturado uma única vez aqui, no carregamento.
    const langAppliedOnLoad = getCurrentLang();
    window.addEventListener('storage', (event) => {
        if (event.key !== storageKey || !event.newValue) return;
        if (normalizeLang(event.newValue) !== langAppliedOnLoad) {
            window.location.reload();
        }
    });

    const initLanguageSelector = () => {
        const wrapper = document.querySelector('#langSelector');
        if (!wrapper) return;

        const btn = wrapper.querySelector('#langBtn');
        const list = wrapper.querySelector('#langList');
        if (!btn || !list) return;

        const current = getCurrentLang();
        setDocumentLang(current);
        updateLangSelectorButton(current);
        applyTranslations(current);

        btn.addEventListener('click', (event) => {
            event.stopPropagation();

            if (window.matchMedia('(max-width: 900px)').matches) {
                toggleMobileMenu('lang');
                return;
            }

            wrapper.classList.toggle('open');
        });

        list.addEventListener('click', (event) => {
            event.stopPropagation();
            const target = event.target.closest('li[data-lang]');
            if (!target) return;

            const lang = target.getAttribute('data-lang');
            selectLanguage(lang);
            wrapper.classList.remove('open');
            if (window.matchMedia('(max-width: 900px)').matches) {
                closeMobileMenu();
            }
        });

        document.addEventListener('click', (event) => {
            if (!wrapper.contains(event.target)) {
                wrapper.classList.remove('open');
            }
        });
    };

    const mobileMenuState = {
        open: false,
        view: 'main'
    };

    const getMobileMenuContainer = () => document.getElementById('mobileMenuContainer');

    const updateMobileMenuView = () => {
        const container = getMobileMenuContainer();
        if (!container) return;

        const title = container.querySelector('#mobileMenuTitle');
        const back = container.querySelector('#mobileMenuBack');
        const views = container.querySelectorAll('.mobile-menu-view');

        views.forEach((viewEl) => {
            viewEl.classList.toggle('active', viewEl.dataset.view === mobileMenuState.view);
        });

        if (title) {
            title.textContent = mobileMenuState.view === 'lang' ? 'Idiomas' : 'Menu';
        }

        if (back) {
            back.style.visibility = mobileMenuState.view === 'main' ? 'hidden' : 'visible';
        }

        if (!mobileMenuState.open && container.contains(document.activeElement)) {
            document.activeElement.blur();
        }

        container.setAttribute('aria-hidden', mobileMenuState.open ? 'false' : 'true');
        container.inert = !mobileMenuState.open;

        if (mobileMenuState.open) {
            container.classList.add('open');
        } else {
            container.classList.remove('open');
        }
    };

    const closeMobileMenu = () => {
        mobileMenuState.open = false;
        mobileMenuState.view = 'main';
        const burger = document.querySelector('.hamburger');
        if (burger) burger.classList.remove('open');
        updateMobileMenuView();
    };

    const toggleMobileMenu = (view = 'main') => {
        syncMobileProfileUserView();
        mobileMenuState.view = view;
        mobileMenuState.open = true;
        updateMobileMenuView();
    };

    function bindMobileProfileActions(userBlock) {
        userBlock.querySelectorAll('.profile-item').forEach((item) => {
            item.addEventListener('click', (event) => {
                event.preventDefault();
                const action = item.getAttribute('data-profile-action');
                if (action === 'login') {
                    closeMobileMenu();
                    const loginLink = document.querySelector('[data-profile-action="login"]');
                    if (loginLink) loginLink.click();
                } else if (action === 'register') {
                    closeMobileMenu();
                    const registerLink = document.querySelector('[data-profile-action="register"]');
                    if (registerLink) registerLink.click();
                } else if (action === 'my-reservations') {
                    closeMobileMenu();
                    window.openMyReservationsModal?.();
                } else if (action === 'my-data') {
                    closeMobileMenu();
                    window.openUserDataModal?.();
                } else if (action === 'manage') {
                    closeMobileMenu();
                    redirectToManagementPage();
                } else if (action === 'principal') {
                    closeMobileMenu();
                    redirectToPrincipalPage();
                } else if (action === 'logout') {
                    closeMobileMenu();
                    const logoutLink = document.querySelector('.profile-dropdown [data-profile-action="logout"]');
                    if (logoutLink) logoutLink.click();
                }
            });
        });
    }

    function syncMobileProfileUserView() {
        const container = getMobileMenuContainer();
        const userView = container?.querySelector('.mobile-menu-user');
        const profileDropdown = document.querySelector('.profile-dropdown');
        if (!userView || !profileDropdown) return;

        userView.innerHTML = '';
        const userBlock = document.createElement('div');
        userBlock.className = 'mobile-profile-dropdown';
        userBlock.innerHTML = profileDropdown.innerHTML;
        userView.appendChild(userBlock);
        bindMobileProfileActions(userBlock);
    }

    window.syncMobileProfileUserView = syncMobileProfileUserView;

    const initMobileMenuContent = () => {
        const container = getMobileMenuContainer();
        const nav = document.querySelector('nav');
        const langList = document.querySelector('#langList');
        const profileDropdown = document.querySelector('.profile-dropdown');
        const mainView = container?.querySelector('.mobile-menu-main');
        const langView = container?.querySelector('.mobile-menu-lang');
        const userView = container?.querySelector('.mobile-menu-user');

        if (!container || !mainView || !langView || !userView || !nav || !langList || !profileDropdown) return;

        mainView.innerHTML = nav.innerHTML;

        const accountEntry = document.createElement('button');
        accountEntry.type = 'button';
        accountEntry.className = 'mobile-menu-launcher';
        accountEntry.textContent = 'Conta';
        accountEntry.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleMobileMenu('user');
        });
        mainView.insertBefore(accountEntry, mainView.firstChild);

        mainView.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                closeMobileMenu();
            });
        });

        const cloneLang = langList.cloneNode(true);
        cloneLang.id = 'mobileLangList';
        cloneLang.classList.add('mobile-lang-list');
        cloneLang.querySelectorAll('li[data-lang]').forEach((item) => {
            item.addEventListener('click', (event) => {
                const lang = item.getAttribute('data-lang');
                if (lang) {
                    selectLanguage(lang);
                    closeMobileMenu();
                }
            });
        });

        langView.innerHTML = '';
        const langWrapper = document.createElement('div');
        langWrapper.className = 'mobile-menu-lang-content';
        langWrapper.appendChild(cloneLang);
        langView.appendChild(langWrapper);

        syncMobileProfileUserView();

        const backButton = container.querySelector('#mobileMenuBack');
        const closeButton = container.querySelector('#mobileMenuClose');

        if (backButton) {
            backButton.addEventListener('click', (event) => {
                event.stopPropagation();
                mobileMenuState.view = 'main';
                updateMobileMenuView();
            });
        }

        if (closeButton) {
            closeButton.addEventListener('click', (event) => {
                event.stopPropagation();
                closeMobileMenu();
            });
        }

        container.addEventListener('click', (event) => {
            if (event.target === container) {
                closeMobileMenu();
            }
        });

        document.addEventListener('click', (event) => {
            if (mobileMenuState.open && !container.contains(event.target) && !document.querySelector('.hamburger').contains(event.target)) {
                closeMobileMenu();
            }
        });

        updateMobileMenuView();
        if (typeof window.applyRoleBasedControls === 'function') {
            window.applyRoleBasedControls();
        }
    };

    const initHamburgerMenu = () => {
        const burger = document.querySelector('.hamburger');
        const nav = document.querySelector('nav');
        if (!burger || !nav) return;

        burger.addEventListener('click', (event) => {
            event.stopPropagation();

            if (window.matchMedia('(max-width: 900px)').matches) {
                if (mobileMenuState.open) {
                    closeMobileMenu();
                } else {
                    toggleMobileMenu('main');
                    burger.classList.add('open');
                    nav.classList.remove('open');
                }
                return;
            }

            burger.classList.toggle('open');
            nav.classList.toggle('open');
        });

        document.addEventListener('click', (event) => {
            if (window.matchMedia('(max-width: 900px)').matches) {
                const container = getMobileMenuContainer();
                if (mobileMenuState.open && container && !container.contains(event.target) && !burger.contains(event.target)) {
                    closeMobileMenu();
                }
                return;
            }

            if (burger.classList.contains('open')) {
                burger.classList.remove('open');
                nav.classList.remove('open');
            }
        });
    };

    const initSmoothAnchorScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                if (anchor.hasAttribute('data-footer-action')) {
                    // Footer action links are handled elsewhere
                    return;
                }

                const href = anchor.getAttribute('href');
                if (!href || href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    };

    const createLoginModal = () => {
        if (document.querySelector('.login-modal-overlay')) return;

        const strings = translations[getCurrentLang()] || translations.pt;
        const overlay = document.createElement('div');
        overlay.className = 'login-modal-overlay';
        overlay.innerHTML = `
            <div class="login-modal" role="dialog" aria-modal="true" aria-label="${strings.login_title}">
                <div class="login-modal__header">
                    <h2 class="login-modal__title" data-i18n="login_title">${strings.login_title}</h2>
                    <button type="button" class="login-modal__close" aria-label="${strings.login_close}">&times;</button>
                </div>
                <form id="loginForm" class="login-modal__form">
                    <div class="login-modal__field">
                        <label for="loginEmail" data-i18n="login_email">${strings.login_email}</label>
                        <input id="loginEmail" type="email" autocomplete="email" required />
                    </div>
                    <div class="login-modal__field login-modal__field--password">
                        <label for="loginPassword" data-i18n="login_password">${strings.login_password}</label>
                        <div class="login-modal__password-wrapper">
                            <input id="loginPassword" type="password" autocomplete="current-password" required />
                            <button type="button" class="login-modal__toggle-password" aria-label="${strings.login_show}">
                                <i class="fa fa-eye" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                    <div class="login-modal__actions">
                        <button type="submit" class="login-modal__submit" data-i18n="login_button">${strings.login_button}</button>
                        <button type="button" class="login-modal__forgot" data-i18n="login_forgot">${strings.login_forgot}</button>
                    </div>
                    <p class="login-modal__switch"><span data-i18n="register_prompt">${strings.register_prompt || 'Não tem conta?'}</span> <button type="button" data-profile-action="register" data-i18n="register_title">${strings.register_title || 'Cadastrar'}</button></p>
                </form>
                <form id="passwordResetForm" class="login-modal__form" style="display:none;">
                    <div class="login-modal__field">
                        <label for="resetEmail" data-i18n="reset_email_label">${strings.reset_email_label || 'Email'}</label>
                        <input id="resetEmail" type="email" autocomplete="email" required />
                    </div>
                    <div class="login-modal__field">
                        <label data-i18n="reset_code_label">${strings.reset_code_label || 'Código de confirmação'}</label>
                        <div class="register-code-group">
                            <input id="resetCode1" class="register-code-input reset-code-input" maxlength="1" inputmode="numeric" pattern="[0-9]*" required />
                            <input id="resetCode2" class="register-code-input reset-code-input" maxlength="1" inputmode="numeric" pattern="[0-9]*" required />
                            <input id="resetCode3" class="register-code-input reset-code-input" maxlength="1" inputmode="numeric" pattern="[0-9]*" required />
                            <input id="resetCode4" class="register-code-input reset-code-input" maxlength="1" inputmode="numeric" pattern="[0-9]*" required />
                            <input id="resetCode5" class="register-code-input reset-code-input" maxlength="1" inputmode="numeric" pattern="[0-9]*" required />
                            <input id="resetCode6" class="register-code-input reset-code-input" maxlength="1" inputmode="numeric" pattern="[0-9]*" required />
                        </div>
                        <div class="register-code-status" style="height:1.2em;margin-bottom:0.5rem;"></div>
                    </div>
                    <div class="login-modal__field login-modal__field--password">
                        <label for="resetNewPassword" data-i18n="reset_new_password_label">${strings.reset_new_password_label || 'Nova senha'}</label>
                        <div class="login-modal__password-wrapper">
                            <input id="resetNewPassword" type="password" autocomplete="new-password" minlength="6" required />
                            <button type="button" class="login-modal__toggle-password reset-toggle-password" aria-label="${strings.login_show || 'Mostrar senha'}">
                                <i class="fa fa-eye" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                    <div class="login-modal__field login-modal__field--password">
                        <label for="resetConfirmPassword" data-i18n="reset_confirm_password_label">${strings.reset_confirm_password_label || 'Confirmar nova senha'}</label>
                        <div class="login-modal__password-wrapper">
                            <input id="resetConfirmPassword" type="password" autocomplete="new-password" minlength="6" required />
                            <button type="button" class="login-modal__toggle-password reset-toggle-password" aria-label="${strings.login_show || 'Mostrar senha'}">
                                <i class="fa fa-eye" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                    <div class="login-modal__actions">
                        <button type="submit" class="login-modal__submit" data-i18n="reset_update_button">${strings.reset_update_button || 'Atualizar senha'}</button>
                        <button type="button" class="login-modal__forgot" id="resetBackToLogin" data-i18n="reset_back_to_login">${strings.reset_back_to_login || 'Voltar ao login'}</button>
                    </div>
                </form>
            </div>
        `;

        const loginFormElement = overlay.querySelector('#loginForm');
        const resetFormElement = overlay.querySelector('#passwordResetForm');
        const modalTitle = overlay.querySelector('.login-modal__title');
        let isResetCodeVerified = false;

        const gatherResetCode = () => {
            const codeInputs = overlay.querySelectorAll('.reset-code-input');
            return Array.from(codeInputs).map((input) => input.value.trim()).join('');
        };

        const setResetCodeState = (state) => {
            const codeInputs = overlay.querySelectorAll('.reset-code-input');
            codeInputs.forEach((input) => {
                input.classList.remove('register-code-valid', 'register-code-invalid');
                if (state === 'valid') input.classList.add('register-code-valid');
                if (state === 'invalid') input.classList.add('register-code-invalid');
            });

            const statusTextEl = overlay.querySelector('.register-code-status');
            if (!statusTextEl) return;

            if (state === 'valid') {
                statusTextEl.textContent = strings.reset_code_confirmed || 'Código confirmado.';
                statusTextEl.style.color = '#28a745';
            } else if (state === 'invalid') {
                statusTextEl.textContent = strings.reset_code_invalid || 'Código inválido.';
                statusTextEl.style.color = '#dc3545';
            } else {
                statusTextEl.textContent = '';
                statusTextEl.style.color = '';
            }
        };

        const fillResetCodeInputs = (text) => {
            const digits = (text || '').replace(/\D/g, '').slice(0, 6).split('');
            const codeInputs = overlay.querySelectorAll('.reset-code-input');
            codeInputs.forEach((input, i) => {
                input.value = digits[i] || '';
            });

            if (digits.length < codeInputs.length) {
                codeInputs[digits.length]?.focus();
            } else {
                codeInputs[codeInputs.length - 1]?.focus();
            }
        };

        const verifyResetCodeApi = async (email, code) => {
            const response = await fetch(`${API_BASE_URL}/verify_password_reset_code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            const payload = await response.json().catch(() => ({}));
            return {
                ok: response.ok,
                payload
            };
        };

        const maybeVerifyResetCode = async () => {
            const email = (overlay.querySelector('#resetEmail')?.value || '').trim().toLowerCase();
            const code = gatherResetCode();

            if (!email || !/^[0-9]{6}$/.test(code)) {
                isResetCodeVerified = false;
                setResetCodeState('neutral');
                return;
            }

            try {
                const verify = await verifyResetCodeApi(email, code);
                const valid = verify.ok && verify.payload?.success;
                isResetCodeVerified = valid;
                setResetCodeState(valid ? 'valid' : 'invalid');
            } catch (error) {
                isResetCodeVerified = false;
                setResetCodeState('invalid');
            }
        };

        const setupResetCodeInputs = () => {
            const codeInputs = overlay.querySelectorAll('.reset-code-input');

            codeInputs.forEach((input, index) => {
                input.addEventListener('input', () => {
                    const value = input.value.replace(/\D/g, '');
                    input.value = value.slice(0, 1);

                    if (input.value && index < codeInputs.length - 1) {
                        codeInputs[index + 1].focus();
                    }

                    isResetCodeVerified = false;
                    setResetCodeState('neutral');
                    maybeVerifyResetCode();
                });

                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Backspace' && !input.value && index > 0) {
                        codeInputs[index - 1].focus();
                    }
                });

                input.addEventListener('paste', (event) => {
                    const paste = (event.clipboardData || window.clipboardData).getData('text') || '';
                    const digits = paste.replace(/\D/g, '');
                    if (!digits) return;
                    event.preventDefault();
                    fillResetCodeInputs(digits);
                    isResetCodeVerified = false;
                    setResetCodeState('neutral');
                    maybeVerifyResetCode();
                });
            });
        };

        const showLoginView = () => {
            if (loginFormElement) loginFormElement.style.display = '';
            if (resetFormElement) resetFormElement.style.display = 'none';
            if (modalTitle) modalTitle.textContent = strings.login_title;
        };

        const setResetRequestLoading = (isLoading) => {
            const forgotBtn = overlay.querySelector('#loginForm .login-modal__forgot');
            if (!forgotBtn) return;
            forgotBtn.disabled = isLoading;
            forgotBtn.classList.toggle('loading', isLoading);
            if (isLoading) {
                forgotBtn.dataset.originalLabel = forgotBtn.textContent;
                forgotBtn.textContent = strings.reset_forgot_loading || 'Aguarde...';
            } else {
                forgotBtn.textContent = forgotBtn.dataset.originalLabel || strings.login_forgot;
            }
        };

        const showResetView = (email = '') => {
            if (loginFormElement) loginFormElement.style.display = 'none';
            if (resetFormElement) resetFormElement.style.display = '';
            if (modalTitle) modalTitle.textContent = strings.reset_title || 'Redefinir senha';

            const resetEmailInput = overlay.querySelector('#resetEmail');
            if (resetEmailInput) resetEmailInput.value = email;
            isResetCodeVerified = false;
            setResetCodeState('neutral');
            overlay.querySelectorAll('.reset-code-input').forEach((input) => {
                input.value = '';
            });
            const firstResetCodeInput = overlay.querySelector('#resetCode1');
            if (firstResetCodeInput) firstResetCodeInput.focus();
        };

        const closeModal = () => {
            showLoginView();
            overlay.classList.remove('open');
            document.body.classList.remove('modal-open');
        };

        const openModal = () => {
            overlay.classList.add('open');
            document.body.classList.add('modal-open');

            const emailInput = overlay.querySelector('#loginEmail');
            const passwordInput = overlay.querySelector('#loginPassword');
            const savedEmail = localStorage.getItem('userEmail');

            if (savedEmail && emailInput) {
                emailInput.value = savedEmail;
            }

            if (savedEmail && passwordInput) {
                passwordInput.focus();
            } else if (emailInput) {
                emailInput.focus();
            } else {
                const firstInput = overlay.querySelector('input');
                if (firstInput) firstInput.focus();
            }
        };

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeModal();
            }
        });

        overlay.querySelector('.login-modal__close')?.addEventListener('click', closeModal);
        overlay.querySelector('.login-modal__forgot')?.addEventListener('click', async () => {
            const loginEmailInput = overlay.querySelector('#loginEmail');
            const email = (loginEmailInput?.value || '').trim().toLowerCase();

            if (!email) {
                alert(strings.reset_enter_email || 'Informe seu e-mail para receber o código.');
                loginEmailInput?.focus();
                return;
            }

            setResetRequestLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/request_password_reset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, lang: window.getCurrentLang?.() || 'pt' })
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok || payload.success === false) {
                    throw new Error(payload.message || strings.reset_request_fail || 'Falha ao solicitar redefinição de senha.');
                }

                alert(strings.reset_email_sent || 'Se o e-mail estiver cadastrado, você receberá um código de redefinição.');
                showResetView(email);
            } catch (error) {
                alert(error?.message || strings.reset_request_fail || 'Não foi possível solicitar redefinição de senha.');
            } finally {
                setResetRequestLoading(false);
            }
        });

        overlay.querySelector('#resetBackToLogin')?.addEventListener('click', () => {
            showLoginView();
            const loginPasswordInput = overlay.querySelector('#loginPassword');
            if (loginPasswordInput) loginPasswordInput.focus();
        });

        overlay.querySelector('#resetEmail')?.addEventListener('input', () => {
            isResetCodeVerified = false;
            setResetCodeState('neutral');
            maybeVerifyResetCode();
        });

        resetFormElement?.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = (overlay.querySelector('#resetEmail')?.value || '').trim().toLowerCase();
            const code = gatherResetCode();
            const newPassword = overlay.querySelector('#resetNewPassword')?.value || '';
            const confirmPassword = overlay.querySelector('#resetConfirmPassword')?.value || '';

            if (!email || !code || !newPassword || !confirmPassword) {
                alert(strings.reset_fill_all || 'Preencha todos os campos para redefinir sua senha.');
                return;
            }

            if (!/^[0-9]{6}$/.test(code)) {
                alert(strings.reset_code_invalid_digits || 'Digite um código válido de 6 dígitos.');
                return;
            }

            if (!isResetCodeVerified) {
                await maybeVerifyResetCode();
                if (!isResetCodeVerified) {
                    alert(strings.reset_code_invalid_or_expired || 'Código de recuperação inválido ou expirado.');
                    return;
                }
            }

            if (newPassword.length < 6) {
                alert(strings.reset_password_min_length || 'A nova senha deve ter no mínimo 6 caracteres.');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert(strings.reset_password_mismatch || 'A confirmação da senha não confere.');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/reset_password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        code,
                        new_password: newPassword
                    })
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok || !payload.success) {
                    throw new Error(payload.message || strings.reset_password_failed || 'Falha ao redefinir senha.');
                }

                alert(strings.reset_success || 'Senha redefinida com sucesso. Faça login com a nova senha.');
                showLoginView();

                const loginEmailInput = overlay.querySelector('#loginEmail');
                const loginPasswordInput = overlay.querySelector('#loginPassword');
                if (loginEmailInput) loginEmailInput.value = email;
                if (loginPasswordInput) {
                    loginPasswordInput.value = '';
                    loginPasswordInput.focus();
                }
            } catch (error) {
                alert(error?.message || strings.reset_password_failed_now || 'Não foi possível redefinir a senha agora.');
            }
        });

        setupResetCodeInputs();

        const passwordToggleButtons = overlay.querySelectorAll('.login-modal__toggle-password');
        passwordToggleButtons.forEach((btn) => {
            const input = btn.closest('.login-modal__password-wrapper')?.querySelector('input');
            if (!input) return;

            btn.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';

                btn.setAttribute('aria-label', isPassword ? strings.login_hide : strings.login_show);

                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = isPassword ? 'fa fa-eye-slash' : 'fa fa-eye';
                }
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && overlay.classList.contains('open')) {
                closeModal();
            }
        });

        document.body.appendChild(overlay);
    };

    const createRegisterModal = () => {
        if (document.querySelector('.register-modal-overlay')) return;

        const strings = translations[getCurrentLang()] || translations.pt;
        const overlay = document.createElement('div');
        overlay.className = 'register-modal-overlay';
        overlay.innerHTML = `
            <div class="login-modal" role="dialog" aria-modal="true" aria-label="${strings.register_title}">
                <div class="login-modal__header">
                    <h2 class="login-modal__title" data-i18n="register_title">${strings.register_title}</h2>
                    <button type="button" class="login-modal__close" aria-label="${strings.register_close}">&times;</button>
                </div>
                <form class="login-modal__form">
                    <div class="register-step register-step--1 active">
                        <div class="login-modal__field">
                            <label for="registerFirstName" data-i18n="register_first_name">${strings.register_first_name}</label>
                            <input id="registerFirstName" type="text" autocomplete="given-name" required />
                        </div>
                        <div class="login-modal__field">
                            <label for="registerLastName" data-i18n="register_last_name">${strings.register_last_name}</label>
                            <input id="registerLastName" type="text" autocomplete="family-name" required />
                        </div>
                        <div class="login-modal__field">
                            <label for="registerEmail" data-i18n="register_email">${strings.register_email}</label>
                            <input id="registerEmail" type="email" autocomplete="email" required />
                        </div>
                        <div class="login-modal__field">
                            <label for="registerDob" data-i18n="register_dob">${strings.register_dob}</label>
                            <input id="registerDob" type="date" required />
                        </div>
                        <div class="login-modal__field">
                            <label for="registerPhone" data-i18n="register_phone">${strings.register_phone}</label>
                            <input id="registerPhone" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="tel" required />
                        </div>
                        <div class="login-modal__field">
                            <label for="registerCountry" data-i18n="register_country">${strings.register_country}</label>
                            <input id="registerCountry" type="text" list="countryList" autocomplete="country" required />
                            <datalist id="countryList"></datalist>
                        </div>
                        <div class="login-modal__field">
                            <label for="registerGender" data-i18n="register_gender">${strings.register_gender}</label>
                            <select id="registerGender" required>
                                <option value="" selected disabled>—</option>
                                <option value="male" data-i18n="register_gender_male">${strings.register_gender_male}</option>
                                <option value="female" data-i18n="register_gender_female">${strings.register_gender_female}</option>
                                <option value="nonbinary" data-i18n="register_gender_nonbinary">${strings.register_gender_nonbinary}</option>
                                <option value="prefer_not" data-i18n="register_gender_prefer_not">${strings.register_gender_prefer_not}</option>
                                <option value="other" data-i18n="register_gender_other">${strings.register_gender_other}</option>
                            </select>
                        </div>
                        <div class="login-modal__actions">
                            <button type="button" class="login-modal__next" data-i18n="register_next">${strings.register_next}</button>
                        </div>
                    </div>
                    <div class="register-step register-step--2">
                        <p class="register-code-spam-hint" data-i18n="register_code_spam_hint" style="font-size:0.85rem; color:#374151; background:#fff8e1; border:1px solid #ffe082; border-radius:8px; padding:0.5rem 0.75rem; margin:0 0 0.75rem;">${strings.register_code_spam_hint}</p>
                        <div class="login-modal__field register-code-field">
                            <label data-i18n="register_code">${strings.register_code}</label>
                            <div class="register-code-group">
                                <input id="registerCode1" class="register-code-input" maxlength="1" inputmode="numeric" pattern="[0-9]*" required />
                                <input id="registerCode2" class="register-code-input" maxlength="1" inputmode="numeric" pattern="[0-9]*" required />
                                <input id="registerCode3" class="register-code-input" maxlength="1" inputmode="numeric" pattern="[0-9]*" required />
                                <input id="registerCode4" class="register-code-input" maxlength="1" inputmode="numeric" pattern="[0-9]*" required />
                                <input id="registerCode5" class="register-code-input" maxlength="1" inputmode="numeric" pattern="[0-9]*" required />
                                <input id="registerCode6" class="register-code-input" maxlength="1" inputmode="numeric" pattern="[0-9]*" required />
                            </div>
                        </div>
                        <div class="register-code-status" style="height:1.2em;margin-bottom:0.5rem;"></div>
                        <div class="login-modal__resend">
                            <button type="button" class="register-resend-button" disabled data-i18n="register_resend_code">
                                ${strings.register_resend_code}
                            </button>
                        </div>
                        <div class="register-liberacao-request" style="margin:0 0 0.75rem;">
                            <button type="button" class="register-request-liberation-button" data-i18n="register_request_liberation" style="background:none; border:none; color:#1f6feb; text-decoration:underline; cursor:pointer; font-size:0.85rem; padding:0;">${strings.register_request_liberation}</button>
                            <span class="register-liberacao-status" style="display:block; font-size:0.8rem; margin-top:0.25rem; color:#374151;"></span>
                        </div>
                        <div class="register-liberado-hint" data-i18n="register_liberado_hint" style="display:none; font-size:0.85rem; color:#1a7f37; background:#e6f4ea; border:1px solid #a6d8b5; border-radius:8px; padding:0.5rem 0.75rem; margin:0 0 0.75rem;">${strings.register_liberado_hint}</div>
                        <div class="login-modal__field login-modal__field--password">
                            <label for="registerPassword" data-i18n="register_password">${strings.register_password}</label>
                            <div class="login-modal__password-wrapper">
                                <input id="registerPassword" type="password" autocomplete="new-password" required />
                                <button type="button" class="login-modal__toggle-password" aria-label="${strings.login_show}">
                                    <i class="fa fa-eye" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                        <div class="login-modal__field login-modal__field--password">
                            <label for="registerConfirm" data-i18n="register_confirm">${strings.register_confirm}</label>
                            <div class="login-modal__password-wrapper">
                                <input id="registerConfirm" type="password" autocomplete="new-password" required />
                                <button type="button" class="login-modal__toggle-password" aria-label="${strings.login_show}">
                                    <i class="fa fa-eye" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                        <div class="login-modal__actions login-modal__actions--row">
                            <button type="button" class="login-modal__back" data-i18n="register_back">${strings.register_back}</button>
                            <button type="submit" class="login-modal__submit" data-i18n="register_button">${strings.register_button}</button>
                        </div>
                    </div>
                </form>
            </div>
        `;

        const closeModal = () => {
            overlay.classList.remove('open');
            document.body.classList.remove('modal-open');
            stopResendCountdown();
        };

        const openModal = () => {
            overlay.classList.add('open');
            document.body.classList.add('modal-open');
            showStep(1);
            const firstInput = overlay.querySelector('input');
            if (firstInput) firstInput.focus();
        };

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeModal();
            }
        });

        overlay.querySelector('.login-modal__close')?.addEventListener('click', closeModal);

        const step1 = overlay.querySelector('.register-step--1');
        const step2 = overlay.querySelector('.register-step--2');
        const nextBtn = overlay.querySelector('.login-modal__next');
        const backBtn = overlay.querySelector('.login-modal__back');
        const form = overlay.querySelector('.login-modal__form');

        let resendInterval = null;
        let remainingSeconds = 0;

        const resendButton = () => overlay.querySelector('.register-resend-button');
        let pendingRegisterEmail = '';
        let isCodeVerified = false;
        let lastVerifiedCode = '';
        // true quando o suporte já liberou este e-mail manualmente (ver
        // /solicitar_liberacao_cadastro) — nesse caso não existe código real
        // pra digitar, o campo/reenvio ficam escondidos e isCodeVerified é
        // forçado a true direto, sem chamar /verify_confirmation_code.
        let isLiberadoFlow = false;
        const submitButton = overlay.querySelector('.login-modal__submit');

        const updateSubmitButtonState = () => {
            if (submitButton) {
                submitButton.disabled = !isCodeVerified;
            }
        };

        const applyLiberadoState = (liberado) => {
            isLiberadoFlow = liberado;
            const codeField = overlay.querySelector('.register-code-field');
            const resendDiv = overlay.querySelector('.login-modal__resend');
            const liberacaoDiv = overlay.querySelector('.register-liberacao-request');
            const spamHint = overlay.querySelector('.register-code-spam-hint');
            const liberadoHint = overlay.querySelector('.register-liberado-hint');
            if (codeField) codeField.style.display = liberado ? 'none' : '';
            if (resendDiv) resendDiv.style.display = liberado ? 'none' : '';
            if (liberacaoDiv) liberacaoDiv.style.display = liberado ? 'none' : '';
            if (spamHint) spamHint.style.display = liberado ? 'none' : '';
            if (liberadoHint) liberadoHint.style.display = liberado ? 'block' : 'none';
            if (liberado) {
                isCodeVerified = true;
                stopResendCountdown();
            }
            updateSubmitButtonState();
        };

        const setNextButtonLoading = (isLoading) => {
            if (!nextBtn) return;
            nextBtn.disabled = isLoading;
            nextBtn.classList.toggle('loading', isLoading);
            if (isLoading) {
                nextBtn.dataset.originalLabel = nextBtn.textContent;
                nextBtn.textContent = strings.register_next_loading || 'Carregando...';
            } else {
                nextBtn.textContent = nextBtn.dataset.originalLabel || strings.register_next;
            }
        };

        const sendConfirmationCodeApi = async (email) => {
            try {
                const apiBaseUrl = window.API_BASE_URL || 'http://127.0.0.1:5000';
                const response = await fetch(`${apiBaseUrl}/solicitar_codigo`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, lang: window.getCurrentLang?.() || 'pt' })
                });

                const text = await response.text();
                let payload;
                try {
                    payload = text ? JSON.parse(text) : null;
                } catch (_err) {
                    payload = text;
                }

                return {
                    ok: response.ok && payload?.success !== false,
                    status: response.status,
                    payload
                };
            } catch (error) {
                console.error('sendConfirmationCodeApi error:', error);
                return {
                    ok: false,
                    status: null,
                    payload: { message: error.message || 'Falha de rede ou CORS na requisição' }
                };
            }
        };

        const verifyConfirmationCodeApi = async (email, code) => {
            const fetchFn = typeof apiFetch !== 'undefined' ? apiFetch : window.apiFetch;
        if (typeof fetchFn === 'undefined') {
            throw new Error('apiFetch não encontrado.');
        }

        const payload = await fetchFn('/verify_confirmation_code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, code })
            });
            return { ok: true, payload };
        };

        const gatherRegisterCode = () => {
            const codeInputs = overlay.querySelectorAll('.register-code-input');
            const code = Array.from(codeInputs).map(input => input.value.trim()).join('');
            return code;
        };

        const setCodeInputsState = (state) => {
            const codeInputs = overlay.querySelectorAll('.register-code-input');
            codeInputs.forEach(input => {
                input.classList.remove('register-code-valid', 'register-code-invalid');
                if (state === 'valid') input.classList.add('register-code-valid');
                if (state === 'invalid') input.classList.add('register-code-invalid');
            });

            const statusTextEl = overlay.querySelector('.register-code-status');
            if (statusTextEl) {
                if (state === 'valid') {
                    statusTextEl.textContent = strings.register_code_valid || 'Código válido';
                    statusTextEl.style.color = '#28a745';
                } else if (state === 'invalid') {
                    statusTextEl.textContent = strings.register_code_invalid_try_again || 'Código inválido, verifique e tente novamente';
                    statusTextEl.style.color = '#dc3545';
                } else {
                    statusTextEl.textContent = '';
                }
            }
        };

        const fillCodeInputs = (text) => {
            const digits = text.replace(/[^0-9]/g, '').slice(0, 6).split('');
            const codeInputs = overlay.querySelectorAll('.register-code-input');
            codeInputs.forEach((input, i) => {
                input.value = digits[i] || '';
            });
            if (digits.length < codeInputs.length) {
                codeInputs[digits.length].focus();
            } else {
                codeInputs[codeInputs.length - 1].focus();
            }
        };

        const setupCodeInputs = () => {
            const codeInputs = overlay.querySelectorAll('.register-code-input');
            codeInputs.forEach((input, index) => {
                input.addEventListener('input', async (event) => {
                    let value = event.target.value.replace(/[^0-9]/g, '');

                    if (value.length > 1) {
                        fillCodeInputs(value);
                        value = value[0];
                    }

                    event.target.value = value;

                    if (value.length === 1 && index < codeInputs.length - 1) {
                        codeInputs[index + 1].focus();
                    }

                    const code = gatherRegisterCode();
                    if (/^[0-9]{6}$/.test(code) && pendingRegisterEmail) {
                        try {
                            const verify = await verifyConfirmationCodeApi(pendingRegisterEmail, code);
                            if (verify.ok && verify.payload.success) {
                                isCodeVerified = true;
                                setCodeInputsState('valid');
                            } else {
                                isCodeVerified = false;
                                setCodeInputsState('invalid');
                            }
                        } catch (_err) {
                            isCodeVerified = false;
                            setCodeInputsState('invalid');
                        }
                        updateSubmitButtonState();
                    } else {
                        isCodeVerified = false;
                        setCodeInputsState('neutral');
                        updateSubmitButtonState();
                    }
                });

                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Backspace' && !event.target.value && index > 0) {
                        codeInputs[index - 1].focus();
                    }
                });

                input.addEventListener('paste', (event) => {
                    event.preventDefault();
                    const paste = (event.clipboardData || window.clipboardData).getData('text');
                    if (!paste) return;

                    fillCodeInputs(paste);

                    const code = gatherRegisterCode();
                    if (/^[0-9]{6}$/.test(code) && pendingRegisterEmail) {
                        verifyConfirmationCodeApi(pendingRegisterEmail, code)
                            .then(({ ok, payload }) => {
                                isCodeVerified = ok && payload.success;
                                if (isCodeVerified) setCodeInputsState('valid');
                                else setCodeInputsState('invalid');
                                updateSubmitButtonState();
                            })
                            .catch(() => {
                                isCodeVerified = false;
                                setCodeInputsState('invalid');
                                updateSubmitButtonState();
                            });
                    } else {
                        isCodeVerified = false;
                        setCodeInputsState('neutral');
                        updateSubmitButtonState();
                    }
                });
            });
        };


        const registerUserApi = async (userData) => {
            const apiBaseUrl = window.API_BASE_URL || 'http://127.0.0.1:5000';
            try {
                const response = await fetch(`${apiBaseUrl}/register_user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });

                const text = await response.text();
                let payload;
                try {
                    payload = text ? JSON.parse(text) : null;
                } catch (_err) {
                    payload = text;
                }

                return {
                    ok: response.ok && payload?.success !== false,
                    status: response.status,
                    payload
                };
            } catch (error) {
                console.error('registerUserApi error:', error);
                return {
                    ok: false,
                    status: null,
                    payload: { message: error.message || 'Falha de rede ou CORS na requisição' }
                };
            }
        };

        const updateResendButton = (seconds) => {
            const button = resendButton();
            if (!button) return;
            if (seconds > 0) {
                button.disabled = true;
                button.textContent = `${strings.register_resend_wait} ${seconds}s`;
            } else {
                button.disabled = false;
                button.textContent = strings.register_resend_code;
            }
        };

        const startResendCountdown = (addSeconds = 60) => {
            remainingSeconds = Math.max(0, remainingSeconds) + addSeconds;
            updateResendButton(remainingSeconds);
            if (resendInterval) return;

            resendInterval = setInterval(() => {
                if (remainingSeconds <= 0) {
                    clearInterval(resendInterval);
                    resendInterval = null;
                    updateResendButton(0);
                    return;
                }
                remainingSeconds -= 1;
                updateResendButton(remainingSeconds);
            }, 1000);
        };

        const stopResendCountdown = () => {
            if (resendInterval) {
                clearInterval(resendInterval);
                resendInterval = null;
            }
            remainingSeconds = 0;
            updateResendButton(0);
        };

        const showStep = (step) => {
            if (step1) step1.classList.toggle('active', step === 1);
            if (step2) step2.classList.toggle('active', step === 2);

            if (step === 2) {
                isCodeVerified = false;
                updateSubmitButtonState();
                startResendCountdown();
                const firstCodeInput = overlay.querySelector('#registerCode1');
                if (firstCodeInput) firstCodeInput.focus();
            } else {
                stopResendCountdown();
            }
        };

        setupCodeInputs();

        nextBtn?.addEventListener('click', async () => {
            const firstName = overlay.querySelector('#registerFirstName');
            const lastName = overlay.querySelector('#registerLastName');
            const email = overlay.querySelector('#registerEmail') || overlay.querySelector('#register-email');
            const dob = overlay.querySelector('#registerDob');
            const phone = overlay.querySelector('#registerPhone');
            const country = overlay.querySelector('#registerCountry');
            const gender = overlay.querySelector('#registerGender');

            const isValidEmail = (value) => {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            };

            const isValidPhone = (value) => {
                return /^[0-9]{7,15}$/.test(value.replace(/\s+/g, ''));
            };

            if (!firstName?.value || !lastName?.value || !email?.value || !dob?.value || !phone?.value || !country?.value || !gender?.value) {
                alert(strings.register_fill_all);
                return;
            }

            if (!isValidEmail(email.value)) {
                alert(strings.register_invalid_email);
                return;
            }

            if (!isValidPhone(phone.value)) {
                alert(strings.register_invalid_phone);
                return;
            }

            const dobDate = new Date(dob.value);
            const today = new Date();
            const minDob = new Date();
            minDob.setFullYear(today.getFullYear() - 123);

            if (Number.isNaN(dobDate.getTime()) || dobDate > today || dobDate < minDob) {
                alert(strings.register_invalid_dob);
                return;
            }

            isCodeVerified = false;
            updateSubmitButtonState();
            setNextButtonLoading(true);

            const emailValue = email.value.trim().toLowerCase();

            try {
                const { ok, status, payload } = await sendConfirmationCodeApi(emailValue);
                if (!ok || !payload?.success) {
                    const message = status === 409
                        ? strings.register_email_already_registered || 'Este e-mail já está cadastrado. Você pode recuperar sua senha ou, se necessário, entre em contato para obter ajuda.'
                        : (payload?.message || strings.register_code_send_fail || 'Falha ao enviar o código de confirmação.');
                    if (typeof showGlobalNotification === 'function') {
                        showGlobalNotification(message, 'error');
                    } else {
                        alert(message);
                    }
                    return;
                }

                pendingRegisterEmail = emailValue;
                showStep(2);
                if (payload?.liberado) {
                    applyLiberadoState(true);
                } else {
                    applyLiberadoState(false);
                    startResendCountdown(60);
                }
            } catch (err) {
                console.error('Erro ao enviar código de confirmação:', err);
                const message = strings.register_code_send_fail || 'Erro ao enviar o código de confirmação.';
                if (typeof window.showGlobalNotification === 'function') {
                    window.showGlobalNotification(message, 'error');
                } else {
                    alert(message);
                }
            } finally {
                setNextButtonLoading(false);
            }
        });

        overlay.querySelector('.register-request-liberation-button')?.addEventListener('click', async () => {
            if (!pendingRegisterEmail) return;
            const statusEl = overlay.querySelector('.register-liberacao-status');
            const button = overlay.querySelector('.register-request-liberation-button');
            if (button) button.disabled = true;
            if (statusEl) statusEl.textContent = strings.register_liberation_requesting || 'Enviando solicitação...';
            try {
                const apiBaseUrl = window.API_BASE_URL || 'http://127.0.0.1:5000';
                const nome = [
                    overlay.querySelector('#registerFirstName')?.value.trim(),
                    overlay.querySelector('#registerLastName')?.value.trim()
                ].filter(Boolean).join(' ');
                const response = await fetch(`${apiBaseUrl}/solicitar_liberacao_cadastro`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: pendingRegisterEmail,
                        nome,
                        celular: overlay.querySelector('#registerPhone')?.value.trim() || '',
                        pais: overlay.querySelector('#registerCountry')?.value.trim() || ''
                    })
                });
                const result = await response.json().catch(() => ({}));
                if (statusEl) {
                    statusEl.textContent = response.ok && result?.success
                        ? (strings.register_liberation_sent || 'Solicitação enviada! Nossa equipe vai analisar e em breve o acesso estará disponível.')
                        : (result.message || 'Erro ao solicitar.');
                    statusEl.style.color = response.ok && result?.success ? '#1a7f37' : '#dc3545';
                }
                if (result?.liberado) applyLiberadoState(true);
            } catch (error) {
                if (statusEl) statusEl.textContent = strings.register_liberation_request_fail || 'Não foi possível enviar a solicitação. Tente novamente.';
            } finally {
                if (button) button.disabled = false;
            }
        });

        const resendBtn = overlay.querySelector('.register-resend-button');
        resendBtn?.addEventListener('click', () => {
            if (!pendingRegisterEmail) {
                alert(strings.register_email_missing || 'E-mail não encontrado. Refaça o passo anterior.');
                return;
            }

            sendConfirmationCodeApi(pendingRegisterEmail)
                .then(({ ok, payload }) => {
                    if (!ok) {
                        alert(payload.message || 'Falha ao reenviar código.');
                        return;
                    }
                    alert(strings.register_code_sent);
                    startResendCountdown(60);
                })
                .catch((err) => {
                    console.error('Erro ao reenviar código de confirmação:', err);
                    alert(strings.register_resend_error || 'Erro ao reenviar código. Tente novamente.');
                });
        });

        backBtn?.addEventListener('click', () => {
            showStep(1);
        });

        form?.addEventListener('submit', async (event) => {
            event.preventDefault();

            const code = gatherRegisterCode();
            const password = overlay.querySelector('#registerPassword');
            const confirm = overlay.querySelector('#registerConfirm');

            if (!isLiberadoFlow && !/^[0-9]{6}$/.test(code)) {
                alert(strings.register_invalid_code);
                return;
            }

            if (password && confirm && password.value !== confirm.value) {
                alert(strings.register_mismatch);
                return;
            }

            if (!pendingRegisterEmail) {
                alert(strings.register_email_unconfirmed || 'Email não confirmado. Volte ao primeiro passo.');
                return;
            }

            if (!isLiberadoFlow && !isCodeVerified) {
                try {
                    const verify = await verifyConfirmationCodeApi(pendingRegisterEmail, code);
                    if (!verify.ok || !verify.payload?.success) {
                        alert((verify.payload && verify.payload.message) || 'Código inválido.');
                        return;
                    }
                    isCodeVerified = true;
                    setCodeInputsState('valid');
                    updateSubmitButtonState();
                } catch (err) {
                    console.error('Erro na verificação de código:', err);
                    alert(strings.register_code_verify_error || 'Erro ao verificar o código. Tente novamente.');
                    return;
                }
            }

            try {
                const userData = {
                    nome: overlay.querySelector('#registerFirstName')?.value.trim(),
                    sobrenome: overlay.querySelector('#registerLastName')?.value.trim(),
                    email: pendingRegisterEmail,
                    senha: password?.value || '',
                    data_nascimento: overlay.querySelector('#registerDob')?.value || '',
                    celular: overlay.querySelector('#registerPhone')?.value.trim() || '',
                    pais_origem: overlay.querySelector('#registerCountry')?.value.trim() || '',
                    genero: overlay.querySelector('#registerGender')?.value.trim() || ''
                };

                const result = await registerUserApi(userData);
                if (!result.ok) {
                    const message = result.status === 409
                        ? strings.register_email_already_registered || 'Este e-mail já está cadastrado. Você pode recuperar sua senha ou, se necessário, entre em contato para obter ajuda.'
                        : (result.payload?.message || 'Erro ao concluir cadastro.');
                    if (typeof showGlobalNotification === 'function') {
                        showGlobalNotification(message, 'error');
                    } else {
                        alert(message);
                    }
                    return;
                }

                const successMessage = result.payload.message || 'Cadastro concluído com sucesso!';
                if (typeof showGlobalNotification === 'function') {
                    showGlobalNotification(successMessage, 'success');
                } else {
                    alert(successMessage);
                }
                closeModal();
            } catch (err) {
                console.error('Erro no cadastro:', err);
                alert(strings.register_complete_error || 'Erro ao concluir cadastro. Tente novamente.');
            }
        });

        const phoneInput = overlay.querySelector('#registerPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', () => {
                phoneInput.value = phoneInput.value.replace(/[^0-9]/g, '');
            });
        }

        const toggleButtons = overlay.querySelectorAll('.login-modal__toggle-password');
        toggleButtons.forEach((toggleButton) => {
            const passwordInput = toggleButton.closest('.login-modal__password-wrapper')?.querySelector('input');
            if (!passwordInput) return;

            const updateToggle = () => {
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';
                toggleButton.setAttribute('aria-label', isPassword ? strings.login_hide : strings.login_show);
                const icon = toggleButton.querySelector('i');
                if (icon) {
                    icon.className = isPassword ? 'fa fa-eye-slash' : 'fa fa-eye';
                }
            };

            toggleButton.addEventListener('click', updateToggle);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && overlay.classList.contains('open')) {
                closeModal();
            }
        });

        const countryList = [
            'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan',
            'Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
            'Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic',
            'Democratic Republic of the Congo','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia',
            'Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana',
            'Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Ivory Coast',
            'Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan',
            'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg',
            'Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
            'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway',
            'Oman','Pakistan','Palau','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal',
            'Qatar','Romania','Russia','Rwanda',
            'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
            'Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu',
            'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan',
            'Vanuatu','Vatican City','Venezuela','Vietnam',
            'Yemen','Zambia','Zimbabwe'
        ];

        const datalist = overlay.querySelector('#countryList');
        if (datalist) {
            countryList.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                datalist.appendChild(option);
            });
        }

        document.body.appendChild(overlay);
    };

    const initRegisterModal = () => {
        createRegisterModal();
        const registerTriggers = document.querySelectorAll('[data-profile-action="register"]');
        registerTriggers.forEach(trigger => {
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const overlay = document.querySelector('.register-modal-overlay');
                if (!overlay) return;

                const profileMenu = document.querySelector('.profile-menu');
                const profileBtn = document.querySelector('.profile-btn');
                if (profileMenu) profileMenu.classList.remove('open');
                if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
                if (typeof closeMobileMenu === 'function') {
                    closeMobileMenu();
                }

                overlay.classList.add('open');
                document.body.classList.add('modal-open');
                const firstInput = overlay.querySelector('input');
                if (firstInput) firstInput.focus();
            });
        });
    };

    const initLoginModal = () => {
        createLoginModal();
        const loginTriggers = document.querySelectorAll('[data-profile-action="login"]');
        loginTriggers.forEach(trigger => {
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const overlay = document.querySelector('.login-modal-overlay');
                if (!overlay) return;

                const profileMenu = document.querySelector('.profile-menu');
                const profileBtn = document.querySelector('.profile-btn');
                if (profileMenu) {
                    profileMenu.classList.remove('open');
                }
                if (profileBtn) {
                    profileBtn.setAttribute('aria-expanded', 'false');
                }
                if (typeof closeMobileMenu === 'function') {
                    closeMobileMenu();
                }

                overlay.classList.add('open');
                document.body.classList.add('modal-open');

                const emailInput = overlay.querySelector('#loginEmail');
                const passwordInput = overlay.querySelector('#loginPassword');
                const savedEmail = localStorage.getItem('userEmail');

                if (savedEmail && emailInput) {
                    emailInput.value = savedEmail;
                }

                if (savedEmail && passwordInput) {
                    passwordInput.focus();
                } else if (emailInput) {
                    emailInput.focus();
                } else {
                    const firstInput = overlay.querySelector('input');
                    if (firstInput) firstInput.focus();
                }
            });
        });

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (event) => {
                event.preventDefault();

                const email = document.getElementById('loginEmail')?.value?.trim();
                const password = document.getElementById('loginPassword')?.value || '';

                if (!email || !password) {
                
                    alert(strings.login_fill_all || 'Por favor, preencha email e senha.');
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE_URL}/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'same-origin', // Teste CORS/coockie no Github Pages
                        body: JSON.stringify({ username: email, password })
                    });

                    const data = await response.json().catch(() => ({}));

                    if (!response.ok || !data.success) {
                        const message = data.message || `Falha ao conectar (status ${response.status})`;
                        alert('Erro: ' + message);
                        return;
                    }

                    const role = typeof window.normalizeRole === 'function'
                        ? window.normalizeRole(data.role || 'user')
                        : (String(data.role || 'cliente_user').toLowerCase() === 'user' ? 'cliente_user' : String(data.role || 'cliente_user').toLowerCase());
                    const name = data.name || email;
                    localStorage.setItem('userRole', role);
                    localStorage.setItem('userEmail', email);
                    localStorage.setItem('userPhoto', data.foto_perfil || await window.getGravatarUrl(email));
                    localStorage.setItem('userName', name);
                    if (data.phone) {
                        localStorage.setItem('userPhone', data.phone);
                    } else if (data.celular) {
                        localStorage.setItem('userPhone', data.celular);
                    }
                    if (data.token) {
                        localStorage.setItem('authToken', data.token);
                    }
                    if (data.role_permissions && typeof data.role_permissions === 'object') {
                        localStorage.setItem('currentRolePermissions', JSON.stringify(data.role_permissions));
                    } else {
                        localStorage.removeItem('currentRolePermissions');
                    }

                    if (typeof window.loadRolePermissions === 'function') {
                        await window.loadRolePermissions();
                    }
                    if (typeof window.updateProfileMenuUI === 'function') {
                        window.updateProfileMenuUI();
                    }
                    if (typeof window.applyRoleBasedControls === 'function') {
                        window.applyRoleBasedControls();
                    }

                    if (role === 'admin' || role === 'super_admin') {
                        window.redirectToManagementPage();
                    } else {
                        const loginOverlay = document.querySelector('.login-modal-overlay');
                        if (loginOverlay) {
                            loginOverlay.classList.remove('open');
                            document.body.classList.remove('modal-open');
                        }
                        window.location.reload();
                    }
                } catch (error) {
                    console.error('Erro na conexão:', error);

                    const isOnline = navigator.onLine;
                    const loginOverlay = document.querySelector('.login-modal-overlay');
                    const whatsUrl = 'https://wa.me/5521970018590';
                    const mailUrl = 'mailto:riobyfoottour@gmail.com';
                    const currentLang = typeof window.getCurrentLanguage === 'function'
                        ? window.getCurrentLanguage()
                        : (document.documentElement.lang || 'pt').slice(0, 2);
                    const ui = window.uiTranslations?.[currentLang] || window.uiTranslations?.pt || {};

                    if (loginOverlay) {
                        loginOverlay.style.display = 'flex';
                        loginOverlay.style.alignItems = 'center';
                        loginOverlay.style.justifyContent = 'center';
                        loginOverlay.classList.add('open');
                        document.body.classList.add('modal-open');

                        const errorTitle = ui.connectivity_error_title || 'Erro de conexão';
                        const bodyMessage = isOnline
                            ? ui.connectivity_error_body_online || 'Sentimos muito, o servidor está temporariamente inacessível.'
                            : ui.connectivity_error_body_offline || 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
                        const actionMessage = isOnline
                            ? ui.connectivity_error_support_online || 'Entre em contato com o nosso suporte via:'
                            : ui.connectivity_error_support_offline || 'Quando estiver online, você poderá tentar novamente ou contatar suporte via:';
                        const contactPrompt = ui.connectivity_error_contact_prompt || 'WhatsApp ou Email.';
                        const emailButtonText = ui.connectivity_error_open_email || 'Abrir Email';
                        const connectionHint = !isOnline
                            ? `<p style="margin-top:0.5rem; color:#a00; font-weight:bold;">${ui.connectivity_error_check_connection || 'Conecte-se à internet e tente novamente.'}</p>`
                            : '';
                        const imageAlt = ui.connectivity_error_image_alt || 'Erro de conexão';

                        loginOverlay.innerHTML = `
                            <div class="login-modal" role="alertdialog" aria-modal="true" aria-label="${escapeHtml(errorTitle)}">
                                <div class="login-modal__header">
                                    <h2 class="login-modal__title">${escapeHtml(errorTitle)}</h2>
                                    <button type="button" class="login-modal__close" id="auth-support-overlay-close" aria-label="Fechar">&times;</button>
                                </div>
                                <div class="login-modal__body" style="padding:16px; color:#333; line-height:1.5;">
                                    <img class="login-modal__image" src="../imagem/assets/erro.gif" alt="${escapeHtml(imageAlt)}" loading="lazy" />
                                    <p>${bodyMessage}</p>
                                    <p>${actionMessage}</p>
                                    <p><a href="${whatsUrl}" target="_blank" rel="noopener" style="color:#007bff; text-decoration:underline;">WhatsApp</a> ou <a href="${mailUrl}" id="auth-support-email-link" style="color:#007bff; text-decoration:underline;">Email</a>.</p>
                                    <p style="margin-top:1rem;"><button id="auth-support-email-btn" style="padding:8px 12px;border:none;background:#007bff;color:#fff;border-radius:4px;cursor:pointer;">${escapeHtml(emailButtonText)}</button></p>
                                    ${connectionHint}
                                </div>
                            </div>
                        `;

                        const closeOverlayBtn = document.getElementById('auth-support-overlay-close');
                        if (closeOverlayBtn) {
                            closeOverlayBtn.addEventListener('click', () => {
                                loginOverlay.style.display = 'none';
                                loginOverlay.classList.remove('open');
                                document.body.classList.remove('modal-open');
                            });
                        }

                        const emailBtn = document.getElementById('auth-support-email-btn');
                        if (emailBtn) {
                            emailBtn.addEventListener('click', () => {
                                window.location.href = mailUrl;
                            });
                        }

                        const emailLink = document.getElementById('auth-support-email-link');
                        if (emailLink) {
                            emailLink.addEventListener('click', (event) => {
                                event.preventDefault();
                                window.location.href = mailUrl;
                            });
                        }

                        return;
                    }

                    const alertMessage = isOnline
                        ? ui.connectivity_error_body_online || 'Sentimos muito, o servidor está temporariamente inacessível.'
                        : ui.connectivity_error_body_offline || 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
                    alert(alertMessage);
                }
            });
        }
    };

    window.getCurrentLanguage = getCurrentLang;
    window.toggleMobileMenu = toggleMobileMenu;
    window.closeMobileMenu = closeMobileMenu;

    const updateFooterInfo = (key) => {
        const lang = getCurrentLang();
        const strings = translations[lang] || translations.pt;
        const fallbackFooterInfoTitle = window.translationCatalog?.fallbackTexts?.footerInfoTitle || 'Informações';
        const fallbackFooterInfoBody = window.translationCatalog?.fallbackTexts?.footerInfoBody || '<p>Selecione uma opção para ver mais informações.</p>';
        const titleEl = document.querySelector('.footer-info-title') || document.querySelector('.rio-footer-card-title');
        const body = document.getElementById('footerInfoBody') || document.getElementById('rioFooterCardBody');

        // Título/texto de SOBRE, CONTATO e AJUDA são editáveis por página em
        // Gerenciamento > Gerenciamento da página > Textos SOBRE/CONTATO/AJUDA.
        // Se houver override cadastrado para esta página+seção, ele tem prioridade
        // sobre o texto padrão do catálogo de tradução. O admin só digita em
        // português; nos outros idiomas usamos a tradução automática cacheada
        // em override.traducoes[lang] (ver app.py).
        const override = window.__paginaSecaoOverrides?.[key];
        const overrideTraducao = override && lang !== 'pt' ? override.traducoes?.[lang] : null;
        const overrideTitulo = (overrideTraducao && overrideTraducao.titulo) || override?.titulo;
        const overrideTexto = (overrideTraducao && typeof overrideTraducao.texto === 'string') ? overrideTraducao.texto : override?.texto;

        if (titleEl) {
            const titleKey = `footer_${key}_title`;
            titleEl.textContent = overrideTitulo || strings[titleKey] || strings.footer_info_title || fallbackFooterInfoTitle;
        }

        if (!body) return;

        if (overrideTexto) {
            const linhas = overrideTexto.split('\n').map((l) => l.trim()).filter(Boolean);
            body.innerHTML = '';
            linhas.forEach((linha) => {
                const p = document.createElement('p');
                p.textContent = linha;
                body.appendChild(p);
            });
            return;
        }

        const bodyKey = `footer_${key}`;
        body.innerHTML = strings[bodyKey] || fallbackFooterInfoBody;
    };
    window.updateFooterInfo = updateFooterInfo;

    const getReservations = () => {
        try {
            const saved = JSON.parse(localStorage.getItem('reservations') || '[]');
            if (!Array.isArray(saved)) return [];
            return saved.map(r => ({
                tour: r.tour || '',
                when: r.when || new Date().toISOString(),
                url: r.url || '',
                quantity: r.quantity || 1,
                status: r.status || 'Pendente',
                language: r.language || '',
                modality: r.modality || 'free',
                guide: r.guide || '',
                phone: r.phone || ''
            }));
        } catch {
            return [];
        }
    };

    const setReservations = (reservations) => {
        try {
            localStorage.setItem('reservations', JSON.stringify(reservations));
        } catch {
            // ignore
        }
    };

    const addReservation = (reservation) => {
        const all = getReservations();
        const normalized = {
            tour: reservation.tour || '',
            when: reservation.when || new Date().toISOString(),
            url: reservation.url || '',
            quantity: reservation.quantity || 1,
            status: reservation.status || 'Pendente',
            language: reservation.language || '',
            modality: reservation.modality || 'free',
            guide: reservation.guide || '',
            phone: reservation.phone || ''
        };
        all.unshift(normalized);
        setReservations(all);
    };

    const getTours = () => {
        try {
            const saved = JSON.parse(localStorage.getItem('pageTours') || '[]');
            return Array.isArray(saved) ? saved : [];
        } catch {
            return [];
        }
    };

    const setTours = (tours) => {
        try {
            localStorage.setItem('pageTours', JSON.stringify(Array.isArray(tours) ? tours : []));
        } catch {
            // ignore
        }
    };

    const mapBackendTourToPageTour = (tour) => {
        return {
            id: String(tour?.id ?? ''),
            name: tour?.nome_tour || tour?.name || '',
            languages: tour?.idiomas || '',
            meeting: tour?.encontro || '',
            identification: tour?.identificacao || '',
            link: tour?.link_tour || tour?.mapUrl || '',
            value: tour?.valor ?? 0,
            periodo: tour?.periodo || '',
            saida: tour?.saida || '',
            grupo: tour?.grupo || '',
            duracao: tour?.duracao || '',
            diasSemana: tour?.dias_semana || '',
            inclui: tour?.inclui || '',
            roteiro: tour?.roteiro || '',
            pontoEmbarque: tour?.ponto_embarque || '',
            pontoDesembarque: tour?.ponto_desembarque || '',
            traducoes: tour?.traducoes || {},
            status: tour?.estado || '',
            cidade: tour?.cidade || '',
            modalidade: (tour?.modalidade || 'free').toLowerCase(),
            canal_reserva: (tour?.canal_reserva || 'web').toLowerCase(),
            imagens: Array.isArray(tour?.imagens) ? tour.imagens : [],
            ordem: tour?.ordem ?? 0,
            horarios: tour?.horarios || '',
            horarios_por_dia: tour?.horarios_por_dia || ''
        };
    };

    const normalizeTourKey = (value) => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

    // Campos editáveis em Gerenciamento > Gerenciamento da página > Tours da
    // Página. Cada um só aparece no card se preenchido — em branco ou "N/U"
    // (não usar) omite a legenda inteira, sem texto de preenchimento padrão.
    const TOUR_DETAIL_ICONS = {
        periodo: 'fa-calendar', idiomas: 'fa-language', duracao: 'fa-clock', diasSemana: 'fa-calendar-week', horarios: 'fa-calendar-check', saida: 'fa-route',
        encontro: 'fa-map-marker-alt', pontoEmbarque: 'fa-bus', pontoDesembarque: 'fa-bus',
        grupo: 'fa-users', identificacao: 'fa-shirt', inclui: 'fa-check-circle', roteiro: 'fa-list'
    };
    const TOUR_DETAIL_LABELS = {
        pt: { periodo: 'Período', idiomas: 'Idiomas', duracao: 'Duração', diasSemana: 'Dias da semana', saida: 'Saída', encontro: 'Encontro', pontoEmbarque: 'Ponto de embarque', pontoDesembarque: 'Ponto de desembarque', grupo: 'Grupo', identificacao: 'Identificação', inclui: 'Inclui', roteiro: 'Roteiro', horarios: 'Horários disponíveis', valor: 'Valor', estado: 'Estado' },
        en: { periodo: 'Period', idiomas: 'Languages', duracao: 'Duration', diasSemana: 'Days of the week', saida: 'Departure', encontro: 'Meeting', pontoEmbarque: 'Pick-up point', pontoDesembarque: 'Drop-off point', grupo: 'Group', identificacao: 'Identification', inclui: 'Includes', roteiro: 'Itinerary', horarios: 'Available times', valor: 'Price', estado: 'Status' },
        fr: { periodo: 'Période', idiomas: 'Langues', duracao: 'Durée', diasSemana: 'Jours de la semaine', saida: 'Départ', encontro: 'Rendez-vous', pontoEmbarque: "Point d'embarquement", pontoDesembarque: 'Point de débarquement', grupo: 'Groupe', identificacao: 'Identification', inclui: 'Inclus', roteiro: 'Itinéraire', horarios: 'Horaires disponibles', valor: 'Prix', estado: 'Statut' },
        es: { periodo: 'Período', idiomas: 'Idiomas', duracao: 'Duración', diasSemana: 'Días de la semana', saida: 'Salida', encontro: 'Encuentro', pontoEmbarque: 'Punto de embarque', pontoDesembarque: 'Punto de desembarque', grupo: 'Grupo', identificacao: 'Identificación', inclui: 'Incluye', roteiro: 'Itinerario', horarios: 'Horarios disponibles', valor: 'Precio', estado: 'Estado' },
        it: { periodo: 'Periodo', idiomas: 'Lingue', duracao: 'Durata', diasSemana: 'Giorni della settimana', saida: 'Partenza', encontro: 'Incontro', pontoEmbarque: 'Punto di imbarco', pontoDesembarque: 'Punto di sbarco', grupo: 'Gruppo', identificacao: 'Identificazione', inclui: 'Include', roteiro: 'Itinerario', horarios: 'Orari disponibili', valor: 'Prezzo', estado: 'Stato' },
        zh: { periodo: '时期', idiomas: '语言', duracao: '时长', diasSemana: '星期几', saida: '出发地', encontro: '集合', pontoEmbarque: '上车点', pontoDesembarque: '下车点', grupo: '团体', identificacao: '识别', inclui: '包含', roteiro: '行程', horarios: '可预订时间', valor: '价格', estado: '状态' }
    };
    // "Dias da semana" é um valor DERIVADO (quais dias têm horário
    // cadastrado), não texto livre — em vez de depender do admin preencher a
    // tradução manualmente em 6 idiomas (como duracao/inclui/roteiro), o
    // texto é remontado aqui a partir de tour.horarios_por_dia, no idioma
    // atual, sempre automático. Mesma lógica de agrupamento (dias seguidos
    // viram intervalo "Segunda a Sexta") de formatDiasSemanaFromHorarios em
    // Gerenciamento.js — só os rótulos/conectores mudam por idioma.
    const DIAS_SEMANA_ORDEM = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    const DIAS_SEMANA_I18N = {
        pt: { dom: 'Domingo', seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', all: 'Todos os dias', range: ' a ', within: ' e ', join: ', ', last: ' e ' },
        en: { dom: 'Sunday', seg: 'Monday', ter: 'Tuesday', qua: 'Wednesday', qui: 'Thursday', sex: 'Friday', sab: 'Saturday', all: 'Every day', range: ' to ', within: ' and ', join: ', ', last: ' and ' },
        fr: { dom: 'Dimanche', seg: 'Lundi', ter: 'Mardi', qua: 'Mercredi', qui: 'Jeudi', sex: 'Vendredi', sab: 'Samedi', all: 'Tous les jours', range: ' à ', within: ' et ', join: ', ', last: ' et ' },
        es: { dom: 'Domingo', seg: 'Lunes', ter: 'Martes', qua: 'Miércoles', qui: 'Jueves', sex: 'Viernes', sab: 'Sábado', all: 'Todos los días', range: ' a ', within: ' y ', join: ', ', last: ' y ' },
        it: { dom: 'Domenica', seg: 'Lunedì', ter: 'Martedì', qua: 'Mercoledì', qui: 'Giovedì', sex: 'Venerdì', sab: 'Sabato', all: 'Tutti i giorni', range: ' a ', within: ' e ', join: ', ', last: ' e ' },
        zh: { dom: '周日', seg: '周一', ter: '周二', qua: '周三', qui: '周四', sex: '周五', sab: '周六', all: '每天', range: '至', within: '和', join: '、', last: '和' }
    };
    const formatDiasSemanaPorIdioma = (tour, lang) => {
        const dic = DIAS_SEMANA_I18N[lang] || DIAS_SEMANA_I18N.pt;
        let porDia = null;
        try {
            porDia = tour?.horarios_por_dia ? JSON.parse(tour.horarios_por_dia) : null;
        } catch { porDia = null; }
        // Sem horarios_por_dia (tour antigo, nunca migrado): não há como
        // derivar por idioma — cai no texto salvo (em português) como último recurso.
        if (!porDia || typeof porDia !== 'object') {
            return tour?.dias_semana || tour?.diasSemana || '';
        }
        const ativos = DIAS_SEMANA_ORDEM.filter((key) => Array.isArray(porDia[key]) && porDia[key].length > 0);
        if (!ativos.length) return '';
        if (ativos.length === 7) return dic.all;

        const grupos = [];
        let atual = [ativos[0]];
        for (let i = 1; i < ativos.length; i += 1) {
            const idxAnterior = DIAS_SEMANA_ORDEM.indexOf(atual[atual.length - 1]);
            const idxAtual = DIAS_SEMANA_ORDEM.indexOf(ativos[i]);
            if (idxAtual === idxAnterior + 1) {
                atual.push(ativos[i]);
            } else {
                grupos.push(atual);
                atual = [ativos[i]];
            }
        }
        grupos.push(atual);

        const partes = grupos.map((grupo) => {
            if (grupo.length >= 3) return `${dic[grupo[0]]}${dic.range}${dic[grupo[grupo.length - 1]]}`;
            return grupo.map((key) => dic[key]).join(dic.within);
        });

        if (partes.length === 1) return partes[0];
        return `${partes.slice(0, -1).join(dic.join)}${dic.last}${partes[partes.length - 1]}`;
    };
    // "Duração" é texto livre digitado pelo admin, mas na prática usa um
    // vocabulário curto e previsível ("3 a 5 dias", "todos os dias", "2
    // horas"...) — em vez de exigir que o admin digite a tradução manual
    // pros 5 idiomas (aba de tradução do tour), troca-se automaticamente
    // essas palavras/frases conhecidas pelo equivalente no idioma atual.
    // Números e horários ("2h15", "8:00 - 14:00") não têm nenhuma palavra
    // nessa lista, então atravessam sem alteração. Se o admin preencheu a
    // tradução manual daquele idioma mesmo assim, ela sempre tem prioridade
    // (ver uso abaixo, em buildTourDetailsHtml).
    const escapeRegExpTerm = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const DURACAO_TERM_TRANSLATIONS = {
        en: {
            'todos os dias': 'every day', 'aproximadamente': 'approximately', 'cerca de': 'about',
            'meio-dia': 'noon', 'meia-noite': 'midnight',
            'minutos': 'minutes', 'minuto': 'minute', 'semanas': 'weeks', 'semana': 'week',
            'manhã': 'morning', 'tarde': 'afternoon', 'noite': 'night', 'horas': 'hours', 'meses': 'months',
            'anos': 'years', 'hora': 'hour', 'dias': 'days', 'ano': 'year', 'dia': 'day', 'mês': 'month', 'a': 'to'
        },
        fr: {
            'todos os dias': 'tous les jours', 'aproximadamente': 'environ', 'cerca de': 'environ',
            'meio-dia': 'midi', 'meia-noite': 'minuit',
            'minutos': 'minutes', 'minuto': 'minute', 'semanas': 'semaines', 'semana': 'semaine',
            'manhã': 'matin', 'tarde': 'après-midi', 'noite': 'soir', 'horas': 'heures', 'meses': 'mois',
            'anos': 'ans', 'hora': 'heure', 'dias': 'jours', 'ano': 'an', 'dia': 'jour', 'mês': 'mois', 'a': 'à'
        },
        es: {
            'todos os dias': 'todos los días', 'aproximadamente': 'aproximadamente', 'cerca de': 'alrededor de',
            'meio-dia': 'mediodía', 'meia-noite': 'medianoche',
            'minutos': 'minutos', 'minuto': 'minuto', 'semanas': 'semanas', 'semana': 'semana',
            'manhã': 'mañana', 'tarde': 'tarde', 'noite': 'noche', 'horas': 'horas', 'meses': 'meses',
            'anos': 'años', 'hora': 'hora', 'dias': 'días', 'ano': 'año', 'dia': 'día', 'mês': 'mes'
        },
        it: {
            'todos os dias': 'tutti i giorni', 'aproximadamente': 'circa', 'cerca de': 'circa',
            'meio-dia': 'mezzogiorno', 'meia-noite': 'mezzanotte',
            'minutos': 'minuti', 'minuto': 'minuto', 'semanas': 'settimane', 'semana': 'settimana',
            'manhã': 'mattina', 'tarde': 'pomeriggio', 'noite': 'sera', 'horas': 'ore', 'meses': 'mesi',
            'anos': 'anni', 'hora': 'ora', 'dias': 'giorni', 'ano': 'anno', 'dia': 'giorno', 'mês': 'mese'
        },
        zh: {
            'todos os dias': '每天', 'aproximadamente': '大约', 'cerca de': '大约',
            'meio-dia': '中午', 'meia-noite': '午夜',
            'minutos': '分钟', 'minuto': '分钟', 'semanas': '周', 'semana': '周',
            'manhã': '上午', 'tarde': '下午', 'noite': '晚上', 'horas': '小时', 'meses': '月',
            'anos': '年', 'hora': '小时', 'dias': '天', 'ano': '年', 'dia': '天', 'mês': '月', 'a': '至'
        }
    };
    const translateDuracaoAuto = (raw, lang) => {
        const dic = DURACAO_TERM_TRANSLATIONS[lang];
        if (!dic || !raw) return raw || '';
        let out = raw;
        // Frases/palavras mais longas primeiro, senão "todos os dias" nunca
        // seria alcançada (o termo "dias" sozinho já teria consumido a frase).
        Object.keys(dic).sort((a, b) => b.length - a.length).forEach((termo) => {
            const re = new RegExp(`(?<![a-zA-ZÀ-ÿ])${escapeRegExpTerm(termo)}(?![a-zA-ZÀ-ÿ])`, 'gi');
            out = out.replace(re, dic[termo]);
        });
        return out;
    };
    // Textos do botão "Ler mais/Ler menos" usado quando um campo do tour
    // (ex.: Inclui, Roteiro) é longo o bastante pra estourar o clamp de 3
    // linhas do card — ver .rio-tour-detail-line no CSS.
    const TOUR_READ_MORE_LABELS = {
        pt: { more: 'Ler mais', less: 'Ler menos' },
        en: { more: 'Read more', less: 'Read less' },
        fr: { more: 'Lire plus', less: 'Lire moins' },
        es: { more: 'Leer más', less: 'Leer menos' },
        it: { more: 'Leggi di più', less: 'Leggi di meno' },
        zh: { more: '阅读更多', less: '收起' }
    };
    // Rótulos fixos de UI que aparecem em todo card de tour e no aviso da
    // página, independente do conteúdo vindo do banco — a página inteira
    // recarrega ao trocar de idioma (ver selectLanguage), então isso só
    // precisa estar certo na hora em que o card/aviso é montado.
    const TOUR_ACTION_LABELS = {
        pt: { map: 'Ver no Mapa', reserve: 'Reservar Agora', reviews: 'Avaliações', dontShow: 'Não mostrar novamente', proceed: 'Prosseguir' },
        en: { map: 'View on Map', reserve: 'Book Now', reviews: 'Reviews', dontShow: "Don't show again", proceed: 'Proceed' },
        fr: { map: 'Voir sur la carte', reserve: 'Réserver', reviews: 'Avis', dontShow: 'Ne plus afficher', proceed: 'Continuer' },
        es: { map: 'Ver en el mapa', reserve: 'Reservar ahora', reviews: 'Reseñas', dontShow: 'No mostrar de nuevo', proceed: 'Continuar' },
        it: { map: 'Vedi sulla mappa', reserve: 'Prenota ora', reviews: 'Recensioni', dontShow: 'Non mostrare più', proceed: 'Procedi' },
        zh: { map: '查看地图', reserve: '立即预订', reviews: '评价', dontShow: '不再显示', proceed: '继续' }
    };
    window.TOUR_ACTION_LABELS = TOUR_ACTION_LABELS;
    // Corta o TEXTO em si (não só visualmente) para caber em 3 linhas com
    // "…" e o botão "Ler mais" terminando NA mesma linha, coladinho no fim
    // do texto — pedido explícito pra bater com a referência enviada.
    // -webkit-line-clamp/max-height só escondiam o excesso visualmente,
    // então o botão nunca conseguia ficar "no fim da 3ª linha": ou ficava
    // sobreposto (position:absolute) ou empurrado pra linha de baixo (fluxo
    // normal). Value fica isolado em .rio-tour-detail-value (fora do ícone
    // e do rótulo em negrito, que nunca são cortados) especificamente pra
    // essa busca binária ter só o texto variável pra truncar.
    const CLAMP_LINES = 3;
    const wireTourDetailToggles = (container) => {
        if (!container) return;
        // Medir logo após o innerHTML ser trocado pega o card ainda sem layout
        // assentado (altura 0 ou desatualizada) — o botão nunca aparecia mesmo
        // com texto claramente cortado. Adiar pro próximo frame garante que o
        // navegador já terminou de desenhar antes de medir.
        requestAnimationFrame(() => {
            container.querySelectorAll('.rio-tour-detail-line').forEach((lineEl) => {
                const valueEl = lineEl.querySelector('.rio-tour-detail-value');
                const toggle = lineEl.querySelector('.rio-tour-detail-toggle');
                if (!valueEl || !toggle) return;

                // O texto original só é guardado uma vez — chamadas seguintes
                // (troca de idioma, etc.) sempre recriam o HTML do zero, mas
                // por segurança evita truncar um texto que já foi truncado.
                if (valueEl.dataset.fullText === undefined) {
                    valueEl.dataset.fullText = valueEl.textContent;
                }
                const fullText = valueEl.dataset.fullText;

                toggle.classList.remove('rio-detail-visible');
                lineEl.classList.remove('rio-detail-expanded');
                valueEl.textContent = fullText;
                toggle.remove();
                valueEl.after(toggle);

                const lineHeight = parseFloat(getComputedStyle(lineEl).lineHeight) || 22.5;
                const maxHeight = lineHeight * CLAMP_LINES + 1;

                if (lineEl.scrollHeight <= maxHeight) {
                    return; // texto completo já cabe, sem truncar nem mostrar o botão
                }

                toggle.classList.add('rio-detail-visible');
                toggle.textContent = toggle.dataset.more;

                // Busca binária pelo maior prefixo de fullText que, com "…" e
                // o botão logo em seguida (já no DOM, então entra na medição),
                // ainda cabe nas CLAMP_LINES linhas.
                const fits = (n) => {
                    valueEl.textContent = fullText.slice(0, n).trimEnd() + '…';
                    return lineEl.scrollHeight <= maxHeight;
                };
                let lo = 0;
                let hi = fullText.length;
                let best = 0;
                while (lo <= hi) {
                    const mid = (lo + hi) >> 1;
                    if (fits(mid)) {
                        best = mid;
                        lo = mid + 1;
                    } else {
                        hi = mid - 1;
                    }
                }
                const truncatedText = fullText.slice(0, best).trimEnd() + '…';
                valueEl.textContent = truncatedText;

                toggle.onclick = () => {
                    const expanded = lineEl.classList.toggle('rio-detail-expanded');
                    valueEl.textContent = expanded ? fullText : truncatedText;
                    toggle.textContent = expanded ? toggle.dataset.less : toggle.dataset.more;
                };
            });

            // Inclui/Roteiro viram HTML (parágrafos/listas), então o corte
            // caractere a caractere do texto puro acima não serve direto.
            // Mas quando o campo é só parágrafo(s) — sem lista com marcador —
            // dá pra fazer o mesmo corte "…" + botão colado no fim da 3ª
            // linha andando pela árvore de nós de texto (em vez de fatiar a
            // string HTML crua, que quebraria tags no meio). Listas com
            // marcador (✓/✕/•) continuam no clamp visual (max-height): cortar
            // um item de lista no meio da palavra ficaria pior que só
            // esconder o item inteiro.
            container.querySelectorAll('.rio-tour-detail-rich-item').forEach((itemEl) => {
                const bodyEl = itemEl.querySelector('.rio-tour-detail-richbody');
                const toggle = itemEl.querySelector('.rio-tour-detail-toggle-rich');
                if (!bodyEl || !toggle) return;

                itemEl.classList.remove('rio-detail-expanded');
                toggle.classList.remove('rio-detail-visible');
                toggle.textContent = toggle.dataset.more;

                const hasList = !!bodyEl.querySelector('ul');
                if (hasList) {
                    bodyEl.classList.remove('rio-tour-detail-richbody-textcut');
                    if (bodyEl.scrollHeight <= bodyEl.clientHeight + 1) {
                        return; // conteúdo já cabe no clamp, sem botão
                    }
                    toggle.classList.add('rio-detail-visible');
                    toggle.onclick = () => {
                        const expanded = itemEl.classList.toggle('rio-detail-expanded');
                        toggle.textContent = expanded ? toggle.dataset.less : toggle.dataset.more;
                    };
                    return;
                }

                // Só parágrafo(s): mede sem o clamp de CSS (senão o
                // scrollHeight já viria cortado em 3 linhas mesmo quando o
                // texto real tem só 2, e a busca binária nunca acharia o
                // ponto certo) — a classe abaixo desativa o max-height do
                // CSS e deixa CLAMP_LINES aqui ser a única fonte de verdade.
                bodyEl.classList.add('rio-tour-detail-richbody-textcut');
                if (bodyEl.dataset.fullHtml === undefined) {
                    bodyEl.dataset.fullHtml = bodyEl.innerHTML;
                }
                const fullHtml = bodyEl.dataset.fullHtml;
                bodyEl.innerHTML = fullHtml;

                const lineHeight = parseFloat(getComputedStyle(bodyEl).lineHeight) || 22.5;
                const maxHeight = lineHeight * CLAMP_LINES + 1;
                if (bodyEl.scrollHeight <= maxHeight) {
                    return; // texto completo já cabe, sem truncar nem mostrar o botão
                }

                // Precisa ficar visível ANTES da busca binária (não só no
                // final): o botão só ocupa espaço na linha quando não está
                // "display:none", e a busca precisa medir a altura JÁ COM
                // esse espaço contado — senão o texto cabe "sem o botão"
                // durante toda a busca e o botão, ao aparecer só no fim,
                // empurra a última linha pra uma 4ª linha por fora do clamp.
                toggle.classList.add('rio-detail-visible');

                const countVisibleChars = (root) => {
                    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
                    let total = 0;
                    let node;
                    while ((node = walker.nextNode())) total += node.textContent.length;
                    return total;
                };
                const totalChars = countVisibleChars(bodyEl);

                // Reconstrói o HTML completo, corta o n-ésimo caractere
                // visível (percorrendo os text nodes em ordem) e remove tudo
                // que vem depois — devolve o elemento onde o corte aconteceu,
                // pra "…" e o botão entrarem bem ali, mesmo dentro de <p>
                // aninhado, igual o pedido de ficar "colado" no fim do texto.
                const buildTruncated = (n) => {
                    bodyEl.innerHTML = fullHtml;
                    const walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT);
                    let remaining = n;
                    let cutNode = null;
                    const nodes = [];
                    let node;
                    while ((node = walker.nextNode())) nodes.push(node);
                    for (let i = 0; i < nodes.length; i += 1) {
                        const textNode = nodes[i];
                        const len = textNode.textContent.length;
                        if (remaining >= len) {
                            remaining -= len;
                            continue;
                        }
                        textNode.textContent = textNode.textContent.slice(0, remaining).trimEnd();
                        cutNode = textNode;
                        // Sobe da textNode até bodyEl removendo os irmãos-depois em CADA
                        // nível (não só no primeiro) — ex.: quando o corte cai no 1º
                        // parágrafo de vários (Inclui com "Não Inclui:" embaixo, um <p>
                        // por linha), tem que remover TODOS os <p> seguintes, não só os
                        // irmãos dentro do próprio <p> cortado (que normalmente não tem
                        // nenhum, já que cada parágrafo é só um textNode). A remoção
                        // precisa rodar mesmo quando "el" já virou bodyEl nesta mesma
                        // volta — por isso é feita ANTES de checar se deve parar.
                        let el = textNode.parentNode;
                        let sibling = textNode.nextSibling;
                        while (el) {
                            while (sibling) {
                                const next = sibling.nextSibling;
                                sibling.remove();
                                sibling = next;
                            }
                            if (el === bodyEl) break;
                            sibling = el.nextSibling;
                            el = el.parentNode;
                        }
                        break;
                    }
                    return cutNode ? cutNode.parentNode : bodyEl;
                };
                const applyTruncated = (n) => {
                    const cutContainer = buildTruncated(n);
                    cutContainer.appendChild(document.createTextNode('…'));
                    cutContainer.appendChild(toggle);
                    return cutContainer;
                };

                let lo = 0;
                let hi = totalChars;
                let best = 0;
                while (lo <= hi) {
                    const mid = (lo + hi) >> 1;
                    applyTruncated(mid);
                    if (bodyEl.scrollHeight <= maxHeight) {
                        best = mid;
                        lo = mid + 1;
                    } else {
                        hi = mid - 1;
                    }
                }
                applyTruncated(best);
                toggle.onclick = () => {
                    const expanded = itemEl.classList.toggle('rio-detail-expanded');
                    if (expanded) {
                        bodyEl.innerHTML = fullHtml;
                        bodyEl.appendChild(toggle);
                    } else {
                        applyTruncated(best);
                    }
                    toggle.textContent = expanded ? toggle.dataset.less : toggle.dataset.more;
                };
            });
        });
    };
    const setTourDetailsHtml = (el, tour, lang) => {
        if (!el) return;
        el.innerHTML = buildTourDetailsHtml(tour, lang);
        wireTourDetailToggles(el);
    };
    window.setTourDetailsHtml = setTourDetailsHtml;
    const tourFieldVisible = (value) => {
        const v = (value ?? '').toString().trim();
        return !!v && v.toUpperCase() !== 'N/U';
    };
    const translateTourCardDetailValue = (fieldKey, rawValue, lang) => {
        if (!rawValue && rawValue !== 0) return rawValue || '';
        const value = String(rawValue).trim();
        const defaultsByLang = window.translationCatalog?.tourCardDefaultByLang?.[lang]
            || window.translationCatalog?.tourCardDefaultByLang?.pt
            || { languages: 'Português, Inglês e Espanhol', meeting: 'Não informado', identification: 'Guias com camisetas verdes' };

        const knownValues = {
            languages: {
                pt: 'Português, Inglês e Espanhol',
                en: 'Portuguese, English and Spanish',
                fr: 'Portugais, anglais et espagnol',
                es: 'Portugués, inglés y español',
                it: 'Portoghese, inglese e spagnolo',
                zh: '葡萄牙语、英语和西班牙语'
            },
            meeting: {
                pt: 'Não informado',
                en: 'Not informed',
                fr: 'Non renseigné',
                es: 'No informado',
                it: 'Non indicato',
                zh: '未指定'
            },
            identification: {
                pt: 'Guias com camisetas verdes',
                en: 'Guides wearing green shirts',
                fr: 'Guides avec t-shirts verts',
                es: 'Guías con camisetas verdes',
                it: 'Guide con magliette verdi',
                zh: '穿绿色T恤的导游'
            }
        };

        const target = {
            languages: defaultsByLang.languages,
            meeting: defaultsByLang.meeting,
            identification: defaultsByLang.identification
        }[fieldKey] || value;

        const normalize = (text) => text
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase();

        const normalizedValue = normalize(value);
        for (const [langKey, phrase] of Object.entries(knownValues[fieldKey] || {})) {
            if (normalize(phrase) === normalizedValue) {
                return target;
            }
        }

        return value;
    };
    // Campos de texto livre preenchidos manualmente pelo admin em cada
    // idioma (aba de edição do tour em Gerenciamento), salvos em
    // tour.traducoes[idioma][campo].
    const TOUR_TRANSLATABLE_FIELD_MAP = {
        periodo: 'periodo', duracao: 'duracao', saida: 'saida',
        encontro: 'encontro', pontoEmbarque: 'ponto_embarque', pontoDesembarque: 'ponto_desembarque',
        grupo: 'grupo', identificacao: 'identificacao', inclui: 'inclui', roteiro: 'roteiro'
    };
    const translatedTourField = (tour, key, fallback, lang) => {
        if (lang && lang !== 'pt') {
            const campo = TOUR_TRANSLATABLE_FIELD_MAP[key];
            const traduzido = campo && tour.traducoes && tour.traducoes[lang] && tour.traducoes[lang][campo];
            if (traduzido) return traduzido;
        }
        return fallback;
    };
    // "Idiomas" não é um campo livre editável por idioma (vem dos checkboxes
    // de idioma falado do tour) — só os NOMES dos idiomas mudam de um idioma
    // pro outro, então é uma troca de palavra fixa, não uma tradução manual.
    const LANGUAGE_NAME_TRANSLATIONS = {
        en: { 'Português': 'Portuguese', 'Inglês': 'English', 'Espanhol': 'Spanish', 'Francês': 'French', 'Italiano': 'Italian', 'Chinês': 'Chinese' },
        fr: { 'Português': 'Portugais', 'Inglês': 'Anglais', 'Espanhol': 'Espagnol', 'Francês': 'Français', 'Italiano': 'Italien', 'Chinês': 'Chinois' },
        es: { 'Português': 'Portugués', 'Inglês': 'Inglés', 'Espanhol': 'Español', 'Francês': 'Francés', 'Italiano': 'Italiano', 'Chinês': 'Chino' },
        it: { 'Português': 'Portoghese', 'Inglês': 'Inglese', 'Espanhol': 'Spagnolo', 'Francês': 'Francese', 'Italiano': 'Italiano', 'Chinês': 'Cinese' },
        zh: { 'Português': '葡萄牙语', 'Inglês': '英语', 'Espanhol': '西班牙语', 'Francês': '法语', 'Italiano': '意大利语', 'Chinês': '中文' }
    };
    const translateLanguageNames = (raw, lang) => {
        const map = LANGUAGE_NAME_TRANSLATIONS[lang];
        if (!map || !raw) return raw;
        let out = raw;
        Object.entries(map).forEach(([pt, tr]) => { out = out.replaceAll(pt, tr); });
        return out;
    };
    // Campos como "Inclui"/"Roteiro" aceitam um mini-formato digitado no
    // admin: quebra de linha vira parágrafo, linhas iniciadas com ✓ / ✕ / *
    // viram lista com marcador, e **texto** vira negrito. Foge do resto dos
    // campos (curtos, sempre em uma linha) que continuam em texto puro.
    const escapeHtmlText = (str) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    // "**texto**" e "*texto*" (asterisco duplo ou simples envolvendo o
    // trecho) viram negrito; só o "* " no INÍCIO da linha (com espaço logo
    // depois) é tratado como marcador de lista — ver bulletMatch abaixo.
    const applyRichInlineBold = (str) => str
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<strong>$1</strong>');
    const isTourRichField = (key) => key === 'inclui' || key === 'roteiro';
    const formatTourRichText = (raw) => {
        const lines = escapeHtmlText((raw || '').toString()).split(/\r?\n/);
        let html = '';
        let inList = false;
        const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
        lines.forEach((rawLine) => {
            const line = rawLine.trim();
            if (!line) { closeList(); return; }
            const bulletMatch = line.match(/^(✓|✕|\*)\s+(.*)$/);
            if (bulletMatch) {
                if (!inList) { html += '<ul class="rio-tour-detail-list">'; inList = true; }
                const marker = bulletMatch[1];
                const markerClass = marker === '✓' ? 'rio-tour-list-check' : marker === '✕' ? 'rio-tour-list-cross' : 'rio-tour-list-dot';
                html += `<li class="${markerClass}">${applyRichInlineBold(bulletMatch[2])}</li>`;
            } else {
                closeList();
                html += `<p class="rio-tour-detail-paragraph">${applyRichInlineBold(line)}</p>`;
            }
        });
        closeList();
        return html;
    };
    const buildTourDetailsHtml = (tour, lang) => {
        const labels = TOUR_DETAIL_LABELS[lang] || TOUR_DETAIL_LABELS.pt;
        const rawValues = {
            periodo: translatedTourField(tour, 'periodo', tour.periodo, lang),
            idiomas: translateLanguageNames(tour.idiomas || tour.languages || '', lang),
            duracao: (() => {
                if (lang === 'pt') return tour.duracao || '';
                const manual = tour?.traducoes?.[lang]?.duracao;
                if (manual) return manual;
                return translateDuracaoAuto(tour.duracao || '', lang);
            })(),
            diasSemana: formatDiasSemanaPorIdioma(tour, lang),
            saida: translatedTourField(tour, 'saida', tour.saida, lang),
            encontro: translatedTourField(tour, 'encontro', tour.encontro || tour.meeting, lang),
            pontoEmbarque: translatedTourField(tour, 'pontoEmbarque', tour.pontoEmbarque || tour.ponto_embarque, lang),
            pontoDesembarque: translatedTourField(tour, 'pontoDesembarque', tour.pontoDesembarque || tour.ponto_desembarque, lang),
            grupo: translatedTourField(tour, 'grupo', tour.grupo, lang),
            identificacao: translatedTourField(tour, 'identificacao', tour.identificacao || tour.identification, lang),
            inclui: translatedTourField(tour, 'inclui', tour.inclui, lang),
            roteiro: translatedTourField(tour, 'roteiro', tour.roteiro, lang),
            horarios: (tour.horarios || '').split(',').map(h => h.trim()).filter(Boolean).join(', ')
        };
        const translateKeyByField = { idiomas: 'languages', encontro: 'meeting', identificacao: 'identification' };

        const readMoreLabel = TOUR_READ_MORE_LABELS[lang] || TOUR_READ_MORE_LABELS.pt;
        const valorRaw = tour.valor ?? tour.value;
        const valorLi = (valorRaw != null && valorRaw !== '' && Number(valorRaw) !== 0)
            ? `<li><i class="fa fa-dollar-sign"></i> <strong>${labels.valor}:</strong> ${Number(valorRaw).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</li>`
            : '';
        let html = '';
        let horariosRendered = false;
        Object.keys(TOUR_DETAIL_ICONS).forEach((key) => {
            const raw = rawValues[key];
            if (!tourFieldVisible(raw)) return;
            let value = raw.toString().trim();
            if (translateKeyByField[key]) {
                value = translateTourCardDetailValue(translateKeyByField[key], value, lang);
            }
            if (isTourRichField(key)) {
                html += `<li class="rio-tour-detail-rich-item"><i class="fa ${TOUR_DETAIL_ICONS[key]}"></i> <strong>${labels[key]}:</strong><div class="rio-tour-detail-richbody">${formatTourRichText(value)}</div><button type="button" class="rio-tour-detail-toggle rio-tour-detail-toggle-rich" data-more="${readMoreLabel.more}" data-less="${readMoreLabel.less}">${readMoreLabel.more}</button></li>`;
            } else {
                html += `<li><span class="rio-tour-detail-line"><i class="fa ${TOUR_DETAIL_ICONS[key]}"></i> <strong>${labels[key]}:</strong> <span class="rio-tour-detail-value">${value}</span><button type="button" class="rio-tour-detail-toggle" data-more="${readMoreLabel.more}" data-less="${readMoreLabel.less}">${readMoreLabel.more}</button></span></li>`;
            }
            // "Valor" vai logo depois de "Horários disponíveis" em vez de sempre
            // no final da lista — pedido explícito, já que ambos os campos
            // costumam ser lidos juntos ("quando" e "quanto").
            if (key === 'horarios') {
                horariosRendered = true;
                if (valorLi) html += valorLi;
            }
        });
        if (valorLi && !horariosRendered) html += valorLi;

        const estado = (tour.estado || tour.status || '').toString().trim();
        if (estado && estado.toLowerCase() !== 'ativo') {
            html += `<li><i class="fa fa-info-circle"></i> <strong>${labels.estado}:</strong> ${estado}</li>`;
        }
        return html;
    };

    // Reaplica os detalhes dinâmicos (vindos do banco) de um card já casado
    // com um tour, no idioma atual — usado tanto no carregamento inicial
    // quanto na troca de idioma (senão a troca de idioma reintroduz o texto
    // estático de demonstração por cima do conteúdo real cadastrado no admin).
    const findTourForCard = (card) => {
        const cardName = (card.querySelector('.rio-tour-name')?.textContent || '').trim();
        if (!cardName) return null;
        return getTours().find(t => normalizeTourKey(t.name) === normalizeTourKey(cardName)) || null;
    };
    // Tour com estado "Oculto" some da página pública (diferente de "Pausado",
    // que mantém o card visível mas desabilita a reserva).
    const applyTourVisibility = (card, tour) => {
        const estado = (tour.estado || tour.status || '').toString().trim().toLowerCase();
        card.style.display = (estado === 'oculto' || estado === 'hidden') ? 'none' : '';
    };

    // Cada legenda de modalidade (#tours, #transfers, #expedicoes-privativas)
    // só deve aparecer se a página tiver ao menos um tour visível daquele tipo.
    const toggleEmptyModalitySections = () => {
        ['#tours', '#transfers', '#expedicoes-privativas', '#expedicoes-compartilhadas'].forEach((sel) => {
            const section = document.querySelector(sel);
            if (!section) return;
            const hasVisibleCard = Array.from(section.querySelectorAll('.rio-tour-card'))
                .some((card) => card.style.display !== 'none');
            section.style.display = hasVisibleCard ? '' : 'none';
        });
    };

    // Tour criado em Gerenciamento > "+ Adicionar Tour" sem card correspondente
    // no HTML estático da página: monta um card do zero e insere na grid certa
    // (grid[0] = tours gratuitos, última grid = pagos — mesma convenção das
    // divs .rio-tours-grid já existentes em #tours).
    // URL que leva direto a este tour (mesma página, só com ?tour=<id>) —
    // Gerenciamento > Editar Tour gera a mesma URL a partir do id + cidade.
    const buildTourShareUrl = (tourId) => {
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        url.searchParams.set('tour', tourId);
        return url.toString();
    };

    // Ícone de compartilhar em cada card — some se já existir (cards são
    // re-processados a cada troca de idioma) pra não duplicar.
    const ensureShareButton = (card, tour) => {
        if (!tour || tour.id == null) return;
        const actionsDiv = card.querySelector('.rio-tour-actions');
        if (!actionsDiv || actionsDiv.querySelector('.rio-link-share')) return;

        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'rio-link-share';
        shareBtn.setAttribute('aria-label', 'Compartilhar este tour');
        shareBtn.innerHTML = '<i class="fa fa-share-alt" aria-hidden="true"></i>';
        shareBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            const url = buildTourShareUrl(tour.id);
            try {
                if (navigator.share) {
                    await navigator.share({ title: tour.name || '', url });
                    return;
                }
            } catch (error) {
                return; // usuário cancelou o share nativo — não é erro, não avisa nada.
            }
            try {
                await navigator.clipboard.writeText(url);
                if (typeof showGlobalNotification === 'function') {
                    showGlobalNotification('Link do tour copiado!', 'success');
                }
            } catch (error) {
                console.warn('Falha ao copiar link do tour:', error);
            }
        });
        actionsDiv.appendChild(shareBtn);
    };

    // Link direto pra um tour (?tour=<id>): rola até o card assim que ele
    // existir no DOM — só depois de fetchToursFromBackend() casar cada card
    // com seu registro do banco (dataset.tourId é preenchido ali mesmo).
    const scrollToDirectLinkTourIfNeeded = () => {
        if (!window.__tourDirectLinkId) return;
        const card = document.querySelector(`.rio-tour-card[data-tour-id="${window.__tourDirectLinkId}"]`);
        if (!card) return;
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('rio-tour-card--highlight');
        setTimeout(() => card.classList.remove('rio-tour-card--highlight'), 2600);
    };

    const createSiteShellTourCardElement = (tour, lang) => {
        const actionLabels = TOUR_ACTION_LABELS[lang] || TOUR_ACTION_LABELS.pt;
        const card = document.createElement('article');
        card.className = 'rio-tour-card';
        if (tour.id != null) card.dataset.tourId = tour.id;

        const imagesDiv = document.createElement('div');
        imagesDiv.className = 'rio-tour-images';
        const slider = document.createElement('div');
        slider.className = 'rio-tour-slider';
        slider.dataset.folder = (tour.pasta_imagens || '').trim() || `tour-${tour.id}`;
        slider.setAttribute('aria-label', `Slideshow ${tour.name || ''}`);
        imagesDiv.appendChild(slider);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'rio-tour-info';

        const nameEl = document.createElement('h4');
        nameEl.className = 'rio-tour-name';
        nameEl.textContent = tour.name || '';

        const detailsEl = document.createElement('ul');
        detailsEl.className = 'rio-tour-details';

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'rio-tour-actions';

        const mapLink = document.createElement('a');
        mapLink.target = '_blank';
        mapLink.rel = 'noopener';
        mapLink.className = 'rio-link-map';
        mapLink.innerHTML = `<i class="fa fa-map"></i> ${actionLabels.map}`;

        const reserveLink = document.createElement('a');
        reserveLink.href = '#';
        reserveLink.target = '_blank';
        reserveLink.rel = 'noopener';
        reserveLink.className = 'btn-book rio-btn-reserve';
        const reserveIsWhatsApp = (tour.canal_reserva || tour.canalReserva || 'web').toLowerCase() === 'whatsapp';
        reserveLink.innerHTML = reserveIsWhatsApp ? `<i class="fab fa-whatsapp"></i> ${actionLabels.reserve}` : actionLabels.reserve;

        actionsDiv.appendChild(mapLink);
        actionsDiv.appendChild(reserveLink);
        infoDiv.appendChild(nameEl);
        infoDiv.appendChild(detailsEl);
        infoDiv.appendChild(actionsDiv);

        card.appendChild(imagesDiv);
        card.appendChild(infoDiv);

        window.__bindSiteShellReserveButton?.(reserveLink);
        ensureShareButton(card, tour);

        return card;
    };

    // Insere cards para tours desta cidade cadastrados no admin que ainda não
    // têm um bloco correspondente no HTML estático da página.
    const appendMissingSiteShellTourCards = (tours, matchedTourIds, lang) => {
        const cidadeAtual = document.getElementById('relatosGallery')?.dataset.cidade;
        if (!cidadeAtual) return;

        const pending = tours.filter((t) => t.id && !matchedTourIds.has(String(t.id)) && t.cidade === cidadeAtual);
        if (!pending.length) return;

        // Páginas com seções dedicadas (ex.: Lençóis tem #transfers e
        // #expedicoes-privativas) recebem o tour diretamente nelas; páginas
        // sem essas seções (Rio/Salvador/São Luís) caem no comportamento
        // antigo: 2 grids dentro de #tours (free + paga).
        const findGridForTour = (tour) => {
            const modalidade = (tour.modalidade || 'free').toLowerCase();
            if (modalidade === 'transfer') {
                const dedicated = document.querySelector('#transfers .rio-tours-grid');
                if (dedicated) return dedicated;
            }
            if (modalidade === 'privado') {
                const dedicated = document.querySelector('#expedicoes-privativas .rio-tours-grid')
                    || document.querySelector('#expedicoes-compartilhadas .rio-tours-grid');
                if (dedicated) return dedicated;
            }
            const grids = document.querySelectorAll('#tours .rio-tours-grid');
            if (!grids.length) return null;
            const isPaid = modalidade !== 'free';
            return (isPaid && grids.length > 1) ? grids[grids.length - 1] : grids[0];
        };

        pending.forEach((tour) => {
            const isPaid = (tour.modalidade || 'free').toLowerCase() !== 'free';
            const grid = findGridForTour(tour);
            if (!grid) return;
            const card = createSiteShellTourCardElement(tour, lang);
            if (isPaid) card.classList.add('rio-tour-paid');

            setTourDetailsHtml(card.querySelector('.rio-tour-details'), tour, lang);
            applyMapLinkState(card.querySelector('.rio-link-map'), tour.link || tour.link_tour || '');
            applyTourVisibility(card, tour);

            const folder = card.querySelector('.rio-tour-slider')?.dataset.folder;
            if (folder && Array.isArray(tour.imagens) && tour.imagens.length) {
                window.tourImagesByFolder = window.tourImagesByFolder || {};
                window.tourImagesByFolder[folder] = tour.imagens;
            }

            grid.appendChild(card);

            if (tour.id && window.TourInteracoes) {
                window.TourInteracoes.attachCommentsToggle(card, tour.id);
            }
        });

        if (typeof window.startTourSliders === 'function') {
            window.startTourSliders();
        }
    };
    const applyDynamicTourDetailsToCard = (card, lang) => {
        const tour = findTourForCard(card);
        if (!tour) return false;
        applyTourVisibility(card, tour);
        const detailsEl = card.querySelector('.rio-tour-details');
        if (detailsEl) setTourDetailsHtml(detailsEl, tour, lang);
        const nameEl = card.querySelector('.rio-tour-name');
        if (nameEl && tour.name) nameEl.textContent = tour.name;
        return true;
    };
    window.buildTourDetailsHtml = buildTourDetailsHtml;
    window.applyDynamicTourDetailsToCard = applyDynamicTourDetailsToCard;
    window.applyTourVisibility = applyTourVisibility;

    // O botão "Ver no Mapa" só faz sentido — e só fica habilitado — quando o
    // tour tem um "Link do local de encontro" preenchido no admin.
    const applyMapLinkState = (mapLink, url) => {
        if (!mapLink) return;
        if (url) {
            mapLink.href = url;
            mapLink.style.display = '';
            mapLink.classList.remove('disabled');
            mapLink.removeAttribute('aria-disabled');
            mapLink.style.pointerEvents = '';
        } else {
            mapLink.removeAttribute('href');
            mapLink.style.display = 'none';
        }
    };

    // Mescla listas de tours sem descartar os tours das outras páginas/cidades:
    // entradas de mesmo nome são atualizadas, as demais são preservadas.
    const mergeTours = (baseTours, incomingTours) => {
        const merged = Array.isArray(baseTours) ? [...baseTours] : [];
        (Array.isArray(incomingTours) ? incomingTours : []).forEach((tour) => {
            const key = normalizeTourKey(tour && tour.name);
            if (!key) return;
            const cleaned = Object.fromEntries(Object.entries(tour).filter(([, v]) => v !== '' && v != null));
            const existingIndex = merged.findIndex(t => normalizeTourKey(t && t.name) === key);
            if (existingIndex >= 0) {
                merged[existingIndex] = { ...merged[existingIndex], ...cleaned };
            } else {
                merged.push(tour);
            }
        });
        return merged;
    };

    const fetchToursFromBackend = async () => {
        const endpoints = [
            `${API_BASE_URL}/get_tours_pagina`,
            'http://127.0.0.1:5000/get_tours_pagina',
            'https://api.exksvol.com/get_tours_pagina'
        ];
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) continue;
                const payload = await response.json();
                if (!Array.isArray(payload)) continue;
                // tours = só o que o servidor devolveu agora — é o que decide o que
                // aparece na página, pra um tour apagado no admin sumir na próxima
                // visita. setTours guarda uma versão mesclada com o cache antigo só
                // pro matching de reserva entre páginas (getTours/matchTourByName),
                // sem influenciar o que é renderizado como card aqui.
                const tours = payload.map(mapBackendTourToPageTour);
                setTours(mergeTours(getTours(), tours));

                // Imagens enviadas via admin (Gerenciamento) têm prioridade sobre o
                // manifesto local hardcoded de cada cidade, casadas pelo nome do tour.
                window.tourImagesByFolder = window.tourImagesByFolder || {};
                const cardsByParent = new Map();
                const matchedTourIds = new Set();
                const currentLangForNewCards = typeof window.getCurrentLanguage === 'function' ? window.getCurrentLanguage() : 'pt';
                Array.from(document.querySelectorAll('.rio-tour-card')).forEach((card, originalIndex) => {
                    const folder = card.querySelector('.rio-tour-slider')?.dataset.folder;
                    const cardName = card.querySelector('.rio-tour-name')?.textContent?.trim();
                    if (!cardName) return;
                    const matchedTour = tours.find(t => normalizeTourKey(t.name) === normalizeTourKey(cardName));
                    if (!matchedTour) return;

                    if (matchedTour.id) {
                        matchedTourIds.add(String(matchedTour.id));
                        card.dataset.tourId = matchedTour.id;
                    }
                    applyTourVisibility(card, matchedTour);
                    ensureShareButton(card, matchedTour);

                    const currentLang = typeof window.getCurrentLanguage === 'function' ? window.getCurrentLanguage() : 'pt';
                    const detailsEl = card.querySelector('.rio-tour-details');
                    if (detailsEl) {
                        setTourDetailsHtml(detailsEl, matchedTour, currentLang);
                    }

                    applyMapLinkState(card.querySelector('.rio-link-map'), matchedTour.link || matchedTour.link_tour || '');

                    const reserveBtn = card.querySelector('.rio-btn-reserve');
                    if (reserveBtn) {
                        if (!reserveBtn.dataset.baseLabel) {
                            reserveBtn.dataset.baseLabel = reserveBtn.textContent.trim();
                        }
                        const isWhatsApp = (matchedTour.canal_reserva || 'web') === 'whatsapp';
                        reserveBtn.innerHTML = isWhatsApp
                            ? `<i class="fab fa-whatsapp"></i> ${reserveBtn.dataset.baseLabel}`
                            : reserveBtn.dataset.baseLabel;
                    }

                    if (folder && Array.isArray(matchedTour.imagens) && matchedTour.imagens.length) {
                        window.tourImagesByFolder[folder] = matchedTour.imagens;
                    }
                    if (matchedTour.id && window.TourInteracoes) {
                        window.TourInteracoes.attachCommentsToggle(card, matchedTour.id);
                    }

                    const parentEntries = cardsByParent.get(card.parentElement) || [];
                    parentEntries.push({ card, ordem: matchedTour.ordem ?? originalIndex, originalIndex });
                    cardsByParent.set(card.parentElement, parentEntries);
                });

                // Reordena os cards conforme a ordem de exibição definida no admin
                // (Gerenciamento), preservando os atributos/slideshow de cada card.
                cardsByParent.forEach((entries, parent) => {
                    entries
                        .sort((a, b) => (a.ordem - b.ordem) || (a.originalIndex - b.originalIndex))
                        .forEach(({ card }) => parent.appendChild(card));
                });

                appendMissingSiteShellTourCards(tours, matchedTourIds, currentLangForNewCards);
                toggleEmptyModalitySections();

                if (typeof window.startTourSliders === 'function') {
                    window.startTourSliders();
                }

                openReviewFromUrlIfNeeded();
                checkPendingTourReviewPrompt();

                return tours;
            } catch (error) {
                console.warn('Erro ao buscar tours no backend:', endpoint, error);
            }
        }
        return null;
    };

    const syncToursFromIndex = () => {
        const cards = document.querySelectorAll('.rio-tour-card');
        const tours = Array.from(cards).map((card, idx) => {
            const name = card.querySelector('.rio-tour-name')?.textContent?.trim() || '';
            const idiomas = Array.from(card.querySelectorAll('.rio-tour-details li')).find(li => /Idiomas/i.test(li.textContent))?.textContent?.replace(/Idiomas?:/i, '').trim() || '';
            const encontro = Array.from(card.querySelectorAll('.rio-tour-details li')).find(li => /Encontro/i.test(li.textContent))?.textContent?.replace(/Encontro:/i, '').trim() || '';
            const identificacao = Array.from(card.querySelectorAll('.rio-tour-details li')).find(li => /Identificação/i.test(li.textContent))?.textContent?.replace(/Identificação:/i, '').trim() || '';
            const mapUrl = card.querySelector('.rio-link-map')?.href || '';
            const reserveUrl = card.querySelector('.rio-btn-reserve')?.href || '';
            const folder = card.querySelector('.rio-tour-slider')?.dataset.folder || '';

            return {
                id: folder || `tour-${idx}`,
                name,
                languages: idiomas,
                meeting: encontro,
                identification: identificacao,
                mapUrl,
                reserveUrl
            };
        });

        const merged = mergeTours(getTours(), tours);
        setTours(merged);
        return merged;
    };

    // Expose reservation helpers so other scripts (eg. Gerenciamento) can access them
    window.getReservations = getReservations;
    window.setReservations = setReservations;
    window.addReservation = addReservation;
    window.getTours = getTours;
    window.setTours = setTours;
    window.syncToursFromIndex = syncToursFromIndex;

    const ensureGlobalNotification = () => {
        let overlay = document.getElementById('appNotificationOverlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'appNotificationOverlay';
        overlay.className = 'app-notification-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.inert = true;
        overlay.innerHTML = `
            <div class="app-notification" role="status" aria-live="polite" aria-atomic="true">
                <button type="button" class="app-notification__close" aria-label="Fechar">&times;</button>
                <div class="app-notification__title">Notificação</div>
                <div class="app-notification__media" hidden></div>
                <div class="app-notification__message"></div>
                <div class="app-notification__details" hidden></div>
            </div>
        `;

        const closeButton = overlay.querySelector('.app-notification__close');
        const close = () => {
            if (overlay.contains(document.activeElement)) {
                document.activeElement.blur();
            }
            overlay.classList.remove('open');
            overlay.setAttribute('aria-hidden', 'true');
            overlay.inert = true;
        };

        closeButton?.addEventListener('click', close);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && overlay.classList.contains('open')) {
                close();
            }
        });

        document.body.appendChild(overlay);
        return overlay;
    };

    const escapeHtml = (value) => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // Foto de perfil padrão do usuário: usa o Gravatar associado ao email
    // (mesmo serviço usado por WordPress/GitHub — hash SHA-256 do email, sem
    // precisar de nenhuma API/consentimento do provedor de email). Se o
    // usuário nunca configurou um Gravatar, cai num avatar gerado
    // (identicon) em vez de imagem quebrada.
    const getGravatarUrl = async (email, size = 80) => {
        const normalized = (email || '').trim().toLowerCase();
        const data = new TextEncoder().encode(normalized);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
        return `https://www.gravatar.com/avatar/${hashHex}?s=${size}&d=identicon`;
    };
    window.getGravatarUrl = getGravatarUrl;

    const updateProfileAvatar = async () => {
        const button = document.querySelector('.profile-btn');
        if (!button) return;
        const userRole = localStorage.getItem('userRole');
        if (!userRole) {
            button.innerHTML = '<i class="fa fa-user-circle"></i>';
            return;
        }
        let userPhoto = localStorage.getItem('userPhoto');
        // Backfill para sessões abertas antes deste recurso existir.
        if (!userPhoto) {
            const userEmail = localStorage.getItem('userEmail');
            if (userEmail) {
                userPhoto = await getGravatarUrl(userEmail);
                localStorage.setItem('userPhoto', userPhoto);
            }
        }
        if (userPhoto) {
            button.innerHTML = `<img src="${escapeHtml(userPhoto)}" alt="Foto de perfil" class="profile-btn-avatar" />`;
        } else {
            button.innerHTML = '<i class="fa fa-user-circle"></i>';
        }
    };
    window.updateProfileAvatar = updateProfileAvatar;

    const showGlobalNotification = (message, type = 'info', options = {}) => {
        const currentLang = typeof window.getCurrentLanguage === 'function'
            ? window.getCurrentLanguage()
            : (document.documentElement.lang || 'pt').slice(0, 2);
        const ui = window.uiTranslations?.[currentLang] || window.uiTranslations?.pt || {};
        const overlay = ensureGlobalNotification();
        const title = overlay.querySelector('.app-notification__title');
        const body = overlay.querySelector('.app-notification__message');
        const media = overlay.querySelector('.app-notification__media');
        const details = overlay.querySelector('.app-notification__details');

        const {
            titleText,
            gifUrl,
            detailsHtml
        } = options;

        overlay.classList.remove('is-success', 'is-error', 'is-info');
        overlay.classList.add(`is-${type}`);

        if (title) {
            if (typeof titleText === 'string' && titleText.trim().length === 0) {
                title.hidden = true;
            } else {
                title.hidden = false;
                title.textContent = titleText ||
                    (type === 'success' ? ui.notification_title_success || 'Sucesso'
                        : type === 'error' ? ui.notification_title_error || 'Atenção'
                        : ui.notification_title_info || 'Notificação');
            }
        }
        if (body) {
            body.textContent = message;
        }

        if (media) {
            if (gifUrl) {
                if (gifUrl.toLowerCase().endsWith('.mp4')) {
                    media.innerHTML = `
                        <video
                            src="${escapeHtml(gifUrl)}"
                            autoplay
                            muted
                            loop
                            playsinline
                            class="app-notification__video"
                        ></video>
                    `;
                } else {
                    media.innerHTML = `<img src="${escapeHtml(gifUrl)}" alt="Confirmação" loading="lazy">`;
                }
                media.hidden = false;
            } else {
                media.innerHTML = '';
                media.hidden = true;
            }
        }

        if (details) {
            if (detailsHtml) {
                details.innerHTML = detailsHtml;
                details.hidden = false;
            } else {
                details.innerHTML = '';
                details.hidden = true;
            }
        }

        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        overlay.inert = false;
    };

    window.showAppNotification = showGlobalNotification;

    // ─── Aviso pós-tour para avaliar (e botão "Avaliar" em Minhas Reservas) ──
    const REVIEW_PROMPT_DISMISSED_KEY = 'reviewPromptDismissedIds';
    const FINALIZED_STATUS_REGEX = /finalizado|finalized|terminado|terminé|completed|concluído|concluido|concluída|concluida|conclu|完了|已完成/i;

    const getDismissedReviewPromptIds = () => {
        try {
            return new Set(JSON.parse(localStorage.getItem(REVIEW_PROMPT_DISMISSED_KEY) || '[]'));
        } catch {
            return new Set();
        }
    };

    const markReviewPromptDismissed = (id) => {
        const dismissed = getDismissedReviewPromptIds();
        dismissed.add(String(id));
        try {
            localStorage.setItem(REVIEW_PROMPT_DISMISSED_KEY, JSON.stringify(Array.from(dismissed)));
        } catch {
            // ignore
        }
    };

    const findTourIdByName = (tourName) => {
        const tours = Array.isArray(getTours()) ? getTours() : [];
        const normalizedTarget = normalizeTourKey(tourName);
        const match = tours.find((t) => normalizeTourKey(t.name || t.nome_tour) === normalizedTarget);
        return match ? match.id : null;
    };

    // Cada cidade tem sua própria página; um tour pode não estar nos cards
    // desta página (ex.: usuário está em Salvador, mas a avaliação pendente é
    // de um tour de Lençóis). Nesse caso, navega até a página certa e pede
    // pra ela abrir o painel de avaliação assim que os tours carregarem.
    const CITY_PAGE_BY_CIDADE = {
        'rio de janeiro': 'Riodejaneiro.html',
        'lencois': 'Lencoismaranhenses.html',
        'sao luis': 'Saoluísdomaranhao.html',
        'salvador': 'Salvador.html'
    };

    const findTourByName = (tourName) => {
        const tours = Array.isArray(getTours()) ? getTours() : [];
        const normalizedTarget = normalizeTourKey(tourName);
        return tours.find((t) => normalizeTourKey(t.name || t.nome_tour) === normalizedTarget) || null;
    };

    const goToTourReview = (tourName) => {
        const tour = findTourByName(tourName);
        if (!tour || tour.id == null) return;

        const abertoAqui = window.TourInteracoes?.openReviewPanel?.(tour.id);
        if (abertoAqui) return;

        const paginaAlvo = CITY_PAGE_BY_CIDADE[normalizeTourKey(tour.cidade || '')];
        if (!paginaAlvo) return;

        const estaEmHtml = (window.location.pathname || '').includes('/html/');
        const base = estaEmHtml ? paginaAlvo : `html/${paginaAlvo}`;
        window.location.href = `${base}?avaliar_tour=${tour.id}`;
    };

    // Ao chegar numa página vinda desse redirecionamento (?avaliar_tour=ID),
    // abre o painel de avaliação assim que os tours/cards estiverem prontos.
    const openReviewFromUrlIfNeeded = () => {
        const params = new URLSearchParams(window.location.search);
        const tourId = params.get('avaliar_tour');
        if (!tourId) return;

        window.TourInteracoes?.openReviewPanel?.(Number(tourId));

        params.delete('avaliar_tour');
        const query = params.toString();
        const novaUrl = window.location.pathname + (query ? `?${query}` : '') + window.location.hash;
        window.history.replaceState(null, '', novaUrl);
    };

    const checkPendingTourReviewPrompt = async () => {
        const email = (localStorage.getItem('userEmail') || '').trim();
        if (!email) return;

        let data = null;
        const endpoints = [
            `${API_BASE_URL}/get_meus_agendamentos?email=${encodeURIComponent(email)}`,
            `${API_BASE_URL}/get_agendamentos?email=${encodeURIComponent(email)}`
        ];
        for (const url of endpoints) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    data = await res.json();
                    break;
                }
            } catch {
                // tenta próximo endpoint
            }
        }
        if (!data) return;

        const reservations = Array.isArray(data) ? data : (Array.isArray(data?.agendamentos) ? data.agendamentos : []);
        const dismissed = getDismissedReviewPromptIds();
        const finalizadas = reservations.filter((r) => (
            r.id != null && !dismissed.has(String(r.id)) && FINALIZED_STATUS_REGEX.test(String(r.status || ''))
        ));

        for (const reserva of finalizadas) {
            const tourId = findTourIdByName(reserva.tour);
            if (tourId == null) {
                markReviewPromptDismissed(reserva.id);
                continue;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/get_tour_comentarios/${tourId}?email=${encodeURIComponent(email)}`);
                const info = res.ok ? await res.json() : null;
                if (!info || !info.success || info.ja_avaliou || !info.pode_avaliar) {
                    markReviewPromptDismissed(reserva.id);
                    continue;
                }
            } catch {
                continue; // tenta de novo na próxima visita à página
            }

            window.TourInteracoes?.showReviewPromptBanner?.({
                tourName: reserva.tour,
                onAccept: () => {
                    markReviewPromptDismissed(reserva.id);
                    goToTourReview(reserva.tour);
                },
                onDismiss: () => markReviewPromptDismissed(reserva.id)
            });
            break; // só um aviso por vez
        }
    };

    const openMyReservationsModal = async () => {
        const currentLang = typeof window.getCurrentLanguage === 'function'
            ? window.getCurrentLanguage()
            : (document.documentElement.lang || 'pt').slice(0, 2);
        const ui = window.uiTranslations?.[currentLang] || window.uiTranslations?.pt || {};
        const tabs = (getCurrentRolePermissions()?.tabs || []).map(tab => String(tab).toUpperCase());
        if (!tabs.includes('MINHAS RESERVAS')) {
            showGlobalNotification(ui.reservation_access_denied || 'Seu perfil não tem permissão para acessar Minhas Reservas.', 'error');
            return;
        }

        let modal = document.getElementById('myReservationsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'myReservationsModal';
            modal.className = 'my-reservations-overlay';
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-label', ui.reservation_title || 'Minhas Reservas');
            modal.innerHTML = `
                <div class="my-reservations-modal">
                    <button type="button" class="my-reservations-close" aria-label="Fechar">&times;</button>
                    <h2 class="my-reservations-title">${ui.reservation_title || 'Minhas Reservas'}</h2>
                    <div class="my-reservations-list"></div>
                </div>
            `;
            modal.querySelector('.my-reservations-close').addEventListener('click', () => {
                modal.classList.remove('open');
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('open');
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('open')) modal.classList.remove('open');
            });
            document.body.appendChild(modal);
        }

        const listEl = modal.querySelector('.my-reservations-list');
        modal.classList.add('open');

        listEl.innerHTML = '<p class="my-reservations-empty">Carregando reservas...</p>';

        const email = (localStorage.getItem('userEmail') || '').trim();
        const normalizedEmail = email.toLowerCase();
        if (!normalizedEmail) {
            listEl.innerHTML = '<p class="my-reservations-empty">Não foi possível identificar o usuário.</p>';
            return;
        }

        const endpointGroups = [
            [
                `${API_BASE_URL}/get_meus_agendamentos`,
                'http://127.0.0.1:5000/get_meus_agendamentos',
                'https://api.exksvol.com/get_meus_agendamentos'
            ],
            [
                `${API_BASE_URL}/get_agendamentos`,
                'http://127.0.0.1:5000/get_agendamentos',
                'https://api.exksvol.com/get_agendamentos'
            ]
        ];

        let data = null;
        for (const endpoints of endpointGroups) {
            if (data) break;
            for (const endpoint of endpoints) {
            try {
                const res = await fetch(`${endpoint}?email=${encodeURIComponent(email)}`);
                if (res.ok) {
                    data = await res.json();
                    break;
                }
            } catch {
                // tenta próximo endpoint
            }
            }
        }

        if (!data) {
            listEl.innerHTML = '<p class="my-reservations-empty">Não foi possível carregar as reservas. Tente novamente mais tarde.</p>';
            return;
        }

        const rawReservations = Array.isArray(data)
            ? data
            : (Array.isArray(data?.agendamentos) ? data.agendamentos : []);

        // Segurança extra no frontend: garante exibição apenas das reservas do usuário atual.
        const userReservations = rawReservations.filter((reservation) => {
            const reservationEmail = String(
                reservation?.email || reservation?.cliente_email || reservation?.user_email || ''
            ).trim().toLowerCase();
            return !reservationEmail || reservationEmail === normalizedEmail;
        });

        if (!userReservations.length) {
            listEl.innerHTML = '<p class="my-reservations-empty">Nenhuma reserva encontrada.</p>';
            return;
        }

        listEl.innerHTML = userReservations.map((r) => {
            const currentLang = typeof window.getCurrentLanguage === 'function'
                ? window.getCurrentLanguage()
                : (document.documentElement.lang || 'pt').slice(0, 2);
            const ui = window.uiTranslations?.[currentLang] || window.uiTranslations?.pt || {};
            const statusRaw = String(r.status || 'Pendente').trim();
            const statusKey = statusRaw.toLowerCase();
            const isPending = /pendente|pending|pendiente|en attente|in attesa|待定/i.test(statusRaw);
            const isConfirmed = /confirmado|confirmed|confirmé|confermato|已确认/i.test(statusRaw);
            const isCancelled = /cancelado|canceled|annulé|anulado|已取消|取消/i.test(statusRaw);
            const statusText = isPending
                ? (ui.reservation_status_pending || 'Confirmação pendente')
                : isConfirmed
                    ? (ui.reservation_status_confirmed || 'Confirmado')
                    : isCancelled
                        ? (ui.reservation_status_cancelled || 'Cancelado')
                        : escapeHtml(statusRaw);
            const statusLabel = `${ui.reservation_status_prefix || 'Status:'} ${statusText}`;

            const normalizeText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const findTourMapUrl = (reservationTourName) => {
                const tours = Array.isArray(getTours()) ? getTours() : [];
                const normalizedReservationTour = normalizeText(reservationTourName);
                if (!normalizedReservationTour || !tours.length) return '';
                const match = tours.find((tour) => {
                    const names = [tour.name, tour.nome_tour, tour.tour, tour.title].filter(Boolean);
                    return names.some((name) => {
                        const normalizedName = normalizeText(name);
                        return normalizedName && (normalizedName.includes(normalizedReservationTour) || normalizedReservationTour.includes(normalizedName));
                    });
                });
                return match ? (match.link || match.link_tour || match.mapUrl || match.url || '') : '';
            };

            let reservationMapRaw = r.url || r.link || r.mapUrl || r.link_tour || r.coordenadas || r.coordinates || r.coord || r.endereco || r.address || r.local || r.localizacao || r.location || '';
            if (!reservationMapRaw && r.tour) {
                reservationMapRaw = findTourMapUrl(r.tour);
            }

            let reservationMapUrl = '';
            if (reservationMapRaw) {
                if (/^https?:\/\//i.test(reservationMapRaw)) {
                    reservationMapUrl = reservationMapRaw;
                } else {
                    const coordinatesMatch = reservationMapRaw.match(/^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/);
                    reservationMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reservationMapRaw)}`;
                }
            }

            const isFinalized = /finalizado|finalized|terminado|terminé|terminado|completed|concluído|concluido|concluída|concluida|conclu|完了|已完成/i.test(statusRaw);
            const showActions = !(isCancelled || isFinalized);
            return `
            <div class="my-reservations-item" data-reservation-id="${escapeHtml(String(r.id || ''))}">
                <strong class="my-reservations-tour">${escapeHtml(r.tour || '—')}</strong>
                <span class="my-reservations-date">${ui.reservation_list_date_label || 'Data'}: ${escapeHtml(r.data || '—')}</span>
                ${r.hora ? `<span class="my-reservations-detail">${ui.reservation_list_time_label || 'Hora'}: ${escapeHtml(r.hora)}</span>` : ''}
                ${r.idioma ? `<span class="my-reservations-detail">${ui.reservation_list_language_label || 'Idioma'}: ${escapeHtml(r.idioma)}</span>` : ''}
                ${r.qtd ? `<span class="my-reservations-detail">${ui.reservation_list_people_label || 'Pessoas'}: ${escapeHtml(String(r.qtd))}</span>` : ''}
                ${reservationMapUrl ? `<span class="my-reservations-detail"><a class="my-reservations-map-link" href="${escapeHtml(reservationMapUrl)}" target="_blank" rel="noopener"><i class="fa fa-map"></i> ${ui.reservation_list_map_link_label || 'Ver no Mapa'}</a></span>` : ''}
                <span class="my-reservations-status my-reservations-status--${escapeHtml(statusKey)}">${statusLabel}</span>
                ${showActions ? `
                    <div class="my-reservations-actions">
                        <button type="button" class="btn-edit-reservation" data-reservation-id="${escapeHtml(String(r.id || ''))}" data-reservation-tour="${escapeHtml(String(r.tour || ''))}" data-reservation-date="${escapeHtml(String(r.data || ''))}" data-reservation-hour="${escapeHtml(String(r.hora || ''))}" data-reservation-people="${escapeHtml(String(r.qtd || '1'))}" data-reservation-language="${escapeHtml(String(r.idioma || r.language || ''))}" data-reservation-modality="${escapeHtml(String(r.modalidade || r.modality || ''))}" data-reservation-guide="${escapeHtml(String(r.guia || r.guide || ''))}" data-reservation-name="${escapeHtml(String(r.nome || r.name || ''))}" data-reservation-phone="${escapeHtml(String(r.celular || r.telefone || r.phone || ''))}" data-reservation-email="${escapeHtml(String(r.email || ''))}" data-reservation-status="${escapeHtml(String(r.status || 'Pendente'))}">${ui.action_edit || 'Editar'}</button>
                        <button type="button" class="btn-cancel-reservation" data-reservation-id="${escapeHtml(String(r.id || ''))}">${ui.action_cancel || 'Cancelar'}</button>
                    </div>
                ` : (isFinalized ? `
                    <div class="my-reservations-actions">
                        <button type="button" class="btn-review-reservation" data-reservation-tour="${escapeHtml(String(r.tour || ''))}">${ui.action_review || 'Avaliar'}</button>
                    </div>
                ` : '')}
            </div>
        `;
        }).join('');

        listEl.querySelectorAll('.btn-review-reservation').forEach((button) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                modal.classList.remove('open');
                goToTourReview(button.getAttribute('data-reservation-tour') || '');
            });
        });

        const parseDisplayDateToIso = (displayDate) => {
            const value = String(displayDate || '').trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const parts = value.split('/');
            if (parts.length === 3) {
                const [dd, mm, yyyy] = parts;
                if (dd && mm && yyyy) return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
            }
            return '';
        };

        const ensureReservationEditModal = () => {
            let overlayEl = document.getElementById('reservationEditOverlay');
            if (overlayEl) return overlayEl;

            const currentLang = typeof window.getCurrentLanguage === 'function'
                ? window.getCurrentLanguage()
                : (document.documentElement.lang || 'pt').slice(0, 2);
            const ui = window.uiTranslations?.[currentLang] || window.uiTranslations?.pt || {};

            overlayEl = document.createElement('div');
            overlayEl.id = 'reservationEditOverlay';
            overlayEl.className = 'reservation-edit-overlay';
            overlayEl.innerHTML = `
                <div class="reservation-edit-modal" role="dialog" aria-modal="true" aria-label="${ui.reservation_edit_title || 'Editar reserva'}">
                    <button type="button" class="reservation-edit-close" aria-label="${ui.reservation_edit_close_label || 'Fechar'}">&times;</button>
                    <h3 class="reservation-edit-title">${ui.reservation_edit_title || 'Editar Reserva'}</h3>
                    <form class="reservation-edit-form">
                        <input type="hidden" name="reservationId">
                        <input type="hidden" name="reservationTour">
                        <input type="hidden" name="reservationLanguage">
                        <input type="hidden" name="reservationModality">
                        <input type="hidden" name="reservationGuide">
                        <input type="hidden" name="reservationName">
                        <input type="hidden" name="reservationPhone">
                        <input type="hidden" name="reservationEmail">
                        <input type="hidden" name="reservationStatus">
                        <label>
                            ${ui.reservation_edit_date_label || 'Data'}
                            <input type="date" name="date" required>
                        </label>
                        <label>
                            ${ui.reservation_edit_time_label || 'Hora'}
                            <input type="time" name="hour" required>
                        </label>
                        <label>
                            ${ui.reservation_edit_people_label || 'Quantidade de pessoas'}
                            <input type="number" name="people" min="1" step="1" required>
                        </label>
                        <div class="reservation-edit-actions">
                            <button type="button" class="reservation-edit-cancel">${ui.reservation_edit_cancel_btn || 'Cancelar'}</button>
                            <button type="submit" class="reservation-edit-save">${ui.reservation_edit_save_btn || 'Salvar alterações'}</button>
                        </div>
                    </form>
                </div>
            `;

            const closeModal = () => overlayEl.classList.remove('open');
            overlayEl.querySelector('.reservation-edit-close')?.addEventListener('click', closeModal);
            overlayEl.querySelector('.reservation-edit-cancel')?.addEventListener('click', closeModal);
            overlayEl.addEventListener('click', (event) => {
                if (event.target === overlayEl) closeModal();
            });

            const formEl = overlayEl.querySelector('.reservation-edit-form');
            formEl?.addEventListener('submit', async (event) => {
                event.preventDefault();
                const id = Number(formEl.elements.reservationId.value || 0);
                const data = formEl.elements.date.value;
                const hora = formEl.elements.hour.value;
                const quantas_pessoas = Number(formEl.elements.people.value || 0);
                const currentUserEmail = localStorage.getItem('userEmail') || '';

                if (!id || !data || !hora || !quantas_pessoas || quantas_pessoas < 1) {
                    showGlobalNotification('Preencha os dados de edição corretamente.', 'error');
                    return;
                }

                if (!currentUserEmail) {
                    showGlobalNotification('É necessário fazer login para atualizar a reserva.', 'error');
                    return;
                }

                const payload = {
                    id,
                    tour: formEl.elements.reservationTour.value || undefined,
                    data,
                    hora,
                    idioma: formEl.elements.reservationLanguage.value || undefined,
                    modalidade: formEl.elements.reservationModality.value || undefined,
                    guia: formEl.elements.reservationGuide.value || undefined,
                    quantas_pessoas,
                    pessoas: '',
                    nome: formEl.elements.reservationName.value || currentUserEmail,
                    celular: formEl.elements.reservationPhone.value || '',
                    email: formEl.elements.reservationEmail.value || currentUserEmail,
                    status: formEl.elements.reservationStatus.value || 'Pendente',
                    admin_email: currentUserEmail
                };
                let updated = false;
                let lastErrorCause = null;
                try {
                    const result = await apiFetch('/update_agendamento', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (result?.success) {
                        updated = true;
                    } else {
                        lastErrorCause = result?.message || 'Resposta sem sucesso ao atualizar a reserva.';
                    }
                } catch (err) {
                    console.warn('Atualização falhou em /update_agendamento', err);
                    lastErrorCause = err.message || String(err);
                }

                if (updated) {
                    closeModal();
                    showGlobalNotification('Reserva atualizada com sucesso.', 'success');
                    openMyReservationsModal();
                } else {
                    showGlobalNotification(lastErrorCause || 'Não foi possível atualizar a reserva. Tente novamente.', 'error');
                }
            });

            document.body.appendChild(overlayEl);
            return overlayEl;
        };

        // Ações de edição e cancelamento de reservas
        listEl.querySelectorAll('.btn-cancel-reservation').forEach((button) => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = button.getAttribute('data-reservation-id');
                if (!id) return;
                const currentLang = typeof window.getCurrentLanguage === 'function'
                    ? window.getCurrentLanguage()
                    : (document.documentElement.lang || 'pt').slice(0, 2);
                const ui = window.uiTranslations?.[currentLang] || window.uiTranslations?.pt || {};
                if (!confirm(ui.reservation_confirm_cancel_prompt || 'Deseja cancelar esta reserva? Clique em OK para continuar.')) return;
                if (!confirm(ui.reservation_confirm_cancel_again_prompt || 'Confirma novamente: realmente deseja cancelar a reserva?')) return;

                const currentUserEmail = localStorage.getItem('userEmail') || '';
                if (!currentUserEmail) {
                    showGlobalNotification(ui.reservation_cancel_failed || 'Não foi possível cancelar a reserva. Tente novamente.', 'error');
                    return;
                }

                let updated = false;
                try {
                    const result = await apiFetch('/update_agendamento', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, status: 'Cancelado', admin_email: currentUserEmail })
                    });
                    updated = Boolean(result?.success);
                } catch (err) {
                    console.warn('Cancelamento falhou em /update_agendamento', err);
                }

                if (updated) {
                    showGlobalNotification(ui.reservation_cancel_success || 'Reserva cancelada com sucesso.', 'success');
                    openMyReservationsModal();
                } else {
                    showGlobalNotification(ui.reservation_cancel_failed || 'Não foi possível cancelar a reserva. Tente novamente.', 'error');
                }
            });
        });

        listEl.querySelectorAll('.btn-edit-reservation').forEach((button) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = button.getAttribute('data-reservation-id');
                if (!id) return;

                const currentDate = parseDisplayDateToIso(button.getAttribute('data-reservation-date') || '');
                const currentHour = button.getAttribute('data-reservation-hour') || '12:00';
                const currentPeople = button.getAttribute('data-reservation-people') || '1';

                const overlayEl = ensureReservationEditModal();
                const formEl = overlayEl.querySelector('.reservation-edit-form');
                if (!formEl) return;

                formEl.elements.reservationId.value = String(id);
                formEl.elements.reservationTour.value = button.getAttribute('data-reservation-tour') || '';
                formEl.elements.reservationLanguage.value = button.getAttribute('data-reservation-language') || '';
                formEl.elements.reservationModality.value = button.getAttribute('data-reservation-modality') || '';
                formEl.elements.reservationGuide.value = button.getAttribute('data-reservation-guide') || '';
                formEl.elements.reservationName.value = button.getAttribute('data-reservation-name') || '';
                formEl.elements.reservationPhone.value = button.getAttribute('data-reservation-phone') || '';
                formEl.elements.reservationEmail.value = button.getAttribute('data-reservation-email') || '';
                formEl.elements.reservationStatus.value = button.getAttribute('data-reservation-status') || 'Pendente';
                formEl.elements.date.value = currentDate;
                formEl.elements.hour.value = currentHour;
                formEl.elements.people.value = String(currentPeople);

                overlayEl.classList.add('open');
            });
        });
    };

    window.openMyReservationsModal = openMyReservationsModal;
    window.fetchToursFromBackend = fetchToursFromBackend;

    const openUserDataModal = async () => {
        const tabs = (getCurrentRolePermissions()?.tabs || []).map(tab => String(tab).toUpperCase());
        if (!tabs.includes('MEUS DADOS')) {
            showGlobalNotification('Seu perfil não tem permissão para acessar Meus Dados.', 'error');
            return;
        }

        let modal = document.getElementById('userDataModal');
        if (!modal) {
            const lang = (typeof window.getCurrentLang === 'function'
                ? window.getCurrentLang()
                : (document.documentElement.lang || 'pt').slice(0, 2)
            ).split('-')[0] || 'pt';
            const strings = window.uiTranslations?.[lang] || window.uiTranslations?.pt || {};

            modal = document.createElement('div');
            modal.id = 'userDataModal';
            modal.className = 'user-data-overlay';
            modal.innerHTML = `
                <div class="user-data-modal" role="dialog" aria-modal="true" aria-label="${strings.user_data_title || 'Meus Dados'}">
                    <button type="button" class="user-data-close" aria-label="${strings.user_data_cancel || 'Fechar'}">&times;</button>
                    <h3 data-i18n="user_data_title">${strings.user_data_title || 'Meus Dados'}</h3>
                    <div class="user-data-loading" hidden data-i18n="user_data_loading">${strings.user_data_loading || 'Carregando dados...'}</div>
                    <form class="user-data-form">
                        <div class="user-data-photo">
                            <img class="user-data-photo-preview" alt="Foto de perfil" src="" />
                            <label class="user-data-photo-upload">
                                <span data-i18n="user_data_change_photo">${strings.user_data_change_photo || 'Alterar foto'}</span>
                                <input type="file" name="foto" accept="image/png,image/jpeg,image/webp,image/gif" hidden />
                            </label>
                        </div>
                        <label><span data-i18n="user_data_name">${strings.user_data_name || 'Nome'}</span><input name="nome" required /></label>
                        <label><span data-i18n="user_data_surname">${strings.user_data_surname || 'Sobrenome'}</span><input name="sobrenome" required /></label>
                        <label><span data-i18n="user_data_phone">${strings.user_data_phone || 'Telefone'}</span><input name="celular" /></label>
                        <label><span data-i18n="user_data_country">${strings.user_data_country || 'País'}</span><input name="pais_origem" /></label>
                        <label><span data-i18n="user_data_gender">${strings.user_data_gender || 'Gênero'}</span>
                            <select name="genero">
                                <option value="">—</option>
                                <option value="male" data-i18n="register_gender_male">${strings.register_gender_male || 'Masculino'}</option>
                                <option value="female" data-i18n="register_gender_female">${strings.register_gender_female || 'Feminino'}</option>
                                <option value="nonbinary" data-i18n="register_gender_nonbinary">${strings.register_gender_nonbinary || 'Não binário'}</option>
                                <option value="prefer_not" data-i18n="register_gender_prefer_not">${strings.register_gender_prefer_not || 'Prefiro não informar'}</option>
                                <option value="other" data-i18n="register_gender_other">${strings.register_gender_other || 'Outro'}</option>
                            </select>
                        </label>
                        <div class="user-data-actions">
                            <button type="button" class="user-data-cancel" data-i18n="user_data_cancel">${strings.user_data_cancel || 'Cancelar'}</button>
                            <button type="submit" class="user-data-save" data-i18n="user_data_save">${strings.user_data_save || 'Salvar'}</button>
                        </div>
                    </form>
                </div>
            `;

            const close = () => {
                modal.classList.remove('open');
            };

            modal.querySelector('.user-data-close')?.addEventListener('click', close);
            modal.querySelector('.user-data-cancel')?.addEventListener('click', close);
            modal.addEventListener('click', (event) => {
                if (event.target === modal) close();
            });

            const photoInput = modal.querySelector('input[name="foto"]');
            photoInput?.addEventListener('change', async () => {
                const file = photoInput.files?.[0];
                if (!file) return;
                const email = localStorage.getItem('userEmail');
                if (!email) return;

                const formData = new FormData();
                formData.append('email', email);
                formData.append('imagem', file);

                const endpointsUploadFoto = [
                    `${API_BASE_URL}/upload_user_foto`,
                    'http://127.0.0.1:5000/upload_user_foto',
                    'https://api.exksvol.com/upload_user_foto'
                ];

                let uploaded = false;
                for (const endpoint of endpointsUploadFoto) {
                    try {
                        const response = await fetch(endpoint, { method: 'POST', body: formData });
                        if (!response.ok) continue;
                        const result = await response.json();
                        if (result.success && result.foto_perfil) {
                            localStorage.setItem('userPhoto', result.foto_perfil);
                            modal.querySelector('.user-data-photo-preview').src = result.foto_perfil;
                            window.updateProfileAvatar?.();
                            uploaded = true;
                            break;
                        }
                    } catch (err) {
                        console.warn('Upload de foto falhou em', endpoint, err);
                    }
                }

                if (!uploaded) {
                    showGlobalNotification('Não foi possível enviar a foto.', 'error');
                }
            });

            const form = modal.querySelector('.user-data-form');
            form?.addEventListener('submit', async (event) => {
                event.preventDefault();
                const email = localStorage.getItem('userEmail');
                if (!email) {
                    showGlobalNotification('Erro: usuário não identificado.', 'error');
                    return;
                }

                const payload = {
                    email,
                    nome: form.elements.nome.value.trim(),
                    sobrenome: form.elements.sobrenome.value.trim(),
                    celular: form.elements.celular.value.trim(),
                    pais_origem: form.elements.pais_origem.value.trim(),
                    genero: form.elements.genero.value.trim()
                };

                const endpointsUpdate = [
                    `${API_BASE_URL}/update_user`,
                    'http://127.0.0.1:5000/update_user',
                    'https://api.exksvol.com/update_user'
                ];

                let updated = false;
                for (const endpoint of endpointsUpdate) {
                    try {
                        const response = await fetch(endpoint, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        if (response.ok) {
                            const result = await response.json();
                            if (result.success) {
                                updated = true;
                                break;
                            }
                        }
                    } catch (err) {
                        console.warn('Update user falhou em', endpoint, err);
                    }
                }

                if (updated) {
                    const currentLang = typeof window.getCurrentLanguage === 'function'
                        ? window.getCurrentLanguage()
                        : (document.documentElement.lang || 'pt').slice(0, 2);
                    const ui = window.uiTranslations?.[currentLang] || window.uiTranslations?.pt || {};
                    localStorage.setItem('userName', payload.nome || email);
                    localStorage.setItem('userPhone', payload.celular || '');
                    localStorage.setItem('userSobrenome', payload.sobrenome || '');
                    localStorage.setItem('userPais', payload.pais_origem || '');
                    localStorage.setItem('userGenero', payload.genero || '');
                    showGlobalNotification(ui.data_updated_success || 'Dados atualizados com sucesso.', 'success');
                    if (typeof window.updateProfileMenuUI === 'function') {
                        window.updateProfileMenuUI();
                    }
                    close();
                } else {
                    showGlobalNotification('Não foi possível atualizar seus dados.', 'error');
                }
            });

            document.body.appendChild(modal);
        }

        const form = modal.querySelector('.user-data-form');
        if (!form) return;
        const loadingEl = modal.querySelector('.user-data-loading');

        const setLoading = (isLoading, message = 'Carregando dados...') => {
            if (loadingEl) {
                loadingEl.textContent = message;
                loadingEl.hidden = !isLoading;
            }
            form.style.opacity = isLoading ? '0.55' : '1';
            form.style.pointerEvents = isLoading ? 'none' : 'auto';
            const saveBtn = form.querySelector('.user-data-save');
            if (saveBtn) saveBtn.disabled = isLoading;
        };

        modal.classList.add('open');
        setLoading(true);

        form.elements.nome.value = localStorage.getItem('userName') || '';
        form.elements.sobrenome.value = localStorage.getItem('userSobrenome') || '';
        form.elements.celular.value = localStorage.getItem('userPhone') || '';
        form.elements.pais_origem.value = localStorage.getItem('userPais') || '';
        form.elements.genero.value = localStorage.getItem('userGenero') || '';
        const previewImg = modal.querySelector('.user-data-photo-preview');
        if (previewImg) previewImg.src = localStorage.getItem('userPhoto') || '';

        const email = localStorage.getItem('userEmail');
        if (email) {
            const endpointsGetUser = [
                `${API_BASE_URL}/get_user`,
                'http://127.0.0.1:5000/get_user',
                'https://api.exksvol.com/get_user'
            ];

            for (const endpoint of endpointsGetUser) {
                try {
                    const response = await fetch(`${endpoint}?email=${encodeURIComponent(email)}`);
                    if (!response.ok) continue;
                    const data = await response.json();
                    if (!data || data.success === false) continue;

                    form.elements.nome.value = data.nome || '';
                    form.elements.sobrenome.value = data.sobrenome || '';
                    form.elements.celular.value = data.celular || '';
                    form.elements.pais_origem.value = data.pais_origem || '';
                    form.elements.genero.value = data.genero || '';
                    if (data.foto_perfil && previewImg) previewImg.src = data.foto_perfil;

                    localStorage.setItem('userName', data.nome || email);
                    localStorage.setItem('userPhone', data.celular || '');
                    localStorage.setItem('userSobrenome', data.sobrenome || '');
                    localStorage.setItem('userPais', data.pais_origem || '');
                    localStorage.setItem('userGenero', data.genero || '');
                    if (data.foto_perfil) {
                        localStorage.setItem('userPhoto', data.foto_perfil);
                    }
                    if (typeof window.updateProfileMenuUI === 'function') {
                        window.updateProfileMenuUI();
                    }
                    break;
                } catch (err) {
                    console.warn('Leitura de dados do usuário falhou em', endpoint, err);
                }
            }
        }
        setLoading(false);
    };

    window.openUserDataModal = openUserDataModal;

    const DIAS_SEMANA_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

    const parseHorariosPorDia = (raw) => {
        if (!raw) return null;
        try {
            const obj = JSON.parse(raw);
            return obj && typeof obj === 'object' ? obj : null;
        } catch {
            return null;
        }
    };

    // reservationDate.value é sempre "YYYY-MM-DD" (input type=date); decompor
    // manualmente e montar a data em horário local evita o bug clássico de
    // "new Date('YYYY-MM-DD')" (parseia como UTC meia-noite) devolver o dia
    // da semana errado dependendo do fuso do navegador.
    const weekdayKeyForDate = (dateStr) => {
        const [y, m, d] = (dateStr || '').split('-').map(Number);
        if (!y || !m || !d) return null;
        return DIAS_SEMANA_KEYS[new Date(y, m - 1, d).getDay()];
    };

    // Horários válidos pra um tour numa data específica. Tours sem
    // horarios_por_dia configurado (legado) caem no comportamento antigo:
    // mesma lista plana de horários, independente do dia da semana.
    const horariosParaData = (tour, dateStr) => {
        const porDia = parseHorariosPorDia(tour?.horarios_por_dia);
        if (!porDia) {
            return (tour?.horarios || '').split(',').map(h => h.trim()).filter(Boolean);
        }
        const dia = weekdayKeyForDate(dateStr);
        return dia && Array.isArray(porDia[dia]) ? porDia[dia] : [];
    };

    const initReservationTracking = () => {
        const reservationModal = document.getElementById('reservationModal');
        const reservationForm = document.getElementById('reservationForm');
        const reservationTour = document.getElementById('reservationTour');
        // Elemento só de exibição (caixa "Tour selecionado") — reservationTour
        // continua sendo o campo de verdade lido no submit, mas agora fica
        // hidden; quem mostra o nome do tour pro usuário é este aqui.
        const reservationTourDisplay = document.getElementById('reservationTourDisplay');
        const reservationName = document.getElementById('reservationName');
        const reservationDate = document.getElementById('reservationDate');
        const reservationTimeField = document.getElementById('reservationTimeField');
        const reservationTime = document.getElementById('reservationTime');
        const reservationQuantity = document.getElementById('reservationQuantity');
        const reservationLanguage = document.getElementById('reservationLanguage');
        const reservationPhone = document.getElementById('reservationPhone');
        const reservationEmail = document.getElementById('reservationEmail');
        const reservationCancel = document.getElementById('reservationCancel');
        let selectedMeetingPoint = '';

        const closeReservationModal = () => {
            if (!reservationModal) return;
            reservationModal.classList.add('hidden');
        };

        let activeReservationTour = null;

        const buildReservationTimeOptions = (horarios) => {
            if (!reservationTime || !reservationTimeField) return;
            const currentLang = typeof window.getCurrentLanguage === 'function'
                ? window.getCurrentLanguage()
                : (document.documentElement.lang || 'pt').slice(0, 2);
            const strings = window.uiTranslations?.[currentLang] || window.uiTranslations?.pt || {};

            reservationTime.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.setAttribute('data-i18n', 'reservation_time_placeholder');
            defaultOption.textContent = strings.reservation_time_placeholder || 'Selecione um horário';
            reservationTime.appendChild(defaultOption);

            horarios.forEach(horario => {
                const option = document.createElement('option');
                option.value = horario;
                option.textContent = horario;
                reservationTime.appendChild(option);
            });

            if (horarios.length) {
                reservationTimeField.hidden = false;
                reservationTime.setAttribute('required', 'required');
                // Antes, com um único horário disponível, ele já vinha
                // pré-selecionado — o cliente nunca via nem escolhia de
                // fato. Agora o campo sempre nasce em branco (placeholder),
                // mesmo com uma opção só; é o próprio cliente quem escolhe.
            } else {
                reservationTimeField.hidden = true;
                reservationTime.removeAttribute('required');
                reservationTime.value = '';
            }
        };

        // Tours com horários por dia da semana só liberam o campo de horário
        // depois que uma data é escolhida (sem data não dá pra saber o dia da
        // semana). Tours legados (só a lista plana "horarios") continuam
        // mostrando o campo direto, com os mesmos horários pra qualquer dia.
        const updateReservationTimeForSelectedDate = () => {
            if (!activeReservationTour) return;
            const porDia = parseHorariosPorDia(activeReservationTour.horarios_por_dia);
            if (!porDia) {
                buildReservationTimeOptions((activeReservationTour.horarios || '').split(',').map(h => h.trim()).filter(Boolean));
                return;
            }
            const dateValue = reservationDate ? reservationDate.value : '';
            if (!dateValue) {
                buildReservationTimeOptions([]);
                return;
            }
            const horariosDoDia = horariosParaData(activeReservationTour, dateValue);
            buildReservationTimeOptions(horariosDoDia);
            if (!horariosDoDia.length) {
                showGlobalNotification('Este tour não está disponível no dia da semana escolhido. Selecione outra data.', 'error');
            }
        };

        // Depois de escolher a data, leva o cliente direto pro campo de
        // horário — focus() sempre funciona; showPicker() (Chrome/Edge
        // recentes) já abre o dropdown sozinho, mas é opcional: navegadores
        // sem suporte simplesmente ignoram e o campo fica focado, pronto
        // pra abrir com Enter/seta ou um clique.
        const focarCampoHorario = () => {
            if (!reservationTime || !reservationTimeField || reservationTimeField.hidden) return;
            reservationTime.focus();
            try { reservationTime.showPicker?.(); } catch (_err) { /* navegador sem suporte */ }
        };

        if (reservationDate) {
            reservationDate.addEventListener('change', () => {
                updateReservationTimeForSelectedDate();
                focarCampoHorario();
            });
        }

        // Calendário customizado: o popup nativo de <input type="date"> não é
        // estilizável, então o campo vira um botão que abre um mini-calendário
        // próprio pintando de verde os dias em que o tour funciona. O input
        // nativo continua no DOM (oculto) como fonte da verdade — o resto do
        // fluxo (payload, updateReservationTimeForSelectedDate) não muda.
        const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        let calendarViewDate = new Date();
        let calendarPopover = null;
        let calendarDisplay = null;

        const formatDateDisplay = (dateStr) => {
            if (!dateStr) return 'Selecione uma data';
            const [y, m, d] = dateStr.split('-');
            return `${d}/${m}/${y}`;
        };

        const handleCalendarOutsideClick = (event) => {
            if (calendarPopover && !calendarPopover.contains(event.target) && event.target !== calendarDisplay && !calendarDisplay?.contains(event.target)) {
                closeCalendarPopover();
            }
        };

        function closeCalendarPopover() {
            calendarPopover?.remove();
            calendarPopover = null;
            document.removeEventListener('click', handleCalendarOutsideClick, true);
        }

        const renderCalendarPopover = () => {
            if (!calendarPopover) return;
            const year = calendarViewDate.getFullYear();
            const month = calendarViewDate.getMonth();
            const porDia = parseHorariosPorDia(activeReservationTour?.horarios_por_dia);
            const firstWeekday = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const selected = reservationDate?.value || '';

            let cells = '';
            for (let i = 0; i < firstWeekday; i++) cells += '<span class="res-calendar-day res-calendar-day--empty"></span>';
            for (let day = 1; day <= daysInMonth; day++) {
                const diaKey = DIAS_SEMANA_KEYS[new Date(year, month, day).getDay()];
                const disponivel = !porDia || (Array.isArray(porDia[diaKey]) && porDia[diaKey].length > 0);
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const classes = ['res-calendar-day', disponivel ? 'res-calendar-day--available' : 'res-calendar-day--unavailable'];
                if (dateStr === selected) classes.push('res-calendar-day--selected');
                cells += `<button type="button" class="${classes.join(' ')}" data-date="${dateStr}" ${disponivel ? '' : 'disabled'}>${day}</button>`;
            }

            calendarPopover.innerHTML = `
                <div class="res-calendar-header">
                    <button type="button" class="res-calendar-nav" data-nav="-1" aria-label="Mês anterior">&lsaquo;</button>
                    <span class="res-calendar-title">${MESES_PT[month]} ${year}</span>
                    <button type="button" class="res-calendar-nav" data-nav="1" aria-label="Próximo mês">&rsaquo;</button>
                </div>
                <div class="res-calendar-weekdays"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
                <div class="res-calendar-grid">${cells}</div>
                ${porDia ? '<div class="res-calendar-legend"><span class="res-calendar-legend-dot"></span> Dias disponíveis para este tour</div>' : ''}
            `;

            calendarPopover.querySelectorAll('[data-nav]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    calendarViewDate = new Date(year, month + Number(btn.getAttribute('data-nav')), 1);
                    renderCalendarPopover();
                });
            });
            calendarPopover.querySelectorAll('.res-calendar-day--available').forEach((btn) => {
                btn.addEventListener('click', () => {
                    reservationDate.value = btn.getAttribute('data-date');
                    reservationDate.dispatchEvent(new Event('change', { bubbles: true }));
                    if (calendarDisplay) calendarDisplay.querySelector('.res-date-display-text').textContent = formatDateDisplay(reservationDate.value);
                    closeCalendarPopover();
                });
            });
        };

        const openCalendarPopover = () => {
            if (calendarPopover) {
                closeCalendarPopover();
                return;
            }
            calendarViewDate = reservationDate?.value ? new Date(`${reservationDate.value}T00:00:00`) : new Date();
            calendarPopover = document.createElement('div');
            calendarPopover.className = 'res-calendar-popover';
            document.body.appendChild(calendarPopover);
            const rect = calendarDisplay.getBoundingClientRect();
            calendarPopover.style.position = 'fixed';
            calendarPopover.style.top = `${rect.bottom + 6}px`;
            calendarPopover.style.left = `${rect.left}px`;
            renderCalendarPopover();
            setTimeout(() => document.addEventListener('click', handleCalendarOutsideClick, true), 0);
        };

        const initCustomReservationCalendar = () => {
            if (!reservationDate || reservationDate.dataset.customCalendarInit) return;
            reservationDate.dataset.customCalendarInit = '1';
            reservationDate.hidden = true;
            reservationDate.style.display = 'none';

            calendarDisplay = document.createElement('button');
            calendarDisplay.type = 'button';
            calendarDisplay.className = 'res-date-display';
            calendarDisplay.innerHTML = '<i class="fas fa-calendar-alt"></i><span class="res-date-display-text">Selecione uma data</span>';
            reservationDate.insertAdjacentElement('afterend', calendarDisplay);
            calendarDisplay.addEventListener('click', openCalendarPopover);
        };

        initCustomReservationCalendar();

        const matchTourByName = (tourName) => getTours().find(t => normalizeTourKey(t.name || t.nome_tour) === normalizeTourKey(tourName));

        // Tours com canal_reserva="whatsapp" pulam o formulário do site: o botão
        // "Reservar agora" abre direto uma conversa no WhatsApp com o tour já
        // identificado na mensagem, sem exigir login.
        const openWhatsAppReservation = (tourName) => {
            const phone = window.__cidadeContatoPhone || '5521970018590';
            const mensagem = `Olá! Gostaria de realizar o tour "${tourName}".`;
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener');
        };

        const openReservationModal = (tourName, languageText, meetingPoint) => {
            if (!reservationModal) return;

            const matchedTour = matchTourByName(tourName);
            if ((matchedTour?.canal_reserva || 'web').toLowerCase() === 'whatsapp') {
                openWhatsAppReservation(tourName);
                return;
            }

            const userRole = localStorage.getItem('userRole');
            const userEmail = localStorage.getItem('userEmail');
            const userName = localStorage.getItem('userName');
            const userPhone = localStorage.getItem('userPhone');
            const currentLang = typeof window.getCurrentLanguage === 'function'
                ? window.getCurrentLanguage()
                : (document.documentElement.lang || 'pt').slice(0, 2);
            const ui = window.uiTranslations?.[currentLang] || window.uiTranslations?.pt || {};

            if (!userRole || !userEmail) {
                showGlobalNotification(ui.reservation_login_required || 'É necessário realizar login para fazer uma reserva.', 'error');
                return;
            }

            reservationTour.value = tourName;
            if (reservationTourDisplay) reservationTourDisplay.textContent = tourName;
            reservationName.value = userName || '';
            reservationDate.value = '';
            if (calendarDisplay) calendarDisplay.querySelector('.res-date-display-text').textContent = formatDateDisplay('');
            reservationQuantity.value = 1;
            reservationPhone.value = userPhone || '';
            reservationEmail.value = userEmail || '';
            selectedMeetingPoint = (meetingPoint || '').trim();

            const strings = window.uiTranslations?.[window.getCurrentLang?.() || (document.documentElement.lang || 'pt').slice(0, 2)] || window.uiTranslations?.pt || {};
            const defaultLangs = ['Português', 'Inglês', 'Espanhol'];
            const langs = (languageText || '').split(/[,;]+|\s+e\s+/i)
                .map(s => s.trim())
                .filter(Boolean)
                .filter((v, i, arr) => arr.indexOf(v) === i);
            if (!langs.length) langs.push(...defaultLangs);

            if (reservationLanguage) {
                reservationLanguage.innerHTML = '';
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.setAttribute('data-i18n', 'reservation_language_placeholder');
                defaultOption.textContent = strings.reservation_language_placeholder || 'Selecione um idioma';
                reservationLanguage.appendChild(defaultOption);

                langs.forEach(lang => {
                    const option = document.createElement('option');
                    option.value = lang;
                    option.textContent = lang;
                    reservationLanguage.appendChild(option);
                });

                if (langs.length === 1) {
                    reservationLanguage.value = langs[0];
                }
            }

            activeReservationTour = matchedTour || null;
            updateReservationTimeForSelectedDate();

            reservationModal.classList.remove('hidden');
        };

        // Extraída como função nomeada (em vez de só um forEach inline) porque
        // cards de tour criados dinamicamente (ver "+ Adicionar Tour" no admin,
        // window.__bindSiteShellReserveButton em fetchToursFromBackend) precisam
        // do mesmo binding — o forEach abaixo só alcança os botões que já
        // existem no HTML estático no momento em que a página carrega.
        const bindReserveButton = (button) => {
            if (!button || button.dataset.reserveBound === 'true') return;
            button.dataset.reserveBound = 'true';
            button.addEventListener('click', (event) => {
                if (button.classList.contains('disabled') || button.getAttribute('aria-disabled') === 'true') {
                    event.preventDefault();
                    return;
                }
                const card = button.closest('.rio-tour-card');
                const tourName = card?.querySelector('.rio-tour-name')?.textContent?.trim() || '';
                if (!tourName) {
                    // Not a per-tour card (eg. a combined "reserve" CTA that sits outside any
                    // single .rio-tour-card) — nothing to name in the modal, so let the link
                    // behave normally instead (eg. a WhatsApp deep link).
                    return;
                }
                event.preventDefault();
                const languageText = card?.querySelector('.fa-language')?.parentElement?.textContent?.replace(/\s*Idiomas?:\s*/i, '').trim() || '';
                const meetingTextRaw = card?.querySelector('.fa-map-marker-alt')?.parentElement?.textContent?.trim() || '';
                const meetingText = meetingTextRaw.replace(/^\s*(Encontro|Meeting|Rendez-vous|Encuentro|Incontro|集合|Saída|Roteiro)\s*:\s*/i, '').trim();
                openReservationModal(tourName, languageText, meetingText);
            });
        };
        document.querySelectorAll('.rio-btn-reserve').forEach(bindReserveButton);
        window.__bindSiteShellReserveButton = bindReserveButton;

        if (reservationCancel) {
            reservationCancel.addEventListener('click', (event) => {
                event.preventDefault();
                closeReservationModal();
            });
        }

        if (reservationPhone) {
            reservationPhone.addEventListener('input', (event) => {
                const value = event.target.value;
                const filtered = value.replace(/[^0-9()+\-\s]/g, '');
                if (filtered !== value) {
                    event.target.value = filtered;
                }
            });
        }

        if (reservationForm) {
            reservationForm.addEventListener('submit', async (event) => {
                event.preventDefault();

                const tour = reservationTour.value.trim();
                const clientName = reservationName.value.trim();
                const date = reservationDate.value;
                const quantity = Number(reservationQuantity.value) || 1;
                const language = reservationLanguage.value;
                const phone = reservationPhone.value.trim();
                const email = reservationEmail.value.trim();
                const currentLang = typeof window.getCurrentLanguage === 'function'
                    ? window.getCurrentLanguage()
                    : (document.documentElement.lang || 'pt').slice(0, 2);
                const ui = window.uiTranslations?.[currentLang] || window.uiTranslations?.pt || {};

                if (!navigator.onLine) {
                    showGlobalNotification(ui.connectivity_error_body_offline || 'Sem conexão com a internet. Verifique sua rede e tente novamente.', 'error', {
                        titleText: ui.connectivity_error_title || 'Erro de conexão',
                        gifUrl: '../imagem/assets/erro.gif'
                    });
                    return;
                }

                const guideName = 'N/S';
                // Modalidade vem do cadastro do tour (Privado/Free); nunca fica visível/editável
                // no formulário do cliente. O backend também valida isso de forma independente.
                const matchedTour = getTours().find(t => normalizeTourKey(t.name || t.nome_tour) === normalizeTourKey(tour));
                const modality = (matchedTour?.modalidade || 'free').toLowerCase();
                const horariosDisponiveis = horariosParaData(matchedTour, date);
                const selectedTime = reservationTime ? reservationTime.value : '';

                if (!tour || !clientName || !date || !quantity || !language || !phone || !email) {
                    showGlobalNotification('Preencha todos os campos obrigatórios para concluir a reserva.', 'error');
                    return;
                }

                if (parseHorariosPorDia(matchedTour?.horarios_por_dia) && !horariosDisponiveis.length) {
                    showGlobalNotification('Este tour não está disponível no dia da semana escolhido. Selecione outra data.', 'error');
                    return;
                }

                if (horariosDisponiveis.length && !selectedTime) {
                    showGlobalNotification('Escolha um horário para a reserva.', 'error');
                    return;
                }

                if (horariosDisponiveis.length && selectedTime && !horariosDisponiveis.includes(selectedTime)) {
                    showGlobalNotification('O horário selecionado não está mais disponível para essa data. Escolha novamente.', 'error');
                    return;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    showGlobalNotification('Por favor, insira um email válido.', 'error');
                    return;
                }

                if (date.trim() === '') {
                    showGlobalNotification('Escolha uma data de reserva.', 'error');
                    return;
                }

                const phoneRegex = /^[0-9()+\-\s]+$/;
                if (!phoneRegex.test(phone)) {
                    showGlobalNotification('O campo celular só permite números, +, -, ( ) e espaços.', 'error');
                    return;
                }

                // Formato required para backend: data e hora em campos separados.
                // Tours sem horários cadastrados mantêm o comportamento anterior (12:00 fixo).
                const finalTime = horariosDisponiveis.length ? selectedTime : '12:00';

                const payload = {
                    tour,
                    data: date,
                    hora: finalTime,
                    idioma: language,
                    modalidade: modality,
                    guia: guideName,
                    quantas_pessoas: quantity,
                    pessoas: '',
                    nome: clientName,
                    celular: phone,
                    email
                };

                const sendReservationToApi = async (url) => {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`API falhou ${response.status}: ${errorText}`);
                    }
                    return await response.json();
                };

                const endpoints = [
                    `${API_BASE_URL}/add_agendamento`,
                    'http://127.0.0.1:5000/add_agendamento',
                    'https://api.exksvol.com/add_agendamento'
                ];

                let saved = false;
                let firstError = null;

                for (const endpoint of endpoints) {
                    try {
                        await sendReservationToApi(endpoint);
                        const [yyyy, mm, dd] = date.split('-');
                        const formattedDate = (dd && mm && yyyy) ? `${dd}/${mm}/${yyyy}` : date;
                        const currentLang = typeof window.getCurrentLanguage === 'function'
                            ? window.getCurrentLanguage()
                            : (document.documentElement.lang || 'pt').slice(0, 2);
                        const ui = window.uiTranslations?.[currentLang] || window.uiTranslations?.pt || {};
                        const safeMeetingPoint = escapeHtml(selectedMeetingPoint || 'Conforme descrição do tour');
                        const safeDate = escapeHtml(formattedDate);
                        const safeTime = escapeHtml(finalTime);
                        const detailsHtml = `
                            <ul class="app-notification__summary">
                                <li><strong>${ui.booking_success_detail_date || 'Data:'}</strong> ${safeDate}</li>
                                <li><strong>${ui.booking_success_detail_time || 'Hora:'}</strong> ${safeTime}</li>
                                <li><strong>${ui.booking_success_detail_meeting_point || 'Local de encontro:'}</strong> ${safeMeetingPoint}</li>
                            </ul>
                            <p class="app-notification__hint">${ui.booking_success_hint || 'Fique atento ao meio de contato cadastrado. Nossa equipe entrará em contato para confirmar.'}</p>
                        `;

                        showGlobalNotification(ui.booking_success_title || 'Reserva concluída com sucesso.', 'success', {
                            titleText: '',
                            gifUrl: 'imagem/assets/certo.mp4',
                            detailsHtml
                        });
                        closeReservationModal();
                        saved = true;
                        break;
                    } catch (e) {
                        console.warn(`Falha ao enviar para ${endpoint}:`, e);
                        if (!firstError) firstError = e;
                    }
                }

                if (!saved) {
                    console.error('Todos endpoints falharam:', firstError);
                    showGlobalNotification(ui.reservation_send_error || 'Não foi possível enviar a reserva ao servidor. Por favor, verifique a conexão e tente novamente mais tarde.', 'error');
                }
            });
        }
    };



    const initFooterInfo = () => {
        document.querySelectorAll('[data-footer-action]').forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const action = link.getAttribute('data-footer-action');
                updateFooterInfo(action);

                const card = document.getElementById('footerInfoCard') || document.getElementById('rioFooterCard');
                if (card) {
                    card.classList.remove('hidden');
                    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    };

    const initFooterEmailCopy = () => {
        const isDesktopDevice = () => !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const emailLink = document.querySelector('a[href="mailto:riobyfoottour@gmail.com"]');
        if (!emailLink || !isDesktopDevice()) return;

        emailLink.addEventListener('click', async () => {
            if (!navigator.clipboard || typeof window.showAppNotification !== 'function') return;
            const email = (emailLink.getAttribute('href') || '').replace(/^mailto:/, '').split('?')[0] || 'riobyfoottour@gmail.com';
            const currentLang = typeof window.getCurrentLanguage === 'function'
                ? window.getCurrentLanguage()
                : (document.documentElement.lang || 'pt').slice(0, 2);
            const messageMap = {
                pt: 'Email copiado para a área de transferência.',
                en: 'Email copied to clipboard.',
                es: 'Correo copiado al portapapeles.',
                fr: 'E-mail copié dans le presse-papiers.',
                it: 'Email copiato negli appunti.',
                zh: '电子邮件已复制到剪贴板。'
            };

            try {
                await navigator.clipboard.writeText(email);
                showGlobalNotification(messageMap[currentLang] || messageMap.en, 'success');
            } catch (error) {
                console.warn('Falha ao copiar o email:', error);
            }
        });
    };

    const initRelatosGallery = () => {
        const gallery = document.getElementById('relatosGallery');
        if (!gallery) return;

        // Curtidas reais (persistidas no banco), chaveadas por cidade + data-photo-id.
        // Ver js/tour-interacoes.js (window.TourInteracoes.initRelatosLikes).
        if (window.TourInteracoes) {
            window.TourInteracoes.initRelatosLikes(gallery.dataset.cidade);
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        // Ensure page starts at the top and focus is set to header for accessibility
        window.scrollTo({ top: 0, behavior: 'instant' });
        const header = document.querySelector('header');
        if (header) {
            header.setAttribute('tabindex', '-1');
            header.focus();
        }

        initLanguageSelector();
        initHamburgerMenu();
        initMobileMenuContent();
        if (typeof window.applyRoleBasedControls === 'function') {
            window.applyRoleBasedControls();
        }
        initSmoothAnchorScroll();
        initLoginModal();
        initRegisterModal();
        initFooterInfo();
        initFooterEmailCopy();
        initRelatosGallery();

        // Intro/notice overlay (eg. "Informações Importantes") used by several destination
        // pages: "Prosseguir" só esconde para esta visita; "Não mostrar novamente"
        // também grava a preferência pra o overlay não voltar a aparecer nesta página.
        // Chave calculada de novo aqui (em vez de reaproveitar a constante do topo do
        // arquivo) porque este trecho vive numa IIFE diferente — são dois módulos
        // separados no mesmo arquivo, sem escopo compartilhado entre eles.
        const noticeDismissKey = `rioNoticeDismissed:${window.location.pathname}`;
        const noticeEl = document.querySelector('.rio-notice');
        const noticeProceedBtn = document.querySelector('.rio-notice .btn-proceed');
        const noticeDontShowBtn = document.querySelector('.rio-notice .btn-dont-show');
        const noticeCurrentLang = (typeof window.getCurrentLang === 'function' && window.getCurrentLang())
            || (typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage())
            || 'pt';
        const noticeLabels = window.TOUR_ACTION_LABELS?.[noticeCurrentLang] || window.TOUR_ACTION_LABELS?.pt || { proceed: 'Prosseguir', dontShow: 'Não mostrar novamente' };
        if (noticeProceedBtn) noticeProceedBtn.textContent = noticeLabels.proceed;
        if (noticeDontShowBtn) noticeDontShowBtn.textContent = noticeLabels.dontShow;
        if (noticeProceedBtn) {
            noticeProceedBtn.addEventListener('click', () => {
                if (noticeEl) noticeEl.style.display = 'none';
                window.__showAwardCard?.();
            });
        }
        if (noticeDontShowBtn) {
            noticeDontShowBtn.addEventListener('click', () => {
                localStorage.setItem(noticeDismissKey, '1');
                if (noticeEl) noticeEl.style.display = 'none';
                window.__showAwardCard?.();
            });
        }

        // Only wire the on-page reservation form for pages that actually have the modal
        // markup (#reservationModal). Pages without one keep their reserve buttons as-is
        // (eg. WhatsApp deep links).
        if (document.getElementById('reservationModal')) {
            initReservationTracking();
        }
        if (typeof syncToursFromIndex === 'function') {
            syncToursFromIndex();
        }
        // Puxa os tours mantidos pela página de Gerenciamento (links, status e valores atualizados)
        fetchToursFromBackend().then(scrollToDirectLinkTourIfNeeded);
        loadCidadeContato();
        loadCidadeAviso();
        // Texto padrão do cartão de informações (antes de SOBRE/CONTATO/AJUDA
        // serem clicados) é editável em Gerenciamento > Textos SOBRE/CONTATO/AJUDA,
        // seção "Informações". Sem override cadastrado, mantém o texto estático
        // padrão de cada página (sem regressão para quem não configurou nada).
        loadPaginaSecao().then(() => {
            if (window.__paginaSecaoOverrides?.informacoes) {
                updateFooterInfo('informacoes');
            }
        });
        dispatchLanguageChange(getCurrentLang());
    });

    // Telefone (WhatsApp) e email de contato são editáveis por cidade em
    // Gerenciamento > Gerenciamento da página > Contato por Cidade. Substitui,
    // na página atual, os links de WhatsApp/email que ainda apontam para o
    // valor padrão hardcoded pelo valor configurado para a cidade desta página.
    const applyCidadeContato = (contato) => {
        if (!contato) return;
        const telefone = (contato.telefone || '').replace(/\D/g, '');
        const email = (contato.email || '').trim();

        if (telefone) {
            document.querySelectorAll('a[href*="wa.me/"]').forEach((a) => {
                a.setAttribute('href', a.getAttribute('href').replace(/wa\.me\/\d+/, `wa.me/${telefone}`));
            });
            document.querySelectorAll('a[href*="api.whatsapp.com/send"]').forEach((a) => {
                a.setAttribute('href', a.getAttribute('href').replace(/phone=\d+/, `phone=${telefone}`));
            });
            window.__cidadeContatoPhone = telefone;
        }

        if (email) {
            const previousEmail = window.__cidadeContatoEmail || 'riobyfoottour@gmail.com';
            document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
                const href = a.getAttribute('href');
                const currentEmail = href.slice(7).split('?')[0];
                if (currentEmail.toLowerCase() !== previousEmail.toLowerCase()) return;
                a.setAttribute('href', `mailto:${email}`);
                if (a.textContent.trim().toLowerCase() === currentEmail.toLowerCase()) {
                    a.textContent = email;
                }
            });
            window.__cidadeContatoEmail = email;
        }

        const youtube = (contato.youtube || '').trim();
        if (youtube) {
            document.querySelectorAll('a[data-social="youtube"], a[href*="youtube.com"]').forEach((a) => {
                a.setAttribute('href', youtube);
            });
            window.__cidadeContatoYoutube = youtube;
        }
    };
    window.applyCidadeContato = (cidade, contato) => applyCidadeContato(contato);

    const loadCidadeContato = async () => {
        const cidade = document.getElementById('relatosGallery')?.dataset.cidade;
        if (!cidade) return;

        const endpoints = [
            `${API_BASE_URL}/get_cidade_contato`,
            'http://127.0.0.1:5000/get_cidade_contato',
            'https://api.exksvol.com/get_cidade_contato'
        ];
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) continue;
                const lista = await response.json();
                if (!Array.isArray(lista)) continue;
                const contato = lista.find((item) => item && item.cidade === cidade);
                if (contato) applyCidadeContato(contato);
                return;
            } catch (error) {
                console.warn('Falha ao carregar contato da cidade em', endpoint, error);
            }
        }
    };

    // Aviso "Informações Importantes" editável por cidade em Gerenciamento >
    // Gerenciamento da página > Aviso "Informações Importantes". Permite
    // customizar título/texto ou ocultar o aviso por completo.
    const applyCidadeAviso = (aviso) => {
        const noticeEl = document.querySelector('.rio-notice');
        if (!noticeEl || !aviso) return;

        // Link direto pra um tour: some com o aviso, sem acionar o card de
        // premiação (initAwardNotification já nem define essa função aqui).
        if (window.__tourDirectLinkId) {
            noticeEl.style.display = 'none';
            return;
        }

        if (aviso.ativo === false) {
            noticeEl.style.display = 'none';
            window.__showAwardCard?.();
            return;
        }

        const noticeDismissKey = `rioNoticeDismissed:${window.location.pathname}`;
        if (localStorage.getItem(noticeDismissKey) === '1') return;

        // Cacheado para poder reaplicar (com a tradução certa) quando o
        // idioma da página trocar, sem precisar buscar de novo na API.
        window.__cidadeAvisoData = aviso;

        // O admin só digita em português; nos outros idiomas usamos a
        // tradução automática cacheada em aviso.traducoes[lang] (ver app.py).
        const lang = typeof window.getCurrentLanguage === 'function' ? window.getCurrentLanguage() : 'pt';
        const traducao = lang !== 'pt' ? aviso.traducoes?.[lang] : null;
        const titulo = (traducao && traducao.titulo) || aviso.titulo;
        const texto = (traducao && typeof traducao.texto === 'string') ? traducao.texto : aviso.texto;

        const titleEl = noticeEl.querySelector('.rio-notice-title');
        if (titleEl && titulo) titleEl.textContent = titulo;

        const textContainer = noticeEl.querySelector('.rio-notice-text');
        const actions = noticeEl.querySelector('.rio-notice-actions');
        if (textContainer && typeof texto === 'string') {
            const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
            if (linhas.length) {
                textContainer.querySelectorAll('p').forEach((p) => p.remove());
                linhas.forEach((linha) => {
                    const p = document.createElement('p');
                    const icon = document.createElement('i');
                    icon.className = 'fa fa-circle-info';
                    p.appendChild(icon);
                    p.appendChild(document.createTextNode(` ${linha}`));
                    textContainer.insertBefore(p, actions);
                });
            }
        }

        // Marca que o conteúdo do banco já foi aplicado, para as páginas de
        // cada cidade (Salvador.js/Saoluísdomaranhao.js/Lencoismaranhenses.js)
        // não sobrescreverem título/texto com o fallback hardcoded ao trocar
        // de idioma depois disso.
        window.__cidadeAvisoCarregado = true;
        noticeEl.style.display = '';
    };
    window.applyCidadeAviso = (cidade, aviso) => applyCidadeAviso(aviso);

    const loadCidadeAviso = async () => {
        const cidade = document.getElementById('relatosGallery')?.dataset.cidade;
        if (!cidade) return;

        const endpoints = [
            `${API_BASE_URL}/get_cidade_aviso`,
            'http://127.0.0.1:5000/get_cidade_aviso',
            'https://api.exksvol.com/get_cidade_aviso'
        ];
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) continue;
                const lista = await response.json();
                if (!Array.isArray(lista)) continue;
                const aviso = lista.find((item) => item && item.cidade === cidade);
                if (aviso) applyCidadeAviso(aviso);
                return;
            } catch (error) {
                console.warn('Falha ao carregar aviso da cidade em', endpoint, error);
            }
        }
    };

    // Título/texto de SOBRE, CONTATO e AJUDA editáveis por página em
    // Gerenciamento > Gerenciamento da página > Textos SOBRE/CONTATO/AJUDA.
    // Popula window.__paginaSecaoOverrides, consultado por updateFooterInfo()
    // sempre que o card de informações do rodapé é preenchido.
    const loadPaginaSecao = async () => {
        const pagina = document.getElementById('relatosGallery')?.dataset.cidade;
        if (!pagina) return;

        const endpoints = [
            `${API_BASE_URL}/get_pagina_secao?pagina=${encodeURIComponent(pagina)}`,
            `http://127.0.0.1:5000/get_pagina_secao?pagina=${encodeURIComponent(pagina)}`,
            `https://api.exksvol.com/get_pagina_secao?pagina=${encodeURIComponent(pagina)}`
        ];
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) continue;
                const lista = await response.json();
                if (!Array.isArray(lista)) continue;
                window.__paginaSecaoOverrides = lista.reduce((acc, item) => {
                    if (item && item.secao) acc[item.secao] = item;
                    return acc;
                }, {});
                return;
            } catch (error) {
                console.warn('Falha ao carregar textos da página em', endpoint, error);
            }
        }
    };
})();


