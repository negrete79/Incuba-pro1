// ==========================================
// ARQUIVO: app.js
// DESCRIÇÃO: Lógica completa do IncubaPro
// ==========================================

// --- DADOS INICIAIS (Espécies Padrão) ---
const DEFAULT_SPECIES = [
    { id: 1, name: 'Galinha', days: 21, temp: 37.5, humidity: 60 },
    { id: 2, name: 'Pato', days: 28, temp: 37.5, humidity: 65 },
    { id: 3, name: 'Codorna', days: 17, temp: 37.8, humidity: 55 },
    { id: 4, name: 'Peru', days: 28, temp: 37.5, humidity: 60 },
    { id: 5, name: 'Pavão', days: 28, temp: 37.2, humidity: 60 }
];

// --- ESTADO GLOBAL DO APP ---
let state = {
    species: [],
    lotes: [],
    activeLoteId: null,
    apiKey: '',
    alarmInterval: null,
    alarmTimeLeft: 7200, // 2 horas em segundos
    timeline: [
        { title: 'Aquecer a incubadora', desc: 'Ligue 24h antes para estabilizar a temperatura.' },
        { title: 'Colocar os ovos', desc: 'Posicione com a ponta mais fina para baixo.' },
        { title: 'Iniciar viragens', desc: 'Vire os ovos no mínimo 3 vezes ao dia.' },
        { title: 'Ovoscopia (Dia 7)', desc: 'Verifique se há embrião em desenvolvimento.' },
        { title: 'Parar viragens (3 dias antes)', desc: 'Deixe os ovos em repouso para o nascimento.' },
        { title: 'Eclosão', desc: 'Não abra a incubadora! Aguarde os pintinhos secarem.' }
    ]
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    checkTimelineCompletion();
    setupNavigation();
    setupModals();
    setupAlarm();
    setupForms();
    setupChat();
    renderAll();
});

// --- PERSISTÊNCIA (LOCALSTORAGE) ---
function saveState() {
    localStorage.setItem('incubapro_state', JSON.stringify({
        species: state.species,
        lotes: state.lotes,
        activeLoteId: state.activeLoteId,
        apiKey: state.apiKey
    }));
}

function loadState() {
    const saved = localStorage.getItem('incubapro_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        state.species = parsed.species || DEFAULT_SPECIES;
        state.lotes = parsed.lotes || [];
        state.activeLoteId = parsed.activeLoteId || null;
        state.apiKey = parsed.apiKey || '';
    } else {
        state.species = [...DEFAULT_SPECIES];
    }
    updateApiKeyUI();
}

// --- NAVEGAÇÃO ---
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewId = btn.getAttribute('data-view');
            switchView(viewId);
        });
    });
}

function switchView(viewId) {
    // Atualiza botões
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.nav-btn[data-view="${viewId}"]`).classList.add('active');
    
    // Atualiza views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');

    // Atualiza título
    const titles = { home: 'IncubaPro', lotes: 'Meus Lotes', ia: 'Assistente IA', calendario: 'Agenda', especies: 'Espécies' };
    document.getElementById('header-title').innerText = titles[viewId] || 'IncubaPro';

    // Renderiza conteúdo específico da view
    if (viewId === 'lotes') renderLotes();
    if (viewId === 'especies') renderSpeciesTable();
    if (viewId === 'calendario') renderCalendar();
}

// --- MODAIS ---
function setupModals() {
    // Configurações
    document.getElementById('btn-settings').addEventListener('click', () => openModal('modal-settings'));
    document.getElementById('close-settings').addEventListener('click', () => closeModal('modal-settings'));
    
    // Lotes
    document.getElementById('btn-add-lote').addEventListener('click', () => {
        resetLoteForm();
        populateSpeciesSelect();
        openModal('modal-lote');
    });
    document.getElementById('close-lote').addEventListener('click', () => closeModal('modal-lote'));
    
    // Espécies
    document.getElementById('btn-add-species').addEventListener('click', () => {
        resetSpeciesForm();
        document.getElementById('species-modal-title').innerText = 'Nova Espécie';
        openModal('modal-species');
    });
    document.getElementById('close-species').addEventListener('click', () => closeModal('modal-species'));

    // Fechar modal ao clicar no fundo escuro
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
}

function openModal(id) {
    document.getElementById(id).classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

// --- LÓGICA DA API KEY ---
function updateApiKeyUI() {
    const hasKey = state.apiKey.length > 10;
    document.getElementById('api-key-view').style.display = hasKey ? 'none' : 'block';
    document.getElementById('api-key-active-view').style.display = hasKey ? 'block' : 'none';
    document.getElementById('btn-remove-api').style.display = hasKey ? 'block' : 'none';
    document.getElementById('input-api-key').value = hasKey ? '••••••••••••••••' : '';
}

document.getElementById('btn-save-api').addEventListener('click', () => {
    const input = document.getElementById('input-api-key').value;
    // Se já tem chave e o usuário digitou as bolinhas, não salva por cima
    if (input.startsWith('••')) {
        alert('A chave atual já está salva. Clique em "Remover Chave" se quiser trocar.');
        return;
    }
    if (input.startsWith('gsk_')) {
        state.apiKey = input;
        saveState();
        updateApiKeyUI();
        alert('Chave ativada com sucesso! A IA já pode ser usada.');
    } else {
        alert('Chave inválida. A chave do Groq deve começar com "gsk_".');
    }
});

document.getElementById('btn-remove-api').addEventListener('click', () => {
    state.apiKey = '';
    saveState();
    updateApiKeyUI();
});

// --- RENDERIZAÇÃO: DASHBOARD (HOME) ---
function renderDashboard() {
    const lote = state.lotes.find(l => l.id === state.activeLoteId);
    const statusBadge = document.querySelector('#incubator-status .badge-status');
    const dashName = document.getElementById('dash-lote-name');

    if (!lote) {
        statusBadge.className = 'badge-status inactive';
        statusBadge.innerText = 'Inativa';
        dashName.innerText = 'Nenhum lote ativo';
        document.getElementById('dash-species').innerText = '---';
        document.getElementById('dash-temp').innerText = '--';
        document.getElementById('dash-humid').innerText = '--%';
        document.getElementById('dash-days-left').innerText = '-- dias';
        document.getElementById('dash-progress-bar').style.width = '0%';
        return;
    }

    statusBadge.className = 'badge-status active';
    statusBadge.innerText = 'Incubadora Ativa';
    dashName.innerText = lote.name;

    const species = state.species.find(s => s.name === lote.speciesName) || { days: 21, temp: 37.5, humidity: 60 };
    
    document.getElementById('dash-species').innerText = lote.speciesName;
    document.getElementById('dash-temp').innerText = species.temp.toFixed(1);
    document.getElementById('dash-humid').innerText = species.humidity + '%';

    // Cálculo de dias
    const startDate = new Date(lote.startDate + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, species.days - diffDays);
    
    document.getElementById('dash-days-left').innerText = daysLeft + ' dias';
    
    const progress = Math.min(100, (diffDays / species.days) * 100);
    document.getElementById('dash-progress-bar').style.width = progress + '%';
}

// --- RENDERIZAÇÃO: TIMELINE ---
function renderTimeline() {
    const ul = document.getElementById('timeline-steps');
    ul.innerHTML = '';
    state.timeline.forEach((step, index) => {
        const li = document.createElement('li');
        if (step.done) li.classList.add('completed');
        li.innerHTML = `<h3>${step.title}</h3><p>${step.desc}</p>`;
        li.addEventListener('click', () => {
            step.done = !step.done;
            renderTimeline();
        });
        ul.appendChild(li);
    });
}

function checkTimelineCompletion() {
    const lote = state.lotes.find(l => l.id === state.activeLoteId);
    if (!lote) {
        state.timeline.forEach(s => s.done = false);
    }
}

// --- LÓGICA DO ALARME ---
function setupAlarm() {
    const btnAlarm = document.getElementById('btn-alarm');
    btnAlarm.addEventListener('click', () => {
        if (state.alarmInterval) {
            stopAlarm();
        } else {
            startAlarm();
        }
    });
}

function startAlarm() {
    const btnAlarm = document.getElementById('btn-alarm');
    btnAlarm.innerText = 'DESLIGAR';
    btnAlarm.classList.add('active');
    state.alarmTimeLeft = 7200; // 2h

    state.alarmInterval = setInterval(() => {
        state.alarmTimeLeft--;
        updateAlarmDisplay();
        
        if (state.alarmTimeLeft <= 0) {
            triggerAlarmAlert();
            stopAlarm();
        }
    }, 1000);
}

function stopAlarm() {
    clearInterval(state.alarmInterval);
    state.alarmInterval = null;
    const btnAlarm = document.getElementById('btn-alarm');
    btnAlarm.innerText = 'LIGAR';
    btnAlarm.classList.remove('active');
    state.alarmTimeLeft = 7200;
    updateAlarmDisplay();
}

function updateAlarmDisplay() {
    const h = Math.floor(state.alarmTimeLeft / 3600).toString().padStart(2, '0');
    const m = Math.floor((state.alarmTimeLeft % 3600) / 60).toString().padStart(2, '0');
    const s = (state.alarmTimeLeft % 60).toString().padStart(2, '0');
    document.getElementById('alarm-timer-text').innerText = `Próxima viragem em ${h}:${m}:${s}`;
}

function triggerAlarmAlert() {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('IncubaPro', { body: 'Hora de virar os ovos!', icon: 'data:image/svg+xml,...' });
    }
    alert('⏰ Hora de virar os ovos!');
}

// --- RENDERIZAÇÃO: LOTES ---
function renderLotes() {
    const container = document.getElementById('lotes-list');
    container.innerHTML = '';
    
    if (state.lotes.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:40px;">Nenhum lote cadastrado.</p>';
        return;
    }

    state.lotes.forEach(lote => {
        const species = state.species.find(s => s.name === lote.speciesName) || { days: 21 };
        const startDate = new Date(lote.startDate + 'T00:00:00');
        const today = new Date(); today.setHours(0,0,0,0);
        const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        const isActive = lote.id === state.activeLoteId;
        const isFinished = diffDays >= species.days;

        const card = document.createElement('div');
        card.className = 'card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <div class="card-header">
                <span class="card-title">${lote.name}</span>
                <span class="card-badge">${isFinished ? 'Finalizado' : (isActive ? 'Ativo' : 'Pausado')}</span>
            </div>
            <div class="card-info"><span>Espécie:</span><span>${lote.speciesName}</span></div>
            <div class="card-info"><span>Ovos:</span><span>${lote.qtd} unidades</span></div>
            <div class="card-info"><span>Início:</span><span>${formatDate(lote.startDate)}</span></div>
            <button class="btn-delete" data-id="${lote.id}">Excluir Lote</button>
        `;

        if (!isFinished) {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-delete')) {
                    state.activeLoteId = lote.id;
                    saveState();
                    checkTimelineCompletion();
                    renderDashboard();
                    renderTimeline();
                    switchView('home');
                }
            });
        }

        card.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Excluir o lote "${lote.name}"?`)) {
                state.lotes = state.lotes.filter(l => l.id !== lote.id);
                if (state.activeLoteId === lote.id) state.activeLoteId = null;
                saveState();
                renderLotes();
                renderDashboard();
            }
        });

        container.appendChild(card);
    });
}

// --- FORMULÁRIOS ---
function setupForms() {
    // Mostrar/esconder campos customizados de espécie no formulário de lote
    document.getElementById('lote-especie').addEventListener('change', (e) => {
        document.getElementById('custom-species-fields').style.display = e.target.value === '__custom__' ? 'block' : 'none';
    });

    // Setar data de hoje como padrão
    document.getElementById('lote-data').valueAsDate = new Date();

    // Salvar Lote
    document.getElementById('btn-save-lote').addEventListener('click', saveLote);
    
    // Salvar Espécie
    document.getElementById('btn-save-species').addEventListener('click', saveSpecies);
}

function resetLoteForm() {
    document.getElementById('lote-nome').value = '';
    document.getElementById('lote-qtd').value = '';
    document.getElementById('custom-species-fields').style.display = 'none';
    document.getElementById('custom-name').value = '';
    document.getElementById('custom-days').value = '';
    document.getElementById('custom-temp').value = '';
    document.getElementById('custom-humid').value = '';
    document.getElementById('lote-data').valueAsDate = new Date();
}

function populateSpeciesSelect() {
    const select = document.getElementById('lote-especie');
    select.innerHTML = '<option value="">Selecione...</option>';
    state.species.forEach(s => {
        select.innerHTML += `<option value="${s.name}">${s.name} (${s.days}d)</option>`;
    });
    select.innerHTML += '<option value="__custom__">+ Outra Espécie</option>';
}

function saveLote() {
    const name = document.getElementById('lote-nome').value.trim();
    const speciesVal = document.getElementById('lote-especie').value;
    const qtd = parseInt(document.getElementById('lote-qtd').value);
    const startDate = document.getElementById('lote-data').value;

    if (!name || !speciesVal || !qtd || !startDate) {
        alert('Preencha todos os campos.');
        return;
    }

    let speciesName = speciesVal;

    // Se for customizado, salva a espécie nova primeiro
    if (speciesVal === '__custom__') {
        const cName = document.getElementById('custom-name').value.trim();
        const cDays = parseInt(document.getElementById('custom-days').value);
        const cTemp = parseFloat(document.getElementById('custom-temp').value);
        const cHumid = parseInt(document.getElementById('custom-humid').value);
        
        if (!cName || !cDays || !cTemp || !cHumid) {
            alert('Preencha os dados da espécie customizada.');
            return;
        }
        
        state.species.push({ id: Date.now(), name: cName, days: cDays, temp: cTemp, humidity: cHumid });
        speciesName = cName;
    }

    const newLote = {
        id: Date.now(),
        name,
        speciesName,
        qtd,
        startDate,
        active: true
    };

    state.lotes.push(newLote);
    state.activeLoteId = newLote.id;
    
    saveState();
    closeModal('modal-lote');
    checkTimelineCompletion();
    renderAll();
    switchView('home');
}

function resetSpeciesForm() {
    document.getElementById('edit-species-id').value = '';
    document.getElementById('sp-nome').value = '';
    document.getElementById('sp-dias').value = '';
    document.getElementById('sp-temp').value = '';
    document.getElementById('sp-humid').value = '';
}

function saveSpecies() {
    const editId = document.getElementById('edit-species-id').value;
    const name = document.getElementById('sp-nome').value.trim();
    const days = parseInt(document.getElementById('sp-dias').value);
    const temp = parseFloat(document.getElementById('sp-temp').value);
    const humidity = parseInt(document.getElementById('sp-humid').value);

    if (!name || !days || !temp || !humidity) {
        alert('Preencha todos os campos.');
        return;
    }

    if (editId) {
        // Edição
        const sp = state.species.find(s => s.id === parseInt(editId));
        if (sp) {
            sp.name = name; sp.days = days; sp.temp = temp; sp.humidity = humidity;
        }
    } else {
        // Criação
        state.species.push({ id: Date.now(), name, days, temp, humidity });
    }

    saveState();
    closeModal('modal-species');
    renderSpeciesTable();
}

// --- RENDERIZAÇÃO: TABELA DE ESPÉCIES ---
function renderSpeciesTable() {
    const tbody = document.getElementById('especies-tbody');
    tbody.innerHTML = '';

    state.species.forEach(sp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color: var(--accent); font-weight: 700;">${sp.name}</td>
            <td>${sp.days} dias</td>
            <td>${sp.temp}°C</td>
            <td>${sp.humidity}%</td>
            <td>
                <button class="btn-icon edit" data-id="${sp.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-icon del" data-id="${sp.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </td>
        `;

        tr.querySelector('.edit').addEventListener('click', () => {
            document.getElementById('species-modal-title').innerText = 'Editar Espécie';
            document.getElementById('edit-species-id').value = sp.id;
            document.getElementById('sp-nome').value = sp.name;
            document.getElementById('sp-dias').value = sp.days;
            document.getElementById('sp-temp').value = sp.temp;
            document.getElementById('sp-humid').value = sp.humidity;
            openModal('modal-species');
        });

        tr.querySelector('.del').addEventListener('click', () => {
            if (confirm(`Excluir "${sp.name}" da tabela?`)) {
                state.species = state.species.filter(s => s.id !== sp.id);
                saveState();
                renderSpeciesTable();
            }
        });

        tbody.appendChild(tr);
    });
}

// --- RENDERIZAÇÃO: CALENDÁRIO ---
function renderCalendar() {
    const container = document.getElementById('calendar-events');
    container.innerHTML = '';
    
    const activeLote = state.lotes.find(l => l.id === state.activeLoteId);

    if (!activeLote) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:40px;">Ative um lote para ver a agenda.</p>';
        return;
    }

    const species = state.species.find(s => s.name === activeLote.speciesName);
    if (!species) return;

    const start = new Date(activeLote.startDate + 'T00:00:00');
    
    const events = [
        { date: new Date(start), title: 'Início da Incubação', type: 'parada' },
        { date: new Date(start.getTime() + (7 * 24*60*60*1000)), title: '1ª Ovoscopia', type: 'ovoscopia' },
        { date: new Date(start.getTime() + (14 * 24*60*60*1000)), title: '2ª Ovoscopia (Opcional)', type: 'ovoscopia' },
        { date: new Date(start.getTime() + ((speci
