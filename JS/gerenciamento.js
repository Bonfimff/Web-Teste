'use strict';

const GM_DEFAULT = {
	name: 'Loja Central',
	storeCategory: 'Alimentação',
	subtitle: 'Ofertas e novidades para voce',
	address: 'Rua Principal, 123 - Mage',
	addressUrl: 'https://maps.google.com',
	primary: '#2e7d32',
	accent: '#1565c0',
	banner: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
	card: 'https://images.unsplash.com/photo-1468495244123-6c6f332b7a90?auto=format&fit=crop&w=900&q=80',
	icon: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=200&q=80',
	itemType: 'produto',
	itemName: '',
	itemDescription: '',
	itemPrice: '',
	itemPhoto: '',
	itemVideo: '',
	itemCategory: '',
	itemSubcategory: '',
	itemSubcategoryCustom: '',
	itemBrand: '',
	itemQty: '',
	itemColor: '',
	itemVoltage: '',
	itemDelivery: true,
	itemPickup: true,
	openTime: '09:00',
	closeTime: '18:00',
	closedDates: [],
	itemCardMode: 'portrait',
	filters: [
		{ name: 'Bebidas', value: 'bebidas', manualItems: [] },
		{ name: 'Ferramentas', value: 'ferramentas', manualItems: [] },
		{ name: 'Combo', value: 'combo', manualItems: [] }
	],
	items: [
		{
			type: 'produto',
			name: 'Combo da Casa',
			description: 'Lanche artesanal com bebida e acompanhamento.',
			price: '39,90',
			photo: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80',
			video: '',
			category: 'Alimentação',
			subcategory: 'Combo',
			brand: '',
			qty: '5',
			color: '',
			voltage: '',
			delivery: true,
			pickup: true
		},
		{
			type: 'servico',
			name: 'Instalacao Residencial',
			description: 'Servico tecnico com atendimento no mesmo dia.',
			price: '120,00',
			photo: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80',
			video: '',
			category: 'Serviços Gerais',
			subcategory: 'Instalação',
			brand: '',
			qty: '',
			color: '',
			voltage: '',
			delivery: false,
			pickup: true
		}
	]
};

/* =========================================================
   ATIVIDADE — compras, contratações e mensagens de clientes
   Dados de demonstração (sem backend ainda). Ver DESIGN_GUIDE.md
   §3.3 — nenhum número aqui deve ser exibido como prova social
   pública; esta aba é o painel interno do próprio lojista.
   ========================================================= */
/* Etapas do trabalho após o pedido — cada tipo tem seu próprio fluxo,
   já que um serviço não tem etiqueta de envio. `acao` é o rótulo do
   botão que avança para a próxima etapa (vazio na etapa final). */
const GM_ETAPAS_PRODUTO = [
	{ label: 'Pedido recebido', acao: 'Gerar etiqueta de envio' },
	{ label: 'Etiqueta gerada', acao: 'Marcar como postado' },
	{ label: 'Postado', acao: 'Marcar como entregue' },
	{ label: 'Entregue', acao: '' },
];

const GM_ETAPAS_SERVICO = [
	{ label: 'Solicitação recebida', acao: 'Confirmar agendamento' },
	{ label: 'Confirmado', acao: 'Marcar como realizado' },
	{ label: 'Serviço realizado', acao: '' },
];

function getEtapasPedido(tipo) {
	return tipo === 'servico' ? GM_ETAPAS_SERVICO : GM_ETAPAS_PRODUTO;
}

const GM_PEDIDOS = [
	{
		id: 1,
		tipo: 'produto',
		cliente: 'Fernanda Souza',
		item: 'Combo da Casa',
		valor: '39,90',
		quando: 'Há 12 minutos',
		etapaIndex: 0,
	},
	{
		id: 2,
		tipo: 'servico',
		cliente: 'Carlos Eduardo',
		item: 'Instalação Residencial',
		valor: '120,00',
		quando: 'Há 2 horas',
		etapaIndex: 1,
	},
	{
		id: 3,
		tipo: 'produto',
		cliente: 'Marcos Lima',
		item: 'Combo da Casa',
		valor: '39,90',
		quando: 'Ontem',
		etapaIndex: 3,
	},
];

let gmPedidos = [];

/* Indicadores de demonstração (sem backend) para a aba Painel. */
const GM_DASHBOARD = {
	carrinhoUsuarios: 47,
	produtosMaisCurtidos: [
		{ nome: 'Combo da Casa', valor: 86 },
		{ nome: 'Instalação Residencial', valor: 34 },
		{ nome: 'Combo Família', valor: 21 },
	],
	produtosMaisComprados: [
		{ nome: 'Combo da Casa', valor: 52 },
		{ nome: 'Instalação Residencial', valor: 19 },
		{ nome: 'Combo Família', valor: 11 },
	],
};

let gmLojaId = null;
let gmMensagens = [];
let gmMensagemAbertaId = -1;
let gmComposerAnexos = [];
let gmComposerTexto = '';
let gmComposerMenuAberto = false;
let gmMensagensFiltro = 'compra';

const GM_TIPO_ANEXO_ICON = {
	foto: 'fa-image',
	video: 'fa-video',
	documento: 'fa-file-alt',
};

const GM_SUBCATEGORY_MAP = {
	'alimentacao': ['Bebida', 'Lanche', 'Combo', 'Sobremesa', 'Marmita'],
	'eletronicos': ['Celular', 'Acessórios', 'TV', 'Som', 'Games'],
	'moda e vestuario': ['Masculino', 'Feminino', 'Infantil', 'Calçados', 'Acessórios'],
	'casa e decoracao': ['Cozinha', 'Quarto', 'Sala', 'Banheiro', 'Jardim'],
	'beleza e saude': ['Perfumaria', 'Cosméticos', 'Higiene', 'Suplementos'],
	'servicos gerais': ['Instalação', 'Manutenção', 'Limpeza', 'Consultoria'],
	'mercado / mercearia': ['Bebidas', 'Hortifruti', 'Padaria', 'Limpeza', 'Congelados']
};

let gmItems = [];
let gmItemsOriginalIds = [];
let gmEditingIndex = -1;
let gmFilters = [];
let gmActiveFilterIndex = -1;
let gmEditingFilterIndex = -1;
let gmClosedDates = [];
let gmPreviewVisible = false;
let gmSalvandoLoja = false;

function gmToast(msg) {
	const el = document.getElementById('toast');
	if (!el) return;
	el.textContent = msg;
	el.classList.add('show');
	setTimeout(() => el.classList.remove('show'), 2300);
}

function setBgFromUrl(el, url, fallbackGradient) {
	if (!el) return;
	if (url) {
		el.style.backgroundImage = `url('${url}')`;
		return;
	}
	el.style.backgroundImage = fallbackGradient;
}

function cloneDefaultItems() {
	return GM_DEFAULT.items.map(item => ({ ...item }));
}

function parsePrecoParaNumero(precoTexto) {
	const numero = Number(String(precoTexto || '0').replace(',', '.'));
	return Number.isFinite(numero) ? numero : 0;
}

function formatarPrecoParaExibicao(precoDecimal) {
	const numero = Number(precoDecimal || 0);
	return numero.toFixed(2).replace('.', ',');
}

function formatarHoraParaInput(horaSql) {
	return (horaSql || '').slice(0, 5);
}

function mapItemApiParaLocal(item) {
	return {
		id: item.id,
		type: item.tipo || 'produto',
		name: item.nome || '',
		description: item.descricao || '',
		price: formatarPrecoParaExibicao(item.preco),
		photo: item.foto_url || '',
		video: item.video_url || '',
		category: item.categoria || '',
		subcategory: item.subcategoria || '',
		brand: item.marca || '',
		qty: item.quantidade != null ? String(item.quantidade) : '',
		color: item.cor || '',
		voltage: item.voltagem || '',
		delivery: Boolean(item.entrega),
		pickup: Boolean(item.retirada),
	};
}

function mapItemLocalParaApi(item, lojaId) {
	return {
		loja_id: lojaId,
		tipo: item.type,
		nome: item.name,
		descricao: item.description,
		preco: parsePrecoParaNumero(item.price),
		foto_url: item.photo || null,
		video_url: item.video || null,
		categoria: item.category || null,
		subcategoria: item.subcategory || null,
		marca: item.brand || null,
		quantidade: item.qty ? Number(item.qty) : null,
		cor: item.color || null,
		voltagem: item.voltage || null,
		entrega: Boolean(item.delivery),
		retirada: Boolean(item.pickup),
	};
}

function mapFiltroApiParaLocal(filtro) {
	return {
		name: filtro.nome || '',
		value: filtro.valor || '',
		manualItems: (filtro.itens_manuais || []).map(i => i.item_nome || i),
	};
}

function normalizePrice(value) {
	return (value || '').trim();
}

function formatPriceLabel(value) {
	const normalized = normalizePrice(value);
	if (!normalized) return 'Preco sob consulta';
	return `R$ ${normalized}`;
}

function normalizeCategoryKey(value) {
	return (value || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

function getSubcategoriesByCategory(category) {
	return GM_SUBCATEGORY_MAP[normalizeCategoryKey(category)] || [];
}

function getFilterLabel(filter) {
	return `${filter.name}: ${filter.value}`;
}

function getFilterName(filter) {
	return filter.name || '';
}

function formatClosedDate(value) {
	if (!value) return '';
	try {
		// Append noon time to avoid UTC midnight → previous day in UTC-3
		const date = new Date(value + 'T12:00:00');
		return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
	} catch {
		return value;
	}
}

function renderClosedDates() {
	const list = document.getElementById('gm-closed-dates-list');
	if (!list) return;
	list.innerHTML = '';
	if (!gmClosedDates.length) {
		list.textContent = 'Nenhuma data fechada selecionada.';
		return;
	}
	gmClosedDates.forEach((date, index) => {
		const item = createEl('div', 'gm-closed-date-item');
		item.textContent = formatClosedDate(date);
		const removeBtn = createEl('button', 'gm-admin-remove gm-closed-date-remove', 'Remover');
		removeBtn.type = 'button';
		removeBtn.dataset.removeClosedDateIndex = String(index);
		item.appendChild(removeBtn);
		list.appendChild(item);
	});
}

function addClosedDate() {
	const dateInput = document.getElementById('gm-closed-date');
	if (!(dateInput instanceof HTMLInputElement)) return;
	const value = dateInput.value;
	if (!value) {
		gmToast('Selecione uma data para adicionar.');
		return;
	}
	if (gmClosedDates.includes(value)) {
		gmToast('Essa data já está marcada como fechada.');
		return;
	}
	gmClosedDates.push(value);
	renderClosedDates();	
	aplicarPreview();
	dateInput.value = '';
}

function removeClosedDate(index) {
	if (index < 0 || index >= gmClosedDates.length) return;
	gmClosedDates.splice(index, 1);
	renderClosedDates();
	aplicarPreview();
}

function getFilterManualLabel(filter) {
	if (!filter.manualItems?.length) return '';
	return `Itens: ${filter.manualItems.join(', ')}`;
}

function parseManualItems(value) {
	return (value || '')
		.split(',')
		.map(item => item.trim())
		.filter(Boolean);
}

function renderFilterChips() {
	const preview = document.getElementById('gm-preview-opt-services');
	if (!preview) return;
	preview.innerHTML = '';
	if (!gmFilters.length) return;
	const wrapper = document.createElement('div');
	wrapper.className = 'gm-filter-chips';
	gmFilters.forEach((filter, index) => {
		const chip = document.createElement('span');
		chip.className = 'gm-filter-chip';
		chip.textContent = getFilterName(filter);
		chip.dataset.filterIndex = String(index);
		if (index === gmActiveFilterIndex) {
			chip.classList.add('active');
		}
		wrapper.appendChild(chip);
	});
	preview.appendChild(wrapper);
}

function renderFilterList() {
	const list = document.getElementById('gm-filter-list');
	if (!list) return;
	list.innerHTML = '';
	if (!gmFilters.length) {
		list.appendChild(createEl('div', 'gm-admin-empty', 'Nenhum filtro adicionado.'));
		return;
	}
	gmFilters.forEach((filter, index) => {
		const item = createEl('div', 'gm-filter-item');
		const label = createEl('span', 'gm-filter-item-label', getFilterLabel(filter));
		item.appendChild(label);
		const manualLabel = getFilterManualLabel(filter);
		if (manualLabel) {
			item.appendChild(createEl('span', 'gm-filter-item-sub', manualLabel));
		}
		const editBtn = createEl('button', 'gm-admin-edit', 'Editar');
		editBtn.type = 'button';
		editBtn.dataset.editFilterIndex = String(index);
		const removeBtn = createEl('button', 'gm-admin-remove', 'Remover');
		removeBtn.type = 'button';
		removeBtn.dataset.filterIndex = String(index);
		item.appendChild(editBtn);
		item.appendChild(removeBtn);
		list.appendChild(item);
	});
}

function clearFilterFields() {
	const filterName = document.getElementById('gm-filter-name');
	const filterValue = document.getElementById('gm-filter-value');
	const filterManual = document.getElementById('gm-filter-manual');
	if (filterName) filterName.value = '';
	if (filterValue) filterValue.value = '';
	if (filterManual) filterManual.value = '';
	setFilterEditMode(false);
}

function loadFilterIntoForm(index) {
	const filter = gmFilters[index];
	if (!filter) return;
	const name = document.getElementById('gm-filter-name');
	const value = document.getElementById('gm-filter-value');
	const manual = document.getElementById('gm-filter-manual');
	if (name) name.value = filter.name || '';
	if (value) value.value = filter.value || '';
	if (manual) manual.value = (filter.manualItems || []).join(', ');
	gmEditingFilterIndex = index;
	setFilterEditMode(true);
}

function setFilterEditMode(active) {
	const button = document.getElementById('gm-add-filter');
	if (!button) return;
	button.textContent = active ? 'Salvar filtro' : 'Adicionar filtro';
	const icon = document.createElement('i');
	icon.className = active ? 'fas fa-save' : 'fas fa-plus';
	button.innerHTML = '';
	button.appendChild(icon);
	button.appendChild(document.createTextNode(active ? ' Salvar filtro' : ' Adicionar filtro'));
	gmEditingFilterIndex = active ? gmEditingFilterIndex : -1;
}

function addFilter() {
	const name = document.getElementById('gm-filter-name')?.value?.trim() || '';
	const value = document.getElementById('gm-filter-value')?.value?.trim() || '';
	const manual = document.getElementById('gm-filter-manual')?.value || '';
	if (!name || !value) {
		gmToast('Informe nome e valor do filtro.');
		return;
	}
	const manualItems = parseManualItems(manual);
	const filterData = { name, value, manualItems };
	if (gmEditingFilterIndex >= 0) {
		gmFilters[gmEditingFilterIndex] = filterData;
		gmToast('Filtro atualizado.');
	} else {
		gmFilters.unshift(filterData);
		gmToast('Filtro adicionado.');
	}
	renderFilterList();
	renderFilterChips();
	clearFilterFields();
	setFilterEditMode(false);
}

function removeFilter(index) {
	if (index < 0 || index >= gmFilters.length) return;
	gmFilters.splice(index, 1);
	renderFilterList();
	renderFilterChips();
	gmToast('Filtro removido.');
}

function setSubcategoryCustomVisibility() {
	const select = document.getElementById('gm-item-subcategory');
	const wrap = document.getElementById('gm-item-subcategory-custom-wrap');
	if (!select || !wrap) return;
	const shouldShowCustom = select.value === 'Personalizada';
	wrap.classList.toggle('gm-hidden', !shouldShowCustom);
}

function refreshSubcategoryOptions(category, selectedValue = '') {
	const select = document.getElementById('gm-item-subcategory');
	if (!select) return;

	const previous = selectedValue || select.value || '';
	const options = getSubcategoriesByCategory(category);
	select.innerHTML = '';

	const baseOption = document.createElement('option');
	baseOption.value = '';
	baseOption.textContent = 'Selecione...';
	select.appendChild(baseOption);

	options.forEach(opt => {
		const optionEl = document.createElement('option');
		optionEl.value = opt;
		optionEl.textContent = opt;
		select.appendChild(optionEl);
	});

	const customOption = document.createElement('option');
	customOption.value = 'Personalizada';
	customOption.textContent = 'Personalizada';
	select.appendChild(customOption);

	if (previous && options.includes(previous)) {
		select.value = previous;
	} else if (previous && previous !== 'Personalizada') {
		select.value = 'Personalizada';
		const customInput = document.getElementById('gm-item-subcategory-custom');
		if (customInput) customInput.value = previous;
	} else {
		select.value = previous;
	}

	setSubcategoryCustomVisibility();
}

function getCurrentSubcategory() {
	const select = document.getElementById('gm-item-subcategory');
	const custom = document.getElementById('gm-item-subcategory-custom');
	if (!select) return '';
	if (select.value === 'Personalizada') {
		return custom?.value?.trim() || '';
	}
	return select.value || '';
}

function setEditMode(active) {
	const addBtn = document.getElementById('gm-add-item');
	if (addBtn) {
		addBtn.textContent = active ? 'Salvar item' : 'Adicionar item';
		const icon = document.createElement('i');
		icon.className = active ? 'fas fa-save' : 'fas fa-plus';
		addBtn.innerHTML = '';
		addBtn.appendChild(icon);
		addBtn.appendChild(document.createTextNode(active ? ' Salvar item' : ' Adicionar item'));
	}
	gmEditingIndex = active ? gmEditingIndex : -1;
}

function clearItemFields() {
	setEditMode(false);
	setFilterEditMode(false);
	const fields = [
		['gm-item-type', GM_DEFAULT.itemType],
		['gm-item-name', GM_DEFAULT.itemName],
		['gm-item-description', GM_DEFAULT.itemDescription],
		['gm-item-price', GM_DEFAULT.itemPrice],
		['gm-item-photo', GM_DEFAULT.itemPhoto],
		['gm-item-video', GM_DEFAULT.itemVideo],
		['gm-item-category', GM_DEFAULT.itemCategory],
		['gm-item-subcategory-custom', GM_DEFAULT.itemSubcategoryCustom],
		['gm-item-brand', GM_DEFAULT.itemBrand],
		['gm-item-qty', GM_DEFAULT.itemQty],
		['gm-item-color', GM_DEFAULT.itemColor],
		['gm-item-voltage', GM_DEFAULT.itemVoltage],
		['gm-open-time', GM_DEFAULT.openTime],
		['gm-close-time', GM_DEFAULT.closeTime],
	];

	fields.forEach(([id, value]) => {
		const el = document.getElementById(id);
		if (el) el.value = value;
	});

	const deliveryEl = document.getElementById('gm-item-delivery');
	const pickupEl = document.getElementById('gm-item-pickup');
	if (deliveryEl) deliveryEl.checked = GM_DEFAULT.itemDelivery;
	if (pickupEl) pickupEl.checked = GM_DEFAULT.itemPickup;

	refreshSubcategoryOptions(GM_DEFAULT.itemCategory, GM_DEFAULT.itemSubcategory);
	clearFilterFields();
}

function loadItemIntoForm(index) {
	const item = gmItems[index];
	if (!item) return;
	setEditMode(true);
	gmEditingIndex = index;

	const fields = {
		'gm-item-type': item.type,
		'gm-item-name': item.name,
		'gm-item-description': item.description,
		'gm-item-price': item.price,
		'gm-item-photo': item.photo,
		'gm-item-video': item.video,
		'gm-item-category': item.category,
		'gm-item-brand': item.brand,
		'gm-item-qty': item.qty,
		'gm-item-color': item.color,
		'gm-item-voltage': item.voltage
	};

	Object.entries(fields).forEach(([id, value]) => {
		const el = document.getElementById(id);
		if (el) el.value = value || '';
	});

	refreshSubcategoryOptions(item.category, item.subcategory || '');
	const customInput = document.getElementById('gm-item-subcategory-custom');
	if (customInput) customInput.value = item.subcategory && item.subcategory !== document.getElementById('gm-item-subcategory')?.value ? item.subcategory : '';
}

function collectItemFromForm() {
	const type = document.getElementById('gm-item-type')?.value || 'produto';
	const name = document.getElementById('gm-item-name')?.value?.trim() || '';
	const description = document.getElementById('gm-item-description')?.value?.trim() || '';
	const price = normalizePrice(document.getElementById('gm-item-price')?.value || '');
	const photo = document.getElementById('gm-item-photo')?.value?.trim() || '';
	const video = document.getElementById('gm-item-video')?.value?.trim() || '';
	const category = document.getElementById('gm-item-category')?.value?.trim() || '';
	const subcategory = getCurrentSubcategory();
	const brand = document.getElementById('gm-item-brand')?.value?.trim() || '';
	const qty = document.getElementById('gm-item-qty')?.value?.trim() || '';
	const color = document.getElementById('gm-item-color')?.value?.trim() || '';
	const voltage = document.getElementById('gm-item-voltage')?.value || '';
	const delivery = document.getElementById('gm-item-delivery')?.checked ?? true;
	const pickup = document.getElementById('gm-item-pickup')?.checked ?? true;

	if (!name) {
		gmToast('Informe o nome do item para cadastrar.');
		return null;
	}

	if (!description) {
		gmToast('Adicione a descricao do item.');
		return null;
	}

	if (!category) {
		gmToast('Selecione uma categoria para o item.');
		return null;
	}

	if (!subcategory) {
		gmToast('Selecione ou informe uma subcategoria.');
		return null;
	}

	return { type, name, description, price, photo, video, category, subcategory, brand, qty, color, voltage, delivery, pickup };
}

function createEl(tag, className, text) {
	const el = document.createElement(tag);
	if (className) el.className = className;
	if (typeof text === 'string') el.textContent = text;
	return el;
}

function renderAdminItems() {
	const listEl = document.getElementById('gm-items-admin-list');
	if (!listEl) return;

	listEl.innerHTML = '';
	if (!gmItems.length) {
		listEl.appendChild(createEl('div', 'gm-admin-empty', 'Nenhum item cadastrado ainda.'));
		return;
	}

	gmItems.forEach((item, index) => {
		const card = createEl('article', 'gm-admin-item');
		const head = createEl('div', 'gm-admin-item-head');
		const title = createEl('h6', 'gm-admin-item-title', item.name);
		const badge = createEl('span', 'gm-item-badge', item.type === 'servico' ? 'Servico' : 'Produto');
		const actions = createEl('div', 'gm-admin-item-actions');
		const editBtn = createEl('button', 'gm-admin-edit', 'Editar');
		editBtn.type = 'button';
		editBtn.dataset.editIndex = String(index);
		const removeBtn = createEl('button', 'gm-admin-remove', 'Remover');
		removeBtn.type = 'button';
		removeBtn.dataset.removeIndex = String(index);

		actions.appendChild(editBtn);
		actions.appendChild(removeBtn);
		head.appendChild(title);
		head.appendChild(badge);
		head.appendChild(actions);

		const meta = createEl('p', 'gm-admin-item-meta',
			`${formatPriceLabel(item.price)}` +
			(item.category ? ` · ${item.category}` : '') +
			(item.subcategory ? ` / ${item.subcategory}` : '') +
			(item.brand ? ` · ${item.brand}` : '') +
			(item.qty ? ` · Qtd: ${item.qty}` : '') +
			(item.color ? ` · Cor: ${item.color}` : '') +
			(item.voltage ? ` · ${item.voltage}` : '') +
			` · ${[item.delivery ? 'Entrega' : '', item.pickup ? 'Retirada' : ''].filter(Boolean).join(' + ') || 'Sem modalidade'}` +
			` — ${item.description}`
		);
		card.appendChild(head);
		card.appendChild(meta);
		listEl.appendChild(card);
	});
}

function buildPreviewItem(item) {
	const card = createEl('article', 'gm-preview-item');

	if (item.photo) {
		const photo = createEl('div', 'gm-preview-item-photo');
		photo.style.backgroundImage = `url('${item.photo}')`;
		card.appendChild(photo);
	}

	if (item.video) {
		const video = document.createElement('video');
		video.className = 'gm-preview-item-video';
		video.src = item.video;
		video.controls = true;
		video.preload = 'metadata';
		card.appendChild(video);
	}

	const body = createEl('div', 'gm-preview-item-body');
	const row = createEl('div', 'gm-preview-item-title-row');
	const title = createEl('h6', 'gm-preview-item-title', item.name);
	const badge = createEl('span', 'gm-item-badge', item.type === 'servico' ? 'Servico' : 'Produto');
	row.appendChild(title);
	row.appendChild(badge);

	const price = createEl('p', 'gm-preview-item-price', formatPriceLabel(item.price));

	const qtyWrapper = createEl('div', 'gm-preview-item-qty-row');
	const qtyLabel = createEl('span', 'gm-preview-item-qty-label', 'Qtd');
	const qtyInput = document.createElement('input');
	qtyInput.type = 'number';
	qtyInput.className = 'gm-preview-item-qty';
	qtyInput.min = '1';
	qtyInput.value = '1';
	qtyInput.max = item.qty ? String(item.qty) : '99';
	qtyInput.title = 'Quantidade a adicionar';
	qtyInput.addEventListener('pointerdown', (event) => event.stopPropagation());
	qtyInput.addEventListener('click', (event) => event.stopPropagation());
	qtyInput.addEventListener('focus', (event) => event.stopPropagation());
	qtyWrapper.appendChild(qtyLabel);
	qtyWrapper.appendChild(qtyInput);

	const actions = createEl('div', 'gm-preview-item-actions');
	const addButton = createEl('button', 'gm-preview-item-button', 'Adicionar no carrinho');
	addButton.type = 'button';
	addButton.addEventListener('click', (event) => {
		event.stopPropagation();
		const rawQty = Number(qtyInput.value);
		const availableQty = Number(item.qty) || 99;
		const quantity = rawQty > 0 ? Math.min(rawQty, availableQty) : 1;
		qtyInput.value = String(quantity);
		gmToast(`${quantity} x "${item.name}" adicionado ao carrinho.`);
	});
	actions.appendChild(qtyWrapper);
	actions.appendChild(addButton);

	if (item.category || item.subcategory || item.brand) {
		const meta1 = createEl('p', 'gm-preview-item-description',
			[
				item.category,
				item.subcategory ? `Subcategoria: ${item.subcategory}` : '',
				item.brand
			].filter(Boolean).join(' · ')
		);
		body.appendChild(row);
		body.appendChild(price);
		body.appendChild(meta1);
	} else {
		body.appendChild(row);
		body.appendChild(price);
	}

	body.appendChild(actions);

	const details = createEl('div', 'gm-preview-item-details');
	const detailDescription = createEl('p', 'gm-preview-item-description', item.description || 'Sem descrição.');
	details.appendChild(detailDescription);

	const deliveryNotes = [];
	if (item.delivery) deliveryNotes.push('Entrega disponível');
	if (item.pickup) deliveryNotes.push('Retirada disponível');
	if (item.qty) deliveryNotes.push(`Qtd: ${item.qty}`);
	if (item.color) deliveryNotes.push(`Cor: ${item.color}`);
	if (item.voltage) deliveryNotes.push(item.voltage);
	if (item.subcategory) deliveryNotes.push(`Subcategoria: ${item.subcategory}`);
	if (item.brand) deliveryNotes.push(item.brand);

	if (deliveryNotes.length) {
		const detailsLine = createEl('p', 'gm-preview-item-description gm-item-tags', deliveryNotes.join(' · '));
		details.appendChild(detailsLine);
	}

	if (item.matchedFilters?.length) {
		const filterLine = createEl('p', 'gm-preview-item-description gm-item-tags', `Filtros: ${item.matchedFilters.join(' | ')}`);
		details.appendChild(filterLine);
	}

	body.appendChild(details);
	card.appendChild(body);

	return card;
}

function getFilterMatches(item, filter) {
	const key = filter.value.toLowerCase();
	const categoryMatch = item.category?.toLowerCase().includes(key);
	const subcategoryMatch = item.subcategory?.toLowerCase().includes(key);
	const manualMatch = filter.manualItems?.some(manual => manual.toLowerCase() === item.name.toLowerCase());
	return categoryMatch || subcategoryMatch || manualMatch;
}

function renderPreviewItems() {
	const previewList = document.getElementById('gm-preview-items');
	if (!previewList) return;

	previewList.innerHTML = '';
	const filtered = gmItems.map(item => {
		const matchedFilters = gmFilters
			.map((filter, index) => ({ filter, index }))
			.filter(({ filter }) => getFilterMatches(item, filter))
			.map(({ filter }) => getFilterName(filter));
		return {
			...item,
			matchedFilters
		};
	});

	let visible = filtered;
	if (gmActiveFilterIndex >= 0 && gmFilters[gmActiveFilterIndex]) {
		const activeFilter = gmFilters[gmActiveFilterIndex];
		visible = filtered.filter(item => getFilterMatches(item, activeFilter));
	}

	if (!visible.length) {
		previewList.appendChild(createEl('div', 'gm-preview-empty', 'Nenhum item visivel com o filtro selecionado.'));
		return;
	}

	visible.forEach(item => previewList.appendChild(buildPreviewItem(item)));
}

function aplicarPreview() {
	const name = document.getElementById('gm-app-name')?.value?.trim() || GM_DEFAULT.name;
	const storeCategory = document.getElementById('gm-store-category')?.value || '';
	const subtitle = document.getElementById('gm-app-subtitle')?.value?.trim() || GM_DEFAULT.subtitle;
	const address = document.getElementById('gm-address')?.value?.trim() || GM_DEFAULT.address;
	const addressUrl = document.getElementById('gm-address-url')?.value?.trim() || GM_DEFAULT.addressUrl;
	const primary = document.getElementById('gm-primary-color')?.value || GM_DEFAULT.primary;
	const accent = document.getElementById('gm-accent-color')?.value || GM_DEFAULT.accent;
	const banner = document.getElementById('gm-banner-url')?.value?.trim() || '';
	const card = document.getElementById('gm-card-url')?.value?.trim() || '';
	const icon = document.getElementById('gm-app-icon-url')?.value?.trim() || '';
	const cardMode = document.getElementById('gm-preview-card-mode')?.value || GM_DEFAULT.itemCardMode || 'portrait';
	const openTime = document.getElementById('gm-open-time')?.value || GM_DEFAULT.openTime;
	const closeTime = document.getElementById('gm-close-time')?.value || GM_DEFAULT.closeTime;
	const openDays = Array.from(document.querySelectorAll('input[name="gm-weekday"]:checked')).map(el => el.dataset.dayName || el.value);

	const phone = document.getElementById('gm-phone');
	if (phone) {
		phone.classList.toggle('gm-mode-landscape', cardMode === 'landscape');
		phone.classList.toggle('gm-mode-portrait', cardMode !== 'landscape');
		phone.style.setProperty('--gm-primary', primary);
		phone.style.setProperty('--gm-accent', accent);
	}

	const titleEl = document.getElementById('gm-preview-title');
	const subtitleEl = document.getElementById('gm-preview-subtitle');
	const addressEl = document.getElementById('gm-preview-address');

	if (titleEl) titleEl.textContent = name;
	if (subtitleEl) {
		subtitleEl.textContent = storeCategory
			? `${subtitle} • ${storeCategory}`
			: subtitle;
	}
	if (addressEl) {
		const addressText = addressEl.querySelector('span');
		if (addressText) addressText.textContent = address;
		addressEl.href = addressUrl || '#';
	}

	const scheduleEl = document.getElementById('gm-preview-schedule');
	if (scheduleEl) {
		const daysText = openDays.length ? openDays.join(' • ') : 'Fechado';
		scheduleEl.innerHTML = `
			<p class="gm-preview-schedule-line"><strong>Horário:</strong> ${openTime} - ${closeTime}</p>
			<p class="gm-preview-schedule-line"><strong>Dias abertos:</strong> ${daysText}</p>
			${gmClosedDates.length ? `<p class="gm-preview-schedule-line gm-item-tags"><strong>Fechado em:</strong> ${gmClosedDates.map(formatClosedDate).join(', ')}</p>` : ''}
		`;
	}

	setBgFromUrl(
		document.getElementById('gm-preview-banner'),
		banner,
		`linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`
	);

	setBgFromUrl(
		document.getElementById('gm-preview-app-icon'),
		icon,
		`linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`
	);

	renderFilterChips();
	renderPreviewItems();
}

function resetForm() {
	const map = [
		['gm-app-name', GM_DEFAULT.name],
		['gm-store-category', GM_DEFAULT.storeCategory],
		['gm-app-subtitle', GM_DEFAULT.subtitle],
		['gm-address', GM_DEFAULT.address],
		['gm-address-url', GM_DEFAULT.addressUrl],
		['gm-primary-color', GM_DEFAULT.primary],
		['gm-accent-color', GM_DEFAULT.accent],
		['gm-banner-url', GM_DEFAULT.banner],
		['gm-card-url', GM_DEFAULT.card],
		['gm-app-icon-url', GM_DEFAULT.icon],
		['gm-open-time', GM_DEFAULT.openTime],
		['gm-close-time', GM_DEFAULT.closeTime],
		['gm-preview-card-mode', GM_DEFAULT.itemCardMode],
	];

	map.forEach(([id, value]) => {
		const el = document.getElementById(id);
		if (!el) return;
		if (el.type === 'checkbox') {
			el.checked = Boolean(value);
			return;
		}
		el.value = value;
	});

	document.querySelectorAll('input[name="gm-weekday"]').forEach(checkbox => {
		if (!(checkbox instanceof HTMLInputElement)) return;
		checkbox.checked = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].includes(checkbox.dataset.dayName || '');
	});

	gmItems = cloneDefaultItems();
	gmFilters = [...GM_DEFAULT.filters];
	gmClosedDates = [...GM_DEFAULT.closedDates];
	clearItemFields();
	renderAdminItems();
	renderFilterList();
	renderClosedDates();
	aplicarPreview();
}

function addItem() {
	const item = collectItemFromForm();
	if (!item) return;

	if (gmEditingIndex >= 0) {
		item.id = gmItems[gmEditingIndex]?.id;
		gmItems[gmEditingIndex] = item;
		gmToast('Item atualizado com sucesso.');
	} else {
		gmItems.unshift(item);
		gmToast('Item adicionado ao app.');
	}

	renderAdminItems();
	aplicarPreview();
	clearItemFields();
}

function removeItem(index) {
	if (index < 0 || index >= gmItems.length) return;
	gmItems.splice(index, 1);
	renderAdminItems();
	aplicarPreview();
	gmToast('Item removido.');
}

function setPreviewVisibility(visible) {
	const layout = document.querySelector('.gm-layout');
	if (!layout) return;
	gmPreviewVisible = visible;
	layout.classList.toggle('gm-layout--preview-hidden', !visible);
	layout.classList.toggle('gm-layout--preview-mode', visible);

	const previewTab = document.getElementById('gm-tab-preview');
	if (previewTab) {
		previewTab.dataset.previewVisible = visible ? 'true' : 'false';
	}
}

function bindPreviewControls() {
	setPreviewVisibility(false);
}

function bindTabs() {
	const tabs = document.querySelectorAll('.gm-tab');
	const panels = document.querySelectorAll('.gm-tab-panel');

	tabs.forEach(tab => {
		tab.addEventListener('click', () => {
			const targetId = tab.getAttribute('aria-controls');

			tabs.forEach(t => {
				t.classList.remove('active');
				t.setAttribute('aria-selected', 'false');
			});
			panels.forEach(p => p.classList.add('gm-tab-panel--hidden'));

			tab.classList.add('active');
			tab.setAttribute('aria-selected', 'true');
			const target = document.getElementById(targetId);
			if (target) target.classList.remove('gm-tab-panel--hidden');

			if (targetId === 'panel-preview') {
				setPreviewVisibility(true);
				document.querySelector('.gm-editor')?.scrollTo({ top: 0, behavior: 'smooth' });
				aplicarPreview();
			} else {
				setPreviewVisibility(false);
			}
		});
	});
}

function abrirMensagensDrawer() {
	document.getElementById('gm-messages-drawer')?.classList.add('open');
	document.getElementById('gm-messages-overlay')?.classList.add('active');
}

function fecharMensagensDrawer() {
	document.getElementById('gm-messages-drawer')?.classList.remove('open');
	document.getElementById('gm-messages-overlay')?.classList.remove('active');
	gmMensagemAbertaId = -1;
	gmComposerAnexos = [];
	renderMensagens();
}

function bindMessagesBubble() {
	document.getElementById('gm-messages-bubble')?.addEventListener('click', abrirMensagensDrawer);
	document.getElementById('gm-messages-close')?.addEventListener('click', fecharMensagensDrawer);
	document.getElementById('gm-messages-overlay')?.addEventListener('click', fecharMensagensDrawer);
}

function bindStepAccordion(form) {
	const steps = Array.from(form.querySelectorAll('details.gm-step'));
	if (!steps.length) return;

	// Estado inicial: apenas a etapa 1 aberta.
	steps.forEach((step, index) => {
		step.open = index === 0;
	});

	steps.forEach(step => {
		step.addEventListener('toggle', () => {
			if (step.open) {
				steps.forEach(other => {
					if (other !== step) other.open = false;
				});
				return;
			}

			const anyOpen = steps.some(other => other.open);
			if (!anyOpen) {
				step.open = true;
			}
		});
	});

	form.querySelectorAll('.gm-stepper a[href^="#gm-step-"]').forEach(link => {
		link.addEventListener('click', (event) => {
			event.preventDefault();
			const href = link.getAttribute('href');
			if (!href) return;

			const target = form.querySelector(href);
			if (!(target instanceof HTMLDetailsElement)) return;

			steps.forEach(step => {
				step.open = step === target;
			});

			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	});
}

function rotuloTipoPedido(tipo) {
	return tipo === 'servico' ? 'Contratação de serviço' : 'Compra de produto';
}

function buildPedidoSteps(pedido) {
	const etapas = getEtapasPedido(pedido.tipo);
	const steps = createEl('div', 'gm-pedido-steps');

	etapas.forEach((etapa, index) => {
		const isDone = index < pedido.etapaIndex;
		const isCurrent = index === pedido.etapaIndex;
		const stepEl = createEl('div', 'gm-pedido-step');
		if (isDone) stepEl.classList.add('is-done');
		if (isCurrent) stepEl.classList.add('is-current');

		const dot = createEl('span', 'gm-pedido-step-dot');
		if (isDone) {
			const icon = document.createElement('i');
			icon.className = 'fas fa-check';
			dot.appendChild(icon);
		} else {
			dot.textContent = String(index + 1);
		}

		stepEl.appendChild(dot);
		stepEl.appendChild(createEl('span', 'gm-pedido-step-label', etapa.label));
		steps.appendChild(stepEl);
	});

	return steps;
}

function buildPedidoActions(pedido) {
	const etapas = getEtapasPedido(pedido.tipo);
	const etapaAtual = etapas[pedido.etapaIndex];
	const actions = createEl('div', 'gm-pedido-actions');

	if (pedido.tipo === 'produto' && pedido.etapaIndex >= 1) {
		const verBtn = createEl('button', 'btn btn-outline', 'Ver etiqueta');
		verBtn.type = 'button';
		verBtn.dataset.action = 'ver-etiqueta';
		verBtn.dataset.pedidoId = String(pedido.id);
		const tagIcon = document.createElement('i');
		tagIcon.className = 'fas fa-tag';
		verBtn.prepend(tagIcon);
		actions.appendChild(verBtn);
	}

	if (etapaAtual.acao) {
		const avancarBtn = createEl('button', 'btn btn-primary', etapaAtual.acao);
		avancarBtn.type = 'button';
		avancarBtn.dataset.action = 'avancar-etapa';
		avancarBtn.dataset.pedidoId = String(pedido.id);
		const arrowIcon = document.createElement('i');
		arrowIcon.className = 'fas fa-arrow-right';
		avancarBtn.prepend(arrowIcon);
		actions.appendChild(avancarBtn);
	} else {
		actions.appendChild(createEl('span', 'gm-pedido-done-tag', 'Concluído'));
	}

	return actions;
}

function renderPedidos() {
	const list = document.getElementById('gm-pedidos-list');
	if (!list) return;

	list.innerHTML = '';
	if (!gmPedidos.length) {
		list.appendChild(createEl('div', 'gm-admin-empty', 'Nenhuma compra ou contratação ainda.'));
		return;
	}

	gmPedidos.forEach(pedido => {
		const etapas = getEtapasPedido(pedido.tipo);
		const isFinal = pedido.etapaIndex === etapas.length - 1;

		const card = createEl('article', `gm-pedido-item gm-pedido-item--${pedido.tipo}`);

		const head = createEl('div', 'gm-pedido-item-head');
		head.appendChild(createEl('span', `gm-pedido-badge gm-pedido-badge--${pedido.tipo}`, rotuloTipoPedido(pedido.tipo)));
		head.appendChild(createEl('span', `gm-pedido-status gm-pedido-status--${isFinal ? 'concluido' : 'andamento'}`, isFinal ? 'Concluído' : 'Em andamento'));
		card.appendChild(head);

		card.appendChild(createEl('h6', 'gm-pedido-item-title', pedido.item));
		card.appendChild(createEl('p', 'gm-pedido-item-meta', `${pedido.cliente} · ${formatPriceLabel(pedido.valor)} · ${pedido.quando}`));
		card.appendChild(buildPedidoSteps(pedido));
		card.appendChild(buildPedidoActions(pedido));

		list.appendChild(card);
	});
}

function avancarEtapaPedido(id) {
	const pedido = gmPedidos.find(p => p.id === id);
	if (!pedido) return;

	const etapas = getEtapasPedido(pedido.tipo);
	if (pedido.etapaIndex >= etapas.length - 1) return;

	pedido.etapaIndex += 1;
	const novaEtapa = etapas[pedido.etapaIndex];

	renderPedidos();
	renderPainel();
	atualizarBadgeAtividade();
	gmToast(`Cliente notificado: "${novaEtapa.label}" — ${pedido.item}.`);
}

function verEtiquetaPedido(id) {
	const pedido = gmPedidos.find(p => p.id === id);
	if (!pedido) return;
	gmToast(`Abrindo etiqueta de envio de "${pedido.item}" (simulação).`);
}

function iniciaisNome(nome) {
	return (nome || '')
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map(parte => parte[0].toUpperCase())
		.join('');
}

function truncar(texto, max) {
	if (!texto || texto.length <= max) return texto || '';
	return `${texto.slice(0, max).trim()}…`;
}

function buildMensagemRow(msg) {
	const row = createEl('button', `gm-mensagem-row${msg.lida ? '' : ' is-unread'}`);
	row.type = 'button';
	row.dataset.action = 'abrir-mensagem';
	row.dataset.mensagemId = String(msg.id);

	row.appendChild(createEl('div', 'gm-mensagem-avatar', iniciaisNome(msg.cliente)));

	const body = createEl('div', 'gm-mensagem-row-body');
	const head = createEl('div', 'gm-mensagem-head');
	head.appendChild(createEl('strong', 'gm-mensagem-nome', msg.cliente));
	head.appendChild(createEl('span', 'gm-mensagem-quando', msg.quando));
	body.appendChild(head);
	body.appendChild(createEl('p', 'gm-mensagem-row-preview', truncar(msg.mensagem, 56)));
	body.appendChild(createEl('span', 'gm-mensagem-item-ref', `Sobre: ${msg.item}`));
	row.appendChild(body);

	if (!msg.lida) row.appendChild(createEl('span', 'gm-mensagem-row-dot'));

	return row;
}

function buildMensagensGrupo(titulo, mensagens) {
	const section = createEl('section', 'gm-mensagens-grupo');
	if (titulo) section.appendChild(createEl('h4', 'gm-mensagens-grupo-titulo', titulo));
	const rows = createEl('div', 'gm-mensagens-grupo-rows');
	if (!mensagens.length) {
		rows.appendChild(createEl('div', 'gm-admin-empty', 'Nada por aqui ainda.'));
	} else {
		mensagens.forEach(msg => rows.appendChild(buildMensagemRow(msg)));
	}
	section.appendChild(rows);
	return section;
}

function buildMensagensFiltro() {
	const wrap = createEl('div', 'gm-mensagens-filtro');
	[
		{ valor: 'compra', label: 'Compras e contratações' },
		{ valor: 'interacao', label: 'Interações' },
	].forEach(({ valor, label }) => {
		const btn = createEl('button', `gm-mensagens-filtro-btn${gmMensagensFiltro === valor ? ' active' : ''}`, label);
		btn.type = 'button';
		btn.dataset.action = 'filtrar-mensagens';
		btn.dataset.filtro = valor;
		wrap.appendChild(btn);
	});
	return wrap;
}

function buildAnexoChip(anexo, removivel) {
	const chip = createEl('span', 'gm-anexo-chip');
	const icon = document.createElement('i');
	icon.className = `fas ${GM_TIPO_ANEXO_ICON[anexo.tipo] || 'fa-paperclip'}`;
	chip.appendChild(icon);
	chip.appendChild(document.createTextNode(anexo.nome));
	if (removivel) {
		const remove = createEl('button', 'gm-anexo-chip-remove', '×');
		remove.type = 'button';
		remove.dataset.action = 'remover-anexo-composer';
		remove.dataset.anexoNome = anexo.nome;
		chip.appendChild(remove);
	}
	return chip;
}

function buildChatBubble(texto, anexos, quando, direcao) {
	const bubble = createEl('div', `gm-chat-bubble gm-chat-bubble--${direcao}`);
	if (texto) bubble.appendChild(createEl('p', 'gm-chat-bubble-texto', texto));
	if (anexos?.length) {
		const anexosWrap = createEl('div', 'gm-mensagem-anexos');
		anexos.forEach(anexo => anexosWrap.appendChild(buildAnexoChip(anexo, false)));
		bubble.appendChild(anexosWrap);
	}
	if (quando) bubble.appendChild(createEl('span', 'gm-chat-bubble-hora', quando));
	return bubble;
}

function buildMensagemDetalhe(msg) {
	const wrap = createEl('div', 'gm-mensagem-detalhe');

	const back = createEl('button', 'gm-mensagem-detalhe-back', 'Voltar');
	back.type = 'button';
	back.dataset.action = 'fechar-mensagem';
	const backIcon = document.createElement('i');
	backIcon.className = 'fas fa-arrow-left';
	back.prepend(backIcon);
	wrap.appendChild(back);

	const head = createEl('div', 'gm-mensagem-detalhe-head');
	head.appendChild(createEl('div', 'gm-mensagem-avatar gm-mensagem-avatar--lg', iniciaisNome(msg.cliente)));
	const headInfo = createEl('div');
	headInfo.appendChild(createEl('strong', 'gm-mensagem-nome', msg.cliente));
	headInfo.appendChild(createEl('span', 'gm-mensagem-item-ref', `Sobre: ${msg.item}`));
	head.appendChild(headInfo);
	head.appendChild(createEl('span', `gm-mensagem-tipo-tag gm-mensagem-tipo-tag--${msg.tipo}`, msg.tipo === 'compra' ? 'Compra/contratação' : 'Interação'));
	wrap.appendChild(head);

	const chat = createEl('div', 'gm-chat');
	chat.appendChild(buildChatBubble(msg.mensagem, msg.anexosCliente, msg.quando, 'in'));
	(msg.respostas || []).forEach(resp => {
		chat.appendChild(buildChatBubble(resp.texto, resp.anexos, resp.quando, 'out'));
	});
	wrap.appendChild(chat);

	const form = createEl('div', 'gm-chat-composer');

	if (gmComposerAnexos.length) {
		const anexosWrap = createEl('div', 'gm-mensagem-anexos gm-mensagem-anexos--composer');
		gmComposerAnexos.forEach(anexo => anexosWrap.appendChild(buildAnexoChip(anexo, true)));
		form.appendChild(anexosWrap);
	}

	const inputRow = createEl('div', 'gm-chat-composer-row');

	const attachWrap = createEl('div', 'gm-composer-attach-wrap');
	const clipBtn = createEl('button', 'gm-composer-clip-btn');
	clipBtn.type = 'button';
	clipBtn.dataset.action = 'toggle-anexo-menu';
	const clipIcon = document.createElement('i');
	clipIcon.className = 'fas fa-paperclip';
	clipBtn.appendChild(clipIcon);
	attachWrap.appendChild(clipBtn);

	if (gmComposerMenuAberto) {
		const menu = createEl('div', 'gm-composer-attach-menu');
		[
			{ tipo: 'foto', icon: 'fa-image', label: 'Foto', accept: 'image/*' },
			{ tipo: 'video', icon: 'fa-video', label: 'Vídeo', accept: 'video/*' },
			{ tipo: 'documento', icon: 'fa-file-alt', label: 'Documento', accept: '.pdf,.doc,.docx,.txt' },
		].forEach(({ tipo, icon, label, accept }) => {
			const btn = createEl('button', 'gm-composer-attach-btn');
			btn.type = 'button';
			const btnIcon = document.createElement('i');
			btnIcon.className = `fas ${icon}`;
			btn.appendChild(btnIcon);
			btn.appendChild(document.createTextNode(` ${label}`));

			const input = document.createElement('input');
			input.type = 'file';
			input.accept = accept;
			input.hidden = true;
			input.dataset.anexoTipo = tipo;
			input.addEventListener('change', () => {
				if (input.files?.[0]) {
					gmComposerAnexos.push({ nome: input.files[0].name, tipo });
					gmComposerMenuAberto = false;
					renderMensagens();
				}
			});

			btn.addEventListener('click', () => input.click());
			menu.appendChild(btn);
			menu.appendChild(input);
		});
		attachWrap.appendChild(menu);
	}

	inputRow.appendChild(attachWrap);

	const textarea = document.createElement('textarea');
	textarea.rows = 1;
	textarea.className = 'gm-chat-composer-input';
	textarea.placeholder = 'Digite uma mensagem...';
	textarea.dataset.replyId = String(msg.id);
	textarea.value = gmComposerTexto;
	textarea.addEventListener('input', () => { gmComposerTexto = textarea.value; });
	textarea.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			enviarRespostaMensagem(msg.id);
		}
	});
	inputRow.appendChild(textarea);

	const enviarBtn = createEl('button', 'gm-chat-send-btn');
	enviarBtn.type = 'button';
	enviarBtn.dataset.action = 'enviar-resposta';
	enviarBtn.dataset.mensagemId = String(msg.id);
	const sendIcon = document.createElement('i');
	sendIcon.className = 'fas fa-paper-plane';
	enviarBtn.appendChild(sendIcon);
	inputRow.appendChild(enviarBtn);

	form.appendChild(inputRow);
	wrap.appendChild(form);

	return wrap;
}

function renderMensagens() {
	const list = document.getElementById('gm-mensagens-list');
	if (!list) return;

	list.innerHTML = '';

	if (gmMensagemAbertaId >= 0) {
		const msg = gmMensagens.find(m => m.id === gmMensagemAbertaId);
		if (msg) {
			list.appendChild(buildMensagemDetalhe(msg));
			list.querySelector('textarea')?.focus();
			return;
		}
		gmMensagemAbertaId = -1;
	}

	list.appendChild(buildMensagensFiltro());

	if (!gmMensagens.length) {
		list.appendChild(createEl('div', 'gm-admin-empty', 'Nenhuma mensagem ainda.'));
		return;
	}

	const filtradas = gmMensagens.filter(m => m.tipo === gmMensagensFiltro);
	list.appendChild(buildMensagensGrupo('', filtradas));
}

function mapMensagemApi(m) {
	return {
		id: m.id,
		tipo: m.tipo,
		cliente: m.cliente_nome || 'Cliente',
		mensagem: m.texto,
		item: m.item_nome || '—',
		quando: tempoRelativo(m.criado_em),
		lida: Boolean(m.lida),
		anexosCliente: (m.anexos || []).map(a => ({ nome: a.nome_arquivo, tipo: a.tipo })),
		respostas: (m.respostas || []).map(r => ({ texto: r.texto, anexos: [], quando: tempoRelativo(r.criado_em) })),
	};
}

async function carregarMensagens() {
	if (!gmLojaId) return;
	const dados = await fetchMensagensLoja(gmLojaId);
	if (!Array.isArray(dados)) return;
	gmMensagens = dados.map(mapMensagemApi);
	renderMensagens();
	atualizarBadgeAtividade();
}

function preencherFormularioLoja(loja) {
	const setValue = (id, value) => {
		const el = document.getElementById(id);
		if (el) el.value = value ?? '';
	};

	setValue('gm-app-name', loja.nome);
	setValue('gm-store-category', loja.categoria);
	setValue('gm-app-subtitle', loja.subtitulo);
	setValue('gm-address', loja.endereco);
	setValue('gm-address-url', loja.endereco_url);
	setValue('gm-primary-color', loja.cor_primaria);
	setValue('gm-accent-color', loja.cor_destaque);
	setValue('gm-banner-url', loja.banner_url);
	setValue('gm-card-url', loja.card_url);
	setValue('gm-app-icon-url', loja.icone_url);
	setValue('gm-preview-card-mode', loja.modo_card);
	setValue('gm-open-time', formatarHoraParaInput(loja.horario_abre));
	setValue('gm-close-time', formatarHoraParaInput(loja.horario_fecha));
}

async function inicializarLojaGerenciamento() {
	const loja = await fetchLojaPorSlug('loja-central');
	if (!loja || loja.erro) return;
	gmLojaId = loja.id;

	preencherFormularioLoja(loja);

	gmItems = (loja.itens || []).map(mapItemApiParaLocal);
	gmItemsOriginalIds = gmItems.map(item => item.id);
	gmFilters = (loja.filtros || []).map(mapFiltroApiParaLocal);
	gmClosedDates = (loja.dias_fechados || []).map(d => (d.data || '').slice(0, 10));

	renderAdminItems();
	renderFilterList();
	renderClosedDates();
	aplicarPreview();

	await carregarMensagens();
}

async function salvarLojaCompleta() {
	if (!gmLojaId) {
		gmToast('Loja ainda não carregada. Tente novamente em instantes.');
		return;
	}
	if (gmSalvandoLoja) return;
	gmSalvandoLoja = true;

	try {
		const openTime = document.getElementById('gm-open-time')?.value || GM_DEFAULT.openTime;
		const closeTime = document.getElementById('gm-close-time')?.value || GM_DEFAULT.closeTime;

		const dadosLoja = {
			nome: document.getElementById('gm-app-name')?.value?.trim() || GM_DEFAULT.name,
			categoria: document.getElementById('gm-store-category')?.value || '',
			subtitulo: document.getElementById('gm-app-subtitle')?.value?.trim() || '',
			endereco: document.getElementById('gm-address')?.value?.trim() || '',
			endereco_url: document.getElementById('gm-address-url')?.value?.trim() || '',
			cor_primaria: document.getElementById('gm-primary-color')?.value || GM_DEFAULT.primary,
			cor_destaque: document.getElementById('gm-accent-color')?.value || GM_DEFAULT.accent,
			banner_url: document.getElementById('gm-banner-url')?.value?.trim() || '',
			card_url: document.getElementById('gm-card-url')?.value?.trim() || '',
			icone_url: document.getElementById('gm-app-icon-url')?.value?.trim() || '',
			horario_abre: `${openTime}:00`,
			horario_fecha: `${closeTime}:00`,
			modo_card: document.getElementById('gm-preview-card-mode')?.value || 'portrait',
			filtros: gmFilters.map(f => ({ name: f.name, value: f.value, manualItems: f.manualItems || [] })),
			dias_fechados: [...gmClosedDates],
		};

		const resultadoLoja = await atualizarLoja(gmLojaId, dadosLoja);
		if (!resultadoLoja || resultadoLoja.erro) {
			gmToast('Não foi possível salvar a loja. Verifique sua conexão.');
			return;
		}

		const idsAtuais = new Set();
		for (const item of gmItems) {
			const payload = mapItemLocalParaApi(item, gmLojaId);
			if (item.id) {
				await atualizarItem(item.id, payload);
				idsAtuais.add(item.id);
			} else {
				const criado = await criarItem(payload);
				if (criado?.id) {
					item.id = criado.id;
					idsAtuais.add(criado.id);
				}
			}
		}

		const removidos = gmItemsOriginalIds.filter(id => !idsAtuais.has(id));
		for (const id of removidos) {
			await removerItemApi(id);
		}
		gmItemsOriginalIds = [...idsAtuais];

		aplicarPreview();
		gmToast('Loja salva e publicada com sucesso.');
	} finally {
		gmSalvandoLoja = false;
	}
}

function filtrarMensagens(valor) {
	gmMensagensFiltro = valor;
	renderMensagens();
}

function abrirMensagem(id) {
	gmMensagemAbertaId = id;
	gmComposerAnexos = [];
	gmComposerTexto = '';
	gmComposerMenuAberto = false;

	const msg = gmMensagens.find(m => m.id === id);
	if (msg && !msg.lida) {
		msg.lida = true;
		marcarMensagemLida(id);
	}

	renderMensagens();
	atualizarBadgeAtividade();
}

function fecharMensagemDetalhe() {
	gmMensagemAbertaId = -1;
	gmComposerAnexos = [];
	gmComposerTexto = '';
	gmComposerMenuAberto = false;
	renderMensagens();
}

function toggleAnexoMenu() {
	gmComposerMenuAberto = !gmComposerMenuAberto;
	renderMensagens();
}

function removerAnexoComposer(nome) {
	gmComposerAnexos = gmComposerAnexos.filter(a => a.nome !== nome);
	renderMensagens();
}

async function enviarRespostaMensagem(id) {
	const texto = gmComposerTexto.trim();
	if (!texto && !gmComposerAnexos.length) {
		gmToast('Escreva uma resposta ou anexe um arquivo antes de enviar.');
		return;
	}

	const msg = gmMensagens.find(m => m.id === id);
	if (!msg) return;

	const resultado = await responderMensagem(id, texto);
	if (!resultado) {
		gmToast('Não foi possível enviar a resposta. Tente novamente.');
		return;
	}

	msg.respostas = msg.respostas || [];
	msg.respostas.push({ texto, anexos: gmComposerAnexos, quando: 'agora' });
	msg.lida = true;
	gmComposerAnexos = [];
	gmComposerTexto = '';
	gmComposerMenuAberto = false;

	renderMensagens();
	atualizarBadgeAtividade();
}

function buildStatCard(icon, valor, label) {
	const card = createEl('article', 'gm-stat-card');
	card.appendChild(createEl('span', 'gm-stat-icon'));
	card.querySelector('.gm-stat-icon').innerHTML = `<i class="fas ${icon}"></i>`;
	card.appendChild(createEl('strong', 'gm-stat-valor', String(valor)));
	card.appendChild(createEl('span', 'gm-stat-label', label));
	return card;
}

function buildRankingList(itens) {
	const list = createEl('div', 'gm-ranking-rows');
	if (!itens.length) {
		list.appendChild(createEl('div', 'gm-admin-empty', 'Sem dados ainda.'));
		return list;
	}
	const maior = Math.max(...itens.map(i => i.valor));
	itens.forEach((item, index) => {
		const row = createEl('div', 'gm-ranking-row');
		row.appendChild(createEl('span', 'gm-ranking-pos', `#${index + 1}`));
		const info = createEl('div', 'gm-ranking-info');
		info.appendChild(createEl('span', 'gm-ranking-nome', item.nome));
		const barTrack = createEl('div', 'gm-ranking-bar-track');
		const bar = createEl('div', 'gm-ranking-bar');
		bar.style.width = `${Math.round((item.valor / maior) * 100)}%`;
		barTrack.appendChild(bar);
		info.appendChild(barTrack);
		row.appendChild(info);
		row.appendChild(createEl('strong', 'gm-ranking-valor', String(item.valor)));
		list.appendChild(row);
	});
	return list;
}

function renderPainel() {
	const statsEl = document.getElementById('gm-dashboard-stats');
	if (statsEl) {
		const vendasConcluidas = gmPedidos.filter(p => p.etapaIndex >= getEtapasPedido(p.tipo).length - 1).length;
		const vendasPendentes = gmPedidos.filter(p => p.etapaIndex < getEtapasPedido(p.tipo).length - 1).length;

		statsEl.innerHTML = '';
		statsEl.appendChild(buildStatCard('fa-bag-shopping', gmPedidos.length, 'Vendas totais'));
		statsEl.appendChild(buildStatCard('fa-check-circle', vendasConcluidas, 'Vendas concluídas'));
		statsEl.appendChild(buildStatCard('fa-hourglass-half', vendasPendentes, 'Vendas pendentes'));
		statsEl.appendChild(buildStatCard('fa-cart-plus', GM_DASHBOARD.carrinhoUsuarios, 'Usuários com item no carrinho'));
	}

	const curtidosEl = document.getElementById('gm-ranking-curtidos');
	if (curtidosEl) {
		curtidosEl.innerHTML = '';
		curtidosEl.appendChild(buildRankingList(GM_DASHBOARD.produtosMaisCurtidos));
	}

	const compradosEl = document.getElementById('gm-ranking-comprados');
	if (compradosEl) {
		compradosEl.innerHTML = '';
		compradosEl.appendChild(buildRankingList(GM_DASHBOARD.produtosMaisComprados));
	}
}

function atualizarBadgeAtividade() {
	const naoLidas = gmMensagens.filter(m => !m.lida).length;
	const pendentes = gmPedidos.filter(p => p.etapaIndex < getEtapasPedido(p.tipo).length - 1).length;

	const setBadge = (id, valor) => {
		const el = document.getElementById(id);
		if (!el) return;
		el.textContent = String(valor);
		el.hidden = valor === 0;
	};

	setBadge('gm-atividade-badge', pendentes);
	setBadge('gm-messages-bubble-badge', naoLidas);
}

function bindGerenciamento() {
	const form = document.getElementById('gm-form');
	if (!form) return;

	gmItems = cloneDefaultItems();
	gmFilters = [...GM_DEFAULT.filters];
	gmClosedDates = [...GM_DEFAULT.closedDates];
	gmPedidos = GM_PEDIDOS.map(pedido => ({ ...pedido }));
	renderAdminItems();
	renderFilterList();
	renderClosedDates();
	renderPedidos();
	renderMensagens();
	renderPainel();
	atualizarBadgeAtividade();
	refreshSubcategoryOptions(GM_DEFAULT.itemCategory, GM_DEFAULT.itemSubcategory);
	inicializarLojaGerenciamento();

	document.getElementById('gm-pedidos-list')?.addEventListener('click', event => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		const btn = target.closest('button[data-action]');
		if (!btn) return;
		const id = Number(btn.dataset.pedidoId);
		if (!id) return;
		if (btn.dataset.action === 'avancar-etapa') avancarEtapaPedido(id);
		if (btn.dataset.action === 'ver-etiqueta') verEtiquetaPedido(id);
	});

	document.getElementById('gm-mensagens-list')?.addEventListener('click', event => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		const btn = target.closest('button[data-action], [role="button"][data-action]');
		if (!btn) return;
		const action = btn.dataset.action;
		const id = Number(btn.dataset.mensagemId);
		if (action === 'abrir-mensagem' && id) abrirMensagem(id);
		if (action === 'fechar-mensagem') fecharMensagemDetalhe();
		if (action === 'enviar-resposta' && id) enviarRespostaMensagem(id);
		if (action === 'remover-anexo-composer') removerAnexoComposer(btn.dataset.anexoNome);
		if (action === 'toggle-anexo-menu') toggleAnexoMenu();
		if (action === 'filtrar-mensagens') filtrarMensagens(btn.dataset.filtro);
	});

	bindMessagesBubble();

	form.querySelectorAll('input, textarea, select').forEach(field => {
		field.addEventListener('input', aplicarPreview);
		field.addEventListener('change', aplicarPreview);
	});

	document.getElementById('gm-item-category')?.addEventListener('change', () => {
		refreshSubcategoryOptions(document.getElementById('gm-item-category')?.value || '', '');
		aplicarPreview();
	});

	document.getElementById('gm-item-subcategory')?.addEventListener('change', () => {
		setSubcategoryCustomVisibility();
		aplicarPreview();
	});

	document.getElementById('gm-add-filter')?.addEventListener('click', addFilter);
	document.getElementById('gm-clear-filter-fields')?.addEventListener('click', () => {
		clearFilterFields();
		gmToast('Campos de filtro limpos.');
	});

	document.getElementById('gm-filter-list')?.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		const editBtn = target.closest('[data-edit-filter-index]');
		if (editBtn) {
			const index = Number(editBtn.getAttribute('data-edit-filter-index'));
			if (!Number.isNaN(index)) loadFilterIntoForm(index);
			return;
		}
		const removeBtn = target.closest('[data-filter-index]');
		if (!removeBtn) return;
		const index = Number(removeBtn.getAttribute('data-filter-index'));
		if (Number.isNaN(index)) return;
		removeFilter(index);
	});

	document.getElementById('gm-add-closed-date')?.addEventListener('click', addClosedDate);
	document.getElementById('gm-closed-dates-list')?.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		const removeBtn = target.closest('[data-remove-closed-date-index]');
		if (!removeBtn) return;
		const index = Number(removeBtn.getAttribute('data-remove-closed-date-index'));
		if (Number.isNaN(index)) return;
		removeClosedDate(index);
	});

	document.getElementById('gm-preview-opt-services')?.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		const chip = target.closest('.gm-filter-chip');
		if (!chip) return;
		const index = Number(chip.dataset.filterIndex);
		if (Number.isNaN(index)) return;
		gmActiveFilterIndex = index === gmActiveFilterIndex ? -1 : index;
		renderFilterChips();
		renderPreviewItems();
	});

	document.getElementById('gm-preview-items')?.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		const button = target.closest('.gm-preview-item-button');
		if (button) return;
		const itemCard = target.closest('.gm-preview-item');
		if (!itemCard) return;
		itemCard.classList.toggle('expanded');
	});

	document.getElementById('gm-add-item')?.addEventListener('click', addItem);
	document.getElementById('gm-clear-item-fields')?.addEventListener('click', () => {
		clearItemFields();
		gmToast('Campos do item limpos.');
	});

	document.getElementById('gm-items-admin-list')?.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const editBtn = target.closest('[data-edit-index]');
		if (editBtn) {
			const index = Number(editBtn.getAttribute('data-edit-index'));
			if (!Number.isNaN(index)) loadItemIntoForm(index);
			return;
		}

		const removeBtn = target.closest('[data-remove-index]');
		if (!removeBtn) return;
		const index = Number(removeBtn.getAttribute('data-remove-index'));
		if (Number.isNaN(index)) return;
		removeItem(index);
	});

	document.getElementById('gm-reset')?.addEventListener('click', resetForm);

	document.getElementById('gm-generate')?.addEventListener('click', () => {
		aplicarPreview();
		salvarLojaCompleta();
	});

	document.getElementById('gm-generate-preview')?.addEventListener('click', () => {
		aplicarPreview();
		salvarLojaCompleta();
	});

	document.getElementById('gm-open-preview-tab')?.addEventListener('click', () => {
		document.getElementById('gm-tab-preview')?.click();
	});

	bindStepAccordion(form);
	bindPreviewControls();
	aplicarPreview();
}

function bindHamburgerGerenciamento() {
	const btn = document.getElementById('hamburger');
	const nav = document.getElementById('nav');
	if (!btn || !nav) return;

	btn.addEventListener('click', () => {
		btn.classList.toggle('active');
		nav.classList.toggle('open');
	});

	nav.querySelectorAll('.nav-link').forEach(link => {
		link.addEventListener('click', () => {
			btn.classList.remove('active');
			nav.classList.remove('open');
		});
	});
}

document.addEventListener('DOMContentLoaded', () => {
	bindTabs();
	bindGerenciamento();
	bindHamburgerGerenciamento();
});
