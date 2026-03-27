// version 1.0

let pendingUpdateId = null; // id do agendamento que está entrando no modo editar

// ********************************************************************
// função get_agendamentos (fetch do backend)
// ********************************************************************
const carregarAgendamentosDoBanco = async () => {
  const tableBodyElement = document.getElementById('reservationsBody');
  if (!tableBodyElement) return;

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

  const userEmail = localStorage.getItem('userEmail');
  if (!userEmail) {
    alert('Sessão expirada. Por favor, faça login novamente.');
    window.location.href = 'login.html';
    return;
  }

  try {
    const response = await fetch(`https://api-tour.exksvol.com/get_agendamentos?email=${encodeURIComponent(userEmail)}`);

    if (response.status === 403) {
      alert('Erro: Você não tem permissão de Administrador para ver esta página.');
      return;
    }

    if (!response.ok) {
      console.error('Erro ao buscar agendamentos', response.status);
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

      row.addEventListener('click', () => {
        console.log('Editando agendamento:', ag.id);
      });

      row.addEventListener('dblclick', () => {
        openEditModalFromBackend(ag);
      });

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
      nextToggle.addEventListener('click', () => {
        const expanded = nextDetails.classList.toggle('open');
        nextDetails.setAttribute('aria-hidden', String(!expanded));
        nextToggle.setAttribute('aria-expanded', String(expanded));
        nextToggle.classList.toggle('open', expanded);
      });
    }

    console.log('Tabela atualizada com sucesso!');
  } catch (error) {
    console.error('Erro de conexão ao carregar tabela:', error);
  }
};

const openEditModalFromBackend = (ag) => {
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
  const clearBtn = document.getElementById('clearReservations');
  const filterFrom = document.getElementById('filterFrom');
  const filterTo = document.getElementById('filterTo');
  const filterTour = document.getElementById('filterTour');
  const filterStatus = document.getElementById('filterStatus');
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
  if (!tableBody) return;

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

  // Default filter start date to today
  if (filterFrom && !filterFrom.value) {
    const today = new Date();
    filterFrom.value = today.toISOString().slice(0, 10);
  }

  // Default filter end date to 2 months from today
  if (filterTo && !filterTo.value) {
    const twoMonths = new Date();
    twoMonths.setMonth(twoMonths.getMonth() + 2);
    filterTo.value = twoMonths.toISOString().slice(0, 10);
  }

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

    modalLanguage.value = reservation.language || '';
    modalModality.value = reservation.modality || 'free';
    modalPhone.value = reservation.phone || '';
    modalEmail.value = reservation.email || '';
    modalName.value = reservation.name || reservation.nome || '';
    modalGuide.value = reservation.guide || '';
    modalQuantity.value = reservation.quantity || 1;
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
      status: modalStatus?.value || 'Pendente'
    };

    console.log('Enviando dados:', novaReserva);

    const isEdit = Boolean(pendingUpdateId);
    if (isEdit) {
      novaReserva.id = pendingUpdateId;
    }

    try {
      const response = await fetch(`https://api-tour.exksvol.com/${isEdit ? 'update_agendamento' : 'add_agendamento'}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(novaReserva)
      });

      const result = await response.json().catch(() => ({ message: 'Resposta não JSON' }));

      if (response.ok) {
        alert('Reserva salva no banco de dados com sucesso!');

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
        alert('Erro ao salvar: ' + message);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('Não foi possível conectar ao servidor. ' + (error.message || ''));       
    }
  };

  const deleteModalReservation = async () => {
    if (!pendingUpdateId && activeEditIndex === null) return;

    // Preferencialmente deletar do backend se houver id do registro
    if (pendingUpdateId) {
      try {
        const response = await fetch('https://api-tour.exksvol.com/delete_agendamento', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id: pendingUpdateId })
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          const msg = result?.message || `Status ${response.status}`;
          alert('Não foi possível excluir no servidor: ' + msg);
          return;
        }

        alert('Agendamento removido com sucesso!');
        pendingUpdateId = null;
        activeEditIndex = null;

        // Recarrega do backend para garantir consistência
        carregarAgendamentosDoBanco();
      } catch (error) {
        console.error('Erro de exclusão:', error);
        alert('Erro ao excluir no servidor: ' + (error.message || ''));        
      }
    } else {
      // fallback local (sem id)
      const reservations = getReservations();
      reservations.splice(activeEditIndex, 1);
      setReservations(reservations);
      activeEditIndex = null;
      render();
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

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      setReservations([]);
      render();
    });
  }

  attachFilters();

  // Render the table immediately after initialization
  render();
};

window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('reservationsBody')) {
    initReservationManagement();
    carregarAgendamentosDoBanco();
  }

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

  const toggleMobileMenu = () => {
    if (mobileMenuState.open) {
      closeMobileMenu();
    } else {
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

    const accountEntry = document.createElement('button');
    accountEntry.type = 'button';
    accountEntry.className = 'mobile-menu-launcher';
    accountEntry.textContent = 'Conta';
    accountEntry.addEventListener('click', (event) => {
      event.stopPropagation();
      mobileMenuState.view = 'user';
      updateMobileMenuView();
    });
    mainView.insertBefore(accountEntry, mainView.firstChild);

    mainView.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
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
    if (profileDropdown) {
      const userBlock = document.createElement('div');
      userBlock.className = 'mobile-profile-dropdown';
      userBlock.innerHTML = profileDropdown.innerHTML;
      userView.appendChild(userBlock);

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
          }
        });
      });
    }

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
        const action = item.getAttribute('data-profile-action');
        if (action === 'account') {
          event.preventDefault();
          alert('Minha Conta (area de usuário)');
        } else if (action === 'logout') {
          event.preventDefault();
          alert('Logout realizado');
        }
        closeProfileMenu();
      });
    });
  }

  // Parallax-ish background movement: make the background adjust gradually while scrolling
  // (keeps it centered while adding a subtle vertical shift).
  let scheduled = false;
  const updateBackground = () => {
    const shift = window.scrollY * 0.2; // adjust multiplier for more/less movement
    document.body.style.backgroundPosition = `center calc(50% + ${shift}px)`;
    scheduled = false;
  };

  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(updateBackground);
  });
});
