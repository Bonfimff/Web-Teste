'use strict';

/* =========================================================
   MEGA DISTRITO — Cliente da API (backend Flask + MySQL)
   Deve ser carregado ANTES de script.js/conta.js/gerenciamento.js.
   Todas as funções falham silenciosamente (retornam null) quando
   o backend está fora do ar, para o site continuar funcionando
   com os dados estáticos de JS/data/*.js como fallback.
   ========================================================= */

// O backend só existe na VPS (não há Flask rodando localmente), então
// toda origem aponta para lá — inclusive ao testar via localhost.
const API_BASE_URL = 'https://mega-distrito-api.exksvol.com/api';

async function apiRequest(path, options) {
    try {
        const resp = await fetch(`${API_BASE_URL}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        if (resp.status === 204) return true;
        // Erros HTTP (4xx/5xx) ainda trazem corpo JSON útil (ex: { erro: '...' }).
        // Só retornamos null quando a própria conexão falha (ver catch abaixo).
        try {
            return await resp.json();
        } catch {
            return resp.ok ? true : null;
        }
    } catch (erro) {
        console.warn(`[api] Falha ao acessar ${path}:`, erro.message);
        return null;
    }
}

const apiGet = path => apiRequest(path);
const apiPost = (path, body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body) });
const apiPatch = (path, body) => apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) });
const apiDelete = path => apiRequest(path, { method: 'DELETE' });

// ── Catálogo ──
const fetchCategorias = () => apiGet('/categorias');
const fetchItens = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiGet(`/itens${query ? `?${query}` : ''}`);
};
const fetchLojas = () => apiGet('/lojas');
const fetchLojaPorSlug = slug => apiGet(`/lojas/${encodeURIComponent(slug)}`);
const atualizarLoja = (lojaId, dados) => apiPatch(`/lojas/${lojaId}`, dados);
const criarItem = dados => apiPost('/itens', dados);
const atualizarItem = (itemId, dados) => apiPatch(`/itens/${itemId}`, dados);
const removerItemApi = itemId => apiDelete(`/itens/${itemId}`);
const fetchApps = () => apiGet('/apps');
const fetchProfissionais = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiGet(`/profissionais${query ? `?${query}` : ''}`);
};
const fetchVagas = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiGet(`/vagas${query ? `?${query}` : ''}`);
};
const fetchAtalhos = usuarioId => apiGet(`/usuarios/${usuarioId}/atalhos`);
const fixarAtalho = (usuarioId, appId) => apiPost(`/usuarios/${usuarioId}/atalhos/${appId}`);
const removerAtalho = (usuarioId, appId) => apiDelete(`/usuarios/${usuarioId}/atalhos/${appId}`);

// ── Usuários ──
const cadastrarUsuario = dados => apiPost('/usuarios/cadastro', dados);
const loginUsuario = dados => apiPost('/usuarios/login', dados);
const solicitarRecuperacaoSenha = email => apiPost('/usuarios/recuperar-senha', { email });
const redefinirSenha = (email, codigo, novaSenha) =>
    apiPost('/usuarios/redefinir-senha', { email, codigo, nova_senha: novaSenha });
const confirmarCadastro = (email, codigo) => apiPost('/usuarios/confirmar-cadastro', { email, codigo });
const reenviarCodigoCadastro = email => apiPost('/usuarios/reenviar-codigo-cadastro', { email });

// ── Endereços ──
const fetchEnderecos = usuarioId => apiGet(`/usuarios/${usuarioId}/enderecos`);
const criarEndereco = (usuarioId, dados) => apiPost(`/usuarios/${usuarioId}/enderecos`, dados);
const removerEnderecoApi = enderecoId => apiDelete(`/enderecos/${enderecoId}`);

// ── Pedidos ──
const fetchPedidosUsuario = (usuarioId, status) =>
    apiGet(`/usuarios/${usuarioId}/pedidos${status ? `?status=${status}` : ''}`);
const criarPedido = dados => apiPost('/pedidos', dados);
const atualizarStatusPedido = (pedidoId, status) => apiPatch(`/pedidos/${pedidoId}/status`, { status });
const criarAvaliacao = (pedidoId, dados) => apiPost(`/pedidos/${pedidoId}/avaliacao`, dados);

// ── Mensagens (painel do lojista) ──
const fetchMensagensLoja = (lojaId, tipo) =>
    apiGet(`/lojas/${lojaId}/mensagens${tipo ? `?tipo=${tipo}` : ''}`);
const responderMensagem = (mensagemId, texto) => apiPost(`/mensagens/${mensagemId}/respostas`, { texto });
const marcarMensagemLida = mensagemId => apiPatch(`/mensagens/${mensagemId}/lida`);

// ── Sessão local (usuário logado no navegador) ──
const CONTA_SESSAO_KEY = 'mage-usuario-logado';

function contaSalvarSessao(usuario) {
    localStorage.setItem(CONTA_SESSAO_KEY, JSON.stringify(usuario));
}

function contaObterSessao() {
    try {
        return JSON.parse(localStorage.getItem(CONTA_SESSAO_KEY));
    } catch {
        return null;
    }
}

function contaEncerrarSessao() {
    localStorage.removeItem(CONTA_SESSAO_KEY);
}
