// ==========================================
// SISTEMA DE DADOS (VERSÃO 2 - NUNCA APAGA DADOS DO USUÁRIO)
// ==========================================
const CURRENT_VERSION = 2; 
const DEFAULT_SPECIES = [
    { id: 1, name: 'Galinha', days: 21, temp: 37.5, humidity: 60 },
    { id: 2, name: 'Pato', days: 28, temp: 37.5, humidity: 65 },
    { id: 3, name: 'Codorna', days: 17, temp: 37.8, humidity: 55 },
    { id: 4, name: 'Peru', days: 28, temp: 37.5, humidity: 60 },
    { id: 5, name: 'Pavão', days: 28, temp: 37.2, humidity: 60 },
    { id: 6, name: 'Calopsita', days: 18, temp: 37.5, humidity: 55 },
    { id: 7, name: 'Faisão', days: 24, temp: 37.5, humidity: 60 },
    { id: 8, name: 'Ganso', days: 30, temp: 37.5, humidity: 70 }
];

let state = {
    lotes: [], activeLoteId: null, apiKey: '',
    alarmInterval: null, alarmTimeLeft: 7200,
    timeline: [
        { id: 1, title: 'Aquecer a incubadora', desc: 'Ligue 24h antes para estabilizar a temperatura.', done: false, triggerDay: -1 },
        { id: 2, title: 'Colocar os ovos', desc: 'Posicione com a ponta mais fina para baixo.', done: false, triggerDay: 0 },
        { id: 3, title: 'Iniciar viragens', desc: 'Vire os ovos no mínimo 3 vezes ao dia.', done: false, triggerDay: 0 },
        { id: 4, title: 'Ovoscopia (Dia 7)', desc: 'Verifique se há embrião em desenvolvimento.', done: false, triggerDay: 7 },
        { id: 5, title: 'Parar viragens (3 dias antes)', desc: 'Deixe os ovos em repouso para o nascimento.', done: false, triggerDay: -3 },
        { id: 6, title: 'Eclosão', desc: 'Não abra a incubadora! Aguarde os pintinhos secarem.', done: false, triggerDay: -1 }
    ]
};

// ==========================================
// ALARME SONORO
// ==========================================
let audioCtx = null;
const iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADbSURBVFhH7ZY9DoMwDIUDC+fgCByAA3BRHQSXQER0El0BF9Eo9YlOaSnJN0/s/aJPmyNJkmSR4RPMiOMi5xV2kYRMWcZksniE0kEmM0mM0m80m80ms9nsYjKZTCKTyWSSYjKZjMRiMplMJCgP0oBNzDZqoBHoBSqBk+gFDiBXkAKnEEqoQx6AUOgV9ACpxBKqEMegFDIFfQAqcQSqhDHoBS6AX0AKnEEqoQx6AUugF9ACpxBKqEMegFPojmdrZW0yP8RERF0ohFpbmyMRCIR6eCAiCgRqSjFf+Q3AFY9SV1b2WWSAAAAAElFTkSuQmCC';

function triggerUrgentAlarm(taskTitle) {
    try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); const osc1 = audioCtx.createOscillator(); const osc2 = audioCtx.createOscillator(); const gainNode = audioCtx.createGain(); gainNode.gain.setValueAtTime(1, audioCtx.currentTime); gainNode.connect(audioCtx.destination); osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(400, audioCtx.currentTime); osc1.connect(gainNode); osc2.type = 'square'; osc2.frequency.setValueAtTime(800, audioCtx.currentTime); osc2.connect(gainNode); osc1.start(); osc2.start(); osc1.stop(audioCtx.currentTime + 1.5); osc2.stop(audioCtx.currentTime + 1.5); } catch (e) { console.error(e); }
    if ("Notification" in window && Notification.permission === "granted") new Notification('🚨 IncubaPro - Ação Necessária!', { body: 'Chegou a hora: ' + taskTitle, icon: iconBase64, requireInteraction: true });
    if ("vibrate" in navigator) navigator.vibrate([1000, 500, 1000]);
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    loadState(); setupNavigation(); setupModals(); setupAlarm(); setupAutoTurn(); setupForms(); setupChat(); renderAll();
});

function saveState() {
    localStorage.setItem('incubapro_v2', JSON.stringify({
        version: CURRENT_VERSION, lotes: state.lotes,
        activeLoteId: state.activeLoteId, apiKey: state.apiKey, timeline: state.timeline
    }));
}

function loadState() {
    const saved = localStorage.getItem('incubapro_v2');
    if (saved) {
        const p = JSON.parse(saved);
        state.lotes = p.lotes || [];
        state.activeLoteId = p.activeLoteId || null;
        state.apiKey = p.apiKey || '';
        state.timeline = p.timeline || state.timeline;
    }
    updateApiKeyUI();
}

// ==========================================
// NAVEGAÇÃO E MODAIS
// ==========================================
function setupNavigation() { document.querySelectorAll('.nav-btn').forEach(btn => { btn.addEventListener('click', () => switchView(btn.getAttribute('data-view'))); }); }
function switchView(viewId) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-btn[data-view="' + viewId + '"]').classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + viewId).classList.add('active');
    const titles = { home: 'IncubaPro', lotes: 'Meus Lotes', ia: 'Assistente IA', calendario: 'Agenda', especies: 'Espécies' };
    document.getElementById('header-title').innerText = titles[viewId] || 'IncubaPro';
    if (viewId === 'lotes') renderLotes(); if (viewId === 'especies') renderSpeciesTable(); if (viewId === 'calendario') renderCalendar();
}
function setupModals() {
    document.getElementById('btn-settings').addEventListener('click', () => openModal('modal-settings'));
    document.getElementById('close-settings').addEventListener('click', () => closeModal('modal-settings'));
    document.getElementById('btn-add-lote').addEventListener('click', () => { resetLoteForm(); populateSpeciesSelect(); openModal('modal-lote'); });
    document.getElementById('close-lote').addEventListener('click', () => closeModal('modal-lote'));
    document.getElementById('btn-add-species').addEventListener('click', () => { resetSpeciesForm(); document.getElementById('species-modal-title').innerText = 'Nova Espécie'; openModal('modal-species'); });
    document.getElementById('close-species').addEventListener('click', () => closeModal('modal-species'));
    document.querySelectorAll('.modal').forEach(modal => { modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal.id); }); });
}
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// ==========================================
// API KEY GROQ
// ==========================================
function updateApiKeyUI() {
    const hasKey = state.apiKey.length > 10;
    document.getElementById('api-key-view').style.display = hasKey ? 'none' : 'block';
    document.getElementById('api-key-active-view').style.display = hasKey ? 'block' : 'none';
    document.getElementById('btn-remove-api').style.display = hasKey ? 'block' : 'none';
    document.getElementById('input-api-key').value = hasKey ? '••••••••••••••••' : '';
}
document.getElementById('btn-save-api').addEventListener('click', () => {
    const input = document.getElementById('input-api-key').value;
    if (input.startsWith('••')) { alert('A chave atual já está salva.'); return; }
    if (input.startsWith('gsk_')) { state.apiKey = input; saveState(); updateApiKeyUI(); alert('Chave ativada com sucesso!'); }
    else { alert('Chave inválida. Deve começar com "gsk_".'); }
});
document.getElementById('btn-remove-api').addEventListener('click', () => { state.apiKey = ''; saveState(); updateApiKeyUI(); });

// ==========================================
// DASHBOARD E CHECKLIST
// ==========================================
function renderDashboard() {
    const lote = state.lotes.find(l => l.id === state.activeLoteId);
    const statusBadge = document.querySelector('#incubator-status .badge-status');
    const dashName = document.getElementById('dash-lote-name');
    if (!lote) { statusBadge.className = 'badge-status inactive'; statusBadge.innerText = 'Inativa'; dashName.innerText = 'Nenhum lote ativo'; document.getElementById('dash-species').innerText = '---'; document.getElementById('dash-temp').innerText = '--'; document.getElementById('dash-humid').innerText = '--%'; document.getElementById('dash-days-left').innerText = '-- dias'; document.getElementById('dash-progress-bar').style.width = '0%'; return; }
    statusBadge.className = 'badge-status active'; statusBadge.innerText = 'Incubadora Ativa'; dashName.innerText = lote.name;
    const sp = DEFAULT_SPECIES.find(s => s.name === lote.speciesName) || { days: 21, temp: 37.5, humidity: 60 };
    document.getElementById('dash-species').innerText = lote.speciesName; document.getElementById('dash-temp').innerText = sp.temp.toFixed(1); document.getElementById('dash-humid').innerText = sp.humidity + '%';
    const start = new Date(lote.startDate + 'T00:00:00'); const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24)); const left = Math.max(0, sp.days - diff);
    document.getElementById('dash-days-left').innerText = left + ' dias'; document.getElementById('dash-progress-bar').style.width = Math.min(100, (diff / sp.days) * 100) + '%';
}

function getLoteDayInfo() { const lote = state.lotes.find(l => l.id === state.activeLoteId); if (!lote) return null; const sp = DEFAULT_SPECIES.find(s => s.name === lote.speciesName) || { days: 21 }; const start = new Date(lote.startDate + 'T00:00:00'); const today = new Date(); today.setHours(0,0,0,0); return { currentDay: Math.floor((today - start) / (1000 * 60 * 60 * 24)), totalDays: sp.days }; }

function renderTimeline() {
    const ul = document.getElementById('timeline-steps'); ul.innerHTML = ''; const info = getLoteDayInfo();
    state.timeline.forEach(step => {
        const li = document.createElement('li'); if (step.done) li.classList.add('completed'); let alertHtml = ''; let isCurrentTask = false;
        if (info) { if (step.triggerDay >= 0 && info.currentDay === step.triggerDay) isCurrentTask = true; if (step.triggerDay < 0 && info.currentDay === (info.totalDays + step.triggerDay)) isCurrentTask = true; if (step.id === 3 && info.currentDay >= 0 && info.currentDay < (info.totalDays - 3)) isCurrentTask = true; if (isCurrentTask && !step.done) alertHtml = '<div class="timeline-alert"><span>⏰ AÇÃO NECESSÁRIA HOJE (Dia ' + info.currentDay + ')</span><button class="btn-test-sound" onclick="event.stopPropagation(); triggerUrgentAlarm(\'' + step.title.replace(/'/g, "\\'") + '\')">🔔 TOCAR</button></div>'; else if (isCurrentTask && step.done) alertHtml = '<span class="timeline-alert done">✅ CONCLUÍDO HOJE (Dia ' + info.currentDay + ')</span>'; }
        li.innerHTML = '<h3>' + step.title + '</h3><p>' + step.desc + '</p>' + alertHtml;
        li.addEventListener('click', () => { step.done = !step.done; saveState(); renderTimeline(); });
        ul.appendChild(li);
    });
}

// ==========================================
// ALARMES E VIRAÇÃO
// ==========================================
function setupAlarm() { document.getElementById('btn-alarm').addEventListener('click', () => { state.alarmInterval ? stopAlarm() : startAlarm(); }); }
function startAlarm() { const btn = document.getElementById('btn-alarm'); btn.innerText = 'DESLIGAR'; btn.classList.add('active'); state.alarmTimeLeft = 7200; state.alarmInterval = setInterval(() => { state.alarmTimeLeft--; updateAlarmDisplay(); if (state.alarmTimeLeft <= 0) { triggerUrgentAlarm('Viragem Manual'); stopAlarm(); } }, 1000); }
function stopAlarm() { clearInterval(state.alarmInterval); state.alarmInterval = null; const btn = document.getElementById('btn-alarm'); btn.innerText = 'LIGAR'; btn.classList.remove('active'); state.alarmTimeLeft = 7200; updateAlarmDisplay(); }
function updateAlarmDisplay() { const h = Math.floor(state.alarmTimeLeft / 3600).toString().padStart(2, '0'); const m = Math.floor((state.alarmTimeLeft % 3600) / 60).toString().padStart(2, '0'); const s = (state.alarmTimeLeft % 60).toString().padStart(2, '0'); document.getElementById('alarm-timer-text').innerText = 'Próxima viragem em ' + h + ':' + m + ':' + s; }
function setupAutoTurn() { document.getElementById('btn-auto-turn').addEventListener('click', () => { const btn = document.getElementById('btn-auto-turn'); const txt = document.getElementById('auto-turn-text'); if (btn.classList.contains('active')) { btn.innerText = 'LIGAR'; btn.classList.remove('active'); btn.style.background = ''; btn.style.borderColor = ''; btn.style.color = ''; txt.innerText = 'Motor desligado'; } else { btn.innerText = 'ATIVO'; btn.classList.add('active'); btn.style.background = 'var(--success)'; btn.style.borderColor = 'var(--success)'; btn.style.color = '#000'; txt.innerText = 'Motor funcionando'; } }); }

// ==========================================
// LOTES E ESPÉCIES
// ==========================================
function renderLotes() { const c = document.getElementById('lotes-list'); c.innerHTML = ''; if (!state.lotes.length) { c.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:40px;">Nenhum lote cadastrado.</p>'; return; } state.lotes.forEach(lote => { const sp = DEFAULT_SPECIES.find(s => s.name === lote.speciesName) || { days: 21 }; const start = new Date(lote.startDate + 'T00:00:00'); const today = new Date(); today.setHours(0,0,0,0); const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24)); const isActive = lote.id === state.activeLoteId; const isFinished = diff >= sp.days; const card = document.createElement('div'); card.className = 'card'; card.style.cursor = 'pointer'; card.innerHTML = '<div class="card-header"><span class="card-title">' + lote.name + '</span><span class="card-badge">' + (isFinished ? 'Finalizado' : (isActive ? 'Ativo' : 'Pausado')) + '</span></div><div class="card-info"><span>Espécie:</span><span>' + lote.speciesName + '</span></div><div class="card-info"><span>Ovos:</span><span>' + lote.qtd + ' unid.</span></div><div class="card-info"><span>Início:</span><span>' + formatDate(lote.startDate) + '</span></div><button class="btn-delete" data-id="' + lote.id + '">Excluir Lote</button>'; if (!isFinished) card.addEventListener('click', (e) => { if (!e.target.classList.contains('btn-delete')) { state.activeLoteId = lote.id; saveState(); state.timeline.forEach(s => s.done = false); renderAll(); switchView('home'); } }); card.querySelector('.btn-delete').addEventListener('click', (e) => { e.stopPropagation(); if (confirm('Excluir o lote "' + lote.name + '"?')) { state.lotes = state.lotes.filter(l => l.id !== lote.id); if (state.activeLoteId === lote.id) state.activeLoteId = null; saveState(); renderLotes(); renderDashboard(); renderTimeline(); } }); c.appendChild(card); }); }

function setupForms() { document.getElementById('lote-especie').addEventListener('change', (e) => { document.getElementById('custom-species-fields').style.display = e.target.value === '__custom__' ? 'block' : 'none'; }); document.getElementById('lote-data').valueAsDate = new Date(); document.getElementById('btn-save-lote').addEventListener('click', saveLote); document.getElementById('btn-save-species').addEventListener('click', saveSpecies); }
function resetLoteForm() { document.getElementById('lote-nome').value = ''; document.getElementById('lote-qtd').value = ''; document.getElementById('custom-species-fields').style.display = 'none'; ['custom-name', 'custom-days', 'custom-temp', 'custom-humid'].forEach(id => document.getElementById(id).value = ''); document.getElementById('lote-data').valueAsDate = new Date(); }
function populateSpeciesSelect() { const sel = document.getElementById('lote-especie'); sel.innerHTML = '<option value="">Selecione...</option>'; DEFAULT_SPECIES.forEach(s => sel.innerHTML += '<option value="' + s.name + '">' + s.name + ' (' + s.days + 'd)</option>'); sel.innerHTML += '<option value="__custom__">+ Outra Espécie</option>'; }
function saveLote() { const name = document.getElementById('lote-nome').value.trim(); const spVal = document.getElementById('lote-especie').value; const qtd = parseInt(document.getElementById('lote-qtd').value); const dt = document.getElementById('lote-data').value; if (!name || !spVal || !qtd || !dt) { alert('Preencha todos os campos.'); return; } let spName = spVal; if (spVal === '__custom__') { const cn = document.getElementById('custom-name').value.trim(); const cd = parseInt(document.getElementById('custom-days').value); const ct = parseFloat(document.getElementById('custom-temp').value); const ch = parseInt(document.getElementById('custom-humid').value); if (!cn || !cd || !ct || !ch) { alert('Preencha os dados da espécie customizada.'); return; } DEFAULT_SPECIES.push({ id: Date.now(), name: cn, days: cd, temp: ct, humidity: ch }); spName = cn; } const newLote = { id: Date.now(), name, speciesName: spName, qtd, startDate: dt }; state.lotes.push(newLote); state.activeLoteId = newLote.id; saveState(); closeModal('modal-lote'); state.timeline.forEach(s => s.done = false); renderAll(); switchView('home'); }
function resetSpeciesForm() { document.getElementById('edit-species-id').value = ''; ['sp-nome', 'sp-dias', 'sp-temp', 'sp-humid'].forEach(id => document.getElementById(id).value = ''); }
function saveSpecies() {
    const editId = document.getElementById('edit-species-id').value;
    const name = document.getElementById('sp-nome').value.trim();
    const days = parseInt(document.getElementById('sp-dias').value);
    const temp = parseFloat(document.getElementById('sp-temp').value);
    const hum = parseInt(document.getElementById('sp-humid').value);
    if (!name || !days || !temp || !hum) { alert('Preencha todos os campos.'); return; }
    if (editId) {
        const sp = DEFAULT_SPECIES.find(s => s.id === parseInt(editId));
        if (sp) { sp.name = name; sp.days = days; sp.temp = temp; sp.humidity = hum; }
    } else {
        DEFAULT_SPECIES.push({ id: Date.now(), name, days, temp, humidity: hum });
    }
    saveState(); closeModal('modal-species'); renderSpeciesTable();
}
function renderSpeciesTable() {
    const tbody = document.getElementById('especies-tbody'); tbody.innerHTML = '';
    DEFAULT_SPECIES.forEach(sp => {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + sp.name + '</td><td>' + sp.days + '</td><td>' + sp.temp + '°C</td><td>' + sp.humidity + '%</td><td><button class="btn-icon edit-sp" data-id="' + sp.id + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-icon del del-sp" data-id="' + sp.id + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>';
        tr.querySelector('.edit-sp').addEventListener('click', () => {
            document.getElementById('edit-species-id').value = sp.id;
            document.getElementById('sp-nome').value = sp.name;
            document.getElementById('sp-dias').value = sp.days;
            document.getElementById('sp-temp').value = sp.temp;
            document.getElementById('sp-humid').value = sp.humidity;
            document.getElementById('species-modal-title').innerText = 'Editar Espécie';
            openModal('modal-species');
        });
        tr.querySelector('.del-sp').addEventListener('click', () => {
            if (confirm('Excluir "' + sp.name + '"?')) {
                const idx = DEFAULT_SPECIES.findIndex(s => s.id === sp.id);
                if (idx > -1) DEFAULT_SPECIES.splice(idx, 1);
                saveState(); renderSpeciesTable();
            }
        });
        tbody.appendChild(tr);
    });
}

// ==========================================
// CALENDÁRIO
// ==========================================
function renderCalendar() {
    const c = document.getElementById('calendar-events'); c.innerHTML = '';
    let events = [];
    state.lotes.forEach(lote => {
        const sp = DEFAULT_SPECIES.find(s => s.name === lote.speciesName) || { days: 21 };
        const start = new Date(lote.startDate + 'T00:00:00');
        const ovoscopia = new Date(start); ovoscopia.setDate(ovoscopia.getDate() + 7);
        const parada = new Date(start); parada.setDate(parada.getDate() + sp.days - 3);
        const eclosao = new Date(start); eclosao.setDate(eclosao.getDate() + sp.days);
        events.push({ date: formatDate(ovoscopia.toISOString().split('T')[0]), loteName: lote.name, tag: 'Ovoscopia', tagClass: 'tag-ovoscopia' });
        events.push({ date: formatDate(parada.toISOString().split('T')[0]), loteName: lote.name, tag: 'Parar Viragem', tagClass: 'tag-parada' });
        events.push({ date: formatDate(eclosao.toISOString().split('T')[0]), loteName: lote.name, tag: 'Eclosão', tagClass: 'tag-eclosao' });
    });
    if (!events.length) { c.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:40px;">Crie um lote para ver eventos na agenda.</p>'; return; }
    events.sort((a, b) => a.date.localeCompare(b.date));
    events.forEach(ev => {
        const card = document.createElement('div'); card.className = 'card';
        card.innerHTML = '<div class="event-date">' + ev.date + '</div><div class="event-lote-name">' + ev.loteName + '</div><span class="event-tag ' + ev.tagClass + '">' + ev.tag + '</span>';
        c.appendChild(card);
    });
}
function formatDate(d) { if (!d) return '---'; const parts = d.split('-'); return parts[2] + '/' + parts[1] + '/' + parts[0]; }

// ==========================================
// CHAT IA (GROQ)
// ==========================================
function setupChat() {
    document.getElementById('btn-send-chat').addEventListener('click', sendChat);
    document.getElementById('chat-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChat(); });
    document.querySelectorAll('.trigger-btn').forEach(btn => { btn.addEventListener('click', () => { document.getElementById('chat-input').value = btn.getAttribute('data-msg'); sendChat(); }); });
}
function sendChat() {
    const input = document.getElementById('chat-input'); const msg = input.value.trim(); if (!msg) return;
    appendChatMsg(msg, 'user'); input.value = '';
    if (!state.apiKey || state.apiKey.length < 10) { appendChatMsg('Para usar a IA, vá em Configurações e adicione sua chave API do Groq (é grátis).', 'bot'); return; }
    const lote = state.lotes.find(l => l.id === state.activeLoteId);
    const context = lote ? 'Lote ativo: ' + lote.name + ', Espécie: ' + lote.speciesName + ', Ovos: ' + lote.qtd + ', Início: ' + lote.startDate + '.' : 'Nenhum lote ativo no momento.';
    const systemPrompt = 'Você é um especialista brasileiro em incubação de ovos de aves. Responda sempre em português do Brasil, de forma clara e objetiva. Contexto do app: ' + context;
    const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: msg }];
    fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + state.apiKey },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.7, max_tokens: 800 })
    }).then(r => r.json()).then(data => {
        if (data.choices && data.choices[0]) appendChatMsg(data.choices[0].message.content, 'bot');
        else appendChatMsg('Erro na resposta da IA. Verifique sua chave.', 'bot');
    }).catch(() => { appendChatMsg('Erro de conexão. Verifique sua internet e tente novamente.', 'bot'); });
}
function appendChatMsg(text, type) {
    const container = document.getElementById('chat-messages'); const div = document.createElement('div');
    div.className = 'chat-msg ' + type; div.innerHTML = '<p>' + text.replace(/\n/g, '<br>') + '</p>';
    container.appendChild(div); container.scrollTop = container.scrollHeight;
}

// ==========================================
// RENDER GERAL
// ==========================================
function renderAll() { renderDashboard(); renderTimeline(); renderLotes(); renderSpeciesTable(); renderCalendar(); }

// ==========================================
// PWA: SALVAR TUDO AO SAIR DO APP
// ==========================================
function forceSaveBeforeExit() {
    try { saveState(); } catch(e) { console.log('Erro ao salvar antes de sair:', e); }
}
// Dispara quando minimiza, troca de app ou aba fica oculta
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') forceSaveBeforeExit();
});
// Dispara quando fecha a aba/janela
window.addEventListener('beforeunload', forceSaveBeforeExit);
// Dispara quando o SO descarta a página (mobile)
window.addEventListener('pagehide', forceSaveBeforeExit);
// Dispara quando perde conexão
window.addEventListener('offline', forceSaveBeforeExit);

// ==========================================
// PWA: REGISTRAR SERVICE WORKER
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado com sucesso. Escopo:', reg.scope))
            .catch(err => console.error('Falha ao registrar Service Worker:', err));
    });
}
