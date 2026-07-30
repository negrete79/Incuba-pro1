// === DADOS ===
const ESPECIES_DEFAULT = [
    { id: 'd1', nome: "Galinha", dias: 21, temp: 37.5, umidade: 60, padrao: true },
    { id: 'd2', nome: "Codorna", dias: 17, temp: 37.8, umidade: 60, padrao: true },
    { id: 'd3', nome: "Pato", dias: 28, temp: 37.5, umidade: 65, padrao: true },
    { id: 'd4', nome: "Ganso", dias: 30, temp: 37.5, umidade: 70, padrao: true },
    { id: 'd5', nome: "Marreco", dias: 35, temp: 37.2, umidade: 65, padrao: true },
    { id: 'd6', nome: "Pavão", dias: 28, temp: 37.5, umidade: 60, padrao: true },
    { id: 'd7', nome: "Peru", dias: 28, temp: 37.5, umidade: 60, padrao: true },
    { id: 'd8', nome: "Calopsita", dias: 18, temp: 37.3, umidade: 55, padrao: true }
];

const ETAPAS_INCUBACAO = [
    { titulo: "Antes de Ligar a Chocadeira", desc: "Configuração inicial e limpeza" },
    { titulo: "Preparando os Ovos", desc: "Seleção, ovoscopia prévia e armazenamento" },
    { titulo: "Estabilização da Chocadeira", desc: "Ajuste fino de temperatura antes de colocar" },
    { titulo: "Acompanhamento Diário", desc: "Viragem de ovos e controle de umidade" },
    { titulo: "Ovoscopia Crítica", desc: "Exames nos dias 7 e 14" },
    { titulo: "Eclosão e Nascimento", desc: "Preparação do pinteiro para os pintinhos" }
];

let state = {
    etapasConcluidas: [],
    lotes: [],
    customSpecies: [],
    apiKey: ""
};

let alarmInterval = null;
let alarmAudioCtx = null;
let alarmOscillator = null;
let alarmGain = null;
let isAlarmPlaying = false;

function loadState() {
    try {
        const saved = localStorage.getItem('incubapro_state_v2');
        if (saved) state = JSON.parse(saved);
        if(!Array.isArray(state.etapasConcluidas)) state.etapasConcluidas = [];
        if(!Array.isArray(state.customSpecies)) state.customSpecies = [];
    } catch (e) { console.error(e); }
}

function saveState() {
    localStorage.setItem('incubapro_state_v2', JSON.stringify(state));
}

function getAllSpecies() {
    return [...ESPECIES_DEFAULT, ...state.customSpecies];
}

// === NAVEGAÇÃO ===
const navButtons = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const headerTitle = document.getElementById('header-title');
const viewTitles = { home: "IncubaPro", lotes: "Meus Lotes", ia: "IA Assistente", calendario: "Calendário", especies: "Espécies" };

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetView = btn.dataset.view;
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${targetView}`).classList.add('active');
        headerTitle.textContent = viewTitles[targetView];
        if(targetView === 'lotes') renderLotes();
        if(targetView === 'calendario') renderCalendario();
        if(targetView === 'especies') renderEspecies();
    });
});

// === DASHBOARD (INÍCIO) ===
function renderDashboard() {
    const loteAtivo = state.lotes.find(l => {
        const inicio = new Date(l.dataInicio + "T00:00:00");
        const fim = new Date(inicio.getTime() + (l.diasIncubacao * 24 * 60 * 60 * 1000));
        return new Date() <= fim;
    });

    const statusBadge = document.querySelector('.badge-status');
    const heroTitle = document.getElementById('dash-lote-name');
    
    if (loteAtivo) {
        statusBadge.textContent = 'INCUBADORA ATIVA';
        statusBadge.className = 'badge-status active';
        heroTitle.textContent = loteAtivo.nome;
        
        document.getElementById('dash-species').textContent = loteAtivo.especieNome;
        document.getElementById('dash-temp').textContent = loteAtivo.temp.toFixed(1);
        document.getElementById('dash-humid').textContent = loteAtivo.umidade + '%';

        const inicio = new Date(loteAtivo.dataInicio + "T00:00:00");
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const diasPassados = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
        const diasRestantes = Math.max(0, loteAtivo.diasIncubacao - diasPassados);
        
        document.getElementById('dash-days-left').textContent = diasRestantes + ' dias';
        
        const progresso = Math.min(100, Math.max(0, (diasPassados / loteAtivo.diasIncubacao) * 100));
        document.getElementById('dash-progress-bar').style.width = progresso + '%';
    } else {
        statusBadge.textContent = 'NENHUM LOTE ATIVO';
        statusBadge.className = 'badge-status inactive';
        heroTitle.textContent = 'Cadastre um lote';
        document.getElementById('dash-species').textContent = '---';
        document.getElementById('dash-temp').textContent = '--';
        document.getElementById('dash-humid').textContent = '--%';
        document.getElementById('dash-days-left').textContent = '-- dias';
        document.getElementById('dash-progress-bar').style.width = '0%';
    }
}

// === ALARME SONORO ALTO ===
const btnAlarm = document.getElementById('btn-alarm');
const alarmText = document.getElementById('alarm-timer-text');
let alarmSeconds = 7200; // 2 horas

btnAlarm.addEventListener('click', () => {
    if (isAlarmPlaying) {
        stopAlarm();
    } else if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
        btnAlarm.textContent = 'INICIAR';
        btnAlarm.classList.remove('active');
        alarmText.textContent = 'Toque para iniciar (02:00h)';
        alarmSeconds = 7200;
    } else {
        alarmInterval = setInterval(() => {
            alarmSeconds--;
            const h = Math.floor(alarmSeconds / 3600).toString().padStart(2,'0');
            const m = Math.floor((alarmSeconds % 3600) / 60).toString().padStart(2,'0');
            const s = (alarmSeconds % 60).toString().padStart(2,'0');
            alarmText.textContent = `Alarme em ${h}:${m}:${s}`;
            
            if (alarmSeconds <= 0) {
                clearInterval(alarmInterval);
                alarmInterval = null;
                triggerLoudAlarm();
            }
        }, 1000);
        btnAlarm.textContent = 'CANCELAR';
        btnAlarm.classList.add('active');
    }
});

function triggerLoudAlarm() {
    isAlarmPlaying = true;
    btnAlarm.textContent = 'SILENCIAR';
    btnAlarm.classList.add('active');
    alarmText.textContent = 'VIRE OS OVOS AGORA! ALARME TOCANDO.';

    alarmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    alarmGain = alarmAudioCtx.createGain();
    alarmGain.gain.value = 1; // Volume máximo
    alarmGain.connect(alarmAudioCtx.destination);

    function playBeep() {
        if (!isAlarmPlaying) return;
        alarmOscillator = alarmAudioCtx.createOscillator();
        alarmOscillator.type = 'square'; // Som mais agudo e irritante para acordar
        alarmOscillator.frequency.setValueAtTime(1000, alarmAudioCtx.currentTime); // Frequência alta
        alarmOscillator.connect(alarmGain);
        alarmOscillator.start();
        
        setTimeout(() => {
            alarmOscillator.stop();
            if(isAlarmPlaying) setTimeout(playBeep, 500); // Pausa entre beeps
        }, 500);
    }
    playBeep();
}

function stopAlarm() {
    isAlarmPlaying = false;
    if (alarmOscillator) alarmOscillator.stop();
    if (alarmAudioCtx) alarmAudioCtx.close();
    btnAlarm.textContent = 'INICIAR';
    btnAlarm.classList.remove('active');
    alarmText.textContent = 'Toque para iniciar (02:00h)';
    alarmSeconds = 7200;
}

// === TIMELINE ===
function renderTimeline() {
    const list = document.getElementById('timeline-steps');
    list.innerHTML = ETAPAS_INCUBACAO.map((etapa, i) => {
        const isCompleted = state.etapasConcluidas.includes(i);
        return `<li class="${isCompleted ? 'completed' : ''}" data-index="${i}"><h3>${etapa.titulo}</h3><p>${etapa.desc}</p></li>`;
    }).join('');

    list.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
            const i = parseInt(li.dataset.index);
            if (state.etapasConcluidas.includes(i)) state.etapasConcluidas = state.etapasConcluidas.filter(x => x !== i);
            else state.etapasConcluidas.push(i);
            saveState();
            renderTimeline();
        });
    });
}

// === LOTES ===
const modalLote = document.getElementById('modal-lote');
const selectEspecie = document.getElementById('lote-especie');

function initLotesForm() {
    getAllSpecies().forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = `${e.nome} (${e.dias} dias)`;
        selectEspecie.appendChild(opt);
    });
    const optCustom = document.createElement('option');
    optCustom.value = "custom"; optCustom.textContent = "Outra (Personalizada)";
    selectEspecie.appendChild(optCustom);

    selectEspecie.addEventListener('change', () => {
        document.getElementById('custom-species-fields').style.display = selectEspecie.value === 'custom' ? 'block' : 'none';
    });
    document.getElementById('lote-data').valueAsDate = new Date();
}

function renderLotes() {
    const container = document.getElementById('lotes-list');
    if (state.lotes.length === 0) { container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:40px;">Nenhum lote cadastrado.</p>'; return; }

    container.innerHTML = state.lotes.map((lote, index) => {
        const inicio = new Date(lote.dataInicio + "T00:00:00");
        const diaAtual = Math.floor((new Date() - inicio) / (1000 * 60 * 60 * 24));
        const diasRestantes = Math.max(0, lote.diasIncubacao - diaAtual);
        const progresso = Math.min(100, Math.max(0, (diaAtual / lote.diasIncubacao) * 100));
        return `
        <div class="card">
            <div class="card-header">
                <span class="card-title">${lote.nome}</span>
                <span class="card-badge">${diasRestantes > 0 ? diasRestantes + ' dias' : 'Pronto'}</span>
            </div>
            <div class="card-info"><span>${lote.especieNome}</span><span>${lote.qtdOvos} Ovos</span></div>
            <div class="card-info"><span>Temp: ${lote.temp}°C</span><span>Umid: ${lote.umidade}%</span></div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${progresso}%"></div></div>
            <button class="btn-delete" onclick="deleteLote(${index})">Excluir Lote</button>
        </div>`;
    }).join('');
}

function deleteLote(index) {
    if(confirm("Excluir este lote?")) { state.lotes.splice(index, 1); saveState(); renderLotes(); renderDashboard(); }
}

document.getElementById('btn-add-lote').addEventListener('click', () => modalLote.classList.add('show'));
document.getElementById('close-lote').addEventListener('click', () => modalLote.classList.remove('show'));

document.getElementById('btn-save-lote').addEventListener('click', () => {
    const nome = document.getElementById('lote-nome').value.trim();
    const especieVal = selectEspecie.value;
    const qtd = document.getElementById('lote-qtd').value;
    const data = document.getElementById('lote-data').value;
    if (!nome || !especieVal || !qtd || !data) return alert("Preencha todos os campos.");

    let dadosEspecie;
    if (especieVal === 'custom') {
        dadosEspecie = { nome: document.getElementById('custom-name').value, dias: parseInt(document.getElementById('custom-days').value), temp: parseFloat(document.getElementById('custom-temp').value), umidade: parseInt(document.getElementById('custom-humid').value) };
        if(!dadosEspecie.nome || !dadosEspecie.dias) return alert("Preencha os dados da espécie.");
    } else {
        dadosEspecie = getAllSpecies().find(e => e.id === especieVal);
    }

    state.lotes.push({ id: Date.now(), nome, especieNome: dadosEspecie.nome, diasIncubacao: dadosEspecie.dias, temp: dadosEspecie.temp, umidade: dadosEspecie.umidade, qtdOvos: parseInt(qtd), dataInicio: data });
    saveState(); modalLote.classList.remove('show'); renderLotes(); renderDashboard(); renderCalendario();
    document.getElementById('lote-nome').value = ''; document.getElementById('lote-qtd').value = ''; selectEspecie.value = '';
});

// === ESPÉCIES (CRUD COMPLETO) ===
const modalSpecies = document.getElementById('modal-species');

function renderEspecies() {
    const tbody = document.getElementById('especies-tbody');
    const all = getAllSpecies();
    tbody.innerHTML = all.map(e => `
        <tr>
            <td>${e.nome}</td>
            <td>${e.dias}</td>
            <td>${e.temp}°C</td>
            <td>${e.umidade}%</td>
            <td>
                ${!e.padrao ? `<button class="btn-icon" onclick="editSpecies('${e.id}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="btn-icon del" onclick="deleteSpecies('${e.id}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : '<span style="color:var(--text-secondary); font-size:0.75rem">PADRÃO</span>'}
            </td>
        </tr>
    `).join('');
}

window.editSpecies = function(id) {
    const sp = state.customSpecies.find(s => s.id === id);
    if(!sp) return;
    document.getElementById('species-modal-title').textContent = 'Editar Espécie';
    document.getElementById('edit-species-id').value = id;
    document.getElementById('sp-nome').value = sp.nome;
    document.getElementById('sp-dias').value = sp.dias;
    document.getElementById('sp-temp').value = sp.temp;
    document.getElementById('sp-humid').value = sp.umidade;
    modalSpecies.classList.add('show');
};

window.deleteSpecies = function(id) {
    if(confirm('Excluir esta espécie personalizada?')) {
        state.customSpecies = state.customSpecies.filter(s => s.id !== id);
        saveState(); renderEspecies(); updateLotesSelect();
    }
};

document.getElementById('btn-add-species').addEventListener('click', () => {
    document.getElementById('species-modal-title').textContent = 'Nova Espécie';
    document.getElementById('edit-species-id').value = '';
    document.getElementById('sp-nome').value = '';
    document.getElementById('sp-dias').value = '';
    document.getElementById('sp-temp').value = '';
    document.getElementById('sp-humid').value = '';
    modalSpecies.classList.add('show');
});

document.getElementById('close-species').addEventListener('click', () => modalSpecies.classList.remove('show'));

document.getElementById('btn-save-species').addEventListener('click', () => {
    const id = document.getElementById('edit-species-id').value;
    const data = {
        id: id || 'c' + Date.now(),
        nome: document.getElementById('sp-nome').value.trim(),
        dias: parseInt(document.getElementById('sp-dias').value),
        temp: parseFloat(document.getElementById('sp-temp').value),
        umidade: parseInt(document.getElementById('sp-humid').value),
        padrao: false
    };
    if(!data.nome || !data.dias || !data.temp) return alert('Preencha os campos corretamente.');

    if(id) {
        const index = state.customSpecies.findIndex(s => s.id === id);
        if(index !== -1) state.customSpecies[index] = data;
    } else {
        state.customSpecies.push(data);
    }
    
    saveState(); modalSpecies.classList.remove('show'); renderEspecies(); updateLotesSelect();
});

function updateLotesSelect() {
    const val = selectEspecie.value;
    selectEspecie.innerHTML = '<option value="">Selecione...</option>';
    initLotesForm();
    selectEspecie.value = val;
}

// === CALENDÁRIO ===
function renderCalendario() {
    const container = document.getElementById('calendar-events');
    if (state.lotes.length === 0) { container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:40px;">Nenhum lote ativo.</p>'; return; }

    let eventos = [];
    state.lotes.forEach(lote => {
        const inicio = new Date(lote.dataInicio + "T00:00:00");
        const addEv = (dias, tipo, tag) => { let d = new Date(inicio); d.setDate(d.getDate() + dias); eventos.push({ data: d, lote: lote.nome, tipo, tag }); };
        addEv(7, 'Ovoscopia (Dia 7)', 'tag-ovoscopia');
        addEv(14, 'Ovoscopia (Dia 14)', 'tag-ovoscopia');
        addEv(lote.diasIncubacao - 3, 'Parada de Rolagem', 'tag-parada');
        addEv(lote.diasIncubacao, 'Eclosão Prevista', 'tag-eclosao');
    });

    eventos.sort((a, b) => a.data - b.data);
    eventos = eventos.filter(e => e.data >= new Date(new Date().setHours(0,0,0,0)));

    if(!eventos.length) { container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:40px;">Sem eventos futuros.</p>'; return; }

    container.innerHTML = eventos.map(ev => `
        <div class="card">
            <div class="event-date">${ev.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div class="event-lote-name">Lote: ${ev.lote}</div>
            <div><span class="event-tag ${ev.tag}">${ev.tipo}</span></div>
        </div>
    `).join('');
}

// === CONFIG & API KEY SEGURA ===
const modalSettings = document.getElementById('modal-settings');
const inputApiKey = document.getElementById('input-api-key');

document.getElementById('btn-settings').addEventListener('click', () => { toggleApiView(); modalSettings.classList.add('show'); });
document.getElementById('close-settings').addEventListener('click', () => modalSettings.classList.remove('show'));

function toggleApiView() {
    if (state.apiKey) {
        document.getElementById('api-key-view').style.display = 'none';
        document.getElementById('api-key-active-view').style.display = 'block';
        document.getElementById('btn-remove-api').style.display = 'block';
        document.getElementById('btn-save-api').style.display = 'none';
    } else {
        document.getElementById('api-key-view').style.display = 'block';
        document.getElementById('api-key-active-view').style.display = 'none';
        document.getElementById('btn-remove-api').style.display = 'none';
        document.getElementById('btn-save-api').style.display = 'block';
        inputApiKey.value = '';
    }
}

document.getElementById('btn-save-api').addEventListener('click', () => {
    const key = inputApiKey.value.trim();
    if (!key.startsWith('gsk_')) return alert("Chave inválida (precisa iniciar com gsk_)");
    state.apiKey = key; saveState(); inputApiKey.value = ''; toggleApiView();
});

document.getElementById('btn-remove-api').addEventListener('click', () => {
    if(confirm("Remover a chave?")) { state.apiKey = ""; saveState(); toggleApiView(); }
});

// === IA GROQ ===
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

document.getElementById('btn-send-chat').addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendChatMessage(); });

async function sendChatMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    if (!state.apiKey) return alert("Configure a chave da API nas Configurações.");

    appendMessage(msg, 'user');
    chatInput.value = '';
    const typingId = appendMessage("Analisando...", 'bot');

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${state.apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "Você é um Veterinário e Especialista Sênior em Incubação Artificial de Ovos. Responda com precisão técnica mas acessível." },
                    ...getChatHistory(),
                    { role: "user", content: msg }
                ]
            })
        });
        if (!response.ok) throw new Error((await response.json()).error?.message || "Erro na API");
        const data = await response.json();
        document.getElementById(typingId).remove();
        appendMessage(data.choices[0].message.content, 'bot');
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
    return Array.from(chatMessages.querySelectorAll('.chat-msg')).map(m => ({
        role: m.classList.contains('user') ? 'user' : 'assistant',
        content: m.innerText
    }));
}

// === INIT ===
function init() {
    loadState();
    renderDashboard();
    renderTimeline();
    initLotesForm();
    renderEspecies();
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.error(e)));
}

init();
