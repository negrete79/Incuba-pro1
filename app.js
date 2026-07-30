// === DADOS PRÉ-CONFIGURADOS ===
const ESPECIES_DEFAULT = [
    { nome: "Galinha", dias: 21, temp: 37.5, umidade: 60 },
    { nome: "Codorna", dias: 17, temp: 37.8, umidade: 60 },
    { nome: "Pato", dias: 28, temp: 37.5, umidade: 65 },
    { nome: "Ganso", dias: 30, temp: 37.5, umidade: 70 },
    { nome: "Marreco", dias: 35, temp: 37.2, umidade: 65 },
    { nome: "Pavão", dias: 28, temp: 37.5, umidade: 60 },
    { nome: "Peru", dias: 28, temp: 37.5, umidade: 60 },
    { nome: "Calopsita", dias: 18, temp: 37.3, umidade: 55 }
];

const ETAPAS_INCUBACAO = [
    { titulo: "Antes de Ligar a Chocadeira", desc: "Configuração inicial e limpeza" },
    { titulo: "Preparando os Ovos", desc: "Seleção, ovoscopia prévia e armazenamento" },
    { titulo: "Antes de utilizar a chocadeira", desc: "Estabilização de temperatura" },
    { titulo: "Acompanhamento Dia a Dia", desc: "Viragem de ovos e umidade" },
    { titulo: "Ovoscopia Crítica", desc: "Exames nos dias 7 e 14" },
    { titulo: "Eclosão e Nascimento", desc: "Preparação do pinteiro para os pintinhos" }
];

// === ESTADO E GERENCIAMENTO DE DADOS ===
let state = {
    etapasConcluidas: [],
    lotes: [],
    apiKey: ""
};

function loadState() {
    try {
        const saved = localStorage.getItem('incubapro_state');
        if (saved) state = JSON.parse(saved);
        // Garantir que etapasConcluidas sempre exista
        if(!Array.isArray(state.etapasConcluidas)) state.etapasConcluidas = [];
    } catch (e) { console.error("Erro ao carregar estado", e); }
}

function saveState() {
    localStorage.setItem('incubapro_state', JSON.stringify(state));
}

// === NAVEGAÇÃO ===
const navButtons = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const headerTitle = document.getElementById('header-title');

const viewTitles = {
    home: "IncubaPro",
    lotes: "Meus Lotes",
    ia: "IA Assistente",
    calendario: "Calendário",
    especies: "Tabela de Espécies"
};

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetView = btn.dataset.view;
        
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${targetView}`).classList.add('active');
        
        headerTitle.textContent = viewTitles[targetView];

        // Atualiza conteúdos dinâmicos ao entrar na tela
        if(targetView === 'lotes') renderLotes();
        if(targetView === 'calendario') renderCalendario();
        if(targetView === 'especies') renderEspecies();
    });
});

// === TELA: INÍCIO (LINHA DO TEMPO) ===
function renderTimeline() {
    const list = document.getElementById('timeline-steps');
    list.innerHTML = '';
    
    ETAPAS_INCUBACAO.forEach((etapa, index) => {
        const isCompleted = state.etapasConcluidas.includes(index);
        const li = document.createElement('li');
        li.className = isCompleted ? 'completed' : '';
        li.innerHTML = `<h3>${etapa.titulo}</h3><p>${etapa.desc}</p>`;
        
        li.addEventListener('click', () => {
            if (isCompleted) {
                state.etapasConcluidas = state.etapasConcluidas.filter(i => i !== index);
            } else {
                state.etapasConcluidas.push(index);
            }
            saveState();
            renderTimeline();
        });
        
        list.appendChild(li);
    });
    
    updateProgressRing();
}

function updateProgressRing() {
    const total = ETAPAS_INCUBACAO.length;
    const done = state.etapasConcluidas.length;
    const percent = Math.round((done / total) * 100);
    
    document.getElementById('progress-percent').textContent = `${percent}%`;
    
    const circle = document.getElementById('progress-ring-fill');
    const circumference = 2 * Math.PI * 54; // Raio de 54
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

// === TELA: LOTES ===
const modalLote = document.getElementById('modal-lote');
const selectEspecie = document.getElementById('lote-especie');
const customFields = document.getElementById('custom-species-fields');

function initLotesForm() {
    // Preencher select
    ESPECIES_DEFAULT.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.nome;
        opt.textContent = `${e.nome} (${e.dias} dias)`;
        selectEspecie.appendChild(opt);
    });
    
    const optCustom = document.createElement('option');
    optCustom.value = "custom";
    optCustom.textContent = "Outra espécie (Personalizada)";
    selectEspecie.appendChild(optCustom);

    // Toggle campos personalizados
    selectEspecie.addEventListener('change', () => {
        customFields.style.display = selectEspecie.value === 'custom' ? 'block' : 'none';
    });

    // Setar data de hoje como padrão
    document.getElementById('lote-data').valueAsDate = new Date();
}

function renderLotes() {
    const container = document.getElementById('lotes-list');
    container.innerHTML = '';
    
    if (state.lotes.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:40px;">Nenhum lote cadastrado.</p>';
        return;
    }

    state.lotes.forEach((lote, index) => {
        const hoje = new Date();
        const inicio = new Date(lote.dataInicio + "T00:00:00");
        const diaAtual = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
        const diasRestantes = Math.max(0, lote.diasIncubacao - diaAtual);
        const progresso = Math.min(100, Math.max(0, (diaAtual / lote.diasIncubacao) * 100));

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <span class="card-title">${lote.nome}</span>
                <span class="card-badge">${diasRestantes > 0 ? diasRestantes + ' dias restantes' : 'Pronto para eclosão'}</span>
            </div>
            <div class="card-info">Espécie: ${lote.especieNome} | Ovos: ${lote.qtdOvos}</div>
            <div class="card-info">Temp: ${lote.temp}°C | Umid: ${lote.umidade}%</div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${progresso}%"></div>
            </div>
            <button class="btn-delete" data-index="${index}">Excluir Lote</button>
        `;
        
        card.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if(confirm("Deseja realmente excluir este lote?")) {
                state.lotes.splice(index, 1);
                saveState();
                renderLotes();
            }
        });

        container.appendChild(card);
    });
}

document.getElementById('btn-add-lote').addEventListener('click', () => {
    modalLote.classList.add('show');
});
document.getElementById('close-lote').addEventListener('click', () => {
    modalLote.classList.remove('show');
});

document.getElementById('btn-save-lote').addEventListener('click', () => {
    const nome = document.getElementById('lote-nome').value.trim();
    const especieVal = selectEspecie.value;
    const qtd = document.getElementById('lote-qtd').value;
    const data = document.getElementById('lote-data').value;

    if (!nome || !especieVal || !qtd || !data) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    let dadosEspecie;
    if (especieVal === 'custom') {
        const cNome = document.getElementById('custom-name').value.trim();
        const cDias = parseInt(document.getElementById('custom-days').value);
        const cTemp = parseFloat(document.getElementById('custom-temp').value);
        const cUmid = parseInt(document.getElementById('custom-humid').value);
        if(!cNome || !cDias || !cTemp || !cUmid) {
            alert("Preencha os dados da espécie personalizada.");
            return;
        }
        dadosEspecie = { nome: cNome, dias: cDias, temp: cTemp, umidade: cUmid };
    } else {
        dadosEspecie = ESPECIES_DEFAULT.find(e => e.nome === especieVal);
    }

    state.lotes.push({
        id: Date.now(),
        nome: nome,
        especieNome: dadosEspecie.nome,
        diasIncubacao: dadosEspecie.dias,
        temp: dadosEspecie.temp,
        umidade: dadosEspecie.umidade,
        qtdOvos: parseInt(qtd),
        dataInicio: data
    });

    saveState();
    modalLote.classList.remove('show');
    
    // Limpar formulário
    document.getElementById('lote-nome').value = '';
    document.getElementById('lote-qtd').value = '';
    selectEspecie.value = '';
    customFields.style.display = 'none';
    
    renderLotes();
});

// === TELA: CALENDÁRIO ===
function renderCalendario() {
    const container = document.getElementById('calendar-events');
    container.innerHTML = '';
    
    if (state.lotes.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:40px;">Nenhum lote ativo para exibir no calendário.</p>';
        return;
    }

    let eventos = [];

    state.lotes.forEach(lote => {
        const inicio = new Date(lote.dataInicio + "T00:00:00");
        
        // Ovoscopia Dia 7
        let dataEv = new Date(inicio);
        dataEv.setDate(dataEv.getDate() + 7);
        eventos.push({ data: dataEv, lote: lote.nome, tipo: 'Ovoscopia (Dia 7)', tag: 'tag-ovoscopia' });

        // Ovoscopia Dia 14
        dataEv = new Date(inicio);
        dataEv.setDate(dataEv.getDate() + 14);
        eventos.push({ data: dataEv, lote: lote.nome, tipo: 'Ovoscopia (Dia 14)', tag: 'tag-ovoscopia' });

        // Parada de rolagem (3 dias antes do fim)
        dataEv = new Date(inicio);
        dataEv.setDate(dataEv.getDate() + (lote.diasIncubacao - 3));
        eventos.push({ data: dataEv, lote: lote.nome, tipo: 'Parada de Rolagem', tag: 'tag-parada' });

        // Eclosão
        dataEv = new Date(inicio);
        dataEv.setDate(dataEv.getDate() + lote.diasIncubacao);
        eventos.push({ data: dataEv, lote: lote.nome, tipo: 'Eclosão Prevista', tag: 'tag-eclosao' });
    });

    // Ordenar eventos por data
    eventos.sort((a, b) => a.data - b.data);

    // Filtrar apenas eventos futuros ou de hoje
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    eventos = eventos.filter(e => e.data >= hoje);

    if(eventos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:40px;">Nenhum evento futuro encontrado.</p>';
        return;
    }

    eventos.forEach(ev => {
        const card = document.createElement('div');
        card.className = 'card';
        const dataFormatada = ev.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        card.innerHTML = `
            <div class="event-date">${dataFormatada}</div>
            <div class="event-lote-name">Lote: ${ev.lote}</div>
            <div><span class="event-tag ${ev.tag}">${ev.tipo}</span></div>
        `;
        container.appendChild(card);
    });
}

// === TELA: ESPÉCIES ===
function renderEspecies() {
    const tbody = document.getElementById('especies-tbody');
    tbody.innerHTML = '';
    ESPECIES_DEFAULT.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${e.nome}</td><td>${e.dias}</td><td>${e.temp}</td><td>${e.umidade}</td>`;
        tbody.appendChild(tr);
    });
}

// === CONFIGURAÇÕES & API KEY SEGURA ===
const modalSettings = document.getElementById('modal-settings');
const inputApiKey = document.getElementById('input-api-key');
const apiKeyView = document.getElementById('api-key-view');
const apiKeyActiveView = document.getElementById('api-key-active-view');
const btnRemoveApi = document.getElementById('btn-remove-api');

document.getElementById('btn-settings').addEventListener('click', () => {
    toggleApiView();
    modalSettings.classList.add('show');
});
document.getElementById('close-settings').addEventListener('click', () => {
    modalSettings.classList.remove('show');
});

function toggleApiView() {
    if (state.apiKey) {
        apiKeyView.style.display = 'none';
        apiKeyActiveView.style.display = 'block';
        btnRemoveApi.style.display = 'block';
        document.getElementById('btn-save-api').style.display = 'none';
    } else {
        apiKeyView.style.display = 'block';
        apiKeyActiveView.style.display = 'none';
        btnRemoveApi.style.display = 'none';
        document.getElementById('btn-save-api').style.display = 'block';
        inputApiKey.value = '';
    }
}

document.getElementById('btn-save-api').addEventListener('click', () => {
    const key = inputApiKey.value.trim();
    if (!key.startsWith('gsk_')) {
        alert("Por favor, insira uma chave válida do Groq (iniciando com gsk_)");
        return;
    }
    state.apiKey = key;
    saveState();
    inputApiKey.value = ''; // Limpa da memória da DOM imediatamente
    toggleApiView();
});

btnRemoveApi.addEventListener('click', () => {
    if(confirm("Remover a chave de API salva?")) {
        state.apiKey = "";
        saveState();
        toggleApiView();
    }
});

// === TELA: IA ASSISTENTE (GROQ API) ===
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

document.getElementById('btn-send-chat').addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendChatMessage(); });

async function sendChatMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;

    if (!state.apiKey) {
        alert("Configure sua chave da API do Groq nas Configurações antes de usar a IA.");
        return;
    }

    // Adiciona mensagem do usuário na tela
    appendMessage(msg, 'user');
    chatInput.value = '';

    // Adiciona indicador de digitação
    const typingId = appendMessage("Analisando...", 'bot');

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${state.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: "Você é um Veterinário e Especialista Sênior em Incubação Artificial de Ovos. Responda sempre com precisão técnica, mas de forma acessível. Dê dicas práticas sobre temperatura, umidade, ovoscopia, ovos, e espécies avícolas. Limite suas respostas ao tema de incubação e avicultura."
                    },
                    ...getChatHistory(),
                    { role: "user", content: msg }
                ]
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "Erro na API");
        }

        const data = await response.json();
        const botReply = data.choices[0].message.content;
        
        // Remove indicador e adiciona resposta real
        document.getElementById(typingId).remove();
        appendMessage(botReply, 'bot');

    } catch (error) {
        document.getElementById(typingId).remove();
        appendMessage(`Erro: ${error.message}`, 'bot');
    }
}

function appendMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.id = `msg-${Date.now()}`;
    div.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div.id;
}

function getChatHistory() {
    const msgs = chatMessages.querySelectorAll('.chat-msg');
    const history = [];
    msgs.forEach(m => {
        const role = m.classList.contains('user') ? 'user' : 'assistant';
        history.push({ role, content: m.innerText });
    });
    return history;
}

// === INICIALIZAÇÃO ===
function init() {
    loadState();
    renderTimeline();
    initLotesForm();
    renderEspecies();
}

// Registro do Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW Registrado:', reg.scope))
            .catch(err => console.error('Erro SW:', err));
    });
}

init();
