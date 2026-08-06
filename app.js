// ==========================================
// 1. REGISTRO DO SERVICE WORKER (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('PWA Pronta!'))
            .catch(() => {});
    });
}

// ==========================================
// 2. SONS DO CHAT
// ==========================================
let audioCtx;

function desbloquearAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Libera o áudio no primeiro clique da tela
document.addEventListener('click', function desbloqueio() {
    desbloquearAudio();
    document.removeEventListener('click', desbloqueio);
}, { once: true });

function playSound(type) {
    try {
        if (!audioCtx) desbloquearAudio();
        const ctx = audioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        
        if (type === 'send') {
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'receive') {
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.setValueAtTime(900, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        } else if (type === 'alarm') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(0, ctx.currentTime + 0.2);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.4);
            osc.frequency.setValueAtTime(0, ctx.currentTime + 0.6);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.8);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1.0);
        }
    } catch (e) {
        // Silencioso se falhar
    }
}

// ==========================================
// 3. DADOS E ESTADO DO APP
// ==========================================
const defaultSpecies = [
    { id: 1, nome: 'Galinha', dias: 21, temp: 37.5, umid: 60 },
    { id: 2, nome: 'Pato', dias: 28, temp: 37.5, umid: 70 },
    { id: 3, nome: 'Codornas', dias: 17, temp: 37.8, umid: 60 },
    { id: 4, nome: 'Calopsita', dias: 18, temp: 37.3, umid: 65 },
    { id: 5, nome: 'Pavão', dias: 28, temp: 37.5, umid: 60 },
    { id: 6, nome: 'Faisão', dias: 24, temp: 37.8, umid: 65 },
    { id: 7, nome: 'Ganso', dias: 30, temp: 37.5, umid: 70 },
    { id: 8, nome: 'Cisne', dias: 35, temp: 37.2, umid: 65 }
];

const defaultSteps = [
    { text: 'Aquecer a incubadora', desc: 'Ligue 24h antes para estabilizar a temperatura.', done: false },
    { text: 'Colocar os ovos', desc: 'Posicione com a ponta mais fina para baixo.', done: false },
    { text: 'Iniciar viragens', desc: 'Vire os ovos no mínimo 3 vezes ao dia.', done: false },
    { text: 'Ovoscopia (Dia 7)', desc: 'Verifique se há embrião em desenvolvimento.', done: false },
    { text: 'Parar viragens (3 dias antes)', desc: 'Deixe os ovos em repouso para o nascimento.', done: false },
    { text: 'Eclosão', desc: 'Não abra a incubadora! Aguarde os pintinhos secarem.', done: false }
];

let species = [];
let lotes = [];
let steps = [];

// Carrega dados com segurança
try {
    const savedSpecies = JSON.parse(localStorage.getItem('ib_species'));
    if (!Array.isArray(savedSpecies) || !savedSpecies.find(s => s.nome === 'Pavão')) {
        species = defaultSpecies;
        localStorage.setItem('ib_species', JSON.stringify(species));
    } else {
        species = savedSpecies;
    }
} catch(e) {
    species = defaultSpecies;
    localStorage.setItem('ib_species', JSON.stringify(species));
}

try {
    lotes = JSON.parse(localStorage.getItem('ib_lotes')) || [];
} catch(e) {
    lotes = [];
}

try {
    steps = JSON.parse(localStorage.getItem('ib_steps')) || defaultSteps;
} catch(e) {
    steps = defaultSteps;
}

function saveData() {
    try {
        localStorage.setItem('ib_species', JSON.stringify(species));
        localStorage.setItem('ib_lotes', JSON.stringify(lotes));
        localStorage.setItem('ib_steps', JSON.stringify(steps));
    } catch(e) {}
}

// ==========================================
// 4. NAVEGAÇÃO
// ==========================================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        btn.classList.add('active');
        
        const viewEl = document.getElementById('view-' + btn.dataset.view);
        if (viewEl) viewEl.classList.add('active');
        
        // Atualiza a agenda ao abrir a aba
        if (btn.dataset.view === 'calendario') {
            renderCalendar();
        }
    });
});

// ==========================================
// 5. MODAIS
// ==========================================
function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('show');
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('show');
}

document.getElementById('btn-settings').addEventListener('click', () => openModal('modal-settings'));
document.getElementById('close-settings').addEventListener('click', () => closeModal('modal-settings'));

document.getElementById('btn-add-lote').addEventListener('click', () => {
    document.getElementById('lote-modal-title').innerText = 'Novo Lote';
    document.getElementById('edit-lote-id').value = '';
    document.getElementById('lote-nome').value = '';
    document.getElementById('lote-qtd').value = '';
    document.getElementById('lote-data').valueAsDate = new Date();
    document.getElementById('btn-save-lote').innerText = 'Criar Lote';
    populateSpeciesSelect();
    openModal('modal-lote');
});

document.getElementById('close-lote').addEventListener('click', () => closeModal('modal-lote'));

document.getElementById('btn-add-species').addEventListener('click', () => {
    document.getElementById('species-modal-title').innerText = 'Nova Espécie';
    document.getElementById('edit-species-id').value = '';
    document.getElementById('sp-nome').value = '';
    document.getElementById('sp-dias').value = '';
    document.getElementById('sp-temp').value = '';
    document.getElementById('sp-humid').value = '';
    openModal('modal-species');
});

document.getElementById('close-species').addEventListener('click', () => closeModal('modal-species'));

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

// ==========================================
// 6. CRUD ESPÉCIES
// ==========================================
function renderSpeciesTable() {
    const tbody = document.getElementById('especies-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = species.map(sp => `
        <tr>
            <td>${sp.nome}</td>
            <td>${sp.dias}d</td>
            <td>${sp.temp}°C</td>
            <td>${sp.umid}%</td>
            <td><button class="btn-sm btn-del" onclick="deleteSpecies(${sp.id})">Excluir</button></td>
        </tr>
    `).join('');
}

document.getElementById('btn-save-species').addEventListener('click', () => {
    const nome = document.getElementById('sp-nome').value.trim();
    const dias = parseInt(document.getElementById('sp-dias').value);
    const temp = parseFloat(document.getElementById('sp-temp').value);
    const umid = parseInt(document.getElementById('sp-humid').value);
    
    if (!nome || !dias || !temp) return alert('Preencha Nome, Dias e Temperatura.');
    
    species.push({ id: Date.now(), nome, dias, temp, umid });
    saveData();
    renderSpeciesTable();
    closeModal('modal-species');
});

window.deleteSpecies = function(id) {
    if (confirm('Excluir esta espécie?')) {
        species = species.filter(s => s.id !== id);
        saveData();
        renderSpeciesTable();
    }
};

// ==========================================
// 7. CRUD LOTES
// ==========================================
function populateSpeciesSelect() {
    const select = document.getElementById('lote-especie');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione...</option>' + 
        species.map(sp => '<option value="' + sp.id + '">' + sp.nome + '</option>').join('');
}

document.getElementById('btn-save-lote').addEventListener('click', () => {
    const editId = document.getElementById('edit-lote-id').value;
    const nome = document.getElementById('lote-nome').value.trim();
    const especieId = document.getElementById('lote-especie').value;
    const qtd = parseInt(document.getElementById('lote-qtd').value) || 0;
    const data = document.getElementById('lote-data').value;
    
    if (!nome || !especieId || !data) return alert('Preencha Nome, Espécie e Data.');

    if (editId) {
        const lote = lotes.find(l => l.id == editId);
        if (lote) {
            lote.nome = nome;
            lote.especieId = parseInt(especieId);
            lote.qtd = qtd;
            lote.dataInicio = data;
        }
    } else {
        lotes.forEach(l => l.ativo = false);
        lotes.push({
            id: Date.now(),
            nome: nome,
            especieId: parseInt(especieId),
            qtd: qtd,
            dataInicio: data,
            ativo: true
        });
    }
    
    saveData();
    renderLotes();
    updateDashboard();
    closeModal('modal-lote');
});

function renderLotes() {
    const list = document.getElementById('lotes-list');
    if (!list) return;
    
    if (lotes.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-dim); padding:40px 0;">Nenhum lote cadastrado.</p>';
        return;
    }
    
    list.innerHTML = lotes.map(l => {
        const sp = species.find(s => s.id === l.especieId);
        const dataFormatada = new Date(l.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR');
        const statusClass = l.ativo ? 'status-active' : 'status-inactive';
        const statusText = l.ativo ? 'Ativo' : 'Inativo';
        
        return `
        <div class="card-item">
            <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0;">${l.nome}</h4>
                    <button class="btn-status ${statusClass}" onclick="toggleLoteStatus(${l.id})">${statusText}</button>
                </div>
                <div class="lote-details-grid">
                    <span><strong>Espécie:</strong> ${sp ? sp.nome : 'Removida'}</span>
                    <span><strong>Ovos:</strong> ${l.qtd} unid.</span>
                    <span><strong>Início:</strong> ${dataFormatada}</span>
                </div>
            </div>
            <div class="lote-actions">
                <button class="btn-sm btn-edit" onclick="editLote(${l.id})">Editar</button>
                <button class="btn-sm btn-del" onclick="deleteLote(${l.id})">Excluir</button>
            </div>
        </div>`;
    }).join('');
}

window.toggleLoteStatus = function(id) {
    const lote = lotes.find(l => l.id === id);
    if (lote) {
        if (lote.ativo) {
            lote.ativo = false;
        } else {
            lotes.forEach(l => l.ativo = false);
            lote.ativo = true;
        }
        saveData();
        renderLotes();
        updateDashboard();
    }
};

window.editLote = function(id) {
    const lote = lotes.find(l => l.id === id);
    if (!lote) return;
    
    document.getElementById('lote-modal-title').innerText = 'Editar Lote';
    document.getElementById('edit-lote-id').value = lote.id;
    document.getElementById('lote-nome').value = lote.nome;
    document.getElementById('lote-qtd').value = lote.qtd;
    document.getElementById('lote-data').value = lote.dataInicio;
    document.getElementById('btn-save-lote').innerText = 'Salvar Alterações';
    
    populateSpeciesSelect();
    document.getElementById('lote-especie').value = lote.especieId;
    
    openModal('modal-lote');
};

window.deleteLote = function(id) {
    if (confirm('Excluir este lote permanentemente?')) {
        lotes = lotes.filter(l => l.id !== id);
        saveData();
        renderLotes();
        updateDashboard();
    }
};

// ==========================================
// 8. DASHBOARD (FUSO HORÁRIO CORRIGIDO)
// ==========================================
function updateDashboard() {
    const ativo = lotes.find(l => l.ativo);
    if (!ativo) {
        document.getElementById('dash-lote-name').innerText = 'Nenhum lote ativo';
        document.getElementById('dash-species').innerText = '---';
        document.getElementById('dash-temp').innerText = '--';
        document.getElementById('dash-humid').innerText = '--%';
        document.getElementById('dash-days-left').innerText = '-- dias';
        document.getElementById('dash-progress-bar').style.width = '0%';
        return;
    }

    const sp = species.find(s => s.id === ativo.especieId);
    document.getElementById('dash-lote-name').innerText = ativo.nome;
    document.getElementById('dash-species').innerText = sp ? sp.nome : '---';
    document.getElementById('dash-temp').innerText = sp ? sp.temp : '--';
    document.getElementById('dash-humid').innerText = sp ? sp.umid + '%' : '--%';

    // Força meio-dia para evitar bugs de fuso horário
    const inicio = new Date(ativo.dataInicio + 'T12:00:00');
    const agora = new Date();
    const diasTotal = sp ? sp.dias : 21;
    
    // Calcula diferença de dias exatos (meia-noite a meia-noite)
    const inicioMs = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).getTime();
    const agoraMs = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
    const diaAtual = Math.floor((agoraMs - inicioMs) / (1000 * 60 * 60 * 24));
    
    const diasFaltantes = Math.max(0, diasTotal - diaAtual);
    
    if (diaAtual < 0) {
        document.getElementById('dash-days-left').innerText = 'Ainda não iniciou';
        document.getElementById('dash-progress-bar').style.width = '0%';
    } else {
        document.getElementById('dash-days-left').innerText = diasFaltantes + ' dias';
        document.getElementById('dash-progress-bar').style.width = Math.min(100, (diaAtual / diasTotal) * 100) + '%';
    }
}

// ==========================================
// 9. CHECKLIST
// ==========================================
function renderTimeline() {
    const ul = document.getElementById('timeline-steps');
    if (!ul) return;
    
    ul.innerHTML = steps.map((s, i) => `
        <li class="${s.done ? 'done' : ''}" onclick="toggleStep(${i})">
            <strong>${s.text}</strong>
            <p class="step-desc">${s.desc}</p>
        </li>
    `).join('');
}

window.toggleStep = function(i) {
    if (steps[i]) {
        steps[i].done = !steps[i].done;
        saveData();
        renderTimeline();
    }
};

// ==========================================
// 10. AGENDA (FUNCIONAL)
// ==========================================
function renderCalendar() {
    const container = document.getElementById('calendar-events');
    if (!container) return;
    
    const ativo = lotes.find(l => l.ativo);
    if (!ativo) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-dim); padding:40px 0;">Ative um lote para ver a agenda.</p>';
        return;
    }
    
    const sp = species.find(s => s.id === ativo.especieId);
    if (!sp) return;

    const inicio = new Date(ativo.dataInicio + 'T12:00:00');
    const eventos = [
        { titulo: 'Início da Incubação', data: inicio, cor: 'var(--accent)' },
        { titulo: 'Ovoscopia (Dia 7)', data: new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000), cor: '#3498db' },
        { titulo: 'Ovoscopia (Dia 14)', data: new Date(inicio.getTime() + 14 * 24 * 60 * 60 * 1000), cor: '#3498db' },
        { titulo: 'Parar Viragens (3 dias antes)', data: new Date(inicio.getTime() + (sp.dias - 3) * 24 * 60 * 60 * 1000), cor: '#e67e22' },
        { titulo: 'Previsão de Eclosão', data: new Date(inicio.getTime() + sp.dias * 24 * 60 * 60 * 1000), cor: 'var(--success)' }
    ];

    container.innerHTML = eventos.map(ev => {
        const dataFormatada = ev.data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        const isPast = ev.data.getTime() < new Date().setHours(0,0,0,0);
        
        return `
        <div class="card-item" style="border-left: 4px solid ${ev.cor}; opacity: ${isPast ? 0.5 : 1};">
            <div>
                <h4 style="color: ${ev.cor}; margin-bottom: 5px;">${ev.titulo}</h4>
                <p style="color: var(--text-dim); text-transform: capitalize;">${dataFormatada} ${isPast ? '(Passado)' : ''}</p>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// 11. BOTÕES LIGAR/DESLIGAR
// ==========================================
let alarmInterval = null;
let alarmSeconds = 7200; // 2 horas

const btnAlarm = document.getElementById('btn-alarm');
const alarmText = document.getElementById('alarm-timer-text');
const btnAutoTurn = document.getElementById('btn-auto-turn');
const autoTurnText = document.getElementById('auto-turn-text');

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return h + ':' + m + ':' + s;
}

btnAlarm.addEventListener('click', () => {
    desbloquearAudio();
    
    if (alarmInterval) {
        // DESLIGAR
        clearInterval(alarmInterval);
        alarmInterval = null;
        alarmSeconds = 7200;
        btnAlarm.innerText = 'LIGAR';
        btnAlarm.classList.remove('active');
        alarmText.innerText = 'Toque para iniciar (02:00h)';
    } else {
        // LIGAR
        alarmSeconds = 7200;
        btnAlarm.innerText = 'ZERAR';
        btnAlarm.classList.add('active');
        
        alarmInterval = setInterval(() => {
            alarmSeconds--;
            alarmText.innerText = 'Virando em: ' + formatTime(alarmSeconds);
            
            if (alarmSeconds <= 0) {
                playSound('alarm');
                clearInterval(alarmInterval);
                alarmInterval = null;
                btnAlarm.innerText = 'LIGAR';
                btnAlarm.classList.remove('active');
                alarmText.innerText = '⚠️ HORA DE VIRAR! Toque para reiniciar.';
                if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
            }
        }, 1000);
    }
});

// Viragem Automática (Apenas Liga/Desliga)
btnAutoTurn.addEventListener('click', () => {
    desbloquearAudio();
    
    if (btnAutoTurn.classList.contains('active')) {
        btnAutoTurn.innerText = 'LIGAR';
        btnAutoTurn.classList.remove('active');
        autoTurnText.innerText = 'Motor desligado';
    } else {
        btnAutoTurn.innerText = 'DESLIGAR';
        btnAutoTurn.classList.add('active');
        autoTurnText.innerText = 'Motor automático ligado';
    }
});

// ==========================================
// 12. CHAT IA
// ==========================================
const chatContainer = document.getElementById('chat-messages');

document.querySelectorAll('.trigger-btn').forEach(btn => {
    btn.addEventListener('click', () => handleChat(btn.dataset.msg));
});

document.getElementById('btn-send-chat').addEventListener('click', () => {
    const input = document.getElementById('chat-input');
    if (input.value.trim()) handleChat(input.value);
    input.value = '';
});

document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const input = document.getElementById('chat-input');
        if (input.value.trim()) handleChat(input.value);
        input.value = '';
    }
});

function addMessage(text, type) {
    if (!chatContainer) return;
    const div = document.createElement('div');
    div.className = 'chat-msg ' + type;
    div.innerHTML = '<p>' + text.replace(/\n/g, '<br>') + '</p>';
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function getAppContext() {
    const ativo = lotes.find(l => l.ativo);
    if (!ativo) return "AVISO: O usuário NÃO possui nenhum lote ativo no momento.";
    
    const sp = species.find(s => s.id === ativo.especieId);
    const inicio = new Date(ativo.dataInicio + 'T12:00:00');
    const diasTotal = sp ? sp.dias : 21;
    
    const inicioMs = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).getTime();
    const agoraMs = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
    const diaAtual = Math.floor((agoraMs - inicioMs) / (1000 * 60 * 60 * 24));
    const diasFaltantes = Math.max(0, diasTotal - diaAtual);
    
    let contexto = 'CONTEXTO ATUAL DO APP:\n';
    contexto += '- Lote: "' + ativo.nome + '"\n';
    contexto += '- Espécie: ' + (sp ? sp.nome : '?') + '\n';
    contexto += '- Ovos: ' + ativo.qtd + '\n';
    contexto += '- Início: ' + inicio.toLocaleDateString('pt-BR') + '\n';
    
    if (diaAtual < 0) {
        contexto += '- Status: Ainda não iniciou.\n';
    } else {
        contexto += '- Dia atual: ' + diaAtual + '\n';
        contexto += '- Dias restantes: ' + diasFaltantes + '\n';
    }
    
    if (sp) {
        contexto += '- Temp alvo: ' + sp.temp + '°C | Umid alvo: ' + sp.umid + '%\n';
    }
    
    if (diasFaltantes <= 3 && diaAtual >= 0) {
        contexto += '!!! ATENÇÃO: Estamos nos últimos 3 dias. Viragem deve estar parada.';
    }
    
    return contexto;
}

async function handleChat(msg) {
    desbloquearAudio();
    playSound('send');
    addMessage(msg, 'user');
    
    const apiKey = localStorage.getItem('ib_groq_key');
    if (!apiKey) {
        setTimeout(() => {
            playSound('receive');
            addMessage("Configure a chave API do Groq no ícone ⚙️ para ativar a IA.", 'bot');
        }, 500);
        return;
    }

    try {
        const contextData = getAppContext();

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': 'Bearer ' + apiKey 
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { 
                        role: 'system', 
                        content: 'Você é um especialista em incubação. Responda em pt-BR. REGRA: Use o CONTEXTO DO APP abaixo. Se não há lote ativo, diga isso claramente. Nunca invente dados.\n\n' + contextData
                    },
                    { role: 'user', content: msg }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await response.json();
        playSound('receive');
        
        if (data.error) {
            addMessage('Erro: ' + data.error.message, 'bot');
        } else if (data.choices && data.choices[0]) {
            addMessage(data.choices[0].message.content, 'bot');
        } else {
            addMessage('A IA não retornou resposta.', 'bot');
        }
    } catch (error) {
        playSound('receive');
        addMessage('Erro de conexão. Verifique sua internet.', 'bot');
    }
}

// ==========================================
// 13. CONFIGURAÇÕES
// ==========================================
function checkApiKey() {
    const key = localStorage.getItem('ib_groq_key');
    if (key) {
        document.getElementById('api-key-view').style.display = 'none';
        document.getElementById('api-key-active-view').style.display = 'block';
        document.getElementById('btn-remove-api').style.display = 'block';
    } else {
        document.getElementById('api-key-view').style.display = 'block';
        document.getElementById('api-key-active-view').style.display = 'none';
        document.getElementById('btn-remove-api').style.display = 'none';
    }
}

document.getElementById('btn-save-api').addEventListener('click', () => {
    const key = document.getElementById('input-api-key').value.trim();
    if (key.startsWith('gsk_')) {
        localStorage.setItem('ib_groq_key', key);
        checkApiKey();
    } else {
        alert('Chave inválida. Deve começar com gsk_');
    }
});

document.getElementById('btn-remove-api').addEventListener('click', () => {
    localStorage.removeItem('ib_groq_key');
    document.getElementById('input-api-key').value = '';
    checkApiKey();
});

// ==========================================
// 14. INICIALIZAÇÃO
// ==========================================
function init() {
    renderSpeciesTable();
    renderLotes();
    updateDashboard();
    renderTimeline();
    checkApiKey();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
