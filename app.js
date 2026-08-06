// ==========================================
// 1. REGISTRO DO SERVICE WORKER (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('✅ PWA Pronta!'))
            .catch((err) => console.warn('SW Falhou:', err));
    });
}

// ==========================================
// 2. SONS DO CHAT (Desbloqueio forçado)
// ==========================================
let audioCtx;
let audioDesbloqueado = false;

function desbloquearAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    audioDesbloqueado = true;
}

// Adiciona um ouvinte no PRIMEIRO toque da tela para liberar o áudio
document.addEventListener('click', function desbloqueio() {
    desbloquearAudio();
    document.removeEventListener('click', desbloqueio);
}, { once: true });

function playSound(type) {
    try {
        if (!audioCtx) desbloquearAudio();
        const ctx = audioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = 'sine';
        
        if (type === 'send') {
            oscillator.frequency.setValueAtTime(800, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.1);
        } else if (type === 'receive') {
            oscillator.frequency.setValueAtTime(600, ctx.currentTime);
            oscillator.frequency.setValueAtTime(900, ctx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.2);
        } else if (type === 'alarm') {
            // Som de alarme mais longo e forte
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(880, ctx.currentTime);
            oscillator.frequency.setValueAtTime(0, ctx.currentTime + 0.2);
            oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.4);
            oscillator.frequency.setValueAtTime(0, ctx.currentTime + 0.6);
            oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.8);
            gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 1.0);
        }
    } catch (e) {}
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

try { 
    const savedSpecies = JSON.parse(localStorage.getItem('ib_species'));
    if (!Array.isArray(savedSpecies) || savedSpecies.length !== defaultSpecies.length || !savedSpecies.find(s => s.nome === 'Pavão')) {
        species = defaultSpecies; 
        localStorage.setItem('ib_species', JSON.stringify(species));
    } else { species = savedSpecies; }
} catch(e) { species = defaultSpecies; localStorage.setItem('ib_species', JSON.stringify(species)); }

try { lotes = JSON.parse(localStorage.getItem('ib_lotes')) || []; } catch(e) { lotes = []; }
try { steps = JSON.parse(localStorage.getItem('ib_steps')) || defaultSteps; } catch(e) { steps = defaultSteps; }

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
        const viewEl = document.getElementById(`view-${btn.dataset.view}`);
        if(viewEl) viewEl.classList.add('active');
    });
});

// ==========================================
// 5. MODAIS
// ==========================================
function openModal(id) { const m = document.getElementById(id); if(m) m.classList.add('show'); }
function closeModal(id) { const m = document.getElementById(id); if(m) m.classList.remove('show'); }

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
window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) e.target.classList.remove('show'); });

// ==========================================
// 6. CRUD ESPÉCIES
// ==========================================
function renderSpeciesTable() {
    const tbody = document.getElementById('especies-tbody');
    if(!tbody) return;
    tbody.innerHTML = species.map(sp => `<tr><td>${sp.nome}</td><td>${sp.dias}d</td><td>${sp.temp}°C</td><td>${sp.umid}%</td><td><button class="btn-sm btn-del" onclick="deleteSpecies(${sp.id})">Excluir</button></td></tr>`).join('');
}

document.getElementById('btn-save-species').addEventListener('click', () => {
    const nome = document.getElementById('sp-nome').value.trim();
    const dias = parseInt(document.getElementById('sp-dias').value);
    const temp = parseFloat(document.getElementById('sp-temp').value);
    const umid = parseInt(document.getElementById('sp-humid').value);
    if (!nome || !dias || !temp) return alert('Preencha Nome, Dias e Temperatura.');
    species.push({ id: Date.now(), nome, dias, temp, umid });
    saveData(); renderSpeciesTable(); closeModal('modal-species');
});

window.deleteSpecies = function(id) { if (confirm('Excluir?')) { species = species.filter(s => s.id !== id); saveData(); renderSpeciesTable(); } };

// ==========================================
// 7. CRUD LOTES
// ==========================================
function populateSpeciesSelect() {
    const select = document.getElementById('lote-especie');
    if(!select) return;
    select.innerHTML = '<option value="">Selecione...</option>' + species.map(sp => `<option value="${sp.id}">${sp.nome}</option>`).join('');
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
        if (lote) { lote.nome = nome; lote.especieId = parseInt(especieId); lote.qtd = qtd; lote.dataInicio = data; }
    } else {
        lotes.forEach(l => l.ativo = false);
        lotes.push({ id: Date.now(), nome, especieId: parseInt(especieId), qtd, dataInicio: data, ativo: true });
    }
    saveData(); renderLotes(); updateDashboard(); closeModal('modal-lote');
});

function renderLotes() {
    const list = document.getElementById('lotes-list');
    if(!list) return;
    if (lotes.length === 0) { list.innerHTML = '<p style="text-align:center; color:var(--text-dim); padding:40px 0;">Nenhum lote cadastrado.</p>'; return; }
    list.innerHTML = lotes.map(l => {
        const sp = species.find(s => s.id === l.especieId);
        const dataFormatada = new Date(l.dataInicio+'T00:00:00').toLocaleDateString('pt-BR');
        const statusClass = l.ativo ? 'status-active' : 'status-inactive';
        const statusText = l.ativo ? 'Ativo' : 'Inativo';
        return `<div class="card-item"><div style="flex: 1;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><h4 style="margin: 0;">${l.nome}</h4><button class="btn-status ${statusClass}" onclick="toggleLoteStatus(${l.id})">${statusText}</button></div><div class="lote-details-grid"><span><strong>Espécie:</strong> ${sp ? sp.nome : 'Removida'}</span><span><strong>Ovos:</strong> ${l.qtd} unid.</span><span><strong>Início:</strong> ${dataFormatada}</span></div></div><div class="lote-actions"><button class="btn-sm btn-edit" onclick="editLote(${l.id})">Editar</button><button class="btn-sm btn-del" onclick="deleteLote(${l.id})">Excluir</button></div></div>`;
    }).join('');
}

window.toggleLoteStatus = function(id) { const lote = lotes.find(l => l.id === id); if (lote) { if (lote.ativo) { lote.ativo = false; } else { lotes.forEach(l => l.ativo = false); lote.ativo = true; } saveData(); renderLotes(); updateDashboard(); } };
window.editLote = function(id) { const lote = lotes.find(l => l.id === id); if (!lote) return; document.getElementById('lote-modal-title').innerText = 'Editar Lote'; document.getElementById('edit-lote-id').value = lote.id; document.getElementById('lote-nome').value = lote.nome; document.getElementById('lote-qtd').value = lote.qtd; document.getElementById('lote-data').value = lote.dataInicio; document.getElementById('btn-save-lote').innerText = 'Salvar Alterações'; populateSpeciesSelect(); document.getElementById('lote-especie').value = lote.especieId; openModal('modal-lote'); };
window.deleteLote = function(id) { if (confirm('Excluir este lote permanentemente?')) { lotes = lotes.filter(l => l.id !== id); saveData(); renderLotes(); updateDashboard(); } };

// ==========================================
// 8. DASHBOARD
// ==========================================
function updateDashboard() {
    const ativo = lotes.find(l => l.ativo);
    if (!ativo) { document.getElementById('dash-lote-name').innerText = 'Nenhum lote ativo'; document.getElementById('dash-species').innerText = '---'; document.getElementById('dash-temp').innerText = '--'; document.getElementById('dash-humid').innerText = '--%'; document.getElementById('dash-days-left').innerText = '-- dias'; document.getElementById('dash-progress-bar').style.width = '0%'; return; }
    const sp = species.find(s => s.id === ativo.especieId);
    document.getElementById('dash-lote-name').innerText = ativo.nome;
    document.getElementById('dash-species').innerText = sp ? sp.nome : '---';
    document.getElementById('dash-temp').innerText = sp ? sp.temp : '--';
    document.getElementById('dash-humid').innerText = sp ? sp.umid + '%' : '--%';
    const inicio = new Date(ativo.dataInicio + 'T00:00:00');
    const diasTotal = sp ? sp.dias : 21;
    const diaAtual = Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasFaltantes = Math.max(0, diasTotal - diaAtual);
    document.getElementById('dash-days-left').innerText = diasFaltantes + ' dias';
    document.getElementById('dash-progress-bar').style.width = Math.min(100, (diaAtual / diasTotal) * 100) + '%';
}

// ==========================================
// 9. CHECKLIST
// ==========================================
function renderTimeline() {
    const ul = document.getElementById('timeline-steps');
    if(!ul) return;
    ul.innerHTML = steps.map((s, i) => `<li class="${s.done ? 'done' : ''}" onclick="toggleStep(${i})"><strong>${s.text}</strong><p class="step-desc">${s.desc}</p></li>`).join('');
}
window.toggleStep = function(i) { if(steps[i]) { steps[i].done = !steps[i].done; saveData(); renderTimeline(); } };

// ==========================================
// 10. LÓGICA DOS BOTÕES LIGAR/DESLIGAR (CRONÔMETROS)
// ==========================================
let alarmInterval = null;
let alarmSeconds = 7200; // 2 horas
let autoTurnInterval = null;
let autoTurnSeconds = 0;

const btnAlarm = document.getElementById('btn-alarm');
const alarmText = document.getElementById('alarm-timer-text');
const btnAutoTurn = document.getElementById('btn-auto-turn');
const autoTurnText = document.getElementById('auto-turn-text');

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

btnAlarm.addEventListener('click', () => {
    desbloquearAudio(); // Garante que o som vai tocar
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
            alarmText.innerText = `Virando em: ${formatTime(alarmSeconds)}`;
            
            if (alarmSeconds <= 0) {
                playSound('alarm'); // Toca o alarme
                clearInterval(alarmInterval);
                alarmInterval = null;
                btnAlarm.innerText = 'LIGAR';
                btnAlarm.classList.remove('active');
                alarmText.innerText = '⚠️ HORA DE VIRAR! Toque para reiniciar.';
                // Vibra o celular se suportado
                if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
            }
        }, 1000);
    }
});

btnAutoTurn.addEventListener('click', () => {
    desbloquearAudio();
    if (autoTurnInterval) {
        // DESLIGAR
        clearInterval(autoTurnInterval);
        autoTurnInterval = null;
        autoTurnSeconds = 0;
        btnAutoTurn.innerText = 'LIGAR';
        btnAutoTurn.classList.remove('active');
        autoTurnText.innerText = 'Motor desligado';
    } else {
        // LIGAR
        autoTurnSeconds = 0;
        btnAutoTurn.innerText = 'DESLIGAR';
        btnAutoTurn.classList.add('active');
        autoTurnInterval = setInterval(() => {
            autoTurnSeconds++;
            autoTurnText.innerText = `Tempo ligado: ${formatTime(autoTurnSeconds)}`;
        }, 1000);
    }
});


// ==========================================
// 11. CHAT IA (COM CONTEXTO FORÇADO)
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
    if(!chatContainer) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${type}`;
    div.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function getAppContext() {
    const ativo = lotes.find(l => l.ativo);
    if (!ativo) return "AVISO: O usuário NÃO possui nenhum lote de incubação ativo no momento.";
    const sp = species.find(s => s.id === ativo.especieId);
    const inicio = new Date(ativo.dataInicio + 'T00:00:00');
    const diasTotal = sp ? sp.dias : 0;
    const diaAtual = Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasFaltantes = Math.max(0, diasTotal - diaAtual);
    let c = `CONTEXTO ATUAL DO APP:\n- Lote Ativo: "${ativo.nome}"\n- Espécie: ${sp ? sp.nome : 'Não identificada'}\n- Total de Ovos: ${ativo.qtd}\n- Data de Início: ${new Date(inicio).toLocaleDateString('pt-BR')}\n- Dia atual de incubação: ${diaAtual}\n- Dias restantes para eclosão: ${diasFaltantes}\n`;
    if (sp) { c += `- Temp alvo: ${sp.temp}°C | Umid alvo: ${sp.umid}%\n`; }
    if (diasFaltantes <= 3 && diasFaltantes > 0) c += `!!! ATENÇÃO: Estamos nos últimos 3 dias. Viragem deve estar parada.`;
    return c;
}

async function handleChat(msg) {
    desbloquearAudio(); // Libera o som antes de enviar
    playSound('send');
    addMessage(msg, 'user');
    
    const apiKey = localStorage.getItem('ib_groq_key');
    if (!apiKey) {
        setTimeout(() => { playSound('receive'); addMessage("Configure sua chave API do Groq no ícone ⚙️ para ativar a IA.", 'bot'); }, 500);
        return;
    }

    try {
        const contextData = getAppContext();

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { 
                        role: 'system', 
                        content: `Você é um especialista em incubação de ovos. Responda em português do Brasil. 
                        
                        REGRA IMPORTANTE: Leia o CONTEXTO DO APP abaixo. Se o contexto disser que NÃO há lote ativo, diga que não há lote ativo e pergunte se quer criar um. 
                        Se houver lote ativo, use os dados EXATOS do contexto (nomes, números, dias) na sua resposta. Nunca invente dados.
                        
                        CONTEXTO DO APP:
                        ${contextData}`
                    },
                    { role: 'user', content: msg }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await response.json();
        
        if (data.error) {
            playSound('receive');
            addMessage(`Erro: ${data.error.message}`, 'bot');
        } else if (data.choices && data.choices[0]) {
            playSound('receive');
            addMessage(data.choices[0].message.content, 'bot');
        } else {
            playSound('receive');
            addMessage('A IA não retornou resposta.', 'bot');
        }
    } catch (error) {
        playSound('receive');
        addMessage('Erro de conexão. Verifique sua internet.', 'bot');
    }
}

// ==========================================
// 12. CONFIGURAÇÕES (API KEY)
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
    if (key.startsWith('gsk_')) { localStorage.setItem('ib_groq_key', key); checkApiKey(); } 
    else { alert('Chave inválida. Deve começar com gsk_'); }
});

document.getElementById('btn-remove-api').addEventListener('click', () => {
    localStorage.removeItem('ib_groq_key');
    document.getElementById('input-api-key').value = '';
    checkApiKey();
});

// ==========================================
// 13. INICIALIZAÇÃO
// ==========================================
function init() {
    renderSpeciesTable();
    renderLotes();
    updateDashboard();
    renderTimeline();
    checkApiKey();
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
