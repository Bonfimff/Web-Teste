'use strict';

/* =========================================================
   MEGA DISTRITO — Minha Conta
   Usa a API (JS/api.js) quando o backend está disponível;
   cai para os dados de demonstração (CONTA_PEDIDOS_SEED/
   CONTA_ENDERECOS_SEED) quando não há conexão com o backend.
   ========================================================= */

const STATUS_PEDIDO_LABEL = {
	pagamento: 'Aguardando pagamento',
	preparando: 'Preparando',
	caminho: 'A caminho',
	avaliar: 'A avaliar',
	concluido: 'Concluído',
};

const STATUS_PEDIDO_ICON = {
	pagamento: 'fa-clock',
	preparando: 'fa-box-open',
	caminho: 'fa-truck-fast',
	avaliar: 'fa-star',
	concluido: 'fa-circle-check',
};

// status interno (usado na tela) <-> status do backend (enum do schema)
const STATUS_API_TO_LOCAL = {
	aguardando_pagamento: 'pagamento',
	preparando: 'preparando',
	a_caminho: 'caminho',
	a_avaliar: 'avaliar',
	concluido: 'concluido',
};
const STATUS_LOCAL_TO_API = {
	pagamento: 'aguardando_pagamento',
	preparando: 'preparando',
	caminho: 'a_caminho',
	avaliar: 'a_avaliar',
	concluido: 'concluido',
};

const CONTA_PEDIDOS_SEED = [
	{ id: 1, status: 'pagamento', item: 'Fone Bluetooth X200', loja: 'TechMage', valor: '129,90', quando: 'Hoje, 09:40' },
	{ id: 2, status: 'preparando', item: 'Combo da Casa', loja: 'Loja Central', valor: '39,90', quando: 'Ontem' },
	{ id: 3, status: 'caminho', item: 'Notebook Ultrafino i5', loja: 'Mercado Express', valor: '2.799,00', quando: 'Há 1 dia', rastreio: 'BR998877665BR' },
	{ id: 4, status: 'caminho', item: 'Kit Ferramentas', loja: 'Bazar Local', valor: '89,00', quando: 'Há 2 dias', rastreio: 'BR123456789BR' },
	{ id: 5, status: 'avaliar', item: 'Instalação Residencial', loja: 'Serviços Pro', valor: '120,00', quando: 'Há 5 dias' },
];

const CONTA_ENDERECOS_SEED = [
	{ id: 1, apelido: 'Casa', rua: 'Rua Principal, 123', bairro: 'Centro', cidade: 'Magé - RJ', cep: '25900-000' },
];

let contaUsuario = null;
let contaUsandoApi = false;
let contaPedidos = [];
let contaEnderecos = [];
let contaPedidosFiltro = 'pagamento';
let contaAvaliacaoAbertaId = -1;
let contaAvaliacaoNota = 0;
let authModoCadastro = false;

function contaToast(msg) {
	toast(msg);
}

function createEl(tag, className, text) {
	const el = document.createElement(tag);
	if (className) el.className = className;
	if (typeof text === 'string') el.textContent = text;
	return el;
}

function formatPrecoConta(valor) {
	const numero = typeof valor === 'number' ? valor : parseFloat(String(valor).replace('.', '').replace(',', '.'));
	if (Number.isNaN(numero)) return `R$ ${valor}`;
	return `R$ ${numero.toFixed(2).replace('.', ',')}`;
}

function formatQuandoConta(dataIso) {
	if (!dataIso) return '';
	const data = new Date(dataIso.replace(' ', 'T'));
	if (Number.isNaN(data.getTime())) return '';
	return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function pedidoApiParaLocal(p) {
	return {
		id: p.id,
		status: STATUS_API_TO_LOCAL[p.status] || 'pagamento',
		item: p.item_nome || `Pedido #${p.id}`,
		loja: p.loja_nome || 'Vitrine Mega Distrito',
		valor: formatPrecoConta(p.valor).replace('R$ ', ''),
		quando: formatQuandoConta(p.criado_em),
		rastreio: p.codigo_rastreio || null,
	};
}

/* ── Autenticação ── */

function contaAtualizarModoAuth() {
	document.getElementById('auth-titulo').textContent = authModoCadastro ? 'Criar conta' : 'Entrar';
	document.getElementById('auth-subtitulo').textContent = authModoCadastro
		? 'Preencha seus dados para criar sua conta.'
		: 'Entre com sua conta para ver pedidos e endereços.';
	document.getElementById('auth-campo-nome').hidden = !authModoCadastro;
	document.getElementById('auth-enviar').textContent = authModoCadastro ? 'Criar conta' : 'Entrar';
	document.getElementById('auth-alternar').textContent = authModoCadastro
		? 'Já tenho conta'
		: 'Ainda não tenho conta';
}

async function contaEnviarAuth() {
	const email = document.getElementById('auth-email')?.value?.trim();
	const senha = document.getElementById('auth-senha')?.value;

	if (!email || !senha) {
		contaToast('Preencha e-mail e senha.');
		return;
	}

	if (authModoCadastro) {
		const nome = document.getElementById('auth-nome')?.value?.trim();
		if (!nome) {
			contaToast('Informe seu nome completo.');
			return;
		}
		const resultado = await cadastrarUsuario({ nome, email, senha });
		if (!resultado || resultado.erro) {
			contaToast(resultado?.erro || 'Não foi possível criar a conta. O backend está no ar?');
			return;
		}
		if (resultado.aguardando_confirmacao) {
			abrirConfirmarCadastro(resultado.email);
			contaToast('Conta criada! Confirme o código enviado para seu e-mail.');
			return;
		}
		contaSalvarSessao(resultado);
		contaToast('Conta criada com sucesso!');
	} else {
		const resultado = await loginUsuario({ email, senha });
		if (!resultado || resultado.erro) {
			if (resultado?.email_nao_confirmado) {
				abrirConfirmarCadastro(resultado.email);
				contaToast('Confirme seu e-mail para poder entrar.');
				return;
			}
			contaToast(resultado?.erro || 'Não foi possível entrar. Verifique e-mail/senha ou se o backend está no ar.');
			return;
		}
		contaSalvarSessao(resultado);
		contaToast(`Bem-vindo(a), ${resultado.nome.split(' ')[0]}!`);
	}

	await contaIniciarSessaoLogada();
}

/* ── Confirmação de cadastro ── */

let confirmarEmailPendente = '';

function abrirConfirmarCadastro(email) {
	confirmarEmailPendente = email;
	document.getElementById('auth-form').hidden = true;
	document.getElementById('recuperar-form').hidden = true;
	document.getElementById('confirmar-form').hidden = false;
}

function fecharConfirmarCadastro() {
	confirmarEmailPendente = '';
	document.getElementById('confirmar-form').reset();
	document.getElementById('confirmar-form').hidden = true;
	document.getElementById('auth-form').hidden = false;
}

async function contaEnviarConfirmacao() {
	const codigo = document.getElementById('confirmar-codigo')?.value?.trim();
	if (!codigo) {
		contaToast('Informe o código recebido por e-mail.');
		return;
	}

	const resultado = await confirmarCadastro(confirmarEmailPendente, codigo);
	if (!resultado || resultado.erro) {
		contaToast(resultado?.erro || 'Não foi possível confirmar o cadastro.');
		return;
	}

	contaSalvarSessao(resultado);
	contaToast(`Conta confirmada! Bem-vindo(a), ${resultado.nome.split(' ')[0]}!`);
	fecharConfirmarCadastro();
	await contaIniciarSessaoLogada();
}

async function contaReenviarCodigoCadastro() {
	if (!confirmarEmailPendente) return;
	const resultado = await reenviarCodigoCadastro(confirmarEmailPendente);
	if (!resultado) {
		contaToast('Não foi possível reenviar o código. O backend está no ar?');
		return;
	}
	contaToast('Código reenviado! Verifique sua caixa de entrada.');
}

/* ── Recuperação de senha ── */

let recuperarCodigoEnviado = false;

function abrirRecuperarSenha() {
	document.getElementById('auth-form').hidden = true;
	document.getElementById('recuperar-form').hidden = false;
}

function fecharRecuperarSenha() {
	recuperarCodigoEnviado = false;
	document.getElementById('recuperar-form').reset();
	document.getElementById('recuperar-campo-codigo').hidden = true;
	document.getElementById('recuperar-campo-nova-senha').hidden = true;
	document.getElementById('recuperar-instrucao').textContent = 'Informe seu e-mail para receber um código de recuperação.';
	document.getElementById('recuperar-enviar').textContent = 'Enviar código';
	document.getElementById('recuperar-form').hidden = true;
	document.getElementById('auth-form').hidden = false;
}

async function contaEnviarRecuperacao() {
	const email = document.getElementById('recuperar-email')?.value?.trim();
	if (!email) {
		contaToast('Informe seu e-mail.');
		return;
	}

	if (!recuperarCodigoEnviado) {
		const resultado = await solicitarRecuperacaoSenha(email);
		if (!resultado) {
			contaToast('Não foi possível enviar o código. O backend está no ar?');
			return;
		}
		recuperarCodigoEnviado = true;
		document.getElementById('recuperar-campo-codigo').hidden = false;
		document.getElementById('recuperar-campo-nova-senha').hidden = false;
		document.getElementById('recuperar-instrucao').textContent = 'Enviamos um código para seu e-mail. Informe-o abaixo com sua nova senha.';
		document.getElementById('recuperar-enviar').textContent = 'Redefinir senha';
		contaToast('Código enviado! Verifique sua caixa de entrada.');
		return;
	}

	const codigo = document.getElementById('recuperar-codigo')?.value?.trim();
	const novaSenha = document.getElementById('recuperar-nova-senha')?.value;
	if (!codigo || !novaSenha) {
		contaToast('Informe o código recebido e a nova senha.');
		return;
	}

	const resultado = await redefinirSenha(email, codigo, novaSenha);
	if (!resultado || resultado.erro) {
		contaToast(resultado?.erro || 'Não foi possível redefinir a senha.');
		return;
	}

	contaToast('Senha redefinida com sucesso! Entre com sua nova senha.');
	fecharRecuperarSenha();
}

function contaSair() {
	contaEncerrarSessao();
	contaUsuario = null;
	contaUsandoApi = false;
	document.getElementById('painel-auth').classList.remove('conta-panel--hidden');
	document.getElementById('conta-tabs-row').hidden = true;
	['painel-encomendas', 'painel-dados', 'painel-enderecos'].forEach(id => {
		document.getElementById(id)?.classList.add('conta-panel--hidden');
	});
	contaToast('Você saiu da sua conta.');
}

/* ── Encomendas ── */

function buildEstrelas(pedidoId) {
	const wrap = createEl('div', 'avaliacao-estrelas');
	for (let i = 1; i <= 5; i += 1) {
		const estrela = createEl('button', `avaliacao-estrela${i <= contaAvaliacaoNota ? ' is-ativa' : ''}`);
		estrela.type = 'button';
		estrela.dataset.action = 'definir-nota';
		estrela.dataset.pedidoId = String(pedidoId);
		estrela.dataset.nota = String(i);
		const icon = document.createElement('i');
		icon.className = i <= contaAvaliacaoNota ? 'fas fa-star' : 'far fa-star';
		estrela.appendChild(icon);
		wrap.appendChild(estrela);
	}
	return wrap;
}

function buildAvaliacaoForm(pedido) {
	const form = createEl('div', 'avaliacao-form');
	form.appendChild(createEl('span', 'avaliacao-form-label', 'Sua nota'));
	form.appendChild(buildEstrelas(pedido.id));

	const textarea = document.createElement('textarea');
	textarea.rows = 2;
	textarea.placeholder = 'Conte como foi sua experiência (opcional)...';
	textarea.id = 'avaliacao-comentario';
	form.appendChild(textarea);

	const actions = createEl('div', 'avaliacao-form-actions');
	const cancelar = createEl('button', 'btn btn-outline', 'Cancelar');
	cancelar.type = 'button';
	cancelar.dataset.action = 'cancelar-avaliacao';
	const enviar = createEl('button', 'btn btn-primary', 'Enviar avaliação');
	enviar.type = 'button';
	enviar.dataset.action = 'enviar-avaliacao';
	enviar.dataset.pedidoId = String(pedido.id);
	actions.appendChild(cancelar);
	actions.appendChild(enviar);
	form.appendChild(actions);

	return form;
}

function buildPedidoActions(pedido) {
	const actions = createEl('div', 'pedido-actions');

	if (pedido.status === 'pagamento') {
		const btn = createEl('button', 'btn btn-primary', 'Pagar agora');
		btn.type = 'button';
		btn.dataset.action = 'pagar';
		btn.dataset.pedidoId = String(pedido.id);
		actions.appendChild(btn);
		return actions;
	}

	if (pedido.status === 'preparando') {
		actions.appendChild(createEl('span', 'pedido-tag', 'A loja está preparando seu pedido'));
		return actions;
	}

	if (pedido.status === 'caminho') {
		const btn = createEl('button', 'btn btn-outline', 'Rastrear pedido');
		btn.type = 'button';
		btn.dataset.action = 'rastrear';
		btn.dataset.pedidoId = String(pedido.id);
		actions.appendChild(btn);
		return actions;
	}

	if (pedido.status === 'avaliar') {
		if (contaAvaliacaoAbertaId === pedido.id) {
			actions.appendChild(buildAvaliacaoForm(pedido));
		} else {
			const btn = createEl('button', 'btn btn-primary', 'Avaliar pedido');
			btn.type = 'button';
			btn.dataset.action = 'abrir-avaliacao';
			btn.dataset.pedidoId = String(pedido.id);
			actions.appendChild(btn);
		}
	}

	return actions;
}

function buildPedidoCard(pedido) {
	const card = createEl('article', `pedido-card pedido-card--${pedido.status}`);

	const head = createEl('div', 'pedido-card-head');
	const icon = createEl('span', 'pedido-icon');
	icon.innerHTML = `<i class="fas ${STATUS_PEDIDO_ICON[pedido.status] || 'fa-box'}"></i>`;
	head.appendChild(icon);

	const info = createEl('div', 'pedido-info');
	info.appendChild(createEl('h5', 'pedido-item-nome', pedido.item));
	info.appendChild(createEl('span', 'pedido-loja', pedido.loja));
	head.appendChild(info);

	head.appendChild(createEl('span', `pedido-status-badge pedido-status-badge--${pedido.status}`, STATUS_PEDIDO_LABEL[pedido.status]));
	card.appendChild(head);

	card.appendChild(createEl('p', 'pedido-meta', `${formatPrecoConta(pedido.valor)} · ${pedido.quando}`));

	if (pedido.status === 'caminho' && pedido.rastreio) {
		card.appendChild(createEl('p', 'pedido-rastreio', `Código de rastreio: ${pedido.rastreio}`));
	}

	card.appendChild(buildPedidoActions(pedido));

	return card;
}

function renderPedidos() {
	const list = document.getElementById('pedidos-list');
	if (!list) return;

	list.innerHTML = '';
	const filtrados = contaPedidos.filter(p => p.status === contaPedidosFiltro);

	if (!filtrados.length) {
		list.appendChild(createEl('div', 'conta-empty', 'Nenhum pedido nesta categoria.'));
		return;
	}

	filtrados.forEach(pedido => list.appendChild(buildPedidoCard(pedido)));

	if (contaAvaliacaoAbertaId >= 0) {
		list.querySelector('.avaliacao-form textarea')?.focus();
	}
}

function filtrarPedidos(status) {
	contaPedidosFiltro = status;
	document.querySelectorAll('.pedido-filtro-chip').forEach(chip => {
		chip.classList.toggle('active', chip.dataset.status === status);
	});
	renderPedidos();
}

async function pagarPedido(id) {
	const pedido = contaPedidos.find(p => p.id === id);
	if (!pedido) return;
	pedido.status = 'preparando';
	renderPedidos();
	if (contaUsandoApi) await atualizarStatusPedido(id, STATUS_LOCAL_TO_API.preparando);
	contaToast('Pagamento confirmado! A loja já foi notificada e vai preparar seu pedido.');
}

function rastrearPedido(id) {
	const pedido = contaPedidos.find(p => p.id === id);
	if (!pedido) return;
	contaToast(`Rastreio ${pedido.rastreio || 'indisponível'}: seu pedido está a caminho.`);
}

function abrirAvaliacao(id) {
	contaAvaliacaoAbertaId = id;
	contaAvaliacaoNota = 0;
	renderPedidos();
}

function cancelarAvaliacao() {
	contaAvaliacaoAbertaId = -1;
	contaAvaliacaoNota = 0;
	renderPedidos();
}

function definirNotaAvaliacao(nota) {
	contaAvaliacaoNota = nota;
	renderPedidos();
}

async function enviarAvaliacao(id) {
	if (!contaAvaliacaoNota) {
		contaToast('Selecione uma nota de 1 a 5 estrelas.');
		return;
	}
	const pedido = contaPedidos.find(p => p.id === id);
	if (!pedido) return;
	pedido.status = 'concluido';
	const comentario = document.getElementById('avaliacao-comentario')?.value || '';
	contaAvaliacaoAbertaId = -1;
	contaAvaliacaoNota = 0;
	renderPedidos();
	if (contaUsandoApi) {
		await criarAvaliacao(id, { usuario_id: contaUsuario.id, nota: contaAvaliacaoNota, comentario });
	}
	contaToast('Avaliação enviada! Obrigado pelo feedback.');
}

/* ── Meus Dados ── */

function salvarDadosConta() {
	const nome = document.getElementById('conta-nome')?.value?.trim();
	if (!nome) {
		contaToast('Informe seu nome completo.');
		return;
	}
	const senha = document.getElementById('conta-senha');
	if (senha) senha.value = '';
	contaToast('Dados atualizados (demonstração — edição via API ainda não implementada).');
}

/* ── Endereços ── */

function buildEnderecoCard(endereco) {
	const card = createEl('article', 'endereco-card');
	const head = createEl('div', 'endereco-card-head');
	head.appendChild(createEl('span', 'endereco-tag', endereco.apelido));
	const removeBtn = createEl('button', 'endereco-remove-btn', 'Remover');
	removeBtn.type = 'button';
	removeBtn.dataset.action = 'remover-endereco';
	removeBtn.dataset.enderecoId = String(endereco.id);
	head.appendChild(removeBtn);
	card.appendChild(head);

	card.appendChild(createEl('p', 'endereco-linha', endereco.rua));
	card.appendChild(createEl('p', 'endereco-linha', `${endereco.bairro} · ${endereco.cidade}`));
	card.appendChild(createEl('p', 'endereco-linha endereco-cep', `CEP: ${endereco.cep}`));

	return card;
}

function renderEnderecos() {
	const list = document.getElementById('enderecos-list');
	if (!list) return;
	list.innerHTML = '';
	if (!contaEnderecos.length) {
		list.appendChild(createEl('div', 'conta-empty', 'Nenhum endereço cadastrado ainda.'));
		return;
	}
	contaEnderecos.forEach(endereco => list.appendChild(buildEnderecoCard(endereco)));
}

function abrirFormEndereco() {
	document.getElementById('endereco-form')?.removeAttribute('hidden');
	document.getElementById('endereco-abrir-form')?.setAttribute('hidden', '');
}

function fecharFormEndereco() {
	const form = document.getElementById('endereco-form');
	if (form) {
		form.setAttribute('hidden', '');
		form.reset();
	}
	document.getElementById('endereco-abrir-form')?.removeAttribute('hidden');
}

async function salvarEndereco() {
	const apelido = document.getElementById('endereco-apelido')?.value || 'Casa';
	const rua = document.getElementById('endereco-rua')?.value?.trim();
	const bairro = document.getElementById('endereco-bairro')?.value?.trim();
	const cidade = document.getElementById('endereco-cidade')?.value?.trim();
	const cep = document.getElementById('endereco-cep')?.value?.trim();

	if (!rua || !bairro || !cidade || !cep) {
		contaToast('Preencha todos os campos do endereço.');
		return;
	}

	if (contaUsandoApi) {
		const resultado = await criarEndereco(contaUsuario.id, { apelido, rua, bairro, cidade, cep });
		if (!resultado) {
			contaToast('Não foi possível salvar no servidor. Tente novamente.');
			return;
		}
		contaEnderecos.push({ id: resultado.id, apelido, rua, bairro, cidade, cep });
	} else {
		const novoId = contaEnderecos.reduce((max, e) => Math.max(max, e.id), 0) + 1;
		contaEnderecos.push({ id: novoId, apelido, rua, bairro, cidade, cep });
	}

	renderEnderecos();
	fecharFormEndereco();
	contaToast('Endereço cadastrado.');
}

async function removerEndereco(id) {
	contaEnderecos = contaEnderecos.filter(e => e.id !== id);
	renderEnderecos();
	if (contaUsandoApi) await removerEnderecoApi(id);
	contaToast('Endereço removido.');
}

/* ── Abas ── */

function bindContaTabs() {
	const tabs = document.querySelectorAll('.conta-tab');
	const panels = document.querySelectorAll('.conta-panel');

	tabs.forEach(tab => {
		tab.addEventListener('click', () => {
			const targetId = tab.getAttribute('aria-controls');

			tabs.forEach(t => {
				t.classList.remove('active');
				t.setAttribute('aria-selected', 'false');
			});
			panels.forEach(p => {
				if (p.id !== 'painel-auth') p.classList.add('conta-panel--hidden');
			});

			tab.classList.add('active');
			tab.setAttribute('aria-selected', 'true');
			document.getElementById(targetId)?.classList.remove('conta-panel--hidden');
		});
	});
}

/* ── Sessão logada: carrega dados reais (ou seed) ── */

async function contaIniciarSessaoLogada() {
	contaUsuario = contaObterSessao();
	if (!contaUsuario) return;

	document.getElementById('painel-auth').classList.add('conta-panel--hidden');
	document.getElementById('conta-tabs-row').hidden = false;
	document.getElementById('painel-encomendas').classList.remove('conta-panel--hidden');

	const nomeInput = document.getElementById('conta-nome');
	const emailInput = document.getElementById('conta-email');
	if (nomeInput) nomeInput.value = contaUsuario.nome;
	if (emailInput) emailInput.value = contaUsuario.email;

	const pedidosApi = await fetchPedidosUsuario(contaUsuario.id);
	const enderecosApi = await fetchEnderecos(contaUsuario.id);

	if (pedidosApi) {
		contaUsandoApi = true;
		contaPedidos = pedidosApi.map(pedidoApiParaLocal);
		contaEnderecos = enderecosApi || [];
	} else {
		contaUsandoApi = false;
		contaPedidos = CONTA_PEDIDOS_SEED.map(p => ({ ...p }));
		contaEnderecos = CONTA_ENDERECOS_SEED.map(e => ({ ...e }));
		contaToast('Backend indisponível — mostrando dados de demonstração.');
	}

	renderPedidos();
	renderEnderecos();
}

function bindConta() {
	bindContaTabs();
	contaAtualizarModoAuth();

	document.getElementById('auth-alternar')?.addEventListener('click', () => {
		authModoCadastro = !authModoCadastro;
		contaAtualizarModoAuth();
	});
	document.getElementById('auth-enviar')?.addEventListener('click', contaEnviarAuth);
	document.getElementById('conta-sair')?.addEventListener('click', contaSair);
	document.getElementById('auth-esqueci-senha')?.addEventListener('click', abrirRecuperarSenha);
	document.getElementById('recuperar-voltar')?.addEventListener('click', fecharRecuperarSenha);
	document.getElementById('recuperar-enviar')?.addEventListener('click', contaEnviarRecuperacao);
	document.getElementById('confirmar-enviar')?.addEventListener('click', contaEnviarConfirmacao);
	document.getElementById('confirmar-reenviar')?.addEventListener('click', contaReenviarCodigoCadastro);
	document.getElementById('confirmar-voltar')?.addEventListener('click', fecharConfirmarCadastro);

	document.querySelectorAll('.pedido-filtro-chip').forEach(chip => {
		chip.addEventListener('click', () => filtrarPedidos(chip.dataset.status));
	});

	document.getElementById('pedidos-list')?.addEventListener('click', event => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		const btn = target.closest('button[data-action]');
		if (!btn) return;
		const id = Number(btn.dataset.pedidoId);
		const action = btn.dataset.action;
		if (action === 'pagar' && id) pagarPedido(id);
		if (action === 'rastrear' && id) rastrearPedido(id);
		if (action === 'abrir-avaliacao' && id) abrirAvaliacao(id);
		if (action === 'cancelar-avaliacao') cancelarAvaliacao();
		if (action === 'definir-nota' && id) definirNotaAvaliacao(Number(btn.dataset.nota));
		if (action === 'enviar-avaliacao' && id) enviarAvaliacao(id);
	});

	document.getElementById('conta-salvar-dados')?.addEventListener('click', salvarDadosConta);

	document.getElementById('endereco-abrir-form')?.addEventListener('click', abrirFormEndereco);
	document.getElementById('endereco-cancelar')?.addEventListener('click', fecharFormEndereco);
	document.getElementById('endereco-salvar')?.addEventListener('click', salvarEndereco);

	document.getElementById('enderecos-list')?.addEventListener('click', event => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		const btn = target.closest('[data-action="remover-endereco"]');
		if (!btn) return;
		const id = Number(btn.dataset.enderecoId);
		if (id) removerEndereco(id);
	});

	if (contaObterSessao()) {
		contaIniciarSessaoLogada();
	} else {
		document.getElementById('painel-auth').classList.remove('conta-panel--hidden');
	}
}

document.addEventListener('DOMContentLoaded', bindConta);
