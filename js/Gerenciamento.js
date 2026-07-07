// version 1.0

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Em ambiente local, tenta API local primeiro e depois endpoints públicos.
// Em produção, tenta os endpoints públicos e mantém localhost como fallback de debug.
const API_ENDPOINTS = isLocalHost
  ? [
      'https://api-tour.exksvol.com',
      'https://api.exksvol.com',
      'http://127.0.0.1:5000',
      'http://localhost:5000'
    ]
  : [
      'https://api-tour.exksvol.com',
      'https://api.exksvol.com',
      'http://127.0.0.1:5000',
      'http://localhost:5000'
    ];

const fetchWithApiFallback = async (path, options = {}) => {
  let lastError = null;
  let lastResponse = null;

  for (const base of API_ENDPOINTS) {
    try {
      const response = await fetch(`${base}${path.startsWith('/') ? path : `/${path}`}`, options);
      if (response.ok) {
        return response;
      }

      lastResponse = response;
      console.warn('Endpoint respondeu com erro HTTP, tentando próximo:', {
        base,
        status: response.status,
        statusText: response.statusText,
        path
      });
    } catch (error) {
      lastError = error;
      console.warn('Falha ao conectar endpoint:', base, error);
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  const attempted = API_ENDPOINTS.join(', ');
  throw lastError || new Error(`Nenhum endpoint da API respondeu. Endpoints testados: ${attempted}`);
};

let pendingUpdateId = null; // id do agendamento que está entrando no modo editar
let currentlyEditingAccount = null; // id do usuário de acesso que está sendo editado
let selectedRoleName = null; // role atual selecionada no painel de níveis
let currentRolesConfig = {}; // guarda as permissões atuais carregadas
let currentUserPermissions = null; // permissões do usuário logado
let currentReservations = []; // lista de reservas carregadas para gerenciamento da página
let currentAccounts = []; // lista de contas carregadas para pesquisa na aba Contas
let importantInfoRefreshTimer = null;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

let lastImportantActivityTimestamp = localStorage.getItem('lastImportantActivityTimestamp') || null;

const renderAccountsTable = (accounts) => {
  const tableBody = document.getElementById('accountsBody');
  if (!tableBody) return;

  const query = (document.getElementById('accountsNameSearch')?.value || '').trim().toLowerCase();
  tableBody.innerHTML = '';

  if (!Array.isArray(accounts) || !accounts.length) {
    const emptyMessage = query
      ? `Nenhuma conta encontrada para "${escapeHtml(query)}".`
      : 'Nenhuma conta encontrada.';
    tableBody.innerHTML = `<tr><td colspan="8" style="padding:0.75rem;">${emptyMessage}</td></tr>`;
    return;
  }

  accounts.forEach((account) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td data-label="ID">${escapeHtml(account.id)}</td>
      <td data-label="E-mail">${escapeHtml(account.email)}</td>
      <td data-label="Nome">${escapeHtml(account.nome)}</td>
      <td data-label="Sobrenome">${escapeHtml(account.sobrenome)}</td>
      <td data-label="Celular">${escapeHtml(account.celular)}</td>
      <td data-label="Role">${escapeHtml(account.role)}</td>
      <td data-label="País">${escapeHtml(account.pais_origem)}</td>
      <td data-label="Gênero">${escapeHtml(account.genero)}</td>
    `;

    const canEditOthers = !!currentUserPermissions?.manageOtherEdit;
    if (!canEditOthers) {
      row.style.cursor = 'default';
    } else {
      row.style.cursor = 'pointer';
      row.addEventListener('dblclick', () => {
        openAccountModal(account);
      });
    }

    tableBody.appendChild(row);
  });
};

const applyAccountsSearchFilter = () => {
  const query = (document.getElementById('accountsNameSearch')?.value || '').trim().toLowerCase();
  const visibleAccounts = query
    ? currentAccounts.filter((account) => {
        const fullName = `${account.nome || ''} ${account.sobrenome || ''}`.toLowerCase();
        return fullName.includes(query) || (account.email || '').toLowerCase().includes(query);
      })
    : currentAccounts;

  renderAccountsTable(visibleAccounts);
};
const IMPORTANT_INFO_DISMISSED_KEY = 'importantInfoDismissedItems';

const getDismissedImportantInfoItems = () => {
  try {
    const raw = localStorage.getItem(IMPORTANT_INFO_DISMISSED_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch (_error) {
    return [];
  }
};

const setDismissedImportantInfoItems = (items) => {
  localStorage.setItem(IMPORTANT_INFO_DISMISSED_KEY, JSON.stringify(Array.isArray(items) ? items.slice(-200) : []));
};

const buildImportantInfoItemId = (item) => [
  item.timestamp || '',
  item.action || '',
  item.reservation_id || '',
  item.user_email || ''
].join('::');

const reservationActivityLabels = {
  add: 'adicionou uma reserva',
  update: 'alterou uma reserva',
  cancel: 'cancelou uma reserva'
};

const IMPORTANT_INFO_WINDOW_HOURS = 72;
const IMPORTANT_INFO_WINDOW_MS = IMPORTANT_INFO_WINDOW_HOURS * 60 * 60 * 1000;

const isImportantInfoWithinWindow = (item) => {
  const timestamp = item?.timestamp;
  if (!timestamp) return false;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return false;

  return (Date.now() - parsed.getTime()) <= IMPORTANT_INFO_WINDOW_MS;
};

const showDeviceReservationNotification = async (item) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch (err) {
      console.warn('Não foi possível solicitar permissão de notificações:', err);
      return;
    }
  }

  if (Notification.permission !== 'granted') return;

  const title = 'Nova atividade de reserva';
  const actionLabel = reservationActivityLabels[item.action] || 'atualizou uma reserva';
  const body = `${item.user_name || item.user_email || 'Cliente'} ${actionLabel} em ${item.tour || 'um tour'} (${item.date || 'data não informada'})`;
  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico'
  });
  notification.onclick = () => {
    window.focus();
  };
};


const formatReservationActivityTime = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const renderImportantInfoFeed = (items = []) => {
  const feed = document.getElementById('importantInfoFeed');
  if (!feed) return;

  const dismissedItems = new Set(getDismissedImportantInfoItems());
  const visibleItems = (Array.isArray(items) ? items : []).filter((item) => !dismissedItems.has(buildImportantInfoItemId(item)));

  const clearAllAlertsBtn = document.getElementById('clearAllAlertsBtn');
  if (!visibleItems.length) {
    if (clearAllAlertsBtn) {
      clearAllAlertsBtn.style.display = 'none';
    }
    feed.innerHTML = '<div class="important-info-empty" style="padding:0.85rem 1rem; border-radius:12px; background:rgba(255,255,255,0.82); color:#4b5563;">Nenhuma atividade recente de cliente encontrada.</div>';
    return;
  }

  if (clearAllAlertsBtn) {
    clearAllAlertsBtn.style.display = visibleItems.length > 3 ? '' : 'none';
  }

  feed.innerHTML = visibleItems.map((item) => {
    const itemId = escapeHtml(buildImportantInfoItemId(item));
    const actionLabel = reservationActivityLabels[item.action] || 'atualizou uma reserva';
    const when = formatReservationActivityTime(item.timestamp);
    const statusText = item.status ? `Status: ${item.status}` : '';
    const dateText = item.date || '-';
    const timeText = item.time || '-';
    const safeName = escapeHtml(item.user_name || item.user_email || 'Cliente');
    const safeEmail = escapeHtml(item.user_email || '-');
    const safeTour = escapeHtml(item.tour || '-');
    const safeStatus = escapeHtml(statusText);
    const safeWhen = escapeHtml(when || '');
    const safeDate = escapeHtml(dateText);
    const safeTime = escapeHtml(timeText);
    return `
      <article class="important-info-item" data-important-info-id="${itemId}" style="position:relative; padding:0.9rem 1rem; border-radius:14px; background:rgba(255,255,255,0.88); border:1px solid rgba(15,58,122,0.08); box-shadow:0 10px 30px rgba(15,58,122,0.08);">
        <button type="button" class="important-info-dismiss" data-important-info-dismiss="${itemId}" aria-label="Fechar alerta" style="position:absolute; top:0.55rem; right:0.65rem; border:none; background:transparent; color:#6b7280; font-size:1.1rem; line-height:1; cursor:pointer; padding:0.15rem 0.35rem;">×</button>
        <div style="display:flex; justify-content:space-between; gap:0.75rem; align-items:flex-start; flex-wrap:wrap; padding-right:1.5rem;">
          <strong style="color:#0f3a7a;">${safeName} ${actionLabel}</strong>
          <span style="font-size:0.82rem; color:#6b7280;">${safeWhen}</span>
        </div>
        <div style="margin-top:0.35rem; color:#1f2937; font-size:0.92rem;">Tour: <strong>${safeTour}</strong></div>
        <div style="margin-top:0.25rem; color:#374151; font-size:0.88rem;">Data: ${safeDate} | Hora: ${safeTime}</div>
        <div style="margin-top:0.25rem; color:#374151; font-size:0.88rem;">Cliente: ${safeEmail}</div>
        ${safeStatus ? `<div style="margin-top:0.25rem; color:#374151; font-size:0.88rem;">${safeStatus}</div>` : ''}
      </article>
    `;
  }).join('');

  feed.querySelectorAll('[data-important-info-dismiss]').forEach((button) => {
    button.addEventListener('click', () => {
      const itemId = button.getAttribute('data-important-info-dismiss');
      if (!itemId) return;
      const dismissed = getDismissedImportantInfoItems();
      if (!dismissed.includes(itemId)) {
        dismissed.push(itemId);
        setDismissedImportantInfoItems(dismissed);
      }
      const card = button.closest('.important-info-item');
      if (card) {
        card.remove();
      }
      if (!feed.querySelector('.important-info-item')) {
        feed.innerHTML = '<div class="important-info-empty" style="padding:0.85rem 1rem; border-radius:12px; background:rgba(255,255,255,0.82); color:#4b5563;">Nenhuma atividade recente de cliente encontrada.</div>';
      }
    });
  });
};

const loadImportantInfoFeed = async () => {
  const currentUserEmail = localStorage.getItem('userEmail') || '';
  if (!currentUserEmail) return;

  try {
    const response = await fetchWithApiFallback(`/get_reservation_activity?email=${encodeURIComponent(currentUserEmail)}&limit=12`);
    if (!response.ok) {
      renderImportantInfoFeed([]);
      return;
    }

    const result = await response.json().catch(() => ({ items: [] }));
    const items = Array.isArray(result.items) ? result.items : [];
    const recentItems = items.filter(isImportantInfoWithinWindow);
    renderImportantInfoFeed(recentItems);

    if (recentItems.length) {
      const newestTimestamp = recentItems[0].timestamp || null;
      if (newestTimestamp && newestTimestamp !== lastImportantActivityTimestamp) {
        const newItems = lastImportantActivityTimestamp
          ? recentItems.filter(item => item.timestamp && item.timestamp > lastImportantActivityTimestamp)
          : [];

        if (newItems.length) {
          newItems.slice(0, 3).forEach(showDeviceReservationNotification);
        }

        lastImportantActivityTimestamp = newestTimestamp;
        localStorage.setItem('lastImportantActivityTimestamp', newestTimestamp);
      }
    }
  } catch (error) {
    console.warn('Falha ao carregar atividades recentes de reservas:', error);
    renderImportantInfoFeed([]);
  }
};

const normalizeRoleName = (role) => {
  const normalized = String(role || 'cliente_user').toLowerCase();
  return normalized === 'user' ? 'cliente_user' : normalized;
};

const getStoredCurrentRolePermissions = () => {
  try {
    const raw = localStorage.getItem('currentRolePermissions');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const getEffectivePermissionsForRole = (roleName) => {
  const role = normalizeRoleName(roleName || localStorage.getItem('userRole') || 'cliente_user');
  const stored = getStoredCurrentRolePermissions();
  return stored || currentRolesConfig[role] || DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cliente_user;
};

const formatRoleLabel = (roleName) => {
  const role = normalizeRoleName(roleName);
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  if (role === 'cliente_user') return 'Cliente';
  return role;
};

const updateProfileMenuByPermissions = (perms) => {
  const profileDropdown = document.querySelector('.profile-dropdown');
  if (!profileDropdown) return;

  const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'Usuário';
  const userRole = localStorage.getItem('userRole') || 'cliente_user';
  const tabs = Array.isArray(perms?.tabs) ? perms.tabs : [];

  const canShowMyReservations = tabs.includes('Minhas Reservas');
  const canShowMyData = tabs.includes('Meus Dados');
  const isManagementPage = window.location.pathname.endsWith('/html/Gerenciamento.html') || window.location.pathname.endsWith('Gerenciamento.html');
  const showManagement = typeof canAccessManagement === 'function' ? canAccessManagement() : false;
  const managementAction = isManagementPage ? 'principal' : 'manage';
  const managementLabel = isManagementPage ? 'Principal' : 'Gerenciamento';
  const showPersonalMenuItems = !isManagementPage;
  const managementLink = showManagement
    ? `<a href="#" class="profile-item profile-item--admin" data-profile-action="${managementAction}">${managementLabel}</a>`
    : (isManagementPage ? '<a href="#" class="profile-item" data-profile-action="principal">Principal</a>' : '');

  profileDropdown.innerHTML = `
    <div class="profile-user-info" style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">
      <div style="font-weight:700; color:#111827;"><span data-i18n="profile_hello">Olá</span>, ${userName}</div>
      <div style="font-size:0.8rem; color:#6b7280;">Nível de acesso: ${formatRoleLabel(userRole)}</div>
    </div>
    ${managementLink}
    ${showPersonalMenuItems && canShowMyReservations ? '<a href="#" class="profile-item" data-profile-action="my-reservations" data-i18n="profile_my_reservations">Minhas Reservas</a>' : ''}
    ${showPersonalMenuItems && canShowMyData ? '<a href="#" class="profile-item" data-profile-action="my-data" data-i18n="profile_my_data">Meus Dados</a>' : ''}
    <a href="#" class="profile-item" data-profile-action="logout" data-i18n="profile_logout">Sair</a>
  `;
};

const applyAccessControls = (perms) => {
  const tabs = Array.isArray(perms?.tabs) ? perms.tabs : [];
  const pages = Array.isArray(perms?.pages) ? perms.pages : [];

  // controla visibilidade da nav principal (somente as abas permitidas)
  document.querySelectorAll('.gerenciamento-nav .nav-link').forEach(link => {
    const section = link.dataset.section;
    const map = {
      reservas: 'Reservas',
      contas: 'Contas',
      gerenciamento: 'Gerenciamento',
      financeiro: 'Financeiro'
    };

    // esconde links fora do escopo de gerenciamento (ex: Principal)
    if (!section || !map[section]) {
      link.style.display = 'none';
      return;
    }

    const tabName = map[section];
    link.style.display = tabs.includes(tabName) ? '' : 'none';
  });

  // Seções do painel
  const pageManagement = document.getElementById('pageManagementSection');
  const reservationsStats = document.getElementById('reservationsStatsSection');
  const mainSection = document.getElementById('reservationsTableSection');
  const accountsSection = document.getElementById('accountsSection');

  // Nao forca exibicao aqui para nao conflitar com mostrarSecao().
  // Apenas garante ocultacao quando a permissao nao existe.
  if (pageManagement && !pages.includes('Gerenciamento')) {
    pageManagement.style.display = 'none';
  }
  if (mainSection && !pages.includes('Principal')) {
    mainSection.style.display = 'none';
  }
  if (accountsSection && !(tabs.includes('Contas') && perms.manageContas)) {
    accountsSection.style.display = 'none';
  }
  if (reservationsStats && !(tabs.includes('Reservas') && perms.manageReservas)) {
    reservationsStats.style.display = 'none';
  }

  // Abas auxiliares (minhas reservas, meus dados, sobre, contato, ajuda)
  const submenuMap = [
    { key: 'Minhas Reservas', selector: 'a[data-profile-action="my-reservations"]' },
    { key: 'Meus Dados', selector: 'a[data-profile-action="my-data"]' },
    { key: 'SOBRE', selector: '[data-i18n="nav_about"]' },
    { key: 'CONTATO', selector: '[data-i18n="nav_contact"]' },
    { key: 'AJUDA', selector: '[data-i18n="nav_help"]' }
  ];

  submenuMap.forEach(({ key, selector }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.style.display = tabs.includes(key) ? '' : 'none';
  });

  // Permissões de recursos funcionais (manage*, etc)
  if (!perms.manageReservas) {
    document.querySelectorAll('.btn-reserve, .btn-edit-reservation, .btn-cancel-reservation').forEach(el => el?.remove?.());
  }
  if (!perms.manageContas) {
    document.querySelectorAll('.btn-edit-account, .btn-delete-account').forEach(el => el?.remove?.());
  }
  if (!perms.managePerfis) {
    // Se não pode gerenciar perfis, esconda a seção de níveis e formulários de role
    document.querySelectorAll('.role-management-panel, #rolePermissionsSection, #rolesManager').forEach(el => { if (el) el.style.display = 'none'; });
  }

  // Controle de edição
  if (!perms.manageSelfEdit) {
    document.querySelectorAll('.btn-edit-self').forEach(el => { if (el) el.style.display = 'none'; });
  }
  if (!perms.manageOtherEdit) {
    document.querySelectorAll('.btn-edit-other').forEach(el => { if (el) el.style.display = 'none'; });
  }
  if (!perms.manageConsultas) {
    document.querySelectorAll('.filtro-reservas-grid, #searchReservas').forEach(el => { if (el) el.style.display = 'none'; });
  }

  if (!perms.loadAllReservas) {
    // exibe apenas reservas do usuário se o recurso não estiver disponível
    const rows = document.querySelectorAll('#reservationsTable tbody tr');
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
      rows.forEach(row => {
        const emailCell = row.querySelector('td[data-label="Email"]');
        if (emailCell && emailCell.textContent.trim().toLowerCase() !== userEmail.toLowerCase()) {
          row.style.display = 'none';
        }
      });
    }
  }

  // Atualiza o menu de usuário para exibir apenas dados/acoes permitidas.
  updateProfileMenuByPermissions(perms);
};

const getPageTours = () => {
  try {
    const data = JSON.parse(localStorage.getItem('pageTours') || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const setPageTours = (tours) => {
  try {
    localStorage.setItem('pageTours', JSON.stringify(Array.isArray(tours) ? tours : []));
  } catch {
    // ignore
  }
};

const normalizeTourStatus = (status) => {
  const raw = String(status || 'ativo').trim().toLowerCase();
  if (raw === 'pausado') return 'Pausado';
  if (raw === 'inativo') return 'Inativo';
  return 'Ativo';
};

const mapBackendTourToPageTour = (tour) => {
  return {
    id: String(tour?.id ?? ''),
    name: tour?.nome_tour || tour?.name || '',
    languages: tour?.idiomas || tour?.languages || '',
    meeting: tour?.encontro || tour?.meeting || '',
    identification: tour?.identificacao || tour?.identification || '',
    link: tour?.link_tour || tour?.link || '',
    value: tour?.valor ?? tour?.value ?? 0,
    status: normalizeTourStatus(tour?.estado || tour?.status),
    cidade: tour?.cidade || '',
    modalidade: (tour?.modalidade || 'free').toLowerCase(),
    canal_reserva: (tour?.canal_reserva || 'web').toLowerCase(),
    imagens: Array.isArray(tour?.imagens) ? tour.imagens : [],
    pastaImagens: tour?.pasta_imagens || '',
    ordem: tour?.ordem ?? 0,
    horarios: tour?.horarios || ''
  };
};

const fetchPageToursFromBackend = async () => {
  const currentUserEmail = localStorage.getItem('userEmail');
  if (!currentUserEmail) return null;

  try {
    const response = await fetchWithApiFallback(`/get_tours_pagina?email=${encodeURIComponent(currentUserEmail)}`);
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.warn('Falha ao carregar tours_pagina do backend, usando fallback local:', response.status, detail);
      return null;
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      return null;
    }

    const mapped = payload.map(mapBackendTourToPageTour);
    setPageTours(mapped);
    return mapped;
  } catch (error) {
    console.warn('Erro ao buscar tours_pagina. Fallback local será usado.', error);
    return null;
  }
};

const fetchTourPaginaFromBackend = async (tourId) => {
  const currentUserEmail = localStorage.getItem('userEmail');
  if (!currentUserEmail || !tourId) return null;

  try {
    const response = await fetchWithApiFallback(`/get_tour_pagina/${encodeURIComponent(tourId)}?email=${encodeURIComponent(currentUserEmail)}`);
    if (!response.ok) {
      console.warn('Falha ao carregar tour da página do backend:', response.status);
      return null;
    }

    const payload = await response.json();
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    return mapBackendTourToPageTour(payload);
  } catch (error) {
    console.warn('Erro ao buscar tour da página:', error);
    return null;
  }
};

const formatTourValueBRL = (value) => {
  const numeric = Number(value);
  const safeNumber = Number.isFinite(numeric) ? numeric : 0;
  return safeNumber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

let currentlyEditingTourId = null;
let currentTourHorarios = [];

const renderTourHorarios = (horarios) => {
  const container = document.getElementById('tourModalHorarios');
  if (!container) return;

  currentTourHorarios = Array.isArray(horarios) ? [...horarios] : [];

  if (!currentTourHorarios.length) {
    container.innerHTML = '<span class="tour-horarios-empty">Nenhum horário cadastrado — a reserva não pede horário.</span>';
    return;
  }

  container.innerHTML = currentTourHorarios.map((horario) => `
    <span class="tour-horario-chip">
      ${escapeHtml(horario)}
      <button type="button" class="tour-horario-remove" data-horario="${escapeHtml(horario)}" aria-label="Remover horário ${escapeHtml(horario)}">&times;</button>
    </span>
  `).join('');

  container.querySelectorAll('.tour-horario-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      renderTourHorarios(currentTourHorarios.filter((h) => h !== btn.getAttribute('data-horario')));
    });
  });
};

const adicionarTourHorario = () => {
  const input = document.getElementById('tourModalHorarioInput');
  if (!input || !input.value) return;
  const novos = new Set(currentTourHorarios);
  novos.add(input.value);
  renderTourHorarios(Array.from(novos).sort());
  input.value = '';
};

const parseTourLanguages = (value) => {
  if (!value) return [];
  return value
    .split(/[,;]+/) 
    .map(part => part.trim())
    .filter(Boolean);
};

const setTourModalLanguages = (value) => {
  // Usa correspondência por substring (case/acento-insensível ao "e" de ligação)
  // em vez de comparar a lista dividida por vírgula, porque tours reais salvam
  // idiomas em formatos como "Português, Inglês e Espanhol" — um split por vírgula
  // deixaria "Inglês e Espanhol" como um item só, nunca batendo com "Espanhol".
  const raw = String(value || '');
  document.getElementById('tourModalLanguagePt').checked = /portugu[eê]s/i.test(raw);
  document.getElementById('tourModalLanguageEn').checked = /ingl[eê]s/i.test(raw);
  document.getElementById('tourModalLanguageEs').checked = /espanhol/i.test(raw);
};

const getTourModalLanguages = () => {
  return ['tourModalLanguagePt', 'tourModalLanguageEn', 'tourModalLanguageEs']
    .map(id => document.getElementById(id))
    .filter(el => el && el.checked)
    .map(el => el.value)
    .join(', ');
};

// Descobre, direto no navegador, as fotos já publicadas na página pública do
// tour. Essas imagens vivem em imagem/<cidade>/<pasta>/img{N}.<ext> — o mesmo
// diretório estático servido pelo site, sem depender do backend para "ver" o
// que já existe: o carregamento é feito aqui via tentativa sequencial de
// img1, img2, ... (testando as extensões permitidas em cada número) até a
// primeira falha, ou um limite de segurança.
const MAX_LEGACY_TOUR_IMAGES = 30;
const TOUR_IMAGE_EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png', 'gif'];

const probeSingleTourImage = (base, indice) => {
  return new Promise((resolve) => {
    let tentativa = 0;
    const tentarExtensao = () => {
      if (tentativa >= TOUR_IMAGE_EXTENSIONS.length) {
        resolve(null);
        return;
      }
      const url = `${base}img${indice}.${TOUR_IMAGE_EXTENSIONS[tentativa]}`;
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => {
        tentativa += 1;
        tentarExtensao();
      };
      img.src = url;
    };
    tentarExtensao();
  });
};

const probeTourFolderImages = async (cidade, pasta) => {
  if (!cidade || !pasta) return [];
  // Absoluta porque quem serve esses arquivos é o VPS (nginx), não o host onde
  // este painel está aberto (pode ser local ou GitHub Pages).
  const base = `${API_ENDPOINTS[0]}/imagem/${cidade}/${pasta}/`;
  const encontradas = [];

  for (let indice = 1; indice <= MAX_LEGACY_TOUR_IMAGES; indice += 1) {
    const url = await probeSingleTourImage(base, indice);
    if (!url) break;
    encontradas.push(url);
  }

  return encontradas;
};

const renderTourImagePreview = (files) => {
  const container = document.getElementById('tourModalImagePreview');
  if (!container) return;

  const lista = Array.isArray(files) ? files : [];
  if (!lista.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = lista.map((file) => `
    <div class="tour-gallery-item tour-gallery-item-pending">
      <img src="${URL.createObjectURL(file)}" alt="Prévia da imagem selecionada" />
    </div>
  `).join('');
};

const renderTourGallery = (imagens) => {
  const gallery = document.getElementById('tourModalGallery');
  if (!gallery) return;

  const urls = Array.isArray(imagens) ? imagens : [];
  if (!urls.length) {
    gallery.innerHTML = '<span class="tour-gallery-empty">Nenhuma imagem enviada.</span>';
    return;
  }

  gallery.innerHTML = urls.map((url, idx) => `
    <div class="tour-gallery-item">
      <img src="${url}" alt="Imagem do tour" loading="lazy" />
      <button type="button" class="tour-gallery-remove" data-image-url="${url}" aria-label="Remover imagem">&times;</button>
      <button type="button" class="tour-gallery-move tour-gallery-move-left" data-image-url="${url}" data-move-dir="-1" ${idx === 0 ? 'disabled' : ''} aria-label="Mover imagem para a esquerda">&lsaquo;</button>
      <button type="button" class="tour-gallery-move tour-gallery-move-right" data-image-url="${url}" data-move-dir="1" ${idx === urls.length - 1 ? 'disabled' : ''} aria-label="Mover imagem para a direita">&rsaquo;</button>
    </div>
  `).join('');

  gallery.querySelectorAll('.tour-gallery-remove').forEach(btn => {
    btn.addEventListener('click', () => deleteTourImage(btn.getAttribute('data-image-url')));
  });

  gallery.querySelectorAll('.tour-gallery-move').forEach(btn => {
    btn.addEventListener('click', () => moveTourImage(urls, btn.getAttribute('data-image-url'), Number(btn.getAttribute('data-move-dir'))));
  });
};

// ─── Upload/exclusão/reordenação de fotos do tour (via backend) ─────────────
// O clique em Enviar manda o arquivo para o Flask, que grava DIRETO na pasta
// real imagem/<cidade>/<pasta>/ como img1.ext, img2.ext... — sem nenhum popup
// de seleção de pasta. Excluir e reordenar também são operações de arquivo no
// servidor. A galeria é atualizada com a lista de imagens que o backend
// devolve após cada operação.

const reorderTourImages = async (novaOrdemUrls) => {
  const id = currentlyEditingTourId;
  if (!id) return;

  const adminEmail = localStorage.getItem('userEmail') || '';
  const ordemArquivos = novaOrdemUrls.map(url => url.split('/').pop());

  try {
    const response = await fetchWithApiFallback('/reorder_tour_imagens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: adminEmail, tour_id: id, ordem: ordemArquivos })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(`Falha ao reordenar imagens: ${result.message || response.statusText}`);
      return;
    }
    renderTourGallery(result.imagens);
    carregarToursGerenciamento();
  } catch (error) {
    console.error('Erro ao reordenar imagens do tour:', error);
    alert('Erro ao reordenar imagens. Verifique sua conexão e tente novamente.');
  }
};

const moveTourImage = (urls, url, direction) => {
  const index = urls.indexOf(url);
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= urls.length) return;

  const reordered = [...urls];
  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
  reorderTourImages(reordered);
};

const uploadTourImages = async () => {
  const input = document.getElementById('tourModalImageInput');
  const id = currentlyEditingTourId;
  if (!input || !input.files || !input.files.length || !id) return;

  const adminEmail = localStorage.getItem('userEmail') || '';
  const files = Array.from(input.files);

  try {
    let lastImagens = null;
    for (const file of files) {
      const formData = new FormData();
      formData.append('admin_email', adminEmail);
      formData.append('tour_id', id);
      formData.append('imagem', file);

      const response = await fetchWithApiFallback('/upload_tour_imagem', {
        method: 'POST',
        body: formData
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        alert(`Falha ao enviar imagem "${file.name}": ${result.message || response.statusText}`);
        continue;
      }
      lastImagens = result.imagens;
    }

    input.value = '';
    renderTourImagePreview([]);
    if (lastImagens) {
      renderTourGallery(lastImagens);
      carregarToursGerenciamento();
    }
  } catch (error) {
    console.error('Erro ao enviar imagens do tour:', error);
    alert('Erro ao enviar imagens. Verifique sua conexão e tente novamente.');
  }
};

const deleteTourImage = async (arquivoUrl) => {
  const id = currentlyEditingTourId;
  if (!id || !arquivoUrl) return;
  if (!confirm('Remover esta imagem do tour?')) return;

  const arquivo = arquivoUrl.split('/').pop();
  const adminEmail = localStorage.getItem('userEmail') || '';

  try {
    const response = await fetchWithApiFallback('/delete_tour_imagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: adminEmail, tour_id: id, arquivo })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(`Falha ao remover imagem: ${result.message || response.statusText}`);
      return;
    }

    renderTourGallery(result.imagens);
    carregarToursGerenciamento();
  } catch (error) {
    console.error('Erro ao remover imagem do tour:', error);
    alert('Erro ao remover imagem. Verifique sua conexão e tente novamente.');
  }
};

const TOUR_COMMENT_STATUS_LABEL = {
  pendente: 'Em análise',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado'
};

const renderTourComments = (comentarios) => {
  const container = document.getElementById('tourModalComments');
  if (!container) return;

  const lista = Array.isArray(comentarios) ? comentarios : [];
  if (!lista.length) {
    container.innerHTML = '<p>Nenhum comentário ainda.</p>';
    return;
  }

  container.innerHTML = lista.map(c => {
    const status = c.status || 'pendente';
    const fotosHtml = Array.isArray(c.fotos) && c.fotos.length
      ? `<div class="tour-comment-admin-fotos">${c.fotos.map(url => `<img src="${url}" alt="Foto da avaliação" loading="lazy" />`).join('')}</div>`
      : '';
    return `
    <div class="tour-comment-admin-item tour-comment-admin-status-${status}" data-comment-id="${c.id}">
      <div class="tour-comment-admin-header">
        <strong>${c.usuario_nome || 'Usuário'}</strong>
        ${c.nota ? `<span class="tour-comment-admin-stars">${'★'.repeat(c.nota)}${'☆'.repeat(5 - c.nota)}</span>` : ''}
        <span class="tour-comment-admin-badge">${TOUR_COMMENT_STATUS_LABEL[status] || status}</span>
        <button type="button" class="tour-comment-admin-delete" data-comment-id="${c.id}" aria-label="Excluir comentário">&times;</button>
      </div>
      <p>${c.comentario || ''}</p>
      ${fotosHtml}
      <div class="tour-comment-admin-actions">
        ${status !== 'aprovado' ? `<button type="button" class="btn-book tour-comment-admin-approve" data-comment-id="${c.id}">Aprovar</button>` : ''}
        ${status !== 'rejeitado' ? `<button type="button" class="btn-book tour-comment-admin-reject" data-comment-id="${c.id}">Rejeitar</button>` : ''}
      </div>
    </div>
  `;
  }).join('');

  container.querySelectorAll('.tour-comment-admin-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteTourComentario(btn.getAttribute('data-comment-id')));
  });
  container.querySelectorAll('.tour-comment-admin-approve').forEach(btn => {
    btn.addEventListener('click', () => moderarTourComentario(btn.getAttribute('data-comment-id'), 'aprovar'));
  });
  container.querySelectorAll('.tour-comment-admin-reject').forEach(btn => {
    btn.addEventListener('click', () => moderarTourComentario(btn.getAttribute('data-comment-id'), 'rejeitar'));
  });
};

const loadTourComments = async (tourId) => {
  const container = document.getElementById('tourModalComments');
  if (!container || !tourId) return;
  container.innerHTML = '<p>Carregando comentários...</p>';

  const adminEmail = localStorage.getItem('userEmail') || '';

  try {
    const response = await fetchWithApiFallback(`/get_tour_comentarios/${tourId}?admin_email=${encodeURIComponent(adminEmail)}`, { method: 'GET' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      container.innerHTML = '<p>Não foi possível carregar os comentários.</p>';
      return;
    }
    renderTourComments(result.comentarios);
  } catch (error) {
    console.error('Erro ao carregar comentários do tour:', error);
    container.innerHTML = '<p>Não foi possível carregar os comentários.</p>';
  }
};

const moderarTourComentario = async (comentarioId, acao) => {
  if (!comentarioId) return;
  const adminEmail = localStorage.getItem('userEmail') || '';

  try {
    const response = await fetchWithApiFallback('/moderar_tour_comentario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: adminEmail, comentario_id: comentarioId, acao })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(`Falha ao moderar comentário: ${result.message || response.statusText}`);
      return;
    }
    loadTourComments(currentlyEditingTourId);
  } catch (error) {
    console.error('Erro ao moderar comentário do tour:', error);
    alert('Erro ao moderar comentário. Verifique sua conexão e tente novamente.');
  }
};

const deleteTourComentario = async (comentarioId) => {
  if (!comentarioId || !confirm('Excluir este comentário?')) return;

  const adminEmail = localStorage.getItem('userEmail') || '';

  try {
    const response = await fetchWithApiFallback('/delete_tour_comentario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: adminEmail, comentario_id: comentarioId })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(`Falha ao excluir comentário: ${result.message || response.statusText}`);
      return;
    }
    loadTourComments(currentlyEditingTourId);
  } catch (error) {
    console.error('Erro ao excluir comentário do tour:', error);
    alert('Erro ao excluir comentário. Verifique sua conexão e tente novamente.');
  }
};

// ─── Controle financeiro (aba Financeiro) ────────────────────────────────

const formatBRL = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDataBR = (iso) => {
  if (!iso) return '--';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

const getFinanceMonth = () => {
  const input = document.getElementById('financeMonth');
  if (input && input.value) return input.value;
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
};

const getFinanceCity = () => document.getElementById('financeCityFilter')?.value || '';

const FINANCE_CITY_LABELS = {
  'Rio de Janeiro': 'Rio de Janeiro',
  'Lencois': 'Lençóis Maranhenses',
  'Sao Luis': 'São Luís do Maranhão',
  'Salvador': 'Salvador'
};
const formatFinanceCidade = (cidade) => FINANCE_CITY_LABELS[cidade] || cidade || '-';

const setFinanceDateDefaults = () => {
  const mes = getFinanceMonth();
  const hoje = new Date();
  const hojeMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const dia = mes === hojeMes ? String(hoje.getDate()).padStart(2, '0') : '01';
  ['financeEntradaData', 'financeRetiradaData', 'financeDespesaData'].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = `${mes}-${dia}`;
  });
};

const carregarFinanceiro = async () => {
  const email = localStorage.getItem('userEmail') || '';
  const mes = getFinanceMonth();
  const cidade = getFinanceCity();
  const monthInput = document.getElementById('financeMonth');
  if (monthInput && !monthInput.value) monthInput.value = mes;
  setFinanceDateDefaults();

  const corpos = {
    entrada: document.getElementById('financeEntradasBody'),
    retirada: document.getElementById('financeRetiradasBody'),
    despesa: document.getElementById('financeDespesasBody')
  };
  if (!corpos.entrada) return;

  Object.values(corpos).forEach((tbody) => {
    tbody.innerHTML = '<tr><td colspan="6" style="padding:0.75rem;">Carregando...</td></tr>';
  });

  try {
    const response = await fetchWithApiFallback(`/get_financeiro?email=${encodeURIComponent(email)}&mes=${encodeURIComponent(mes)}&cidade=${encodeURIComponent(cidade)}`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      const msg = escapeHtml(result.message || 'Erro ao carregar o financeiro.');
      Object.values(corpos).forEach((tbody) => {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:0.75rem;">${msg}</td></tr>`;
      });
      return;
    }
    renderFinanceiro(result);
  } catch (error) {
    console.error('Erro ao carregar financeiro:', error);
    Object.values(corpos).forEach((tbody) => {
      tbody.innerHTML = '<tr><td colspan="6" style="padding:0.75rem;">Erro de conexão ao carregar o financeiro.</td></tr>';
    });
  }
};

const renderFinanceiro = (dados) => {
  const labelEl = document.getElementById('financeCityLabel');
  if (labelEl) {
    labelEl.textContent = (dados.cidade && dados.cidade !== 'geral')
      ? `Exibindo: ${formatFinanceCidade(dados.cidade)}`
      : 'Exibindo: Geral (todas as cidades)';
  }

  const totais = dados.totais || {};
  const setText = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatBRL(valor);
  };
  setText('financeTotalEntradas', totais.entradas);
  setText('financeTotalRetiradas', totais.retiradas);
  setText('financeTotalDespesas', totais.despesas);
  setText('financeSaldo', totais.saldo);

  const saldoEl = document.getElementById('financeSaldo');
  if (saldoEl) saldoEl.style.color = (totais.saldo ?? 0) >= 0 ? '#15803d' : '#b91c1c';

  const lancamentos = Array.isArray(dados.lancamentos) ? dados.lancamentos : [];

  const renderAcoes = (l) => {
    const btnEditar = `<button type="button" class="finance-action-btn finance-edit" data-id="${l.id}" title="Editar">✎</button>`;
    // Lançamentos automáticos (tour finalizado, despesa fixa) não podem ser
    // excluídos: a sincronização os recriaria no próximo carregamento. O
    // valor/descrição seguem editáveis; despesa fixa é gerida na própria lista.
    const btnExcluir = (l.origem === 'auto_tour' || l.origem === 'fixa')
      ? ''
      : `<button type="button" class="finance-action-btn finance-delete" data-id="${l.id}" data-parcelado="${l.parcela_total ? '1' : ''}" title="Excluir">🗑</button>`;
    return `${btnEditar}${btnExcluir}`;
  };

  const preencher = (tbody, linhas, colunas, vazio) => {
    if (!tbody) return;
    tbody.innerHTML = linhas.length
      ? linhas.join('')
      : `<tr><td colspan="${colunas}" style="padding:0.75rem;">${vazio}</td></tr>`;
  };

  preencher(
    document.getElementById('financeEntradasBody'),
    lancamentos.filter((l) => l.tipo === 'entrada').map((l) => `
      <tr data-lancamento-id="${l.id}">
        <td data-label="Data">${formatDataBR(l.data)}</td>
        <td data-label="Descrição" class="finance-cell-desc">${escapeHtml(l.descricao)}</td>
        <td data-label="Origem">${l.origem === 'auto_tour' ? '<span class="finance-badge-auto">Auto</span>' : 'Manual'}</td>
        <td data-label="Cidade">${escapeHtml(formatFinanceCidade(l.cidade))}</td>
        <td data-label="Valor" class="finance-cell-valor">${formatBRL(l.valor)}</td>
        <td data-label="Ações">${renderAcoes(l)}</td>
      </tr>
    `),
    6,
    'Nenhuma entrada neste mês.'
  );

  preencher(
    document.getElementById('financeRetiradasBody'),
    lancamentos.filter((l) => l.tipo === 'retirada').map((l) => `
      <tr data-lancamento-id="${l.id}">
        <td data-label="Data">${formatDataBR(l.data)}</td>
        <td data-label="Descrição" class="finance-cell-desc">${escapeHtml(l.descricao)}</td>
        <td data-label="Cidade">${escapeHtml(formatFinanceCidade(l.cidade))}</td>
        <td data-label="Valor" class="finance-cell-valor">${formatBRL(l.valor)}</td>
        <td data-label="Ações">${renderAcoes(l)}</td>
      </tr>
    `),
    5,
    'Nenhuma retirada neste mês.'
  );

  preencher(
    document.getElementById('financeDespesasBody'),
    lancamentos.filter((l) => l.tipo === 'despesa').map((l) => `
      <tr data-lancamento-id="${l.id}">
        <td data-label="Data">${formatDataBR(l.data)}</td>
        <td data-label="Descrição" class="finance-cell-desc">${escapeHtml(l.descricao)}</td>
        <td data-label="Parcela">${l.origem === 'fixa' ? '<span class="finance-badge-fixa">Fixa</span>' : (l.parcela_total ? `${l.parcela_num}/${l.parcela_total}` : 'Única')}</td>
        <td data-label="Cidade">${escapeHtml(formatFinanceCidade(l.cidade))}</td>
        <td data-label="Valor" class="finance-cell-valor">${formatBRL(l.valor)}</td>
        <td data-label="Ações">${renderAcoes(l)}</td>
      </tr>
    `),
    6,
    'Nenhuma despesa neste mês.'
  );

  const fixas = Array.isArray(dados.despesas_fixas) ? dados.despesas_fixas : [];
  preencher(
    document.getElementById('financeDespesasFixasBody'),
    fixas.map((f) => `
      <tr data-fixa-id="${f.id}">
        <td data-label="Descrição" class="finance-cell-desc">${escapeHtml(f.descricao)}</td>
        <td data-label="Valor mensal" class="finance-cell-valor">${formatBRL(f.valor)}</td>
        <td data-label="Dia">${f.dia_lancamento}</td>
        <td data-label="Cidade">${escapeHtml(formatFinanceCidade(f.cidade))}</td>
        <td data-label="Início">${formatDataBR(f.data_inicio)}</td>
        <td data-label="Situação">${f.data_fim ? `Encerrada em ${formatDataBR(f.data_fim)}` : '<span class="finance-badge-auto">Ativa</span>'}</td>
        <td data-label="Ações">
          <button type="button" class="finance-action-btn finance-fixa-edit" data-id="${f.id}" title="Editar">✎</button>
          ${f.data_fim ? '' : `<button type="button" class="finance-action-btn finance-fixa-encerrar" data-id="${f.id}" title="Encerrar (para de lançar nos próximos meses)">⏸</button>`}
          <button type="button" class="finance-action-btn finance-delete finance-fixa-delete" data-id="${f.id}" title="Excluir (remove também os lançamentos gerados)">🗑</button>
        </td>
      </tr>
    `),
    7,
    'Nenhuma despesa fixa cadastrada.'
  );

  // Guarda os dados carregados para edição inline
  window.lastFinanceLancamentos = lancamentos;
  window.lastFinanceDespesasFixas = fixas;

  document.querySelectorAll('.finance-edit').forEach((btn) => {
    btn.addEventListener('click', () => editarLancamentoFinanceiro(Number(btn.dataset.id)));
  });
  document.querySelectorAll('.finance-delete:not(.finance-fixa-delete)').forEach((btn) => {
    btn.addEventListener('click', () => excluirLancamentoFinanceiro(Number(btn.dataset.id), btn.dataset.parcelado === '1'));
  });
  document.querySelectorAll('.finance-fixa-edit').forEach((btn) => {
    btn.addEventListener('click', () => editarDespesaFixa(Number(btn.dataset.id)));
  });
  document.querySelectorAll('.finance-fixa-encerrar').forEach((btn) => {
    btn.addEventListener('click', () => encerrarDespesaFixa(Number(btn.dataset.id)));
  });
  document.querySelectorAll('.finance-fixa-delete').forEach((btn) => {
    btn.addEventListener('click', () => excluirDespesaFixa(Number(btn.dataset.id)));
  });
};

const editarDespesaFixa = async (id) => {
  const fixa = (window.lastFinanceDespesasFixas || []).find((f) => f.id === id);
  if (!fixa) return;

  const novaDescricao = prompt('Descrição:', fixa.descricao);
  if (novaDescricao === null) return;

  const novoValorRaw = prompt('Valor mensal (R$):', String(fixa.valor).replace('.', ','));
  if (novoValorRaw === null) return;
  const novoValor = Number(String(novoValorRaw).replace(',', '.'));
  if (!novoValor || novoValor <= 0) {
    alert('Valor inválido.');
    return;
  }

  const novoDiaRaw = prompt('Dia do mês para o lançamento (1 a 31):', String(fixa.dia_lancamento));
  if (novoDiaRaw === null) return;
  const novoDia = Math.max(1, Math.min(Number(novoDiaRaw) || 1, 31));

  const cidadesValidas = Object.keys(FINANCE_CITY_LABELS);
  let novaCidade = fixa.cidade;
  const cidadeRaw = prompt(`Cidade (${cidadesValidas.join(' / ')}):`, fixa.cidade || '');
  if (cidadeRaw === null) return;
  if (cidadeRaw.trim() && cidadesValidas.includes(cidadeRaw.trim())) {
    novaCidade = cidadeRaw.trim();
  }

  const adminEmail = localStorage.getItem('userEmail') || '';
  try {
    const response = await fetchWithApiFallback('/update_despesa_fixa', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: adminEmail, id, descricao: novaDescricao.trim(), valor: novoValor, dia: novoDia, cidade: novaCidade })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(`Falha ao atualizar despesa fixa: ${result.message || response.statusText}`);
      return;
    }
    carregarFinanceiro();
  } catch (error) {
    console.error('Erro ao atualizar despesa fixa:', error);
    alert('Erro de conexão ao atualizar a despesa fixa.');
  }
};

const encerrarDespesaFixa = async (id) => {
  if (!confirm('Encerrar esta despesa fixa? Ela deixa de ser lançada nos próximos meses (os meses já lançados são mantidos).')) return;

  const adminEmail = localStorage.getItem('userEmail') || '';
  try {
    const response = await fetchWithApiFallback('/update_despesa_fixa', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: adminEmail, id, encerrar: true })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(`Falha ao encerrar despesa fixa: ${result.message || response.statusText}`);
      return;
    }
    carregarFinanceiro();
  } catch (error) {
    console.error('Erro ao encerrar despesa fixa:', error);
    alert('Erro de conexão ao encerrar a despesa fixa.');
  }
};

const excluirDespesaFixa = async (id) => {
  if (!confirm('Excluir esta despesa fixa? Todos os lançamentos gerados por ela (inclusive de meses anteriores) também serão removidos.\n\nPara apenas parar de lançar daqui em diante, use Encerrar (⏸).')) return;

  const adminEmail = localStorage.getItem('userEmail') || '';
  try {
    const response = await fetchWithApiFallback('/delete_despesa_fixa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: adminEmail, id })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(`Falha ao excluir despesa fixa: ${result.message || response.statusText}`);
      return;
    }
    carregarFinanceiro();
  } catch (error) {
    console.error('Erro ao excluir despesa fixa:', error);
    alert('Erro de conexão ao excluir a despesa fixa.');
  }
};

const adicionarDespesaFixa = async () => {
  const descricao = document.getElementById('financeDespesaFixaDesc')?.value?.trim();
  const valor = Number(document.getElementById('financeDespesaFixaValor')?.value);
  const dia = Math.max(1, Math.min(Number(document.getElementById('financeDespesaFixaDia')?.value) || 1, 31));
  const cidade = getFinanceCity();

  if (!descricao || !valor || valor <= 0) {
    alert('Preencha descrição e valor.');
    return;
  }
  if (!cidade) {
    alert('Selecione uma cidade específica no filtro do topo (não é possível lançar em "Geral").');
    return;
  }

  const adminEmail = localStorage.getItem('userEmail') || '';
  try {
    const response = await fetchWithApiFallback('/add_despesa_fixa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_email: adminEmail,
        descricao,
        valor,
        dia,
        cidade,
        mes_inicio: getFinanceMonth()
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(`Falha ao adicionar despesa fixa: ${result.message || response.statusText}`);
      return;
    }

    document.getElementById('financeDespesaFixaDesc').value = '';
    document.getElementById('financeDespesaFixaValor').value = '';
    carregarFinanceiro();
  } catch (error) {
    console.error('Erro ao adicionar despesa fixa:', error);
    alert('Erro de conexão ao adicionar a despesa fixa.');
  }
};

const editarLancamentoFinanceiro = async (id) => {
  const lancamento = (window.lastFinanceLancamentos || []).find((l) => l.id === id);
  if (!lancamento) return;

  const novaDescricao = prompt('Descrição:', lancamento.descricao);
  if (novaDescricao === null) return;

  const novoValorRaw = prompt('Valor (R$):', String(lancamento.valor).replace('.', ','));
  if (novoValorRaw === null) return;
  const novoValor = Number(String(novoValorRaw).replace(',', '.'));
  if (!novoValor || novoValor <= 0) {
    alert('Valor inválido.');
    return;
  }

  const cidadesValidas = Object.keys(FINANCE_CITY_LABELS);
  let novaCidade = lancamento.cidade;
  const cidadeRaw = prompt(`Cidade (${cidadesValidas.join(' / ')}):`, lancamento.cidade || '');
  if (cidadeRaw === null) return;
  if (cidadeRaw.trim() && cidadesValidas.includes(cidadeRaw.trim())) {
    novaCidade = cidadeRaw.trim();
  }

  const adminEmail = localStorage.getItem('userEmail') || '';
  try {
    const response = await fetchWithApiFallback('/update_financeiro_lancamento', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: adminEmail, id, descricao: novaDescricao.trim(), valor: novoValor, cidade: novaCidade })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(`Falha ao atualizar lançamento: ${result.message || response.statusText}`);
      return;
    }
    carregarFinanceiro();
  } catch (error) {
    console.error('Erro ao atualizar lançamento financeiro:', error);
    alert('Erro de conexão ao atualizar o lançamento.');
  }
};

const excluirLancamentoFinanceiro = async (id, parcelado) => {
  if (!confirm('Excluir este lançamento?')) return;
  const excluirGrupo = parcelado
    ? confirm('Esta despesa é parcelada. Excluir também as parcelas dos meses seguintes?\n\nOK = esta e as futuras · Cancelar = somente esta')
    : false;

  const adminEmail = localStorage.getItem('userEmail') || '';
  try {
    const response = await fetchWithApiFallback('/delete_financeiro_lancamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: adminEmail, id, excluir_grupo: excluirGrupo })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(`Falha ao excluir lançamento: ${result.message || response.statusText}`);
      return;
    }
    carregarFinanceiro();
  } catch (error) {
    console.error('Erro ao excluir lançamento financeiro:', error);
    alert('Erro de conexão ao excluir o lançamento.');
  }
};

const adicionarLancamentoFinanceiro = async (tipo, campos) => {
  const descricao = document.getElementById(campos.desc)?.value?.trim();
  const valor = Number(document.getElementById(campos.valor)?.value);
  const dataLancamento = document.getElementById(campos.data)?.value;
  const cidade = getFinanceCity();
  const parcelas = campos.parcelas ? Number(document.getElementById(campos.parcelas)?.value) || 1 : 1;

  if (!descricao || !valor || valor <= 0 || !dataLancamento) {
    alert('Preencha descrição, valor e data.');
    return;
  }
  if (!cidade) {
    alert('Selecione uma cidade específica no filtro do topo (não é possível lançar em "Geral").');
    return;
  }

  const adminEmail = localStorage.getItem('userEmail') || '';
  try {
    const response = await fetchWithApiFallback('/add_financeiro_lancamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_email: adminEmail,
        tipo,
        descricao,
        valor,
        data: dataLancamento,
        cidade,
        parcelas
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(`Falha ao adicionar lançamento: ${result.message || response.statusText}`);
      return;
    }

    document.getElementById(campos.desc).value = '';
    document.getElementById(campos.valor).value = '';
    if (campos.parcelas) document.getElementById(campos.parcelas).value = '1';
    carregarFinanceiro();
  } catch (error) {
    console.error('Erro ao adicionar lançamento financeiro:', error);
    alert('Erro de conexão ao adicionar o lançamento.');
  }
};

const shiftFinanceMonth = (delta) => {
  const input = document.getElementById('financeMonth');
  if (!input) return;
  const [ano, mes] = getFinanceMonth().split('-').map(Number);
  const novaData = new Date(ano, mes - 1 + delta, 1);
  input.value = `${novaData.getFullYear()}-${String(novaData.getMonth() + 1).padStart(2, '0')}`;
  carregarFinanceiro();
};

const initFinanceControls = () => {
  const monthInput = document.getElementById('financeMonth');
  if (!monthInput) return;

  if (!monthInput.value) monthInput.value = getFinanceMonth();
  monthInput.addEventListener('change', carregarFinanceiro);

  document.getElementById('financePrevMonth')?.addEventListener('click', () => shiftFinanceMonth(-1));
  document.getElementById('financeNextMonth')?.addEventListener('click', () => shiftFinanceMonth(1));
  document.getElementById('financeReload')?.addEventListener('click', carregarFinanceiro);
  document.getElementById('financeCityFilter')?.addEventListener('change', carregarFinanceiro);

  document.getElementById('financeFormEntrada')?.addEventListener('submit', (event) => {
    event.preventDefault();
    adicionarLancamentoFinanceiro('entrada', { desc: 'financeEntradaDesc', valor: 'financeEntradaValor', data: 'financeEntradaData' });
  });
  document.getElementById('financeFormRetirada')?.addEventListener('submit', (event) => {
    event.preventDefault();
    adicionarLancamentoFinanceiro('retirada', { desc: 'financeRetiradaDesc', valor: 'financeRetiradaValor', data: 'financeRetiradaData' });
  });
  document.getElementById('financeFormDespesa')?.addEventListener('submit', (event) => {
    event.preventDefault();
    adicionarLancamentoFinanceiro('despesa', { desc: 'financeDespesaDesc', valor: 'financeDespesaValor', data: 'financeDespesaData', parcelas: 'financeDespesaParcelas' });
  });
  document.getElementById('financeFormDespesaFixa')?.addEventListener('submit', (event) => {
    event.preventDefault();
    adicionarDespesaFixa();
  });
};

const openTourEditModal = (tourData) => {
  const modal = document.getElementById('tourEditModal');
  if (!modal) return;

  currentlyEditingTourId = tourData.id;

  document.getElementById('tourModalId').textContent = tourData.id || '--';
  document.getElementById('tourModalName').value = tourData.name || '';
  document.getElementById('tourModalCidade').value = tourData.cidade || '';
  document.getElementById('tourModalPastaImagens').value = tourData.pastaImagens || tourData.pasta_imagens || '';
  setTourModalLanguages(tourData.languages || tourData.idiomas || '');
  document.getElementById('tourModalMeeting').value = tourData.meeting || tourData.encontro || '';
  document.getElementById('tourModalIdentification').value = tourData.identification || tourData.identificacao || '';
  document.getElementById('tourModalLink').value = tourData.link || tourData.link_tour || '';
  document.getElementById('tourModalValue').value = tourData.value != null ? tourData.value : tourData.valor != null ? tourData.valor : '';
  document.getElementById('tourModalStatus').value = tourData.status || tourData.estado || 'Ativo';
  document.getElementById('tourModalModalidade').value = (tourData.modalidade || 'free').toLowerCase();
  document.getElementById('tourModalCanalReserva').value = (tourData.canal_reserva || tourData.canalReserva || 'web').toLowerCase();

  renderTourImagePreview([]);
  renderTourGallery(Array.isArray(tourData.imagens) ? tourData.imagens : []);

  const horariosBrutos = tourData.horarios || '';
  renderTourHorarios(horariosBrutos ? horariosBrutos.split(',').map((h) => h.trim()).filter(Boolean).sort() : []);
  loadTourComments(tourData.id);

  const pauseButton = document.getElementById('tourModalPause');
  if (pauseButton) {
    pauseButton.textContent = (tourData.status || tourData.estado || 'Ativo') === 'Pausado' ? 'Retomar' : 'Pausar';
  }

  modal.classList.remove('hidden');
};

const closeTourEditModal = () => {
  const modal = document.getElementById('tourEditModal');
  if (!modal) return;
  modal.classList.add('hidden');
  currentlyEditingTourId = null;
};

const toggleTourPauseFromModal = () => {
  if (!currentlyEditingTourId) return;
  const tours = getPageTours();
  const updatedTours = tours.map(t => {
    if (String(t.id) !== String(currentlyEditingTourId)) return t;
    const nextStatus = ((t.status || 'Ativo').toLowerCase() === 'pausado') ? 'Ativo' : 'Pausado';
    return { ...t, status: nextStatus };
  });
  setPageTours(updatedTours);
  const updatedTour = updatedTours.find(t => String(t.id) === String(currentlyEditingTourId));
  const statusSelect = document.getElementById('tourModalStatus');
  const pauseButton = document.getElementById('tourModalPause');
  if (statusSelect && updatedTour) statusSelect.value = updatedTour.status || 'Ativo';
  if (pauseButton && updatedTour) {
    pauseButton.textContent = (updatedTour.status || 'Ativo') === 'Pausado' ? 'Retomar' : 'Pausar';
  }
  carregarToursGerenciamento();
};

const deleteTourFromModal = () => {
  if (!currentlyEditingTourId) return;
  const tours = getPageTours();
  const tourToDelete = tours.find(t => String(t.id) === String(currentlyEditingTourId));
  if (!tourToDelete) return;
  if (!confirm(`Excluir tour "${tourToDelete.name || tourToDelete.id}"?`)) return;
  const updatedTours = tours.filter(t => String(t.id) !== String(currentlyEditingTourId));
  setPageTours(updatedTours);
  closeTourEditModal();
  carregarToursGerenciamento();
};

const saveTourEditModal = async () => {
  const id = currentlyEditingTourId;
  if (!id) return;

  const name = document.getElementById('tourModalName').value.trim();
  const languages = getTourModalLanguages();
  const meeting = document.getElementById('tourModalMeeting').value.trim();
  const identification = document.getElementById('tourModalIdentification').value.trim();
  const link = document.getElementById('tourModalLink').value.trim();
  const value = parseFloat(document.getElementById('tourModalValue').value);
  const status = document.getElementById('tourModalStatus').value;
  const cidade = document.getElementById('tourModalCidade').value;
  const modalidade = document.getElementById('tourModalModalidade').value;
  const canalReserva = document.getElementById('tourModalCanalReserva').value;
  const pastaImagens = document.getElementById('tourModalPastaImagens').value.trim();
  const adminEmail = localStorage.getItem('userEmail') || '';

  const payload = {
    id,
    nome_tour: name,
    idiomas: languages,
    encontro: meeting,
    identificacao: identification,
    link_tour: link,
    valor: Number.isFinite(value) ? value : 0,
    estado: status,
    cidade,
    modalidade,
    canal_reserva: canalReserva,
    pasta_imagens: pastaImagens,
    horarios: currentTourHorarios.join(','),
    admin_email: adminEmail
  };

  try {
    const response = await fetchWithApiFallback('/update_tour_pagina', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      alert(`Falha ao atualizar tour: ${errorData.message || response.statusText}`);
      return;
    }

    const tours = getPageTours();
    const updatedTours = tours.map(t => {
      if (String(t.id) === String(id)) {
        return {
          ...t,
          name,
          languages,
          meeting,
          identification,
          link,
          value: Number.isFinite(value) ? value : (t.value ?? 0),
          status,
          cidade,
          modalidade,
          canal_reserva: canalReserva,
          pastaImagens,
          horarios: currentTourHorarios.join(',')
        };
      }
      return t;
    });

    setPageTours(updatedTours);
    closeTourEditModal();
    carregarToursGerenciamento();
    alert('Tour atualizado com sucesso.');
  } catch (error) {
    console.error('Erro ao salvar tour:', error);
    alert('Erro ao salvar tour. Verifique sua conexão e tente novamente.');
  }
};

let lastLoadedTours = [];

const reorderTours = async (novaOrdemIds) => {
  const adminEmail = localStorage.getItem('userEmail') || '';
  try {
    const response = await fetchWithApiFallback('/reorder_tours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: adminEmail, ordem: novaOrdemIds })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(`Falha ao reordenar tours: ${result.message || response.statusText}`);
      return;
    }
    carregarToursGerenciamento();
  } catch (error) {
    console.error('Erro ao reordenar tours:', error);
    alert('Erro ao reordenar tours. Verifique sua conexão e tente novamente.');
  }
};

// A ordem é exclusiva por cidade: mover um tour só pode trocar de posição com
// outro tour da MESMA cidade, nunca com um tour de outra cidade.
const moveTourOrder = (tourId, direction) => {
  const tour = lastLoadedTours.find(t => String(t.id) === String(tourId));
  if (!tour) return;

  const sameCityTours = lastLoadedTours.filter(t => t.cidade === tour.cidade);
  const index = sameCityTours.findIndex(t => String(t.id) === String(tourId));
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= sameCityTours.length) return;

  const ids = lastLoadedTours.map(t => t.id);
  const posA = ids.indexOf(sameCityTours[index].id);
  const posB = ids.indexOf(sameCityTours[targetIndex].id);
  [ids[posA], ids[posB]] = [ids[posB], ids[posA]];
  reorderTours(ids);
};

const carregarToursGerenciamento = async () => {
  const remoteTours = await fetchPageToursFromBackend();
  const tours = Array.isArray(remoteTours) ? remoteTours : getPageTours();
  lastLoadedTours = tours;
  const tableBody = document.getElementById('tourManagementBody');
  if (!tableBody) return;

  if (!tours.length) {
    tableBody.innerHTML = '<tr><td colspan="11" style="padding:0.75rem;">Nenhum tour carregado.</td></tr>';
    return;
  }

  tableBody.innerHTML = '';

  tours.forEach((tour, idx) => {
    const row = document.createElement('tr');
    row.dataset.id = tour.id || `tour-${idx}`;
    const hasLink = Boolean(String(tour.link || '').trim());
    const linkHtml = hasLink
      ? `<a href="${tour.link}" target="_blank" rel="noopener noreferrer">Abrir link</a>`
      : '-';
    const modalidadeLabel = (tour.modalidade || 'free').toLowerCase() === 'privado' ? 'Privado' : 'Aberto (Free)';

    // Botões ▲▼ só reordenam dentro da mesma cidade, então ficam desabilitados
    // no primeiro/último tour DESSA cidade, não da tabela inteira.
    const sameCityTours = tours.filter(t => t.cidade === tour.cidade);
    const sameCityIndex = sameCityTours.findIndex(t => String(t.id) === String(tour.id));
    const isFirstOfCity = sameCityIndex === 0;
    const isLastOfCity = sameCityIndex === sameCityTours.length - 1;

    row.innerHTML = `
      <td data-label="Ordem" class="tour-order-cell">
        <button type="button" class="tour-order-btn" data-order-dir="-1" ${isFirstOfCity ? 'disabled' : ''} aria-label="Mover para cima">▲</button>
        <button type="button" class="tour-order-btn" data-order-dir="1" ${isLastOfCity ? 'disabled' : ''} aria-label="Mover para baixo">▼</button>
      </td>
      <td data-label="ID">${tour.id || `tour-${idx}`}</td>
      <td data-label="Tour">${tour.name || '-'}</td>
      <td data-label="Cidade">${tour.cidade || '-'}</td>
      <td data-label="Idiomas">${tour.languages || '-'}</td>
      <td data-label="Encontro">${tour.meeting || '-'}</td>
      <td data-label="Identificação">${tour.identification || '-'}</td>
      <td data-label="Link">${linkHtml}</td>
      <td data-label="Valor">${formatTourValueBRL(tour.value)}</td>
      <td data-label="Modalidade">${modalidadeLabel}</td>
      <td data-label="Status">${tour.status || 'Ativo'}</td>
    `;

    row.querySelectorAll('.tour-order-btn').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        moveTourOrder(tour.id, Number(btn.getAttribute('data-order-dir')));
      });
    });

    row.addEventListener('dblclick', () => openTourEditModal(tour));
    tableBody.appendChild(row);
  });
};

const DEFAULT_ROLE_PERMISSIONS = {
  cliente_user: {
    manageReservas: false,
    manageContas: false,
    managePerfis: false,
    pages: ['Principal', 'Reservas'],
    tabs: ['Principal', 'Reservas']
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

const updateCountryPie = (accounts) => {
  const pie = document.getElementById('countryPie');
  const legend = document.getElementById('countryLegend');
  if (!pie || !legend) return;

  const clientAccounts = accounts.filter(user => (user.role || '').trim() === 'cliente_user');
  const counts = clientAccounts.reduce((acc, user) => {
    const country = (user.pais_origem || 'Desconhecido').trim() || 'Desconhecido';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  const total = Object.values(counts).reduce((sum, v) => sum + v, 0) || 1;
  const colors = ['#e53e3e', '#3182ce', '#38a169', '#dd6b20', '#805ad5', '#2b6cb0', '#d69e2e', '#9f7aea', '#3182ce', '#f6ad55'];

  const gradients = Object.entries(counts).map(([country, count], index) => {
    const targetPct = (count / total) * 100;
    return {
      country,
      color: colors[index % colors.length],
      targetPct,
      value: 0
    };
  });

  const pieDuration = 1200;
  const startTime = performance.now();

  const animate = (time) => {
    const progress = Math.min((time - startTime) / pieDuration, 1);
    let currentOffset = 0;

    const parts = gradients.map((entry) => {
      entry.value = entry.targetPct * progress;
      const startAngle = (currentOffset / 100) * 360;
      const endAngle = ((currentOffset + entry.value) / 100) * 360;
      currentOffset += entry.value;
      return `${entry.color} ${startAngle}deg ${endAngle}deg`;
    });

    pie.style.background = `conic-gradient(${parts.join(', ')})`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);

  legend.innerHTML = Object.entries(counts)
    .map(([country, count], index) => {
      const pct = ((count / total) * 100).toFixed(1);
      const color = colors[index % colors.length];
      return `<div style="display:flex;align-items:center;margin-bottom:0.25rem;"><span style="width:12px;height:12px;border-radius:50%;background:${color};display:inline-block;margin-right:0.5rem;"></span><strong>${country}</strong>: <span class="country-pct" data-target="${pct}">0.0</span>% (${count})</div>`;
    })
    .join('');

  const duration = 900;
  const start = performance.now();
  const pctElems = Array.from(legend.querySelectorAll('.country-pct'));

  const step = (timestamp) => {
    const elapsed = timestamp - start;
    const progress = Math.min(elapsed / duration, 1);

    pctElems.forEach((el) => {
      const target = parseFloat(el.getAttribute('data-target')) || 0;
      const value = (target * progress).toFixed(1);
      el.textContent = value;
    });

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
};

const populateRoleSelect = (roles) => {
  const roleSelect = document.getElementById('roleSelect');
  if (!roleSelect) return;

  roleSelect.innerHTML = roles.map(role => `<option value="${role}">${role}</option>`).join('');
  roleSelect.addEventListener('change', () => {
    selectRole(roleSelect.value);
  });
};

const selectRole = (role) => {
  const roleSelect = document.getElementById('roleSelect');
  if (!roleSelect) return;

  roleSelect.value = role;
  const perms = currentRolesConfig[role] || DEFAULT_ROLE_PERMISSIONS[role] || { manageReservas: false, manageContas: false, managePerfis: false, pages: [], tabs: [] };

  const roleCheckReservas = document.getElementById('roleCheckReservas');
  const roleCheckContas = document.getElementById('roleCheckContas');
  const roleCheckPerfis = document.getElementById('roleCheckPerfis');
  const roleCheckSelfEdit = document.getElementById('roleCheckSelfEdit');
  const roleCheckOtherEdit = document.getElementById('roleCheckOtherEdit');
  const roleCheckConsultas = document.getElementById('roleCheckConsultas');
  const roleCheckCarregarReservas = document.getElementById('roleCheckCarregarReservas');

  if (roleCheckReservas) roleCheckReservas.checked = perms.manageReservas;
  if (roleCheckContas) roleCheckContas.checked = perms.manageContas;
  if (roleCheckPerfis) roleCheckPerfis.checked = perms.managePerfis;
  if (roleCheckSelfEdit) roleCheckSelfEdit.checked = perms.manageSelfEdit;
  if (roleCheckOtherEdit) roleCheckOtherEdit.checked = perms.manageOtherEdit;
  if (roleCheckConsultas) roleCheckConsultas.checked = perms.manageConsultas;
  if (roleCheckCarregarReservas) roleCheckCarregarReservas.checked = perms.loadAllReservas;

  Array.from(document.querySelectorAll('.page-perm')).forEach((el) => {
    el.checked = (perms.pages || []).includes(el.dataset.page);
  });

  Array.from(document.querySelectorAll('.tab-perm')).forEach((el) => {
    el.checked = (perms.tabs || []).includes(el.dataset.tab);
  });

  selectedRoleName = role;
};

const updateSelectedRoleConfig = () => {
  if (!selectedRoleName) return;

  const manageReservas = !!document.getElementById('roleCheckReservas')?.checked;
  const manageContas = !!document.getElementById('roleCheckContas')?.checked;
  const managePerfis = !!document.getElementById('roleCheckPerfis')?.checked;
  const manageSelfEdit = !!document.getElementById('roleCheckSelfEdit')?.checked;
  const manageOtherEdit = !!document.getElementById('roleCheckOtherEdit')?.checked;
  const manageConsultas = !!document.getElementById('roleCheckConsultas')?.checked;
  const loadAllReservas = !!document.getElementById('roleCheckCarregarReservas')?.checked;

  const pageChecks = Array.from(document.querySelectorAll('.page-perm'));
  const tabChecks = Array.from(document.querySelectorAll('.tab-perm'));

  const pages = pageChecks.filter(c => c.checked).map(c => c.dataset.page);
  const tabs = tabChecks.filter(c => c.checked).map(c => c.dataset.tab);

  currentRolesConfig[selectedRoleName] = {
    manageReservas,
    manageContas,
    managePerfis,
    manageSelfEdit,
    manageOtherEdit,
    manageConsultas,
    loadAllReservas,
    pages,
    tabs
  };
};

const setupRoleCheckboxHandlers = () => {
  [
    'roleCheckReservas',
    'roleCheckContas',
    'roleCheckPerfis',
    'roleCheckSelfEdit',
    'roleCheckOtherEdit',
    'roleCheckConsultas',
    'roleCheckCarregarReservas'
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      updateSelectedRoleConfig();
    });
  });

  Array.from(document.querySelectorAll('.page-perm')).forEach((el) => {
    el.addEventListener('change', updateSelectedRoleConfig);
  });

  Array.from(document.querySelectorAll('.tab-perm')).forEach((el) => {
    el.addEventListener('change', updateSelectedRoleConfig);
  });
};

// ********************************************************************
// função get_agendamentos (fetch do backend)
// ********************************************************************
const carregarAgendamentosDoBanco = async () => {
  const tableBodyElement = document.getElementById('reservationsBody');
  if (!tableBodyElement) return;

  const userEmail = localStorage.getItem('userEmail');
  if (!userEmail) {
    tableBodyElement.innerHTML = '<tr><td colspan="8" style="padding:0.75rem;">Sessao expirada. Faca login novamente.</td></tr>';
    return;
  }

  const role = normalizeRoleName(localStorage.getItem('userRole'));
  currentUserPermissions = currentUserPermissions || currentRolesConfig[role] || DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cliente_user;

  if (!currentUserPermissions.manageReservas) {
    tableBodyElement.innerHTML = '<tr><td colspan="8" style="padding:0.75rem;">Verificando permissão no servidor...</td></tr>';

    try {
      const response = await fetchWithApiFallback(`/check_permission?email=${encodeURIComponent(userEmail)}&permission=manageReservas`);
      if (!response.ok) {
        const reasonData = await response.json().catch(() => ({}));
        tableBodyElement.innerHTML = `<tr><td colspan="8" style="padding:0.75rem;">Acesso negado no servidor: ${reasonData.reason || reasonData.message || 'sem razão'}.</td></tr>`;
        return;
      }

      const result = await response.json();
      if (!result.allowed) {
        tableBodyElement.innerHTML = `<tr><td colspan="8" style="padding:0.75rem;">Acesso negado ao Gerenciamento de reservas: ${result.reason || 'não autorizado'}.</td></tr>`;
        return;
      }

      // Se servidor permitir, atualize permissão local para evitar rechecagem repetida
      currentUserPermissions.manageReservas = true;
    } catch (error) {
      console.warn('Falha ao verificar permissão no servidor:', error);
      tableBodyElement.innerHTML = '<tr><td colspan="8" style="padding:0.75rem;">Erro de verificação de permissões. Tente novamente mais tarde.</td></tr>';
      return;
    }
  }

  // filtros aplicados na própria tabela de backend
  const filterFrom = document.getElementById('filterFrom');
  const filterTo = document.getElementById('filterTo');
  const filterTour = document.getElementById('filterTour');
  const filterStatus = document.getElementById('filterStatus');
  const filterModality = document.getElementById('filterModality');

  const fromDate = filterFrom?.value ? new Date(filterFrom.value) : null;
  const toDate = filterTo?.value ? new Date(filterTo.value) : null;
  const tourFilter = filterTour?.value || 'all';
  const statusFilter = filterStatus?.value || 'all';
  const modalityFilter = filterModality?.value || 'all';

  try {
    const response = await fetchWithApiFallback(`/get_agendamentos?email=${encodeURIComponent(userEmail)}`);

    if (response.status === 403) {
      alert('Erro: Você não tem permissão de Administrador para ver esta página.');
      tableBodyElement.innerHTML = '<tr><td colspan="8" style="padding:0.75rem;">Sem permissão para visualizar reservas.</td></tr>';
      return;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Erro ao buscar agendamentos', {
        status: response.status,
        statusText: response.statusText,
        detail: errorText
      });
      alert(`Falha ao carregar reservas (${response.status}).`);
      tableBodyElement.innerHTML = '<tr><td colspan="8" style="padding:0.75rem;">Falha ao carregar reservas do banco de dados.</td></tr>';
      return;
    }

    const agendamentos = await response.json();
    tableBodyElement.innerHTML = '';

    let filtered = agendamentos.filter(ag => {
      let agDate = null;
      if (ag.data) {
        const parts = ag.data.split('/');
        if (parts.length === 3) {
          agDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }

      if (fromDate && agDate && agDate < fromDate) return false;
      if (toDate && agDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (agDate > endOfDay) return false;
      }
      if (statusFilter !== 'all' && (ag.status || 'Pendente') !== statusFilter) return false;
      if (tourFilter !== 'all' && ag.tour !== tourFilter) return false;
      if (modalityFilter !== 'all' && (ag.modalidade || 'free') !== modalityFilter) return false;
      return true;
    });

    if (!filtered.length) {
      tableBodyElement.innerHTML = '<tr><td colspan="8" style="padding:0.75rem;">Nenhuma reserva encontrada.</td></tr>';
    }

    // Salva reservas para uso na aba Gerenciamento da página
    currentReservations = filtered.slice();

    // Exibir registros mais recentes primeiro (id maior primeiro)
    filtered.sort((a, b) => (b.id || 0) - (a.id || 0));

    filtered.forEach(ag => {
      const row = document.createElement('tr');
      row.setAttribute('data-id', ag.id);

      const statusValue = (ag.status || 'Pendente').toString();
      const statusClass = statusValue.toLowerCase();
      const qtdValue = ag.qtd != null ? ag.qtd : (ag.qtd_pessoas != null ? ag.qtd_pessoas : '-');
      const idiomaValue = ag.idioma || '-';
      const modalidadeValue = ag.modalidade || 'free';
      const guiaValue = ag.guia || '-';

      row.innerHTML = `
        <td data-label="Tour">${ag.tour}</td>
        <td data-label="Idioma">${idiomaValue}</td>
        <td data-label="Modalidade">${modalidadeValue}</td>
        <td data-label="Guia">${guiaValue}</td>
        <td data-label="Data">${ag.data}</td>
        <td data-label="Hora">${ag.hora}</td>
        <td data-label="Pessoas">${qtdValue}</td>
        <td data-label="Status"><span class="status-badge ${statusClass}">${statusValue}</span></td>
      `;

      if (currentUserPermissions?.manageReservas) {
        row.addEventListener('click', () => {
          console.log('Editando agendamento:', ag.id);
          openEditModalFromBackend(ag);
        });

        row.addEventListener('dblclick', () => {
          openEditModalFromBackend(ag);
        });
      } else {
        row.style.cursor = 'not-allowed';
      }

      tableBodyElement.appendChild(row);
    });

    // Atualiza os cards de status com base nos dados recebidos do backend
    const pending = filtered.filter(ag => (ag.status || 'Pendente') === 'Pendente').length;
    const confirmed = filtered.filter(ag => (ag.status || 'Pendente') === 'Confirmado').length;
    const finalized = filtered.filter(ag => (ag.status || 'Pendente') === 'Finalizado').length;

    const statPending = document.getElementById('statPending');
    const statConfirmed = document.getElementById('statConfirmed');
    const statFinalized = document.getElementById('statFinalized');
    const statNext = document.getElementById('statNext');

    if (statPending) statPending.textContent = String(pending);
    if (statConfirmed) statConfirmed.textContent = String(confirmed);
    if (statFinalized) statFinalized.textContent = String(finalized);

    const now = new Date();
    now.setSeconds(0, 0);

    const parseDateTime = (ag) => {
      if (!ag.data || !ag.hora) return null;
      const [day, month, year] = ag.data.split('/').map(Number);
      const [hour, minute] = ag.hora.split(':').map(Number);
      if (!day || !month || !year || hour == null || minute == null) return null;
      return new Date(year, month - 1, day, hour, minute, 0, 0);
    };

    const upcoming = filtered
      .map(ag => ({
        ...ag,
        dateTime: parseDateTime(ag)
      }))
      .filter(ag =>
        ag.dateTime instanceof Date &&
        !Number.isNaN(ag.dateTime.getTime()) &&
        ag.dateTime >= now &&
        (ag.status || 'Pendente') === 'Confirmado'
      )
      .sort((a, b) => a.dateTime - b.dateTime);

    const nextDateTime = upcoming.length > 0 ? upcoming[0].dateTime : null;
    const allNextDateTime = nextDateTime
      ? upcoming.filter(ag => ag.dateTime && ag.dateTime.getTime() === nextDateTime.getTime())
      : [];

    if (statNext) {
      if (!nextDateTime) {
        statNext.textContent = '-';
      } else {
        const dateStr = nextDateTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = nextDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        statNext.textContent = `${dateStr} ${timeStr} (${allNextDateTime.length} próximo${allNextDateTime.length !== 1 ? 's' : ''})`;
      }
    }

    const grouped = {};
    allNextDateTime.forEach(ag => {
      const tour = (ag.tour || '').trim();
      const idioma = (ag.idioma || '').trim();
      const guia = (ag.guia || '').trim();
      const key = `${tour}||${idioma}||${guia}`;
      const qtd = Number(ag.qtd ?? ag.qtd_pessoas ?? 0) || 0;
      if (!grouped[key]) {
        grouped[key] = {
          tour: tour || '-',
          idioma: idioma || '-',
          guia: guia || '-',
          data: ag.data || '-',
          hora: ag.hora || '-',
          pessoas: qtd,
          count: 1
        };
      } else {
        grouped[key].pessoas += qtd;
        grouped[key].count += 1;
      }
    });

    const nextTours = Object.values(grouped);

    // statNext já foi atualizado acima com allNextDateTime.length, garantindo contagem total de reservas.
    const nextTourDetails = document.getElementById('nextTourDetails');

    if (nextTourDetails) {
      nextTourDetails.classList.remove('open');
      nextTourDetails.setAttribute('aria-hidden', 'true');
      nextTourDetails.style.display = 'none';

      let tourListContainer = nextTourDetails.querySelector('.next-tour-entries');
      if (!tourListContainer) {
        tourListContainer = document.createElement('div');
        tourListContainer.className = 'next-tour-entries';
        tourListContainer.style.marginTop = '0.5rem';
        nextTourDetails.appendChild(tourListContainer);
      }

      if (nextTours.length === 0) {
        tourListContainer.innerHTML = '<div style="color:#6b7280;">Nenhum próximo tour confirmado.</div>';
      } else {
        const totalPeople = nextTours.reduce((sum, group) => sum + (group.pessoas || 0), 0);
        const tourGuides = [...new Set(nextTours.map(group => group.guia || '-'))].join(', ');

        tourListContainer.innerHTML = nextTours.map(group => {
          return `
            <div class="next-tour-entry" style="margin-bottom:0.4rem; border-bottom:1px solid rgba(0,0,0,0.08); padding-bottom:0.4rem;">
              <div><strong>Tour:</strong> ${group.tour}</div>
              <div><strong>Idioma:</strong> ${group.idioma}</div>
              <div><strong>Guia:</strong> ${group.guia}</div>
              <div><strong>Pessoas:</strong> ${group.pessoas}</div>
            </div>`;
        }).join('');

      }
    }

    const nextToggle = document.getElementById('nextTourToggle');
    const nextDetails = document.getElementById('nextTourDetails');
    if (nextDetails) {
      nextDetails.classList.remove('open');
      nextDetails.setAttribute('aria-hidden', 'true');
    }

    if (nextToggle && nextDetails) {
      nextToggle.onclick = null;
      nextToggle.addEventListener('click', () => {
        const expanded = nextDetails.classList.toggle('open');
        nextDetails.setAttribute('aria-hidden', String(!expanded));
        nextToggle.setAttribute('aria-expanded', String(expanded));
        nextToggle.classList.toggle('open', expanded);
        nextDetails.style.display = expanded ? 'block' : 'none';
        nextToggle.textContent = expanded ? '▼' : '▶';
      });
    }

    console.log('Tabela atualizada com sucesso!');
  } catch (error) {
    console.error('Erro de conexão ao carregar tabela:', error);
    const detail = (error && error.message) ? ` Detalhe: ${error.message}` : '';
    tableBodyElement.innerHTML = `<tr><td colspan="8" style="padding:0.75rem;">Erro de conexão com a API ao carregar reservas.${detail}</td></tr>`;
  }
};

const hideAllSections = () => {
  const reservations = document.querySelectorAll('.reservas-section');
  const accounts = document.getElementById('accountsSection');
  const pageManagement = document.getElementById('pageManagementSection');

  reservations.forEach((el) => { if (el) el.style.display = 'none'; });
  if (accounts) accounts.style.display = 'none';
  if (pageManagement) pageManagement.style.display = 'none';
};

const mostrarSecao = (secao) => {
  hideAllSections();

  const reservations = document.querySelectorAll('.reservas-section');
  const reservationStats = document.getElementById('reservationsStatsSection');
  const reservationTable = document.getElementById('reservationsTableSection');
  const accounts = document.getElementById('accountsSection');
  const pageManagement = document.getElementById('pageManagementSection');
  const pageManagementTours = document.getElementById('pageManagementToursSection');

  reservations.forEach((el) => {
    if (el) el.style.display = secao === 'reservas' ? 'block' : 'none';
  });

  if (reservationStats) {
    reservationStats.style.display = secao === 'reservas' ? 'block' : 'none';
  }
  if (reservationTable) {
    reservationTable.style.display = secao === 'reservas' ? 'block' : 'none';
  }

  if (accounts) {
    accounts.style.display = secao === 'contas' ? 'block' : 'none';
  }

  if (pageManagement) {
    pageManagement.style.display = (secao === 'gerenciamento' || secao === 'financeiro') ? 'block' : 'none';
  }

  if (pageManagementTours) {
    pageManagementTours.style.display = secao === 'gerenciamento' ? 'block' : 'none';
  }

  const financeSection = document.getElementById('financeSection');
  if (financeSection) {
    financeSection.style.display = secao === 'financeiro' ? 'block' : 'none';
  }

  if (secao === 'financeiro') {
    carregarFinanceiro();
    fetchCurrentUsdBrlRate().then(() => {
      if (typeof window.convertCurrency === 'function') {
        window.convertCurrency();
      }
    }).catch(() => {
      if (typeof window.convertCurrency === 'function') {
        window.convertCurrency();
      }
    });
  }

  if (secao !== 'reservas' && secao !== 'contas' && secao !== 'gerenciamento' && secao !== 'financeiro') {
    console.warn('Secão desconhecida:', secao);
  }

  const links = document.querySelectorAll('.gerenciamento-nav .nav-link[data-section]');
  links.forEach((link) => {
    if (link.dataset.section === secao) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const titleMap = {
    reservas: 'Reservas',
    contas: 'Contas',
    perfis: 'Gerenciamento da página',
    gerenciamento: 'Gerenciamento da página',
    financeiro: 'Financeiro'
  };

  const titleEle = document.querySelector('.gerenciamento-header h1');
  if (titleEle) {
    titleEle.textContent = titleMap[secao] || 'Reservas';
  }

  // Verifica permissão para seção solicitada
  if (!currentUserPermissions) {
    const role = normalizeRoleName(localStorage.getItem('userRole'));
    currentUserPermissions = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cliente_user;
  }

  const sectionToTab = {
    reservas: 'Reservas',
    contas: 'Contas',
    gerenciamento: 'Gerenciamento',
    financeiro: 'Financeiro'
  };

  const allowedTabs = currentUserPermissions.tabs || [];
  const requestedTab = sectionToTab[secao] || 'Reservas';

  if (!allowedTabs.includes(requestedTab)) {
    alert('Acesso negado à seção solicitada com seu nível de acesso.');
    const fallbackTab = allowedTabs[0] || 'Principal';
    if (fallbackTab === 'Reservas') {
      mostrarSecao('reservas');
    } else if (fallbackTab === 'Contas') {
      mostrarSecao('contas');
    } else if (fallbackTab === 'Gerenciamento') {
      mostrarSecao('gerenciamento');
    }
    return;
  }

  if (secao === 'gerenciamento') {
    carregarToursGerenciamento();
  }
};

const toggleReservaPausada = async (id, currentStatus) => {
  const newStatus = currentStatus === 'Pausado' ? 'Confirmado' : 'Pausado';
  const currentUserEmail = localStorage.getItem('userEmail');

  if (String(id).startsWith('local-') && typeof window.getReservations === 'function' && typeof window.setReservations === 'function') {
    const raw = window.getReservations();
    const updated = raw.map((res) => {
      if (String(res.id) === String(id) || String(res.localId) === String(id)) {
        return { ...res, status: newStatus, id: String(id), localId: String(id) };
      }
      return res;
    });

    window.setReservations(updated);
    return;
  }

  try {
    const response = await fetchWithApiFallback('/update_agendamento', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus, admin_email: currentUserEmail })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Erro ao atualizar status: ${text}`);
    }

    carregarAgendamentosDoBanco();
  } catch (error) {
    console.error(error);
    alert('Não foi possível atualizar o status da reserva.');
  }
};

const excluirReservaAgendamento = async (id) => {
  if (!confirm('Tem certeza que deseja excluir esta reserva?')) return;
  const currentUserEmail = localStorage.getItem('userEmail');

  if (String(id).startsWith('local-') && typeof window.getReservations === 'function' && typeof window.setReservations === 'function') {
    const raw = window.getReservations();
    const updated = raw.filter((res) => String(res.id) !== String(id) && String(res.localId) !== String(id));
    window.setReservations(updated);
    return;
  }

  try {
    const response = await fetchWithApiFallback('/delete_agendamento', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, admin_email: currentUserEmail })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Erro ao excluir reserva: ${text}`);
    }

    carregarAgendamentosDoBanco();
  } catch (error) {
    console.error(error);
    alert('Não foi possível excluir a reserva.');
  }
};

const carregarContasDoBanco = async () => {
  const tableBody = document.getElementById('accountsBody');
  if (!tableBody) return;

  const role = normalizeRoleName(localStorage.getItem('userRole') || 'cliente_user');
  currentUserPermissions = currentUserPermissions || currentRolesConfig[role] || DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cliente_user;

  if (!currentUserPermissions.manageContas) {
    tableBody.innerHTML = '<tr><td colspan="8" style="padding:0.75rem;">Sem permissão para visualizar tabela de acessos.</td></tr>';
    const rolesManager = document.getElementById('rolesManager');
    if (rolesManager) rolesManager.style.display = 'none';
    return;
  }

  const currentUserEmail = localStorage.getItem('userEmail');
  if (!currentUserEmail) {
    alert('Sessão expirada. Faça login novamente.');
    window.location.href = 'login.html';
    return;
  }

  tableBody.innerHTML = '<tr><td colspan="8" style="padding:0.75rem;">Carregando contas...</td></tr>';

  try {
    const response = await fetchWithApiFallback(`/get_acessos?email=${encodeURIComponent(currentUserEmail)}`);

    if (response.status === 403) {
      tableBody.innerHTML = '<tr><td colspan="8" style="padding:0.75rem;">Acesso negado — somente admin/super_admin.</td></tr>';
      return;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Erro ao buscar acessos', response.status, response.statusText, errorText);
      tableBody.innerHTML = '<tr><td colspan="8" style="padding:0.75rem;">Erro ao carregar contas.</td></tr>';
      return;
    }

    const accounts = await response.json();
    if (!Array.isArray(accounts) || !accounts.length) {
      tableBody.innerHTML = '<tr><td colspan="8" style="padding:0.75rem;">Nenhuma conta encontrada.</td></tr>';
      return;
    }

    currentAccounts = accounts;
    const accountsSearchInput = document.getElementById('accountsNameSearch');
    if (accountsSearchInput && !accountsSearchInput.dataset.searchAttached) {
      accountsSearchInput.addEventListener('input', applyAccountsSearchFilter);
      accountsSearchInput.dataset.searchAttached = '1';
    }

    applyAccountsSearchFilter();

    // Atualiza gráfico de países com base no cadastro de contas
    updateCountryPie(accounts);

    // Apenas quem pode gerenciar perfis deve visualizar/editar níveis de acesso.
    if (currentUserPermissions.managePerfis) {
      carregarNiveisDeAcesso();
    } else {
      const rolesManager = document.getElementById('rolesManager');
      if (rolesManager) rolesManager.style.display = 'none';
    }
  } catch (error) {
    console.error('Erro ao carregar contas:', error);
    tableBody.innerHTML = `<tr><td colspan="8" style="padding:0.75rem;">Erro de conexão: ${error.message || error}</td></tr>`;
  }
};

const renderRolesTable = (permissions) => {
  // Não usa mais tabela options internas (apenas select + checkboxes)
  currentRolesConfig = permissions;
};

const renderRoleDetails = (role, perms) => {
  // Não necessário; o select + checkboxes são usados em vez de painel separado.
};

const carregarNiveisDeAcesso = async () => {
  const currentUserEmail = localStorage.getItem('userEmail');
  if (!currentUserEmail) {
    alert('Sessão expirada. Faça login novamente.');
    window.location.href = 'login.html';
    return;
  }

  try {
    const response = await fetchWithApiFallback(`/get_role_permissions?email=${encodeURIComponent(currentUserEmail)}`);
    if (response.status === 403) {
      console.warn('Acesso negado para get_role_permissions, usando padrão local.');
      currentRolesConfig = DEFAULT_ROLE_PERMISSIONS;
    } else if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Erro ao buscar níveis de acesso', response.status, response.statusText, errorText);
      currentRolesConfig = DEFAULT_ROLE_PERMISSIONS;
    } else {
      const payload = await response.json();
      const permissions = payload?.permissions || {};
      currentRolesConfig = Object.keys(permissions).length ? permissions : DEFAULT_ROLE_PERMISSIONS;
    }

    populateRoleSelect(Object.keys(currentRolesConfig));
    const role = normalizeRoleName(localStorage.getItem('userRole') || 'cliente_user');
  currentUserPermissions = currentRolesConfig[role] || DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cliente_user;

  applyAccessControls(currentUserPermissions);

  if (!Array.isArray(currentUserPermissions.pages) || !currentUserPermissions.pages.includes('Gerenciamento')) {
    alert('Seu nível de acesso não permite abrir esta página.');
    window.location.href = '../index.html';
    return;
  }

  selectRole(Object.keys(currentRolesConfig)[0] || 'cliente_user');
  } catch (error) {
    console.error('Erro ao carregar níveis de acesso:', error);
    rolesBody.innerHTML = `<tr><td colspan="4" style="padding:0.75rem;">Erro de conexão: ${error.message || error}</td></tr>`;
  }
};

const salvarNiveisDeAcesso = async () => {
  const currentUserEmail = localStorage.getItem('userEmail');
  if (!currentUserEmail) {
    alert('Sessão expirada. Faça login novamente.');
    window.location.href = 'login.html';
    return;
  }

  const mapped = { ...currentRolesConfig };

  try {
    const response = await fetchWithApiFallback('/set_role_permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: currentUserEmail, permissions: mapped })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      alert(`Falha ao salvar níveis: ${response.status} ${errorText}`);
      return;
    }

    const data = await response.json();
    alert('Níveis de acesso salvos com sucesso.');
    if (data.permissions) {
      carregarNiveisDeAcesso();
    }
  } catch (error) {
    console.error('Erro ao salvar níveis de acesso:', error);
    alert('Erro ao salvar níveis de acesso.');
  }
};

const resetarNiveisDeAcesso = async () => {
  const defaultPermissions = {
    cliente_user: { manageReservas: false, manageContas: false, managePerfis: false },
    admin: { manageReservas: true, manageContas: true, managePerfis: false },
    super_admin: { manageReservas: true, manageContas: true, managePerfis: true }
  };

  const currentUserEmail = localStorage.getItem('userEmail');
  if (!currentUserEmail) {
    alert('Sessão expirada. Faça login novamente.');
    window.location.href = 'login.html';
    return;
  }

  try {
    const response = await fetchWithApiFallback('/set_role_permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: currentUserEmail, permissions: defaultPermissions })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      alert(`Falha ao resetar níveis: ${response.status} ${errorText}`);
      return;
    }

    alert('Níveis resetados para padrão.');
    carregarNiveisDeAcesso();
  } catch (error) {
    console.error('Erro ao resetar níveis de acesso:', error);
    alert('Erro ao resetar níveis de acesso.');
  }
};

// Popula um <select> de role com as roles configuradas (Gerenciamento de Níveis
// de Acesso), incluindo roles customizadas criadas via "Adicionar nível de acesso".
// Sem isso, uma role nova nunca poderia ser atribuída a nenhuma conta.
const populateRoleOptionsInto = (selectEl, selectedValue) => {
  if (!selectEl) return;

  const roleNames = Object.keys(currentRolesConfig).length
    ? Object.keys(currentRolesConfig)
    : Object.keys(DEFAULT_ROLE_PERMISSIONS);

  const options = new Set(roleNames.length ? roleNames : ['cliente_user', 'admin', 'super_admin']);
  if (selectedValue) options.add(selectedValue);

  selectEl.innerHTML = Array.from(options).map(role => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`).join('');
  if (selectedValue) selectEl.value = selectedValue;
};

const openAccountModal = (account) => {
  currentlyEditingAccount = account;
  const accountModal = document.getElementById('accountModal');
  const emailInput = document.getElementById('accountEmail');
  const nomeInput = document.getElementById('accountNome');
  const sobrenomeInput = document.getElementById('accountSobrenome');
  const celularInput = document.getElementById('accountCelular');
  const roleInput = document.getElementById('accountRole');
  const generoInput = document.getElementById('accountGenero');
  const senhaInput = document.getElementById('accountSenha');

  if (!accountModal || !emailInput) return;

  emailInput.value = account.email || '';
  nomeInput.value = account.nome || '';
  sobrenomeInput.value = account.sobrenome || '';
  celularInput.value = account.celular || '';
  const paisOrigemInput = document.getElementById('accountPaisOrigem');
  if (paisOrigemInput) paisOrigemInput.value = account.pais_origem || '';
  if (generoInput) generoInput.value = account.genero || '';
  if (senhaInput) senhaInput.value = '';

  populateRoleOptionsInto(roleInput, account.role || 'cliente_user');

  accountModal.classList.remove('hidden');
};

const closeAccountModal = () => {
  const accountModal = document.getElementById('accountModal');
  if (accountModal) accountModal.classList.add('hidden');
  currentlyEditingAccount = null;
};

const setupAccountModalEvents = () => {
  const accountCancel = document.getElementById('accountCancel');
  const accountSave = document.getElementById('accountSave');
  const accountDelete = document.getElementById('accountDelete');

  if (accountCancel) {
    accountCancel.addEventListener('click', () => {
      closeAccountModal();
    });
  }

  if (accountSave) {
    accountSave.addEventListener('click', async () => {
      if (!currentlyEditingAccount) return;

      const email = document.getElementById('accountEmail')?.value;
      const nome = document.getElementById('accountNome')?.value.trim();
      const sobrenome = document.getElementById('accountSobrenome')?.value.trim();
      const celular = document.getElementById('accountCelular')?.value.trim();
      const role = document.getElementById('accountRole')?.value;
      const genero = document.getElementById('accountGenero')?.value || '';
      const senha = document.getElementById('accountSenha')?.value;

      const paisOrigem = document.getElementById('accountPaisOrigem')?.value.trim();
      const currentUserEmail = localStorage.getItem('userEmail');
      const payload = {
        email,
        admin_email: currentUserEmail,
        nome,
        sobrenome,
        celular,
        pais_origem: paisOrigem || undefined,
        genero,
        role
      };
      if (senha) payload.senha = senha;

      const response = await fetchWithApiFallback('/update_user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        alert(`Falha ao atualizar perfil: ${response.status} ${errorText}`);
        return;
      }

      alert('Perfil atualizado com sucesso.');
      closeAccountModal();
      carregarContasDoBanco();
    });
  }

  if (accountDelete) {
    accountDelete.addEventListener('click', async () => {
      if (!currentlyEditingAccount) return;
      if (!confirm(`Excluir perfil ${currentlyEditingAccount.email}?`)) return;

      const currentUserEmail = localStorage.getItem('userEmail');
      if (!currentUserEmail) {
        alert('Sessão expirada. Faça login novamente.');
        window.location.href = 'login.html';
        return;
      }

      const response = await fetchWithApiFallback('/delete_user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_email: currentUserEmail, id: currentlyEditingAccount.id })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        alert(`Falha ao excluir perfil: ${response.status} ${errorText}`);
        return;
      }

      alert('Perfil excluído com sucesso.');
      closeAccountModal();
      carregarContasDoBanco();
    });
  }

  const addAccountBtn = document.getElementById('addAccountBtn');
  const addAccountModal = document.getElementById('addAccountModal');
  const addAccountCancel = document.getElementById('addAccountCancel');
  const addAccountSave = document.getElementById('addAccountSave');

  const closeAddAccountModal = () => {
    if (addAccountModal) addAccountModal.classList.add('hidden');
  };

  if (addAccountBtn) {
    addAccountBtn.addEventListener('click', () => {
      if (!addAccountModal) return;
      document.getElementById('addAccountForm')?.reset();
      populateRoleOptionsInto(document.getElementById('newAccountRole'), 'cliente_user');
      addAccountModal.classList.remove('hidden');
    });
  }

  if (addAccountCancel) {
    addAccountCancel.addEventListener('click', closeAddAccountModal);
  }

  if (addAccountSave) {
    addAccountSave.addEventListener('click', async () => {
      const email = document.getElementById('newAccountEmail')?.value.trim();
      const senha = document.getElementById('newAccountSenha')?.value;
      const nome = document.getElementById('newAccountNome')?.value.trim();
      const sobrenome = document.getElementById('newAccountSobrenome')?.value.trim();
      const celular = document.getElementById('newAccountCelular')?.value.trim();
      const paisOrigem = document.getElementById('newAccountPaisOrigem')?.value.trim();
      const genero = document.getElementById('newAccountGenero')?.value || '';
      const role = document.getElementById('newAccountRole')?.value || 'cliente_user';

      if (!email || !senha) {
        alert('E-mail e senha são obrigatórios.');
        return;
      }

      const currentUserEmail = localStorage.getItem('userEmail');
      const response = await fetchWithApiFallback('/add_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_email: currentUserEmail,
          email,
          password: senha,
          nome,
          sobrenome,
          celular,
          pais_origem: paisOrigem,
          genero,
          role
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        alert(`Falha ao criar conta: ${result.message || response.statusText}`);
        return;
      }

      alert('Conta criada com sucesso.');
      closeAddAccountModal();
      carregarContasDoBanco();
    });
  }

  const tourModalCancel = document.getElementById('tourModalCancel');
  const tourModalSave = document.getElementById('tourModalSave');
  if (tourModalCancel) {
    tourModalCancel.addEventListener('click', () => {
      closeTourEditModal();
    });
  }

  const tourModalPause = document.getElementById('tourModalPause');
  if (tourModalPause) {
    tourModalPause.addEventListener('click', () => {
      toggleTourPauseFromModal();
    });
  }

  const tourModalDelete = document.getElementById('tourModalDelete');
  if (tourModalDelete) {
    tourModalDelete.addEventListener('click', () => {
      deleteTourFromModal();
    });
  }

  if (tourModalSave) {
    tourModalSave.addEventListener('click', () => {
      saveTourEditModal();
    });
  }

  const tourModalUploadImages = document.getElementById('tourModalUploadImages');
  if (tourModalUploadImages) {
    tourModalUploadImages.addEventListener('click', () => {
      uploadTourImages();
    });
  }

  const refreshGallery = () => {
    const cidade = document.getElementById('tourModalCidade')?.value || '';
    const pasta = document.getElementById('tourModalPastaImagens')?.value.trim() || '';
    probeTourFolderImages(cidade, pasta).then(renderTourGallery);
  };
  document.getElementById('tourModalCidade')?.addEventListener('change', refreshGallery);
  document.getElementById('tourModalPastaImagens')?.addEventListener('change', refreshGallery);

  const tourModalImageInput = document.getElementById('tourModalImageInput');
  if (tourModalImageInput) {
    tourModalImageInput.addEventListener('change', () => {
      renderTourImagePreview(Array.from(tourModalImageInput.files || []));
    });
  }

  const tourModalAddHorario = document.getElementById('tourModalAddHorario');
  if (tourModalAddHorario) {
    tourModalAddHorario.addEventListener('click', () => {
      adicionarTourHorario();
    });
  }
};

const attachSectionLinks = () => {
  const sectionLinks = document.querySelectorAll('.gerenciamento-nav .nav-link');
  sectionLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const rawSection = (link.dataset.section || link.textContent.trim()).toLowerCase();
      let section = 'reservas';

      if (rawSection === 'contas' || rawSection === 'conta') {
        section = 'contas';
      } else if (rawSection === 'gerenciamento' || rawSection === 'perfis' || rawSection === 'gerenciamento da página') {
        section = 'gerenciamento';
      } else if (rawSection === 'financeiro') {
        section = 'financeiro';
      }

      console.log('[Gerenciamento] Seção escolhida:', rawSection, '->', section);

      const requiredTab = section === 'reservas' ? 'Reservas'
        : section === 'contas' ? 'Contas'
        : section === 'gerenciamento' ? 'Gerenciamento'
        : section === 'financeiro' ? 'Financeiro'
        : null;

      if (requiredTab && !(currentUserPermissions?.tabs || []).includes(requiredTab)) {
        alert('Acesso bloqueado para esta aba com base no seu nível de acesso.');
        return;
      }

      if (section === 'contas') {
        mostrarSecao('contas');
        carregarContasDoBanco();
        carregarNiveisDeAcesso();
      } else if (section === 'gerenciamento') {
        mostrarSecao('gerenciamento');
        carregarAgendamentosDoBanco();
      } else if (section === 'financeiro') {
        mostrarSecao('financeiro');
      } else {
        mostrarSecao('reservas');
        carregarAgendamentosDoBanco();
      }
    });
  });
};

const setupRolesControls = () => {
  const saveRolesBtn = document.getElementById('saveRolesConfig');
  if (saveRolesBtn) {
    saveRolesBtn.addEventListener('click', salvarNiveisDeAcesso);
  }

  const addRoleBtn = document.getElementById('addRoleBtn');
  if (addRoleBtn) {
    addRoleBtn.addEventListener('click', () => {
      const roleName = prompt('Novo nível de acesso (role name):');
      if (!roleName) return;
      const normalized = String(roleName).trim();
      if (!normalized) return;
      if (currentRolesConfig[normalized]) {
        alert('Role já existe.');
        return;
      }

      currentRolesConfig[normalized] = { manageReservas: false, manageContas: false, managePerfis: false };
      populateRoleSelect(Object.keys(currentRolesConfig));
      selectRole(normalized);
    });
  }

  setupRoleCheckboxHandlers();
};


const openEditModalFromBackend = (ag) => {
  if (!currentUserPermissions?.manageReservas) {
    console.warn('Permissão negada para editar reservas:', ag?.id);
    return;
  }

  // Abre o modal de edição usando os dados retornados do backend
  const modal = document.getElementById('reservationModal');
  if (!modal) return;

  const modalTour = document.getElementById('modalTour');
  const modalDate = document.getElementById('modalDate');
  const modalTime = document.getElementById('modalTime');
  const modalLanguage = document.getElementById('modalLanguage');
  const modalModality = document.getElementById('modalModality');
  const modalPhone = document.getElementById('modalPhone');
  const modalEmail = document.getElementById('modalEmail');
  const modalName = document.getElementById('modalName');
  const modalGuide = document.getElementById('modalGuide');
  const modalQuantity = document.getElementById('modalQuantity');
  const modalStatus = document.getElementById('modalStatus');
  const modalDelete = document.getElementById('modalDelete');

  if (modalTour) {
    // carregar opções de tour (mesmo conjunto usado em openEditModal)
    const localTours = getReservations().map(r => r.tour).filter(Boolean);
    const baseTours = [
      'Centro Histórico',
      'Santa Teresa',
      'Pedra do Sal: Samba e Herança Afrobrasileira',
      'Copacabana e Ipanema',
      'Favela Tour (Morro Dona Marta)',
      'Tour das Praias',
      'Tour Cultural do Centro'
    ];
    const tours = [...new Set([...baseTours, ...localTours, ag.tour].filter(Boolean))];

    const selectedTour = ag.tour || '';
    modalTour.innerHTML = '<option value="">Selecione um tour</option>' + tours.map(t => `\n        <option value="${t}"${t === selectedTour ? ' selected' : ''}>${t}</option>`).join('');
    modalTour.value = selectedTour;
  }

  pendingUpdateId = ag.id || null;

  if (modalDate && ag.data) {
    const parts = ag.data.split('/');
    if (parts.length === 3) {
      modalDate.value = `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  if (modalTime && ag.hora) modalTime.value = ag.hora;

  // garantir idiomas padrões disponíveis na seleção e marcar idioma atual
  if (modalLanguage) {
    const baseLanguages = ['Português', 'Inglês', 'Espanhol'];
    const otherLanguages = getReservations().flatMap(r => (r.language || '').split(/[,;]+/).map(l => l.trim()).filter(Boolean));
    const languages = [...new Set([...baseLanguages, ...otherLanguages, ag.idioma].filter(Boolean))];
    const selectedLanguage = ag.idioma || '';

    modalLanguage.innerHTML = '<option value="">Selecione um idioma</option>' +
      languages.map(l => `\n        <option value="${l}"${l === selectedLanguage ? ' selected' : ''}>${l}</option>`).join('');
    modalLanguage.value = selectedLanguage;
  }

  if (modalModality) modalModality.value = ag.modalidade || 'free';
  if (modalPhone) modalPhone.value = ag.celular || ag.cliente_celular || '';
  if (modalEmail) modalEmail.value = ag.email || ag.cliente_email || '';
  if (modalName) modalName.value = ag.nome || ag.cliente || ag.cliente_nome || '';
  if (modalGuide) modalGuide.value = ag.guia || '';
  if (modalQuantity) modalQuantity.value = ag.qtd || ag.qtd_pessoas || 1;
  if (modalStatus) modalStatus.value = ag.status || 'Pendente';

  const modalTitle = modal.querySelector('#modalTitle');
  if (modalTitle) modalTitle.textContent = 'Editar reserva';
  if (modalDelete) modalDelete.style.display = 'inline-block';
  modal.classList.remove('hidden');
};

const initReservationManagement = () => {
  const tableBody = document.getElementById('reservationsBody');
  const filterFrom = document.getElementById('filterFrom');
  const filterTo = document.getElementById('filterTo');
  const filterTour = document.getElementById('filterTour');
  const filterStatus = document.getElementById('filterStatus');
  const filterModality = document.getElementById('filterModality');
  const addReservationBtn = document.getElementById('addReservation');
  const modal = document.getElementById('reservationModal');
  const modalTour = document.getElementById('modalTour');
  const modalDate = document.getElementById('modalDate');
  const modalTime = document.getElementById('modalTime');
  const modalLanguage = document.getElementById('modalLanguage');
  const modalModality = document.getElementById('modalModality');
  const modalPhone = document.getElementById('modalPhone');
  const modalEmail = document.getElementById('modalEmail');
  const modalGuide = document.getElementById('modalGuide');
  const modalQuantity = document.getElementById('modalQuantity');
  const modalStatus = document.getElementById('modalStatus');
  const modalSave = document.getElementById('modalSave');
  const modalCancel = document.getElementById('modalCancel');
  const modalDelete = document.getElementById('modalDelete');
  const deleteConfirmation = document.getElementById('deleteConfirmation');
  const deleteSlider = document.getElementById('deleteSlider');
  const deleteSliderLabel = document.getElementById('deleteSliderLabel');
  const modalDeleteConfirm = document.getElementById('modalDeleteConfirm');
  const modalDeleteCancel = document.getElementById('modalDeleteCancel');
  const reservationAlert = document.getElementById('reservationAlert');
  const reservationAlertText = document.getElementById('reservationAlertText');
  const reservationAlertClose = document.querySelector('.reservations-alert-close');
  let reservationAlertTimer = null;
  if (!tableBody) return;

  const hideReservationAlert = () => {
    if (!reservationAlert) return;
    reservationAlert.classList.add('hidden');
    reservationAlert.classList.remove('visible', 'info', 'success', 'error');
    if (reservationAlertText) reservationAlertText.textContent = '';
    if (reservationAlertTimer) {
      clearTimeout(reservationAlertTimer);
      reservationAlertTimer = null;
    }
  };

  const showReservationAlert = (message, type = 'info', duration = 6000) => {
    if (!reservationAlert || !reservationAlertText) return;
    reservationAlertText.textContent = message;
    reservationAlert.classList.remove('hidden', 'info', 'success', 'error');
    reservationAlert.classList.add('visible', type);
    if (reservationAlertTimer) {
      clearTimeout(reservationAlertTimer);
    }
    if (duration > 0) {
      reservationAlertTimer = setTimeout(hideReservationAlert, duration);
    }
  };

  if (reservationAlertClose) {
    reservationAlertClose.addEventListener('click', hideReservationAlert);
  }

  const clearAllReservationAlerts = () => {
    hideReservationAlert();
    const feed = document.getElementById('importantInfoFeed');
    if (!feed) return;

    const dismissedIds = getDismissedImportantInfoItems();
    feed.querySelectorAll('.important-info-item').forEach((item) => {
      const itemId = item.getAttribute('data-important-info-id');
      if (itemId && !dismissedIds.includes(itemId)) {
        dismissedIds.push(itemId);
      }
    });
    setDismissedImportantInfoItems(dismissedIds);
    feed.innerHTML = '<div class="important-info-empty" style="padding:0.85rem 1rem; border-radius:12px; background:rgba(255,255,255,0.82); color:#4b5563;">Nenhuma atividade recente de cliente encontrada.</div>';
  };

  const clearAllAlertsBtn = document.getElementById('clearAllAlertsBtn');
  if (clearAllAlertsBtn) {
    clearAllAlertsBtn.addEventListener('click', clearAllReservationAlerts);
  }

  const whatsappLinkBtn = document.querySelector('.whatsapp-link');
  if (whatsappLinkBtn) {
    whatsappLinkBtn.addEventListener('click', () => {
      const number = normalizeWhatsappNumber(modalPhone?.value || '');
      if (!number) {
        window.alert('Informe um número de celular válido para abrir no WhatsApp.');
        return;
      }
      window.open(`https://wa.me/${number}`, '_blank');
    });
  }

  // Ensure delete confirmation is hidden until Delete is clicked
  if (deleteConfirmation) {
    deleteConfirmation.classList.add('hidden');
    deleteConfirmation.style.display = 'none';
  }

  const getFilters = () => {
    const from = filterFrom?.value ? new Date(filterFrom.value) : null;
    const to = filterTo?.value ? new Date(filterTo.value) : null;
    const status = filterStatus?.value || 'all';
    const tour = filterTour?.value || 'all';
    const modality = filterModality?.value || 'all';
    return { from, to, status, tour, modality };
  };

  // Não aplica filtro de data automático na abertura.
  // O usuário define o período manualmente quando desejar.

  // Ensure default filter options are set
  if (filterStatus) filterStatus.value = 'all';
  if (filterTour) filterTour.value = 'all';
  if (filterModality) filterModality.value = 'all';

  let activeEditIndex = null;
  let isAdding = false;

  const closeModal = () => {
    if (!modal) return;
    modal.classList.add('hidden');
    activeEditIndex = null;
    isAdding = false;
    hideDeleteConfirmation();
  };

  const parseLanguages = (text) => {
    if (!text) return [];
    return text
      .split(/[,;]+/) // separa por vírgula ou ponto-e-vírgula
      .map(t => t.trim())
      .filter(Boolean);
  };

  const normalizeWhatsappNumber = (raw) => {
    if (!raw) return null;

    let digits = raw.replace(/\D/g, '');
    if (!digits) return null;

    // Remove prefix internacional 00 (ex: 0055...) para normalizar
    if (digits.startsWith('00')) {
      digits = digits.replace(/^0+/, '');
    }

    // Se já veio com DDI (ex: 55, 1, 44), mantém como está
    // Se for um número local curto (até 11 dígitos), assume Brasil (55)
    if (digits.length <= 11) {
      digits = digits.replace(/^0+/, '');
      if (!digits.startsWith('55')) {
        digits = `55${digits}`;
      }
    }

    return digits;
  };

  const populateModalOptions = () => {
    const reservations = getReservations();

    const indexTours = [
      'Centro Histórico',
      'Santa Teresa',
      'Pedra do Sal: Samba e Herança Afrobrasileira',
      'Copacabana e Ipanema',
      'Favela Tour (Morro Dona Marta)',
      'Tour das Praias',
      'Tour Cultural do Centro'
    ];

    const indexLanguages = ['Português', 'Inglês', 'Espanhol'];

    const reservationTours = [...new Set(reservations.map(r => r.tour).filter(Boolean))];
    const tours = [...new Set([...indexTours, ...reservationTours])].sort();

    const reservationLanguages = reservations
      .flatMap(r => parseLanguages(r.language))
      .filter(Boolean);
    const languages = [...new Set([...indexLanguages, ...reservationLanguages])].sort();

    if (modalTour) {
      const current = modalTour.value;
      modalTour.innerHTML = '<option value="">Selecione um tour</option>' + tours.map(t => `
        <option value="${t}"${t === current ? ' selected' : ''}>${t}</option>
      `).join('');
    }

    if (modalLanguage) {
      const current = modalLanguage.value;
      modalLanguage.innerHTML = '<option value="">Selecione um idioma</option>' + languages.map(l => `
        <option value="${l}"${l === current ? ' selected' : ''}>${l}</option>
      `).join('');
    }
  };

  const openEditModal = (index) => {
    const reservations = getReservations();
    const reservation = reservations[index];
    if (!reservation || !modal) return;

    hideDeleteConfirmation();

    isAdding = false;
    activeEditIndex = index;
    pendingUpdateId = reservations[index]?.id || null;
    modal.querySelector('#modalTitle').textContent = 'Editar reserva';
    if (modalDelete) modalDelete.style.display = 'inline-block';
    hideDeleteConfirmation();

    populateModalOptions();

    modalTour.value = reservation.tour || '';

    const when = new Date(reservation.when);
    modalDate.value = when.toISOString().slice(0, 10);
    modalTime.value = when.toTimeString().slice(0, 5);

    modalLanguage.value = reservation.language || reservation.idioma || '';
    modalModality.value = reservation.modality || reservation.modalidade || 'free';
    modalPhone.value = reservation.phone || reservation.celular || '';
    modalEmail.value = reservation.email || '';
    modalName.value = reservation.name || reservation.nome || '';
    modalGuide.value = reservation.guide || reservation.guia || '';
    modalQuantity.value = reservation.quantity || reservation.qtd || reservation.qtd_pessoas || 1;
    modalStatus.value = reservation.status || 'Pendente';

    modal.classList.remove('hidden');
  };

  const openAddModal = () => {
    if (!modal) return;

    hideDeleteConfirmation();

    isAdding = true;
    activeEditIndex = null;
    pendingUpdateId = null;

    modal.querySelector('#modalTitle').textContent = 'Adicionar reserva';
    if (modalDelete) modalDelete.style.display = 'none';
    hideDeleteConfirmation();

    populateModalOptions();

    modalTour.value = '';    modalModality.value = 'free';    const today = new Date();
    modalDate.value = today.toISOString().slice(0, 10);
    modalTime.value = '10:00';

    modalLanguage.value = '';
    modalPhone.value = '';
    modalEmail.value = '';
    modalName.value = '';
    modalGuide.value = '';
    modalQuantity.value = 1;
    modalStatus.value = 'Pendente';

    modal.classList.remove('hidden');
  };

  const saveModal = async () => {
    const dateStr = modalDate.value;
    const timeStr = modalTime.value;
    if (!dateStr || !timeStr) {
      window.alert('Por favor informe data e hora.');
      return;
    }

    const when = new Date(`${dateStr}T${timeStr}`);
    if (Number.isNaN(when.getTime())) {
      window.alert('Data/hora inválida. Use AAAA-MM-DD e HH:MM.');
      return;
    }

    const currentUserEmail = localStorage.getItem('userEmail');
    const novaReserva = {
      tour: modalTour.value.trim(),
      data: dateStr,
      hora: timeStr,
      idioma: modalLanguage.value.trim(),
      modalidade: modalModality?.value || 'free',
      guia: modalGuide.value.trim(),
      quantas_pessoas: parseInt(modalQuantity.value, 10) || 0,
      pessoas: '',
      nome: modalName?.value.trim() || 'Admin Manual',
      celular: modalPhone.value.trim() || '',
      email: modalEmail?.value.trim() || '',
      status: modalStatus?.value || 'Pendente',
      admin_email: currentUserEmail || ''
    };

    console.log('Enviando dados:', novaReserva);

    const isEdit = Boolean(pendingUpdateId);
    if (isEdit) {
      novaReserva.id = pendingUpdateId;
    }

    try {
      const response = await fetchWithApiFallback(`/${isEdit ? 'update_agendamento' : 'add_agendamento'}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(novaReserva)
      });

      const result = await response.json().catch(() => ({ message: 'Resposta não JSON' }));

      if (response.ok) {
        showReservationAlert(isEdit ? 'Reserva atualizada com sucesso!' : 'Reserva salva no banco de dados com sucesso!', 'success');

        // Atualiza tabela do backend após inclusão
        carregarAgendamentosDoBanco();

        // Sincroniza localmente também (opcional)
        const reservations = getReservations();
        const reservationData = {
          tour: novaReserva.tour,
          when: when.toISOString(),
          language: novaReserva.idioma,
          modality: novaReserva.modalidade,
          phone: novaReserva.celular,
          email: novaReserva.email,
          name: novaReserva.nome,
          guide: novaReserva.guia,
          quantity: novaReserva.quantas_pessoas,
          status: novaReserva.status,
          url: ''
        };

        if (isAdding) {
          reservations.unshift(reservationData);
        } else {
          if (activeEditIndex !== null) {
            reservations[activeEditIndex] = reservationData;
          }
        }

        pendingUpdateId = null;
        setReservations(reservations);
        closeModal();
        render();
        // Não forçar reload para a atualização instantânea já ser feita pelo carregarAgendamentosDoBanco
      } else {
        const message = result?.message || `Status ${response.status}`;
        showReservationAlert('Erro ao salvar: ' + message, 'error');
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      showReservationAlert('Não foi possível conectar ao servidor. ' + (error.message || ''), 'error');       
    }
  };

  const deleteModalReservation = async () => {
    if (!pendingUpdateId && activeEditIndex === null) return;

    // Preferencialmente deletar do backend se houver id do registro
    if (pendingUpdateId) {
      try {
        const currentUserEmail = localStorage.getItem('userEmail');
        const response = await fetchWithApiFallback('/delete_agendamento', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id: pendingUpdateId, admin_email: currentUserEmail })
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          const msg = result?.message || `Status ${response.status}`;
          showReservationAlert('Não foi possível excluir no servidor: ' + msg, 'error');
          return;
        }

        showReservationAlert('Agendamento removido com sucesso!', 'success');
        pendingUpdateId = null;
        activeEditIndex = null;

        // Recarrega do backend para garantir consistência
        carregarAgendamentosDoBanco();
      } catch (error) {
        console.error('Erro de exclusão:', error);
        showReservationAlert('Erro ao excluir no servidor: ' + (error.message || ''), 'error');        
      }
    } else {
      // fallback local (sem id)
      const reservations = getReservations();
      reservations.splice(activeEditIndex, 1);
      setReservations(reservations);
      activeEditIndex = null;
      render();
      showReservationAlert('Agendamento removido com sucesso!', 'success');
    }

    hideDeleteConfirmation();
    closeModal();
  };

  const showDeleteConfirmation = () => {
    if (!deleteConfirmation || !modalDeleteConfirm || !deleteSlider) return;
    deleteConfirmation.classList.remove('hidden');
    deleteConfirmation.style.display = 'block';
    deleteSlider.value = '0';
    deleteSliderLabel.textContent = 'Arraste até o final';
    modalDeleteConfirm.disabled = true;
  };

  const hideDeleteConfirmation = () => {
    if (!deleteConfirmation) return;
    deleteConfirmation.classList.add('hidden');
    deleteConfirmation.style.display = 'none';
  };

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
  }

  if (modalSave) modalSave.addEventListener('click', saveModal);
  if (modalCancel) modalCancel.addEventListener('click', closeModal);
  if (modalDelete) modalDelete.addEventListener('click', showDeleteConfirmation);
  if (deleteSlider) {
    deleteSlider.addEventListener('input', () => {
      const value = Number(deleteSlider.value);
      if (!deleteSliderLabel) return;
      if (value >= 100) {
        deleteSliderLabel.textContent = 'Solte para confirmar';
        if (modalDeleteConfirm) modalDeleteConfirm.disabled = false;
      } else {
        deleteSliderLabel.textContent = 'Arraste até o final';
        if (modalDeleteConfirm) modalDeleteConfirm.disabled = true;
      }
    });
  }
  if (modalDeleteConfirm) modalDeleteConfirm.addEventListener('click', deleteModalReservation);
  if (modalDeleteCancel) modalDeleteCancel.addEventListener('click', hideDeleteConfirmation);

  if (addReservationBtn) {
    addReservationBtn.addEventListener('click', () => {
      openAddModal();
    });
  }

  const applyFilters = (items) => {
    const { from, to, status, tour, modality } = getFilters();
    return items.filter(({ r }) => {
      const date = new Date(r.when);
      if (from && date < from) return false;
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        if (date > endOfDay) return false;
      }
      if (status && status !== 'all' && r.status !== status) return false;
      if (tour && tour !== 'all' && r.tour !== tour) return false;
      if (modality && modality !== 'all' && (r.modality || 'free') !== modality) return false;
      return true;
    });
  };

  const populateTourFilter = (reservations) => {
    if (!filterTour) return;
    const current = filterTour.value || 'all';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingTours = [...new Set(reservations
      .filter(r => {
        const date = new Date(r.when);
        return date >= today;
      })
      .map(r => r.tour)
      .filter(Boolean))].sort();

    filterTour.innerHTML = '<option value="all">Todos</option>' + upcomingTours.map(t => `
      <option value="${t}"${t === current ? ' selected' : ''}>${t}</option>
    `).join('');
  };

  const render = () => {
    const reservations = getReservations();

    // Default window: from today to one day after the last reservation date
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const lastDate = reservations
      .map(r => new Date(r.when))
      .filter(d => !Number.isNaN(d.getTime()))
      .sort((a, b) => b - a)[0];
    const maxDate = lastDate ? new Date(lastDate.getTime() + 24 * 60 * 60 * 1000) : new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const defaultWindowReservations = reservations.filter(r => {
      const date = new Date(r.when);
      if (Number.isNaN(date.getTime())) return false;
      date.setHours(0, 0, 0, 0);
      return date >= now && date <= maxDate;
    });

    populateTourFilter(defaultWindowReservations);

    const itemsWithIndex = defaultWindowReservations.map((r, index) => ({ r, index }));
    const filteredItems = applyFilters(itemsWithIndex);

    tableBody.innerHTML = '';
    renderQuickStats(reservations);

    if (!filteredItems.length) {
      tableBody.innerHTML = '<tr><td colspan="8">Nenhuma reserva encontrada.</td></tr>';
      return;
    }

    filteredItems.forEach(({ r, index }) => {
      const row = document.createElement('tr');
      row.tabIndex = 0; // make row focusable for keyboard + focus styling
      const dateObj = new Date(r.when);
      const date = dateObj.toLocaleDateString();
      const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const statusValue = (r.status || 'Pendente');
      let statusStyle = '';
      switch (statusValue) {
        case 'Cancelado':
          statusStyle = 'color: #6b7280;';
          break;
        case 'Pendente':
          statusStyle = 'color: #f59e0b;';
          break;
        case 'Confirmado':
          statusStyle = 'color: #facc15;';
          break;
        case 'Finalizado':
          statusStyle = 'color: #16a34a;';
          break;
        default:
          statusStyle = 'color: #374151;';
      }

      row.innerHTML = `
        <td data-label="Tour">${r.tour}</td>
        <td data-label="Idioma">${r.language || '-'}</td>
        <td data-label="Modalidade">${r.modality === 'privado' ? 'Privado' : 'Free'}</td>
        <td data-label="Guia">${r.guide || '-'}</td>
        <td data-label="Data">${date}</td>
        <td data-label="Hora">${time}</td>
        <td data-label="Pessoas">${r.quantity || 1}</td>
        <td data-label="Status" style="${statusStyle} font-weight: 700;">${statusValue}</td>
      `;
      tableBody.appendChild(row);

      let longPressTimer;
      const startLongPress = (event) => {
        if (event.target.closest('button')) return;
        row.classList.add('pressed');
        longPressTimer = window.setTimeout(() => openEditModal(index), 650);
      };
      const cancelLongPress = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        row.classList.remove('pressed');
      };

      // Open modal on double click / double tap
      row.addEventListener('dblclick', () => openEditModal(index));

      // Handle long press
      row.addEventListener('mousedown', startLongPress);
      row.addEventListener('touchstart', startLongPress);
      row.addEventListener('mouseup', cancelLongPress);
      row.addEventListener('mouseleave', cancelLongPress);
      row.addEventListener('touchend', cancelLongPress);
      row.addEventListener('touchcancel', cancelLongPress);

      // Allow keyboard access (Enter opens edit modal)
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openEditModal(index);
        }
      });
    });

    tableBody.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        const index = Number(btn.getAttribute('data-index'));
        const reservations = getReservations();
        const reservation = reservations[index];
        if (!reservation) return;

        switch (action) {
          case 'increase':
            reservation.quantity = (reservation.quantity || 1) + 1;
            break;
          case 'decrease':
            reservation.quantity = Math.max(1, (reservation.quantity || 1) - 1);
            break;
          case 'confirm':
            reservation.status = 'Confirmado';
            break;
          case 'cancel':
            reservation.status = 'Cancelado';
            break;
          case 'remove':
            reservations.splice(index, 1);
            break;
        }

        setReservations(reservations);
        render();
      });
    });
  };

  const renderQuickStats = (reservations) => {
    const pendingCount = reservations.filter(r => r.status === 'Pendente').length;
    const confirmedCount = reservations.filter(r => r.status === 'Confirmado').length;
    const finalizedCount = reservations.filter(r => r.status === 'Finalizado').length;

    // Determine the next tour reservation (earliest future date)
    const futureReservations = reservations
      .map(r => ({
        ...r,
        date: new Date(r.when)
      }))
      .filter(r => r.date > new Date())
      .sort((a, b) => a.date - b.date);

    const next = futureReservations[0];

    const pendingEl = document.getElementById('statPending');
    const confirmedEl = document.getElementById('statConfirmed');
    const finalizedEl = document.getElementById('statFinalized');
    const nextEl = document.getElementById('statNext');
    if (pendingEl) pendingEl.textContent = String(pendingCount);
    if (confirmedEl) confirmedEl.textContent = String(confirmedCount);
    if (finalizedEl) finalizedEl.textContent = String(finalizedCount);

    if (nextEl) {
      if (!next) {
        nextEl.textContent = '-';
      } else {
        const totalPeople = reservations
          .filter(r => r.tour === next.tour && r.when === next.when)
          .reduce((sum, r) => sum + (r.quantity || 0), 0);

        nextEl.textContent = `${next.tour} - ${next.date.toLocaleDateString()} ${next.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${totalPeople} pessoas)`;
      }
    }
  };

  const attachFilters = () => {
    [filterFrom, filterTo, filterStatus, filterTour, filterModality].forEach(el => {
      if (!el) return;
      el.addEventListener('change', carregarAgendamentosDoBanco);
    });

    if (addReservationBtn) {
      addReservationBtn.addEventListener('click', () => {
        openAddModal();
      });
    }
  };

  attachFilters();

  // Render the table immediately after initialization
  render();
};

const setUsdRateFields = (rate) => {
  const formatted = Number.isFinite(rate) ? rate.toFixed(4) : '';
  [
    document.getElementById('usdRate'),
    document.getElementById('usdRateFloating')
  ].forEach((input) => {
    if (input) {
      input.value = formatted;
    }
  });
};

const fetchCurrentUsdBrlRate = async () => {
  const endpoints = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.frankfurter.app/latest?from=USD&to=BRL',
    'https://api.exchangerate-api.com/v4/latest/USD'
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const rate = Number(data?.rates?.BRL);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error('Cotação inválida recebida');
      }

      setUsdRateFields(rate);
      return rate;
    } catch (error) {
      console.warn('[Gerenciamento] Falha ao buscar cotação USD/BRL em', url, error);
    }
  }

  setUsdRateFields(5.0);
  return 5.0;
};

const createCurrencyConverter = ({ brlInput, rateInput, resultInput }) => {
  if (!brlInput || !rateInput || !resultInput) return null;

  let lastEdited = 'brl';

  const parseValue = (value) => {
    const normalized = String(value || '')
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[^0-9.\-]/g, '');
    return Number(normalized);
  };

  const convertToUsd = () => {
    if (String(brlInput.value || '').trim() === '') {
      resultInput.value = '';
      return;
    }

    const brlValue = parseValue(brlInput.value);
    const rateValue = parseValue(rateInput.value);

    if (!Number.isFinite(brlValue) || brlValue < 0 || !Number.isFinite(rateValue) || rateValue <= 0) {
      resultInput.value = '';
      return;
    }

    const usdValue = brlValue / rateValue;
    resultInput.value = usdValue.toFixed(2);
  };

  const convertToBrl = () => {
    const usdValue = parseValue(resultInput.value);
    const rateValue = parseValue(rateInput.value);

    if (!Number.isFinite(usdValue) || usdValue < 0 || !Number.isFinite(rateValue) || rateValue <= 0) {
      brlInput.value = '';
      return;
    }

    const brlValue = usdValue * rateValue;
    brlInput.value = brlValue.toFixed(2);
  };

  const convert = () => {
    if (lastEdited === 'usd') {
      convertToBrl();
    } else {
      convertToUsd();
    }
  };

  brlInput.addEventListener('input', () => {
    lastEdited = 'brl';
    convertToUsd();
  });
  resultInput.addEventListener('input', () => {
    lastEdited = 'usd';
    convertToBrl();
  });
  rateInput.addEventListener('input', () => {
    if (lastEdited === 'usd') {
      convertToBrl();
    } else {
      convertToUsd();
    }
  });

  return { convert };
};

const evaluateCalcExpression = (expression) => {
  const expr = String(expression || '').trim();
  if (!expr) return '';

  const normalizedExpression = expr.replace(/,/g, '.');
  if (!/^[0-9+\-*/().\s]+$/.test(normalizedExpression)) {
    throw new Error('Expressão inválida');
  }

  // Avalia expressões simples de calculadora com segurança relativa.
  // Apenas operadores, parênteses, números, ponto e espaços são permitidos.
  return Function(`"use strict"; return (${normalizedExpression})`)();
};

const initFloatingStandardCalculator = () => {
  const display = document.getElementById('floatingCalcDisplay');
  const keypad = document.querySelector('.floating-calc-keypad');
  if (!display || !keypad) return;

  const setDisplay = (value) => {
    display.value = String(value);
  };

  const appendValue = (value) => {
    display.value = `${display.value || ''}${value}`;
  };

  const clearDisplay = () => {
    setDisplay('');
  };

  const backspace = () => {
    setDisplay(display.value.slice(0, -1));
  };

  const calculate = () => {
    try {
      const expression = display.value.trim();
      const result = evaluateCalcExpression(expression);
      if (Number.isFinite(result)) {
        const formattedResult = String(result).replace('.', ',');
        setDisplay(`${expression}=${formattedResult}`);
      } else {
        setDisplay('Erro');
      }
    } catch (error) {
      setDisplay('Erro');
      setTimeout(() => {
        if (display.value === 'Erro') {
          clearDisplay();
        }
      }, 800);
    }
  };

  const applyPercent = () => {
    const tailMatch = display.value.match(/([+\-*/]?)(-?[0-9]+(?:[.,][0-9]+)?)$/);
    if (!tailMatch) return;

    const [full, operator, numStr] = tailMatch;
    const before = display.value.slice(0, display.value.length - full.length);
    const num = parseFloat(numStr.replace(',', '.'));
    if (!Number.isFinite(num)) return;

    let resultNum;
    if (operator === '+' || operator === '-') {
      const leftMatch = before.match(/(-?[0-9]+(?:[.,][0-9]+)?)\s*$/);
      const leftNum = leftMatch ? parseFloat(leftMatch[1].replace(',', '.')) : NaN;
      resultNum = Number.isFinite(leftNum) ? (leftNum * num) / 100 : num / 100;
    } else {
      resultNum = num / 100;
    }

    setDisplay(`${before}${operator}${String(resultNum).replace('.', ',')}`);
  };

  keypad.querySelectorAll('button[data-value]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.value;
      if (value === 'C') {
        clearDisplay();
      } else if (value === '⌫') {
        backspace();
      } else if (value === '=') {
        calculate();
      } else if (value === '%') {
        applyPercent();
      } else {
        appendValue(value);
      }
    });
  });

  const sanitizeInput = () => {
    display.value = display.value.replace(/[^0-9+=\-*/(),.\s]/g, '');
    display.value = display.value.replace(/\./g, ',');
  };

  display.addEventListener('input', sanitizeInput);

  display.addEventListener('keydown', (event) => {
    const allowedKeys = [
      '0','1','2','3','4','5','6','7','8','9',
      '+','-','*','/','(',')',',','.',
      'Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter','Tab','Escape'
    ];

    const hasResult = display.value.includes('=');
    const currentResult = hasResult ? display.value.split('=').pop().trim() : '';
    const isOperatorKey = ['+','-','*','/'].includes(event.key);
    const isNewExprKey = /^[0-9(.,]$/.test(event.key);

    if (event.key === 'Enter') {
      event.preventDefault();
      calculate();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      clearDisplay();
      return;
    }

    if (hasResult && currentResult) {
      if (isOperatorKey) {
        event.preventDefault();
        display.value = `${currentResult}${event.key}`;
        return;
      }
      if (isNewExprKey) {
        event.preventDefault();
        display.value = event.key;
        return;
      }
    }

    if (!allowedKeys.includes(event.key)) {
      event.preventDefault();
    }
  });
};

const getTranslatorLangs = (direction) => {
  switch (direction) {
    case 'pt-en': return { source: 'pt', target: 'en' };
    case 'en-pt': return { source: 'en', target: 'pt' };
    case 'pt-es': return { source: 'pt', target: 'es' };
    case 'es-pt': return { source: 'es', target: 'pt' };
    default: return { source: 'pt', target: 'en' };
  }
};

const chooseBestAlternateTranslation = (alternates, target) => {
  if (!Array.isArray(alternates)) return null;

  const scored = alternates.map((item, index) => {
    const candidate = String(item?.[0] || '').trim();
    let score = 0;
    if (!candidate) return { candidate, score, index };

    if (/^[A-ZÀÂÄÁÃ]/.test(candidate)) score += 2;
    if (/[,.!?¿¡]/.test(candidate)) score += 2;
    if (/^hola\b/i.test(candidate) && target === 'es') score += 3;
    if (/^hi\b/i.test(candidate) && target === 'en') score += 3;
    if (/^hey\b/i.test(candidate) && target === 'en') score += 1;
    if (candidate.includes("'")) score += 1;
    if (candidate.endsWith('?')) score += 1;
    return { candidate, score, index };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  return scored[0]?.candidate || null;
};

const polishTranslatedText = (text, target) => {
  let result = String(text || '').trim();
  if (!result) return result;

  if (target === 'es') {
    if (/^hola\s+/i.test(result) && !/^Hola,\s+¿/.test(result)) {
      result = result.replace(/^hola\s+/i, 'Hola, ¿');
      if (!result.endsWith('?')) {
        result += '?';
      }
      result = result.replace(/\s+\?$/, '?');
    }
    result = result.replace(/\bcomo\b/gi, 'cómo');
  }

  if (target === 'en') {
    if (/^hey\s+/i.test(result)) {
      result = result.replace(/^hey\s+/i, 'Hey ');
      if (result.toLowerCase().includes("how's it going") && !/Hey,\s+how's/i.test(result)) {
        result = result.replace(/^Hey\s+/i, 'Hey, ');
      }
    }
    if (/^[a-z]/.test(result)) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
  }

  return result.trim();
};

const translateText = async (text, direction) => {
  const { source, target } = getTranslatorLangs(direction);
  const rawText = String(text || '').trim();
  if (!rawText) return '';

  const query = encodeURIComponent(rawText);
  const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&dt=at&dt=rm&q=${query}`;

  try {
    const response = await fetch(googleUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (response.ok) {
      const data = await response.json();
      let translated = '';

      if (Array.isArray(data?.[0])) {
        translated = data[0].map((seg) => seg[0]).join('');
      }

      const alternate = data?.[5]?.[0]?.[2];
      const bestAlternate = chooseBestAlternateTranslation(alternate, target);
      if (bestAlternate) {
        translated = bestAlternate;
      }

      if (typeof translated === 'string' && translated.trim()) {
        translated = polishTranslatedText(translated, target);
        return translated;
      }
    }
  } catch (error) {
    console.warn('Google Translate attempt failed:', googleUrl, error);
  }

  const fallbackUrl = `https://api.mymemory.translated.net/get?q=${query}&langpair=${source}|${target}`;
  const fallbackResponse = await fetch(fallbackUrl);
  if (!fallbackResponse.ok) {
    throw new Error(`HTTP ${fallbackResponse.status}`);
  }

  const fallbackData = await fallbackResponse.json();
  const fallbackTranslated = fallbackData?.responseData?.translatedText;
  return typeof fallbackTranslated === 'string' ? fallbackTranslated : '';
};

const normalizeTranslatedPunctuation = (text) => {
  let normalized = String(text || '').trim();
  if (!normalized) return '';

  // Remove espaços antes de pontuação e garante espaço após pontuação.
  normalized = normalized.replace(/\s+([.,!?;:])/g, '$1');
  normalized = normalized.replace(/([.,!?;:])(?=[^\s\n])/g, '$1 ');
  normalized = normalized.replace(/\s{2,}/g, ' ');
  normalized = normalized.replace(/\s+([…])/g, '$1');

  return normalized.trim();
};

const TRANSLATION_HISTORY_KEY = 'translationHistory';

const isSmallFloatingToolsViewport = () => window.matchMedia('(max-width: 900px)').matches;

const updateFloatingToolsBackdropState = () => {
  const translatePanel = document.getElementById('translateFloatingPanel');
  const financePanel = document.getElementById('financeCalculatorPanel');
  const backdrop = document.getElementById('floatingToolsBackdrop');
  if (!translatePanel || !financePanel || !backdrop) return;

  const anyPanelOpen = !translatePanel.classList.contains('hidden') || !financePanel.classList.contains('hidden');
  const shouldShowBackdrop = isSmallFloatingToolsViewport() && anyPanelOpen;

  backdrop.classList.toggle('active', shouldShowBackdrop);
  backdrop.setAttribute('aria-hidden', String(!shouldShowBackdrop));
};

const closeFloatingToolsPanels = () => {
  const translatePanel = document.getElementById('translateFloatingPanel');
  const financePanel = document.getElementById('financeCalculatorPanel');

  if (translatePanel) {
    translatePanel.classList.add('hidden');
    translatePanel.setAttribute('aria-hidden', 'true');
  }

  if (financePanel) {
    financePanel.classList.add('hidden');
    financePanel.setAttribute('aria-hidden', 'true');
  }

  updateFloatingToolsBackdropState();
};

const initTranslationPanel = () => {
  const translateButton = document.getElementById('translateFloatingBtn');
  const translatePanel = document.getElementById('translateFloatingPanel');
  const closeTranslatePanel = document.getElementById('closeTranslatePanel');
  const translateSubmit = document.getElementById('translateSubmit');
  const copyTranslationBtn = document.getElementById('copyTranslationBtn');
  const saveTranslationBtn = document.getElementById('saveTranslationBtn');
  const sourceInput = document.getElementById('translatorSource');
  const sourceLangSelect = document.getElementById('translatorSourceLang');
  const targetLangSelect = document.getElementById('translatorTargetLang');
  const targetOutput = document.getElementById('translatorResult');
  const historyList = document.getElementById('translationHistoryList');

  if (!translateButton || !translatePanel || !closeTranslatePanel || !translateSubmit || !saveTranslationBtn || !copyTranslationBtn || !sourceInput || !sourceLangSelect || !targetLangSelect || !targetOutput || !historyList) return;

  const getHistory = () => {
    try {
      const raw = localStorage.getItem(TRANSLATION_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveHistory = (items) => {
    localStorage.setItem(TRANSLATION_HISTORY_KEY, JSON.stringify(items));
  };

  const renderSavedTranslations = () => {
    const history = getHistory();
    if (!history.length) {
      historyList.innerHTML = '<div class="translation-history-empty">Nenhuma tradução salva.</div>';
      return;
    }

    historyList.innerHTML = history.map((item, index) => {
      return `
        <div class="translation-history-item" data-translation-index="${index}">
          <div class="translation-history-meta">
            <strong>${item.sourceLang.toUpperCase()} → ${item.targetLang.toUpperCase()}</strong>
            <button type="button" class="translation-history-remove" data-delete-index="${index}" aria-label="Excluir tradução">×</button>
          </div>
          <div class="translation-history-text">${item.sourceText}</div>
        </div>
      `;
    }).join('');

    historyList.querySelectorAll('.translation-history-item').forEach((item) => {
      item.addEventListener('click', () => {
        const index = Number(item.dataset.translationIndex);
        const history = getHistory();
        const entry = history[index];
        if (!entry) return;
        sourceInput.value = entry.sourceText;
        targetOutput.value = entry.resultText;
        sourceLangSelect.value = entry.sourceLang;
        targetLangSelect.value = entry.targetLang;
      });
    });

    historyList.querySelectorAll('.translation-history-remove').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const index = Number(button.dataset.deleteIndex);
        const history = getHistory();
        if (index < 0 || index >= history.length) return;
        history.splice(index, 1);
        saveHistory(history);
        renderSavedTranslations();
      });
    });
  };

  const togglePanel = () => {
    const isHidden = translatePanel.classList.toggle('hidden');
    translatePanel.setAttribute('aria-hidden', String(isHidden));
    if (!isHidden) {
      sourceInput.focus();
      renderSavedTranslations();
    }
    updateFloatingToolsBackdropState();
  };

  translateButton.addEventListener('click', () => {
    togglePanel();
    const financePanel = document.getElementById('financeCalculatorPanel');
    if (!financePanel?.classList.contains('hidden')) {
      financePanel.classList.add('hidden');
      financePanel.setAttribute('aria-hidden', 'true');
      updateFloatingToolsBackdropState();
    }
  });

  closeTranslatePanel.addEventListener('click', () => {
    translatePanel.classList.add('hidden');
    translatePanel.setAttribute('aria-hidden', 'true');
    updateFloatingToolsBackdropState();
  });

  const doTranslate = async () => {
    const value = sourceInput.value.trim();
    if (!value) {
      targetOutput.value = '';
      return;
    }

    const direction = `${sourceLangSelect.value}-${targetLangSelect.value}`;
    targetOutput.value = 'Traduzindo...';
    try {
      let translated = await translateText(value, direction);
      translated = normalizeTranslatedPunctuation(translated);
      targetOutput.value = translated || 'Nenhum resultado encontrado';
    } catch (error) {
      console.warn('Erro ao traduzir:', error);
      targetOutput.value = 'Erro ao traduzir';
    }
  };

  const saveTranslation = () => {
    const sourceText = sourceInput.value.trim();
    const resultText = targetOutput.value.trim();
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

    if (!sourceText || !resultText || !sourceLang || !targetLang) return;
    const history = getHistory();
    const newItem = {
      sourceLang,
      targetLang,
      sourceText,
      resultText,
      savedAt: Date.now()
    };

    history.unshift(newItem);
    if (history.length > 20) history.pop();
    saveHistory(history);
    renderSavedTranslations();
  };

  translateSubmit.addEventListener('click', doTranslate);
  copyTranslationBtn.addEventListener('click', async () => {
    const textToCopy = targetOutput.value.trim();
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      const original = copyTranslationBtn.innerHTML;
      copyTranslationBtn.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i> Copiado';
      setTimeout(() => {
        copyTranslationBtn.innerHTML = original;
      }, 1200);
    } catch (err) {
      console.warn('Falha ao copiar tradução:', err);
      alert('Não foi possível copiar a tradução.');
    }
  });
  saveTranslationBtn.addEventListener('click', saveTranslation);
  sourceInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      doTranslate();
    }
  });
};

const initCurrencyConverter = () => {
  const financeConverter = createCurrencyConverter({
    brlInput: document.getElementById('brlAmount'),
    rateInput: document.getElementById('usdRate'),
    resultInput: document.getElementById('usdResult')
  });

  const floatingConverter = createCurrencyConverter({
    brlInput: document.getElementById('brlAmountFloating'),
    rateInput: document.getElementById('usdRateFloating'),
    resultInput: document.getElementById('usdResultFloating')
  });

  window.convertCurrency = () => {
    financeConverter?.convert?.();
    floatingConverter?.convert?.();
  };

  fetchCurrentUsdBrlRate().then(() => window.convertCurrency()).catch(() => window.convertCurrency());
};

window.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('userRole');
  currentUserPermissions = getEffectivePermissionsForRole(role);

  if (!currentUserPermissions?.manageReservas) {
    alert('Acesso negado: sua conta não possui permissão para gerenciar reservas.');
    window.location.href = '/';
    return;
  }

  applyAccessControls(currentUserPermissions);

  if (document.getElementById('reservationsBody')) {
    initReservationManagement();
    initCurrencyConverter();
    initFloatingStandardCalculator();
    initTranslationPanel();
    attachSectionLinks();
    setupAccountModalEvents();
    setupRolesControls();
    initFinanceControls();

    // Inicialmente carregamos apenas a aba de reservas (sem pré-carregar contas ou gerenciamento)
    mostrarSecao('reservas');
    carregarAgendamentosDoBanco();
    loadImportantInfoFeed();

    if (importantInfoRefreshTimer) {
      clearInterval(importantInfoRefreshTimer);
    }
    importantInfoRefreshTimer = setInterval(loadImportantInfoFeed, 15000);
  }

  const calculatorButton = document.getElementById('financeFloatingCalc');
  const financePanel = document.getElementById('financeCalculatorPanel');
  const closeFinanceCalculator = document.getElementById('closeFinanceCalculator');
  const translatePanel = document.getElementById('translateFloatingPanel');
  const floatingToolsBackdrop = document.getElementById('floatingToolsBackdrop');

  if (calculatorButton && financePanel) {
    calculatorButton.addEventListener('click', () => {
      const isHidden = financePanel.classList.toggle('hidden');
      financePanel.setAttribute('aria-hidden', String(isHidden));
      if (!isHidden) {
        translatePanel?.classList.add('hidden');
        translatePanel?.setAttribute('aria-hidden', 'true');
        fetchCurrentUsdBrlRate()
          .then(() => window.convertCurrency?.())
          .catch(() => window.convertCurrency?.());
      }
      updateFloatingToolsBackdropState();
    });
  }

  if (closeFinanceCalculator && financePanel) {
    closeFinanceCalculator.addEventListener('click', () => {
      financePanel.classList.add('hidden');
      financePanel.setAttribute('aria-hidden', 'true');
      updateFloatingToolsBackdropState();
    });
  }

  if (floatingToolsBackdrop) {
    floatingToolsBackdrop.addEventListener('click', () => {
      closeFloatingToolsPanels();
    });
  }

  window.addEventListener('resize', updateFloatingToolsBackdropState);
  updateFloatingToolsBackdropState();

  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('gerenciamentoNav');

  let profileBtn = document.getElementById('profileBtn');
  const profileMenu = document.querySelector('.profile-menu');
  const langSelector = document.querySelector('#langSelector');
  const langList = document.querySelector('#langList');

  const mobileMenuState = { open: false, view: 'main' };
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

    container.setAttribute('aria-hidden', mobileMenuState.open ? 'false' : 'true');
    if (mobileMenuState.open) {
      container.classList.add('open');
    } else {
      container.classList.remove('open');
    }
  };

  const openMobileMenu = () => {
    const nav = document.getElementById('gerenciamentoNav');
    const burger = document.getElementById('hamburger');
    if (!nav || !burger) return;

    mobileMenuState.open = true;
    nav.classList.remove('open');
    burger.classList.add('open');

    updateMobileMenuView();
  };

  const closeMobileMenu = () => {
    const burger = document.getElementById('hamburger');
    if (!burger) return;

    mobileMenuState.open = false;
    mobileMenuState.view = 'main';
    burger.classList.remove('open');

    updateMobileMenuView();
  };

  const bindMobileProfileActions = (userBlock) => {
    userBlock.querySelectorAll('.profile-item').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        const action = item.getAttribute('data-profile-action');
        const origin = window.location.origin;
        if (action === 'my-reservations') {
          closeMobileMenu();
          window.location.href = `${origin}/index.html`;
        } else if (action === 'my-data') {
          closeMobileMenu();
          window.location.href = `${origin}/index.html`;
        } else if (action === 'principal') {
          closeMobileMenu();
          window.location.href = `${origin}/index.html`;
        } else if (action === 'manage') {
          closeMobileMenu();
          window.location.href = `${origin}/html/Gerenciamento.html`;
        } else if (action === 'logout') {
          localStorage.removeItem('userRole');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          localStorage.removeItem('userPhoto');
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentRolePermissions');
          closeMobileMenu();
          window.location.href = '../index.html';
        } else if (action === 'login') {
          closeMobileMenu();
          const loginLink = document.querySelector('[data-profile-action="login"]');
          if (loginLink) loginLink.click();
        } else if (action === 'register') {
          closeMobileMenu();
          const registerLink = document.querySelector('[data-profile-action="register"]');
          if (registerLink) registerLink.click();
        }
      });
    });
  };

  const syncMobileProfileUserView = () => {
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
  };

  const toggleMobileMenu = () => {
    if (mobileMenuState.open) {
      closeMobileMenu();
    } else {
      syncMobileProfileUserView();
      mobileMenuState.open = true;
      updateMobileMenuView();
    }
  };

  const initMobileMenuContent = () => {
    const container = getMobileMenuContainer();
    const nav = document.getElementById('gerenciamentoNav');
    const profileDropdown = document.querySelector('.profile-dropdown');
    const mainView = container?.querySelector('.mobile-menu-main');
    const langView = container?.querySelector('.mobile-menu-lang');
    const userView = container?.querySelector('.mobile-menu-user');

    if (!container || !mainView || !langView || !userView || !nav) return;

    mainView.innerHTML = nav.innerHTML;

    mainView.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', (event) => {
        const rawSection = (link.dataset.section || link.textContent.trim()).toLowerCase();

        if (rawSection === 'contas' || rawSection === 'conta') {
          mostrarSecao('contas');
          carregarContasDoBanco();
        } else if (rawSection === 'gerenciamento' || rawSection === 'perfis' || rawSection === 'gerenciamento da página') {
          mostrarSecao('gerenciamento');
          carregarAgendamentosDoBanco();
        } else if (rawSection === 'financeiro') {
          mostrarSecao('financeiro');
        } else {
          mostrarSecao('reservas');
          carregarAgendamentosDoBanco();
        }

        closeMobileMenu();
      });
    });

    if (langList) {
      const cloneLang = langList.cloneNode(true);
      cloneLang.id = 'mobileLangList';
      cloneLang.classList.add('mobile-lang-list');
      cloneLang.querySelectorAll('li[data-lang]').forEach((item) => {
        item.addEventListener('click', (event) => {
          const lang = item.getAttribute('data-lang');
          if (lang) {
            if (window.selectLanguage) {
              window.selectLanguage(lang);
            }
            closeMobileMenu();
          }
        });
      });

      langView.innerHTML = '';
      const langWrapper = document.createElement('div');
      langWrapper.className = 'mobile-menu-lang-content';
      langWrapper.appendChild(cloneLang);
      langView.appendChild(langWrapper);
    }

    userView.innerHTML = '';
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
      const burger = document.querySelector('.hamburger');
      if (!mobileMenuState.open || !container || !burger) return;
      if (container.contains(event.target) || burger.contains(event.target)) return;
      closeMobileMenu();
    });

    updateMobileMenuView();
  };

  if (hamburger && nav) {
    hamburger.addEventListener('click', (event) => {
      event.stopPropagation();
      if (window.matchMedia('(max-width: 900px)').matches) {
        toggleMobileMenu();
        return;
      }

      nav.classList.toggle('open');
      hamburger.classList.toggle('open');
    });
  }

  initMobileMenuContent();

  if (profileBtn && profileMenu) {
    // Remove listeners que podem estar vindo de Riodejaneiro.js e podem conflitar
    const newProfileBtn = profileBtn.cloneNode(true);
    profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);
    profileBtn = newProfileBtn;

    let profileMenuHoverTimeout = null;

    const isDesktopProfileMode = () => window.matchMedia('(min-width: 901px)').matches;

    const openProfileMenu = () => {
      profileMenu.classList.add('open');
      profileBtn.setAttribute('aria-expanded', 'true');
      const dropdown = profileMenu.querySelector('.profile-dropdown');
      if (dropdown) {
        dropdown.style.display = 'block';
        dropdown.style.visibility = 'visible';
        dropdown.style.opacity = '1';
      }
    };

    const closeProfileMenu = () => {
      profileMenu.classList.remove('open');
      profileBtn.setAttribute('aria-expanded', 'false');
      const dropdown = profileMenu.querySelector('.profile-dropdown');
      if (dropdown) {
        dropdown.style.display = 'none';
        dropdown.style.visibility = 'hidden';
        dropdown.style.opacity = '0';
      }
    };

    profileBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile) {
        closeProfileMenu();
        mobileMenuState.open = true;
        mobileMenuState.view = 'user';
        updateMobileMenuView();
        return;
      }

      // Desktop: controlar dropdown de perfil apenas por clique
      if (profileMenu.classList.contains('open')) {
        closeProfileMenu();
      } else {
        openProfileMenu();
      }
    });

    document.addEventListener('click', (event) => {
      if (!profileMenu.contains(event.target) && event.target !== profileBtn) {
        closeProfileMenu();
      }
    });

    profileMenu.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    profileMenu.querySelectorAll('.profile-item').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const action = item.getAttribute('data-profile-action');
        const origin = window.location.origin;
        if (action === 'my-reservations') {
          window.location.href = `${origin}/index.html`;
          closeProfileMenu();
          return;
        }

        if (action === 'my-data') {
          window.location.href = `${origin}/index.html`;
          closeProfileMenu();
          return;
        }

        if (action === 'principal') {
          window.location.href = `${origin}/index.html`;
          closeProfileMenu();
          return;
        }

        if (action === 'manage') {
          window.location.href = `${origin}/html/Gerenciamento.html`;
          closeProfileMenu();
          return;
        }

        if (action === 'logout') {
          localStorage.removeItem('userRole');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          localStorage.removeItem('userPhoto');
          localStorage.removeItem('authToken');
          alert('Logout realizado. A página será recarregada.');
          window.location.href = '../index.html';
          return;
        }

        closeProfileMenu();
      });
    });
  }

  // Parallax - lógica copiada de Riodejaneiro.js (fundo fixo + movimento suave)
  let scheduled = false;
  const updateBackground = () => {
    const shift = window.scrollY * 0.2;
    document.body.style.backgroundPosition = `center calc(50% + ${shift}px)`;
    scheduled = false;
  };

  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(updateBackground);
  });

  // ─── Web Push: registra Service Worker e inscreve o dispositivo admin ────────
  initWebPushForAdmin();

});

// ─── Web Push ─────────────────────────────────────────────────────────────────

// Chave pública VAPID gerada no servidor (base64url, sem padding)
const VAPID_PUBLIC_KEY = 'BPVs5zKTJWShCIzSBm1dlVeoqN37TcwKnE0abT5RCYv0zp6d4Ec7EOXbgA8-Abku0LixX02gDaGapROL-fxLgTk';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

const initWebPushForAdmin = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  // Só ativa push para usuários com permissão de gestão
  const email = typeof currentUserEmail !== 'undefined' ? currentUserEmail : null;
  if (!email) return;

  try {
    // Regista o service worker na raiz para ter escopo total
    const swPath = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
      ? '/sw.js'
      : '/sw.js';

    const reg = await navigator.serviceWorker.register(swPath, { scope: '/' });
    await navigator.serviceWorker.ready;

    // Pede permissão de notificação
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    // Busca chave pública do servidor
    let applicationServerKey = VAPID_PUBLIC_KEY;
    try {
      const keyResp = await fetchWithApiFallback('/get_vapid_public_key');
      if (keyResp.ok) {
        const keyData = await keyResp.json();
        if (keyData.publicKey) applicationServerKey = keyData.publicKey;
      }
    } catch (_) { /* usa constante local */ }

    // Cria ou reutiliza subscription existente
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey)
      });
    }

    // Envia subscription ao backend para ser notificado remotamente
    await fetchWithApiFallback('/save_push_subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, subscription: subscription.toJSON() })
    });
  } catch (err) {
    console.warn('[WebPush] Falha ao inicializar push:', err);
  }
};


