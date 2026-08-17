// Login / Cadastro / Recuperação de senha — versão para a página index.
// Portado das páginas de cidade (Riodejaneiro.js: createLoginModal/initLoginModal/
// createRegisterModal/initRegisterModal), simplificado porque a index não tem
// menu de perfil, abas de reserva nem outras telas pós-login: sucesso no login
// só fecha o modal e recarrega a página (ou manda pro Gerenciamento, se admin).
(function () {
    'use strict';

    const API_BASE_URL = 'https://api-tour.exksvol.com';
    window.API_BASE_URL = window.API_BASE_URL || API_BASE_URL;

    const getCurrentLang = () => (typeof window.getCurrentLanguage === 'function'
        ? window.getCurrentLanguage()
        : (document.documentElement.lang || 'pt').slice(0, 2));
    window.getCurrentLang = window.getCurrentLang || getCurrentLang;

    const translations = window.uiTranslations || {};

    const escapeHtml = (value) => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const normalizeRole = (role) => {
        if (!role) return 'cliente_user';
        const roleLower = role.toLowerCase();
        if (roleLower === 'user') return 'cliente_user';
        if (roleLower === 'admin') return 'admin';
        if (roleLower === 'super_admin') return 'super_admin';
        return roleLower;
    };
    window.normalizeRole = window.normalizeRole || normalizeRole;

    // Foto de perfil padrão do usuário: usa o Gravatar associado ao email
    // (hash SHA-256, sem precisar de nenhuma API/consentimento do provedor
    // de email). Se o usuário nunca configurou um Gravatar, cai num avatar
    // gerado (identicon) em vez de imagem quebrada.
    const getGravatarUrl = async (email, size = 80) => {
        const normalized = (email || '').trim().toLowerCase();
        const data = new TextEncoder().encode(normalized);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
        return `https://www.gravatar.com/avatar/${hashHex}?s=${size}&d=identicon`;
    };
    window.getGravatarUrl = window.getGravatarUrl || getGravatarUrl;

    const updateProfileAvatar = async () => {
        const button = document.querySelector('.profile-btn');
        if (!button) return;
        const userRole = localStorage.getItem('userRole');
        if (!userRole) {
            const strings = translations[getCurrentLang()] || translations.pt || {};
            button.classList.add('profile-btn--login');
            button.textContent = strings.profile_login || 'Entrar';
            return;
        }
        button.classList.remove('profile-btn--login');
        let userPhoto = localStorage.getItem('userPhoto');
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
    window.updateProfileAvatar = window.updateProfileAvatar || updateProfileAvatar;

    const updateProfileMenuUI = () => {
        const menu = document.querySelector('.profile-menu');
        const dropdown = menu?.querySelector('.profile-dropdown');
        const userRole = localStorage.getItem('userRole');
        const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || '';
        if (!dropdown) return;

        if (userRole) {
            const strings = translations[getCurrentLang()] || translations.pt || {};
            const showManagement = userRole === 'admin' || userRole === 'super_admin';
            dropdown.innerHTML = `
                <div class="profile-user-info" style="padding:8px 12px; font-weight: 600; border-bottom: 1px solid #e0e0e0;"><span data-i18n="profile_hello">Olá</span>, ${escapeHtml(userName)}</div>
                ${showManagement ? `<a href="#" class="profile-item profile-item--admin" data-profile-action="manage">${strings.profile_manage || 'Gerenciamento'}</a>` : ''}
                <a href="#" class="profile-item" data-profile-action="my-reservations" data-i18n="profile_my_reservations">${strings.profile_my_reservations || 'Minhas Reservas'}</a>
                <a href="#" class="profile-item" data-profile-action="logout" data-i18n="profile_logout">${strings.profile_logout || 'Sair'}</a>
            `;
        } else {
            const strings = translations[getCurrentLang()] || translations.pt || {};
            dropdown.innerHTML = `
                <a href="#" class="profile-item" data-profile-action="login" data-i18n="profile_login">${strings.profile_login || 'Entrar'}</a>
                <a href="#" class="profile-item" data-profile-action="register" data-i18n="profile_register">${strings.profile_register || 'Cadastrar'}</a>
            `;
        }

        window.updateProfileAvatar?.();
    };
    window.updateProfileMenuUI = window.updateProfileMenuUI || updateProfileMenuUI;

    // Modal "Minhas Reservas" — versão simplificada da que existe nas páginas
    // de cidade (Riodejaneiro.js/site-shell.js): mostra a lista e permite
    // cancelar, mas não editar (o formulário de edição depende da tela de
    // reserva de uma cidade específica, que a index não tem).
    const openMyReservationsModal = async () => {
        const strings = translations[getCurrentLang()] || translations.pt || {};

        let modal = document.getElementById('myReservationsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'myReservationsModal';
            modal.className = 'my-reservations-overlay';
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-label', strings.reservation_title || 'Minhas Reservas');
            modal.innerHTML = `
                <div class="my-reservations-modal">
                    <button type="button" class="my-reservations-close" aria-label="Fechar">&times;</button>
                    <h2 class="my-reservations-title">${strings.reservation_title || 'Minhas Reservas'}</h2>
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

        let data = null;
        try {
            data = await apiFetch(`/get_meus_agendamentos?email=${encodeURIComponent(email)}`);
        } catch {
            try {
                data = await apiFetch(`/get_agendamentos?email=${encodeURIComponent(email)}`);
            } catch {
                data = null;
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
            const statusRaw = String(r.status || 'Pendente').trim();
            const statusKey = statusRaw.toLowerCase();
            const isPending = /pendente|pending|pendiente|en attente|in attesa|待定/i.test(statusRaw);
            const isConfirmed = /confirmado|confirmed|confirmé|confermato|已确认/i.test(statusRaw);
            const isCancelled = /cancelado|canceled|annulé|anulado|已取消|取消/i.test(statusRaw);
            const isFinalized = /finalizado|finalized|terminado|terminé|completed|concluído|concluido|concluída|concluida|conclu|完了|已完成/i.test(statusRaw);
            const statusText = isPending
                ? (strings.reservation_status_pending || 'Confirmação pendente')
                : isConfirmed
                    ? (strings.reservation_status_confirmed || 'Confirmado')
                    : isCancelled
                        ? (strings.reservation_status_cancelled || 'Cancelado')
                        : escapeHtml(statusRaw);
            const statusLabel = `${strings.reservation_status_prefix || 'Status:'} ${statusText}`;
            const showActions = !(isCancelled || isFinalized);

            return `
            <div class="my-reservations-item" data-reservation-id="${escapeHtml(String(r.id || ''))}">
                <strong class="my-reservations-tour">${escapeHtml(r.tour || '—')}</strong>
                <span class="my-reservations-date">${strings.reservation_list_date_label || 'Data'}: ${escapeHtml(r.data || '—')}</span>
                ${r.hora ? `<span class="my-reservations-detail">${strings.reservation_list_time_label || 'Hora'}: ${escapeHtml(r.hora)}</span>` : ''}
                ${r.idioma ? `<span class="my-reservations-detail">${strings.reservation_list_language_label || 'Idioma'}: ${escapeHtml(r.idioma)}</span>` : ''}
                ${r.qtd ? `<span class="my-reservations-detail">${strings.reservation_list_people_label || 'Pessoas'}: ${escapeHtml(String(r.qtd))}</span>` : ''}
                <span class="my-reservations-status my-reservations-status--${escapeHtml(statusKey)}">${statusLabel}</span>
                ${showActions ? `
                    <div class="my-reservations-actions">
                        <button type="button" class="btn-cancel-reservation" data-reservation-id="${escapeHtml(String(r.id || ''))}">${strings.action_cancel || 'Cancelar'}</button>
                    </div>
                ` : ''}
            </div>
        `;
        }).join('');

        listEl.querySelectorAll('.btn-cancel-reservation').forEach((button) => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = button.getAttribute('data-reservation-id');
                if (!id) return;
                if (!confirm(strings.reservation_confirm_cancel_prompt || 'Deseja cancelar esta reserva? Clique em OK para continuar.')) return;
                if (!confirm(strings.reservation_confirm_cancel_again_prompt || 'Confirma novamente: realmente deseja cancelar a reserva?')) return;

                let updated = false;
                try {
                    const result = await apiFetch('/update_agendamento', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, status: 'Cancelado', admin_email: email })
                    });
                    updated = Boolean(result?.success);
                } catch (err) {
                    console.warn('Cancelamento falhou em /update_agendamento', err);
                }

                if (updated) {
                    alert(strings.reservation_cancel_success || 'Reserva cancelada com sucesso.');
                    openMyReservationsModal();
                } else {
                    alert(strings.reservation_cancel_failed || 'Não foi possível cancelar a reserva. Tente novamente.');
                }
            });
        });
    };
    window.openMyReservationsModal = window.openMyReservationsModal || openMyReservationsModal;

    const initProfileMenu = () => {
        const menu = document.querySelector('.profile-menu');
        const button = document.getElementById('profileBtn');
        if (!menu || !button) return;

        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const isOpen = menu.classList.toggle('open');
            button.setAttribute('aria-expanded', String(isOpen));
        });

        document.addEventListener('click', (event) => {
            if (!menu.contains(event.target)) {
                menu.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');
            }
        });

        menu.addEventListener('click', (event) => {
            const target = event.target.closest('.profile-item');
            if (!target) return;

            const action = target.getAttribute('data-profile-action');
            if (action === 'manage') {
                event.preventDefault();
                menu.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');
                redirectToManagementPage();
            } else if (action === 'my-reservations') {
                event.preventDefault();
                menu.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');
                openMyReservationsModal();
            } else if (action === 'logout') {
                event.preventDefault();
                localStorage.removeItem('userRole');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                localStorage.removeItem('userPhoto');
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentRolePermissions');
                menu.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');
                window.location.reload();
            }
            // login/register: deixa o clique seguir para o listener de
            // initLoginModal/initRegisterModal, que abre o modal certo.
        });

        updateProfileMenuUI();
    };

    const redirectToManagementPage = () => {
        const path = window.location.pathname || '';
        window.location.href = path.includes('/html/') ? 'Gerenciamento.html' : 'html/Gerenciamento.html';
    };
    window.redirectToManagementPage = window.redirectToManagementPage || redirectToManagementPage;

    const apiFetch = async (path, options = {}) => {
        const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
        const defaultOptions = {
            headers: { ...(options.headers || {}) },
            ...options
        };

        const response = await fetch(url, defaultOptions);
        const responseText = await response.text();
        let payload;
        try {
            payload = responseText ? JSON.parse(responseText) : null;
        } catch (_e) {
            payload = responseText;
        }

        if (!response.ok) {
            throw new Error(`API request failed ${response.status} ${response.statusText}: ${responseText}`);
        }
        return payload;
    };
    window.apiFetch = window.apiFetch || apiFetch;

    // ─── Modal de login (com recuperação de senha embutida) ────────────────

    const createLoginModal = () => {
        if (document.querySelector('.login-modal-overlay')) return;

        const strings = translations[getCurrentLang()] || translations.pt || {};
        const overlay = document.createElement('div');
        overlay.className = 'login-modal-overlay';
        overlay.innerHTML = `
            <div class="login-modal" role="dialog" aria-modal="true" aria-label="${strings.login_title || 'Entrar'}">
                <div class="login-modal__header">
                    <h2 class="login-modal__title">${strings.login_title || 'Entrar'}</h2>
                    <button type="button" class="login-modal__close" aria-label="${strings.login_close || 'Fechar'}">&times;</button>
                </div>
                <form id="loginForm" class="login-modal__form">
                    <div class="login-modal__field">
                        <label for="loginEmail">${strings.login_email || 'Email'}</label>
                        <input id="loginEmail" type="email" autocomplete="email" required />
                    </div>
                    <div class="login-modal__field login-modal__field--password">
                        <label for="loginPassword">${strings.login_password || 'Senha'}</label>
                        <div class="login-modal__password-wrapper">
                            <input id="loginPassword" type="password" autocomplete="current-password" required />
                            <button type="button" class="login-modal__toggle-password" aria-label="${strings.login_show || 'Mostrar senha'}">
                                <i class="fa fa-eye" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                    <div class="login-modal__actions">
                        <button type="submit" class="login-modal__submit">${strings.login_button || 'Entrar'}</button>
                        <button type="button" class="login-modal__forgot">${strings.login_forgot || 'Esqueci minha senha'}</button>
                    </div>
                    <p class="login-modal__switch">${strings.register_prompt || 'Não tem conta?'} <button type="button" data-profile-action="register">${strings.register_title || 'Cadastrar'}</button></p>
                </form>
                <form id="passwordResetForm" class="login-modal__form" style="display:none;">
                    <div class="login-modal__field">
                        <label for="resetEmail">${strings.reset_email_label || 'Email'}</label>
                        <input id="resetEmail" type="email" autocomplete="email" required />
                    </div>
                    <div class="login-modal__field">
                        <label>${strings.reset_code_label || 'Código de confirmação'}</label>
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
                        <label for="resetNewPassword">${strings.reset_new_password_label || 'Nova senha'}</label>
                        <div class="login-modal__password-wrapper">
                            <input id="resetNewPassword" type="password" autocomplete="new-password" minlength="6" required />
                            <button type="button" class="login-modal__toggle-password" aria-label="${strings.login_show || 'Mostrar senha'}">
                                <i class="fa fa-eye" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                    <div class="login-modal__field login-modal__field--password">
                        <label for="resetConfirmPassword">${strings.reset_confirm_password_label || 'Confirmar nova senha'}</label>
                        <div class="login-modal__password-wrapper">
                            <input id="resetConfirmPassword" type="password" autocomplete="new-password" minlength="6" required />
                            <button type="button" class="login-modal__toggle-password" aria-label="${strings.login_show || 'Mostrar senha'}">
                                <i class="fa fa-eye" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                    <div class="login-modal__actions">
                        <button type="submit" class="login-modal__submit">${strings.reset_update_button || 'Atualizar senha'}</button>
                        <button type="button" class="login-modal__forgot" id="resetBackToLogin">${strings.reset_back_to_login || 'Voltar ao login'}</button>
                    </div>
                </form>
            </div>
        `;

        const loginFormElement = overlay.querySelector('#loginForm');
        const resetFormElement = overlay.querySelector('#passwordResetForm');
        const modalTitle = overlay.querySelector('.login-modal__title');
        let isResetCodeVerified = false;

        const gatherResetCode = () => Array.from(overlay.querySelectorAll('.reset-code-input')).map((i) => i.value.trim()).join('');

        const setResetCodeState = (state) => {
            overlay.querySelectorAll('.reset-code-input').forEach((input) => {
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
            codeInputs.forEach((input, i) => { input.value = digits[i] || ''; });
            if (digits.length < codeInputs.length) codeInputs[digits.length]?.focus();
            else codeInputs[codeInputs.length - 1]?.focus();
        };

        const verifyResetCodeApi = async (email, code) => {
            const response = await fetch(`${API_BASE_URL}/verify_password_reset_code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            const payload = await response.json().catch(() => ({}));
            return { ok: response.ok, payload };
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
            } catch (_e) {
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
                    if (input.value && index < codeInputs.length - 1) codeInputs[index + 1].focus();
                    isResetCodeVerified = false;
                    setResetCodeState('neutral');
                    maybeVerifyResetCode();
                });
                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Backspace' && !input.value && index > 0) codeInputs[index - 1].focus();
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
            if (modalTitle) modalTitle.textContent = strings.login_title || 'Entrar';
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
                forgotBtn.textContent = forgotBtn.dataset.originalLabel || strings.login_forgot || 'Esqueci minha senha';
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
            overlay.querySelectorAll('.reset-code-input').forEach((input) => { input.value = ''; });
            overlay.querySelector('#resetCode1')?.focus();
        };

        const closeModal = () => {
            showLoginView();
            overlay.classList.remove('open');
            document.body.classList.remove('modal-open');
        };

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closeModal();
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
                    body: JSON.stringify({ email, lang: getCurrentLang() })
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
            overlay.querySelector('#loginPassword')?.focus();
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
                    body: JSON.stringify({ email, code, new_password: newPassword })
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

        overlay.querySelectorAll('.login-modal__toggle-password').forEach((btn) => {
            const input = btn.closest('.login-modal__password-wrapper')?.querySelector('input');
            if (!input) return;
            btn.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.setAttribute('aria-label', isPassword ? (strings.login_hide || 'Ocultar senha') : (strings.login_show || 'Mostrar senha'));
                const icon = btn.querySelector('i');
                if (icon) icon.className = isPassword ? 'fa fa-eye-slash' : 'fa fa-eye';
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && overlay.classList.contains('open')) closeModal();
        });

        document.body.appendChild(overlay);

        // Chamado pelo link do e-mail de recuperação (?auth=reset&email=&code=):
        // abre direto na tela de redefinir senha, com e-mail e código já
        // preenchidos e verificados — só falta o usuário digitar a nova senha.
        return {
            openForReset: async (emailFromLink, codeFromLink) => {
                overlay.classList.add('open');
                document.body.classList.add('modal-open');
                showResetView(emailFromLink);
                fillResetCodeInputs(codeFromLink);
                await maybeVerifyResetCode();
                overlay.querySelector('#resetNewPassword')?.focus();
            }
        };
    };

    // ─── Modal de cadastro ───────────────────────────────────────────────

    const COUNTRY_LIST = [
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

    const createRegisterModal = () => {
        if (document.querySelector('.register-modal-overlay')) return;

        const strings = translations[getCurrentLang()] || translations.pt || {};
        const overlay = document.createElement('div');
        overlay.className = 'register-modal-overlay';
        overlay.innerHTML = `
            <div class="login-modal" role="dialog" aria-modal="true" aria-label="${strings.register_title || 'Cadastrar'}">
                <div class="login-modal__header">
                    <h2 class="login-modal__title">${strings.register_title || 'Cadastrar'}</h2>
                    <button type="button" class="login-modal__close" aria-label="${strings.register_close || 'Fechar'}">&times;</button>
                </div>
                <form class="login-modal__form">
                    <div class="register-step register-step--1 active">
                        <div class="login-modal__field">
                            <label for="registerFirstName">${strings.register_first_name || 'Nome'}</label>
                            <input id="registerFirstName" type="text" autocomplete="given-name" required />
                        </div>
                        <div class="login-modal__field">
                            <label for="registerLastName">${strings.register_last_name || 'Sobrenome'}</label>
                            <input id="registerLastName" type="text" autocomplete="family-name" required />
                        </div>
                        <div class="login-modal__field">
                            <label for="registerEmail">${strings.register_email || 'Email'}</label>
                            <input id="registerEmail" type="email" autocomplete="email" required />
                        </div>
                        <div class="login-modal__field">
                            <label for="registerDob">${strings.register_dob || 'Data de nascimento'}</label>
                            <input id="registerDob" type="date" required />
                        </div>
                        <div class="login-modal__field">
                            <label for="registerPhone">${strings.register_phone || 'Celular'}</label>
                            <input id="registerPhone" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="tel" required />
                        </div>
                        <div class="login-modal__field">
                            <label for="registerCountry">${strings.register_country || 'País de origem'}</label>
                            <input id="registerCountry" type="text" list="countryList" autocomplete="country" required />
                            <datalist id="countryList"></datalist>
                        </div>
                        <div class="login-modal__field">
                            <label for="registerGender">${strings.register_gender || 'Gênero'}</label>
                            <select id="registerGender" required>
                                <option value="" selected disabled>—</option>
                                <option value="male">${strings.register_gender_male || 'Masculino'}</option>
                                <option value="female">${strings.register_gender_female || 'Feminino'}</option>
                                <option value="nonbinary">${strings.register_gender_nonbinary || 'Não-binário'}</option>
                                <option value="prefer_not">${strings.register_gender_prefer_not || 'Prefiro não informar'}</option>
                                <option value="other">${strings.register_gender_other || 'Outro'}</option>
                            </select>
                        </div>
                        <div class="login-modal__actions">
                            <button type="button" class="login-modal__next">${strings.register_next || 'Avançar'}</button>
                        </div>
                    </div>
                    <div class="register-step register-step--2">
                        <p class="register-code-spam-hint" style="font-size:0.85rem; color:#374151; background:#fff8e1; border:1px solid #ffe082; border-radius:8px; padding:0.5rem 0.75rem; margin:0 0 0.75rem;">${strings.register_code_spam_hint || 'Enviamos um código de confirmação para o seu e-mail. Não encontrou a mensagem? Verifique também a caixa de Spam/Lixo Eletrônico.'}</p>
                        <div class="login-modal__field register-code-field">
                            <label>${strings.register_code || 'Código de confirmação'}</label>
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
                            <button type="button" class="register-resend-button" disabled>${strings.register_resend_code || 'Reenviar código'}</button>
                        </div>
                        <div class="register-liberacao-request" style="margin:0 0 0.75rem;">
                            <button type="button" class="register-request-liberation-button" style="background:none; border:none; color:#1f6feb; text-decoration:underline; cursor:pointer; font-size:0.85rem; padding:0;">${strings.register_request_liberation || 'Não recebeu o e-mail? Solicitar liberação com o suporte'}</button>
                            <span class="register-liberacao-status" style="display:block; font-size:0.8rem; margin-top:0.25rem; color:#374151;"></span>
                        </div>
                        <div class="register-liberado-hint" style="display:none; font-size:0.85rem; color:#1a7f37; background:#e6f4ea; border:1px solid #a6d8b5; border-radius:8px; padding:0.5rem 0.75rem; margin:0 0 0.75rem;">${strings.register_liberado_hint || 'E-mail liberado pelo suporte — não é necessário confirmar por código. Só falta criar sua senha.'}</div>
                        <div class="login-modal__field login-modal__field--password">
                            <label for="registerPassword">${strings.register_password || 'Senha'}</label>
                            <div class="login-modal__password-wrapper">
                                <input id="registerPassword" type="password" autocomplete="new-password" required />
                                <button type="button" class="login-modal__toggle-password" aria-label="${strings.login_show || 'Mostrar senha'}">
                                    <i class="fa fa-eye" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                        <div class="login-modal__field login-modal__field--password">
                            <label for="registerConfirm">${strings.register_confirm || 'Confirmar senha'}</label>
                            <div class="login-modal__password-wrapper">
                                <input id="registerConfirm" type="password" autocomplete="new-password" required />
                                <button type="button" class="login-modal__toggle-password" aria-label="${strings.login_show || 'Mostrar senha'}">
                                    <i class="fa fa-eye" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                        <div class="login-modal__actions login-modal__actions--row">
                            <button type="button" class="login-modal__back">${strings.register_back || 'Voltar'}</button>
                            <button type="submit" class="login-modal__submit">${strings.register_button || 'Cadastrar'}</button>
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

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closeModal();
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
        // true quando o suporte já liberou este e-mail manualmente (ver
        // /solicitar_liberacao_cadastro) — nesse caso não existe código real
        // pra digitar, o campo/reenvio ficam escondidos e isCodeVerified é
        // forçado a true direto, sem chamar /verify_confirmation_code.
        let isLiberadoFlow = false;
        const submitButton = overlay.querySelector('.login-modal__submit');

        const updateSubmitButtonState = () => {
            if (submitButton) submitButton.disabled = !isCodeVerified;
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
                nextBtn.textContent = nextBtn.dataset.originalLabel || strings.register_next || 'Avançar';
            }
        };

        const sendConfirmationCodeApi = async (email) => {
            try {
                const response = await fetch(`${API_BASE_URL}/solicitar_codigo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, lang: getCurrentLang() })
                });
                const text = await response.text();
                let payload;
                try {
                    payload = text ? JSON.parse(text) : null;
                } catch (_e) {
                    payload = text;
                }
                return { ok: response.ok && payload?.success !== false, status: response.status, payload };
            } catch (error) {
                return { ok: false, status: null, payload: { message: error.message || 'Falha de rede ou CORS na requisição' } };
            }
        };

        const verifyConfirmationCodeApi = async (email, code) => {
            const payload = await apiFetch('/verify_confirmation_code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            return { ok: true, payload };
        };

        const gatherRegisterCode = () => Array.from(overlay.querySelectorAll('.register-code-input')).map((i) => i.value.trim()).join('');

        const setCodeInputsState = (state) => {
            overlay.querySelectorAll('.register-code-input').forEach((input) => {
                input.classList.remove('register-code-valid', 'register-code-invalid');
                if (state === 'valid') input.classList.add('register-code-valid');
                if (state === 'invalid') input.classList.add('register-code-invalid');
            });
            const statusTextEl = overlay.querySelector('.register-code-status');
            if (!statusTextEl) return;
            if (state === 'valid') {
                statusTextEl.textContent = strings.register_code_valid || 'Código válido';
                statusTextEl.style.color = '#28a745';
            } else if (state === 'invalid') {
                statusTextEl.textContent = strings.register_code_invalid_try_again || 'Código inválido, verifique e tente novamente';
                statusTextEl.style.color = '#dc3545';
            } else {
                statusTextEl.textContent = '';
            }
        };

        const fillCodeInputs = (text) => {
            const digits = text.replace(/[^0-9]/g, '').slice(0, 6).split('');
            const codeInputs = overlay.querySelectorAll('.register-code-input');
            codeInputs.forEach((input, i) => { input.value = digits[i] || ''; });
            if (digits.length < codeInputs.length) codeInputs[digits.length].focus();
            else codeInputs[codeInputs.length - 1].focus();
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
                    if (value.length === 1 && index < codeInputs.length - 1) codeInputs[index + 1].focus();

                    const code = gatherRegisterCode();
                    if (/^[0-9]{6}$/.test(code) && pendingRegisterEmail) {
                        try {
                            const verify = await verifyConfirmationCodeApi(pendingRegisterEmail, code);
                            isCodeVerified = !!(verify.ok && verify.payload.success);
                            setCodeInputsState(isCodeVerified ? 'valid' : 'invalid');
                        } catch (_e) {
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
                    if (event.key === 'Backspace' && !event.target.value && index > 0) codeInputs[index - 1].focus();
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
                                setCodeInputsState(isCodeVerified ? 'valid' : 'invalid');
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
            try {
                const response = await fetch(`${API_BASE_URL}/register_user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                const text = await response.text();
                let payload;
                try {
                    payload = text ? JSON.parse(text) : null;
                } catch (_e) {
                    payload = text;
                }
                return { ok: response.ok && payload?.success !== false, status: response.status, payload };
            } catch (error) {
                return { ok: false, status: null, payload: { message: error.message || 'Falha de rede ou CORS na requisição' } };
            }
        };

        const updateResendButton = (seconds) => {
            const button = resendButton();
            if (!button) return;
            if (seconds > 0) {
                button.disabled = true;
                button.textContent = `${strings.register_resend_wait || 'Aguarde'} ${seconds}s`;
            } else {
                button.disabled = false;
                button.textContent = strings.register_resend_code || 'Reenviar código';
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

        function stopResendCountdown() {
            if (resendInterval) {
                clearInterval(resendInterval);
                resendInterval = null;
            }
            remainingSeconds = 0;
            updateResendButton(0);
        }

        const showStep = (step) => {
            if (step1) step1.classList.toggle('active', step === 1);
            if (step2) step2.classList.toggle('active', step === 2);
            if (step === 2) {
                isCodeVerified = false;
                updateSubmitButtonState();
                startResendCountdown();
                overlay.querySelector('#registerCode1')?.focus();
            } else {
                stopResendCountdown();
            }
        };

        setupCodeInputs();

        nextBtn?.addEventListener('click', async () => {
            const firstName = overlay.querySelector('#registerFirstName');
            const lastName = overlay.querySelector('#registerLastName');
            const email = overlay.querySelector('#registerEmail');
            const dob = overlay.querySelector('#registerDob');
            const phone = overlay.querySelector('#registerPhone');
            const country = overlay.querySelector('#registerCountry');
            const gender = overlay.querySelector('#registerGender');

            const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            const isValidPhone = (value) => /^[0-9]{7,15}$/.test(value.replace(/\s+/g, ''));

            if (!firstName?.value || !lastName?.value || !email?.value || !dob?.value || !phone?.value || !country?.value || !gender?.value) {
                alert(strings.register_fill_all || 'Preencha todos os campos.');
                return;
            }
            if (!isValidEmail(email.value)) {
                alert(strings.register_invalid_email || 'Email inválido.');
                return;
            }
            if (!isValidPhone(phone.value)) {
                alert(strings.register_invalid_phone || 'Telefone inválido.');
                return;
            }

            const dobDate = new Date(dob.value);
            const today = new Date();
            const minDob = new Date();
            minDob.setFullYear(today.getFullYear() - 123);
            if (Number.isNaN(dobDate.getTime()) || dobDate > today || dobDate < minDob) {
                alert(strings.register_invalid_dob || 'Data de nascimento inválida.');
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
                        ? strings.register_email_already_registered || 'Este e-mail já está cadastrado.'
                        : (payload?.message || strings.register_code_send_fail || 'Falha ao enviar o código de confirmação.');
                    alert(message);
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
                alert(strings.register_code_send_fail || 'Erro ao enviar o código de confirmação.');
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
                const nome = [
                    overlay.querySelector('#registerFirstName')?.value.trim(),
                    overlay.querySelector('#registerLastName')?.value.trim()
                ].filter(Boolean).join(' ');
                const response = await fetch(`${API_BASE_URL}/solicitar_liberacao_cadastro`, {
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

        overlay.querySelector('.register-resend-button')?.addEventListener('click', () => {
            if (!pendingRegisterEmail) {
                alert('E-mail não encontrado. Refaça o passo anterior.');
                return;
            }
            sendConfirmationCodeApi(pendingRegisterEmail)
                .then(({ ok, payload }) => {
                    if (!ok) {
                        alert(payload.message || 'Falha ao reenviar código.');
                        return;
                    }
                    alert(strings.register_code_sent || 'Código reenviado.');
                    startResendCountdown(60);
                })
                .catch(() => alert('Erro ao reenviar código. Tente novamente.'));
        });

        backBtn?.addEventListener('click', () => showStep(1));

        form?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const code = gatherRegisterCode();
            const password = overlay.querySelector('#registerPassword');
            const confirm = overlay.querySelector('#registerConfirm');

            if (!isLiberadoFlow && !/^[0-9]{6}$/.test(code)) {
                alert(strings.register_invalid_code || 'Código inválido.');
                return;
            }
            if (password && confirm && password.value !== confirm.value) {
                alert(strings.register_mismatch || 'As senhas não conferem.');
                return;
            }
            if (!pendingRegisterEmail) {
                alert('Email não confirmado. Volte ao primeiro passo.');
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
                    alert('Erro ao verificar o código. Tente novamente.');
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
                        ? strings.register_email_already_registered || 'Este e-mail já está cadastrado.'
                        : (result.payload?.message || 'Erro ao concluir cadastro.');
                    alert(message);
                    return;
                }
                alert(result.payload.message || 'Cadastro concluído com sucesso!');
                closeModal();
            } catch (err) {
                alert('Erro ao concluir cadastro. Tente novamente.');
            }
        });

        overlay.querySelector('#registerPhone')?.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });

        overlay.querySelectorAll('.login-modal__toggle-password').forEach((toggleButton) => {
            const passwordInput = toggleButton.closest('.login-modal__password-wrapper')?.querySelector('input');
            if (!passwordInput) return;
            toggleButton.addEventListener('click', () => {
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';
                toggleButton.setAttribute('aria-label', isPassword ? (strings.login_hide || 'Ocultar senha') : (strings.login_show || 'Mostrar senha'));
                const icon = toggleButton.querySelector('i');
                if (icon) icon.className = isPassword ? 'fa fa-eye-slash' : 'fa fa-eye';
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && overlay.classList.contains('open')) closeModal();
        });

        const datalist = overlay.querySelector('#countryList');
        if (datalist) {
            COUNTRY_LIST.forEach((country) => {
                const option = document.createElement('option');
                option.value = country;
                datalist.appendChild(option);
            });
        }

        document.body.appendChild(overlay);

        // Chamado pelo link do e-mail de confirmação (?auth=confirm&email=&code=):
        // abre direto no passo do código, já preenchido e verificado. Nome/
        // senha do passo 1 não vêm por aqui (nunca saem do navegador antes do
        // cadastro terminar) — só ajudam quem já preencheu o passo 1 nessa
        // mesma aba e só precisava buscar o código no e-mail.
        return {
            openForConfirm: async (emailFromLink, codeFromLink) => {
                overlay.classList.add('open');
                document.body.classList.add('modal-open');
                pendingRegisterEmail = emailFromLink;
                showStep(2);
                fillCodeInputs(codeFromLink);
                try {
                    const verify = await verifyConfirmationCodeApi(pendingRegisterEmail, codeFromLink);
                    isCodeVerified = !!(verify.ok && verify.payload.success);
                    setCodeInputsState(isCodeVerified ? 'valid' : 'invalid');
                } catch (_e) {
                    isCodeVerified = false;
                    setCodeInputsState('invalid');
                }
                updateSubmitButtonState();
            }
        };
    };

    // ─── Ligação dos gatilhos (botão LOGIN + "Cadastrar" dentro do modal) ──

    const initLoginModal = () => {
        const loginModalApi = createLoginModal();
        window.__loginModalApi = loginModalApi;
        document.querySelectorAll('[data-profile-action="login"]').forEach((trigger) => {
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const overlay = document.querySelector('.login-modal-overlay');
                if (!overlay) return;

                overlay.classList.add('open');
                document.body.classList.add('modal-open');

                const emailInput = overlay.querySelector('#loginEmail');
                const passwordInput = overlay.querySelector('#loginPassword');
                const savedEmail = localStorage.getItem('userEmail');
                if (savedEmail && emailInput) emailInput.value = savedEmail;
                if (savedEmail && passwordInput) passwordInput.focus();
                else emailInput?.focus();
            });
        });

        document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('loginEmail')?.value?.trim();
            const password = document.getElementById('loginPassword')?.value || '';

            if (!email || !password) {
                alert('Por favor, preencha email e senha.');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ username: email, password })
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok || !data.success) {
                    alert('Erro: ' + (data.message || `Falha ao conectar (status ${response.status})`));
                    return;
                }

                const role = normalizeRole(data.role || 'cliente_user');
                localStorage.setItem('userRole', role);
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userName', data.name || email);
                localStorage.setItem('userPhoto', data.foto_perfil || await getGravatarUrl(email));
                if (data.phone || data.celular) localStorage.setItem('userPhone', data.phone || data.celular);
                if (data.token) localStorage.setItem('authToken', data.token);
                if (data.role_permissions && typeof data.role_permissions === 'object') {
                    localStorage.setItem('currentRolePermissions', JSON.stringify(data.role_permissions));
                } else {
                    localStorage.removeItem('currentRolePermissions');
                }

                if (role === 'admin' || role === 'super_admin') {
                    redirectToManagementPage();
                } else {
                    document.querySelector('.login-modal-overlay')?.classList.remove('open');
                    document.body.classList.remove('modal-open');
                    window.location.reload();
                }
            } catch (error) {
                const isOnline = navigator.onLine;
                alert(isOnline
                    ? 'Sentimos muito, o servidor está temporariamente inacessível.'
                    : 'Sem conexão com a internet. Verifique sua rede e tente novamente.');
            }
        });
    };

    const initRegisterModal = () => {
        const registerModalApi = createRegisterModal();
        window.__registerModalApi = registerModalApi;
        document.querySelectorAll('[data-profile-action="register"]').forEach((trigger) => {
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                document.querySelector('.login-modal-overlay')?.classList.remove('open');
                const overlay = document.querySelector('.register-modal-overlay');
                if (!overlay) return;
                overlay.classList.add('open');
                document.body.classList.add('modal-open');
                overlay.querySelector('input')?.focus();
            });
        });
    };

    // Lê ?auth=confirm|reset&email=&code= (vem do botão do e-mail de código)
    // e já abre o modal certo com tudo preenchido. Os parâmetros somem da
    // barra de endereço logo em seguida — o código não deve ficar visível
    // no histórico do navegador depois de usado.
    const handleAuthDeepLink = () => {
        const params = new URLSearchParams(window.location.search);
        const auth = params.get('auth');
        const email = params.get('email');
        const code = params.get('code');
        if (!auth || !email || !code) return;

        if (auth === 'reset') {
            window.__loginModalApi?.openForReset(email, code);
        } else if (auth === 'confirm') {
            window.__registerModalApi?.openForConfirm(email, code);
        }

        params.delete('auth');
        params.delete('email');
        params.delete('code');
        const rest = params.toString();
        const cleanUrl = window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
    };

    document.addEventListener('DOMContentLoaded', () => {
        initProfileMenu();
        initLoginModal();
        initRegisterModal();
        handleAuthDeepLink();
    });
})();
