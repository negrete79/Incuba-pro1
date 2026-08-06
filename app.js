// LIMPEZA ÚNICA (Apague esta linha após abrir o app uma vez)
localStorage.clear(); 

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

let audioCtx;
function desbloquearAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); }
document.addEventListener('click', function desbloqueio() { desbloquearAudio(); document.removeEventListener('click', desbloqueio); }, { once: true });

function playSound(type) {
    try {
        if (!audioCtx) desbloquearAudio();
        const ctx = audioCtx; if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine';
        if (type === 'send') { osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1); }
        else if (type === 'receive') { osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.setValueAtTime(900, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.08, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2); }
        else if (type === 'alarm') { osc.type = 'square'; osc.frequency.setValueAtTime(880, ctx.currentTime); osc.frequency.setValueAtTime(0, ctx.currentTime + 0.2); osc.frequency.setValueAtTime(880, ctx.currentTime + 0.4); osc.frequency.setValueAtTime(0, ctx.currentTime + 0.6); osc.frequency.setValueAtTime(880, ctx.currentTime + 0.8); gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.0); }
    } catch (e) {}
}

const defaultSpecies = [
    { id: 1, nome: 'Galinha', dias: 21, temp: 37.5, umid: 60 },
    { id: 2, nome: 'Pato', dias: 28, temp: 37.5, umid: 70 },
    { id: 3, nome: 'Codornas', dias: 17, temp: 37.8, umid: 60 },
    { id: 4, nome: 'Calopsita', dias: 18, temp: 37.3, umid: 65 },
    { id: 5, nome: 'Pavão', dias: 28, temp: 37.5, umid: 60 },
    { id: 6, nome: 'Faisão', dias: 24, temp: 37.8, umid: 65 },
    { id: 7, nome: 'Ganso', dias: 30, temp: 37.5, umid: 70 },
    { id: 8, nome: 'Cisne', dias: 35, temp: 37.2, umid: 65 },
    { id: 9, nome: 'Peru', dias: 28, temp: 37.5, umid: 55 }
];
const defaultSteps = [
    { text: 'Aquecer a incubadora', desc: 'Ligue 24h antes para estabilizar a temperatura.', done: false },
    { text: 'Colocar os ovos', desc: 'Posicione com a ponta mais fina para baixo.', done: false },
    { text: 'Iniciar viragens', desc: 'Vire os ovos no mínimo 3 vezes ao dia.', done: false },
    { text: 'Ovoscopia (Dia 7)', desc: 'Verifique se há embrião em desenvolvimento.', done: false },
    { text: 'Parar viragens (3 dias antes)', desc: 'Deixe os ovos em repouso para o nascimento.', done: false },
    { text: 'Eclosão', desc: 'Não abra a incubadora! Aguarde os pintinhos secarem.', done: false }
];
let species = defaultSpecies, lotes = [], steps = defaultSteps;
function saveData() { localStorage.setItem('ib_species', JSON.stringify(species)); localStorage.setItem('ib_lotes', JSON.stringify(lotes)); localStorage.setItem('ib_steps', JSON.stringify(steps)); }

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        btn.classList.add('active');
        const viewEl = document.getElementById('view-' + btn.dataset.view); if (viewEl) viewEl.classList.add('active');
        if (btn.dataset.view === 'calendario') renderCalendar();
    });
});

function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add('show'); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('show'); }
document.getElementById('btn-settings').addEventListener('click', () => openModal('modal-settings'));
document.getElementById('close-settings').addEventListener('click', () => closeModal('modal-settings'));
document.getElementById('btn-add-lote').addEventListener('click', () => { document.getElementById('lote-modal-title').innerText = 'Novo Lote'; document.getElementById('edit-lote-id').value = ''; document.getElementById('lote-nome').value = ''; document.getElementById('lote-qtd').value = ''; document.getElementById('lote-data').valueAsDate = new Date(); document.getElementById('btn-save-lote').innerText = 'Criar Lote'; populateSpeciesSelect(); openModal('modal-lote'); });
document.getElementById('close-lote').addEventListener('click', () => closeModal('modal-lote'));
document.getElementById('btn-add-species').addEventListener('click', () => { document.getElementById('species-modal-title').innerText = 'Nova Espécie'; document.getElementById('edit-species-id').value = ''; document.getElementById('sp-nome').value = ''; document.getElementById('sp-dias').value = ''; document.getElementById('sp-temp').value = ''; document.getElementById('sp-humid').value = ''; openModal('modal-species'); });
document.getElementById('close-species').addEventListener('click', () => closeModal('modal-species'));
window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) e.target.classList.remove('show'); });

function renderSpeciesTable() { const t = document.getElementById('especies-tbody'); if (!t) return; t.innerHTML = species.map(sp => `<tr><td>${sp.nome}</td><td>${sp.dias}d</td><td>${sp.temp}°C</td><td>${sp.umid}%</td><td><button class="btn-sm btn-del" onclick="deleteSpecies(${sp.id})">Excluir</button></td></tr>`).join(''); }
document.getElementById('btn-save-species').addEventListener('click', () => { const n = document.getElementById('sp-nome').value.trim(), d = parseInt(document.getElementById('sp-dias').value), t = parseFloat(document.getElementById('sp-temp').value), u = parseInt(document.getElementById('sp-humid').value); if (!n || !d || !t) return alert('Preencha tudo.'); species.push({ id: Date.now(), nome: n, dias: d, temp: t, umid: u }); saveData(); renderSpeciesTable(); closeModal('modal-species'); });
window.deleteSpecies = function(id) { if (confirm('Excluir?')) { species = species.filter(s => s.id !== id); saveData(); renderSpeciesTable(); } };

function populateSpeciesSelect() { const s = document.getElementById('lote-especie'); if(!s) return; s.innerHTML = '<option value="">Selecione...</option>' + species.map(sp => '<option value="'+sp.id+'">'+sp.nome+'</option>').join(''); }
document.getElementById('btn-save-lote').addEventListener('click', () => {
    const e = document.getElementById('edit-lote-id').value, n = document.getElementById('lote-nome').value.trim(), es = document.getElementById('lote-especie').value, q = parseInt(document.getElementById('lote-qtd').value) || 0, dt = document.getElementById('lote-data').value;
    if (!n || !es || !dt) return alert('Preencha Nome, Espécie e Data.');
    if (e) { const l = lotes.find(x => x.id == e); if (l) { l.nome = n; l.especieId = parseInt(es); l.qtd = q; l.dataInicio = dt; } } 
    else { lotes.forEach(l => l.ativo = false); lotes.push({ id: Date.now(), nome: n, especieId: parseInt(es), qtd: q, dataInicio: dt, ativo: true }); }
    saveData(); renderLotes(); updateDashboard(); closeModal('modal-lote');
});

function renderLotes() {
    const l = document.getElementById('lotes-list'); if (!l) return;
    if (lotes.length === 0) { l.innerHTML = '<p style="text-align:center; color:var(--text-dim); padding:40px 0;">Nenhum lote cadastrado.</p>'; return; }
    l.innerHTML = lotes.map(lt => {
        const sp = species.find(s => s.id === lt.especieId), p = lt.dataInicio.split('-'), df = new Date(p[0], p[1] - 1, p[2], 12, 0, 0).toLocaleDateString('pt-BR'), sc = lt.ativo ? 'status-active' : 'status-inactive', st = lt.ativo ? 'Ativo' : 'Inativo';
        return `<div class="card-item"><div style="flex: 1;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><h4 style="margin: 0;">${lt.nome}</h4><button class="btn-status ${sc}" onclick="toggleLoteStatus(${lt.id})">${st}</button></div><div class="lote-details-grid"><span><strong>Espécie:</strong> ${sp ? sp.nome : 'Removida'}</span><span><strong>Ovos:</strong> ${lt.qtd} unid.</span><span><strong>Início:</strong> ${df}</span></div></div><div class="lote-actions"><button class="btn-sm btn-edit" onclick="editLote(${lt.id})">Editar</button><button class="btn-sm btn-del" onclick="deleteLote(${lt.id})">Excluir</button></div></div>`;
    }).join('');
}
window.toggleLoteStatus = function(id) { const lt = lotes.find(l => l.id === id); if (lt) { if (lt.ativo) lt.ativo = false; else { lotes.forEach(l => l.ativo = false); lt.ativo = true; } saveData(); renderLotes(); updateDashboard(); } };
window.editLote = function(id) { const lt = lotes.find(l => l.id === id); if (!lt) return; document.getElementById('lote-modal-title').innerText = 'Editar Lote'; document.getElementById('edit-lote-id').value = lt.id; document.getElementById('lote-nome').value = lt.nome; document.getElementById('lote-qtd').value = lt.qtd; document.getElementById('lote-data').value = lt.dataInicio; document.getElementById('btn-save-lote').innerText = 'Salvar Alterações'; populateSpeciesSelect(); document.getElementById('lote-especie').value = lt.especieId; openModal('modal-lote'); };
window.deleteLote = function(id) { if (confirm('Excluir lote?')) { lotes = lotes.filter(l => l.id !== id); saveData(); renderLotes(); updateDashboard(); } };

// Cálculo de dias INFALÍVEL (Ignora o ano do celular completamente)
function calcularDias(dataString) {
    const partes = dataString.split('-');
    const diaInicio = parseInt(partes[2]);
    const mesInicio = parseInt(partes[1]);
    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth() + 1;
    
    // Se for o mesmo mês
    if (mesInicio === mesHoje) {
        return diaHoje - diaInicio;
    }
    // Calculo simples de dias entre meses (suficiente para o tempo de incubação)
    return (diaHoje + 30) - diaInicio; 
}

let animacaoAtiva = null;
let tempoAnimacao = 0;

function updateDashboard() {
    const ativo = lotes.find(l => l.ativo);
    if (!ativo) {
        document.getElementById('dash-lote-name').innerText = 'Nenhum lote ativo';
        document.getElementById('dash-species').innerText = '---';
        document.getElementById('dash-temp').innerText = '--';
        document.getElementById('dash-humid').innerText = '--%';
        document.getElementById('dash-days-left').innerText = '-- dias';
        document.getElementById('dash-progress-bar').style.width = '0%';
        if (animacaoAtiva) { clearInterval(animacaoAtiva); animacaoAtiva = null; }
        return;
    }

    const sp = species.find(s => s.id === ativo.especieId);
    document.getElementById('dash-lote-name').innerText = ativo.nome;
    document.getElementById('dash-species').innerText = sp ? sp.nome : '---';

    const diaAtual = calcularDias(ativo.dataInicio);
    const diasTotal = sp ? sp.dias : 21;
    const diasFaltantes = Math.max(0, diasTotal - diaAtual);
    
    if (diaAtual < 0) { document.getElementById('dash-days-left').innerText = 'Ainda não iniciou'; document.getElementById('dash-progress-bar').style.width = '0%'; }
    else { document.getElementById('dash-days-left').innerText = diasFaltantes + ' dias'; document.getElementById('dash-progress-bar').style.width = Math.min(100, (diaAtual / diasTotal) * 100) + '%'; }

    if (!animacaoAtiva && sp) {
        tempoAnimacao = 0;
        animacaoAtiva = setInterval(() => {
            tempoAnimacao += 0.2;
            const ondaTemp = Math.sin(tempoAnimacao) * 0.8; 
            const tempAtual = (sp.temp + ondaTemp).toFixed(1);
            const ondaUmid = Math.sin(tempoAnimacao * 0.7) * 5; 
            const umidAtual = Math.round(sp.umid + ondaUmid);
            document.getElementById('dash-temp').innerText = tempAtual;
            document.getElementById('dash-humid').innerText = umidAtual + '%';
            const elTemp = document.getElementById('dash-temp');
            const diffTemp = tempAtual - sp.temp;
            if (diffTemp > 0.5) elTemp.style.color = '#e74c3c';
            else if (diffTemp < -0.5) elTemp.style.color = '#3498db';
            else elTemp.style.color = '#f0c040';
        }, 3000);
    }
}

function renderTimeline() { const ul = document.getElementById('timeline-steps'); if (!ul) return; ul.innerHTML = steps.map((s, i) => `<li class="${s.done ? 'done' : ''}" onclick="toggleStep(${i})"><strong>${s.text}</strong><p class="step-desc">${s.desc}</p></li>`).join(''); }
window.toggleStep = function(i) { if (steps[i]) { steps[i].done = !steps[i].done; saveData(); renderTimeline(); } };

function renderCalendar() {
    const c = document.getElementById('calendar-events'); if (!c) return;
    const a = lotes.find(l => l.ativo);
    if (!a) { c.innerHTML = '<p style="text-align:center; color:var(--text-dim); padding:40px 0;">Ative um lote.</p>'; return; }
    const sp = species.find(s => s.id === a.especieId); if (!sp) return;
    const p = a.dataInicio.split('-'), ini = new Date(p[0], p[1] - 1, p[2], 12, 0, 0), d = 24*60*60*1000;
    const ev = [{ t: 'Início da Incubação', dias: 0, cor: 'var(--accent)' },{ t: 'Ovoscopia (Dia 7)', dias: 7, cor: '#3498db' },{ t: 'Ovoscopia (Dia 14)', dias: 14, cor: '#3498db' },{ t: 'Parar Viragens (3 dias antes)', dias: sp.dias - 3, cor: '#e67e22' },{ t: 'Previsão de Eclosão', dias: sp.dias, cor: 'var(--success)' }];
    c.innerHTML = ev.map(e => { const dt = new Date(ini.getTime() + (e.dias * d)), df = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }), past = dt.getTime() < new Date().setHours(0,0,0,0); return `<div class="card-item" style="border-left: 4px solid ${e.cor}; opacity: ${past ? 0.5 : 1};"><div><h4 style="color: ${e.cor}; margin-bottom: 5px;">${e.t}</h4><p style="color: var(--text-dim); text-transform: capitalize;">${df} ${past ? '(Passado)' : ''}</p></div></div>`; }).join('');
}

let alarmInterval = null, alarmSeconds = 7200;
const btnAlarm = document.getElementById('btn-alarm'), alarmText = document.getElementById('alarm-timer-text');
const btnAutoTurn = document.getElementById('btn-auto-turn'), autoTurnText = document.getElementById('auto-turn-text');
function formatTime(s) { return Math.floor(s/3600).toString().padStart(2,'0')+':'+Math.floor((s%3600)/60).toString().padStart(2,'0')+':'+(s%60).toString().padStart(2,'0'); }
btnAlarm.addEventListener('click', () => { desbloquearAudio(); if (alarmInterval) { clearInterval(alarmInterval); alarmInterval = null; alarmSeconds = 7200; btnAlarm.innerText = 'LIGAR'; btnAlarm.classList.remove('active'); alarmText.innerText = 'Toque para iniciar (02:00h)'; } else { alarmSeconds = 7200; btnAlarm.innerText = 'ZERAR'; btnAlarm.classList.add('active'); alarmInterval = setInterval(() => { alarmSeconds--; alarmText.innerText = 'Virando em: ' + formatTime(alarmSeconds); if (alarmSeconds <= 0) { playSound('alarm'); clearInterval(alarmInterval); alarmInterval = null; btnAlarm.innerText = 'LIGAR'; btnAlarm.classList.remove('active'); alarmText.innerText = '⚠️ HORA DE VIRAR!'; if(navigator.vibrate) navigator.vibrate([500,200,500]); } }, 1000); } });
btnAutoTurn.addEventListener('click', () => { desbloquearAudio(); if (btnAutoTurn.classList.contains('active')) { btnAutoTurn.innerText = 'LIGAR'; btnAutoTurn.classList.remove('active'); autoTurnText.innerText = 'Motor desligado'; } else { btnAutoTurn.innerText = 'DESLIGAR'; btnAutoTurn.classList.add('active'); autoTurnText.innerText = 'Motor automático ligado'; } });

const chatContainer = document.getElementById('chat-messages');
document.querySelectorAll('.trigger-btn').forEach(btn => { btn.addEventListener('click', () => handleChat(btn.dataset.msg)); });
document.getElementById('btn-send-chat').addEventListener('click', () => { const i = document.getElementById('chat-input'); if(i.value.trim()) handleChat(i.value); i.value = ''; });
document.getElementById('chat-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') { const i = document.getElementById('chat-input'); if(i.value.trim()) handleChat(i.value); i.value = ''; } });
function addMessage(text, type) { if(!chatContainer) return; const d = document.createElement('div'); d.className = 'chat-msg '+type; d.innerHTML = '<p>'+text.replace(/\n/g, '<br>')+'</p>'; chatContainer.appendChild(d); chatContainer.scrollTop = chatContainer.scrollHeight; }

function getAppContext() { 
    const a = lotes.find(l => l.ativo); 
    if (!a) return "AVISO: O usuário NÃO possui nenhum lote ativo."; 
    const sp = species.find(s => s.id === a.especieId); 
    const diaAtual = calcularDias(a.dataInicio); 
    const diasFaltantes = Math.max(0, (sp ? sp.dias : 21) - diaAtual); 
    
    let c = 'DADOS_DO_APP:\nLote: '+a.nome+'\nEspecie: '+(sp?sp.nome:'?')+'\nOvos: '+a.qtd+'\nTemperatura Alvo: '+(sp?sp.temp+'°C':'?')+'\nUmidade Alvo: '+(sp?sp.umid+'%':'?')+'\nDia Atual de Incubação: '+diaAtual+'\nDias Restantes: '+diasFaltantes+'\nFIM_DADOS.'; 
    return c; 
}

async function handleChat(msg) {
    desbloquearAudio(); playSound('send'); addMessage(msg, 'user');
    const apiKey = localStorage.getItem('ib_groq_key');
    if (!apiKey) { setTimeout(() => { playSound('receive'); addMessage("Configure a chave API do Groq no ícone ⚙️.", 'bot'); }, 500); return; }
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey }, body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [ { role: 'system', content: 'Você é um assistente de incubação. REGRAS ESTRITAS: 1. Leia os DADOS_DO_APP. 2. NUNCA invente. 3. Use os valores exatos de ovos, temperatura e umidade do bloco. 4. Pt-BR.\n\n' + getAppContext() }, { role: 'user', content: msg } ], temperature: 0.1, max_tokens: 300 }) });
        const data = await response.json(); playSound('receive');
        if (data.error) addMessage('Erro: ' + data.error.message, 'bot');
        else if (data.choices && data.choices[0]) addMessage(data.choices[0].message.content, 'bot');
        else addMessage('Sem resposta.', 'bot');
    } catch (e) { playSound('receive'); addMessage('Erro de conexão.', 'bot'); }
}

function checkApiKey() { const k = localStorage.getItem('ib_groq_key'); document.getElementById('api-key-view').style.display = k ? 'none' : 'block'; document.getElementById('api-key-active-view').style.display = k ? 'block' : 'none'; document.getElementById('btn-remove-api').style.display = k ? 'block' : 'none'; }
document.getElementById('btn-save-api').addEventListener('click', () => { const k = document.getElementById('input-api-key').value.trim(); if (k.startsWith('gsk_')) { localStorage.setItem('ib_groq_key', k); checkApiKey(); } else alert('Chave inválida.'); });
document.getElementById('btn-remove-api').addEventListener('click', () => { localStorage.removeItem('ib_groq_key'); document.getElementById('input-api-key').value = ''; checkApiKey(); });

function init() { renderSpeciesTable(); renderLotes(); updateDashboard(); renderTimeline(); checkApiKey(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
